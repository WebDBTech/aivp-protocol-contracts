const { ethers } = require("hardhat");
const FACTORY_ABI = require("./abis/factory.json");
const SWAP_ROUTER_ABI = require("./abis/swaprouter.json");
const POOL_ABI = require("./abis/pool.json");

// Common utility functions
const getProviderAndWallet = (rpcUrl, privateKey) => {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return { provider, wallet };
};

const getCommonGasConfig = (gasLimit = 1000000) => ({
  gasLimit,
  gasPrice: ethers.utils.parseUnits("10", "gwei"),
});

const approveToken = async (tokenAddress, spenderAddress, amount, wallet) => {
  const erc20Abi = [
    "function approve(address spender, uint256 amount) external returns (bool)",
  ];
  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet);
  console.log("Approving token...");
  const tx = await tokenContract.approve(
    spenderAddress,
    amount,
    getCommonGasConfig()
  );
  await tx.wait();
  console.log("Token approved");
};

// Main functions
async function main() {
  const Contract = await ethers.getContractFactory("Swap");
  const contract = Contract.attach(process.env.AIVP_SWAP_ADDRESS);

  const amount = ethers.utils.parseEther("0.0001");
  const response = await contract.swapAndBurn(amount, {
    value: amount,
    ...getCommonGasConfig(),
  });

  const receipt = await response.wait();
  console.log(receipt);
}

function encodePriceSqrt(token0Decimals, token1Decimals, priceFloat) {
  const numerator = ethers.utils.parseUnits(
    priceFloat.toString(),
    token1Decimals
  );
  const denominator = ethers.BigNumber.from(10).pow(token0Decimals);
  const shift192 = ethers.BigNumber.from(1).shl(192);
  const ratioQ192 = numerator.mul(shift192).div(denominator);

  function bnSqrt(value) {
    let x = value;
    let y = x.add(1).shr(1);
    while (y.lt(x)) {
      x = y;
      y = x.add(value.div(x)).shr(1);
    }
    return x;
  }

  return bnSqrt(ratioQ192);
}

function nearestUsableTick(tick, tickSpacing) {
  return Math.floor(tick / tickSpacing) * tickSpacing;
}

async function createPool() {
  const { provider, wallet } = getProviderAndWallet(
    process.env.BASE_SEPOLIA_RPC_URL,
    process.env.PRIVATE_KEY
  );

  let token0 = {
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18,
    ratio: 1,
  };

  let token1 = {
    address: "0xd4B0EC6D024E912d26dEd548C715507cFB639F43",
    decimals: 18,
    ratio: 3000,
  };

  if (token0.address.toLowerCase() > token1.address.toLowerCase()) {
    [token0, token1] = [token1, token0];
  }

  const fee = 3000;
  const sqrtPriceX96 = encodePriceSqrt(
    token0.decimals,
    token1.decimals,
    token1.ratio / token0.ratio
  );

  const poolAbi = ["function initialize(uint160 sqrtPriceX96) external"];

  const factory = new ethers.Contract(
    process.env.UNISWAP_FACTORY_ADDRESS,
    FACTORY_ABI,
    wallet
  );

  let poolAddress = await factory.getPool(token0.address, token1.address, fee);

  if (poolAddress === ethers.constants.AddressZero) {
    console.log("Pool does not exist. Creating pool...");
    const txCreate = await factory.createPool(
      token0.address,
      token1.address,
      fee
    );
    await txCreate.wait();

    poolAddress = await factory.getPool(token0.address, token1.address, fee);
    console.log("Pool created at:", poolAddress);

    const pool = new ethers.Contract(poolAddress, poolAbi, wallet);
    const txInit = await pool.initialize(sqrtPriceX96);
    await txInit.wait();
    console.log("Pool initialized with sqrtPriceX96:", sqrtPriceX96.toString());
  } else {
    console.log("Pool already exists at:", poolAddress);
  }
}

async function addLiquidityByPoolAddress() {
  const poolAddress = "0x9bD3a057bd75e18fA089ACC76192F16B6e0FE7DA";
  const amount0Desired = ethers.utils.parseUnits("0.3", 18);
  const amount1Desired = ethers.utils.parseUnits("1000", 18);

  const { wallet } = getProviderAndWallet(
    process.env.BASE_SEPOLIA_RPC_URL,
    process.env.PRIVATE_KEY
  );

  const poolImmutables = new ethers.Contract(poolAddress, POOL_ABI, wallet);
  const poolState = new ethers.Contract(poolAddress, POOL_ABI, wallet);

  const [token0, token1, fee, tickSpacing] = await Promise.all([
    poolImmutables.token0(),
    poolImmutables.token1(),
    poolImmutables.fee(),
    poolImmutables.tickSpacing(),
  ]);

  const [, currentTick] = await poolState.slot0();
  const nearestTick = nearestUsableTick(currentTick, tickSpacing);
  const tickLower = nearestTick - 2 * tickSpacing;
  const tickUpper = nearestTick + 2 * tickSpacing;

  // Approve tokens
  await approveToken(
    token0,
    process.env.POSITION_MANAGER_ADDRESS,
    amount0Desired,
    wallet
  );
  await approveToken(
    token1,
    process.env.POSITION_MANAGER_ADDRESS,
    amount1Desired,
    wallet
  );

  const positionManagerAbi = [
    "function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
  ];

  const positionManager = new ethers.Contract(
    process.env.POSITION_MANAGER_ADDRESS,
    positionManagerAbi,
    wallet
  );

  const params = {
    token0,
    token1,
    fee,
    tickLower,
    tickUpper,
    amount0Desired,
    amount1Desired,
    amount0Min: 0,
    amount1Min: 0,
    recipient: wallet.address,
    deadline: Math.floor(Date.now() / 1000) + 300,
  };

  console.log("Minting liquidity position...");
  const txMint = await positionManager.mint(params, {
    value: 0,
    ...getCommonGasConfig(),
  });
  const receiptMint = await txMint.wait();
  console.log("Liquidity added. Transaction receipt:", receiptMint);
  return receiptMint;
}

async function removeLiquidity() {
  const tokenId = 12732;
  const liquidityToRemove = ethers.BigNumber.from("99999999999999999");

  const { wallet } = getProviderAndWallet(
    process.env.BASE_SEPOLIA_RPC_URL,
    process.env.PRIVATE_KEY
  );

  const positionManagerAbi = [
    "function decreaseLiquidity((uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external payable returns (uint256 amount0, uint256 amount1)",
    "function collect((uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) external payable returns (uint256 amount0, uint256 amount1)",
  ];

  const positionManager = new ethers.Contract(
    process.env.POSITION_MANAGER_ADDRESS,
    positionManagerAbi,
    wallet
  );

  const deadline = Math.floor(Date.now() / 1000) + 300;

  console.log(
    `Decreasing liquidity for tokenId ${tokenId} by ${liquidityToRemove.toString()}`
  );
  const txDecrease = await positionManager.decreaseLiquidity(
    {
      tokenId,
      liquidity: liquidityToRemove,
      amount0Min: 0,
      amount1Min: 0,
      deadline,
    },
    getCommonGasConfig(3000000)
  );

  const receiptDecrease = await txDecrease.wait();
  console.log("Liquidity decreased. Receipt:", receiptDecrease);

  const maxUint128 = ethers.BigNumber.from(2).pow(128).sub(1);
  const paramsCollect = {
    tokenId,
    recipient: wallet.address,
    amount0Max: maxUint128,
    amount1Max: maxUint128,
  };

  console.log(`Collecting tokens for tokenId ${tokenId}`);
  const txCollect = await positionManager.collect(
    paramsCollect,
    getCommonGasConfig(3000000)
  );
  const receiptCollect = await txCollect.wait();
  console.log("Tokens collected. Receipt:", receiptCollect);
}

async function swapTokens() {
  try {
    const { wallet } = getProviderAndWallet(
      process.env.BASE_SEPOLIA_RPC_URL,
      process.env.PRIVATE_KEY
    );

    const TOKEN_0 = "0x3A3d21711048F56c33Ab90b35b35E48edabE1a09";
    const TOKEN_1 = "0x4200000000000000000000000000000000000006";
    const amountIn = ethers.utils.parseUnits("0.001", 18);

    await approveToken(
      TOKEN_0,
      process.env.UNISWAP_ROUTER_ADDRESS,
      amountIn,
      wallet
    );

    const swapRouter = new ethers.Contract(
      process.env.UNISWAP_ROUTER_ADDRESS,
      SWAP_ROUTER_ABI,
      wallet
    );

    const params = {
      tokenIn: TOKEN_0,
      tokenOut: TOKEN_1,
      fee: 3000,
      recipient: wallet.address,
      amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    };

    console.log("Performing swap...");
    const txSwap = await swapRouter.exactInputSingle(
      params,
      getCommonGasConfig()
    );
    const receipt = await txSwap.wait();
    console.log("Swap complete. Transaction receipt:", receipt);
  } catch (error) {
    console.error("Error during swap:", error);
  }
}

// Execute
// swapTokens()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });

module.exports = {
  approveToken,
};
