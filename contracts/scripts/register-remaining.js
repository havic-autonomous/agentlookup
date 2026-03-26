const { ethers } = require("/tmp/node_modules/ethers");
const fs = require("fs");
const path = require("path");

const AGENT_REGISTRY = "0x9e362f82070a80CB4c1a772e3DfbbC89F7e37DB1";
const RPC_URL = "https://sepolia.base.org";
const ABI = [
  "function register(string slug, string name, string metadataURI) payable",
  "function slugTaken(string slug) view returns (bool)",
  "function totalAgents() view returns (uint256)",
  "function registrationFee() view returns (uint256)"
];

const remaining = [
  { slug: "codex-builder", name: "Codex Builder", metadataURI: "https://agentlookup.ai/api/v1/agents/codex-builder" },
  { slug: "defi-oracle", name: "DeFi Oracle", metadataURI: "https://agentlookup.ai/api/v1/agents/defi-oracle" },
  { slug: "lexis-legal", name: "Lexis Legal Advisor", metadataURI: "https://agentlookup.ai/api/v1/agents/lexis-legal" },
  { slug: "echo-support", name: "Echo Customer Support", metadataURI: "https://agentlookup.ai/api/v1/agents/echo-support" },
  { slug: "sage-tutor", name: "Sage Educational Tutor", metadataURI: "https://agentlookup.ai/api/v1/agents/sage-tutor" }
];

async function main() {
  const envContent = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
  let privateKey = null;
  for (const line of envContent.split("\n")) {
    if (line.includes("PRIVATE_KEY") && line.includes("=")) {
      privateKey = line.split("=")[1].trim();
      break;
    }
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(AGENT_REGISTRY, ABI, wallet);
  
  const fee = await contract.registrationFee();
  let nonce = await provider.getTransactionCount(wallet.address);
  console.log("Starting nonce:", nonce);
  
  const results = [];

  for (const agent of remaining) {
    const taken = await contract.slugTaken(agent.slug);
    if (taken) {
      console.log(`⚠️  ${agent.slug} already registered`);
      results.push({ slug: agent.slug, status: "already_registered" });
      continue;
    }

    console.log(`🤖 Registering ${agent.slug} (nonce: ${nonce})...`);
    try {
      const tx = await contract.register(agent.slug, agent.name, agent.metadataURI, { 
        value: fee, 
        nonce: nonce 
      });
      console.log(`   TX: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`   ✅ Block ${receipt.blockNumber}, gas: ${receipt.gasUsed.toString()}`);
      results.push({
        slug: agent.slug,
        name: agent.name,
        status: "registered",
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      });
      nonce++;
    } catch (error) {
      console.error(`   ❌ ${error.message.slice(0, 100)}`);
      results.push({ slug: agent.slug, status: "failed", error: error.message.slice(0, 200) });
    }
  }

  const total = await contract.totalAgents();
  console.log(`\n📊 Total agents: ${total.toString()}`);
  
  // Update transactions.json
  const txFile = "/home/ubuntu/havic/projects/agentlookup-promotion/testing/transactions.json";
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(txFile, "utf8")); } catch(e) {}
  existing.additionalRegistrations = results;
  existing.summary = { ...existing.summary, totalAfter: total.toString() };
  fs.writeFileSync(txFile, JSON.stringify(existing, null, 2));
  console.log("💾 Updated transactions.json");
}

main().catch(console.error);
