'use client';

// app/admin/components/BillingMethodDetailModal.js
// Interactive Detail Guide for 4 Real-World Billing Methods (M1 - M4 + Delivery)
import React, { useState } from 'react';
import styles from './BillingMethodDetailModal.module.css';

const METHODS_INFO = {
  M1: {
    id: 'M1',
    typeKey: 'DINE_IN',
    badge: 'Method 1 • Dine-In',
    badgeColor: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    icon: '🍽️',
    title: 'Dine-In Table Bill',
    subtitle: 'Table Session with Waiter / QR Ordering & Running Tab',
    overview:
      'Customer sits at a dining table, orders dishes via waiter tablet or table QR code standee, eats at the table, and requests the bill. Orders aggregate under that table session until settled.',
    steps: [
      {
        title: 'Table Order & KOT Firing',
        desc: 'Guest or Waiter places order. Dishes instantly route to Kitchen KDS and print on TVSE thermal printer. Multiple rounds (starters, meals, coffee) accumulate.',
      },
      {
        title: 'Bill Request & Consolidation',
        desc: 'Waiter taps "Request Bill" or Cashier clicks table tab. POS compiles all active KOT orders into a single consolidated running bill.',
      },
      {
        title: 'Settlement (Counter or Table)',
        desc: 'Customer pays at the cashier desk by Cash/UPI/Card, OR pays at table to waiter via Cash or portable Paytm/UPI machine. Cashier settles in 1 click.',
      },
      {
        title: 'Table Release to Cleaning',
        desc: 'Bill settlement flags all orders as PAID_SETTLED, marks table as CLEANING / AVAILABLE, prints 80mm/58mm slip, and logs shift drawer sales.',
      },
    ],
    duplicatePrevention:
      'The system links all KOTs directly to the active table session. Once billed, the table is cleared, preventing overlapping or duplicate bill generation.',
    paymentModes: 'Cash (with change calculator), Dynamic UPI QR Code, Card Terminal, or Split Payment.',
    tips: [
      { icon: '🪑', label: 'Table Selector', value: 'Switch tables using top selector chip' },
      { icon: '⚡', label: '1-Click Settle', value: 'Use "💵 Cash & Slip" or "📱 UPI & Slip"' },
      { icon: '🔄', label: 'Running Tab', value: 'View dishes across all rounds in "Table Tab"' },
    ],
  },
  M2: {
    id: 'M2',
    typeKey: 'MANUAL_DINE_IN',
    badge: 'Method 2 • Manual Dine-In',
    badgeColor: '#ec4899',
    badgeBg: 'rgba(236, 72, 153, 0.15)',
    icon: '📝',
    title: 'Manual Dine-In Bill',
    subtitle: 'Verbal Order with Customer Name & Mobile Lookup',
    overview:
      'Customer orders verbally without using QR code. To prevent duplicate bills, the waiter collects the Customer Name and Mobile Number while punching the KOT. Cashier easily searches the active order by Name or Phone to load and settle.',
    steps: [
      {
        title: 'Waiter Collects Name & Mobile',
        desc: 'When punching manual order, Waiter inputs Customer Name & 10-digit Phone. The active KOT is stored with customer contact info.',
      },
      {
        title: 'Cashier Universal Search',
        desc: 'Customer arrives at counter. Cashier types Customer Phone, Name, or Table # in the POS Universal Search bar.',
      },
      {
        title: '1-Click Load & Settle Bill',
        desc: 'Active order appears with dishes and total. Cashier clicks "⚡ Load & Settle Active Order" to bill directly without re-entering items.',
      },
      {
        title: 'Duplicate Guard Auto-Lock',
        desc: 'If cashier attempts to create a new manual bill for that table or phone, POS shows a prominent yellow warning with 1-click KOT load.',
      },
    ],
    duplicatePrevention:
      'Mandatory phone/name linkage checks active orders in real-time. Cashier is warned before creating a duplicate bill and given 1-click resolution.',
    paymentModes: 'Cash, UPI QR, Card, or Split.',
    tips: [
      { icon: '🔍', label: 'Quick Phone Search', value: 'Type 10-digit mobile number in Universal Search' },
      { icon: '⚠️', label: 'Duplicate Alert', value: 'Always click "Load KOT" if yellow banner appears' },
      { icon: '✅', label: 'Auto-Clear Tab', value: 'Settling closes the kitchen ticket automatically' },
    ],
  },
  M3: {
    id: 'M3',
    typeKey: 'COUNTER',
    badge: 'Method 3 • Counter Order',
    badgeColor: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    icon: '⚡',
    title: 'Counter Food Order',
    subtitle: 'Fast Coffee, Snacks, Tiffin with Instant Token (#CTR-XXX)',
    overview:
      'Customer directly orders simple fast items (Degree Coffee, Tea, Medu Vada, Samosa, Tiffin) at the cashier counter. POS generates sequential token #CTR-XXX. Cashier can collect payment immediately or on food pickup.',
    steps: [
      {
        title: 'Select Dishes & Generate Token',
        desc: 'Cashier selects Counter (M3) mode. POS auto-assigns next sequential token: #CTR-101, #CTR-102, etc.',
      },
      {
        title: 'Option A: Instant Payment (PAID)',
        desc: 'Cashier taps "💵 Instant Cash" or "📱 Instant UPI". Bill is marked PAID immediately, logged in shift, and slips print in 1 step.',
      },
      {
        title: 'Option B: Pay on Collection',
        desc: 'Cashier taps "⏳ Route Token (Pay on Collection)". Order routes to kitchen station as PENDING_PAYMENT with token #CTR-XXX.',
      },
      {
        title: 'Food Handover & Token Settle',
        desc: 'When customer collects food, cashier types token #CTR-XXX in search, collects payment, and completes order.',
      },
    ],
    duplicatePrevention:
      'Sequential CTR-XXX token engine ensures counter tickets never collide with dine-in tables or takeaway parcel numbers.',
    paymentModes: 'Instant Cash (with quick change buttons), Instant UPI QR, or Pay on Collection.',
    tips: [
      { icon: '☕', label: 'Fast Coffee/Snacks', value: 'Punch and tap "Instant Cash" for 3-second checkout' },
      { icon: '🎫', label: 'Token Slips', value: 'Prints both Customer Receipt and Kitchen Token Slip' },
      { icon: '⏳', label: 'Pay on Ready', value: 'Held orders show in "Active Orders (M3)" tab' },
    ],
  },
  M4: {
    id: 'M4',
    typeKey: 'TAKEAWAY',
    badge: 'Method 4 • Takeaway Parcel',
    badgeColor: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    icon: '🥡',
    title: 'Takeaway Order',
    subtitle: 'Counter Parcel Orders with Token (#TK-XXX) & Flexible Payment',
    overview:
      'Customer orders food at cashier counter for takeaway packaging. POS generates sequential parcel token #TK-XXX, applies parcel charges (if enabled), and allows payment upfront or after food is packed and ready.',
    steps: [
      {
        title: 'Parcel Order Punch',
        desc: 'Cashier selects Takeaway (M4). POS auto-assigns token #TK-101, #TK-102. Packaging fees automatically apply per restaurant setting.',
      },
      {
        title: 'Payment Upfront (Pay Now)',
        desc: 'Customer pays immediately. Bill is finalized as PAID, and slip prints with bold Token #TK-XXX for collection.',
      },
      {
        title: 'Payment on Ready (Pay on Pickup)',
        desc: 'Cashier holds order as PENDING_PAYMENT. Kitchen packs food and marks "READY" on KDS.',
      },
      {
        title: 'Pickup & Settlement',
        desc: 'Customer presents Token #TK-XXX, cashier retrieves order, collects payment, and hands over parcel.',
      },
    ],
    duplicatePrevention:
      'Dedicated sequential TK-XXX namespace prevents cross-talk with counter orders or dining room tables.',
    paymentModes: 'Cash, UPI QR, Card, or Split.',
    tips: [
      { icon: '📦', label: 'Parcel Charge', value: 'Auto-calculates flat or percentage packaging fee' },
      { icon: '🎫', label: 'Pickup Token', value: 'Token #TK-XXX printed in bold at top of receipt' },
      { icon: '🔔', label: 'KDS Ready Alert', value: 'KDS notifies cashier when packing is complete' },
    ],
  },
  DELIVERY: {
    id: 'DELIVERY',
    typeKey: 'DELIVERY',
    badge: 'Method 5 • Direct Delivery',
    badgeColor: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    icon: '🛵',
    title: 'Delivery & Online Dispatch',
    subtitle: 'Home Delivery, Phone Orders & Food Partner Dispatch',
    overview:
      'Direct restaurant home delivery or telephone booking. Captures delivery address, contact person, delivery charge, and rider assignment.',
    steps: [
      {
        title: 'Address & Phone Capture',
        desc: 'Cashier records delivery destination, contact number, and rider instructions.',
      },
      {
        title: 'Kitchen Dispatch',
        desc: 'Order routes to packaging station with delivery slip and packing list.',
      },
      {
        title: 'Rider Handover & Payment',
        desc: 'Dispatched with cash on delivery (COD) or pre-paid UPI confirmation.',
      },
    ],
    duplicatePrevention: 'Tracks delivery address and phone number to prevent repeated dispatch.',
    paymentModes: 'Cash on Delivery (COD) or Pre-paid UPI/Card.',
    tips: [
      { icon: '📍', label: 'Delivery Address', value: 'Saved directly to Customer CRM profile' },
      { icon: '🛵', label: 'Rider Assignment', value: 'Track dispatched vs delivered orders' },
    ],
  },
};

export default function BillingMethodDetailModal({ isOpen, onClose, initialTab = 'M1', onSelectMethod }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'M1');

  if (!isOpen) return null;

  const current = METHODS_INFO[activeTab] || METHODS_INFO.M1;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleRow}>
            <span style={{ fontSize: '1.4rem' }}>{current.icon}</span>
            <div>
              <h3 className={styles.modalTitle}>POS Billing Method Guide</h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Sri Gokulam Veg Restaurant • 4 Real-World Billing Workflows
              </span>
            </div>
          </div>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            title="Close Guide"
          >
            ✕
          </button>
        </div>

        {/* Method Switcher Tabs */}
        <div className={styles.methodTabList}>
          {Object.values(METHODS_INFO).map((m) => (
            <button
              key={m.id}
              type="button"
              className={`${styles.methodTabBtn} ${activeTab === m.id ? styles.methodTabBtnActive : ''}`}
              onClick={() => setActiveTab(m.id)}
            >
              <span>{m.icon}</span>
              <span>{m.title}</span>
              <strong style={{ fontSize: '0.72rem', opacity: 0.85 }}>({m.id})</strong>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {/* Hero Card */}
          <div
            className={styles.methodHeroCard}
            style={{
              background: current.badgeBg,
              borderColor: current.badgeColor,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span
                className={styles.heroTag}
                style={{
                  background: current.badgeColor,
                  color: '#ffffff',
                }}
              >
                {current.badge}
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: current.badgeColor }}>
                Order Type Code: {current.typeKey}
              </span>
            </div>
            <h4 className={styles.heroHeading}>{current.title}</h4>
            <p style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {current.subtitle}
            </p>
            <p className={styles.heroDesc}>{current.overview}</p>
          </div>

          {/* Workflow Steps */}
          <div>
            <div className={styles.flowSectionTitle}>Step-by-Step Operator Flow</div>
            <div className={styles.flowGrid}>
              {current.steps.map((st, i) => (
                <div key={i} className={styles.flowCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className={styles.flowStepNum}>{i + 1}</div>
                    <span className={styles.flowCardTitle}>{st.title}</span>
                  </div>
                  <p className={styles.flowCardDesc}>{st.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Duplicate Prevention Guard */}
          <div className={styles.noticeBox}>
            <span className={styles.noticeIcon}>🛡️</span>
            <div>
              <div className={styles.noticeTitle}>Duplicate Order Prevention Guarantee</div>
              <p className={styles.noticeText}>{current.duplicatePrevention}</p>
            </div>
          </div>

          {/* Payment Modes & Quick Tips */}
          <div>
            <div className={styles.flowSectionTitle}>Cashier Quick Tips &amp; Shortcuts</div>
            <div className={styles.tipsGrid}>
              {current.tips.map((t, i) => (
                <div key={i} className={styles.tipCard}>
                  <span className={styles.tipIcon}>{t.icon}</span>
                  <div>
                    <div className={styles.tipLabel}>{t.label}</div>
                    <div className={styles.tipValue}>{t.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.btnCloseModal}
            onClick={onClose}
          >
            Close Guide
          </button>
          <button
            type="button"
            className={styles.btnSwitchNow}
            onClick={() => {
              if (onSelectMethod) {
                onSelectMethod(current.typeKey);
              }
              onClose();
            }}
          >
            <span>{current.icon}</span>
            <span>Switch to {current.title} Now</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

