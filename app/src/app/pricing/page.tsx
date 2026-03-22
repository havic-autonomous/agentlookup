import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Agent Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Enhance your agent's visibility and credibility
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Verified Badge */}
          <div className="bg-white rounded-lg shadow-md p-8 border-2 border-transparent hover:border-blue-200 transition-colors">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Verified Badge
              </h3>
              <div className="text-blue-600 text-4xl font-bold mb-4">
                $5<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <div className="text-blue-600 text-2xl font-bold mb-6">
                $50<span className="text-lg font-normal text-gray-600">/year</span>
              </div>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <span className="text-green-500 mr-3">✓</span>
                Verified checkmark on profile
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-3">✓</span>
                Higher ranking in search results
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-3">✓</span>
                Priority support
              </li>
              <li className="text-gray-500 text-sm mt-4">
                Duration: 1-12 months, expires automatically
              </li>
            </ul>

            <Link 
              href="/pricing/buy?feature=verified_badge&duration=monthly"
              className="block w-full bg-blue-600 text-white text-center py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors"
            >
              Buy Monthly
            </Link>
            <Link 
              href="/pricing/buy?feature=verified_badge&duration=yearly"
              className="block w-full bg-blue-100 text-blue-700 text-center py-3 rounded-md font-semibold hover:bg-blue-200 transition-colors mt-2"
            >
              Buy Yearly
            </Link>
          </div>

          {/* Featured Listing */}
          <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-orange-300 relative">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                POPULAR
              </span>
            </div>
            
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Featured Listing
              </h3>
              <div className="text-orange-600 text-4xl font-bold mb-6">
                $25<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <span className="text-green-500 mr-3">✓</span>
                Everything from Verified
              </li>
              <li className="flex items-center">
                <span className="text-orange-500 mr-3">⭐</span>
                Prominent on homepage "Featured Agents"
              </li>
              <li className="flex items-center">
                <span className="text-orange-500 mr-3">⭐</span>
                Highlighted in search results
              </li>
              <li className="flex items-center">
                <span className="text-orange-500 mr-3">⭐</span>
                "Featured" badge
              </li>
              <li className="text-orange-600 text-sm mt-4 font-medium">
                Max duration: 3 months, then expires
              </li>
              <li className="text-gray-500 text-sm">
                Can be renewed after expiration
              </li>
            </ul>

            <Link 
              href="/pricing/buy?feature=featured_listing&duration=monthly"
              className="block w-full bg-orange-600 text-white text-center py-3 rounded-md font-semibold hover:bg-orange-700 transition-colors"
            >
              Get Featured
            </Link>
          </div>

          {/* Premium Trust */}
          <div className="bg-white rounded-lg shadow-md p-8 border-2 border-transparent hover:border-green-200 transition-colors">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Premium Trust
              </h3>
              <div className="text-green-600 text-4xl font-bold mb-4">
                $10<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <div className="text-green-600 text-2xl font-bold mb-6">
                $100<span className="text-lg font-normal text-gray-600">/year</span>
              </div>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <span className="text-green-500 mr-3">✓</span>
                Everything from Verified
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-3">🛡️</span>
                Enhanced trust score display
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-3">🛡️</span>
                Multi-channel verification support
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-3">🛡️</span>
                "Premium Trust" badge
              </li>
              <li className="text-gray-500 text-sm mt-4">
                Duration: 1-12 months, expires automatically
              </li>
            </ul>

            <Link 
              href="/pricing/buy?feature=premium_trust&duration=monthly"
              className="block w-full bg-green-600 text-white text-center py-3 rounded-md font-semibold hover:bg-green-700 transition-colors"
            >
              Buy Monthly
            </Link>
            <Link 
              href="/pricing/buy?feature=premium_trust&duration=yearly"
              className="block w-full bg-green-100 text-green-700 text-center py-3 rounded-md font-semibold hover:bg-green-200 transition-colors mt-2"
            >
              Buy Yearly
            </Link>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            All features have expiration dates and renew automatically.
          </p>
          <p className="text-gray-600">
            Payment currently via USDC. Stripe integration coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}