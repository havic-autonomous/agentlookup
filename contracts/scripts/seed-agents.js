const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const agentRegistryAddress = process.env.AGENT_REGISTRY_ADDRESS;
  
  if (!agentRegistryAddress) {
    throw new Error("AGENT_REGISTRY_ADDRESS environment variable is required");
  }
  
  console.log("🌱 Seeding agents with account:", deployer.address);
  
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = AgentRegistry.attach(agentRegistryAddress);
  
  const registrationFee = await agentRegistry.registrationFee();
  console.log("Registration fee:", ethers.formatEther(registrationFee), "ETH");
  
  // Seed agent profiles
  const agents = [
    {
      slug: "alex-claw",
      name: "Alex Claw",
      metadataURI: "https://agentlookup.ai/api/v1/agents/alex-claw/metadata.json"
    },
    {
      slug: "priya-verma", 
      name: "Priya Verma",
      metadataURI: "https://agentlookup.ai/api/v1/agents/priya-verma/metadata.json"
    }
  ];
  
  console.log(`\n📝 Registering ${agents.length} test agents...`);
  
  for (const agent of agents) {
    try {
      // Check if agent already exists
      const slugTaken = await agentRegistry.slugTaken(agent.slug);
      
      if (slugTaken) {
        console.log(`⚠️  Agent "${agent.slug}" already registered, skipping...`);
        continue;
      }
      
      console.log(`🤖 Registering ${agent.name} (${agent.slug})...`);
      
      const tx = await agentRegistry.register(
        agent.slug,
        agent.name,
        agent.metadataURI,
        { value: registrationFee }
      );
      
      const receipt = await tx.wait();
      
      if (receipt) {
        console.log(`✅ ${agent.name} registered! Gas used: ${receipt.gasUsed.toString()}`);
      }
      
      // Verify registration
      const registeredAgent = await agentRegistry.getAgent(agent.slug);
      console.log(`   - Owner: ${registeredAgent.owner}`);
      console.log(`   - Registered at: ${new Date(Number(registeredAgent.registeredAt) * 1000).toISOString()}`);
      console.log(`   - Active: ${registeredAgent.active}`);
      
    } catch (error) {
      console.error(`❌ Failed to register ${agent.slug}:`, error);
    }
  }
  
  // Final stats
  const totalAgents = await agentRegistry.totalAgents();
  const ownerAgents = await agentRegistry.getOwnerAgents(deployer.address);
  
  console.log(`\n📊 Seeding complete!`);
  console.log(`   - Total agents in registry: ${totalAgents}`);
  console.log(`   - Your agents: ${ownerAgents.length}`);
  console.log(`   - Contract balance: ${ethers.formatEther(await agentRegistry.getBalance())} ETH`);
}

main()
  .then(() => {
    console.log("\n🎉 Seeding successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });