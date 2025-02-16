const { ethers } = require("hardhat");

async function registerProject() {
  const Contract = await ethers.getContractFactory("AIVP");
  const contract = Contract.attach(process.env.AIVP_PROTOCOL_ADDRESS);

  const response = await contract.registerProject(
    {
      name: "PawPro AI Agent",
      description:
        "PawPro Ai Bot powered by AIVP.AI, your 24/7 dog symptom checker—offering general guidance.",
      website: "https://t.me/PawProAiBot",
      logo: "https://cdn4.cdn-telegram.org/file/TXpd2yWSKgjkrRqsZzKgohXt5jFmmvrobHfhxeEsFwEIy50Kgh5_2K8UnYXk9huDwoFf4UFynL7Lk6sw2uSLGjcvqghSI6rvc_0igM3bAwfx5l8kg3JKnXsNaYLcYmthte1_bBPrcKsVRt_854wTllGJEjSILeX8wUUZntiZa7Lv1efyVuEcnCb_N8rCKMRjuZ8-OIqyoF9ZVkjTu88iqXzeSMpmUrd9cu1_m8GP0glHLKpDvRu_dom6fP9d-RH_Yh7tzkMD4BJGv_Djxqbd4aQ7_XWjFBSHzNKJEL_RMOvrc0PgOypkFIRJqKLHt-JGcIomq-vm5_LLZFXtf6KtEg.jpg",
      socials: ["https://t.me/PawProAiBot"],
    },
    {
      value: ethers.utils.parseEther("0.0001"),
      gasLimit: 1000000,
      gasPrice: ethers.utils.parseUnits("10", "gwei"),
    }
  );

  const receipt = await response.wait();

  console.log(receipt);
}

async function getAllProjects() {
  const Contract = await ethers.getContractFactory("AIVP");
  const contract = Contract.attach(process.env.AIVP_PROTOCOL_ADDRESS);

  const response = await contract.getAllProjects();

  console.log(response);
}

async function addValue() {
  const Contract = await ethers.getContractFactory("AIVP");
  const contract = Contract.attach(process.env.AIVP_PROTOCOL_ADDRESS);

  const response = await contract.addValue(0, ethers.utils.parseEther("1"), {
    value: ethers.utils.parseEther((1 / 20).toString()),
    gasLimit: 1000000,
    gasPrice: ethers.utils.parseUnits("10", "gwei"),
  });

  const receipt = await response.wait();

  console.log(receipt);
}

async function processValueNativeToken() {
  const Contract = await ethers.getContractFactory("AIVP");
  const contract = Contract.attach(process.env.AIVP_PROTOCOL_ADDRESS);
  const projectId = 0;
  const value = 0.001;
  const response = await contract.processValueNativeToken(
    projectId,
    ethers.utils.parseEther(value.toString()),
    {
      value: ethers.utils.parseEther((value / 20).toString()),
      gasLimit: 1000000,
      gasPrice: ethers.utils.parseUnits("10", "gwei"),
    }
  );

  const receipt = await response.wait();

  console.log(receipt);
}

processValueNativeToken()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
