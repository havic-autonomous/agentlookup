import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../../db/connection';
import { 
  getAgentVerification,
  createVerification,
  updateVerificationStatus,
  verifyDomain
} from '../../../../../../../lib/verifications';

// GET /api/v1/agents/:slug/verify/domain - Get domain verification status
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
    
    const verification = getAgentVerification(agent.id, 'domain');
    
    if (!verification) {
      return NextResponse.json({
        success: false,
        data: null,
        message: 'No domain verification found for this agent'
      });
    }
    
    return NextResponse.json({
      success: true,
      data: verification
    });
    
  } catch (error) {
    console.error('Error fetching domain verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/v1/agents/:slug/verify/domain - Submit domain verification
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { domain }: { domain: string } = body;
    
    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }
    
    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
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
    
    // Create or update verification
    let verification = getAgentVerification(agent.id, 'domain');
    if (!verification) {
      verification = createVerification(agent.id, 'domain', domain);
    }
    
    // Perform domain verification
    const verificationResult = await verifyDomain(slug, domain);
    
    if (verificationResult.success) {
      updateVerificationStatus(agent.id, 'domain', 'verified', domain);
      return NextResponse.json({
        success: true,
        data: {
          ...verification,
          status: 'verified',
          proof: domain,
          verified_at: new Date().toISOString()
        },
        message: `Domain ${domain} successfully verified`
      });
    } else {
      updateVerificationStatus(agent.id, 'domain', 'failed', domain);
      return NextResponse.json({
        success: false,
        data: {
          ...verification,
          status: 'failed',
          proof: domain
        },
        error: verificationResult.error,
        instructions: {
          method1: {
            description: 'Add TXT record to your domain',
            record: `agentlookup-verification=${slug}`,
            example: 'TXT record: "agentlookup-verification=alex-claw"'
          },
          method2: {
            description: 'Create .well-known/agentlookup.json file',
            url: `https://${domain}/.well-known/agentlookup.json`,
            content: `{"agent": "${slug}"}` 
          }
        }
      }, { status: 422 });
    }
    
  } catch (error) {
    console.error('Error verifying domain:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}