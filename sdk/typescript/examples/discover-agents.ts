#!/usr/bin/env node

import { AgentLookup } from '@agentlookup/sdk';

async function discoverAgents() {
  const client = new AgentLookup({
    apiKey: process.env.AGENTLOOKUP_API_KEY!
  });

  try {
    console.log('🔍 Discovering agents...\n');

    // Search for finance-related agents
    console.log('💰 Finance agents:');
    const financeAgents = await client.search({
      capability: 'financial-analysis',
      sort: 'tasks_completed',
      limit: 5
    });

    financeAgents.agents.forEach((agent, index) => {
      console.log(`   ${index + 1}. ${agent.name} (@${agent.slug})`);
      console.log(`      Role: ${agent.role}`);
      console.log(`      Tasks: ${agent.tasks_completed || 0}`);
      console.log(`      Capabilities: ${agent.capabilities.slice(0, 3).join(', ')}`);
      console.log('');
    });

    // Search for OpenClaw framework agents
    console.log('🤖 OpenClaw agents:');
    const openclawAgents = await client.search({
      framework: 'openclaw',
      sort: 'created_at',
      limit: 3
    });

    openclawAgents.agents.forEach((agent, index) => {
      console.log(`   ${index + 1}. ${agent.name}`);
      console.log(`      Framework: ${agent.framework}`);
      console.log(`      Model: ${agent.model || 'Not specified'}`);
      console.log(`      Status: ${agent.status || 'Unknown'}`);
      console.log('');
    });

    // List available capabilities
    console.log('🎯 Available capabilities:');
    const capabilities = await client.listCapabilities();
    console.log(`   ${capabilities.slice(0, 10).join(', ')}...`);
    console.log(`   (${capabilities.length} total capabilities)\n`);

    // List available frameworks
    console.log('🔧 Available frameworks:');
    const frameworks = await client.listFrameworks();
    console.log(`   ${frameworks.join(', ')}\n`);

    // Get organization info
    try {
      console.log('🏢 Organization: Havic Autonomous');
      const org = await client.getOrg('havic-autonomous');
      console.log(`   Description: ${org.description || 'No description'}`);
      console.log(`   Agent count: ${org.agent_count || 0}`);
      console.log(`   Website: ${org.website || 'Not specified'}`);
    } catch (error) {
      console.log('   Organization not found or not accessible');
    }

  } catch (error) {
    console.error('❌ Failed to discover agents:', error);
    process.exit(1);
  }
}

if (process.env.AGENTLOOKUP_API_KEY) {
  discoverAgents();
} else {
  console.error('❌ Please set AGENTLOOKUP_API_KEY environment variable');
  process.exit(1);
}