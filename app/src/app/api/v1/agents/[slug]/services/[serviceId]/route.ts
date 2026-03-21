import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { createSuccessResponse, notFoundResponse } from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ slug: string; serviceId: string }>;
}

// For now, use a default recipient address - in production this would be configurable per agent
const DEFAULT_PAYMENT_RECIPIENT = '0x742d35Cc6634C0532925a3b8D37842C5426634e4'; // Example Base wallet

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug, serviceId } = await params;
  const db = getDatabase();
  
  // Get agent and service details
  const serviceData = db.prepare(`
    SELECT 
      s.id,
      s.name,
      s.description,
      s.endpoint_url,
      s.price_usdc,
      s.currency,
      s.active,
      s.created_at,
      a.slug as agent_slug,
      a.name as agent_name
    FROM agent_services s
    JOIN agents a ON s.agent_id = a.id
    WHERE a.slug = ? AND s.id = ? AND s.active = 1
  `).get(slug, serviceId) as any;
  
  if (!serviceData) {
    return notFoundResponse('Service');
  }
  
  // Convert USDC price to wei amount (USDC has 6 decimals)
  const amountInWei = Math.floor(serviceData.price_usdc * 1_000_000).toString();
  
  // Return service details with x402-compatible payment information
  const response = {
    data: {
      service: {
        id: serviceData.id,
        name: serviceData.name,
        description: serviceData.description,
        endpoint_url: serviceData.endpoint_url,
        price_usdc: serviceData.price_usdc,
        agent: {
          slug: serviceData.agent_slug,
          name: serviceData.agent_name
        },
        created_at: serviceData.created_at
      },
      payment: {
        protocol: 'x402',
        chain: 'base',
        chainId: 8453,
        currency: 'USDC',
        amount: amountInWei, // USDC amount in wei (6 decimals)
        recipient: DEFAULT_PAYMENT_RECIPIENT,
        network: 'base-mainnet',
        // x402 specific fields
        maxAmountRequired: serviceData.price_usdc.toString(),
        resource: `/api/v1/agents/${slug}/services/${serviceId}`,
        description: `${serviceData.name} - ${serviceData.agent_name}`,
        payTo: DEFAULT_PAYMENT_RECIPIENT,
        asset: '0x036CbD53842c5426634e4AfDf9dFf9C7', // USDC on Base (example address)
        network_eip155: 'eip155:8453' // EIP-155 format for x402 compatibility
      }
    }
  };
  
  return createSuccessResponse(response);
}