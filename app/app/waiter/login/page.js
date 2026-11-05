'use client';

// app/app/waiter/login/page.js - Floor Captain & Waiter Login Page
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function WaiterLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. If waiter is already logged in with an active account, redirect immediately to /waiter
  useEffect(() => {
    let mounted = true;
    async function checkExistingSession() {
      try {
        const res = await fetch('/api/waiter/session', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (mounted && data.authenticated && data.waiter?.isActive) {
          router.replace('/waiter');
          return;
        }
      } catch (err) {
        // Not authenticated
      } finally {
        if (mounted) setCheckingSession(false);
      }
    }
    checkExistingSession();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMessage('Please enter your waiter username.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/waiter/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUser,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Login failed. Please check your username and password.');
        setLoading(false);
        return;
      }

      setSuccessMessage(data.message || 'Login successful! Entering Waiter Terminal...');
      
      // Store session info in localStorage for offline/client fallback
      try {
        if (typeof window !== 'undefined' && data.waiter) {
          localStorage.setItem('sgr_waiter_user', JSON.stringify(data.waiter));
          if (data.token) localStorage.setItem('sgr_waiter_token', data.token);
        }
      } catch (e) {
        // Storage access error
      }

      // Smooth redirect to Waiter Dashboard
      setTimeout(() => {
        window.location.href = '/waiter';
      }, 400);
    } catch (err) {
      setErrorMessage('Unable to connect to server. Please check your internet connection.');
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className={styles.loginContainer}>
        <div style={{ textAlign: 'center', color: '#fbbf24' }}>
          <div className={styles.spinner} style={{ margin: '0 auto 1rem auto', width: 32, height: 32, borderWidth: 3 }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Verifying Captain Terminal Session...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        {/* Header / Restaurant Emblem */}
        <div className={styles.brandHeader}>
          <div className={styles.brandLogoWrap}>
            <span>🌿</span>
          </div>
          <h1 className={styles.brandTitle}>ஸ்ரீ கோகுலம்</h1>
          <p className={styles.brandSubtitle}>Sri Gokulam Veg Restaurant</p>
          <div>
            <span className={styles.terminalBadge}>
              <span>🧑‍🍳</span> Floor Captain &amp; Waiter Login
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className={styles.errorAlert} role="alert">
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>⚠️</span>
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className={styles.successAlert} role="status">
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>✅</span>
            <div>{successMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className={styles.loginForm} noValidate>
          {/* Username Input */}
          <div className={styles.inputGroup}>
            <label htmlFor="waiter-username" className={styles.inputLabel}>
              <span>Username / பயனர் பெயர்</span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Issued by Admin</span>
            </label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>👤</span>
              <input
                id="waiter-username"
                type="text"
                className={styles.textInput}
                placeholder="e.g. murugan"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                spellCheck="false"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className={styles.inputGroup}>
            <label htmlFor="waiter-password" className={styles.inputLabel}>
              <span>Password / கடவுச்சொல்</span>
            </label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>🔒</span>
              <input
                id="waiter-password"
                type={showPassword ? 'text' : 'password'}
                className={styles.textInput}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className={styles.togglePasswordBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className={styles.spinner} />
                <span>Logging In...</span>
              </>
            ) : (
              <>
                <span>🚀 Login to Waiter Terminal</span>
              </>
            )}
          </button>
        </form>

        {/* Security & Access Policies */}
        <div className={styles.securityNote}>
          <p className={styles.noteText}>
            🔒 <strong>Staff Restricted Access:</strong> Waiter accounts are created and managed by the Restaurant Admin. Self-registration is not allowed.
          </p>
          <div className={styles.managerContact}>
            Forgot password or need an account? Contact Restaurant Store Manager.
          </div>
        </div>
      </div>
    </div>
  );
}

