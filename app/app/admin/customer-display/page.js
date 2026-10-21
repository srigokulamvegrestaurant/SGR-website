'use client';

// app/admin/customer-display/page.js - TVSE TP 415C Customer Rear Display View
import { useState, useEffect } from 'react';

export default function CustomerDisplay() {
  const [activeTableData, setActiveTableData] = useState(null);
  const [lastBill, setLastBill] = useState(null);
  const [timeStr, setTimeStr] = useState('');

  // Clock
  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll / SSE for active billing table
  useEffect(() => {
    const loadPos = async () => {
      try {
        const res = await fetch('/api/admin/pos');
        const data = await res.json();
        if (data.success && data.tables) {
          // Find table with active unbilled order
          const busy = data.tables.find(t => t.subtotal > 0);
          setActiveTableData(busy || null);
          if (data.recentBills && data.recentBills.length > 0) {
            setLastBill(data.recentBills[0]);
          }
        }
      } catch (e) {
        console.error('Customer display fetch error:', e);
      }
    };

    loadPos();
    const interval = setInterval(loadPos, 3000);

    // SSE Realtime
    let evt = null;
    try {
      evt = new EventSource('/api/events');
      evt.addEventListener('message', () => loadPos());
    } catch (e) {}

    return () => {
      clearInterval(interval);
      if (evt) evt.close();
    };
  }, []);

  const totalAmount = activeTableData?.subtotal
    ? Math.round(activeTableData.subtotal * 1.05) // Subtotal + 5% GST
    : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #09090b 0%, #141417 100%)',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2px solid rgba(37, 99, 235, 0.35)',
        paddingBottom: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)',
          }}>
            🧈
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#fffdf7', letterSpacing: '0.04em' }}>
              SRI GOKULAM VEG RESTAURANT
            </h1>
            <div style={{ fontSize: '0.85rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>
              Karaikudi Authentic Chettinad • Customer Display
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#38bdf8', fontFamily: 'monospace' }}>
            {timeStr}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#4ade80' }}>● POS Counter 01 Ready</div>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.3fr 1fr',
        gap: '1.5rem',
        flex: 1,
      }}>
        {/* Left: Active Order / Welcome Screen */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {activeTableData && activeTableData.items?.length > 0 ? (
            <>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '0.75rem',
                marginBottom: '1rem',
              }}>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#60a5fa' }}>
                  Table #{activeTableData.tableNumber}
                </span>
                <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                  {activeTableData.items.length} items ordered
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {activeTableData.items.map((it, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '8px',
                    fontSize: '1.05rem',
                  }}>
                    <div>
                      <span style={{ fontWeight: '700', color: '#ffffff' }}>{it.title}</span>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Qty: {it.quantity || 1} x ₹{it.price}</div>
                    </div>
                    <span style={{ fontWeight: '800', color: '#4ade80', fontSize: '1.15rem' }}>
                      ₹{(it.price || 0) * (it.quantity || 1)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Subtotal & Taxes */}
              <div style={{
                borderTop: '2px dashed rgba(255, 255, 255, 0.15)',
                paddingTop: '1rem',
                marginTop: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                fontSize: '0.95rem',
                color: '#cbd5e1',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>₹{activeTableData.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>GST (CGST 2.5% + SGST 2.5%):</span>
                  <span>₹{(activeTableData.subtotal * 0.05).toFixed(2)}</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '2rem',
            }}>
              <div style={{ fontSize: '4.5rem', marginBottom: '1rem' }}>🙏</div>
              <h2 style={{ fontSize: '1.8rem', color: '#38bdf8', margin: '0 0 0.5rem 0' }}>
                வணக்கம்! Welcome to Sri Gokulam
              </h2>
              <p style={{ color: '#cbd5e1', fontSize: '1.1rem', maxWidth: '420px', lineHeight: '1.6' }}>
                Pure Vegetarian Chettinad Delicacies. Your bill will appear here when generated by the cashier.
              </p>
              {lastBill && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '0.75rem 1.25rem',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  color: '#4ade80',
                  fontSize: '0.9rem',
                }}>
                  Last Bill Settled: #{lastBill.billNumber} • ₹{lastBill.totalAmount} (Thank you!)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Payment QR & Net Total */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.95rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>
            Amount Payable
          </div>
          <div style={{
            fontSize: '3.6rem',
            fontWeight: '900',
            color: '#4ade80',
            margin: '0.5rem 0 1.25rem 0',
            fontFamily: 'monospace',
          }}>
            ₹{totalAmount}
          </div>

          {totalAmount > 0 ? (
            <div style={{
              background: '#ffffff',
              padding: '1.25rem',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              {/* SVG QR Code Simulation */}
              <div style={{ width: '180px', height: '180px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 100 100" width="100%" height="100%">
                  <rect width="100" height="100" fill="#ffffff" />
                  {/* Outer corner markers */}
                  <rect x="5" y="5" width="26" height="26" fill="#061e38" />
                  <rect x="9" y="9" width="18" height="18" fill="#ffffff" />
                  <rect x="13" y="13" width="10" height="10" fill="#061e38" />

                  <rect x="69" y="5" width="26" height="26" fill="#061e38" />
                  <rect x="73" y="9" width="18" height="18" fill="#ffffff" />
                  <rect x="77" y="13" width="10" height="10" fill="#061e38" />

                  <rect x="5" y="69" width="26" height="26" fill="#061e38" />
                  <rect x="9" y="73" width="18" height="18" fill="#ffffff" />
                  <rect x="13" y="77" width="10" height="10" fill="#061e38" />

                  {/* QR Pattern dots */}
                  <rect x="36" y="8" width="6" height="6" fill="#061e38" />
                  <rect x="46" y="8" width="12" height="6" fill="#061e38" />
                  <rect x="36" y="20" width="18" height="6" fill="#061e38" />
                  <rect x="8" y="36" width="6" height="12" fill="#061e38" />
                  <rect x="20" y="42" width="12" height="6" fill="#061e38" />
                  <rect x="36" y="36" width="26" height="26" fill="#2563eb" />
                  <rect x="42" y="42" width="14" height="14" fill="#061e38" />
                  <rect x="68" y="38" width="12" height="8" fill="#061e38" />
                  <rect x="84" y="48" width="8" height="10" fill="#061e38" />
                  <rect x="36" y="68" width="10" height="12" fill="#061e38" />
                  <rect x="52" y="74" width="14" height="6" fill="#061e38" />
                  <rect x="70" y="68" width="22" height="8" fill="#061e38" />
                  <rect x="74" y="80" width="18" height="12" fill="#061e38" />
                </svg>
              </div>

              <div style={{ color: '#061e38', fontWeight: '800', fontSize: '0.9rem', marginTop: '0.6rem' }}>
                Scan with any UPI App
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                GPay • PhonePe • Paytm • BHIM
              </div>
            </div>
          ) : (
            <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              Cash, Card &amp; UPI accepted at counter
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        marginTop: '1.25rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        paddingTop: '0.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.8rem',
        color: '#94a3b8',
      }}>
        <span>FSSAI: 12423018000456 • GSTIN: 33AABCS1234F1Z8</span>
        <span>Technology Partner: AJ Tech Solutions</span>
      </footer>
    </div>
  );
}
