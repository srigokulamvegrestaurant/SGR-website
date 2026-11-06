'use client';

import { useState, useMemo } from 'react';
import styles from './BillingManagementModal.module.css';
import {
  generateThermalSlipHtml,
  generateA4TaxInvoiceHtml,
  sanitizeEnglishTitle,
  formatBillTitle,
  formatTableDisplay
} from '@/lib/thermalSlipFormatter';

export default function BillingManagementModal({
  isOpen,
  onClose,
  bills = [],
  activeTables = [],
  currentUser = { name: 'Admin', role: 'SUPER_ADMIN' },
  settings = {},
  onOpenManualBill,
  onOpenEditBill,
  onRefreshBills,
  onShowNotice,
}) {
  if (!isOpen) return null;

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, YESTERDAY, WEEK, MONTH, CUSTOM
  const [customDate, setCustomDate] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL'); // ALL, DINE_IN, TAKEAWAY, PARCEL, DELIVERY, WALK_IN, COUNTER
  const [tableFilter, setTableFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL'); // ALL, CASH, UPI, CARD, SPLIT
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PAID, PENDING, VOIDED, REFUNDED
  const [staffFilter, setStaffFilter] = useState('ALL');

  // Modal Viewers
  const [viewingBill, setViewingBill] = useState(null);
  const [viewPaperWidth, setViewPaperWidth] = useState('80MM');

  // Void / Cancel Prompt State
  const [voidingBill, setVoidingBill] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [managerPin, setManagerPin] = useState('1234');
  const [voidLoading, setVoidLoading] = useState(false);

  // Refund Prompt State
  const [refundingBill, setRefundingBill] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  // Unique staff list for filter
  const staffList = useMemo(() => {
    const set = new Set(['Admin', 'Rajan', 'Captain Murugan', 'Karthik']);
    (bills || []).forEach(b => {
      if (b.cashierName) set.add(b.cashierName);
      if (b.waiterName) set.add(b.waiterName);
    });
    return Array.from(set);
  }, [bills]);

  // Unique tables list for filter
  const tablesList = useMemo(() => {
    const set = new Set(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', 'TK', 'DEL']);
    (bills || []).forEach(b => {
      if (b.tableNumber) set.add(b.tableNumber);
    });
    return Array.from(set);
  }, [bills]);

  // Date Filtering Helper
  const isDateMatch = (isoDate, filter, cDate) => {
    if (!isoDate) return true;
    if (filter === 'ALL') return true;

    const bDate = new Date(isoDate);
    const now = new Date();

    if (filter === 'TODAY') {
      return (
        bDate.getDate() === now.getDate() &&
        bDate.getMonth() === now.getMonth() &&
        bDate.getFullYear() === now.getFullYear()
      );
    }
    if (filter === 'YESTERDAY') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return (
        bDate.getDate() === yesterday.getDate() &&
        bDate.getMonth() === yesterday.getMonth() &&
        bDate.getFullYear() === yesterday.getFullYear()
      );
    }
    if (filter === 'WEEK') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return bDate >= sevenDaysAgo;
    }
    if (filter === 'MONTH') {
      return (
        bDate.getMonth() === now.getMonth() &&
        bDate.getFullYear() === now.getFullYear()
      );
    }
    if (filter === 'CUSTOM' && cDate) {
      const [cy, cm, cd] = cDate.split('-').map(Number);
      return (
        bDate.getFullYear() === cy &&
        bDate.getMonth() + 1 === cm &&
        bDate.getDate() === cd
      );
    }
    return true;
  };

  // Filtered Bills
  const filteredBills = useMemo(() => {
    return (bills || []).filter(b => {
      // 1. Search Query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const bNum = String(b.billNumber || '').toLowerCase();
        const cName = String(b.customer?.name || '').toLowerCase();
        const cPhone = String(b.customer?.phone || '');
        const tNum = String(b.tableNumber || '').toLowerCase();
        const itemsStr = (b.items || []).map(i => i.title || '').join(' ').toLowerCase();

        const match =
          bNum.includes(q) ||
          cName.includes(q) ||
          cPhone.includes(q) ||
          tNum.includes(q) ||
          itemsStr.includes(q);

        if (!match) return false;
      }

      // 2. Date Filter
      if (!isDateMatch(b.createdAt || b.settledAt, dateFilter, customDate)) {
        return false;
      }

      // 3. Order Type
      if (orderTypeFilter !== 'ALL') {
        const oType = String(b.orderType || 'DINE_IN').toUpperCase();
        if (oType !== orderTypeFilter) return false;
      }

      // 4. Table Filter
      if (tableFilter !== 'ALL') {
        if (String(b.tableNumber) !== String(tableFilter)) return false;
      }

      // 5. Payment Mode
      if (modeFilter !== 'ALL') {
        const m = String(b.paymentMode || 'CASH').toUpperCase();
        if (modeFilter === 'UPI' && !m.includes('UPI') && !m.includes('ONLINE')) return false;
        if (modeFilter === 'CASH' && !m.includes('CASH')) return false;
        if (modeFilter === 'CARD' && !m.includes('CARD')) return false;
        if (modeFilter === 'SPLIT' && !m.includes('SPLIT')) return false;
      }

      // 6. Status Filter
      if (statusFilter !== 'ALL') {
        const s = String(b.paymentStatus || 'PAID').toUpperCase();
        if (statusFilter === 'PAID' && s !== 'PAID') return false;
        if (statusFilter === 'PENDING' && s !== 'PENDING') return false;
        if (statusFilter === 'VOIDED' && s !== 'VOIDED' && s !== 'CANCELLED') return false;
        if (statusFilter === 'REFUNDED' && !s.includes('REFUND')) return false;
      }

      // 7. Staff Filter
      if (staffFilter !== 'ALL') {
        const c = String(b.cashierName || '');
        const w = String(b.waiterName || '');
        if (!c.includes(staffFilter) && !w.includes(staffFilter)) return false;
      }

      return true;
    });
  }, [bills, searchTerm, dateFilter, customDate, orderTypeFilter, tableFilter, modeFilter, statusFilter, staffFilter]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalAmt = 0;
    let cashAmt = 0;
    let upiAmt = 0;
    let cardAmt = 0;

    filteredBills.forEach(b => {
      const amt = Number(b.totalAmount || 0);
      const m = String(b.paymentMode || 'CASH').toUpperCase();
      const st = String(b.paymentStatus || 'PAID').toUpperCase();

      if (st !== 'VOIDED' && st !== 'CANCELLED') {
        totalAmt += amt;
        if (m.includes('CASH')) cashAmt += amt;
        else if (m.includes('UPI') || m.includes('ONLINE')) upiAmt += amt;
        else if (m.includes('CARD')) cardAmt += amt;
        else if (m.includes('SPLIT') && Array.isArray(b.splitDetails)) {
          b.splitDetails.forEach(sp => {
            if (sp.mode === 'CASH') cashAmt += Number(sp.amount || 0);
            else if (sp.mode === 'UPI') upiAmt += Number(sp.amount || 0);
            else if (sp.mode === 'CARD') cardAmt += Number(sp.amount || 0);
          });
        }
      }
    });

    return {
      count: filteredBills.length,
      totalAmt,
      cashAmt,
      upiAmt,
      cardAmt,
    };
  }, [filteredBills]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setDateFilter('ALL');
    setCustomDate('');
    setOrderTypeFilter('ALL');
    setTableFilter('ALL');
    setModeFilter('ALL');
    setStatusFilter('ALL');
    setStaffFilter('ALL');
  };

  // Direct Print Visual Receipt
  const handlePrintSlip = (b, width = '80MM', isDup = false) => {
    const printWindow = window.open('', '_blank', 'width=460,height=750');
    if (!printWindow) {
      alert('Pop-up was blocked. Please allow pop-ups for thermal receipt printing.');
      return;
    }

    const html = generateThermalSlipHtml({
      billNumber: b.billNumber,
      tableNumber: b.tableNumber,
      orderType: b.orderType || 'DINE_IN',
      persons: b.persons || 1,
      customer: b.customer,
      cashierName: b.cashierName || currentUser.name,
      waiterName: b.waiterName || '',
      items: b.items || [],
      subtotal: b.subtotal || 0,
      discountAmount: b.discountAmount || 0,
      discountReason: b.discountReason,
      packagingCharge: b.packagingCharge || 0,
      deliveryCharge: b.deliveryCharge || 0,
      serviceChargeAmount: b.serviceChargeAmount || 0,
      cgst: b.cgst || 0,
      sgst: b.sgst || 0,
      roundOff: b.roundOff || 0,
      totalAmount: b.totalAmount || 0,
      paymentMode: b.paymentMode || 'UPI',
      paymentStatus: b.paymentStatus || 'Paid',
      splitDetails: b.splitDetails,
      transactionRef: b.transactionRef || '',
      settledAt: b.settledAt || b.createdAt,
      paperWidth: width,
      isDuplicate: isDup || !!b.isDuplicate,
      reprintCount: b.reprintCount || (isDup ? 1 : 0),
      settings,
      standalonePage: true,
    });

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Direct Print A4 Invoice
  const handlePrintA4 = (b) => {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) return;
    const html = generateA4TaxInvoiceHtml({
      ...b,
      cashierName: b.cashierName || currentUser.name,
      settings,
    });
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Trigger Duplicate Reprint API
  const handleDuplicateReprint = async (b) => {
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REPRINT_BILL',
          billNumber: b.billNumber,
          callerName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success && data.bill) {
        handlePrintSlip(data.bill, '80MM', true);
        if (onShowNotice) onShowNotice(`Duplicate Reprint #${data.bill.reprintCount} generated for Bill #${b.billNumber}`);
        if (onRefreshBills) onRefreshBills();
      } else {
        alert(data.error || 'Failed to process reprint');
      }
    } catch (err) {
      handlePrintSlip(b, '80MM', true);
    }
  };

  // Void / Cancel Bill API
  const handleConfirmVoid = async (e) => {
    e.preventDefault();
    if (!voidReason || voidReason.trim().length < 4) {
      alert('Please enter a valid cancellation reason');
      return;
    }
    setVoidLoading(true);
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VOID_BILL',
          billNumber: voidingBill.billNumber,
          tableNumber: voidingBill.tableNumber,
          reason: voidReason,
          authorizedBy: currentUser.name,
          managerPin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (onShowNotice) onShowNotice(`Bill #${voidingBill.billNumber} voided successfully`);
        setVoidingBill(null);
        setVoidReason('');
        if (onRefreshBills) onRefreshBills();
      } else {
        alert(data.error || 'Failed to void bill');
      }
    } catch (err) {
      alert('Network error voiding bill');
    } finally {
      setVoidLoading(false);
    }
  };

  // Refund Bill API
  const handleConfirmRefund = async (e) => {
    e.preventDefault();
    const numAmt = Number(refundAmount);
    if (!refundAmount || isNaN(numAmt) || numAmt <= 0) {
      alert('Please enter a valid refund amount');
      return;
    }
    if (!refundReason || refundReason.trim().length < 4) {
      alert('Please enter a mandatory refund reason');
      return;
    }
    setRefundLoading(true);
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PROCESS_REFUND',
          billNumber: refundingBill.billNumber,
          amount: numAmt,
          reason: refundReason,
          authorizedBy: currentUser.name,
          managerPin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (onShowNotice) onShowNotice(`Refund of ₹${numAmt} processed for Bill #${refundingBill.billNumber}`);
        setRefundingBill(null);
        setRefundAmount('');
        setRefundReason('');
        if (onRefreshBills) onRefreshBills();
      } else {
        alert(data.error || 'Failed to process refund');
      }
    } catch (err) {
      alert('Network error processing refund');
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.headerTitle}>
              🧾 Restaurant Billing System &amp; History
            </h2>
            <div className={styles.headerSub}>
              Search, filter, view, edit, reprint duplicate 80mm/58mm thermal receipts, cancel, and refund bills with complete audit trail
            </div>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.btnNewBill}
              onClick={() => {
                onClose();
                if (onOpenManualBill) onOpenManualBill();
              }}
            >
              🧾 + New Manual Bill
            </button>
            <button type="button" className={styles.closeBtn} onClick={onClose} title="Close">
              ✕
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className={styles.kpiBar}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Total Bills</span>
            <span className={styles.kpiValue} style={{ color: '#38bdf8' }}>{summaryMetrics.count}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Total Sales</span>
            <span className={styles.kpiValue} style={{ color: '#10b981' }}>₹{summaryMetrics.totalAmt.toLocaleString('en-IN')}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Cash Revenue</span>
            <span className={styles.kpiValue} style={{ color: '#fbbf24' }}>₹{summaryMetrics.cashAmt.toLocaleString('en-IN')}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>UPI / Online</span>
            <span className={styles.kpiValue} style={{ color: '#a78bfa' }}>₹{summaryMetrics.upiAmt.toLocaleString('en-IN')}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Card Payments</span>
            <span className={styles.kpiValue} style={{ color: '#f472b6' }}>₹{summaryMetrics.cardAmt.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className={styles.toolbar}>
          <div className={styles.searchRow}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="🔍 Search by Bill # (e.g. SGK100245), Customer Mobile, Name, or Dish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {(searchTerm || dateFilter !== 'ALL' || orderTypeFilter !== 'ALL' || tableFilter !== 'ALL' || modeFilter !== 'ALL' || statusFilter !== 'ALL' || staffFilter !== 'ALL') && (
              <button
                type="button"
                className={styles.btnResetFilters}
                onClick={handleResetFilters}
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className={styles.filterGrid}>
            {/* Date Filter */}
            <select
              className={styles.filterSelect}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="ALL">📅 All Dates</option>
              <option value="TODAY">📅 Today</option>
              <option value="YESTERDAY">📅 Yesterday</option>
              <option value="WEEK">📅 Last 7 Days</option>
              <option value="MONTH">📅 This Month</option>
              <option value="CUSTOM">📅 Custom Date...</option>
            </select>

            {dateFilter === 'CUSTOM' && (
              <input
                type="date"
                className={styles.filterSelect}
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
            )}

            {/* Order Type Filter */}
            <select
              className={styles.filterSelect}
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
            >
              <option value="ALL">🍽️ All Order Types</option>
              <option value="DINE_IN">🍽️ Dine-In</option>
              <option value="TAKEAWAY">🥡 Takeaway</option>
              <option value="PARCEL">📦 Parcel</option>
              <option value="DELIVERY">🛵 Delivery</option>
              <option value="WALK_IN">🚶 Walk-In</option>
              <option value="COUNTER">🏪 Counter</option>
            </select>

            {/* Table Filter */}
            <select
              className={styles.filterSelect}
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
            >
              <option value="ALL">🪑 All Tables</option>
              {tablesList.map(t => (
                <option key={t} value={t}>Table #{t}</option>
              ))}
            </select>

            {/* Payment Mode */}
            <select
              className={styles.filterSelect}
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
            >
              <option value="ALL">💳 All Payment Modes</option>
              <option value="CASH">💵 Cash</option>
              <option value="UPI">📱 UPI</option>
              <option value="CARD">💳 Card</option>
              <option value="SPLIT">➗ Split Payment</option>
            </select>

            {/* Payment Status */}
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">🏷️ All Statuses</option>
              <option value="PAID">✅ Paid / Settled</option>
              <option value="PENDING">⏳ Pending</option>
              <option value="VOIDED">❌ Voided / Cancelled</option>
              <option value="REFUNDED">↩️ Refunded</option>
            </select>

            {/* Staff Filter */}
            <select
              className={styles.filterSelect}
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
            >
              <option value="ALL">👨‍🍳 All Staff</option>
              {staffList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bills List Body */}
        <div className={styles.body}>
          {filteredBills.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📭</div>
              <div>No bills match the selected filters.</div>
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}>
                Try resetting filters or click <strong>+ New Manual Bill</strong> to generate one.
              </div>
            </div>
          ) : (
            filteredBills.map((b) => {
              const tableInfo = formatTableDisplay(b.orderType, b.tableNumber);
              const isPaid = (b.paymentStatus || 'PAID').toUpperCase() === 'PAID';
              const isVoided = (b.paymentStatus || '').toUpperCase() === 'VOIDED' || (b.paymentStatus || '').toUpperCase() === 'CANCELLED';
              const isRefunded = (b.paymentStatus || '').toUpperCase().includes('REFUND');

              return (
                <div key={b.id || b.billNumber} className={styles.billCard}>
                  {/* Top Row: Bill #, Order Type, Status & Duplicate Badges */}
                  <div className={styles.cardTopRow}>
                    <div className={styles.billNumberTag}>
                      <span className={styles.billNumberText}>#{b.billNumber}</span>
                      <span className={styles.typeBadge}>{formatBillTitle(b.orderType)}</span>
                      {isPaid && <span className={styles.statusBadgePaid}>PAID</span>}
                      {isVoided && <span className={styles.statusBadgeVoided}>VOIDED</span>}
                      {isRefunded && <span className={styles.statusBadgePending}>REFUNDED</span>}
                      {b.isDuplicate && (
                        <span className={styles.reprintBadge}>
                          REPRINT {b.reprintCount ? `#${b.reprintCount}` : ''}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {new Date(b.settledAt || b.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </div>
                  </div>

                  {/* Metadata Row: Table, Persons, Cashier, Customer */}
                  <div className={styles.cardMetaRow}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>{tableInfo.label}:</span>
                      <span className={styles.metaVal}>{tableInfo.value}</span>
                    </div>
                    {b.persons && (
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Persons:</span>
                        <span className={styles.metaVal}>{b.persons}</span>
                      </div>
                    )}
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Cashier:</span>
                      <span className={styles.metaVal}>{b.cashierName || 'Admin'}</span>
                    </div>
                    {b.waiterName && (
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Waiter:</span>
                        <span className={styles.metaVal}>{b.waiterName}</span>
                      </div>
                    )}
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Customer:</span>
                      <span className={styles.metaVal}>
                        {b.customer?.name || 'Walk-in'} {b.customer?.phone ? `(${b.customer.phone})` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Items Summary (English Only) */}
                  <div className={styles.itemsSummary}>
                    {(b.items || []).map((it, idx) => (
                      <span key={idx} style={{ marginRight: '8px' }}>
                        {sanitizeEnglishTitle(it.title || 'Item')} × {it.quantity || 1}
                        {idx < (b.items || []).length - 1 ? ' • ' : ''}
                      </span>
                    ))}
                  </div>

                  {/* Bottom Row: Amount & Actions */}
                  <div className={styles.cardBottomRow}>
                    <div className={styles.totalBox}>
                      <span className={styles.totalLabel}>Total:</span>
                      <span className={styles.totalAmount}>₹{Number(b.totalAmount || 0).toFixed(2)}</span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '6px' }}>
                        via <strong style={{ color: '#cbd5e1' }}>{b.paymentMode || 'CASH'}</strong>
                      </span>
                      {b.transactionRef && (
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '4px' }}>
                          (Ref: {b.transactionRef})
                        </span>
                      )}
                    </div>

                    <div className={styles.cardActions}>
                      {/* View Thermal Receipt */}
                      <button
                        type="button"
                        className={`${styles.btnAction} ${styles.btnActionPrimary}`}
                        onClick={() => {
                          setViewingBill(b);
                          setViewPaperWidth('80MM');
                        }}
                        title="View exact thermal receipt layout"
                      >
                        👁️ View Slip
                      </button>

                      {/* 80mm Print */}
                      <button
                        type="button"
                        className={styles.btnAction}
                        onClick={() => handlePrintSlip(b, '80MM')}
                        title="Direct print on 80mm (3-inch) printer"
                      >
                        🖨️ 80mm
                      </button>

                      {/* 58mm Print */}
                      <button
                        type="button"
                        className={styles.btnAction}
                        onClick={() => handlePrintSlip(b, '58MM')}
                        title="Direct print on 58mm (2-inch) compact printer"
                      >
                        🖨️ 58mm
                      </button>

                      {/* Duplicate Reprint */}
                      <button
                        type="button"
                        className={`${styles.btnAction} ${styles.btnActionWarning}`}
                        onClick={() => handleDuplicateReprint(b)}
                        title="Reprint with DUPLICATE BILL watermark"
                      >
                        🔁 Reprint
                      </button>

                      {/* Edit Bill */}
                      <button
                        type="button"
                        className={styles.btnAction}
                        onClick={() => {
                          if (onOpenEditBill) onOpenEditBill(b);
                        }}
                        title="Edit bill items, discount, rate, or customer"
                      >
                        ✏️ Edit
                      </button>

                      {/* A4 Invoice */}
                      <button
                        type="button"
                        className={styles.btnAction}
                        onClick={() => handlePrintA4(b)}
                        title="Print standard A4/A5 tax invoice"
                      >
                        📄 A4
                      </button>

                      {/* Void / Cancel Bill */}
                      {!isVoided && (
                        <button
                          type="button"
                          className={`${styles.btnAction} ${styles.btnActionDanger}`}
                          onClick={() => {
                            setVoidingBill(b);
                            setVoidReason('');
                          }}
                          title="Void/Cancel this bill with mandatory audit reason"
                        >
                          ❌ Void
                        </button>
                      )}

                      {/* Refund Bill */}
                      {!isVoided && !isRefunded && (
                        <button
                          type="button"
                          className={styles.btnAction}
                          onClick={() => {
                            setRefundingBill(b);
                            setRefundAmount(String(b.totalAmount));
                            setRefundReason('');
                          }}
                          title="Process full or partial customer refund"
                        >
                          ↩️ Refund
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── MODAL: View Thermal Slip (Exact Sample Reference) ─── */}
      {viewingBill && (
        <div className={styles.receiptModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setViewingBill(null); }}>
          <div className={styles.receiptModalBox}>
            <div className={styles.receiptModalHeader}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8', margin: 0 }}>
                  🧾 Thermal Receipt Preview
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Bill #{viewingBill.billNumber} • Exact Sri Gokulam Template
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  style={{
                    background: viewPaperWidth === '80MM' ? '#10b981' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: 'none',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                  onClick={() => setViewPaperWidth('80MM')}
                >
                  80mm
                </button>
                <button
                  type="button"
                  style={{
                    background: viewPaperWidth === '58MM' ? '#10b981' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: 'none',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                  onClick={() => setViewPaperWidth('58MM')}
                >
                  58mm
                </button>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setViewingBill(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className={styles.receiptScrollArea}>
              <div
                dangerouslySetInnerHTML={{
                  __html: generateThermalSlipHtml({
                    billNumber: viewingBill.billNumber,
                    tableNumber: viewingBill.tableNumber,
                    orderType: viewingBill.orderType,
                    persons: viewingBill.persons || 1,
                    customer: viewingBill.customer,
                    cashierName: viewingBill.cashierName || currentUser.name,
                    waiterName: viewingBill.waiterName || '',
                    items: viewingBill.items || [],
                    subtotal: viewingBill.subtotal || 0,
                    discountAmount: viewingBill.discountAmount || 0,
                    discountReason: viewingBill.discountReason,
                    packagingCharge: viewingBill.packagingCharge || 0,
                    deliveryCharge: viewingBill.deliveryCharge || 0,
                    serviceChargeAmount: viewingBill.serviceChargeAmount || 0,
                    cgst: viewingBill.cgst || 0,
                    sgst: viewingBill.sgst || 0,
                    roundOff: viewingBill.roundOff || 0,
                    totalAmount: viewingBill.totalAmount || 0,
                    paymentMode: viewingBill.paymentMode || 'UPI',
                    paymentStatus: viewingBill.paymentStatus || 'Paid',
                    splitDetails: viewingBill.splitDetails,
                    transactionRef: viewingBill.transactionRef || '',
                    settledAt: viewingBill.settledAt || viewingBill.createdAt,
                    paperWidth: viewPaperWidth,
                    isDuplicate: !!viewingBill.isDuplicate,
                    reprintCount: viewingBill.reprintCount || 0,
                    settings,
                    standalonePage: false,
                  })
                }}
              />
            </div>

            <div className={styles.receiptButtonsRow}>
              <button
                type="button"
                className={styles.btnAction}
                onClick={() => handlePrintSlip(viewingBill, viewPaperWidth, false)}
                style={{ background: '#059669', borderColor: '#10b981', color: '#fff', fontWeight: 'bold' }}
              >
                🖨️ Print Receipt ({viewPaperWidth})
              </button>
              <button
                type="button"
                className={styles.btnAction}
                onClick={() => handleDuplicateReprint(viewingBill)}
                style={{ background: '#b91c1c', borderColor: '#ef4444', color: '#fff', fontWeight: 'bold' }}
              >
                🔁 Reprint Duplicate
              </button>
              <button
                type="button"
                className={styles.btnAction}
                onClick={() => setViewingBill(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Void / Cancel Bill Prompt ─── */}
      {voidingBill && (
        <div className={styles.receiptModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setVoidingBill(null); }}>
          <div className={styles.receiptModalBox} style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444', margin: 0 }}>
              ❌ Authorize Void for Bill #{voidingBill.billNumber}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Amount: <strong style={{ color: '#f8fafc' }}>₹{voidingBill.totalAmount}</strong> • Table #{voidingBill.tableNumber}
            </p>

            <form onSubmit={handleConfirmVoid} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                  Mandatory Reason for Cancellation:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wrong items entered, customer changed mind"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    color: '#fff',
                    fontSize: '0.82rem',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                  Manager Authorization PIN (Default: 1234):
                </label>
                <input
                  type="password"
                  required
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    color: '#fff',
                    fontSize: '0.82rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.btnAction}
                  onClick={() => setVoidingBill(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={voidLoading}
                  style={{
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.45rem 1rem',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {voidLoading ? 'Voiding...' : 'Confirm Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Refund Bill Prompt ─── */}
      {refundingBill && (
        <div className={styles.receiptModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setRefundingBill(null); }}>
          <div className={styles.receiptModalBox} style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fbbf24', margin: 0 }}>
              ↩️ Process Refund for Bill #{refundingBill.billNumber}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Original Paid: <strong style={{ color: '#10b981' }}>₹{refundingBill.totalAmount}</strong> • Mode: {refundingBill.paymentMode}
            </p>

            <form onSubmit={handleConfirmRefund} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                  Refund Amount (₹):
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={refundingBill.totalAmount}
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    color: '#fff',
                    fontSize: '0.82rem',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                  Mandatory Refund Reason:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dish quality issue, billing correction"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    color: '#fff',
                    fontSize: '0.82rem',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                  Manager PIN (Default: 1234):
                </label>
                <input
                  type="password"
                  required
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    color: '#fff',
                    fontSize: '0.82rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.btnAction}
                  onClick={() => setRefundingBill(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundLoading}
                  style={{
                    background: '#f59e0b',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.45rem 1rem',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {refundLoading ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
