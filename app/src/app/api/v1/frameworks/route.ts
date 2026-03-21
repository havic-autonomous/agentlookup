import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { createSuccessResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const db = getDatabase();
  
  // Get all unique frameworks with agent counts
  const frameworks = db.prepare(`
    SELECT 
      a.framework,
      COUNT(DISTINCT a.id) as agent_count
    FROM agents a
    WHERE a.framework IS NOT NULL 
      AND a.framework != ''
      AND a.status != 'offline'
    GROUP BY a.framework
    ORDER BY agent_count DESC, a.framework ASC
  `).all();
  
  return createSuccessResponse(frameworks);
}