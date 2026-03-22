import { VerificationBadges } from '@/lib/types';

interface VerificationBadgesProps {
  verifications?: VerificationBadges;
  trustScore?: number;
}

export default function VerificationBadgesComponent({ verifications, trustScore }: VerificationBadgesProps) {
  if (!verifications && !trustScore) return null;

  const badges = [];

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