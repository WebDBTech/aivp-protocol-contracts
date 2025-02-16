const { ethers } = require("hardhat");

async function mint() {
  const Contract = await ethers.getContractFactory("AIVPToken");
  const contract = Contract.attach(process.env.AIVP_TOKEN_ADDRESS);

  const response = await contract.mint(
    "0x4D05e9C17f1aa3449062B6bF62e1Cd474Bd33F50",
    ethers.utils.parseEther("10000")
  );

  const receipt = await response.wait();

  console.log(receipt);
}

async function approve() {
  const Contract = await ethers.getContractFactory("AIVP");
  const contract = Contract.attach(process.env.AIVP_TOKEN_ADDRESS);

  const response = await contract.approve(
    process.env.AIVP_PROTOCOL_ADDRESS,
    ethers.utils.parseEther("10000"),
    {
      gasLimit: 1000000,
      gasPrice: ethers.utils.parseUnits("10", "gwei"),
    }
  );

  const receipt = await response.wait();

  console.log(receipt);
}

mint()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
