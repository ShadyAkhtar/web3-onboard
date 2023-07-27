import { AbstractConnector } from "@web3-react/abstract-connector";
import { getNetworkIdFromProvider as getChainIdFromProvider } from "../helpers/web3";
import warning from "tiny-warning";

function parseSendReturn(sendReturn) {
  return sendReturn.hasOwnProperty("result") ? sendReturn.result : sendReturn;
}

const __DEV__ = false;

export class NoEthereumProviderError extends Error {
  constructor() {
    super();
    this.name = this.constructor.name;
    this.message = "No Ethereum provider was found on this.provider.";
  }
}

export class UserRejectedRequestError extends Error {
  constructor() {
    super();
    this.name = this.constructor.name;
    this.message = "The user rejected the request.";
  }
}

const getAccounts = async (provider) => {
  return new Promise((resolve, reject) => {
    provider.sendAsync({ method: "eth_accounts" }, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(parseSendReturn(res));
      }
    });
  });
};

const POLL_INTERVAL = 1000;

export class InjectedConnector extends AbstractConnector {
  constructor(kwargs = {}) {
    super(kwargs);

    const { provider } = kwargs;

    this.handleNetworkChanged = this.handleNetworkChanged.bind(this);
    this.handleChainChanged = this.handleChainChanged.bind(this);
    this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.pollHandler = this.pollHandler.bind(this);

    this.pollTimerId = null;
    this.currentAccount = null;
    this.currentChainId = null;

    this.provider = provider;
  }

  async pollHandler() {
    try {
      const accounts = await getAccounts(this.provider);
      if (accounts[0] !== this.currentAccount) {
        this.handleAccountsChanged(accounts);
        this.currentAccount = accounts[0];
      }

      const chainId = await this.getChainId();
      if (chainId !== this.currentChainId) {
        this.handleChainChanged(chainId);
        this.currentChainId = chainId;
      }
    } catch {
      warning(false, "error happened during injector status polling");
    }

    this.pollTimerId = setTimeout(this.pollHandler, POLL_INTERVAL);
  }

  handleChainChanged(chainId) {
    if (__DEV__) {
      console.log("Handling 'chainChanged' event with payload", chainId);
    }
    this.emitUpdate({ chainId, provider: this.provider });
  }

  handleAccountsChanged(accounts) {
    if (__DEV__) {
      console.log("Handling 'accountsChanged' event with payload", accounts);
    }
    this.emitUpdate({ account: accounts[0] || null });
  }

  handleClose(code) {
    if (__DEV__) {
      console.log("Handling 'close' event with payload", code);
    }
    this.emitDeactivate();
  }

  handleNetworkChanged(networkId) {
    if (__DEV__) {
      console.log("Handling 'networkChanged' event with payload", networkId);
    }
    this.emitUpdate({ chainId: networkId, provider: this.provider });
  }

  async activate() {
    if (!this.provider) {
      throw new NoEthereumProviderError();
    }

    const account = await this.provider
      .enable()
      .then((sendReturn) => sendReturn && parseSendReturn(sendReturn)[0]);

    if (this.provider.on) {
      this.provider.on("chainChanged", this.handleChainChanged);
      this.provider.on("accountsChanged", this.handleAccountsChanged);
      this.provider.on("close", this.handleClose);
      this.provider.on("networkChanged", this.handleNetworkChanged);
    }

    this.currentAccount = account;
    this.currentChainId = await this.getChainId();

    this.pollTimerId = setTimeout(this.pollHandler, POLL_INTERVAL);

    return {
      provider: this.provider,
      ...(account ? { account } : { account: null }),
    };
  }

  async getProvider() {
    return this.provider;
  }

  async getChainId() {
    if (!this.provider) {
      throw new NoEthereumProviderError();
    }

    const chainId = await getChainIdFromProvider(this.provider);

    return chainId;
  }

  async getAccount() {
    if (!this.provider) {
      throw new NoEthereumProviderError();
    }

    let account;
    try {
      account = await getAccounts(this.provider)[0];
    } catch {
      warning(false, "eth_accounts was unsuccessful, falling back to enable");
    }

    if (!account) {
      try {
        account = await this.provider
          .enable()
          .then((sendReturn) => parseSendReturn(sendReturn)[0]);
      } catch {
        warning(
          false,
          "enable was unsuccessful, falling back to eth_accounts v2"
        );
      }
    }

    if (!account) {
      account = await getAccounts(this.provider)[0];
    }

    return account;
  }

  deactivate() {
    if (this.pollTimerId) {
      clearTimeout(this.pollTimerId);
      this.pollTimerId = null;
    }

    if (this.provider && this.provider.removeListener) {
      this.provider.removeListener("chainChanged", this.handleChainChanged);
      this.provider.removeListener(
        "accountsChanged",
        this.handleAccountsChanged
      );
      this.provider.removeListener("close", this.handleClose);
      this.provider.removeListener("networkChanged", this.handleNetworkChanged);
    }
  }

  async isAuthorized() {
    if (!this.provider) {
      return false;
    }

    try {
      return await getAccounts(this.provider).then((accounts) => {
        if (accounts.length > 0) {
          return true;
        } else {
          return false;
        }
      });
    } catch {
      return false;
    }
  }
}
