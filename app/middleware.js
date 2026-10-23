// middleware.js - Route Protection Middleware for Sri Gokulam Admin Portal
import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protect all /admin routes except /admin/login
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    // Exclude the login gateway itself so admins can access it
    if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
      return NextResponse.next();
    }

    const sessionCookie = request.cookies.get('sgr_admin_session')?.value;

    // If there is no active session cookie, immediately redirect to /admin/login
    if (!sessionCookie || !sessionCookie.trim()) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
  ],
};
