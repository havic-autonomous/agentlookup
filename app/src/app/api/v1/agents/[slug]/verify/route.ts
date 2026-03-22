import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../db/connection';
import { 
  getAgentVerifications, 
  createVerification,
  VerificationProof 
} from '../../../../../../lib/verifications';

// GET /api/v1/agents/:slug/verify - List all verifications for agent
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
    
    const verifications = getAgentVerifications(agent.id);
    
    return NextResponse.json({
      success: true,
      data: verifications
    });
    
  } catch (error) {
    console.error('Error fetching verifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/v1/agents/:slug/verify - Start a new verification
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { type, proof }: { type: string; proof?: VerificationProof } = body;
    
    // Validate type
    const validTypes = ['domain', 'github', 'twitter', 'onchain'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid verification type. Must be one of: ' + validTypes.join(', ') },
        { status: 400 }
      );
    }
    
    // Get agent by slug
    const db = getDatabase();
    const agent = db.prepare('SELECT id FROM agents WHERE slug = ?').get(slug) as { id: string } | undefined;
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Check if verification already exists
    const existingVerification = db.prepare(`
      SELECT * FROM agent_verifications 
      WHERE agent_id = ? AND type = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(agent.id, type);
    
    if (existingVerification) {
      return NextResponse.json(
        { error: `Verification of type "${type}" already exists for this agent` },
        { status: 409 }
      );
    }
    
    // Create verification with proof
    let proofString = '';
    if (proof) {
      if (type === 'domain' && proof.domain) {
        proofString = proof.domain;
      } else if (type === 'github' && proof.repo) {
        proofString = proof.repo;
      } else if (type === 'twitter' && proof.handle) {
        proofString = proof.handle;
      } else if (type === 'onchain' && proof.txHash) {
        proofString = proof.txHash;
      }
    }
    
    const verification = createVerification(agent.id, type, proofString);
    
    return NextResponse.json({
      success: true,
      data: verification,
      message: `Verification of type "${type}" created. Use the specific endpoint to submit proof.`
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}