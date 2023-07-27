import Web3 from "web3";
import Web3PromiEvent from "web3-core-promievent";
import axios from "axios";

import { NETWORK_ID, NETWORKS, API_URL } from "../config";

export const currentNetwork = NETWORKS.find(({ id }) => id === NETWORK_ID);
console.log("🚀 ~ file: web3.js:8 ~ currentNetwork:", currentNetwork);

export const getWeb3Library = (provider) => new Web3(provider);

export const readOnlyWeb3 = new Web3(currentNetwork.rpcUrl);

export const MAX_ATTEMPTS_EXCEEDED = 1;
export const TRANSACTION_FAILED_POST = 2;
export const GENERIC_TRANSACTION_ERROR = 3;
export const TRANSACTION_FAILED_PRE = 3;

export const WEB3_STATUS = {
  UNKNOWN: "UNKNOWN",
  UNAVAILABLE: "UNAVAILABLE",
  READY: "READY",
};

const createTransactionRecord = async (methodCallObj, hash) => {
  await axios.post(
    `${API_URL}blockchain/blockchain-transaction/`,
    {
      transaction_hash: hash,
      method: methodCallObj._method.name,
      params: JSON.stringify(methodCallObj.arguments),
      executor: methodCallObj._parent.options.from,
      contract: methodCallObj._parent.options.address,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};
export class TransactionError extends Error {
  constructor(code, message) {
    super();

    this.code = code;
    this.message = message;
  }
}

const handleTransactionError = (eventEmitter, reject) => {
  eventEmitter.on("error", (e) => {
    reject(new TransactionError(GENERIC_TRANSACTION_ERROR, e.message || e));
  });
};

export const getTransactionHash = (eventEmitter) => {
  return new Promise((resolve, reject) => {
    handleTransactionError(eventEmitter, reject);

    eventEmitter.on("transactionHash", (hash) => {
      resolve(hash);
    });
  });
};

const RECEIPT_POLLING_INTERVAL = 1000;
const RECEIPT_POLLING_MAX_ATTEMPTS = 10;

const getTransactionReceipt = async (web3, eventEmitter, hash) => {
  return new Promise((resolve, reject) => {
    if (eventEmitter) {
      handleTransactionError(eventEmitter, reject);
    }

    let pollingAttemptsCount = 0;

    const pollReceipt = async () => {
      pollingAttemptsCount += 1;

      if (pollingAttemptsCount > RECEIPT_POLLING_MAX_ATTEMPTS) {
        reject(new TransactionError(MAX_ATTEMPTS_EXCEEDED));
      }

      const receipt = await web3.eth.getTransactionReceipt(hash);

      if (!receipt) {
        nextPollingAttempt();
      } else {
        resolve(receipt);
      }
    };

    const nextPollingAttempt = () =>
      setTimeout(pollReceipt, RECEIPT_POLLING_INTERVAL);

    nextPollingAttempt();
  });
};

const DEFAULT_ERROR_SIGNATURE = {
  inputs: [
    {
      name: "message",
      type: "string",
    },
  ],
  name: "Error",
  type: "error",
};

const parseError = (web3, str, abi) => {
  const bytes = web3.utils.hexToBytes(str);
  const errorNameSignature = web3.utils.bytesToHex(bytes.slice(0, 4));
  const errorParameters = web3.utils.bytesToHex(bytes.slice(4));

  const errorDefinition = [...abi, DEFAULT_ERROR_SIGNATURE]
    .filter(({ type }) => type === "error")
    .find((errorSignature) => {
      const encodedSignature =
        web3.eth.abi.encodeFunctionSignature(errorSignature);

      return encodedSignature === errorNameSignature;
    });

  if (errorDefinition) {
    const params = web3.eth.abi.decodeParameters(
      errorDefinition.inputs,
      errorParameters
    );

    return {
      name: errorDefinition.name,
      params,
    };
  }

  throw Error(`can't parse the error "${str}"`);
};

const getCallOptionsFromCallObj = (methodCallObj) => {
  const { address, from } = methodCallObj._parent.options;

  return {
    from,
    to: address,
    data: methodCallObj.encodeABI(),
  };
};

const checkTransactionError =
  (errorCode) => async (web3, methodCallObj, blockNumber) => {
    let errorMessage;
    try {
      const result = await web3.eth.call(
        getCallOptionsFromCallObj(methodCallObj),
        blockNumber
      );

      console.error("result", result);
      const ENCODED_TRUE =
        "0x0000000000000000000000000000000000000000000000000000000000000001";

      if (result === "0x" || result === ENCODED_TRUE) {
        return;
      }

      const parsedError = parseError(
        web3,
        result,
        methodCallObj._parent.options.jsonInterface
      );
      errorMessage = `${parsedError.params.message}`;
      console.error("parsedError", parsedError);
    } catch (e) {
      console.error("e", e);
      errorMessage = e.code ? "Internal JSON-RPC error" : e.message;

      if (e.code === undefined) {
        // remove Internal JSON-RPC error. from the message
        errorMessage = errorMessage.replace("Internal JSON-RPC error.", "");
        errorMessage = errorMessage.replace("execution reverted: ", "");
        errorMessage = errorMessage.trim();
        errorMessage = JSON.parse(errorMessage).message;
      }
    }

    throw new TransactionError(errorCode, errorMessage);
  };

const checkTransactionErrorPre = checkTransactionError(TRANSACTION_FAILED_PRE);
const checkTransactionErrorPost = checkTransactionError(
  TRANSACTION_FAILED_POST
);

export const sendTransaction = (web3, methodCallObj, options) => {
  const { resolve, reject, eventEmitter } = Web3PromiEvent();
  const { hash, ...sendOptions } = options ?? {};
  console.log({ hash });

  const hashPromise = hash
    ? Promise.resolve([hash, null])
    : checkTransactionErrorPre(web3, methodCallObj).then(() => {
        const transactionEventEmitter = methodCallObj.send(sendOptions);
        return getTransactionHash(transactionEventEmitter).then((hash) => {
          eventEmitter.emit("hash", hash);
          return [hash, transactionEventEmitter];
        });
      });

  createTransactionRecord(methodCallObj, hash);

  hashPromise
    .then(([hash, transactionEventEmitter]) => {
      return getTransactionReceipt(web3, transactionEventEmitter, hash);
    })
    .then(async (receipt) => {
      if (!receipt.status) {
        eventEmitter.emit("receipt_fail", receipt);
        return checkTransactionErrorPost(
          web3,
          methodCallObj,
          receipt.blockNumber
        );
      } else {
        eventEmitter.emit("receipt_success", receipt);
        // Fetch Event Logs
        const eventLogs = await methodCallObj._parent.getPastEvents(
          "allEvents",
          {
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
          }
        );
        // append event logs to receipt
        receipt.events = eventLogs;
        return receipt;
      }
    })
    .then(resolve, (...args) => {
      eventEmitter.emit("error", ...args);
      reject(...args);
    });

  return eventEmitter;
};

export const sendTransactionHashOnly = async (web3, methodCallObj, options) => {
  await checkTransactionErrorPre(web3, methodCallObj);

  const eventEmitter = methodCallObj.send(options);
  const hash = await getTransactionHash(eventEmitter);
  createTransactionRecord(methodCallObj, hash);
  return hash;
};

export const getNetworkName = (networkId) => {
  const network = NETWORKS.find(({ id }) => id === networkId);

  if (!network) {
    return `Unknown Network (${networkId})`;
  }

  return network.name;
};

export const getCustodianContractAddress = (networkId) => {
  const network = NETWORKS.find(
    ({ id }) => id.toString() === networkId.toString()
  );

  if (!network) {
    return null;
  }

  return network.custodianContractAddress;
};
export const getEscrowManagerAddress = (networkId) => {
  const network = NETWORKS.find(
    ({ id }) => id.toString() === networkId.toString()
  );

  if (!network) {
    return null;
  }

  return network.escrowManagerAddress;
};

export const ethToXdcAddress = (address) => address.replace(/^0x/, "xdc");
export const xdcToEthAddress = (address) => address.replace(/^xdc/, "0x");

export const ellipsisShrinkStr = (str, start, end) => {
  return `${str.slice(0, start)}...${str.slice(-end)}`;
};
export const toChecksumAddress = (address) => {
  return Web3.utils.toChecksumAddress(address);
};
export const formatAddressShort = (address) => {
  const xdcAddress = ethToXdcAddress(Web3.utils.toChecksumAddress(address));
  // return xdcAddress;
  return ellipsisShrinkStr(xdcAddress, 7, 4);
};

const traverseXdcObjRec = (obj) => {
  const mapValue = (value) => {
    if (typeof value === "string" && /^xdc/.test(value)) {
      return value.replace(/^xdc/, "0x");
    }

    if (typeof value === "object") {
      return traverseXdcObjRec(value);
    }

    return value;
  };

  if (obj instanceof Array) {
    return obj.map(mapValue);
  }

  if (typeof obj === "object" && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, mapValue(value)])
    );
  }

  return obj;
};

export const transformProviderFromXinfin = (provider) => {
  const _sendAsync = provider.constructor.prototype.sendAsync;
  provider.sendAsync = function sendAsync(payload, callback) {
    return _sendAsync.call(this, payload, (error, response) => {
      callback(error, traverseXdcObjRec(response));
    });
  };

  return provider;
};

export const getNetworkIdFromProvider = (provider) =>
  new Promise((resolve, reject) => {
    provider.sendAsync({ method: "eth_chainId" }, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(
          typeof res.result === "number" ? res.result : parseInt(res.result, 16)
        );
      }
    });
  });
export const stringToBytes32 = (str) => {
  return Web3.utils.padRight(Web3.utils.fromAscii(str), 64);
};
