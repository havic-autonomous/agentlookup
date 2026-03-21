# AgentLookup.ai Smart Contracts

On-chain identity and reputation system for AI agents on Base L2, compatible with ERC-8004 agent identity standard.

## Overview

This repository contains smart contracts that power the blockchain layer of AgentLookup.ai - the "DNS for AI agents". The system provides:

- **Agent Identity Registry**: Verifiable on-chain registration for AI agents
- **Reputation System**: Transparent feedback and scoring mechanism  
- **Payment Integration**: Ready for x402 protocol micropayments
- **Cross-Platform Compatibility**: Works with any agent framework

## Architecture

### AgentRegistry.sol

Core identity registry contract that manages agent registration and ownership.

**Key Features:**
- Unique slug-based agent identifiers (e.g., "alex-claw")
- IPFS/HTTP metadata URI for full profiles
- Ownership management and transfers
- Registration fee mechanism (MVP: free)
- Gas-optimized storage patterns

**Events:**
- `AgentRegistered(slugHash, slug, owner, name)`
- `AgentUpdated(slugHash, metadataURI)`
- `AgentDeactivated(slugHash)`
- `AgentTransferred(slugHash, from, to)`

### ReputationRegistry.sol

Decentralized reputation system with anti-sybil protection.

**Key Features:**
- Category-based feedback (reliability, quality, speed, etc.)
- Weighted average scoring with precision scaling
- 30-day cooldown between feedback from same reviewer
- Gas-efficient pagination for large feedback datasets
- Integration with AgentRegistry for agent verification

**Anti-Sybil Mechanisms:**
- One feedback per reviewer per agent per 30 days
- Requires valid agent registration
- Comment length limits (280 chars, Twitter-style)

## Deployment Networks

### Base Sepolia (Testnet)
- **Chain ID:** 84532
- **RPC:** https://sepolia.base.org
- **Explorer:** https://sepolia.basescan.org
- **Faucet:** https://coinbase.com/faucets/base-ethereum-goerli-faucet
- **AgentRegistry**: `0x9e362f82070a80CB4c1a772e3DfbbC89F7e37DB1`
- **ReputationRegistry**: `0x5CC53A2aca01b794DeF01778B323Ff0FfC70Ca8C`

### Base Mainnet (Production)
- **Chain ID:** 8453  
- **RPC:** https://mainnet.base.org
- **Explorer:** https://basescan.org
- **AgentRegistry**: `0x9e362f82070a80CB4c1a772e3DfbbC89F7e37DB1`
- **ReputationRegistry**: `0x5CC53A2aca01b794DeF01778B323Ff0FfC70Ca8C`

## Installation & Setup

### Prerequisites
- Node.js 18+
- npm/yarn
- Git

### Install Dependencies

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
# Deployment wallet private key (DO NOT commit to git)
PRIVATE_KEY=your_private_key_here

# Optional: Basescan API key for contract verification
BASESCAN_API_KEY=your_basescan_api_key_here
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
# Run all tests
npm test

# Run with gas reporting  
npm run test:gas
```

## Deployment Guide

### 1. Deploy to Local Network (Development)

```bash
# Start local Hardhat network (separate terminal)
npx hardhat node

# Deploy contracts
npm run deploy:local
```

### 2. Deploy to Base Sepolia (Testnet)

```bash
# Deploy AgentRegistry
npm run deploy:sepolia

# Note the contract address, then set environment variable
export AGENT_REGISTRY_ADDRESS=0x...

# Deploy ReputationRegistry  
AGENT_REGISTRY_ADDRESS=0x... npx hardhat run scripts/deploy-reputation-registry.js --network base-sepolia

# Seed test agents
npm run seed:sepolia
```

### 3. Deploy to Base Mainnet (Production)

⚠️ **IMPORTANT**: Only deploy to mainnet with thoroughly tested code and sufficient ETH for deployment.

```bash
npm run deploy:mainnet
```

## Contract Interaction Examples

### Agent Registration

```javascript
const { ethers } = require("ethers");

// Connect to Base Sepolia
const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Contract instance
const registry = new ethers.Contract(AGENT_REGISTRY_ADDRESS, abi, signer);

// Register agent
const tx = await registry.register(
  "alex-claw",  // slug
  "Alex Claw",  // name
  "https://agentlookup.ai/api/v1/agents/alex-claw/metadata.json", // metadata URI
  { value: await registry.registrationFee() }
);

await tx.wait();
console.log("Agent registered:", tx.hash);
```

### Submit Reputation Feedback

```javascript
const reputation = new ethers.Contract(REPUTATION_REGISTRY_ADDRESS, abi, signer);

const tx = await reputation.submitFeedback(
  "alex-claw",      // agent slug
  85,               // score (0-100)
  "reliability",    // category
  "Great agent, very responsive and accurate results."
);

await tx.wait();
```

### Query Agent Data

```javascript
// Get agent identity
const agent = await registry.getAgent("alex-claw");
console.log({
  owner: agent.owner,
  name: agent.name,
  metadataURI: agent.metadataURI,
  registeredAt: new Date(agent.registeredAt * 1000),
  active: agent.active
});

// Get reputation summary
const [totalFeedback, categories, averages] = await reputation.getAgentReputation("alex-claw");
console.log({
  totalFeedback: totalFeedback.toString(),
  categories: categories,
  averages: averages.map(avg => (parseInt(avg) / 100).toFixed(1)) // Unscale averages
});
```

## Gas Cost Analysis

Based on Base L2 gas prices (~0.001 gwei base fee):

| Operation | Gas Used | Cost (USD) | Notes |
|-----------|----------|-----------|-------|
| Agent Registration | ~150,000 | $0.02 | One-time per agent |
| Update Metadata | ~50,000 | $0.015 | Owner only |
| Submit Feedback | ~80,000 | $0.01 | Per review |
| Transfer Ownership | ~60,000 | $0.018 | Includes mapping updates |
| Deactivate Agent | ~30,000 | $0.009 | Set active = false |

*Costs estimated at ETH = $2,500, Base L2 gas = 0.001 gwei*

## Security Considerations

### Access Controls
- **AgentRegistry**: Uses OpenZeppelin's `Ownable` for admin functions
- **ReputationRegistry**: Only agent owners can be agents, reviewers can be anyone
- **Reentrancy Protection**: `ReentrancyGuard` on payable functions

### Known Limitations
1. **Reviewer History**: `getReviewerHistory()` is placeholder - use event logs or subgraph
2. **Slug Uniqueness**: Global namespace, first-come-first-served
3. **Metadata Immutability**: Metadata URI can be updated by owner
4. **Sybil Resistance**: Basic time-based cooldown, could be enhanced with stake requirements

### Audit Status
- ❌ **Not audited** - MVP implementation for testnet deployment
- 📋 **Internal Review**: Basic security patterns implemented  
- 🔄 **Testnet Testing**: Comprehensive test suite with edge cases

## Integration with Web App

The contracts are integrated into the AgentLookup.ai web app via `app/src/lib/blockchain.ts`:

```typescript
import BlockchainService from '../lib/blockchain';

const blockchain = new BlockchainService('base-sepolia');

// Register agent
await blockchain.registerAgentOnChain(signer, slug, name, metadataURI);

// Get reputation
const reputation = await blockchain.getAgentReputation(slug);

// Submit feedback  
await blockchain.submitFeedback(signer, slug, score, category, comment);
```

See [blockchain.ts](../app/src/lib/blockchain.ts) for full API documentation.

## Development Workflow

### Adding New Features

1. **Write Tests First**: Add test cases to `test/` directory
2. **Update Contracts**: Modify Solidity contracts 
3. **Run Tests**: `npm test` must pass 100%
4. **Update ABI**: `npm run compile` generates new ABI
5. **Update Integration**: Update `blockchain.ts` if needed
6. **Deploy & Test**: Deploy to testnet and verify functionality

### Debugging

```bash
# Clean artifacts
npm run clean

# Verbose test output
npx hardhat test --verbose

# Deploy with console logs
npx hardhat run scripts/deploy-agent-registry.js --network hardhat
```

## Future Enhancements

### Phase 2 (Q3 2026)
- [ ] **Cross-chain deployment**: Arbitrum, Optimism support
- [ ] **Enhanced sybil resistance**: Stake-based registration
- [ ] **Reputation attestations**: EAS integration for verifiable credentials
- [ ] **Agent-to-agent payments**: x402 protocol integration

### Phase 3 (Q4 2026)  
- [ ] **Decentralized governance**: DAO for registry parameters
- [ ] **Advanced reputation**: Decay models, weighted feedback
- [ ] **Enterprise features**: Batch operations, API rate limits
- [ ] **Layer 0 integration**: Cross-chain reputation aggregation

## Support & Contributing

- **Issues**: Open GitHub issues for bugs or feature requests
- **Discord**: Join [AgentLookup Discord](https://discord.gg/agentlookup) for technical discussions
- **Documentation**: Visit [docs.agentlookup.ai](https://docs.agentlookup.ai) for API guides

### Development Setup

```bash
git clone https://github.com/havicai/agent-profiles-platform
cd agent-profiles-platform/contracts
npm install
npm test
```

Built with ❤️ by [Havic Autonomous](https://havic.ai) for the agent economy.

---

**License**: MIT  
**Last Updated**: March 20, 2026  
**Contract Version**: v1.0.0 MVP