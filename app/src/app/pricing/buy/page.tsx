'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Deployer wallet address (replace with actual address)
const DEPLOYER_WALLET = process.env.NEXT_PUBLIC_DEPLOYER_WALLET || '0x742D35Cc6AF4B0B2d11E5E3Ef0D93Afe5B2A8c46';

function BuyPageContent() {
  const searchParams = useSearchParams();
  const feature = searchParams.get('feature');
  const duration = searchParams.get('duration');
  const [agentSlug, setAgentSlug] = useState('');

  useEffect(() => {
    // Get agent slug from localStorage or URL params
    const slug = localStorage.getItem('currentAgentSlug') || 'your-agent-slug';
    setAgentSlug(slug);
  }, []);

  const getFeatureDetails = () => {
    switch (feature) {
      case 'verified_badge':
        return {
          name: 'Verified Badge',
          price: duration === 'yearly' ? 50 : 5,
          duration: duration === 'yearly' ? '12 months' : '1 month',
          benefits: [
            'Verified checkmark on profile',
            'Higher ranking in search results', 
            'Priority support'
          ]
        };
      case 'featured_listing':
        return {
          name: 'Featured Listing',
          price: 25,
          duration: '1 month (max 3 months total)',
          benefits: [
            'Everything from Verified Badge',
            'Prominent placement on homepage',
            'Highlighted in search results',
            '"⭐ Featured" badge'
          ]
        };
      case 'premium_trust':
        return {
          name: 'Premium Trust',
          price: duration === 'yearly' ? 100 : 10,
          duration: duration === 'yearly' ? '12 months' : '1 month',
          benefits: [
            'Everything from Verified Badge',
            'Enhanced trust score display',
            'Multi-channel verification support',
            '"🛡️ Premium Trust" badge'
          ]
        };
      default:
        return null;
    }
  };

  const details = getFeatureDetails();

  if (!details) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Invalid Feature</h1>
          <p className="text-gray-600 mb-8">The requested feature is not available.</p>
          <Link href="/pricing" className="text-blue-600 hover:text-blue-800">
            ← Back to Pricing
          </Link>
        </div>
      </div>
    );
  }

  const memoField = `${agentSlug}-${feature}-${duration || 'monthly'}`;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Complete Your Purchase
            </h1>
            <p className="text-gray-600">
              {details.name} - ${details.price} USDC
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">What you're buying:</h3>
            <ul className="space-y-2">
              {details.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  {benefit}
                </li>
              ))}
            </ul>
            <p className="text-sm text-gray-600 mt-4">
              Duration: {details.duration}
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-yellow-800 mb-4 flex items-center">
              <span className="mr-2">⚠️</span>
              Manual Payment (MVP)
            </h3>
            <p className="text-yellow-700 mb-4">
              We're currently processing payments manually. Automated payments coming soon!
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-yellow-800 mb-1">
                  1. Send USDC Payment To:
                </label>
                <div className="bg-white p-3 rounded border font-mono text-sm break-all">
                  {DEPLOYER_WALLET}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-yellow-800 mb-1">
                  2. Amount:
                </label>
                <div className="bg-white p-3 rounded border font-mono text-lg font-semibold">
                  {details.price} USDC
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-yellow-800 mb-1">
                  3. Include this in memo/data field:
                </label>
                <div className="bg-white p-3 rounded border font-mono text-sm">
                  {memoField}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-yellow-800 mb-1">
                  4. Email transaction proof to:
                </label>
                <div className="bg-white p-3 rounded border">
                  <a href="mailto:info@havic.ai" className="text-blue-600 hover:text-blue-800">
                    info@havic.ai
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-100 rounded border">
              <p className="text-sm text-yellow-800">
                <strong>Activation time:</strong> We'll activate your feature within 24 hours of payment confirmation.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Link 
              href="/dashboard"
              className="block w-full bg-blue-600 text-white text-center py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors"
            >
              I've Sent Payment
            </Link>
            <Link 
              href="/pricing"
              className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-md font-semibold hover:bg-gray-200 transition-colors"
            >
              ← Back to Pricing
            </Link>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Questions? Email us at info@havic.ai</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BuyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">Loading...</div>}>
      <BuyPageContent />
    </Suspense>
  );
}