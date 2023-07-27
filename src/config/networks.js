import apothemDeployment from "../dapps-lib/contracts/apothem.json";
import mainnetDeployment from "../dapps-lib/contracts/mainnet.json";

const buildNetworkConfig = (contractsDeployment, base) => {
  const { address: controllerContractAddress, abi: controllerContractAbi } =
    contractsDeployment.contracts.PoolController;
  const { address: custodianContractAddress, abi: custodianContractABI } =
    contractsDeployment.contracts.CustodianContract;
  console.log("PoolController", controllerContractAddress);
  const { address: escrowManagerAddress, abi: escrowManagerABI } =
    contractsDeployment.contracts.EscrowManager;
  return {
    ...base,
    custodianContractAddress,
    custodianContractABI,
    controllerContractAddress,
    controllerContractAbi,
    escrowManagerAddress,
    escrowManagerABI,
  };
};

const NETWORKS = [
  buildNetworkConfig(mainnetDeployment, {
    id: 50,
    name: "XDC Mainnet",
    rpcUrl: "https://rpc.xinfin.yodaplus.net",
    deploymentUrl: "https://tokenization.yodaplus.net/",
  }),
  buildNetworkConfig(apothemDeployment, {
    id: 51,
    name: "XDC Apothem Testnet",
    rpcUrl: "https://rpc-apothem.xinfin.yodaplus.net",
    deploymentUrl: "https://tokenization-apothem.yodaplus.net/",
  }),
];

export default NETWORKS;
