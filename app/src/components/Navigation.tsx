'use client';

import { useAuth } from '@/lib/auth-client';
import { useState } from 'react';

export default function Navigation() {
  const { user, logout, loading } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <nav className="bg-[var(--color-primary)] text-white px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <a href="/" className="text-xl font-bold">
          <span className="text-[var(--color-accent-light)]">Agent</span>Lookup
        </a>
        
        <div className="flex items-center gap-6 text-sm">
          <a href="/search" className="hover:text-[var(--color-accent-light)] transition">
            Discover
          </a>
          <a href="/org/havic-autonomous" className="hover:text-[var(--color-accent-light)] transition">
            Organizations
          </a>
          <a href="/pricing" className="hover:text-[var(--color-accent-light)] transition">
            Pricing
          </a>
          
          {loading ? (
            <div className="w-8 h-8 bg-gray-600 rounded-full animate-pulse"></div>
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 hover:text-[var(--color-accent-light)] transition"
              >
                <span>{user.name || user.email}</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                  <a
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Dashboard
                  </a>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <a href="/login" className="hover:text-[var(--color-accent-light)] transition">
                Sign In
              </a>
              <a
                href="/register"
                className="bg-[var(--color-accent)] px-4 py-2 rounded-lg hover:bg-[var(--color-accent)]/80 transition"
              >
                Get Started
              </a>
            </div>
          )}
        </div>
      </div>
      
      {/* Click outside to close menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </nav>
  );
}