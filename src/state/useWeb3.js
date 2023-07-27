import constate from "constate";
import { initWeb3Onboard } from "../config/onboard";
import { useWeb3React } from "@web3-react/core";
import {
  sendTransaction,
  sendTransactionHashOnly,
  WEB3_STATUS,
  currentNetwork,
  transformProviderFromXinfin,
  readOnlyWeb3,
  getTransactionHash,
  xdcToEthAddress,
} from "../helpers/web3";

import {
  InjectedConnector,
  NoEthereumProviderError,
} from "../injected-connector";
import { selectedWalletPersistence } from "../persistence";

const POLL_INTERVAL = 1000;

const getOnboard = ({ onProvider }) => {
  return initWeb3Onboard;
};

const Web3State = () => {
  const {
    activate,
    deactivate,
    active,
    account,
    library: walletWeb3,
    chainId,
  } = useWeb3React();

  console.log(
    "🚀 ~ file: useAppState.js ~ line 70 ~ AppState ~ account",
    account
  );

  const [status, setStatus] = useState(WEB3_STATUS.UNKNOWN);
  const [balance, setBalance] = useState("0");

  const web3 = walletWeb3 ?? readOnlyWeb3;

  if (!web3) {
    throw new Error("web3 must be available at this point");
  }

  const onProvider = useCallback(
    async (provider) => {
      setStatus(WEB3_STATUS.UNKNOWN);

      //   const connector =
      //     typeof provider.safe !== "undefined"
      //       ? safeAppConnector
      //       : new InjectedConnector({ provider });
      const connector = new InjectedConnector({ provider });

      try {
        await activate(connector, undefined, true);
        setStatus(WEB3_STATUS.READY);
      } catch (e) {
        if (e instanceof NoEthereumProviderError) {
          setStatus(WEB3_STATUS.UNAVAILABLE);
        }
      }
    },
    [activate]
  );

  const onboard = useMemo(() => getOnboard({ onProvider }), [onProvider]);

  const connectWallet = useCallback(
    async (wallet) => {
      const selected = wallet
        ? await onboard.connectWallet({
            autoSelect: { label: wallet, disableModals: true },
          })
        : await onboard.connectWallet();
      if (!selected) {
        return false;
      }
      const wallets = onboard.state.get("wallet");
      const connectedWallet = wallets?.wallets[0];
      if (connectedWallet) {
        selectedWalletPersistence.set(connectedWallet.label);
        const connector = new InjectedConnector({
          provider: transformProviderFromXinfin(connectedWallet.provider),
        });
        try {
          console.log("activating");
          await activate(connector, undefined, true);
          setStatus(WEB3_STATUS.READY);
        } catch (e) {
          console.error(e);
          if (e instanceof NoEthereumProviderError) {
            setStatus(WEB3_STATUS.UNAVAILABLE);
          }
        }
      }

      return true;
    },
    [onboard]
  );

  const disconnectWallet = async () => {
    const [primaryWallet] = onboard.state.get().wallets;
    await onboard.disconnectWallet({ label: primaryWallet.label });
    deactivate();
    selectedWalletPersistence.clear();
  };

  useEffect(() => {
    if (!web3 || !account) {
      setBalance("0");
      return () => {};
    }

    let timerId = null;
    let canceled = false;

    const poll = async () => {
      timerId = null;

      try {
        const balance_ = await web3.eth.getBalance(account);

        if (!canceled) {
          setBalance(balance_);
        }
      } catch (e) {
        console.warn(
          `Something is wrong when polling for account balance: ${e}`
        );
      }

      if (!canceled) {
        timerId = setTimeout(poll, POLL_INTERVAL);
      }
    };

    poll();

    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }

      canceled = true;
    };
  }, [web3, account]);

  return {
    status,
    active,
    account,
    chainId,
    web3,
    balance,
    connectWallet,
    disconnectWallet,
  };
};

export const [Web3StateProvider, useWeb3State] = constate(Web3State);
