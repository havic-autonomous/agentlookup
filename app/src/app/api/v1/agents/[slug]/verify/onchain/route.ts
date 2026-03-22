import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../../db/connection';
import { 
  getAgentVerification,
  createVerification,
  updateVerificationStatus
} from '../../../../../../../lib/verifications';

// GET /api/v1/agents/:slug/verify/onchain - Get on-chain verification status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Get agent by slug
    const db = getDatabase();
    const agent = db.prepare('SELECT id FROM agents WHERE slug = ?').get(slug) as { id: string } | undefined;
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Check existing verification
    let verification = getAgentVerification(agent.id, 'onchain');
    
    // Check on-chain registration (mock for now - integrate with actual Base L2 contracts)
    const isRegisteredOnChain = await checkOnChainRegistration(slug);
    
    if (isRegisteredOnChain.registered) {
      // Auto-verify if found on-chain
      if (!verification) {
        verification = createVerification(agent.id, 'onchain', isRegisteredOnChain.txHash);
      }
      
      if (verification.status !== 'verified') {
        updateVerificationStatus(agent.id, 'onchain', 'verified', isRegisteredOnChain.txHash);
        verification = getAgentVerification(agent.id, 'onchain')!;
      }
      
      return NextResponse.json({
        success: true,
        data: verification,
        on_chain_data: isRegisteredOnChain
      });
    } else {
      return NextResponse.json({
        success: false,
        data: verification,
        message: 'Agent not found in on-chain registry',
        instructions: {
          description: 'Register your agent on Base L2 using the AgentLookup contract',
          contract_address: '0x1234...abcd',  // Mock address
          method: 'registerAgent(string memory slug, string memory metadataUri)',
          gas_estimate: '~50,000 gas',
          network: 'Base Mainnet'
        }
      });
    }
    
  } catch (error) {
    console.error('Error fetching on-chain verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Mock function to check on-chain registration
// In production, this would query actual Base L2 contracts
async function checkOnChainRegistration(slug: string): Promise<{
  registered: boolean;
  txHash?: string;
  blockNumber?: number;
  registeredAt?: string;
}> {
  // Mock implementation - replace with actual contract calls
  const mockRegisteredAgents = ['alex-claw', 'priya-verma'];
  
  if (mockRegisteredAgents.includes(slug)) {
    return {
      registered: true,
      txHash: '0x' + Math.random().toString(16).substr(2, 64),
      blockNumber: 12345678,
      registeredAt: new Date('2026-03-16').toISOString()
    };
  }
  
  return { registered: false };
}

// POST /api/v1/agents/:slug/verify/onchain - Trigger on-chain verification check
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Get agent by slug
    const db = getDatabase();
    const agent = db.prepare('SELECT id FROM agents WHERE slug = ?').get(slug) as { id: string } | undefined;
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Force re-check on-chain registration
    const isRegisteredOnChain = await checkOnChainRegistration(slug);
    
    if (isRegisteredOnChain.registered) {
      // Create or update verification
      let verification = getAgentVerification(agent.id, 'onchain');
      if (!verification) {
        verification = createVerification(agent.id, 'onchain', isRegisteredOnChain.txHash);
      }
      
      updateVerificationStatus(agent.id, 'onchain', 'verified', isRegisteredOnChain.txHash);
      
      return NextResponse.json({
        success: true,
        data: {
          ...verification,
          status: 'verified',
          proof: isRegisteredOnChain.txHash,
          verified_at: new Date().toISOString()
        },
        on_chain_data: isRegisteredOnChain,
        message: 'On-chain verification successful'
      });
    } else {
      // Mark as failed if not found
      let verification = getAgentVerification(agent.id, 'onchain');
      if (!verification) {
        verification = createVerification(agent.id, 'onchain');
      }
      
      updateVerificationStatus(agent.id, 'onchain', 'failed');
      
      return NextResponse.json({
        success: false,
        data: {
          ...verification,
          status: 'failed'
        },
        error: 'Agent not found in on-chain registry',
        instructions: {
          description: 'Register your agent on Base L2 using the AgentLookup contract',
          contract_address: '0x1234...abcd',  // Mock address
          method: 'registerAgent(string memory slug, string memory metadataUri)',
          example: {
            slug: slug,
            metadataUri: `https://agentlookup.ai/api/v1/agents/${slug}`
          }
        }
      }, { status: 422 });
    }
    
  } catch (error) {
    console.error('Error verifying on-chain:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}