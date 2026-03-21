'use client';

import { useState, useEffect } from 'react';

interface Service {
  id: number;
  name: string;
  description: string;
  endpoint_url: string;
  price_usdc: number;
  currency: string;
  active: boolean;
  created_at: string;
}

interface ServicesSectionProps {
  agentSlug: string;
}

export default function ServicesSection({ agentSlug }: ServicesSectionProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await fetch(`/api/v1/agents/${agentSlug}/services`);
        if (response.ok) {
          const data = await response.json();
          setServices(data.data || []);
        } else {
          setError('Failed to load services');
        }
      } catch (err) {
        setError('Error loading services');
        console.error('Services fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, [agentSlug]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 mb-6">
        <h2 className="font-bold text-lg mb-3">Services</h2>
        <div className="text-[var(--color-muted)]">Loading services...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 mb-6">
        <h2 className="font-bold text-lg mb-3">Services</h2>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  if (services.length === 0) {
    return null; // Don't render the section if no services
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 mb-6">
      <h2 className="font-bold text-lg mb-3">🚀 Available Services</h2>
      <div className="space-y-4">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} agentSlug={agentSlug} />
        ))}
      </div>
    </div>
  );
}

interface ServiceCardProps {
  service: Service;
  agentSlug: string;
}

function ServiceCard({ service, agentSlug }: ServiceCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handlePayAndCall = () => {
    // For now, just show a disabled state - the actual x402 payment will be implemented in phase 2
    alert('Coming soon — x402 integration in development');
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-[var(--color-accent)]/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg">{service.name}</h3>
            <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
              ${service.price_usdc.toFixed(3)} {service.currency}
            </span>
          </div>
          {service.description && (
            <p className="text-[var(--color-muted)] text-sm mb-3 leading-relaxed">
              {service.description}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-xs text-[var(--color-muted)]">
          Endpoint: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{service.endpoint_url}</code>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[var(--color-accent)] hover:underline"
          >
            {expanded ? 'Hide Details' : 'View Details'}
          </button>
          <button
            onClick={handlePayAndCall}
            disabled={true}
            className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed relative group"
            title="Coming soon — x402 integration"
          >
            Pay & Call (${service.price_usdc.toFixed(3)})
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
              Coming soon — x402 integration
            </div>
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-[var(--color-muted)]">Service ID:</span>
              <span className="ml-2">{service.id}</span>
            </div>
            <div>
              <span className="font-medium text-[var(--color-muted)]">Created:</span>
              <span className="ml-2">{new Date(service.created_at).toLocaleDateString()}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="font-medium text-[var(--color-muted)]">Payment Discovery:</span>
              <span className="ml-2">
                <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                  GET /api/v1/agents/{agentSlug}/services/{service.id}
                </code>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}