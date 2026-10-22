'use client';

import { useState, useEffect } from 'react';
import styles from './KotStatusModal.module.css';

// Sound effect helper
function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {
    // blocked or not supported
  }
}

export default function KotStatusModal({
  isOpen,
  onClose,
  order,
  onOrderMore,
}) {
  const [currentOrder, setCurrentOrder] = useState(order);
  const [stage, setStage] = useState('otp_pending'); // 'otp_pending' | 'cooking' | 'plating' | 'served'
  const [secondsRemaining, setSecondsRemaining] = useState(720); // 12 mins
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [billData, setBillData] = useState(null);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [isPaying, setIsPaying] = useState(false);

  const normStage = (stage || '').toLowerCase();
  const isOtpPending = normStage === 'otp_pending' || normStage === 'pending_otp' || normStage === 'pending';

  // Sync state when new order arrives
  useEffect(() => {
    if (order) {
      setCurrentOrder(order);
      const rawStatus = (order.status || 'otp_pending').toLowerCase();
      const normalizedStatus = (rawStatus === 'pending_otp' || rawStatus === 'pending') ? 'otp_pending' : rawStatus;
      setStage(normalizedStatus);
      setSecondsRemaining(720);
      setBillData(null);
      setPaymentSuccess(null);
    }
  }, [order]);

  // Periodic polling to check if the Waiter verified OTP on the waiter portal
  useEffect(() => {
    if (!isOpen || !currentOrder?.orderId || !isOtpPending) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${currentOrder.orderId}`);
        const data = await res.json();
        if (data.success && data.order) {
          const fetchedStatus = (data.order.status || '').toLowerCase();
          if (fetchedStatus !== 'otp_pending' && fetchedStatus !== 'pending_otp' && fetchedStatus !== 'pending') {
            setCurrentOrder(data.order);
            setStage(fetchedStatus);
            playSuccessChime();
          }
        }
      } catch (err) {
        // silent fallback
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, currentOrder?.orderId, isOtpPending]);

  // Live countdown timer
  useEffect(() => {
    if (!isOpen || isOtpPending) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStage('served');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isOtpPending]);

  if (!isOpen || !currentOrder) return null;

  // Format seconds into MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Waiter verifies OTP via Real Backend API
  const handleVerifyOtp = async () => {
    setVerifying(true);
    try {
      const res = await fetch('/api/orders/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: currentOrder.orderId,
          otp: currentOrder.otp,
          staffName: 'Captain Murugan (Floor Lead)',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

      playSuccessChime();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setStage('cooking');
      setCurrentOrder(data.order);
    } catch (err) {
      alert(`OTP Verification error: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleCallWaiter = async (requestType = 'GENERAL') => {
    setWaiterCalled(true);
    const tbl = currentOrder.tables?.[0] || currentOrder.tableNumber || '07';
    try {
      await fetch('/api/waiter/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: tbl,
          guestName: currentOrder.guestName,
          requestType,
        }),
      });
    } catch {}
    setTimeout(() => setWaiterCalled(false), 5000);
  };

  // Request Final Bill
  const handleRequestBill = async () => {
    setIsBillingLoading(true);
    const tbl = currentOrder.tables?.[0] || currentOrder.tableNumber || '07';
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: tbl,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate bill');
      }
      setBillData(data.bill);
      playSuccessChime();
    } catch (err) {
      alert(`Bill Error: ${err.message}`);
    } finally {
      setIsBillingLoading(false);
    }
  };

  // In-seat UPI Settlement
  const handlePayUpi = async (mode = 'UPI_GPAY') => {
    if (!billData) return;
    setIsPaying(true);
    try {
      const res = await fetch('/api/bills/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billNumber: billData.billNumber,
          settlementMode: mode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payment failed');
      }
      setPaymentSuccess(data.receipt);
      playSuccessChime();
      if (navigator.vibrate) navigator.vibrate([120, 80, 120, 80, 200]);
    } catch (err) {
      alert(`Payment Error: ${err.message}`);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleWrap}>
            <span className={styles.headerIcon}>🧾</span>
            <div>
              <h3 className={styles.headerTitle}>Order Placed &amp; Live KOT</h3>
              <p className={styles.headerSubtitle}>
                {currentOrder.orderId} • Table #{currentOrder.tables.join(' & #')}
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Minimize Tracker">
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className={styles.body}>
          {/* Top Success Banner */}
          <div className={styles.successBanner}>
            <span className={styles.successEmoji}>🎉</span>
            <div>
              <h4>Order Received by Cloud Kitchen API!</h4>
              <p>Welcome, {currentOrder.guestName} ({currentOrder.guestCount} Diners)</p>
            </div>
          </div>

          {/* ==========================================================
             SECTION 1: BIG 4-DIGIT WAITER OTP CARD
             ========================================================== */}
          <div className={styles.otpCard}>
            <div className={styles.otpHeader}>
              <span>🔑</span> WAITER CONFIRMATION OTP
            </div>

            <div className={styles.otpDigitsBox}>
              {currentOrder.otp.split('').map((digit, i) => (
                <div key={i} className={styles.otpDigitItem}>
                  {digit}
                </div>
              ))}
            </div>

            <p className={styles.otpInstructions}>
              👋 A floor waiter / captain is walking to <strong>Table #{currentOrder.tables.join(' & #')}</strong>. Please tell this 4-digit OTP to the waiter to authorize and fire your KOT directly to the kitchen!
            </p>

            {/* Simulated SMS Notice */}
            <div className={styles.smsNotice}>
              <span className={styles.smsIcon}>📱</span>
              <span>
                SMS routed to <strong>{currentOrder.guestPhone || 'Guest Mobile'}</strong>: “Your Sri Gokulam Dine-In OTP is {currentOrder.otp} for Table #{currentOrder.tables.join(' & #')}. Share with waiter.”
              </span>
            </div>

            {/* Interactive Waiter OTP Verification */}
            {isOtpPending ? (
              <button
                className={styles.btnSimulateWaiter}
                onClick={handleVerifyOtp}
                disabled={verifying}
              >
                <span>👨‍🍳</span> {verifying ? 'Verifying with Cloud API...' : `[Simulate Waiter Arrival] Enter OTP ${currentOrder.otp} & Fire KOT`}
              </button>
            ) : (
              <div className={styles.otpVerifiedBanner}>
                <span>✅</span> OTP Verified by {currentOrder.verifiedBy || 'Floor Captain Murugan'}! KOT Fired to Kitchen.
              </div>
            )}
          </div>

          {/* ==========================================================
             SECTION 2: LIVE KITCHEN COOKING TIME & TRACKER
             ========================================================== */}
          <div className={styles.kitchenTimerCard}>
            <div className={styles.timerHeader}>
              <div className={styles.timerTitleWrap}>
                <span className={styles.flameIcon}>🔥</span>
                <strong>Live Kitchen Preparation Tracker</strong>
              </div>
              <span className={styles.countdownBadge}>
                {isOtpPending
                  ? 'Awaiting OTP'
                  : stage === 'served'
                  ? 'Served Hot! 🥞'
                  : `⏱️ ${formatTime(secondsRemaining)} mins`}
              </span>
            </div>

            {/* 5-Step Visual Progress Bar */}
            <div className={styles.progressBarWrapper}>
              <div
                className={styles.progressBarFill}
                style={{
                  width:
                    isOtpPending
                      ? '20%'
                      : stage === 'cooking'
                      ? '60%'
                      : stage === 'plating'
                      ? '85%'
                      : '100%',
                }}
              ></div>
            </div>

            <div className={styles.stepLabelsRow}>
              <span className={styles.stepActive}>1. Order Placed</span>
              <span className={!isOtpPending ? styles.stepActive : styles.stepInactive}>
                2. OTP Verified
              </span>
              <span className={stage === 'cooking' ? styles.stepPulsing : !isOtpPending ? styles.stepActive : styles.stepInactive}>
                3. On Iron Tawa
              </span>
              <span className={stage === 'plating' ? styles.stepPulsing : stage === 'served' ? styles.stepActive : styles.stepInactive}>
                4. Plating
              </span>
              <span className={stage === 'served' ? styles.stepActive : styles.stepInactive}>
                5. Served
              </span>
            </div>
          </div>

          {/* ==========================================================
             SECTION 3: DIGITAL KOT (KITCHEN ORDER TICKET)
             ========================================================== */}
          <div className={styles.kotReceipt}>
            <div className={styles.receiptTop}>
              <h5 className={styles.receiptBrand}>SRI GOKULAM VEG RESTAURANT</h5>
              <p className={styles.receiptSub}>Karaikudi Heritage Sattvic Dining</p>
              <div className={styles.receiptDivider}>- - - - - - - - - - - - - - - - - - - -</div>
              <div className={styles.receiptMetaGrid}>
                <div><strong>KOT #:</strong> {currentOrder.orderId}</div>
                <div><strong>TABLE:</strong> Table #{currentOrder.tables.join(', #')}</div>
                <div><strong>GUEST:</strong> {currentOrder.guestName}</div>
                <div><strong>DINERS:</strong> {currentOrder.guestCount} Guests</div>
                <div><strong>TIME:</strong> {currentOrder.placedAt}</div>
                <div><strong>SERVER:</strong> {currentOrder.verifiedBy || 'Floor Captain'}</div>
              </div>
              <div className={styles.receiptDivider}>- - - - - - - - - - - - - - - - - - - -</div>
            </div>

            {/* Items Table */}
            <div className={styles.kotItemsList}>
              <div className={styles.kotHeaderRow}>
                <span>ITEM</span>
                <span>QTY</span>
                <span style={{ textAlign: 'right' }}>PRICE</span>
              </div>
              {currentOrder.items.map((item, idx) => (
                <div key={idx} className={styles.kotItemRow}>
                  <div className={styles.kotItemName}>
                    {item.title}
                  </div>
                  <div className={styles.kotItemQty}>x{item.quantity}</div>
                  <div className={styles.kotItemPrice}>₹{item.price * item.quantity}</div>
                </div>
              ))}
            </div>

            {/* Cooking Notes */}
            {currentOrder.cookingNotes && (
              <div className={styles.kotNotesBox}>
                <strong>Chef Note:</strong> {currentOrder.cookingNotes}
              </div>
            )}

            <div className={styles.receiptDivider}>- - - - - - - - - - - - - - - - - - - -</div>

            <div className={styles.kotTotalRow}>
              <span>SUBTOTAL:</span>
              <strong>₹{currentOrder.subtotal || currentOrder.totalAmount}</strong>
            </div>
            {currentOrder.cgst && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#6b7280' }}>
                <span>GST (CGST 2.5% + SGST 2.5%):</span>
                <span>₹{(currentOrder.cgst + currentOrder.sgst).toFixed(2)}</span>
              </div>
            )}
            <div className={styles.kotTotalRow} style={{ marginTop: '4px', color: '#051B41' }}>
              <span>TOTAL (GST Incl.):</span>
              <strong>₹{currentOrder.totalAmount}</strong>
            </div>

            <div className={styles.receiptBarcode}>
              ||| | |||| | ||| || |||| | |||
            </div>
            <div className={styles.receiptFooter}>
              KOT Dispatched via Real Next.js API to Kitchen Stations
            </div>
          </div>

          {/* ==========================================================
             SECTION 4: BILLING & IN-SEAT UPI PAYMENT
             ========================================================== */}
          {paymentSuccess ? (
            <div style={{
              background: '#ecfdf5',
              border: '2px solid #10b981',
              borderRadius: '18px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              <span style={{ fontSize: '2rem' }}>🧾✨</span>
              <h4 style={{ color: '#065f46', fontSize: '1rem', fontWeight: 800, marginTop: '4px' }}>
                Bill Settled Successfully!
              </h4>
              <p style={{ fontSize: '0.78rem', color: '#047857', marginBottom: '8px' }}>
                Receipt: {paymentSuccess.receiptNumber} • Paid ₹{paymentSuccess.totalPaid} via {paymentSuccess.mode}
              </p>
              <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                Table #{paymentSuccess.table} is now scheduled for cleaning. Thank you for dining with Sri Gokulam!
              </div>
            </div>
          ) : billData ? (
            <div style={{
              background: '#fffdf5',
              border: '2px solid #e2a829',
              borderRadius: '18px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ color: '#051B41', fontSize: '0.9rem' }}>
                  Final GST Bill: {billData.billNumber}
                </strong>
                <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
                  PAYMENT UNLOCKED
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#374151', marginBottom: '10px' }}>
                Total Amount Due: <strong style={{ fontSize: '1.1rem', color: '#051B41' }}>₹{billData.totalAmount}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  style={{
                    background: '#104179',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  onClick={() => handlePayUpi('UPI_GPAY')}
                  disabled={isPaying}
                >
                  ⚡ Pay with GPay / PhonePe
                </button>
                <button
                  style={{
                    background: '#2d7a3a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  onClick={() => handlePayUpi('BHARAT_QR')}
                  disabled={isPaying}
                >
                  📲 Scan UPI QR
                </button>
              </div>
            </div>
          ) : !isOtpPending ? (
            <div style={{ marginBottom: '16px' }}>
              <button
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1.5px solid #0059B3',
                  color: '#0059B3',
                  borderRadius: '18px',
                  padding: '12px',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onClick={handleRequestBill}
                disabled={isBillingLoading}
              >
                <span>🧾</span> {isBillingLoading ? 'Generating Bill...' : 'Request Final Bill & Pay from Seat'}
              </button>
            </div>
          ) : null}

          {waiterCalled && (
            <div className={styles.waiterAlertToast}>
              🛎️ Captain notified! A floor waiter is approaching Table #{currentOrder.tables.join(' & #')}.
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actionsRow}>
            <button
              className={styles.btnOrderMore}
              onClick={() => {
                onClose();
                if (onOrderMore) onOrderMore();
              }}
            >
              <span>🥞</span> Order More Dishes to Tab
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              <button
                className={styles.btnCallWaiter}
                onClick={() => handleCallWaiter('GENERAL')}
                disabled={waiterCalled}
                title="Call Waiter"
              >
                <span>🛎️</span> Call
              </button>
              <button
                className={styles.btnCallWaiter}
                onClick={() => handleCallWaiter('WATER')}
                disabled={waiterCalled}
                title="Water Please"
              >
                <span>💧</span> Water
              </button>
              <button
                className={styles.btnCallWaiter}
                onClick={() => handleCallWaiter('CHECK_OUT')}
                disabled={waiterCalled}
                title="Request Bill at Counter"
              >
                <span>🧾</span> Bill
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
