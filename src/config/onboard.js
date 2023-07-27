import { init } from "@web3-onboard/react";
import injectedModule, {
  ProviderIdentityFlag,
  ProviderLabel,
} from "@web3-onboard/injected-wallets";
import transactionPreviewModule from "@web3-onboard/transaction-preview";
import walletConnectModule from "@web3-onboard/walletconnect";
import valid from "../assets/logo.svg";
import { getNetworkIdFromProvider } from "../helpers/web3";
import XDCPayIcon from "../assets/images/icon-xdcpay.png";
import { createEIP1193Provider } from "@web3-onboard/common";
import { createXDCPayProvider } from "./eip1193";
import Web3 from "web3";

export const isWalletAvailable = (provider, checkProviderIdentity, device) => {
  // No injected providers exist.
  if (!provider) {
    return false;
  }

  // Many injected providers add their own object into window.
  if (checkProviderIdentity({ provider, device })) {
    return true;
  }

  // For multiple injected providers, check providers array
  // example coinbase inj wallet pushes over-ridden wallets
  // into a providers array at window.ethereum
  return !!provider.providers?.some((provider) =>
    checkProviderIdentity({ provider, device })
  );
};

const xdcPayRequestPatch = {
  eth_requestAccounts: async () => {
    console.log("eth_requestAccounts");
    const web3 = new Web3(window.web3.currentProvider);
    return web3.eth.getAccounts();
  },
  eth_getBalance: async ({ baseRequest }) => {
    const provider = window.web3.currentProvider;
    const activeAddress = await provider.selectedAddress;
    const balance = await baseRequest({
      method: "eth_getBalance",
      params: [activeAddress, "latest"],
    });
    return balance.toString();
  },
  eth_selectAccounts: ({ baseRequest }) => {
    const request = {
      method: "eth_selectAccounts",
    };
    return baseRequest(request);
  },
};
// Replace with your DApp's Infura ID
const equal = {
  label: "XDCPay",
  injectedNamespace: "ethereum",
  checkProviderIdentity: ({ provider }) => !!provider && !!provider.isXDCPay,
  getIcon: () => XDCPayIcon,
  getInterface: async () => ({
    provider: createXDCPayProvider(window.ethereum, {
      eth_requestAccounts: async () => {
        console.log("eth_requestAccounts");
        const web3 = new Web3(window.web3.currentProvider);
        return web3.eth.getAccounts();
      },

      eth_getBalance: async ({ baseRequest }) => {
        const provider = window.web3.currentProvider;
        const activeAddress = await provider.selectedAddress;
        const balance = await baseRequest({
          method: "eth_getBalance",
          params: [activeAddress, "latest"],
        });
        return balance.toString();
      },
      eth_selectAccounts: ({ baseRequest }) => {
        const request = {
          method: "eth_selectAccounts",
        };
        return baseRequest(request);
      },
    }),
  }),
  platforms: ["all"],
};
function isXDCPay(provider) {
  // return !!provider && (!!provider.isXDCPay || !!provider.isMetaMask)
  return !!provider && !!provider.isXDCPay;
}
function providerIdentityCheck(provider) {
  if (provider.chainId) {
    return !!provider && !!provider.isMetaMask && !!provider.chainId;
  } else {
    return isXDCPay(provider);
  }
}

function providerInterface(window) {
  if ("chainId" in window.ethereum) {
    return createEIP1193Provider(window.ethereum);
  } else {
    return createXDCPayProvider(window.ethereum, xdcPayRequestPatch);
  }
}

const moduleToInject = {
  label: "XDCPay",
  injectedNamespace: "ethereum",
  checkProviderIdentity: ({ provider }) => providerIdentityCheck(provider),
  getIcon: async () => XDCPayIcon,
  getInterface: async () => ({
    provider: providerInterface(window),
  }),
  platforms: ["all"],
};
export const defaultWalletUnavailableMsg = ({ label }) =>
  `Please install or enable ${label} to continue`;

const walletConnect = walletConnectModule({
  bridge: "https://bridge.walletconnect.org",
  qrcodeModalOptions: {
    mobileLinks: ["metamask"],
  },
  connectFirstChainId: false,
});

const transactionPreview = transactionPreviewModule();
const injected = injectedModule({
  custom: [moduleToInject],
  displayUnavailable: false,
  filter: {
    [ProviderLabel.MetaMask]: true,
  },
});

export const initWeb3Onboard = init({
  wallets: [injected, walletConnect],
  chains: [
    {
      id: "0x33",
      token: "XDC",
      label: "Apothem",
      rpcUrl: "https://erpc.apothem.network",
      icon: "https://xinfin.org/assets/images/brand-assets/xdc-icon.svg",
    },
  ],
  appMetadata: {
    name: "Valid by XDCS",
    description: "XDC Staking Application",
    icon: valid,
    agreement: {
      version: "1.0.0",
      termsUrl: "https://www.blocknative.com/terms-conditions",
      privacyUrl: "https://www.blocknative.com/privacy-policy",
    },
    recommendedInjectedWallets: [
      {
        name: "MetaMask",
        url: "https://metamask.io/",
      },
    ],
  },
  connect: {
    iDontHaveAWalletLink:
      "https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en",
  },
  accountCenter: {
    desktop: {
      position: "bottomRight",
      enabled: false,
      minimal: true,
    },
  },
  transactionPreview,
});
