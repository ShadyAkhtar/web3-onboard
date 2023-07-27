import { init, useConnectWallet } from "@web3-onboard/react";
import injectedModule from "@web3-onboard/injected-wallets";
import { ethers } from "ethers";
import walletConnectModule from "@web3-onboard/walletconnect";
// import GlobalStateProvider from "./state";
import { Web3StateProvider } from "./state/useWeb3";
// import { WalletConnectOptions } from "@web3-onboard/walletconnect";

// Sign up to get your free API key at https://explorer.blocknative.com/?signup=true
// Required for Transaction Notifications and Transaction Preview
const apiKey = "1730eff0-9d50-4382-a3fe-89f0d34a2070";

const injected = injectedModule();

const infuraKey = "<INFURA_KEY>";

const ENV = import.meta.env;

console.log("Network ID: ", ENV.VITE_APP_NETWORK_ID);
const wcV2InitOptions = {
  /**
   * Project ID associated with [WalletConnect account](https://cloud.walletconnect.com)
   */
  projectId: "****",
  /**
   * Chains required to be supported by all wallets connecting to your DApp
   */
  requiredChains: [1, 56],
  /**
   * Defaults to `appMetadata.explore` that is supplied to the web3-onboard init
   * Strongly recommended to provide atleast one URL as it is required by some wallets (i.e. MetaMask)
   * To connect with WalletConnect
   */
  dappUrl: "http://YourAwesomeDapp.com",
};
const rpcUrl = `https://mainnet.infura.io/v3/${infuraKey}`;
const walletConnect = walletConnectModule(wcV2InitOptions);
// initialize Onboard
init({
  apiKey,
  wallets: [injected, walletConnect],
  chains: [
    {
      id: "0x1",
      token: "ETH",
      label: "Ethereum Mainnet",
      rpcUrl,
    },
  ],
});

function App() {
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();

  // create an ethers provider
  let ethersProvider;

  if (wallet) {
    // if using ethers v6 this is:
    // ethersProvider = new ethers.BrowserProvider(wallet.provider, 'any')
    ethersProvider = new ethers.providers.Web3Provider(wallet.provider, "any");
    console.log("ethersProvider", ethersProvider);
  }

  return (
    // <GlobalStateProvider>
    <Web3StateProvider>
      <div>
        <button
          disabled={connecting}
          onClick={() => (wallet ? disconnect(wallet) : connect())}
        >
          {connecting ? "connecting" : wallet ? "disconnect" : "connect?"}
        </button>
      </div>
    </Web3StateProvider>
    // </GlobalStateProvider>
  );
}

export default App;
