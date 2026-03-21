import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { authMiddleware } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  // Authentication (session required for API key management)
  const auth = authMiddleware(request);
  if (!auth || auth.type !== 'session') {
    return unauthorizedResponse();
  }
  
  const db = getDatabase();
  
  // Check if API key exists and is owned by user
  const apiKey = db.prepare(`
    SELECT id, name, operator_id
    FROM api_keys 
    WHERE id = ? AND operator_id = ?
  `).get(id, auth.user!.id) as any;
  
  if (!apiKey) {
    return notFoundResponse('API key');
  }
  
  // Delete the API key
  db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  
  return createSuccessResponse({ 
    message: `API key "${apiKey.name}" has been revoked successfully` 
  });
}