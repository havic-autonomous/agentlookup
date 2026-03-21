const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying ReputationRegistry with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // You need to provide the AgentRegistry address
  // This can be passed as environment variable or command line argument
  const agentRegistryAddress = process.env.AGENT_REGISTRY_ADDRESS;
  
  if (!agentRegistryAddress) {
    throw new Error("AGENT_REGISTRY_ADDRESS environment variable is required");
  }
  
  console.log(`\n🚀 Deploying ReputationRegistry with AgentRegistry: ${agentRegistryAddress}`);
  
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationRegistry.deploy(agentRegistryAddress);
  
  await reputationRegistry.waitForDeployment();
  const reputationRegistryAddress = await reputationRegistry.getAddress();
  
  console.log("✅ ReputationRegistry deployed to:", reputationRegistryAddress);
  
  // Verify contract is working
  const linkedRegistry = await reputationRegistry.agentRegistry();
  const owner = await reputationRegistry.owner();
  
  console.log("📊 Contract verification:");
  console.log("  - Linked AgentRegistry:", linkedRegistry);
  console.log("  - Owner:", owner);
  console.log("  - Feedback cooldown:", "30 days");
  
  console.log(`\n💾 Save this info:`);
  console.log(`REPUTATION_REGISTRY_ADDRESS=${reputationRegistryAddress}`);
  
  return reputationRegistryAddress;
}

main()
  .then((address) => {
    console.log(`\n🎉 Deployment complete! ReputationRegistry: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });