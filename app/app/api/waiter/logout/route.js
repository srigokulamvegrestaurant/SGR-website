// app/api/waiter/logout/route.js - Floor Captain Logout Endpoint
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Waiter logged out successfully.',
  });

  response.cookies.set('sgr_waiter_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}

