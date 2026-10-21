// app/api/auth/session/route.js - Real-time Session Validation Endpoint
import { NextResponse } from 'next/server';
import { validateSession, isProtectedDeveloperEmail } from '@/lib/db';
import { ROLE_PERMISSIONS } from '../login/route';

export async function GET(request) {
  try {
    const cookieToken = request.cookies.get('sgr_admin_session')?.value;
    const authHeader = request.headers.get('authorization');
    const token = cookieToken || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!token) {
      return NextResponse.json({ authenticated: false, error: 'No active session token' }, { status: 401 });
    }

    const validated = validateSession(token);
    if (!validated) {
      return NextResponse.json({ authenticated: false, error: 'Session expired or invalidated' }, { status: 401 });
    }

    const { user, session } = validated;
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isProtected: isProtectedDeveloperEmail(user.email) || !!user.isProtected,
        permissions: ROLE_PERMISSIONS[user.role] || {},
      },
      session: {
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}
