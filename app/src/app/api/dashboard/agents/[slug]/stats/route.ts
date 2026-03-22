import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { authMiddleware } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse, unauthorizedResponse } from '@/lib/api-response';

interface AgentDetailedStats {
  agent: {
    slug: string;
    name: string;
    role: string | null;
    status: string;
    verified: boolean;
    created_at: string;
  };
  api_usage: {
    calls_24h: number;
    calls_7d: number;
    calls_30d: number;
    calls_total: number;
    avg_response_time_24h: number;
    error_rate_24h: number;
    peak_hour: { hour: number; calls: number } | null;
  };
  endpoint_breakdown: Array<{
    endpoint: string;
    method: string;
    calls: number;
    avg_response_time: number;
    error_rate: number;
  }>;
  daily_usage: Array<{
    date: string;
    calls: number;
    avg_response_time: number;
    errors: number;
  }>;
  recent_activity: Array<{
    timestamp: string;
    endpoint: string;
    method: string;
    status_code: number;
    response_time_ms: number;
    ip_address: string | null;
  }>;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Authentication
  const auth = authMiddleware(request);
  if (!auth || auth.type !== 'session') {
    return unauthorizedResponse();
  }

  const db = getDatabase();
  const operatorId = auth.user!.id;

  try {
    // Verify agent ownership
    const agent = db.prepare(`
      SELECT id, slug, name, role, status, verified, created_at
      FROM agents 
      WHERE slug = ? AND owner_id = ?
    `).get(slug, operatorId) as {
      id: string;
      slug: string;
      name: string;
      role: string | null;
      status: string;
      verified: number;
      created_at: string;
    } | undefined;

    if (!agent) {
      return createErrorResponse('not_found', 'Agent not found or access denied', 404);
    }

    // Get API usage statistics
    const usageStats = db.prepare(`
      SELECT 
        COUNT(*) as calls_total,
        SUM(CASE WHEN al.created_at >= datetime('now', '-24 hours') THEN 1 ELSE 0 END) as calls_24h,
        SUM(CASE WHEN al.created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as calls_7d,
        SUM(CASE WHEN al.created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) as calls_30d,
        AVG(CASE WHEN al.created_at >= datetime('now', '-24 hours') THEN al.response_time_ms END) as avg_response_time_24h,
        SUM(CASE WHEN al.created_at >= datetime('now', '-24 hours') AND al.status_code >= 400 THEN 1 ELSE 0 END) as errors_24h,
        SUM(CASE WHEN al.created_at >= datetime('now', '-24 hours') THEN 1 ELSE 0 END) as total_24h
      FROM api_logs al
      LEFT JOIN api_keys ak ON al.api_key_id = ak.id
      WHERE al.agent_slug = ? AND ak.operator_id = ?
    `).get(slug, operatorId) as any;

    // Get peak hour
    const peakHour = db.prepare(`
      SELECT 
        strftime('%H', al.created_at) as hour,
        COUNT(*) as calls
      FROM api_logs al
      LEFT JOIN api_keys ak ON al.api_key_id = ak.id
      WHERE al.agent_slug = ? AND ak.operator_id = ? 
        AND al.created_at >= datetime('now', '-7 days')
      GROUP BY hour
      ORDER BY calls DESC
      LIMIT 1
    `).get(slug, operatorId) as any;

    // Get endpoint breakdown
    const endpointBreakdown = db.prepare(`
      SELECT 
        al.endpoint,
        al.method,
        COUNT(*) as calls,
        AVG(al.response_time_ms) as avg_response_time,
        SUM(CASE WHEN al.status_code >= 400 THEN 1 ELSE 0 END) as errors
      FROM api_logs al
      LEFT JOIN api_keys ak ON al.api_key_id = ak.id
      WHERE al.agent_slug = ? AND ak.operator_id = ?
        AND al.created_at >= datetime('now', '-30 days')
      GROUP BY al.endpoint, al.method
      ORDER BY calls DESC
      LIMIT 10
    `).all(slug, operatorId) as any[];

    // Get daily usage for the last 7 days
    const dailyUsage = db.prepare(`
      SELECT 
        date(al.created_at) as date,
        COUNT(*) as calls,
        AVG(al.response_time_ms) as avg_response_time,
        SUM(CASE WHEN al.status_code >= 400 THEN 1 ELSE 0 END) as errors
      FROM api_logs al
      LEFT JOIN api_keys ak ON al.api_key_id = ak.id
      WHERE al.agent_slug = ? AND ak.operator_id = ?
        AND al.created_at >= datetime('now', '-7 days')
      GROUP BY date(al.created_at)
      ORDER BY date DESC
    `).all(slug, operatorId) as any[];

    // Get recent activity
    const recentActivity = db.prepare(`
      SELECT 
        al.created_at as timestamp,
        al.endpoint,
        al.method,
        al.status_code,
        al.response_time_ms,
        al.ip_address
      FROM api_logs al
      LEFT JOIN api_keys ak ON al.api_key_id = ak.id
      WHERE al.agent_slug = ? AND ak.operator_id = ?
      ORDER BY al.created_at DESC
      LIMIT 50
    `).all(slug, operatorId) as any[];

    const stats: AgentDetailedStats = {
      agent: {
        slug: agent.slug,
        name: agent.name,
        role: agent.role,
        status: agent.status,
        verified: Boolean(agent.verified),
        created_at: agent.created_at
      },
      api_usage: {
        calls_24h: usageStats.calls_24h || 0,
        calls_7d: usageStats.calls_7d || 0,
        calls_30d: usageStats.calls_30d || 0,
        calls_total: usageStats.calls_total || 0,
        avg_response_time_24h: Math.round(usageStats.avg_response_time_24h || 0),
        error_rate_24h: usageStats.total_24h > 0 ? 
          Math.round((usageStats.errors_24h / usageStats.total_24h) * 100) : 0,
        peak_hour: peakHour ? {
          hour: parseInt(peakHour.hour),
          calls: peakHour.calls
        } : null
      },
      endpoint_breakdown: endpointBreakdown.map(endpoint => ({
        endpoint: endpoint.endpoint,
        method: endpoint.method,
        calls: endpoint.calls,
        avg_response_time: Math.round(endpoint.avg_response_time),
        error_rate: endpoint.calls > 0 ? 
          Math.round((endpoint.errors / endpoint.calls) * 100) : 0
      })),
      daily_usage: dailyUsage.map(day => ({
        date: day.date,
        calls: day.calls,
        avg_response_time: Math.round(day.avg_response_time),
        errors: day.errors
      })),
      recent_activity: recentActivity.map(activity => ({
        timestamp: activity.timestamp,
        endpoint: activity.endpoint,
        method: activity.method,
        status_code: activity.status_code,
        response_time_ms: activity.response_time_ms,
        ip_address: activity.ip_address
      }))
    };

    return createSuccessResponse(stats);

  } catch (error) {
    console.error('Agent stats error:', error);
    return createErrorResponse('internal_error', 'Failed to load agent statistics', 500);
  }
}