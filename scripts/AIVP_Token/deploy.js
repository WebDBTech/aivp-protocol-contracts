const hre = require("hardhat");

async function deploy() {
  const Contract = await hre.ethers.getContractFactory("AIVPSwapTester");
  const contract = await hre.upgrades.deployProxy(
    Contract,
    [process.env.UNISWAP_ROUTER_ADDRESS, process.env.UNISWAP_FACTORY_ADDRESS],
    {
      initializer: "initialize",
    }
  );
  await contract.deployed();
  console.log(`AIVP Token is deployed to ${contract.address}`);
}

deploy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
