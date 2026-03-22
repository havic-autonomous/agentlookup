import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/connection';
import { checkExpiredFeatures, expireFeature } from '@/lib/expiry-checker';
import bcrypt from 'bcryptjs';

// Admin endpoint to manage features manually
export async function POST(request: NextRequest) {
  try {
    // Verify admin API key
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const apiKey = authHeader.substring(7);
    const db = getDatabase();
    
    // Get API key record
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

    // Check admin access
    if (!(apiKeyRecord as any).email.includes('havic.ai')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, agent_slug, feature_type, duration_months, price_usdc, tx_hash, feature_id } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    // Handle different admin actions
    switch (action) {
      case 'activate': {
        if (!agent_slug || !feature_type || !duration_months || !price_usdc) {
          return NextResponse.json({ 
            error: 'Missing required fields for activate: agent_slug, feature_type, duration_months, price_usdc' 
          }, { status: 400 });
        }

        // Validate feature type
        const validFeatures = ['verified_badge', 'featured_listing', 'premium_trust'];
        if (!validFeatures.includes(feature_type)) {
          return NextResponse.json({ 
            error: 'Invalid feature_type. Must be one of: ' + validFeatures.join(', ') 
          }, { status: 400 });
        }

        // Validate duration for featured listing
        if (feature_type === 'featured_listing' && duration_months > 3) {
          return NextResponse.json({ 
            error: 'Featured listing duration cannot exceed 3 months' 
          }, { status: 400 });
        }

        // Get agent
        const agent = db.prepare('SELECT id FROM agents WHERE slug = ?').get(agent_slug) as { id: string } | undefined;
        
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

        return NextResponse.json({
          success: true,
          action: 'activate',
          feature_id: result.lastInsertRowid,
          agent_slug,
          feature_type,
          expires_at: expiresAt.toISOString(),
          price_usdc
        }, { status: 201 });
      }

      case 'expire': {
        if (!feature_id) {
          return NextResponse.json({ error: 'Missing feature_id for expire action' }, { status: 400 });
        }

        const success = expireFeature(feature_id);
        
        if (!success) {
          return NextResponse.json({ error: 'Feature not found or already expired' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          action: 'expire',
          feature_id
        });
      }

      case 'list': {
        // List all paid features (for admin overview)
        checkExpiredFeatures();
        
        const features = db.prepare(`
          SELECT 
            pf.id,
            pf.feature_type,
            pf.status,
            pf.starts_at,
            pf.expires_at,
            pf.price_usdc,
            pf.tx_hash,
            pf.created_at,
            a.slug as agent_slug,
            a.name as agent_name
          FROM paid_features pf
          JOIN agents a ON pf.agent_id = a.id
          ORDER BY pf.created_at DESC
          LIMIT 50
        `).all();

        return NextResponse.json({
          success: true,
          action: 'list',
          features
        });
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Must be one of: activate, expire, list' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in admin features endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}