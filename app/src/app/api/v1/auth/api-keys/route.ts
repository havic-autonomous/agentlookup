import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { authMiddleware, generateApiKey } from '@/lib/auth';
import { ApiKeyCreateSchema } from '@/lib/schemas';
import { createSuccessResponse, createErrorResponse, unauthorizedResponse, validationErrorResponse, createPagination, rateLimitResponse, getClientIp } from '@/lib/api-response';
import { checkRateLimit, checkApiKeyGenerationRateLimit } from '@/lib/rate-limiter';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  // Authentication (session required for API key management)
  const auth = authMiddleware(request);
  if (!auth || auth.type !== 'session') {
    return unauthorizedResponse();
  }
  
  const db = getDatabase();
  const url = new URL(request.url);
  
  // Parse query parameters
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0'));
  
  // Get user's API keys (masked)
  const apiKeys = db.prepare(`
    SELECT 
      k.id, k.name, k.key_prefix, k.key_last_chars, k.scopes, k.last_used_at, 
      k.expires_at, k.created_at,
      a.name as agent_name, a.slug as agent_slug
    FROM api_keys k
    LEFT JOIN agents a ON k.agent_id = a.id
    WHERE k.operator_id = ?
    ORDER BY k.created_at DESC
    LIMIT ? OFFSET ?
  `).all(auth.user!.id, limit, offset);
  
  // Get total count
  const { count } = db.prepare(`
    SELECT COUNT(*) as count 
    FROM api_keys 
    WHERE operator_id = ?
  `).get(auth.user!.id) as { count: number };
  
  // Format response (mask keys)
  const formattedKeys = apiKeys.map((key: any) => ({
    ...key,
    key: `${key.key_prefix}${'*'.repeat(16)}${key.key_last_chars || '****'}`, // Show prefix + asterisks + last 4 chars
    scopes: JSON.parse(key.scopes),
    agent: key.agent_name ? {
      name: key.agent_name,
      slug: key.agent_slug
    } : null,
    // Remove internal fields
    key_prefix: undefined,
    agent_name: undefined,
    agent_slug: undefined
  }));
  
  return createSuccessResponse(formattedKeys, createPagination(count, limit, offset));
}

export async function POST(request: NextRequest) {
  // Authentication (session required for API key management)
  const auth = authMiddleware(request);
  if (!auth || auth.type !== 'session') {
    return unauthorizedResponse();
  }
  
  // Rate limiting by user (stricter than IP-based)
  const rateLimitCheck = checkApiKeyGenerationRateLimit(auth.user!.id);
  if (!rateLimitCheck.allowed) {
    return rateLimitResponse(rateLimitCheck.retryAfter!);
  }
  
  try {
    const body = await request.json();
    const validatedData = ApiKeyCreateSchema.parse(body);
    
    const db = getDatabase();
    
    // Verify agent ownership if agent_id is specified
    if (validatedData.agent_id) {
      const agent = db.prepare('SELECT id FROM agents WHERE id = ? AND owner_id = ?').get(validatedData.agent_id, auth.user!.id);
      if (!agent) {
        return createErrorResponse('not_found', 'Agent not found or not owned by you', 404);
      }
    }
    
    // Generate API key
    const keyData = generateApiKey();
    const apiKeyId = uuidv4();
    
    // Insert API key
    db.prepare(`
      INSERT INTO api_keys (
        id, key_hash, key_prefix, key_last_chars, name, operator_id, agent_id, 
        scopes, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      apiKeyId,
      keyData.hash,
      keyData.prefix,
      keyData.lastChars,
      validatedData.name,
      auth.user!.id,
      validatedData.agent_id || null,
      JSON.stringify(validatedData.scopes),
      validatedData.expires_at || null
    );
    
    // Return the key (only time it's shown in full)
    return createSuccessResponse({
      id: apiKeyId,
      key: keyData.key,
      name: validatedData.name,
      scopes: validatedData.scopes,
      agent_id: validatedData.agent_id || null,
      expires_at: validatedData.expires_at || null,
      created_at: new Date().toISOString(),
      warning: 'This is the only time the full key will be shown. Store it securely.'
    });
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return validationErrorResponse(error.errors[0].message);
    }
    
    console.error('API key creation error:', error);
    return createErrorResponse('internal_error', 'Failed to create API key', 500);
  }
}