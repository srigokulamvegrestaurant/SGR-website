'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from './waiter.module.css';

// ─── Audio Engine ──────────────────────────────────────────────────────────
function playChime(type = 'new_order') {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();

    const freqMap = {
      new_order:   [440, 554, 659, 880],  // urgent ascending alert
      otp_verify:  [523, 659, 784],        // verified success
      waiter_call: [880, 659, 880],        // double ping
      ready:       [523, 659, 784, 1047],  // food ready fanfare
    };

    const freqs = freqMap[type] || freqMap.new_order;
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = type === 'waiter_call' ? 'square' : 'sine';
      gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.13);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.13 + 0.25);
      osc.start(ctx.currentTime + i * 0.13);
      osc.stop(ctx.currentTime + i * 0.13 + 0.25);
    });
  } catch {}
}

// ─── Flash banner component ────────────────────────────────────────────────
function FlashAlert({ alerts, onDismiss }) {
  if (!alerts.length) return null;
  return (
    <div className={styles.flashStack}>
      {alerts.map((a) => (
        <div
          key={a.id}
          className={`${styles.flashItem} ${
            a.type === 'NEW_ORDER_OTP_PENDING' ? styles.flashOrder
            : a.type === 'WAITER_CALL'        ? styles.flashCall
            : a.type === 'ORDER_STATUS_UPDATE' ? styles.flashStatus
            : styles.flashGeneric
          }`}
        >
          <span className={styles.flashMsg}>{a.message}</span>
          <button className={styles.flashDismiss} onClick={() => onDismiss(a.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function WaiterTerminal() {
  const [activeTab,      setActiveTab]      = useState('pending');
  const [orders,         setOrders]         = useState([]);
  const [tables,         setTables]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedOrder,  setSelectedOrder]  = useState(null);
  const [enteredOtp,     setEnteredOtp]     = useState('');
  const [verifying,      setVerifying]      = useState(false);
  const [alertMsg,       setAlertMsg]       = useState(null);
  const [flashAlerts,    setFlashAlerts]    = useState([]);  // Live SSE banners
  const [sseStatus,      setSseStatus]      = useState('connecting'); // 'connecting' | 'live' | 'error'
  const [advancingId,    setAdvancingId]    = useState(null);
  const sseRef = useRef(null);
  const prevPendingCount = useRef(0);

  // ── Data fetcher ──
  const fetchData = useCallback(async () => {
    try {
      const [oR, tR] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/tables'),
      ]);
      const od = await oR.json();
      const td = await tR.json();
      if (od.success) {
        setOrders(od.orders || []);
        // Detect new OTP-pending orders that arrived without SSE
        const curPending = (od.orders || []).filter((o) => o.status === 'otp_pending').length;
        if (curPending > prevPendingCount.current) {
          playChime('new_order');
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
        prevPendingCount.current = curPending;
      }
      if (td.success) setTables(td.tables || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  // ── SSE Connection ──
  useEffect(() => {
    let retryTimer;
    function connect() {
      setSseStatus('connecting');
      const es = new EventSource('/api/events?role=waiter');
      sseRef.current = es;

      es.onopen = () => setSseStatus('live');

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'PING' || event.type === 'CONNECTED') return;

          // Add flash alert
          const alertId = `${event.type}-${Date.now()}`;
          setFlashAlerts((prev) => [{ ...event, id: alertId }, ...prev].slice(0, 6));

          // Play contextual audio
          if (event.type === 'NEW_ORDER_OTP_PENDING') {
            playChime('new_order');
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
            fetchData(); // Refresh order list immediately
          } else if (event.type === 'ORDER_OTP_VERIFIED') {
            playChime('otp_verify');
            fetchData();
          } else if (event.type === 'WAITER_CALL') {
            playChime('waiter_call');
            if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
          } else if (event.type === 'ORDER_STATUS_UPDATE') {
            if (event.newStatus === 'ready') playChime('ready');
            fetchData();
          } else if (event.type === 'CATCH_UP') {
            if (event.pendingCount > 0) playChime('new_order');
            fetchData();
          }
        } catch {}
      };

      es.onerror = () => {
        setSseStatus('error');
        es.close();
        retryTimer = setTimeout(connect, 4000); // Auto-reconnect every 4s
      };
    }

    connect();
    fetchData();
    const pollInterval = setInterval(fetchData, 8000); // Fallback poll every 8s

    return () => {
      sseRef.current?.close();
      clearTimeout(retryTimer);
      clearInterval(pollInterval);
    };
  }, [fetchData]);

  const pendingOrders = orders.filter((o) => o.status === 'otp_pending');
  const kitchenOrders = orders.filter((o) => ['cooking', 'plating', 'ready'].includes(o.status));

  // ── OTP Authorization ──
  const handleAuthorizeOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedOrder || !enteredOtp) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/orders/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.orderId,
          otp:     enteredOtp.trim(),
          staffName: 'Captain Murugan (Floor Lead)',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setAlertMsg({ type: 'success', text: `✅ Table #${selectedOrder.tables.join(' & #')} authorized! KOT fired to all kitchen stations.` });
      setSelectedOrder(null);
      setEnteredOtp('');
      fetchData();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.message });
    } finally {
      setVerifying(false);
    }
  };

  // ── Kitchen Status Advance ──
  const handleAdvanceStatus = async (orderId, newStatus) => {
    setAdvancingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, staffName: 'Captain Murugan' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setAlertMsg({ type: 'success', text: `Order ${orderId} → ${newStatus.toUpperCase()}` });
      fetchData();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.message });
    } finally {
      setAdvancingId(null);
    }
  };

  // ── Table Clean ──
  const handleMarkCleaned = async (tableNum) => {
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber: tableNum, status: 'AVAILABLE' }),
      });
      const data = await res.json();
      if (data.success) {
        setAlertMsg({ type: 'success', text: `Table #${tableNum} cleaned & available!` });
        fetchData();
      }
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.message });
    }
  };

  const dismissFlash = (id) =>
    setFlashAlerts((prev) => prev.filter((a) => a.id !== id));

  const nextStatus = { cooking: 'plating', plating: 'ready', ready: 'served' };
  const nextLabel  = { cooking: '→ Mark Plating', plating: '→ Mark Ready to Serve', ready: '→ Mark Served' };
  const sectionColors = { GROUND_FLOOR: '#e0f2fe', AC_HALL: '#f0fdf4', VERANDA: '#fef9c3' };

  return (
    <div className={styles.container}>
      {/* Top Staff Navbar */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.brandBadge}>SRI GOKULAM — STAFF PORTAL</span>
          <h1 className={styles.headerTitle}>🧑‍🍳 Floor Captain &amp; Waiter Terminal</h1>
          <span className={styles.serverBadge}>
            Captain: Murugan • Karaikudi Branch •{' '}
            <span className={sseStatus === 'live' ? styles.sseLive : sseStatus === 'error' ? styles.sseError : styles.sseConnecting}>
              {sseStatus === 'live' ? '🟢 Live' : sseStatus === 'error' ? '🔴 Reconnecting...' : '🟡 Connecting...'}
            </span>
          </span>
        </div>
        <div className={styles.headerRight}>
          <Link href="/" className={styles.guestLink}>← Guest View</Link>
        </div>
      </header>

      {/* Real-Time Flash Alerts (SSE Events) */}
      <FlashAlert alerts={flashAlerts} onDismiss={dismissFlash} />

      {/* Persistent Alert Banner */}
      {alertMsg && (
        <div className={`${styles.alertBanner} ${alertMsg.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
          <span>{alertMsg.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{alertMsg.text}</span>
          <button onClick={() => setAlertMsg(null)} className={styles.alertClose}>✕</button>
        </div>
      )}

      {/* Quick Stats Bar */}
      <div className={styles.statsBar}>
        <div className={`${styles.statPill} ${pendingOrders.length > 0 ? styles.statPillAlert : ''}`}>
          <span className={styles.statCount}>{pendingOrders.length}</span>
          <span className={styles.statLabel}>OTP Pending</span>
        </div>
        <div className={styles.statPill}>
          <span className={styles.statCount}>{kitchenOrders.length}</span>
          <span className={styles.statLabel}>In Kitchen</span>
        </div>
        <div className={styles.statPill}>
          <span className={styles.statCount}>{tables.filter((t) => t.status === 'OCCUPIED').length}</span>
          <span className={styles.statLabel}>Occupied</span>
        </div>
        <div className={styles.statPill}>
          <span className={styles.statCount}>{tables.filter((t) => t.status === 'AVAILABLE').length}</span>
          <span className={styles.statLabel}>Available</span>
        </div>
        <div className={`${styles.statPill} ${tables.some((t) => t.status === 'CLEANING') ? styles.statPillWarning : ''}`}>
          <span className={styles.statCount}>{tables.filter((t) => t.status === 'CLEANING').length}</span>
          <span className={styles.statLabel}>Cleaning</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabsRow}>
        <button className={`${styles.tabBtn} ${activeTab === 'pending' ? styles.tabActive : ''}`} onClick={() => setActiveTab('pending')}>
          <span>🔔</span> OTP Authorization
          {pendingOrders.length > 0 && <span className={styles.tabBadge}>{pendingOrders.length}</span>}
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'kitchen' ? styles.tabActive : ''}`} onClick={() => setActiveTab('kitchen')}>
          <span>🔥</span> Kitchen Tracker
          {kitchenOrders.length > 0 && <span className={styles.tabBadge}>{kitchenOrders.length}</span>}
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'tables' ? styles.tabActive : ''}`} onClick={() => setActiveTab('tables')}>
          <span>🪑</span> Floor Plan
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      <main className={styles.main}>
        {loading ? (
          <div className={styles.loadingBox}>
            <div className={styles.loadingSpinner}></div>
            Connecting to Sri Gokulam Cloud Engine...
          </div>
        ) : activeTab === 'pending' ? (

          /* ── PENDING OTP TAB ── */
          <div>
            <div className={styles.sectionHeader}>
              <h2>📋 Orders Awaiting OTP Verification</h2>
              <p>Walk to the table, cross-check dishes with the guest, collect the 4-digit code, then authorize.</p>
            </div>
            {pendingOrders.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>✨</span>
                <h3>All Clear — No Pending Orders!</h3>
                <p>New orders will flash here instantly when placed.</p>
              </div>
            ) : (
              <div className={styles.ordersGrid}>
                {pendingOrders.map((ord) => (
                  <div key={ord.orderId} className={`${styles.orderCard} ${styles.orderCardPending}`}>
                    <div className={styles.orderCardTop}>
                      <span className={styles.tableBadge}>TABLE #{ord.tables.join(' & #')}</span>
                      <span className={styles.timeBadge}>⏰ {ord.placedAt}</span>
                    </div>
                    <div className={styles.guestInfo}>
                      <strong>{ord.guestName}</strong> • {ord.guestCount} Diners • {ord.guestPhone || '—'}
                    </div>
                    <div className={styles.itemsSummary}>
                      {ord.items.map((it, idx) => (
                        <div key={idx} className={styles.itemLine}>
                          <span>{it.quantity}× {it.title}</span>
                          <span>₹{it.price * it.quantity}</span>
                        </div>
                      ))}
                    </div>
                    {ord.cookingNotes && (
                      <div className={styles.noteLine}>📝 {ord.cookingNotes}</div>
                    )}
                    <div className={styles.cardFooter}>
                      <span className={styles.cardTotal}>₹{ord.totalAmount} incl. GST</span>
                      <button className={styles.btnOpenVerify} onClick={() => { setSelectedOrder(ord); setEnteredOtp(''); }}>
                        🔑 Verify OTP
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : activeTab === 'kitchen' ? (

          /* ── KITCHEN TRACKER TAB ── */
          <div>
            <div className={styles.sectionHeader}>
              <h2>🔥 Active Kitchen Orders — Station-Wise KDS</h2>
              <p>Advance each order through the cooking stages to notify the guest in real time.</p>
            </div>
            {kitchenOrders.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🥘</span>
                <h3>Kitchen Clear</h3>
                <p>No orders currently on iron tawa or gravy station.</p>
              </div>
            ) : (
              <div className={styles.ordersGrid}>
                {kitchenOrders.map((ord) => (
                  <div key={ord.orderId} className={`${styles.orderCard} ${styles.orderCardKitchen}`}>
                    <div className={styles.orderCardTop}>
                      <span className={styles.tableBadgeKitchen}>TABLE #{ord.tables.join(' & #')}</span>
                      <span className={`${styles.statusPill} ${
                        ord.status === 'cooking' ? styles.statusCooking
                        : ord.status === 'plating' ? styles.statusPlating
                        : styles.statusReady
                      }`}>
                        {ord.status === 'cooking' ? '🔥 COOKING'
                         : ord.status === 'plating' ? '🍽️ PLATING'
                         : '✅ READY TO SERVE'}
                      </span>
                    </div>

                    <div className={styles.guestInfo}>
                      <strong>{ord.guestName}</strong> • {ord.orderId}
                    </div>

                    {/* Station breakdown */}
                    {ord.stationRouting && (
                      <div className={styles.stationGrid}>
                        {Object.entries(ord.stationRouting).map(([station, items]) => items.length > 0 && (
                          <div key={station} className={styles.stationBox}>
                            <span className={styles.stationLabel}>
                              {station === 'TIFFIN' ? '🫓 Tiffin'
                               : station === 'MEALS_GRAVY' ? '🍛 Meals/Gravy'
                               : '☕ Beverages'}
                            </span>
                            {items.map((it, i) => (
                              <div key={i} className={styles.stationItem}>
                                {it.quantity}× {it.title}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={styles.cardFooter} style={{ marginTop: '10px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        By: {ord.verifiedBy || 'Floor Captain'}
                      </span>
                      {nextStatus[ord.status] && (
                        <button
                          className={styles.btnAdvance}
                          onClick={() => handleAdvanceStatus(ord.orderId, nextStatus[ord.status])}
                          disabled={advancingId === ord.orderId}
                        >
                          {advancingId === ord.orderId ? '...' : nextLabel[ord.status]}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : (

          /* ── FLOOR PLAN TAB ── */
          <div>
            <div className={styles.sectionHeader}>
              <h2>🪑 Restaurant Floor Map — 16 Tables</h2>
              <p>Ground Floor Family Hall • AC Royal Hall • Traditional Veranda</p>
            </div>
            {['GROUND_FLOOR', 'AC_HALL', 'VERANDA'].map((section) => (
              <div key={section} className={styles.sectionBlock} style={{ '--section-color': sectionColors[section] }}>
                <h3 className={styles.sectionBlockTitle}>
                  {section === 'GROUND_FLOOR' ? '🏠 Ground Floor Family Dining'
                   : section === 'AC_HALL' ? '❄️ AC Royal Hall'
                   : '🌿 Traditional Courtyard / Veranda'}
                </h3>
                <div className={styles.tablesGrid}>
                  {tables.filter((t) => t.section === section).map((t) => (
                    <div
                      key={t.id}
                      className={`${styles.tableTile} ${
                        t.status === 'AVAILABLE' ? styles.tileAvailable
                        : t.status === 'OCCUPIED' ? styles.tileOccupied
                        : t.status === 'BILL_GENERATED' ? styles.tileBilled
                        : styles.tileCleaning
                      }`}
                    >
                      <div className={styles.tileNumber}>#{t.tableNumber}</div>
                      <div className={styles.tileCapacity}>{t.capacity} seats</div>
                      <div className={styles.tileStatusText}>
                        {t.status === 'AVAILABLE' ? '🟢 Free'
                         : t.status === 'OCCUPIED' ? '🟡 Dining'
                         : t.status === 'BILL_GENERATED' ? '🔵 Bill Out'
                         : '🔴 Cleaning'}
                      </div>
                      {t.status === 'CLEANING' && (
                        <button className={styles.btnCleaned} onClick={() => handleMarkCleaned(t.tableNumber)}>
                          ✓ Done
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── OTP Verification Modal ── */}
      {selectedOrder && (
        <div className={styles.modalOverlay} onClick={() => setSelectedOrder(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3>🔑 Authorize Table #{selectedOrder.tables.join(' & #')}</h3>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0' }}>
                  {selectedOrder.guestName} • {selectedOrder.items.length} items • ₹{selectedOrder.totalAmount}
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className={styles.modalClose}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                Enter the 4-digit OTP shown on <strong>{selectedOrder.guestName}&apos;s</strong> phone screen:
              </p>
              <form onSubmit={handleAuthorizeOtp}>
                <div className={styles.otpInputRow}>
                  {[0, 1, 2, 3].map((i) => (
                    <input
                      key={i}
                      type="text"
                      maxLength={1}
                      inputMode="numeric"
                      className={styles.otpSingleInput}
                      value={enteredOtp[i] || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/, '');
                        const arr = enteredOtp.split('');
                        arr[i] = val;
                        setEnteredOtp(arr.join(''));
                        if (val && e.target.nextSibling) e.target.nextSibling.focus();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !enteredOtp[i] && e.target.previousSibling) {
                          e.target.previousSibling.focus();
                        }
                      }}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                <div className={styles.modalActions}>
                  <button
                    type="submit"
                    className={styles.btnAuthorizeSubmit}
                    disabled={verifying || enteredOtp.replace(/\D/g, '').length < 4}
                  >
                    {verifying ? '⏳ Authorizing via API...' : '✅ Authorize & Fire KOT to Kitchen'}
                  </button>
                  <button type="button" className={styles.btnCancel} onClick={() => setSelectedOrder(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
