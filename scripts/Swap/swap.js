const FACTORY_ABI = require("./abis/factory.json");
const QUOTER_ABI = require("./abis/quoter.json");
const SWAP_ROUTER_ABI = require("./abis/swaprouter.json");
const POOL_ABI = require("./abis/pool.json");
const TOKEN_IN_ABI = require("./abis/weth.json");

const SWAP_ROUTER_CONTRACT_ADDRESS = process.env.UNISWAP_ROUTER_ADDRESS;

// Provider, Contract & Signer Instances
const provider = new ethers.providers.JsonRpcProvider(
  process.env.ETH_SEPOLIA_RPC_URL
);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Token Configuration
const WETH = {
  chainId: 11155111,
  address: "0xfff9976782d46cc05630d1f6ebab18b2324d6b14",
  decimals: 18,
  symbol: "WETH",
  name: "Wrapped Ether",
  isToken: true,
  isNative: true,
  wrapped: true,
};

const USDC = {
  chainId: 11155111,
  address: "0xF704F975a729D98aDF6c29cCAa56B8ACecA4663E",
  decimals: 6,
  symbol: "USDC",
  name: "USD//C",
  isToken: true,
  isNative: true,
  wrapped: false,
};

const AIVP = {
  chainId: 11155111,
  address: "0x80739C10E40BEf6D505CF17A3F33b14e07daBc83",
  decimals: 18,
  symbol: "AIVP",
  name: "AIVP",
  isToken: true,
  isNative: true,
  wrapped: false,
};

// Approve Token Function
async function approveToken(tokenAddress, tokenABI, amount, wallet) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    const approveTransaction = await tokenContract.populateTransaction.approve(
      SWAP_ROUTER_CONTRACT_ADDRESS,
      ethers.utils.parseEther(amount.toString())
    );
    const transactionResponse = await wallet.sendTransaction(
      approveTransaction
    );
    console.log(`-------------------------------`);
    console.log(`Sending Approval Transaction...`);
    console.log(`Transaction Sent: ${transactionResponse.hash}`);
    await transactionResponse.wait();
  } catch (error) {
    console.error("An error occurred during token approval:", error);
    throw new Error("Token approval failed");
  }
}

// Prepare Swap Parameters Function
async function prepareSwapParams(poolContract, signer, amountIn, amountOut) {
  return {
    tokenIn: AIVP.address,
    tokenOut: USDC.address,
    fee: 3000, //await poolContract.fee(),
    recipient: signer.address,
    amountIn: amountIn,
    amountOutMinimum: amountOut,
    sqrtPriceLimitX96: 0,
  };
}

// Execute Swap Function
async function executeSwap(swapRouter, params, signer) {
  const transaction = await swapRouter.populateTransaction.exactInputSingle(
    params,
    {
      gasLimit: 1000000,
      gasPrice: ethers.utils.parseUnits("10", "gwei"),
    }
  );
  const receipt = await signer.sendTransaction(transaction);
  console.log(receipt);
  console.log(`-------------------------------`);
  console.log(`Hash ${receipt.hash}`);
  console.log(`-------------------------------`);
}

// Main Function: Orchestrates the swap
async function main(swapAmount) {
  const inputAmount = swapAmount;
  const amountIn = ethers.utils.parseUnits(inputAmount.toString(), 18);

  try {
    await approveToken(AIVP.address, TOKEN_IN_ABI, amountIn, signer);
    console.log(`-------------------------------`);
    console.log(`Swap Amount: ${ethers.utils.formatEther(amountIn)}`);

    const params = await prepareSwapParams(null, signer, amountIn, 0);

    const swapRouter = new ethers.Contract(
      SWAP_ROUTER_CONTRACT_ADDRESS,
      SWAP_ROUTER_ABI,
      signer
    );

    await executeSwap(swapRouter, params, signer);
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}

main(0.0001); // Change the swap amount as needed
