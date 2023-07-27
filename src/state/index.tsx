import { AppStateProvider } from "./useAppState";
import { Web3StateProvider } from "./useWeb3";

interface Props {
  children: React.ReactNode;
}

const GlobalStateProvider: React.FC<Props> = ({ children }) => {
  return <Web3StateProvider>{children}</Web3StateProvider>;
};

export default GlobalStateProvider;
export { useAppState } from "./useAppState";
export { useWeb3State } from "./useWeb3";
