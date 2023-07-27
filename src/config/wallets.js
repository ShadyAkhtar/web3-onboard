import NETWORKS from "./networks";
import { getNetworkIdFromProvider } from "../helpers/web3";

import XDCPayIcon from "../assets/images/icon-xdcpay.png";
import MetaMaskIcon from "../assets/images/metamask-fox.svg";

const WALLETS = [
  { walletName: "gnosis" },
  {
    walletName: "walletConnect",
    rpc: Object.fromEntries(NETWORKS.map(({ id, rpcUrl }) => [id, rpcUrl])),
    bridge: "https://bridge.walletconnect.org",
    preferred: true,
  },
  {
    name: "XDCPay",
    iconSrc: XDCPayIcon,
    iconSrcSet: XDCPayIcon,
    wallet: async (helpers) => {
      const { createModernProviderInterface } = helpers;
      const provider = window.ethereum;
      const network = provider
        ? await getNetworkIdFromProvider(provider)
        : null;
      const isCorrectWallet = network === 50 || network === 51;

      const interfaceValue = isCorrectWallet
        ? createModernProviderInterface(provider)
        : null;

      return {
        provider,
        interface: interfaceValue,
      };
    },
    type: "injected",
    link: "https://chrome.google.com/webstore/detail/xinpay/bocpokimicclpaiekenaeelehdjllofo",
    installMessage: (wallets) => {
      const { currentWallet, selectedWallet } = wallets;
      if (currentWallet) {
        return `You have ${currentWallet} installed already but if you would prefer to use ${selectedWallet} instead, then click below to install.`;
      }

      return `You will need to install ${selectedWallet} to continue. Click below to install.`;
    },
    desktop: true,
    mobile: false,
    preferred: true,
  },
  {
    name: "MetaMask",
    iconSrc: MetaMaskIcon,
    iconSrcSet: MetaMaskIcon,
    wallet: async (helpers) => {
      const { createModernProviderInterface } = helpers;
      const provider = window.ethereum;
      const network = provider
        ? await getNetworkIdFromProvider(provider)
        : null;
      const isCorrectWallet = network === 50 || network === 51;

      const interfaceValue = isCorrectWallet
        ? createModernProviderInterface(provider)
        : null;

      return {
        provider,
        interface: interfaceValue,
      };
    },
    type: "injected",
    link: "https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn",
    installMessage: (wallets) => {
      const { currentWallet, selectedWallet } = wallets;
      if (currentWallet) {
        return `You have ${currentWallet} installed already but if you would prefer to use ${selectedWallet} instead, then click below to install.`;
      }

      return `You will need to install ${selectedWallet} to continue. Click below to install.`;
    },
    desktop: true,
    mobile: false,
    preferred: true,
  },
];

export default WALLETS;
