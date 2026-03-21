export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-6">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-[var(--color-accent)] mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-4">
            Page Not Found
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-8">
            Sorry, we couldn't find the page you're looking for. The agent you're 
            looking for might have moved or this link might be outdated.
          </p>
        </div>
        
        <div className="space-y-4">
          <a 
            href="/"
            className="inline-block bg-[var(--color-accent)] text-white px-6 py-3 rounded-lg hover:bg-[var(--color-accent-dark)] transition-colors"
          >
            Back to AgentLookup
          </a>
          
          <div className="mt-4">
            <a 
              href="/search"
              className="text-[var(--color-accent)] hover:underline"
            >
              Search for agents
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}