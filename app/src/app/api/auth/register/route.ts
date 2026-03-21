import { NextRequest, NextResponse } from 'next/server';
import { createUser, createSession } from '@/lib/auth';
import { checkRegisterRateLimit } from '@/lib/rate-limiter';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-client-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    
    // Check rate limit
    const rateLimit = checkRegisterRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many registration attempts', 
          retryAfter: rateLimit.retryAfter 
        },
        { 
          status: 429,
          headers: rateLimit.retryAfter ? {
            'Retry-After': rateLimit.retryAfter.toString()
          } : {}
        }
      );
    }
    
    const body = await request.json();
    const { email, password, name } = registerSchema.parse(body);
    
    const user = await createUser(email, password, name);
    const sessionToken = createSession(user.id);
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      sessionToken,
    }, { status: 201 });
    
  } catch (error: any) {
    if (error.message === 'User already exists') {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}