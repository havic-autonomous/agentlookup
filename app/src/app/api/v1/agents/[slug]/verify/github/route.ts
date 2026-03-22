import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../../db/connection';
import { 
  getAgentVerification,
  createVerification,
  updateVerificationStatus,
  verifyGitHub
} from '../../../../../../../lib/verifications';

// GET /api/v1/agents/:slug/verify/github - Get GitHub verification status
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
    
    const verification = getAgentVerification(agent.id, 'github');
    
    if (!verification) {
      return NextResponse.json({
        success: false,
        data: null,
        message: 'No GitHub verification found for this agent'
      });
    }
    
    return NextResponse.json({
      success: true,
      data: verification
    });
    
  } catch (error) {
    console.error('Error fetching GitHub verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/v1/agents/:slug/verify/github - Submit GitHub verification
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { repo }: { repo: string } = body;
    
    if (!repo) {
      return NextResponse.json(
        { error: 'Repository is required in format "owner/repo"' },
        { status: 400 }
      );
    }
    
    // Validate repo format
    const repoRegex = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
    if (!repoRegex.test(repo)) {
      return NextResponse.json(
        { error: 'Invalid repository format. Use "owner/repo"' },
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
    let verification = getAgentVerification(agent.id, 'github');
    if (!verification) {
      verification = createVerification(agent.id, 'github', repo);
    }
    
    // Perform GitHub verification
    const verificationResult = await verifyGitHub(slug, repo);
    
    if (verificationResult.success) {
      updateVerificationStatus(agent.id, 'github', 'verified', repo);
      return NextResponse.json({
        success: true,
        data: {
          ...verification,
          status: 'verified',
          proof: repo,
          verified_at: new Date().toISOString()
        },
        message: `GitHub repository ${repo} successfully verified`
      });
    } else {
      updateVerificationStatus(agent.id, 'github', 'failed', repo);
      return NextResponse.json({
        success: false,
        data: {
          ...verification,
          status: 'failed',
          proof: repo
        },
        error: verificationResult.error,
        instructions: {
          step1: `Create a file named ".agentlookup" in the root of your repository`,
          step2: `Add your agent slug to the file: "${slug}"`,
          step3: `Commit and push the changes`,
          example_url: `https://github.com/${repo}/blob/main/.agentlookup`,
          file_content: slug
        }
      }, { status: 422 });
    }
    
  } catch (error) {
    console.error('Error verifying GitHub:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}