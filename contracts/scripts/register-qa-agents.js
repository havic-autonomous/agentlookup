const { ethers } = require("/tmp/node_modules/ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const AGENT_REGISTRY = "0x9e362f82070a80CB4c1a772e3DfbbC89F7e37DB1";
const RPC_URL = "https://sepolia.base.org";

// ABI for the functions we need
const ABI = [
  "function register(string slug, string name, string metadataURI) payable",
  "function slugTaken(string slug) view returns (bool)",
  "function getAgent(string slug) view returns (tuple(address owner, string slug, string name, string metadataURI, uint256 registeredAt, uint256 updatedAt, bool active))",
  "function totalAgents() view returns (uint256)",
  "function registrationFee() view returns (uint256)"
];

const agents = [
  { slug: "nova-research", name: "Nova Research Agent", metadataURI: "https://agentlookup.ai/api/v1/agents/nova-research" },
  { slug: "codex-builder", name: "Codex Builder", metadataURI: "https://agentlookup.ai/api/v1/agents/codex-builder" },
  { slug: "sentinel-guard", name: "Sentinel Security Agent", metadataURI: "https://agentlookup.ai/api/v1/agents/sentinel-guard" },
  { slug: "aria-creative", name: "Aria Creative Studio", metadataURI: "https://agentlookup.ai/api/v1/agents/aria-creative" },
  { slug: "defi-oracle", name: "DeFi Oracle", metadataURI: "https://agentlookup.ai/api/v1/agents/defi-oracle" },
  { slug: "lexis-legal", name: "Lexis Legal Advisor", metadataURI: "https://agentlookup.ai/api/v1/agents/lexis-legal" },
  { slug: "data-weaver", name: "DataWeaver ETL Agent", metadataURI: "https://agentlookup.ai/api/v1/agents/data-weaver" },
  { slug: "echo-support", name: "Echo Customer Support", metadataURI: "https://agentlookup.ai/api/v1/agents/echo-support" },
  { slug: "quantum-trade", name: "Quantum Trading Agent", metadataURI: "https://agentlookup.ai/api/v1/agents/quantum-trade" },
  { slug: "sage-tutor", name: "Sage Educational Tutor", metadataURI: "https://agentlookup.ai/api/v1/agents/sage-tutor" }
];

async function main() {
  // Get the private key from .env
  const envContent = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
  let privateKey = null;
  for (const line of envContent.split("\n")) {
    if (line.includes("PRIVATE_KEY") && line.includes("=")) {
      privateKey = line.split("=")[1].trim();
      break;
    }
  }
  
  if (!privateKey) {
    throw new Error("No PRIVATE_KEY found in .env");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(AGENT_REGISTRY, ABI, wallet);

  console.log("🔑 Deployer:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
  
  const fee = await contract.registrationFee();
  console.log("💵 Registration fee:", ethers.formatEther(fee), "ETH");
  
  const totalBefore = await contract.totalAgents();
  console.log("📊 Agents before:", totalBefore.toString());
  console.log("");

  const results = [];

  for (const agent of agents) {
    try {
      // Check if already registered
      const taken = await contract.slugTaken(agent.slug);
      if (taken) {
        console.log(`⚠️  ${agent.slug} already registered, skipping`);
        const existing = await contract.getAgent(agent.slug);
        results.push({
          slug: agent.slug,
          status: "already_registered",
          owner: existing.owner,
          registeredAt: new Date(Number(existing.registeredAt) * 1000).toISOString()
        });
        continue;
      }

      console.log(`🤖 Registering ${agent.name} (${agent.slug})...`);
      const tx = await contract.register(agent.slug, agent.name, agent.metadataURI, { value: fee });
      console.log(`   TX: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}, gas: ${receipt.gasUsed.toString()}`);
      
      results.push({
        slug: agent.slug,
        name: agent.name,
        status: "registered",
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      results.push({
        slug: agent.slug,
        status: "failed",
        error: error.message
      });
    }
  }

  const totalAfter = await contract.totalAgents();
  console.log(`\n📊 Total agents after: ${totalAfter.toString()}`);
  
  const balanceAfter = await provider.getBalance(wallet.address);
  console.log(`💰 Balance after: ${ethers.formatEther(balanceAfter)} ETH`);
  console.log(`⛽ Gas spent: ${ethers.formatEther(balance - balanceAfter)} ETH`);

  // Save results
  const outputPath = "/home/ubuntu/havic/projects/agentlookup-promotion/testing/transactions.json";
  fs.writeFileSync(outputPath, JSON.stringify({
    network: "Base Sepolia (84532)",
    agentRegistryContract: AGENT_REGISTRY,
    deployer: wallet.address,
    registrations: results,
    summary: {
      totalBefore: totalBefore.toString(),
      totalAfter: totalAfter.toString(),
      gasSpent: ethers.formatEther(balance - balanceAfter) + " ETH"
    }
  }, null, 2));
  
  console.log(`\n💾 Results saved to ${outputPath}`);
}

main().catch(console.error);
