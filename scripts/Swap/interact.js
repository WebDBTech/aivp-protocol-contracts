const { ethers } = require("hardhat");

async function main() {
  const Contract = await ethers.getContractFactory("Swap");
  const contract = Contract.attach(process.env.AIVP_SWAP_ADDRESS);

  const response = await contract.swapAndBurn(
    ethers.utils.parseEther("0.0001"),
    {
      value: ethers.utils.parseEther("0.0001"),
      gasLimit: 1000000,
      gasPrice: ethers.utils.parseUnits("10", "gwei"),
    }
  );

  const receipt = await response.wait();

  console.log(receipt);
}

async function createPool() {
  const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;

  const FACTORY_ADDRESS = process.env.UNISWAP_FACTORY_ADDRESS;

  let token0 = {
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18,
    ratio: 1,
  }; // WETH

  // let token1 = "0x3A3d21711048F56c33Ab90b35b35E48edabE1a09"; // AIVP
  let token1 = {
    address: "0xd4B0EC6D024E912d26dEd548C715507cFB639F43", // TREATS
    decimals: 18,
    ratio: 3000,
  };

  const fee = 3000;

  // When tokens are ordered (token0 < token1) for Uniswap V3,
  // if token0 > token1 then swap tokens and corresponding amounts.
  if (token0.address.toLowerCase() > token1.address.toLowerCase()) {
    [token0, token1] = [token1, token0];
  }

  const sqrtPriceX96 = encodePriceSqrt(
    token0.decimals,
    token1.decimals,
    token1.ratio / token0.ratio
  );

  // ======== ABIs =========
  // Minimal ABI for the Factory
  const factoryAbi = [
    "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)",
    "function createPool(address tokenA, address tokenB, uint24 fee) returns (address)",
  ];

  // Minimal ABI for a Uniswap V3 Pool
  const poolAbi = ["function initialize(uint160 sqrtPriceX96) external"];

  // Set up provider and wallet.
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // Instantiate Uniswap V3 Factory.
  const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, wallet);

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

function nearestUsableTick(tick, tickSpacing) {
  return Math.floor(tick / tickSpacing) * tickSpacing;
}

async function addLiquidityByPoolAddress() {
  // const poolAddress = "0x6d71cc4B7CD9bcB6AAf8a3798F2a0A28AdBDF7B9";
  const poolAddress = "0x9bD3a057bd75e18fA089ACC76192F16B6e0FE7DA";
  const amount0Desired = ethers.utils.parseUnits("0.3", 18);
  const amount1Desired = ethers.utils.parseUnits("1000", 18);
  const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const POSITION_MANAGER_ADDRESS = process.env.POSITION_MANAGER_ADDRESS;

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const poolImmutablesAbi = [
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function fee() view returns (uint24)",
    "function tickSpacing() view returns (int24)",
  ];
  const poolImmutables = new ethers.Contract(
    poolAddress,
    poolImmutablesAbi,
    wallet
  );
  const token0 = await poolImmutables.token0();
  const token1 = await poolImmutables.token1();
  const fee = await poolImmutables.fee();
  const tickSpacing = await poolImmutables.tickSpacing();

  const poolStateAbi = [
    "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16, uint16, uint16, uint8, bool)",
  ];
  const poolState = new ethers.Contract(poolAddress, poolStateAbi, wallet);
  const [sqrtPriceX96, currentTick] = await poolState.slot0();

  const nearestTick = nearestUsableTick(currentTick, tickSpacing);
  const tickLower = nearestTick - 2 * tickSpacing;
  const tickUpper = nearestTick + 2 * tickSpacing;

  console.log(
    `Pool ${poolAddress} state: currentTick = ${currentTick}, nearestTick = ${nearestTick}`
  );
  console.log(`Using tick range: [${tickLower}, ${tickUpper}]`);

  const amount0Min = 0; // amount0Desired.mul(50).div(100); // 50% of desired
  const amount1Min = 0; //amount1Desired.mul(50).div(100); // 50% of desired

  const deadline = Math.floor(Date.now() / 1000) + 300;

  // Approve tokens for the NonfungiblePositionManager.
  const erc20Abi = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ];
  const token0Contract = new ethers.Contract(token0, erc20Abi, wallet);
  const token1Contract = new ethers.Contract(token1, erc20Abi, wallet);

  const allowance0 = await token0Contract.allowance(
    wallet.address,
    POSITION_MANAGER_ADDRESS
  );
  if (allowance0.lt(amount0Desired)) {
    console.log("Approving token0...");
    const txApprove0 = await token0Contract.approve(
      POSITION_MANAGER_ADDRESS,
      amount0Desired
    );
    await txApprove0.wait();
  }
  const allowance1 = await token1Contract.allowance(
    wallet.address,
    POSITION_MANAGER_ADDRESS
  );
  if (allowance1.lt(amount1Desired)) {
    console.log("Approving token1...");
    const txApprove1 = await token1Contract.approve(
      POSITION_MANAGER_ADDRESS,
      amount1Desired
    );
    await txApprove1.wait();
  }

  const positionManagerAbi = [
    "function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
  ];
  const positionManager = new ethers.Contract(
    POSITION_MANAGER_ADDRESS,
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
    amount0Min,
    amount1Min,
    recipient: wallet.address,
    deadline,
  };

  console.log("Minting liquidity position...");
  const txMint = await positionManager.mint(params, {
    value: 0,
    gasLimit: 1000000,
    gasPrice: ethers.utils.parseUnits("10", "gwei"),
  });
  const receiptMint = await txMint.wait();
  console.log("Liquidity added. Transaction receipt:", receiptMint);
  return receiptMint;
}

async function removeLiquidity() {
  const tokenId = 12732;
  const liquidityToRemove = ethers.BigNumber.from("99999999999999999");
  const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const POSITION_MANAGER_ADDRESS = process.env.POSITION_MANAGER_ADDRESS;

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const positionManagerAbi = [
    // decreaseLiquidity takes a struct as parameter.
    "function decreaseLiquidity((uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external payable returns (uint256 amount0, uint256 amount1)",
    // collect function to withdraw tokens.
    "function collect((uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) external payable returns (uint256 amount0, uint256 amount1)",
  ];

  const positionManager = new ethers.Contract(
    POSITION_MANAGER_ADDRESS,
    positionManagerAbi,
    wallet
  );

  // Set a deadline (e.g., 5 minutes from now)
  const deadline = Math.floor(Date.now() / 1000) + 300;

  const amount0Min = 0;
  const amount1Min = 0;

  console.log(
    `Decreasing liquidity for tokenId ${tokenId} by ${liquidityToRemove.toString()}`
  );
  const txDecrease = await positionManager.decreaseLiquidity(
    {
      tokenId,
      liquidity: liquidityToRemove,
      amount0Min,
      amount1Min,
      deadline,
    },
    {
      gasLimit: 3000000,
      gasPrice: ethers.utils.parseUnits("10", "gwei"),
    }
  );
  const receiptDecrease = await txDecrease.wait();
  console.log("Liquidity decreased. Receipt:", receiptDecrease);

  const paramsCollect = {
    tokenId,
    recipient: wallet.address,
    amount0Max: ethers.BigNumber.from(2).pow(128).sub(1),
    amount1Max: ethers.BigNumber.from(2).pow(128).sub(1),
  };

  console.log(`Collecting tokens for tokenId ${tokenId}`);
  const txCollect = await positionManager.collect(paramsCollect, {
    gasLimit: 3000000,
    gasPrice: ethers.utils.parseUnits("10", "gwei"),
  });
  const receiptCollect = await txCollect.wait();
  console.log("Tokens collected. Receipt:", receiptCollect);
}

function encodePriceSqrt(token0Decimals, token1Decimals, priceFloat) {
  // Step 1: shift the price by token1 decimals
  const numerator = ethers.utils.parseUnits(
    priceFloat.toString(),
    token1Decimals
  );

  // Step 2: denominator = 10^token0Decimals
  const denominator = ethers.BigNumber.from(10).pow(token0Decimals);

  /// ratioQ192 = (numerator << 192) / denominator
  const shift192 = ethers.BigNumber.from(1).shl(192);
  const ratioQ192 = numerator.mul(shift192).div(denominator);

  // Integer square root function for ethers.BigNumber
  function bnSqrt(value) {
    let x = value;
    let y = x.add(1).shr(1);
    while (y.lt(x)) {
      x = y;
      y = x.add(value.div(x)).shr(1);
    }
    return x;
  }

  const sqrtPriceX96 = bnSqrt(ratioQ192);
  return sqrtPriceX96;
}

async function swapTokens() {
  try {
    // ----- Configuration -----
    const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const SWAP_ROUTER_ADDRESS = process.env.UNISWAP_ROUTER_ADDRESS;
    const TOKEN_0 = "0x3A3d21711048F56c33Ab90b35b35E48edabE1a09"; // Token to swap from
    const TOKEN_1 = "0x4200000000000000000000000000000000000006"; // Token to swap to
    const FEE = 3000;
    const amountIn = ethers.utils.parseUnits("0.001", 18);
    const deadline = Math.floor(Date.now() / 1000) + 10 * 60; // 10 minutes from now
    const amountOutMinimum = 0;
    const sqrtPriceLimitX96 = 0;

    // ----- Set up provider and wallet -----
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // ----- Approve token for the router -----
    const erc20Abi = [
      "function approve(address spender, uint256 amount) external returns (bool)",
    ];
    const tokenContract = new ethers.Contract(TOKEN_0, erc20Abi, wallet);
    console.log("Approving token for the router...");
    const txApprove = await tokenContract.approve(
      SWAP_ROUTER_ADDRESS,
      amountIn
    );
    await txApprove.wait();
    console.log("Token approved.");

    // ----- Prepare the swap -----
    const swapRouterAbi = [
      "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
    ];
    const swapRouter = new ethers.Contract(
      SWAP_ROUTER_ADDRESS,
      swapRouterAbi,
      wallet
    );
    const params = {
      tokenIn: TOKEN_0,
      tokenOut: TOKEN_1,
      fee: FEE,
      recipient: wallet.address,
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: sqrtPriceLimitX96,
    };

    console.log("Performing swap...");
    const txSwap = await swapRouter.exactInputSingle(params, {
      gasLimit: 1000000,
      gasPrice: ethers.utils.parseUnits("10", "gwei"),
    });
    const receipt = await txSwap.wait();
    console.log("Swap complete. Transaction receipt:", receipt);
  } catch (error) {
    console.error("Error during swap:", error);
  }
}

swapTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
