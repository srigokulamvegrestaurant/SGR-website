'use client';

import { useState, useEffect } from 'react';
import styles from './CustomerAuthModal.module.css';

export default function CustomerAuthModal({ isOpen, onClose, onSuccess }) {
  if (!isOpen) return null;
  return <CustomerAuthModalDialog onClose={onClose} onSuccess={onSuccess} />;
}

function CustomerAuthModalDialog({ onClose, onSuccess }) {
  const [step, setStep] = useState('PHONE'); // 'PHONE' | 'EMAIL_REQUIRED' | 'REGISTER' | 'OTP'
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  // Request OTP for entered mobile number
  const handleRequestOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setInfoMessage('');

    const cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REQUEST_OTP',
          phone: cleanPhone,
          email: email.trim(),
          name: name.trim(),
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.success) {
        if (data.notFound) {
          // Customer not found: offer instant registration or remind about guest order auto-creation
          setStep('REGISTER');
          setInfoMessage(
            data.message ||
              'No account found with this number yet. You can register now, or accounts are automatically created when placing an order!'
          );
          return;
        }
        setError(data.error || 'Failed to request OTP. Please try again.');
        return;
      }

      if (data.needsEmail) {
        setStep('EMAIL_REQUIRED');
        setName(data.customerName || '');
        setInfoMessage(data.message || 'Please link your email to receive your OTP.');
        return;
      }

      // OTP sent successfully to registered email
      setMaskedEmail(data.maskedEmail);
      setStep('OTP');
      setResendCooldown(45);
      setInfoMessage(
        `A 6-digit verification code has been sent to your registered email (${data.maskedEmail}).`
      );
    } catch (err) {
      setLoading(false);
      setError('Network error. Please try again.');
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY_OTP',
          phone: phone.replace(/[^\d]/g, ''),
          otp: otp.trim(),
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid verification code.');
        return;
      }

      // Store auth session
      if (typeof window !== 'undefined') {
        localStorage.setItem('sgr_customer_token', data.token);
        localStorage.setItem('sgr_customer_data', JSON.stringify(data.customer));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('sgr_customer_auth_change', { detail: data.customer }));
      }

      if (onSuccess) {
        onSuccess(data.customer);
      }
      onClose();
    } catch (err) {
      setLoading(false);
      setError('Network error during verification.');
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close Modal">
            ✕
          </button>
          <span className={styles.headerIcon}>🔐</span>
          <h2 className={styles.headerTitle}>Sri Gokulam Customer Portal</h2>
          <p className={styles.headerSubtitle}>
            {step === 'OTP'
              ? 'Enter Verification Code'
              : step === 'REGISTER'
              ? 'Quick Customer Registration'
              : 'Sign in with your Registered Mobile'}
          </p>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {error && <div className={`${styles.alertBox} ${styles.alertError}`}>{error}</div>}
          {infoMessage && <div className={`${styles.alertBox} ${styles.alertInfo}`}>{infoMessage}</div>}

          {/* STEP 1: ENTER MOBILE NUMBER */}
          {step === 'PHONE' && (
            <form onSubmit={handleRequestOtp}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Registered Mobile Number</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>📱</span>
                  <input
                    type="tel"
                    required
                    autoFocus
                    placeholder="e.g. 98401 23456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={styles.inputField}
                    maxLength={14}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className={styles.submitBtn}>
                {loading ? 'Checking Account...' : 'Continue with OTP ➔'}
              </button>

              <p className={styles.helperText}>
                🔒 An OTP will be securely dispatched to the email registered with this mobile number.
              </p>
            </form>
          )}

          {/* STEP 1B: LINK EMAIL (IF ACCOUNT EXISTS WITHOUT EMAIL) */}
          {step === 'EMAIL_REQUIRED' && (
            <form onSubmit={handleRequestOtp}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Welcome {name || 'Diner'}! Enter Your Email</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>✉️</span>
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="e.g. yourname@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.inputField}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className={styles.submitBtn}>
                {loading ? 'Dispatching OTP...' : 'Send Verification OTP ➔'}
              </button>

              <p className={styles.helperText}>
                We will send your login OTP code to this email and link it to your account for future logins and digital bills.
              </p>
            </form>
          )}

          {/* STEP 1C: INSTANT REGISTRATION */}
          {step === 'REGISTER' && (
            <form onSubmit={handleRequestOtp}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Full Name</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>👤</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sundaram Chettiar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={styles.inputField}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Mobile Number</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>📱</span>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 98401 23456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={styles.inputField}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email Address (For OTP Verification)</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>✉️</span>
                  <input
                    type="email"
                    required
                    placeholder="e.g. sundar@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.inputField}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className={styles.submitBtn}>
                {loading ? 'Creating Account & Dispatching OTP...' : 'Register & Send OTP ➔'}
              </button>

              <button
                type="button"
                onClick={() => setStep('PHONE')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  marginTop: '10px',
                  width: '100%',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                ← Back to Mobile Sign In
              </button>
            </form>
          )}

          {/* STEP 2: VERIFY OTP */}
          {step === 'OTP' && (
            <form onSubmit={handleVerifyOtp}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Enter 6-Digit Code sent to {maskedEmail || 'your email'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ''))}
                  className={styles.inputOtpField}
                />
                <div className={styles.otpHint}>
                  <span>Didn't receive the code?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleRequestOtp}
                    className={styles.resendBtn}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className={styles.submitBtn}>
                {loading ? 'Verifying...' : 'Verify & Enter Account ➔'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('PHONE');
                  setOtp('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  marginTop: '10px',
                  width: '100%',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                ← Change Mobile Number
              </button>
            </form>
          )}
        </div>

        {/* Footer Note */}
        <div className={styles.guestNote}>
          Guest ordering is always enabled!{' '}
          <strong>Accounts are automatically created</strong> when you place any order or bill with your mobile number.
        </div>
      </div>
    </div>
  );
}
