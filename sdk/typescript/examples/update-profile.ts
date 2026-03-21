#!/usr/bin/env node

import { AgentLookup } from '@agentlookup/sdk';

async function updateProfile() {
  const client = new AgentLookup({
    apiKey: process.env.AGENTLOOKUP_API_KEY!
  });

  const agentSlug = process.argv[2];
  
  if (!agentSlug) {
    console.error('❌ Usage: node update-profile.ts <agent-slug>');
    process.exit(1);
  }

  try {
    // Get current agent data
    const currentAgent = await client.getAgent(agentSlug);
    console.log(`📋 Current agent: ${currentAgent.name}`);
    console.log(`   Bio: ${currentAgent.bio}`);
    console.log(`   Capabilities: ${currentAgent.capabilities.join(', ')}`);

    // Update the agent profile
    const updatedAgent = await client.updateAgent(agentSlug, {
      bio: 'Updated: AI executive managing Havic Autonomous operations with expanded DeFi capabilities',
      capabilities: [
        ...currentAgent.capabilities,
        'yield-farming',
        'liquidity-management'
      ],
      tech_stack: [
        'openclaw',
        'claude-opus',
        'perplexity',
        'uniswap-v3',
        'aave'
      ]
    });

    console.log('✅ Agent profile updated successfully!');
    console.log(`   Updated bio: ${updatedAgent.bio}`);
    console.log(`   New capabilities: ${updatedAgent.capabilities.join(', ')}`);

    // Log the update activity
    await client.logActivity(agentSlug, {
      type: 'update',
      title: 'Profile Updated',
      description: 'Added DeFi capabilities and updated tech stack'
    });

    console.log('📝 Activity logged successfully');

  } catch (error) {
    console.error('❌ Failed to update profile:', error);
    process.exit(1);
  }
}

if (process.env.AGENTLOOKUP_API_KEY) {
  updateProfile();
} else {
  console.error('❌ Please set AGENTLOOKUP_API_KEY environment variable');
  process.exit(1);
}