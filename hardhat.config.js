/* global ethers task */
require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@nomicfoundation/hardhat-network-helpers");
require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");
// require("@uniswap/v4-core");
// require("@uniswap/v4-periphery");

task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

module.exports = {
  defaultNetwork: "baseSepolia",
  networks: {
    hardhat: {
      accounts: [
        {
          privateKey:
            "0xec7a996c7e3b5837006deef1f39877c7b263536c61b7c430f67b1ad94bf5f6d9",
          balance: "1000000000000000000000000",
        },
        {
          privateKey:
            "0x824c62fc81e6cbae8a0e538e44c9667372a7ac5dee16c52c4f339ae7c7b9d477",
          balance: "1000000000000000000000000",
        },
        {
          privateKey:
            "0x017f640795fd1088cda7fb50474fabf53eedaffe3ddf1959f2bb0bc6d151b5ba",
          balance: "1000000000000000000000000",
        },
      ],
    },
    ganache: {
      url: "HTTP://127.0.0.1:7545",
      accounts: [
        "0x8d1063e0df55415fe74730f79ee389a4ed9a77463d2f03115f123425fabd85de",
      ],
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    base: {
      url: process.env.BASE_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      base: process.env.BASE_API_KEY,
      base_sepolia: process.env.BASE_API_KEY,
    },
    customChains: [
      {
        network: "base_sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api-basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
    ],
  },
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
