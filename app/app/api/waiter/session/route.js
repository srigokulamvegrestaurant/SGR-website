// app/api/waiter/session/route.js - Real-time Waiter Session Verification
import { NextResponse } from 'next/server';
import { getDbAsync, verifySignedToken } from '@/lib/db';

export async function GET(request) {
  try {
    const cookieToken = request.cookies.get('sgr_waiter_session')?.value;
    const authHeader = request.headers.get('authorization');
    const token = cookieToken || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: 'No active waiter session token' },
        { status: 401 }
      );
    }

    const decoded = verifySignedToken(token);
    if (!decoded) {
      return NextResponse.json(
        { authenticated: false, error: 'Session expired or invalid signature' },
        { status: 401 }
      );
    }

    if (new Date() > new Date(decoded.expiresAt)) {
      return NextResponse.json(
        { authenticated: false, error: 'Session has expired' },
        { status: 401 }
      );
    }

    const db = await getDbAsync();
    const waiter = (db.users || []).find((u) => {
      if (u.role !== 'WAITER') return false;
      return (
        (decoded.userId && u.id === decoded.userId) ||
        (decoded.username && u.username && u.username.toLowerCase() === decoded.username.toLowerCase()) ||
        (decoded.email && u.email && u.email.toLowerCase() === decoded.email.toLowerCase())
      );
    });

    if (!waiter) {
      return NextResponse.json(
        { authenticated: false, error: 'Waiter account not found' },
        { status: 401 }
      );
    }

    // Check if waiter was deactivated while logged in
    if (waiter.isActive === false) {
      return NextResponse.json(
        {
          authenticated: false,
          isDeactivated: true,
          error: 'Your waiter account has been deactivated. Please contact store management.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      waiter: {
        id: waiter.id,
        fullName: waiter.fullName,
        username: waiter.username || decoded.username,
        role: waiter.role,
        isActive: waiter.isActive,
      },
      session: {
        expiresAt: decoded.expiresAt,
      },
    });
  } catch (error) {
    console.error('Waiter session verification error:', error);
    return NextResponse.json(
      { authenticated: false, error: error.message },
      { status: 500 }
    );
  }
}

