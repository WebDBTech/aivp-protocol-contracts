const { ethers } = require("hardhat");

async function swap() {
  const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const Contract = await ethers.getContractFactory("SwapExamples");
  const contract = Contract.attach(process.env.SWAP_EXAMPLE_ADDRESS);

  const TOKEN_0 = "0x3A3d21711048F56c33Ab90b35b35E48edabE1a09";
  const amountIn = ethers.utils.parseUnits("1", 18);

  // ----- Approve token for the router -----
  const erc20Abi = [
    "function approve(address spender, uint256 amount) external returns (bool)",
  ];
  const tokenContract = new ethers.Contract(TOKEN_0, erc20Abi, wallet);
  console.log("Approving token for the router...");
  const txApprove = await tokenContract.approve(
    process.env.SWAP_EXAMPLE_ADDRESS,
    amountIn
  );
  await txApprove.wait();
  console.log("Token approved.");

  const response = await contract.swapExactInputSingle(amountIn, {
    gasLimit: 1000000,
    gasPrice: ethers.utils.parseUnits("10", "gwei"),
  });

  const receipt = await response.wait();

  console.log(receipt);
}

swap()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
