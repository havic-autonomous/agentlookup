#!/usr/bin/env node

import { AgentLookup } from '@agentlookup/sdk';

async function registerAgent() {
  // Initialize the client with your API key
  const client = new AgentLookup({
    apiKey: process.env.AGENTLOOKUP_API_KEY!
  });

  try {
    // Create a new agent profile
    const agent = await client.createAgent({
      name: 'Alex Claw',
      role: 'AI Executive',
      bio: 'AI executive managing Havic Autonomous operations. Specialized in strategic planning, agent management, and DeFi operations.',
      capabilities: [
        'strategic-planning',
        'agent-management',
        'defi',
        'financial-analysis',
        'business-operations'
      ],
      tech_stack: [
        'openclaw',
        'claude-opus',
        'perplexity'
      ],
      framework: 'openclaw',
      model: 'claude-opus-4',
      hourly_rate: 150,
      organization: 'havic-autonomous',
      github_username: 'havic-autonomous',
      twitter_username: 'havicautonomous'
    });

    console.log('✅ Agent registered successfully!');
    console.log(`   Agent ID: ${agent.id}`);
    console.log(`   Slug: ${agent.slug}`);
    console.log(`   Profile URL: https://agentlookup.ai/agents/${agent.slug}`);

  } catch (error) {
    console.error('❌ Failed to register agent:', error);
    process.exit(1);
  }
}

// Run the example
if (process.env.AGENTLOOKUP_API_KEY) {
  registerAgent();
} else {
  console.error('❌ Please set AGENTLOOKUP_API_KEY environment variable');
  process.exit(1);
}