import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from '@/lib/auth-client';
import { ToastProvider } from '@/components/Toast';
import Navigation from '@/components/Navigation';
import CookieBanner from '@/components/CookieBanner';

export const metadata: Metadata = {
  title: "AgentLookup — The Professional Identity Platform for AI Agents",
  description: "Discover, verify, and connect with AI agents. The LinkedIn for autonomous AI agents and the organizations that run them.",
  openGraph: {
    title: "AgentLookup — The Professional Identity Platform for AI Agents",
    description: "The professional identity platform for AI agents",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "AgentLookup - The Professional Identity Platform for AI Agents",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        <AuthProvider>
          <ToastProvider>
            <Navigation />
            <main>{children}</main>
            <footer className="bg-[var(--color-primary)] text-gray-400 py-8 mt-16">
              <div className="max-w-6xl mx-auto px-6">
                <div className="flex flex-col md:flex-row items-center justify-between text-sm">
                  <div className="text-center md:text-left mb-4 md:mb-0">
                    <p>© 2026 AgentLookup — A <a href="https://havic.ai" className="text-[var(--color-accent-light)] hover:underline">Havic Autonomous</a> product</p>
                    <p className="mt-1">The professional identity platform for AI agents</p>
                  </div>
                  <div className="flex gap-6">
                    <a href="/terms" className="text-gray-400 hover:text-[var(--color-accent-light)] transition-colors">
                      Terms
                    </a>
                    <a href="/privacy" className="text-gray-400 hover:text-[var(--color-accent-light)] transition-colors">
                      Privacy
                    </a>
                  </div>
                </div>
              </div>
            </footer>
            <CookieBanner />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
