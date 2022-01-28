// deploy/01_deploy_vendor.js

const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  // You might need the previously deployed yourToken:
  const koyweToken = await ethers.getContract("KoyweToken", deployer);

  // Todo: deploy the vendor

  await deploy("KoyweVendor", {
    from: deployer,
    args: [koyweToken.address], // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    log: true,
  });

  const vendor = await ethers.getContract("KoyweVendor", deployer);

  // Todo: transfer the tokens to the vendor
  console.log("\n 🏵  Sending all 999999900 tokens left to the vendor...\n");

  const transferTransaction = await koyweToken.transfer(
    vendor.address,
    ethers.utils.parseEther("999999900")
  );

  // console.log("\n    ✅ confirming...\n");
  await sleep(5000); // wait 5 seconds for transaction to propagate

  // ToDo: change address to your frontend address vvvv
  console.log("\n 🤹  Sending ownership to frontend address...\n")
  const ownershipTransaction = await vendor.transferOwnership("0x40f9bf922c23c43acdad71Ab4425280C0ffBD697" );
  console.log("\n    ✅ confirming...\n");
  const ownershipResult = await ownershipTransaction.wait();

  // ToDo: Verify your contract with Etherscan for public chains
  // if (chainId !== "31337") {
  //   try {
  //     console.log(" 🎫 Verifing Contract on Etherscan... ");
  //     await sleep(5000); // wait 5 seconds for deployment to propagate
  //     await run("verify:verify", {
  //       address: vendor.address,
  //       contract: "contracts/KoyweVendor.sol:KoyweVendor",
  //       contractArguments: [koyweToken.address],
  //     });
  //   } catch (e) {
  //     console.log(" ⚠️ Failed to verify contract on Etherscan ");
  //   }
  // }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports.tags = ["KoyweVendor"];
