'use client';

// app/admin/components/AdminAuthGuard.js - Cryptographic Session Verification & Route Guard
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminAuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  // If on admin login page, pass through immediately
  const isLoginPage = pathname === '/admin/login' || pathname?.startsWith('/admin/login/');

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isVerifying, setIsVerifying] = useState(!isLoginPage);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Skip verification when rendering login page
    if (isLoginPage) {
      setIsAuthorized(true);
      setIsVerifying(false);
      return;
    }

    let active = true;

    async function verifySession() {
      setIsVerifying(true);
      setErrorMessage('');

      try {
        const localToken = typeof window !== 'undefined' ? localStorage.getItem('sgr_admin_session') : null;
        const res = await fetch('/api/auth/session', {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            ...(localToken ? { Authorization: `Bearer ${localToken}` } : {}),
          },
        });

        const data = await res.json();

        if (!active) return;

        if (res.ok && data.authenticated && data.user) {
          // Valid authenticated session
          if (typeof window !== 'undefined') {
            localStorage.setItem('sgr_admin_user', JSON.stringify(data.user));
          }
          setIsAuthorized(true);
          setIsVerifying(false);
        } else {
          // Session invalid, expired, or missing
          if (typeof window !== 'undefined') {
            localStorage.removeItem('sgr_admin_session');
            localStorage.removeItem('sgr_admin_user');
          }
          setIsAuthorized(false);
          setIsVerifying(false);
          setErrorMessage(data.error || 'Authentication required to access admin workspace.');

          const redirectUrl = `/admin/login?redirect=${encodeURIComponent(pathname || '/admin')}`;
          router.replace(redirectUrl);
        }
      } catch (err) {
        if (!active) return;
        console.error('Admin session validation network error:', err);
        setIsAuthorized(false);
        setIsVerifying(false);
        setErrorMessage('Unable to verify administrator session. Redirecting to login...');
        
        const redirectUrl = `/admin/login?redirect=${encodeURIComponent(pathname || '/admin')}`;
        router.replace(redirectUrl);
      }
    }

    verifySession();

    return () => {
      active = false;
    };
  }, [pathname, isLoginPage, router]);

  // If currently on login page, render children directly
  if (isLoginPage) {
    return <>{children}</>;
  }

  // If verified and authorized, render admin dashboard/route
  if (isAuthorized) {
    return <>{children}</>;
  }

  // While verifying or redirecting, display secure Sri Gokulam Access Guard Screen
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'radial-gradient(ellipse at 50% 20%, #111e38 0%, #080d1a 60%, #03060c 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        color: '#f8fafc',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          borderRadius: '1.25rem',
          padding: '2.5rem 2rem',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.75), 0 0 50px rgba(212, 175, 55, 0.12)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          textAlign: 'center',
        }}
      >
        {/* Shield / Lock Emblem */}
        <div
          style={{
            width: '76px',
            height: '76px',
            margin: '0 auto 1.5rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.05) 100%)',
            border: '1.5px solid rgba(212, 175, 55, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(212, 175, 55, 0.25)',
          }}
        >
          <span style={{ fontSize: '2.25rem' }}>🔐</span>
        </div>

        {/* Branding Title */}
        <h1
          style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            letterSpacing: '0.02em',
            margin: '0 0 0.35rem 0',
            background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 50%, #d4af37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Sri Gokulam Admin Suite
        </h1>
        <p
          style={{
            fontSize: '0.82rem',
            color: '#94a3b8',
            margin: '0 0 1.75rem 0',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Karaikudi Chettinad Pure Veg
        </p>

        {/* Status Display */}
        <div
          style={{
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          {isVerifying ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid rgba(212, 175, 55, 0.2)',
                  borderTopColor: '#d4af37',
                  borderRadius: '50%',
                  animation: 'sgrSpin 0.9s linear infinite',
                }}
              />
              <style>{`
                @keyframes sgrSpin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
              <div style={{ fontSize: '0.92rem', color: '#f1f5f9', fontWeight: 600 }}>
                Verifying Security Clearance...
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Validating cryptographic administrator session
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.92rem', color: '#f87171', fontWeight: 600 }}>
                {errorMessage || 'Access Denied: Admin Login Required'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Redirecting you to the secure login gateway...
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Link
          href={`/admin/login?redirect=${encodeURIComponent(pathname || '/admin')}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: '100%',
            padding: '0.85rem 1.25rem',
            borderRadius: '0.65rem',
            background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
            color: '#0a0f1d',
            fontSize: '0.92rem',
            fontWeight: 700,
            textDecoration: 'none',
            letterSpacing: '0.02em',
            boxShadow: '0 6px 20px rgba(212, 175, 55, 0.3)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          🔐 Proceed to Admin Login
        </Link>

        {/* Security Notice */}
        <div
          style={{
            marginTop: '1.25rem',
            fontSize: '0.72rem',
            color: '#64748b',
            lineHeight: 1.4,
          }}
        >
          Protected System. Unauthorized access attempts are monitored and recorded.
        </div>
      </div>
    </div>
  );
}
