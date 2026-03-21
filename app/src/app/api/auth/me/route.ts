import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No session token provided' }, { status: 401 });
  }
  
  const sessionToken = authHeader.substring(7);
  const user = validateSession(sessionToken);
  
  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }
  
  return NextResponse.json(user);
}