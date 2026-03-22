import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { authMiddleware } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse, unauthorizedResponse } from '@/lib/api-response';

interface DashboardStats {
  analytics_overview: {
    total_api_calls_24h: number;
    total_api_calls_7d: number;
    total_api_calls_30d: number;
    average_response_time: number;
    error_rate_24h: number;
    most_used_endpoints: Array<{ endpoint: string; count: number }>;
  };
  agent_performance: Array<{
    agent_slug: string;
    agent_name: string;
    views_24h: number;
    api_calls_24h: number;
    api_calls_7d: number;
    last_activity: string | null;
    trust_score: number;
  }>;
  api_key_usage: Array<{
    key_id: string;
    key_name: string;
    key_prefix: string;
    total_calls_24h: number;
    total_calls_7d: number;
    last_used: string | null;
    avg_response_time: number;
  }>;
}

export async function GET(request: NextRequest) {
  // Authentication
  const auth = authMiddleware(request);
  if (!auth || auth.type !== 'session') {
    return unauthorizedResponse();
  }

  const db = getDatabase();
  const operatorId = auth.user!.id;

  try {
    // Get analytics overview
    const calls24h = db.prepare(`
      SELECT COUNT(*) as count 
      FROM api_logs al
      LEFT JOIN api_keys ak ON al.api_key_id = ak.id
      WHERE ak.operator_id = ? AND al.created_at >= datetime('now', '-24 hours')
    `).get(operatorId) as { count: number };

    const calls7d = db.prepare(`
      SELECT COUNT(*) as count 
      FROM api_logs al
      LEFT JOIN api_keys ak ON al.api_key_id = ak.id
      WHERE ak.operator_id = ? AND al.created_at >= datetime('now', '-7 days')
    `).get(operatorId) as { count: number };

    const calls30d = db.prepare(`
      SELECT COUNT(*) as count 
      FROM api_logs al
      LEFT JOIN api_keys ak ON al.api_key_id = ak.id
      WHERE ak.operator_id = ? AND al.created_at >= datetime('now', '-30 days')
    `).get(operatorId) as { count: number };

    const avgResponseTime = db.prepare(`
      SELECT AVG(al.response_time_ms) as avg_time 
      FROM api_logs al
      LEFT JOIN api_keys ak ON al.api_key_id = ak.id
      WHERE ak.operator_id = ? AND al.created_at >= datetime('now', '-24 hours')
    `).get(operatorId) as { avg_time: number | null };

    const errorRate24h = db.prepare(`
      SELECT 
        COUNT(*) as total_calls,
        SUM(CASE WHEN al.status_code >= 400 THEN 1 ELSE 0 END) as error_calls
      FROM api_logs al
      LEFT JOIN api_keys ak ON al.api_key_id = ak.id
      WHERE ak.operator_id = ? AND al.created_at >= datetime('now', '-24 hours')
    `).get(operatorId) as { total_calls: number; error_calls: number };

    const mostUsedEndpoints = db.prepare(`
      SELECT al.endpoint, COUNT(*) as count
      FROM api_logs al
      LEFT JOIN api_keys ak ON al.api_key_id = ak.id
      WHERE ak.operator_id = ? AND al.created_at >= datetime('now', '-7 days')
      GROUP BY al.endpoint
      ORDER BY count DESC
      LIMIT 5
    `).all(operatorId) as Array<{ endpoint: string; count: number }>;

    // Get agent performance for user's agents
    const agentPerformance = db.prepare(`
      SELECT 
        a.slug as agent_slug,
        a.name as agent_name,
        a.last_active_at,
        a.verified,
        COALESCE(calls_24h.count, 0) as api_calls_24h,
        COALESCE(calls_7d.count, 0) as api_calls_7d,
        0 as views_24h -- TODO: implement view tracking
      FROM agents a
      LEFT JOIN (
        SELECT al.agent_slug, COUNT(*) as count
        FROM api_logs al
        LEFT JOIN api_keys ak ON al.api_key_id = ak.id
        WHERE ak.operator_id = ? AND al.created_at >= datetime('now', '-24 hours')
        GROUP BY al.agent_slug
      ) calls_24h ON a.slug = calls_24h.agent_slug
      LEFT JOIN (
        SELECT al.agent_slug, COUNT(*) as count
        FROM api_logs al
        LEFT JOIN api_keys ak ON al.api_key_id = ak.id
        WHERE ak.operator_id = ? AND al.created_at >= datetime('now', '-7 days')
        GROUP BY al.agent_slug
      ) calls_7d ON a.slug = calls_7d.agent_slug
      WHERE a.owner_id = ?
      ORDER BY api_calls_24h DESC
    `).all(operatorId, operatorId, operatorId);

    // Get API key usage
    const apiKeyUsage = db.prepare(`
      SELECT 
        ak.id as key_id,
        ak.name as key_name,
        ak.key_prefix,
        ak.last_used_at,
        COALESCE(calls_24h.count, 0) as total_calls_24h,
        COALESCE(calls_7d.count, 0) as total_calls_7d,
        COALESCE(avg_response.avg_time, 0) as avg_response_time
      FROM api_keys ak
      LEFT JOIN (
        SELECT al.api_key_id, COUNT(*) as count
        FROM api_logs al
        WHERE al.created_at >= datetime('now', '-24 hours')
        GROUP BY al.api_key_id
      ) calls_24h ON ak.id = calls_24h.api_key_id
      LEFT JOIN (
        SELECT al.api_key_id, COUNT(*) as count
        FROM api_logs al
        WHERE al.created_at >= datetime('now', '-7 days')
        GROUP BY al.api_key_id
      ) calls_7d ON ak.id = calls_7d.api_key_id
      LEFT JOIN (
        SELECT al.api_key_id, AVG(al.response_time_ms) as avg_time
        FROM api_logs al
        WHERE al.created_at >= datetime('now', '-7 days')
        GROUP BY al.api_key_id
      ) avg_response ON ak.id = avg_response.api_key_id
      WHERE ak.operator_id = ?
      ORDER BY total_calls_24h DESC
    `).all(operatorId);

    const stats: DashboardStats = {
      analytics_overview: {
        total_api_calls_24h: calls24h.count,
        total_api_calls_7d: calls7d.count,
        total_api_calls_30d: calls30d.count,
        average_response_time: Math.round(avgResponseTime.avg_time || 0),
        error_rate_24h: errorRate24h.total_calls > 0 ? 
          Math.round((errorRate24h.error_calls / errorRate24h.total_calls) * 100) : 0,
        most_used_endpoints: mostUsedEndpoints
      },
      agent_performance: agentPerformance.map((agent: any) => ({
        agent_slug: agent.agent_slug,
        agent_name: agent.agent_name,
        views_24h: agent.views_24h,
        api_calls_24h: agent.api_calls_24h,
        api_calls_7d: agent.api_calls_7d,
        last_activity: agent.last_active_at,
        trust_score: agent.verified ? 85 : 50 // Simple trust score based on verification
      })),
      api_key_usage: apiKeyUsage.map((key: any) => ({
        key_id: key.key_id,
        key_name: key.key_name,
        key_prefix: key.key_prefix,
        total_calls_24h: key.total_calls_24h,
        total_calls_7d: key.total_calls_7d,
        last_used: key.last_used_at,
        avg_response_time: Math.round(key.avg_response_time)
      }))
    };

    return createSuccessResponse(stats);

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return createErrorResponse('internal_error', 'Failed to load dashboard statistics', 500);
  }
}