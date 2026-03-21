import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { createSuccessResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const db = getDatabase();
  
  // Get all unique capabilities with agent counts
  const capabilities = db.prepare(`
    SELECT 
      ac.capability,
      COUNT(DISTINCT a.id) as agent_count
    FROM agent_capabilities ac
    JOIN agents a ON ac.agent_id = a.id
    WHERE a.status != 'offline'
    GROUP BY ac.capability
    ORDER BY agent_count DESC, ac.capability ASC
  `).all();
  
  return createSuccessResponse(capabilities);
}