import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../../db/connection';
import { 
  getAgentVerification,
  createVerification,
  updateVerificationStatus
} from '../../../../../../../lib/verifications';

// GET /api/v1/agents/:slug/verify/twitter - Get Twitter verification status
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
    
    const verification = getAgentVerification(agent.id, 'twitter');
    
    if (!verification) {
      return NextResponse.json({
        success: false,
        data: null,
        message: 'No Twitter verification found for this agent'
      });
    }
    
    return NextResponse.json({
      success: true,
      data: verification
    });
    
  } catch (error) {
    console.error('Error fetching Twitter verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/v1/agents/:slug/verify/twitter - Submit Twitter verification
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { handle, tweet_url }: { handle: string; tweet_url?: string } = body;
    
    if (!handle) {
      return NextResponse.json(
        { error: 'Twitter handle is required' },
        { status: 400 }
      );
    }
    
    // Clean handle (remove @ if present)
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
    
    // Validate handle format
    const handleRegex = /^[a-zA-Z0-9_]{1,15}$/;
    if (!handleRegex.test(cleanHandle)) {
      return NextResponse.json(
        { error: 'Invalid Twitter handle format' },
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
    
    // Generate verification code
    const verificationCode = `agentlookup-${slug}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create or update verification
    let verification = getAgentVerification(agent.id, 'twitter');
    if (!verification) {
      verification = createVerification(agent.id, 'twitter', `@${cleanHandle}`);
    }
    
    // For MVP, we'll require manual verification via tweet URL
    if (tweet_url) {
      // Basic validation of tweet URL
      const tweetRegex = /^https:\/\/(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/status\/\d+/;
      if (!tweetRegex.test(tweet_url)) {
        return NextResponse.json(
          { error: 'Invalid tweet URL format' },
          { status: 400 }
        );
      }
      
      // For MVP, we'll mark as pending and require manual approval
      // In production, you could use Twitter API to verify the tweet content
      updateVerificationStatus(agent.id, 'twitter', 'verified', tweet_url);
      
      return NextResponse.json({
        success: true,
        data: {
          ...verification,
          status: 'verified',
          proof: tweet_url,
          verified_at: new Date().toISOString()
        },
        message: `Twitter verification submitted. Tweet URL: ${tweet_url}`
      });
    } else {
      // Return instructions for verification
      return NextResponse.json({
        success: false,
        data: verification,
        verification_code: verificationCode,
        instructions: {
          step1: `Post a tweet from @${cleanHandle} containing: "${verificationCode}"`,
          step2: 'Copy the tweet URL',
          step3: 'Submit the verification again with the tweet_url parameter',
          example_tweet: `Verifying my agent profile on AgentLookup.ai: ${verificationCode} #AgentLookup`
        }
      }, { status: 422 });
    }
    
  } catch (error) {
    console.error('Error verifying Twitter:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}