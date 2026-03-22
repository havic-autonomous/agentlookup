import { VerificationBadges, PaidFeature } from '@/lib/types';

interface VerificationBadgesProps {
  verifications?: VerificationBadges;
  trustScore?: number;
  paidFeatures?: PaidFeature[];
}

export default function VerificationBadgesComponent({ verifications, trustScore, paidFeatures }: VerificationBadgesProps) {
  if (!verifications && !trustScore && !paidFeatures) return null;

  const badges = [];

  // Paid feature badges (show first for priority)
  if (paidFeatures && paidFeatures.length > 0) {
    for (const feature of paidFeatures) {
      const expiresAt = new Date(feature.expires_at);
      const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (feature.feature_type === 'verified_badge') {
        badges.push(
          <span
            key="paid-verified"
            className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm px-3 py-1 rounded-full font-medium transition-colors cursor-help"
            title={`Paid Verified Badge - Expires in ${daysRemaining} days`}
          >
            ✓ Verified
          </span>
        );
      }
      
      if (feature.feature_type === 'featured_listing') {
        badges.push(
          <span
            key="featured"
            className="bg-orange-50 hover:bg-orange-100 text-orange-600 text-sm px-3 py-1 rounded-full font-medium transition-colors cursor-help"
            title={`Featured Listing - Expires in ${daysRemaining} days`}
          >
            ⭐ Featured
          </span>
        );
      }
      
      if (feature.feature_type === 'premium_trust') {
        badges.push(
          <span
            key="premium-trust"
            className="bg-green-50 hover:bg-green-100 text-green-600 text-sm px-3 py-1 rounded-full font-medium transition-colors cursor-help"
            title={`Premium Trust Badge - Expires in ${daysRemaining} days`}
          >
            🛡️ Premium Trust
          </span>
        );
      }
    }
  }

  // Domain verification
  if (verifications?.domain?.status === 'verified') {
    const domain = verifications.domain.proof;
    badges.push(
      <span
        key="domain"
        className="bg-green-50 hover:bg-green-100 text-green-600 text-sm px-3 py-1 rounded-full font-medium transition-colors cursor-help"
        title={`Domain verified: ${domain}`}
      >
        🌐 Domain
      </span>
    );
  }

  // GitHub verification
  if (verifications?.github?.status === 'verified') {
    const repo = verifications.github.proof;
    badges.push(
      <span
        key="github"
        className="bg-purple-50 hover:bg-purple-100 text-purple-600 text-sm px-3 py-1 rounded-full font-medium transition-colors cursor-help"
        title={`GitHub verified: ${repo}`}
      >
        🐙 GitHub
      </span>
    );
  }

  // On-chain verification
  if (verifications?.onchain?.status === 'verified') {
    const txHash = verifications.onchain.proof;
    badges.push(
      <span
        key="onchain"
        className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm px-3 py-1 rounded-full font-medium transition-colors cursor-help"
        title={`On-chain verified: ${txHash?.substring(0, 10)}...`}
      >
        ⛓️ On-Chain
      </span>
    );
  }

  // Twitter verification
  if (verifications?.twitter?.status === 'verified') {
    const handle = verifications.twitter.proof;
    badges.push(
      <span
        key="twitter"
        className="bg-cyan-50 hover:bg-cyan-100 text-cyan-600 text-sm px-3 py-1 rounded-full font-medium transition-colors cursor-help"
        title={`Twitter verified: ${handle}`}
      >
        🐦 Twitter
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {badges}
      {trustScore !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Trust Score:</span>
          <div className="flex items-center gap-1">
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  trustScore >= 75 ? 'bg-green-500' : 
                  trustScore >= 50 ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}
                style={{ width: `${trustScore}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${
              trustScore >= 75 ? 'text-green-600' : 
              trustScore >= 50 ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {trustScore}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}