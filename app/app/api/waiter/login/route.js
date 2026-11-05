// app/api/waiter/login/route.js - Floor Captain & Waiter Authentication Endpoint
// Supports Username and Password login with Active/Inactive verification
import { NextResponse } from 'next/server';
import { getDbAsync, verifyPassword, createSignedToken, recordAuditLog } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password } = body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json(
        { success: false, error: 'Username is required to log in.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Password is required to log in.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const db = await getDbAsync();

    // Look for a waiter account matching username (or email fallback)
    const waiter = (db.users || []).find((u) => {
      if (u.role !== 'WAITER') return false;
      const matchUsername = u.username && u.username.toLowerCase() === cleanUsername;
      const matchEmail = u.email && u.email.toLowerCase() === cleanUsername;
      return matchUsername || matchEmail;
    });

    if (!waiter) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid username or password. Please verify your credentials or contact the manager.',
        },
        { status: 401 }
      );
    }

    // Check account status: only ACTIVE waiters are allowed to log in
    if (waiter.isActive === false) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your waiter account has been deactivated. Please contact the restaurant manager.',
          isDeactivated: true,
        },
        { status: 403 }
      );
    }

    // Check password
    if (!waiter.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password not set for this account. Please ask the restaurant admin to set your password.',
        },
        { status: 401 }
      );
    }

    const isValidPassword = verifyPassword(password, waiter.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid username or password. Please verify your credentials.',
        },
        { status: 401 }
      );
    }

    // 30 days session validity so captain isn't interrupted mid-shift
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const sessionToken = createSignedToken({
      userId: waiter.id,
      username: waiter.username || cleanUsername,
      fullName: waiter.fullName,
      role: 'WAITER',
      type: 'waiter',
      expiresAt,
    });

    recordAuditLog({
      user: waiter.fullName,
      role: 'WAITER',
      module: 'SECURITY',
      action: 'WAITER_LOGIN_SUCCESS',
      detail: `Floor Captain ${waiter.fullName} (@${waiter.username || cleanUsername}) logged in successfully.`,
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    const response = NextResponse.json({
      success: true,
      message: `Welcome, ${waiter.fullName}!`,
      waiter: {
        id: waiter.id,
        fullName: waiter.fullName,
        username: waiter.username || cleanUsername,
        role: waiter.role,
        isActive: waiter.isActive,
      },
      token: sessionToken,
    });

    // Set secure HTTP-only cookie for session persistence
    response.cookies.set('sgr_waiter_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Waiter login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during login.' },
      { status: 500 }
    );
  }
}

