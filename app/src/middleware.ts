import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get session token from cookie
  const sessionToken = request.cookies.get('agentlookup_session')?.value;
  
  // Protected routes
  const protectedRoutes = ['/dashboard'];
  const authRoutes = ['/login', '/register'];
  
  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if current path is auth-related
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  let response: NextResponse;
  
  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    response = NextResponse.redirect(loginUrl);
  }
  // Redirect to dashboard if accessing auth routes while logged in
  else if (isAuthRoute && sessionToken) {
    response = NextResponse.redirect(new URL('/dashboard', request.url));
  }
  else {
    response = NextResponse.next();
  }
  
  // Add security headers
  response.headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self' https://agentlookup.ai https://sepolia.base.org https://mainnet.base.org; " +
    "frame-ancestors 'none';"
  );
  
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register']
};