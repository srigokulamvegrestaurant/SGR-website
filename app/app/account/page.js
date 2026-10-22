'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';
import TableReservationModal from '../components/TableReservationModal';

export default function CustomerAccountPage() {
  const [token, setToken] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'history' | 'bills' | 'profile'
  const [activeOrders, setActiveOrders] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [bills, setBills] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSlip, setSelectedSlip] = useState(null);

  // Profile Edit State
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [dietary, setDietary] = useState({ isVeg: true, isJain: false, isVegan: false, isGlutenFree: false });
  const [profileSaved, setProfileSaved] = useState(false);

  // Inline Login State (when unauthenticated)
  const [authPhone, setAuthPhone] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authStep, setAuthStep] = useState('PHONE'); // 'PHONE' | 'EMAIL_REQUIRED' | 'REGISTER' | 'OTP'
  const [maskedEmail, setMaskedEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');

  // 1. Initial Load of Token from LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('sgr_customer_token');
      const storedCustomer = localStorage.getItem('sgr_customer_data');
      if (storedToken) {
        setToken(storedToken);
        if (storedCustomer) {
          try {
            const parsed = JSON.parse(storedCustomer);
            setCustomer(parsed);
            setProfileName(parsed.name || '');
            setProfileEmail(parsed.email || '');
            setDietary(parsed.dietaryPreferences || { isVeg: true, isJain: false, isVegan: false, isGlutenFree: false });
          } catch (e) { /* ignore */ }
        }
      } else {
        setLoading(false);
      }
    }
  }, []);

  // 2. Fetch Customer Data, Orders & Bills
  const fetchCustomerData = useCallback(async (authToken) => {
    const t = authToken || token;
    if (!t) return;
    try {
      const res = await fetch('/api/customer/orders', {
        headers: { Authorization: `Bearer ${t}` },
        cache: 'no-store',
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setCustomer(data.customer);
        setActiveOrders(data.activeOrders || []);
        setPastOrders(data.pastOrders || []);
        setBills(data.bills || []);
        setReservations(data.reservations || []);
        setProfileName(data.customer.name || '');
        setProfileEmail(data.customer.email || '');
        if (data.customer.dietaryPreferences) {
          setDietary(data.customer.dietaryPreferences);
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('sgr_customer_data', JSON.stringify(data.customer));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('sgr_customer_auth_change', { detail: data.customer }));
        }

        // If there are no active cooking orders right now, default to showing order history so user immediately sees their past dining records
        if ((data.activeOrders || []).length === 0 && (data.pastOrders || []).length > 0) {
          setActiveTab((prev) => (prev === 'live' ? 'history' : prev));
        }
      } else {
        // Token invalid or expired
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sgr_customer_token');
          localStorage.removeItem('sgr_customer_data');
        }
        setToken(null);
        setCustomer(null);
      }
    } catch (err) {
      console.error('Failed to load customer orders:', err);
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchCustomerData(token);
      // Auto-poll active orders every 4 seconds
      const timer = setInterval(() => fetchCustomerData(token), 4000);
      return () => clearInterval(timer);
    }
  }, [token, fetchCustomerData]);

  // Handle Logout
  const handleSignOut = async () => {
    try {
      if (token) {
        await fetch('/api/customer/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'LOGOUT', token }),
        });
      }
    } catch (e) { /* ignore */ }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sgr_customer_token');
      localStorage.removeItem('sgr_customer_data');
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('sgr_customer_auth_change', { detail: null }));
    }
    setToken(null);
    setCustomer(null);
    setActiveOrders([]);
    setPastOrders([]);
    setBills([]);
    setReservations([]);
  };

  // Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileName.trim(),
          email: profileEmail.trim(),
          dietaryPreferences: dietary,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomer(data.customer);
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      } else {
        alert(data.error || 'Failed to update profile');
      }
    } catch (err) {
      alert('Error updating profile');
    }
  };



  // ──────────────────────────────────────────────────────────────────────────
  // INLINE LOGIN FLOW (IF GUEST ACCESSES /account WITHOUT ACTIVE SESSION)
  // ──────────────────────────────────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthInfo('');

    const clean = authPhone.replace(/[^\d]/g, '');
    if (clean.length < 10) {
      setAuthError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REQUEST_OTP',
          phone: clean,
          email: authEmail.trim(),
          name: authName.trim(),
        }),
      });
      const data = await res.json();
      setAuthLoading(false);

      if (!res.ok || !data.success) {
        if (data.notFound) {
          setAuthStep('REGISTER');
          setAuthInfo(data.message || 'No account found. You can register now!');
          return;
        }
        setAuthError(data.error || 'Failed to request OTP');
        return;
      }

      if (data.needsEmail) {
        setAuthStep('EMAIL_REQUIRED');
        setAuthName(data.customerName || '');
        setAuthInfo(data.message || 'Please link your email address to receive your OTP.');
        return;
      }

      setMaskedEmail(data.maskedEmail);
      setAuthStep('OTP');
      setAuthInfo(`A 6-digit verification code has been dispatched to ${data.maskedEmail}.`);
    } catch (err) {
      setAuthLoading(false);
      setAuthError('Network error. Please try again.');
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    if (!authOtp || authOtp.trim().length !== 6) {
      setAuthError('Please enter the 6-digit OTP code.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY_OTP',
          phone: authPhone.replace(/[^\d]/g, ''),
          otp: authOtp.trim(),
        }),
      });
      const data = await res.json();
      setAuthLoading(false);

      if (!res.ok || !data.success) {
        setAuthError(data.error || 'Invalid verification code.');
        return;
      }

      // Success!
      localStorage.setItem('sgr_customer_token', data.token);
      localStorage.setItem('sgr_customer_data', JSON.stringify(data.customer));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('sgr_customer_auth_change', { detail: data.customer }));
      setToken(data.token);
      setCustomer(data.customer);
      fetchCustomerData(data.token);
    } catch (err) {
      setAuthLoading(false);
      setAuthError('Verification error.');
    }
  };

  // Render Login Form if Unauthenticated
  if (!token && !loading) {
    return (
      <div className={styles.pageWrapper}>
        <header className={styles.topBar}>
          <div className={styles.topBarInner}>
            <a href="/" className={styles.brandGroup}>
              <img src="/restaurant_logo.jpg" alt="Logo" className={styles.brandLogo} />
              <div>
                <div className={styles.brandTitle}>SRI GOKULAM</div>
                <div className={styles.brandSubtitle}>VEG RESTAURANT • KARAIKUDI</div>
              </div>
            </a>
            <a href="/" className={styles.btnSecondary}>
              ← Back to Dining Menu
            </a>
          </div>
        </header>

        <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px', width: '100%' }}>
          <div style={{ background: '#ffffff', borderRadius: 20, padding: 32, boxShadow: '0 20px 40px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <span style={{ fontSize: '2.5rem' }}>🔐</span>
              <h2 style={{ margin: '8px 0 4px', fontSize: '1.4rem', fontWeight: 800 }}>Customer Portal</h2>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
                Track live orders, view thermal bills &amp; manage your profile
              </p>
            </div>

            {authError && <div style={{ background: '#fef2f2', color: '#991b1b', padding: 12, borderRadius: 8, fontSize: '0.88rem', marginBottom: 16 }}>{authError}</div>}
            {authInfo && <div style={{ background: '#eff6ff', color: '#1e40af', padding: 12, borderRadius: 8, fontSize: '0.88rem', marginBottom: 16 }}>{authInfo}</div>}

            {authStep === 'PHONE' && (
              <form onSubmit={handleRequestOtp}>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, marginBottom: 6 }}>
                  Registered Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 98401 23456"
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  className={styles.inputField}
                  style={{ marginBottom: 16 }}
                />
                <button type="submit" disabled={authLoading} className={styles.ctaBtn} style={{ width: '100%' }}>
                  {authLoading ? 'Verifying...' : 'Sign in with OTP ➔'}
                </button>
              </form>
            )}

            {authStep === 'EMAIL_REQUIRED' && (
              <form onSubmit={handleRequestOtp}>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, marginBottom: 6 }}>
                  Enter Your Email for OTP
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. yourname@gmail.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className={styles.inputField}
                  style={{ marginBottom: 16 }}
                />
                <button type="submit" disabled={authLoading} className={styles.ctaBtn} style={{ width: '100%' }}>
                  {authLoading ? 'Sending OTP...' : 'Send OTP to Email ➔'}
                </button>
              </form>
            )}

            {authStep === 'REGISTER' && (
              <form onSubmit={handleRequestOtp}>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, marginBottom: 6 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sundaram Chettiar"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className={styles.inputField}
                  style={{ marginBottom: 12 }}
                />
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, marginBottom: 6 }}>
                  Email Address (For Verification Code)
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sundar@gmail.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className={styles.inputField}
                  style={{ marginBottom: 16 }}
                />
                <button type="submit" disabled={authLoading} className={styles.ctaBtn} style={{ width: '100%' }}>
                  {authLoading ? 'Registering...' : 'Register & Receive OTP ➔'}
                </button>
              </form>
            )}

            {authStep === 'OTP' && (
              <form onSubmit={handleVerifyOtp}>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>
                  Enter 6-Digit Code sent to {maskedEmail}
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={authOtp}
                  onChange={(e) => setAuthOtp(e.target.value.replace(/[^\d]/g, ''))}
                  style={{
                    width: '100%',
                    padding: 14,
                    textAlign: 'center',
                    fontSize: '1.6rem',
                    letterSpacing: '0.5em',
                    fontFamily: 'monospace',
                    borderRadius: 10,
                    border: '2px solid #cbd5e1',
                    marginBottom: 16,
                  }}
                />
                <button type="submit" disabled={authLoading} className={styles.ctaBtn} style={{ width: '100%' }}>
                  {authLoading ? 'Verifying...' : 'Verify & Enter Dashboard ➔'}
                </button>
              </form>
            )}

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
              💡 Guest ordering is always enabled! Accounts are automatically created when you place an order with your mobile number.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <a href="/" className={styles.brandGroup}>
            <img src="/restaurant_logo.jpg" alt="Logo" className={styles.brandLogo} />
            <div>
              <div className={styles.brandTitle}>SRI GOKULAM</div>
              <div className={styles.brandSubtitle}>VEG RESTAURANT • KARAIKUDI</div>
            </div>
          </a>

          <div className={styles.topBarActions}>
            <a href="/" className={styles.btnSecondary}>
              🍽️ Order Food / Menu
            </a>
            <button onClick={handleSignOut} className={styles.btnSignOut}>
              Sign Out ⎋
            </button>
          </div>
        </div>
      </header>

      {/* Hero Profile Banner */}
      <section className={styles.profileHero}>
        <div className={styles.heroInner}>
          <div className={styles.customerInfo}>
            <div className={styles.avatar}>
              {(customer?.name || 'G')[0].toUpperCase()}
            </div>
            <div className={styles.nameBlock}>
              <h1>வணக்கம், {customer?.name || 'Valued Diner'}!</h1>
              <div className={styles.contactRow}>
                <span>📱 {customer?.phone || ''}</span>
                {customer?.email && <span>✉️ {customer.email}</span>}
                <span>📦 {customer?.totalOrders || pastOrders.length} Lifetime Orders</span>
              </div>
            </div>
          </div>

          <div className={styles.loyaltyBadge}>
            <div className={styles.loyaltyPoints}>{customer?.loyaltyPoints || 0}</div>
            <div className={styles.loyaltyLabel}>Gokulam Reward Coins</div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabsInner}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'live' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('live')}
          >
            🔥 Live Orders{' '}
            {activeOrders.length > 0 && <span className={styles.badgePill}>{activeOrders.length}</span>}
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📜 Order History ({pastOrders.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'bills' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('bills')}
          >
            🧾 Bills &amp; Tax Receipts ({bills.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'reservations' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('reservations')}
          >
            📅 Table Bookings ({reservations.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile &amp; Dietary
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className={styles.dashboardMain}>
        {/* ==========================================================
            TAB 1: LIVE ORDERS & KITCHEN TRACKING
            ========================================================== */}
        {activeTab === 'live' && (
          <div>
            <div className={styles.sectionHeader}>
              <h2>Active Orders &amp; Live Kitchen Status</h2>
              <p>Real-time cooking progress and KOT verification status</p>
            </div>

            {activeOrders.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🍽️</div>
                <h3>No Active Orders Right Now</h3>
                <p>Craving hot Ghee Podi Roast, crispy Medhu Vadai, or Degree Coffee?</p>
                <a href="/" className={styles.ctaBtn}>
                  Browse Today's Specials ➔
                </a>
              </div>
            ) : (
              activeOrders.map((ord) => {
                const st = (ord.status || '').toLowerCase();
                const isPendingOtp = st === 'pending_otp' || st === 'otp_pending';
                const isCooking = st === 'cooking' || st === 'confirmed' || st === 'in_kitchen' || st === 'new';
                const isPlating = st === 'plating';
                const isServed = st === 'served' || st === 'completed';

                return (
                  <div key={ord.id || ord.orderId} className={styles.liveOrderCard}>
                    <div className={styles.orderCardTop}>
                      <div>
                        <div className={styles.orderIdBadge}>
                          Ticket #{ord.id || ord.orderId} •{' '}
                          {ord.tables && ord.tables.length > 0
                            ? `Table #${ord.tables.join(' & #')}`
                            : 'Takeaway Parcel'}
                        </div>
                        <div className={styles.orderMetaSub}>
                          Placed at {ord.placedAt || 'Just now'} • Est. Prep Time: {ord.prepTimeMinutes || 12} mins
                        </div>
                      </div>

                      {ord.otp && (
                        <div className={styles.otpHighlight}>
                          <small>VERIFICATION OTP</small>
                          <strong>{ord.otp}</strong>
                          <small>{isPendingOtp ? 'Tell your Waiter' : 'Verified by Kitchen'}</small>
                        </div>
                      )}
                    </div>

                    {/* Step Tracker */}
                    <div className={styles.trackerSteps}>
                      <div className={styles.trackerStep}>
                        <div className={`${styles.stepCircle} ${styles.stepCircleDone}`}>✓</div>
                        <span className={styles.stepLabel}>Order Placed</span>
                      </div>
                      <div className={styles.trackerStep}>
                        <div
                          className={`${styles.stepCircle} ${
                            !isPendingOtp ? styles.stepCircleDone : styles.stepCircleActive
                          }`}
                        >
                          {!isPendingOtp ? '✓' : '2'}
                        </div>
                        <span className={`${styles.stepLabel} ${isPendingOtp ? styles.stepLabelActive : ''}`}>
                          {isPendingOtp ? 'OTP Pending' : 'Confirmed'}
                        </span>
                      </div>
                      <div className={styles.trackerStep}>
                        <div
                          className={`${styles.stepCircle} ${
                            isCooking
                              ? styles.stepCircleActive
                              : isPlating || isServed
                              ? styles.stepCircleDone
                              : ''
                          }`}
                        >
                          {isPlating || isServed ? '✓' : '🔥'}
                        </div>
                        <span className={`${styles.stepLabel} ${isCooking ? styles.stepLabelActive : ''}`}>
                          Cooking in Kitchen
                        </span>
                      </div>
                      <div className={styles.trackerStep}>
                        <div
                          className={`${styles.stepCircle} ${
                            isPlating
                              ? styles.stepCircleActive
                              : isServed
                              ? styles.stepCircleDone
                              : ''
                          }`}
                        >
                          {isServed ? '✓' : '4'}
                        </div>
                        <span className={`${styles.stepLabel} ${isPlating ? styles.stepLabelActive : ''}`}>
                          Plating / Check
                        </span>
                      </div>
                      <div className={styles.trackerStep}>
                        <div className={`${styles.stepCircle} ${isServed ? styles.stepCircleDone : ''}`}>
                          🏁
                        </div>
                        <span className={`${styles.stepLabel} ${isServed ? styles.stepLabelActive : ''}`}>
                          Served / Ready
                        </span>
                      </div>
                    </div>

                    {/* Ordered Items */}
                    <div className={styles.orderItemsList}>
                      {(ord.items || []).map((it, idx) => (
                        <div key={idx} className={styles.orderItemRow}>
                          <span>
                            <strong>{it.quantity}x</strong> {it.title}
                          </span>
                          <span>₹{(Number(it.price) || 0) * (Number(it.quantity) || 1)}</span>
                        </div>
                      ))}
                      <div className={styles.orderTotalRow}>
                        <span>Total (incl. 5% GST):</span>
                        <span style={{ color: '#d97706' }}>₹{ord.totalAmount}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ==========================================================
            TAB 2: ORDER HISTORY
            ========================================================== */}
        {activeTab === 'history' && (
          <div>
            <div className={styles.sectionHeader}>
              <h2>Your Order History</h2>
              <p>Past dining sessions and takeaway parcels</p>
            </div>

            {pastOrders.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📜</div>
                <h3>No Past Orders Found</h3>
                <p>When you dine at Sri Gokulam, all your orders will be neatly archived here.</p>
              </div>
            ) : (
              <div className={styles.historyGrid}>
                {pastOrders.map((ord) => (
                  <div key={ord.id || ord.orderId} className={styles.historyCard}>
                    <div>
                      <div className={styles.cardHeader}>
                        <div>
                          <div className={styles.cardTitle}>
                            Order #{ord.id || ord.orderId}
                          </div>
                          <div className={styles.cardDate}>
                            {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'} •{' '}
                            {ord.tables && ord.tables.length > 0 ? `Table #${ord.tables.join(' & #')}` : 'Takeaway'}
                          </div>
                        </div>
                        <span className={`${styles.statusPill} ${styles.statusSuccess}`}>
                          Completed
                        </span>
                      </div>

                      <div style={{ fontSize: '0.88rem', color: '#475569', margin: '12px 0' }}>
                        {(ord.items || []).map((it, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                            <span>{it.quantity}x {it.title}</span>
                            <span>₹{it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={styles.cardFooter}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>TOTAL PAID</div>
                        <div className={styles.cardTotal}>₹{ord.totalAmount}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==========================================================
            TAB 3: BILLS & TAX RECEIPTS
            ========================================================== */}
        {activeTab === 'bills' && (
          <div>
            <div className={styles.sectionHeader}>
              <h2>Official Bills &amp; Tax Receipts</h2>
              <p>Download and print bilingual thermal bill slips &amp; GST tax invoices</p>
            </div>

            {bills.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🧾</div>
                <h3>No Receipts on File Yet</h3>
                <p>Every genuine bill generated at our billing counter or tables will appear here.</p>
              </div>
            ) : (
              <div className={styles.historyGrid}>
                {bills.map((bill) => (
                  <div key={bill.billNumber || bill.id} className={styles.historyCard}>
                    <div>
                      <div className={styles.cardHeader}>
                        <div>
                          <div className={styles.cardTitle}>Bill #{bill.billNumber}</div>
                          <div className={styles.cardDate}>
                            {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </div>
                        </div>
                        <span className={`${styles.statusPill} ${styles.statusSuccess}`}>
                          PAID ({bill.paymentMode || 'UPI'})
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#64748b', margin: '10px 0' }}>
                        <div>Dine-In: {bill.tableNumber === 'TK' ? 'Takeaway' : `Table #${bill.tableNumber}`}</div>
                        <div>CGST (2.5%): ₹{bill.cgst || 0} • SGST (2.5%): ₹{bill.sgst || 0}</div>
                        {bill.discountAmount > 0 && <div style={{ color: '#16a34a' }}>Discount Applied: -₹{bill.discountAmount}</div>}
                      </div>
                    </div>

                    <div className={styles.cardFooter}>
                      <div className={styles.cardTotal}>₹{bill.totalAmount}</div>
                      <button
                        onClick={() => setSelectedSlip(bill)}
                        className={styles.btnViewSlip}
                      >
                        📄 View Thermal Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==========================================================
            TAB: TABLE RESERVATIONS
            ========================================================== */}
        {activeTab === 'reservations' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div className={styles.sectionHeader} style={{ margin: 0 }}>
                <h2>Your Table Reservations</h2>
                <p>Confirmed dining tables and Chettinad feast reservations</p>
              </div>
              <button onClick={() => setShowReservationModal(true)} className={styles.ctaBtn}>
                ➕ Book a Table
              </button>
            </div>

            {reservations.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📅</div>
                <h3>No Table Bookings Found</h3>
                <p>Reserve a table in advance for traditional banana leaf feast or family dining.</p>
                <button onClick={() => setShowReservationModal(true)} className={styles.ctaBtn}>
                  Book a Table Now ➔
                </button>
              </div>
            ) : (
              <div className={styles.historyGrid}>
                {reservations.map((res) => (
                  <div key={res.id} className={styles.historyCard}>
                    <div>
                      <div className={styles.cardHeader}>
                        <div>
                          <div className={styles.cardTitle}>
                            Table #{res.tableNumber} ({res.section || 'AC Hall'})
                          </div>
                          <div className={styles.cardDate}>
                            {res.date} • {res.timeSlot}
                          </div>
                        </div>
                        <span className={`${styles.statusPill} ${styles.statusSuccess}`}>
                          {res.status || 'CONFIRMED'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.88rem', color: '#475569', margin: '14px 0' }}>
                        <div style={{ marginBottom: 4 }}>
                          👥 <strong>{res.partySize} Guests</strong> • For: {res.guestName}
                        </div>
                        {res.specialRequests && (
                          <div style={{ marginTop: 6, fontStyle: 'italic', color: '#b45309', background: '#fef3c7', padding: '6px 10px', borderRadius: 8 }}>
                            💬 "{res.specialRequests}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.cardFooter}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Ref #{res.id?.slice(-8).toUpperCase()}
                      </div>
                      <a href="tel:+919876543210" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d97706', textDecoration: 'none' }}>
                        📞 Modify / Call
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==========================================================
            TAB 4: PROFILE & PREFERENCES
            ========================================================== */}
        {activeTab === 'profile' && (
          <div>
            <div className={styles.sectionHeader}>
              <h2>Your Profile &amp; Dietary Preferences</h2>
              <p>Manage your contact info, email for digital bills, and custom dietary needs</p>
            </div>

            <div className={styles.profileCard}>
              {profileSaved && (
                <div style={{ background: '#f0fdf4', color: '#166534', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  ✓ Profile settings saved successfully!
                </div>
              )}

              <form onSubmit={handleSaveProfile}>
                <div className={styles.formGrid}>
                  <div>
                    <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>Full Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className={styles.inputField}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>
                      Registered Mobile (Cannot Be Changed)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={customer?.phone || ''}
                      className={styles.inputField}
                      style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>
                    Email Address (For Login OTP &amp; E-Receipts)
                  </label>
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className={styles.inputField}
                  />
                </div>

                <div className={styles.dietaryChecks}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                    🥗 Sattvic &amp; Dietary Preferences
                  </div>

                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={dietary.isVeg}
                      disabled
                    />
                    <span>100% Pure Vegetarian (Standard at Sri Gokulam)</span>
                  </label>

                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={dietary.isJain}
                      onChange={(e) => setDietary({ ...dietary, isJain: e.target.checked })}
                    />
                    <span>Jain Preparation Preferred (No Onion, No Garlic, No Root Veg)</span>
                  </label>

                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={dietary.isVegan}
                      onChange={(e) => setDietary({ ...dietary, isVegan: e.target.checked })}
                    />
                    <span>Vegan Friendly (Strictly No Dairy Ghee / Paneer / Curd)</span>
                  </label>

                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={dietary.isGlutenFree}
                      onChange={(e) => setDietary({ ...dietary, isGlutenFree: e.target.checked })}
                    />
                    <span>Gluten Sensitive (Highlight Rice &amp; Lentil Items Only)</span>
                  </label>
                </div>

                <button type="submit" className={styles.ctaBtn} style={{ marginTop: 24 }}>
                  Save Profile Changes
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ==========================================================
          THERMAL BILL SLIP MODAL
          ========================================================== */}
      {selectedSlip && (
        <div className={styles.slipModalOverlay} onClick={() => setSelectedSlip(null)}>
          <div className={styles.slipCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.slipHeader}>
              <strong>🧾 Digital Bill Slip #{selectedSlip.billNumber}</strong>
              <button
                onClick={() => setSelectedSlip(null)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className={styles.slipBody}>
              <pre className={styles.thermalPaper}>
                {selectedSlip.thermalSlip || `
========================================
       SRI GOKULAM VEG RESTAURANT
    Pure Vegetarian & Sattvic Cuisine
       Karaikudi - 630001, TN
========================================
Bill No: ${selectedSlip.billNumber}
Date   : ${new Date(selectedSlip.createdAt || Date.now()).toLocaleString('en-IN')}
Dine-In: Table #${selectedSlip.tableNumber}
Customer: ${customer?.name || 'Valued Diner'}
----------------------------------------
ITEM              QTY    PRICE    AMOUNT
----------------------------------------
${(selectedSlip.items || []).map(it => `${(it.title || '').padEnd(16).slice(0, 16)}  ${String(it.quantity).padEnd(3)}   ${String(it.price).padEnd(6)}  ₹${it.quantity * it.price}`).join('\n')}
----------------------------------------
Subtotal                   : ₹${selectedSlip.subtotal || 0}
CGST (2.5%)                : ₹${selectedSlip.cgst || 0}
SGST (2.5%)                : ₹${selectedSlip.sgst || 0}
----------------------------------------
TOTAL PAYABLE              : ₹${selectedSlip.totalAmount}
PAYMENT MODE               : ${selectedSlip.paymentMode || 'PAID'}
========================================
     THANK YOU! VISIT AGAIN
       வாழ்க வளமுடன்!
========================================
`}
              </pre>
            </div>

            <div className={styles.slipFooter}>
              <button
                className={styles.btnPrint}
                onClick={() => window.print()}
              >
                🖨️ Print / Save PDF Receipt
              </button>
              <button
                onClick={() => setSelectedSlip(null)}
                style={{
                  background: '#e2e8f0',
                  color: '#1e293b',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Reservation Modal */}
      <TableReservationModal
        isOpen={showReservationModal}
        onClose={() => setShowReservationModal(false)}
        onReservationConfirmed={() => {
          setShowReservationModal(false);
          if (token) fetchCustomerData(token);
        }}
      />
    </div>
  );
}
