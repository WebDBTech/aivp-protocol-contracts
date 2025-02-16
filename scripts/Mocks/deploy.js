const hre = require("hardhat");

async function deploy() {
  const Contract = await hre.ethers.getContractFactory("SwapExamples");
  const contract = await Contract.deploy(process.env.UNISWAP_ROUTER_ADDRESS);
  await contract.deployed();
  console.log(`SwapExamples contract is deployed to ${contract.address}`);
}

deploy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
