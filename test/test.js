const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

describe("Test", async function () {
  //set log level to ignore non errors
  ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR);

  let snapshotId;
  let restoreSnapshot;
  let fixtureData;

  beforeEach(async function () {
    // Load the fixture to set up a clean environment
    fixtureData = await loadFixture(deployFixture);

    // Take an EVM snapshot
    snapshotId = await ethers.provider.send("evm_snapshot", []);

    // Prepare a function to restore this snapshot
    restoreSnapshot = async () =>
      await ethers.provider.send("evm_revert", [snapshotId]);
  });

  afterEach(async function () {
    // Restore the EVM snapshot to reset any state changes (including time)
    await restoreSnapshot();
  });

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFixture() {
    // const [owner, addr1, addr2] = await ethers.getSigners();

    // const { diamond, diamondFacet, WMATIC } = await deployFacet("");

    // const nft = await deployNFTContract(owner.address);

    // return { diamond, diamondFacet, nft, owner, addr1, addr2, WMATIC };
  }

  describe("", async function () {
    // it("", async function () {
    //  
    // });
  });
});
