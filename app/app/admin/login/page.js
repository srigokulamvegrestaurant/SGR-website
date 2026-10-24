'use client';

// app/admin/login/page.js - Secure OTP-Only Admin Login
// Strictly enforces Passwordless OTP Email Authentication, Rate Limiting, Expiry, and Backend RBAC
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Login.module.css';

export default function AdminLoginPage() {
  const router = useRouter();

  // State Management
  const [step, setStep] = useState(1); // 1 = Email Input, 2 = OTP Verification, 3 = Authenticated Success
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpTicket, setOtpTicket] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);

  // Security Timers
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(300); // 5 minutes
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0); // 30s cooldown
  const [resendsRemaining, setResendsRemaining] = useState(3);
  const [devOtpPreview, setDevOtpPreview] = useState('');
  const [authenticatedUser, setAuthenticatedUser] = useState(null);

  // Ref array for 6 OTP input boxes
  const inputRefs = useRef([]);

  // Check if user already has active session on mount
  useEffect(() => {
    let active = true;
    const checkExistingSession = async () => {
      try {
        const localToken = typeof window !== 'undefined' ? localStorage.getItem('sgr_admin_session') : null;
        const res = await fetch('/api/auth/session', {
          headers: localToken ? { Authorization: `Bearer ${localToken}` } : {},
        });
        const data = await res.json();
        if (active && data.authenticated && data.user) {
          setAuthenticatedUser(data.user);
          setStep(3);
          setTimeout(() => {
            router.push('/admin?tab=overview');
          }, 1200);
        }
      } catch (e) {
        // No active session, stay on login page
      }
    };
    checkExistingSession();
    return () => { active = false; };
  }, [router]);

  // Expiry Countdown Timer (5 Minutes)
  useEffect(() => {
    let timer = null;
    if (step === 2 && otpExpirySeconds > 0) {
      timer = setInterval(() => {
        setOtpExpirySeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, otpExpirySeconds]);

  // Resend Cooldown Countdown (30 Seconds)
  useEffect(() => {
    let cdTimer = null;
    if (resendCooldownSeconds > 0) {
      cdTimer = setInterval(() => {
        setResendCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => {
      if (cdTimer) clearInterval(cdTimer);
    };
  }, [resendCooldownSeconds]);

  // Format seconds into MM:SS
  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 1: REQUEST OTP
  // ──────────────────────────────────────────────────────────────────────────
  const handleRequestOtp = async (targetEmail = email) => {
    const cleanEmail = (targetEmail || '').trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your authorized administrator email address.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REQUEST_OTP',
          email: cleanEmail,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setEmail(cleanEmail);
        setStep(2);
        setOtpExpirySeconds(data.expiresInSeconds || 300);
        setResendCooldownSeconds(30);
        setResendsRemaining(data.resendsRemaining !== undefined ? data.resendsRemaining : 2);
        setDevOtpPreview(data.devOtp || '');
        setOtpDigits(['', '', '', '', '', '']);
        setSuccessMsg(data.message || `One-time code dispatched to ${cleanEmail}`);
        if (data.otpTicket) {
          setOtpTicket(data.otpTicket);
          try {
            sessionStorage.setItem('sgr_otp_ticket', data.otpTicket);
          } catch (e) {}
        }
        
        // Auto-focus first digit after transition
        setTimeout(() => {
          if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
          }
        }, 150);
      } else {
        setErrorMsg(data.error || 'Failed to dispatch verification code.');
        if (data.isLocked) {
          setIsLocked(true);
        }
        if (data.cooldownRemaining) {
          setResendCooldownSeconds(data.cooldownRemaining);
        }
      }
    } catch (err) {
      console.error('Request OTP network error:', err);
      setErrorMsg('Network error connecting to Sri Gokulam auth engine. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 2: VERIFY OTP
  // ──────────────────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (codeOverride = null) => {
    const fullCode = codeOverride || otpDigits.join('').trim();
    if (fullCode.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const savedTicket = otpTicket || (typeof window !== 'undefined' ? sessionStorage.getItem('sgr_otp_ticket') : '');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY_OTP',
          email: email.trim().toLowerCase(),
          otp: fullCode,
          otpTicket: savedTicket || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        try {
          sessionStorage.removeItem('sgr_otp_ticket');
        } catch (e) {}

        // Persist session token and user info
        if (data.sessionToken) {
          localStorage.setItem('sgr_admin_session', data.sessionToken);
        }
        if (data.user) {
          localStorage.setItem('sgr_admin_user', JSON.stringify(data.user));
          setAuthenticatedUser(data.user);
        }

        setStep(3);
        setSuccessMsg(data.message || 'Authentication successful! Loading admin workspace...');

        // Smooth redirect to admin console
        setTimeout(() => {
          router.push('/admin?tab=overview');
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Invalid or expired verification code.');
        if (data.isLocked) {
          setIsLocked(true);
        }
        if (data.attemptsRemaining !== undefined) {
          setAttemptsRemaining(data.attemptsRemaining);
        }
      }
    } catch (err) {
      console.error('Verify OTP network error:', err);
      setErrorMsg('Network error verifying one-time code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 6-DIGIT INPUT HANDLERS (AUTO-FOCUS, BACKSPACE, PASTE)
  // ──────────────────────────────────────────────────────────────────────────
  const handleDigitChange = (index, value) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      // Pasted multiple digits into single input
      handlePastedCode(cleaned);
      return;
    }

    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    // Auto-advance to next box if digit entered
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits are complete
    if (cleaned && index === 5 && newDigits.every((d) => d !== '')) {
      handleVerifyOtp(newDigits.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Move back to previous box and clear
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePastedCode = (pastedText) => {
    const digitsOnly = pastedText.replace(/\D/g, '').slice(0, 6);
    if (!digitsOnly) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < digitsOnly.length; i++) {
      newDigits[i] = digitsOnly[i];
    }
    setOtpDigits(newDigits);

    // Focus last filled box or next empty box
    const nextIdx = Math.min(digitsOnly.length, 5);
    inputRefs.current[nextIdx]?.focus();

    // Auto-verify if all 6 digits pasted
    if (digitsOnly.length === 6) {
      handleVerifyOtp(digitsOnly);
    }
  };

  // Quick auto-fill helper for developer preview
  const handleAutoFillDevOtp = () => {
    if (!devOtpPreview) return;
    handlePastedCode(devOtpPreview);
  };

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginCard}>
        {/* Brand Header */}
        <div className={styles.headerSection}>
          <div className={styles.logoBadge}>
            <img
              src="/restaurant_logo.jpg"
              alt="Sri Gokulam Veg Restaurant Logo"
              className={styles.logoImg}
            />
          </div>
          <h1 className={styles.titleMain}>
            SRI GOKULAM
            <span style={{ color: '#f59e0b', fontSize: '1.25rem' }}>ADMIN</span>
          </h1>
          <p className={styles.titleSubtitle}>
            Chettinad Sattvic Culinary Heritage • Enterprise Back-Office Portal
          </p>
          <div className={styles.policyPill}>
            <span>🔒</span>
            <span>OTP Email Auth Only • No Passwords</span>
          </div>
        </div>

        {/* Dynamic Alerts */}
        {errorMsg && (
          <div className={`${styles.alertBox} ${styles.alertError}`}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <div>
              <strong>Authentication Error</strong>
              <div>{errorMsg}</div>
              {attemptsRemaining !== null && attemptsRemaining > 0 && (
                <div style={{ marginTop: '0.25rem', fontWeight: 700 }}>
                  Security Notice: {attemptsRemaining} attempt(s) remaining before account lockout.
                </div>
              )}
            </div>
          </div>
        )}

        {isLocked && (
          <div className={`${styles.alertBox} ${styles.alertError}`} style={{ border: '2px solid #ef4444' }}>
            <span style={{ fontSize: '1.4rem' }}>🚨</span>
            <div>
              <strong style={{ color: '#ef4444' }}>ACCOUNT TEMPORARILY LOCKED</strong>
              <div>
                Five consecutive invalid attempts were detected. For security protection, login for this email has been locked for 15 minutes.
              </div>
            </div>
          </div>
        )}

        {successMsg && !errorMsg && step !== 3 && (
          <div className={`${styles.alertBox} ${styles.alertSuccess}`}>
            <span style={{ fontSize: '1.2rem' }}>✓</span>
            <div>{successMsg}</div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 1: EMAIL ENTRY WITH QUICK PRESET SELECTORS
           ══════════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRequestOtp();
              }}
            >
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Registered Administrator Email <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>📧</span>
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="Enter registered email address"
                    className={styles.input}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || isLocked}
                  />
                </div>
              </div>

              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={loading || isLocked || !email.trim()}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner}></span>
                    <span>Dispatching OTP Code...</span>
                  </>
                ) : (
                  <>
                    <span>📨</span>
                    <span>Send One-Time Passcode (OTP)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 2: 6-DIGIT OTP VERIFICATION
           ══════════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div>
            {/* Target Email Banner */}
            <div className={styles.targetEmailBadge}>
              <div className={styles.targetEmailText}>
                <span>📬</span>
                <span style={{ fontWeight: 600 }}>{email}</span>
              </div>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  setStep(1);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
              >
                Change
              </button>
            </div>

            {/* Development Mode Security Preview */}
            {devOtpPreview && (
              <div className={styles.devOtpBanner}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🔐</span>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#c084fc', textTransform: 'uppercase', fontWeight: 800 }}>
                      Dev OTP Preview
                    </span>
                    <div className={styles.devOtpCode}>{devOtpPreview}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={handleAutoFillDevOtp}
                  style={{ background: 'rgba(124, 58, 237, 0.3)', borderColor: '#a855f7', color: '#ffffff' }}
                >
                  ⚡ Auto-Fill
                </button>
              </div>
            )}

            <label className={styles.label} style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              Enter 6-Digit Verification Code
            </label>

            {/* 6-Digit Segmented Box Grid */}
            <div
              className={styles.otpBoxGrid}
              onPaste={(e) => {
                e.preventDefault();
                const pasted = e.clipboardData.getData('text');
                handlePastedCode(pasted);
              }}
            >
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className={`${styles.otpDigitInput} ${digit ? styles.filled : ''}`}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={loading || isLocked}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {/* Timers & Resend Controls */}
            <div className={styles.otpMetaRow}>
              {/* Expiry Timer */}
              <div className={styles.timerBadge}>
                <span>⏳</span>
                <span>Code Expires In:</span>
                <strong className={otpExpirySeconds < 60 ? styles.timerUrgent : styles.timerNormal}>
                  {formatTimer(otpExpirySeconds)}
                </strong>
              </div>

              {/* Resend Action */}
              <div>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => handleRequestOtp(email)}
                  disabled={loading || resendCooldownSeconds > 0 || resendsRemaining <= 0 || isLocked}
                  title={resendsRemaining <= 0 ? 'Resend limit reached for current window' : 'Request fresh code'}
                >
                  {resendCooldownSeconds > 0 ? (
                    `Resend in ${resendCooldownSeconds}s`
                  ) : resendsRemaining <= 0 ? (
                    'Limit Reached (Wait 10m)'
                  ) : (
                    `Resend OTP (${resendsRemaining}/3)`
                  )}
                </button>
              </div>
            </div>

            {/* Submit Verification */}
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => handleVerifyOtp()}
              disabled={loading || isLocked || otpDigits.some((d) => d === '')}
            >
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  <span>Verifying Passcode...</span>
                </>
              ) : (
                <>
                  <span>🔐</span>
                  <span>Verify &amp; Sign In</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 3: AUTHENTICATED SUCCESS CELEBRATION
           ══════════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className={styles.successCard}>
            <div className={styles.successIcon}>✓</div>
            <h2 className={styles.successTitle}>Authentication Verified</h2>
            <p className={styles.successDesc}>
              Welcome back, <strong>{authenticatedUser?.fullName || 'Administrator'}</strong>! Your secure session has been established.
            </p>

            <div className={styles.successBadgeWrap}>
              <span>🛡️</span>
              <span>Role: {authenticatedUser?.role}</span>
              {authenticatedUser?.isProtected && (
                <span style={{ fontSize: '0.72rem', background: 'rgba(168, 85, 247, 0.3)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>
                  PROTECTED ROOT
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#a1a1aa', fontSize: '0.85rem' }}>
              <span className={styles.spinner}></span>
              <span>Redirecting to Sri Gokulam Admin Workspace...</span>
            </div>
          </div>
        )}

        {/* Footer Guarantee */}
        <div className={styles.footerSection}>
          <div className={styles.footerGuarantees}>
            <span>🛡️ 256-bit Session Token</span>
            <span>⏳ 5m OTP Expiry</span>
            <span>🔒 Anti-Brute Force Lockout</span>
            <span>⚡ Strict Backend RBAC</span>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <Link href="/" className={styles.backLink}>
              ← Back to Customer Website
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
