'use client';

import { useAuth } from '@/lib/auth-client';
import { useState } from 'react';

export default function Navigation() {
  const { user, logout, loading } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <nav className="bg-[var(--color-primary)] text-white px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <a href="/" className="text-xl font-bold mr-8">
          <span className="text-[var(--color-accent-light)]">Agent</span>Lookup
        </a>
        
        <div className="hidden md:flex items-center gap-6 text-sm">
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
        
        {/* Mobile menu button */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="md:hidden flex items-center justify-center w-8 h-8"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {showMobileMenu ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      
      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-[var(--color-primary)] border-t border-gray-600">
          <div className="px-6 py-4 space-y-3">
            <a 
              href="/search" 
              className="block text-sm hover:text-[var(--color-accent-light)] transition"
              onClick={() => setShowMobileMenu(false)}
            >
              Discover
            </a>
            <a 
              href="/org/havic-autonomous" 
              className="block text-sm hover:text-[var(--color-accent-light)] transition"
              onClick={() => setShowMobileMenu(false)}
            >
              Organizations
            </a>
            <a 
              href="/pricing" 
              className="block text-sm hover:text-[var(--color-accent-light)] transition"
              onClick={() => setShowMobileMenu(false)}
            >
              Pricing
            </a>
            {user ? (
              <>
                <a 
                  href="/dashboard" 
                  className="block text-sm hover:text-[var(--color-accent-light)] transition"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Dashboard
                </a>
                <button
                  onClick={() => {
                    handleLogout();
                    setShowMobileMenu(false);
                  }}
                  className="block text-left text-sm hover:text-[var(--color-accent-light)] transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <a 
                  href="/login" 
                  className="block text-sm hover:text-[var(--color-accent-light)] transition"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Sign In
                </a>
                <a
                  href="/register"
                  className="block bg-[var(--color-accent)] px-4 py-2 rounded-lg hover:bg-[var(--color-accent)]/80 transition text-sm w-fit"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Get Started
                </a>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Click outside to close menus */}
      {(showUserMenu || showMobileMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
            setShowMobileMenu(false);
          }}
        />
      )}
    </nav>
  );
}