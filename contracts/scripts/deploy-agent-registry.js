const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Registration fee: 0 ETH for MVP (can be updated later)
  const registrationFee = ethers.parseEther("0");
  
  console.log(`\n🚀 Deploying AgentRegistry with registration fee: ${ethers.formatEther(registrationFee)} ETH`);
  
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(registrationFee);
  
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  
  console.log("✅ AgentRegistry deployed to:", agentRegistryAddress);
  
  // Verify contract is working
  const totalAgents = await agentRegistry.totalAgents();
  const currentFee = await agentRegistry.registrationFee();
  
  console.log("📊 Contract verification:");
  console.log("  - Total agents:", totalAgents.toString());
  console.log("  - Registration fee:", ethers.formatEther(currentFee), "ETH");
  console.log("  - Owner:", await agentRegistry.owner());
  
  console.log(`\n💾 Save this info for next deployments:`);
  console.log(`AGENT_REGISTRY_ADDRESS=${agentRegistryAddress}`);
  
  return agentRegistryAddress;
}

main()
  .then((address) => {
    console.log(`\n🎉 Deployment complete! AgentRegistry: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });