const hre = require("hardhat");

async function deploy() {
  const Contract = await hre.ethers.getContractFactory("AIVPToken");
  const contract = await hre.upgrades.deployProxy(
    Contract,
    ["0x4D05e9C17f1aa3449062B6bF62e1Cd474Bd33F50"],
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
