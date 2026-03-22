import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/connection';
import { getActivePaidFeatures, checkExpiredFeatures } from '@/lib/expiry-checker';
import bcrypt from 'bcryptjs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Check for expired features first
    checkExpiredFeatures();
    
    const db = getDatabase();
    
    // Get agent by slug
    const agent = db.prepare('SELECT id FROM agents WHERE slug = ?').get(slug) as { id: string } | undefined;
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get active paid features
    const features = getActivePaidFeatures(agent.id);
    
    return NextResponse.json({
      agent_slug: slug,
      features: features.map(f => ({
        id: f.id,
        type: f.feature_type,
        expires_at: f.expires_at,
        price_paid: f.price_usdc
      }))
    });
    
  } catch (error) {
    console.error('Error fetching agent features:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    // This endpoint is admin-only for now (manual activation)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const apiKey = authHeader.substring(7);
    const db = getDatabase();
    
    // Verify admin API key
    const apiKeyRecord = db.prepare(`
      SELECT ak.*, u.email FROM api_keys ak 
      JOIN users u ON ak.operator_id = u.id 
      WHERE ak.key_prefix = ?
    `).get(apiKey.substring(0, 12));
    
    if (!apiKeyRecord) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Verify key hash
    const isValid = await bcrypt.compare(apiKey, (apiKeyRecord as any).key_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Check if admin key (only admin can activate features for now)
    if (!(apiKeyRecord as any).email.includes('havic.ai')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { feature_type, duration_months, price_usdc, tx_hash } = body;

    if (!feature_type || !duration_months || !price_usdc) {
      return NextResponse.json({ 
        error: 'Missing required fields: feature_type, duration_months, price_usdc' 
      }, { status: 400 });
    }

    // Validate feature type
    const validFeatures = ['verified_badge', 'featured_listing', 'premium_trust'];
    if (!validFeatures.includes(feature_type)) {
      return NextResponse.json({ 
        error: 'Invalid feature_type. Must be one of: ' + validFeatures.join(', ') 
      }, { status: 400 });
    }

    // Validate duration for featured listing (max 3 months)
    if (feature_type === 'featured_listing' && duration_months > 3) {
      return NextResponse.json({ 
        error: 'Featured listing duration cannot exceed 3 months' 
      }, { status: 400 });
    }

    // Get agent
    const agent = db.prepare('SELECT id FROM agents WHERE slug = ?').get(slug) as { id: string } | undefined;
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + duration_months);

    // Insert paid feature
    const result = db.prepare(`
      INSERT INTO paid_features (agent_id, feature_type, status, expires_at, price_usdc, tx_hash)
      VALUES (?, ?, 'active', ?, ?, ?)
    `).run(agent.id, feature_type, expiresAt.toISOString(), price_usdc, tx_hash || null);

    // Update API key last used
    db.prepare('UPDATE api_keys SET last_used_at = datetime("now") WHERE id = ?')
      .run((apiKeyRecord as any).id);

    return NextResponse.json({
      success: true,
      feature_id: result.lastInsertRowid,
      agent_slug: slug,
      feature_type,
      expires_at: expiresAt.toISOString(),
      price_usdc
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error activating feature:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}