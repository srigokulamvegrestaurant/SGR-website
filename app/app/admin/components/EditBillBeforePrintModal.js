'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './EditBillBeforePrintModal.module.css';
import {
  generateThermalSlipHtml,
  generateThermalReceiptText,
  generateA4TaxInvoiceHtml,
  sanitizeEnglishTitle,
  formatBillTitle,
  formatTableDisplay
} from '@/lib/thermalSlipFormatter';

export default function EditBillBeforePrintModal(props) {
  if (!props.isOpen || !props.bill) return null;
  return <EditBillDialog {...props} />;
}

function EditBillDialog({
  isOpen,
  onClose,
  bill,
  initialSlip = '',
  settings = {},
  currentUser = { name: 'Admin', role: 'SUPER_ADMIN' },
  onSaved, // callback(updatedBill, thermalReceipt)
}) {

  // Editor mode: 'VISUAL' | 'RAW' | 'A4'
  const [editorMode, setEditorMode] = useState('VISUAL');

  // Order meta fields
  const [orderType, setOrderType] = useState(bill.orderType || 'DINE_IN');
  const [tableNumber, setTableNumber] = useState(bill.tableNumber || '04');
  const [persons, setPersons] = useState(bill.persons || 3);
  const [cashierName, setCashierName] = useState(bill.cashierName || currentUser.name || 'Admin');
  const [waiterName, setWaiterName] = useState(bill.waiterName || 'Captain Murugan');

  // Customer fields
  const [customer, setCustomer] = useState({
    name: bill.customer?.name || 'Walk-in Guest',
    phone: bill.customer?.phone || '',
    gstin: bill.customer?.gstin || '',
    address: bill.customer?.address || '',
  });

  // Items (English Only)
  const [items, setItems] = useState(
    (bill.items || []).map(it => ({
      id: it.id,
      title: sanitizeEnglishTitle(it.title || 'Item'),
      tamilTitle: it.tamilTitle || '',
      price: Number(it.price) || 0,
      quantity: Math.max(1, Number(it.quantity) || 1),
      variant: it.variant || null,
      addOns: it.addOns || [],
      specialNotes: it.specialNotes || '',
    }))
  );

  // New item form inline
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', price: '', quantity: 1, tamilTitle: '' });

  // Discounts & Charges
  const [discountPercent, setDiscountPercent] = useState(bill.discountPercent || '');
  const [discountFlat, setDiscountFlat] = useState(bill.discountFlat || bill.discountAmount || '');
  const [discountReason, setDiscountReason] = useState(bill.discountReason || 'Discount');
  const [packagingCharge, setPackagingCharge] = useState(bill.packagingCharge || '');
  const [deliveryCharge, setDeliveryCharge] = useState(bill.deliveryCharge || '');
  const [paymentMode, setPaymentMode] = useState(bill.paymentMode || 'UPI');
  const [transactionRef, setTransactionRef] = useState(bill.transactionRef || '');

  // Format Toggles for this bill print
  const [paperWidth, setPaperWidth] = useState(settings?.bill_slip_format?.paperWidth || '80MM');
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
  const [customFooterNote, setCustomFooterNote] = useState('');

  // Raw ESC/POS text
  const [rawSlipText, setRawSlipText] = useState(initialSlip || bill.thermalSlip || '');

  // Submitting state & copy notice
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.price) || 0) * (it.quantity || 1), 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    if (Number(discountFlat) > 0) return Math.min(subtotal, Number(discountFlat));
    if (Number(discountPercent) > 0) return Math.min(subtotal, (subtotal * Number(discountPercent)) / 100);
    return 0;
  }, [subtotal, discountFlat, discountPercent]);

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const packAmount = Math.max(0, Number(packagingCharge) || 0);
  const delAmount = Math.max(0, Number(deliveryCharge) || 0);

  const cgstRate = showTaxBreakdown ? (settings?.billing_payments?.taxRateCgst ?? 2.5) : 0;
  const sgstRate = showTaxBreakdown ? (settings?.billing_payments?.taxRateSgst ?? 2.5) : 0;
  const taxable = discountedSubtotal;
  const cgst = (taxable * cgstRate) / 100;
  const sgst = (taxable * sgstRate) / 100;

  const rawTotal = taxable + cgst + sgst + packAmount + delAmount;
  const grandTotal = Math.round(rawTotal);
  const roundOff = Number((grandTotal - rawTotal).toFixed(2));

  // Live generated raw slip
  const generatedSlip = useMemo(() => {
    if (editorMode === 'RAW' && rawSlipText) {
      return rawSlipText;
    }
    return generateThermalReceiptText({
      billNumber: bill.billNumber,
      tableNumber,
      orderType,
      customer,
      cashierName,
      items,
      subtotal,
      discountAmount,
      discountReason,
      packagingCharge: packAmount,
      deliveryCharge: delAmount,
      serviceChargeAmount: bill.serviceChargeAmount || 0,
      cgst,
      sgst,
      roundOff,
      totalAmount: grandTotal,
      paymentMode,
      transactionRef,
      settledAt: bill.settledAt || bill.createdAt,
      isDuplicate: !!bill.isDuplicate,
      reprintCount: bill.reprintCount || 0,
      settings,
      formatOverrides: {
        paperWidth,
        showTaxBreakdown,
        footerDisclaimer: customFooterNote || undefined,
      },
    });
  }, [
    editorMode,
    rawSlipText,
    bill,
    tableNumber,
    orderType,
    customer,
    cashierName,
    items,
    subtotal,
    discountAmount,
    discountReason,
    packAmount,
    delAmount,
    cgst,
    sgst,
    roundOff,
    grandTotal,
    paymentMode,
    transactionRef,
    paperWidth,
    showTaxBreakdown,
    customFooterNote,
    settings,
  ]);

  // Live generated exact visual HTML slip
  const visualSlipHtml = useMemo(() => {
    return generateThermalSlipHtml({
      billNumber: bill.billNumber,
      tableNumber,
      orderType,
      persons,
      customer,
      cashierName,
      waiterName,
      items,
      subtotal,
      discountAmount,
      discountReason,
      packagingCharge: packAmount,
      deliveryCharge: delAmount,
      serviceChargeAmount: bill.serviceChargeAmount || 0,
      cgst,
      sgst,
      roundOff,
      totalAmount: grandTotal,
      paymentMode,
      paymentStatus: bill.paymentStatus || 'Paid',
      transactionRef,
      settledAt: bill.settledAt || bill.createdAt,
      paperWidth,
      isDuplicate: !!bill.isDuplicate,
      reprintCount: bill.reprintCount || 0,
      settings,
      formatOverrides: {
        paperWidth,
        showTaxBreakdown,
        footerDisclaimer: customFooterNote || undefined,
      },
      standalonePage: false,
    });
  }, [
    bill,
    tableNumber,
    orderType,
    persons,
    customer,
    cashierName,
    waiterName,
    items,
    subtotal,
    discountAmount,
    discountReason,
    packAmount,
    delAmount,
    cgst,
    sgst,
    roundOff,
    grandTotal,
    paymentMode,
    transactionRef,
    paperWidth,
    showTaxBreakdown,
    customFooterNote,
    settings,
  ]);

  // Synchronize raw slip text when toggling to RAW
  useEffect(() => {
    if (editorMode === 'RAW' && !rawSlipText) {
      setRawSlipText(generatedSlip);
    }
  }, [editorMode]);

  // Items manipulation
  const handleQtyChange = (idx, delta) => {
    setItems(prev => {
      const next = [...prev];
      const newQty = (next[idx].quantity || 1) + delta;
      if (newQty <= 0) return next.filter((_, i) => i !== idx);
      next[idx].quantity = newQty;
      return next;
    });
  };

  const handlePriceChange = (idx, newPrice) => {
    setItems(prev => {
      const next = [...prev];
      next[idx].price = Math.max(0, parseFloat(newPrice) || 0);
      return next;
    });
  };

  const handleTitleChange = (idx, newTitle) => {
    setItems(prev => {
      const next = [...prev];
      next[idx].title = sanitizeEnglishTitle(newTitle, 'Item');
      return next;
    });
  };

  const handleDeleteItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddNewItem = (e) => {
    e.preventDefault();
    if (!newItem.title.trim() || isNaN(newItem.price)) return;
    setItems(prev => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        title: sanitizeEnglishTitle(newItem.title.trim(), 'Custom Item'),
        tamilTitle: newItem.tamilTitle.trim(),
        price: Number(newItem.price),
        quantity: Math.max(1, Number(newItem.quantity) || 1),
      },
    ]);
    setNewItem({ title: '', price: '', quantity: 1, tamilTitle: '' });
    setShowAddItem(false);
  };

  // Direct Thermal Print using exact visual reference layout
  const handlePrintThermal = (targetWidth = paperWidth) => {
    const printWindow = window.open('', '_blank', 'width=460,height=750');
    if (!printWindow) {
      alert('Pop-up was blocked. Please allow pop-ups for thermal receipt printing.');
      return;
    }

    const html = generateThermalSlipHtml({
      billNumber: bill.billNumber,
      tableNumber,
      orderType,
      persons,
      customer,
      cashierName,
      waiterName,
      items,
      subtotal,
      discountAmount,
      discountReason,
      packagingCharge: packAmount,
      deliveryCharge: delAmount,
      serviceChargeAmount: bill.serviceChargeAmount || 0,
      cgst,
      sgst,
      roundOff,
      totalAmount: grandTotal,
      paymentMode,
      paymentStatus: bill.paymentStatus || 'Paid',
      transactionRef,
      settledAt: bill.settledAt || bill.createdAt,
      paperWidth: targetWidth,
      isDuplicate: !!bill.isDuplicate,
      reprintCount: bill.reprintCount || 0,
      settings,
      formatOverrides: {
        paperWidth: targetWidth,
        showTaxBreakdown,
        footerDisclaimer: customFooterNote || undefined,
      },
      standalonePage: true,
    });

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Print A4 Tax Invoice
  const handlePrintA4 = () => {
    const printWin = window.open('', '_blank', 'width=850,height=900');
    if (!printWin) return;
    const html = generateA4TaxInvoiceHtml({
      billNumber: bill.billNumber,
      tableNumber,
      orderType,
      customer,
      cashierName,
      items,
      subtotal,
      discountAmount,
      discountReason,
      packagingCharge: packAmount,
      deliveryCharge: delAmount,
      serviceChargeAmount: bill.serviceChargeAmount || 0,
      cgst,
      sgst,
      roundOff,
      totalAmount: grandTotal,
      paymentMode,
      transactionRef,
      settledAt: bill.settledAt || bill.createdAt,
      settings,
    });
    printWin.document.write(html);
    printWin.document.close();
  };

  // Save changes to DB & Print
  const handleSaveAndPrint = async () => {
    setSaving(true);
    setNotice('');
    try {
      const payload = {
        action: 'UPDATE_BILL',
        billNumber: bill.billNumber,
        billId: bill.id,
        callerName: currentUser.name,
        updatedFields: {
          tableNumber,
          orderType,
          persons: Number(persons) || 1,
          cashierName,
          waiterName,
          customer,
          items,
          discountPercent: Number(discountPercent) || 0,
          discountFlat: Number(discountFlat) || 0,
          discountReason,
          packagingCharge: packAmount,
          deliveryCharge: delAmount,
          paymentMode,
          transactionRef,
          thermalSlip: editorMode === 'RAW' ? rawSlipText : generatedSlip,
          formatOverrides: {
            paperWidth,
            showTaxBreakdown,
            footerDisclaimer: customFooterNote || undefined,
          },
        },
      };

      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setNotice('✅ Bill updated successfully!');
        if (onSaved) onSaved(data.bill, data.thermalReceipt);
        handlePrintThermal(paperWidth);
        setTimeout(() => onClose(), 600);
      } else {
        alert(data.error || 'Failed to update bill');
      }
    } catch (e) {
      alert('Error updating bill: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Copy Slip Text
  const handleCopyText = () => {
    navigator.clipboard.writeText(generatedSlip);
    setNotice('📋 Receipt text copied to clipboard!');
    setTimeout(() => setNotice(''), 3000);
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.headerTitle}>
              ✏️ Edit Bill #{bill.billNumber}
            </h2>
            <div className={styles.headerSub}>
              Modify items, English dish names, rates, order type, customer details, or print exact thermal slips
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Notice */}
        {notice && (
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#6ee7b7', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 'bold' }}>
            {notice}
          </div>
        )}

        {/* Body Split */}
        <div className={styles.body}>
          {/* Left: Interactive Edit Forms */}
          <div className={styles.formPanel}>
            {/* Top Toolbar */}
            <div className={styles.topToolbar}>
              <div className={styles.segmentedControl}>
                <button
                  type="button"
                  className={`${styles.segmentBtn} ${editorMode === 'VISUAL' ? styles.segmentActive : ''}`}
                  onClick={() => setEditorMode('VISUAL')}
                >
                  🧾 Visual Receipt
                </button>
                <button
                  type="button"
                  className={`${styles.segmentBtn} ${editorMode === 'RAW' ? styles.segmentActive : ''}`}
                  onClick={() => setEditorMode('RAW')}
                >
                  ⚙️ Raw Text
                </button>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Net: <strong style={{ color: '#10b981', fontSize: '0.95rem' }}>₹{grandTotal}</strong>
              </div>
            </div>

            {editorMode === 'RAW' ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
                  Directly modify the raw ESC/POS monospace receipt lines:
                </div>
                <textarea
                  className={styles.rawTextarea}
                  value={rawSlipText}
                  onChange={e => setRawSlipText(e.target.value)}
                  placeholder="Raw thermal slip text..."
                />
              </div>
            ) : (
              <>
                {/* 1. Order Type, Table & Staff Meta */}
                <div className={styles.cardSection}>
                  <div className={styles.sectionTitle}>
                    <span>🍽️ Order Type, Table &amp; Personnel</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                    <div>
                      <label className={styles.label}>Order Type</label>
                      <select
                        className={styles.input}
                        value={orderType}
                        onChange={e => setOrderType(e.target.value)}
                      >
                        <option value="DINE_IN">🍽️ Dine-In</option>
                        <option value="TAKEAWAY">🥡 Takeaway</option>
                        <option value="PARCEL">📦 Parcel</option>
                        <option value="DELIVERY">🛵 Delivery</option>
                        <option value="WALK_IN">🚶 Walk-In</option>
                        <option value="COUNTER">🏪 Counter</option>
                      </select>
                    </div>

                    <div>
                      <label className={styles.label}>Table / Token #</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={tableNumber}
                        onChange={e => setTableNumber(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={styles.label}>Persons / Guests</label>
                      <input
                        type="number"
                        min="1"
                        max="25"
                        className={styles.input}
                        value={persons}
                        onChange={e => setPersons(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={styles.label}>Cashier Name</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={cashierName}
                        onChange={e => setCashierName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={styles.label}>Waiter / Captain</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={waiterName}
                        onChange={e => setWaiterName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Customer Details */}
                <div className={styles.cardSection}>
                  <div className={styles.sectionTitle}>
                    <span>👤 Customer Mobile &amp; Details</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label className={styles.label}>Mobile Phone Number</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. +91 98765 43210"
                        value={customer.phone}
                        onChange={e => setCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className={styles.label}>Customer Name</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={customer.name}
                        onChange={e => setCustomer(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Line Items (English Only) */}
                <div className={styles.cardSection}>
                  <div className={styles.sectionTitle}>
                    <span>🍛 Itemized Dishes (English Names)</span>
                    <button
                      type="button"
                      className={styles.btnAddRow}
                      onClick={() => setShowAddItem(!showAddItem)}
                    >
                      {showAddItem ? '✕ Cancel' : '+ Add Item'}
                    </button>
                  </div>

                  {showAddItem && (
                    <form onSubmit={handleAddNewItem} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.4rem' }}>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Dish Name (English) *"
                          required
                          value={newItem.title}
                          onChange={e => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                        />
                        <input
                          type="number"
                          className={styles.input}
                          placeholder="Price (₹) *"
                          required
                          value={newItem.price}
                          onChange={e => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button type="submit" className={styles.btnPrintThermal} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                          + Add Dish
                        </button>
                      </div>
                    </form>
                  )}

                  <table className={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Item Name (English)</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Qty</th>
                        <th style={{ width: '75px', textAlign: 'right' }}>Rate (₹)</th>
                        <th style={{ width: '70px', textAlign: 'right' }}>Total</th>
                        <th style={{ width: '25px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={idx}>
                          <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{idx + 1}</td>
                          <td>
                            <input
                              type="text"
                              className={styles.input}
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', fontWeight: 600 }}
                              value={it.title}
                              onChange={(e) => handleTitleChange(idx, e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                              <button type="button" className={styles.qtyBtn} onClick={() => handleQtyChange(idx, -1)}>-</button>
                              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', minWidth: '18px', textAlign: 'center' }}>{it.quantity}</span>
                              <button type="button" className={styles.qtyBtn} onClick={() => handleQtyChange(idx, 1)}>+</button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              className={styles.input}
                              style={{ width: '65px', padding: '0.2rem', textAlign: 'right', fontSize: '0.78rem' }}
                              value={it.price}
                              onChange={(e) => handlePriceChange(idx, e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>
                            ₹{Math.round((it.price || 0) * (it.quantity || 1))}
                          </td>
                          <td>
                            <button type="button" className={styles.deleteBtn} onClick={() => handleDeleteItem(idx)}>
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 4. Adjustments & Payment */}
                <div className={styles.cardSection}>
                  <div className={styles.sectionTitle}>
                    <span>💳 Payment Mode &amp; Adjustments</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.4rem' }}>
                    <div>
                      <label className={styles.label}>Payment Mode</label>
                      <select
                        className={styles.input}
                        value={paymentMode}
                        onChange={e => setPaymentMode(e.target.value)}
                      >
                        <option value="UPI">📱 UPI</option>
                        <option value="CASH">💵 Cash</option>
                        <option value="CARD">💳 Card</option>
                        <option value="SPLIT">➗ Split</option>
                      </select>
                    </div>

                    <div>
                      <label className={styles.label}>Discount (₹)</label>
                      <input
                        type="number"
                        className={styles.input}
                        value={discountFlat}
                        onChange={e => setDiscountFlat(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={styles.label}>Parcel Fee (₹)</label>
                      <input
                        type="number"
                        className={styles.input}
                        value={packagingCharge}
                        onChange={e => setPackagingCharge(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={styles.label}>Delivery Fee (₹)</label>
                      <input
                        type="number"
                        className={styles.input}
                        value={deliveryCharge}
                        onChange={e => setDeliveryCharge(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '0.4rem' }}>
                    <label className={styles.label}>Txn Ref / UTR / Auth Code</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. UPI/2026/894101"
                      value={transactionRef}
                      onChange={e => setTransactionRef(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right: Live Slip Preview (Exact Sample Match) */}
          <div className={styles.previewPanel}>
            <div className={styles.previewToolbar}>
              <strong style={{ fontSize: '0.82rem', color: '#10b981' }}>
                🖨️ Live Thermal Preview
              </strong>
              <div className={styles.widthPills}>
                <button
                  type="button"
                  className={`${styles.widthPill} ${paperWidth === '80MM' ? styles.widthPillActive : ''}`}
                  onClick={() => setPaperWidth('80MM')}
                >
                  80mm (Standard)
                </button>
                <button
                  type="button"
                  className={`${styles.widthPill} ${paperWidth === '58MM' ? styles.widthPillActive : ''}`}
                  onClick={() => setPaperWidth('58MM')}
                >
                  58mm (Compact)
                </button>
              </div>
            </div>

            {/* Rendered Thermal Paper Slip */}
            <div className={styles.receiptPaper} data-width={paperWidth}>
              {editorMode === 'RAW' ? (
                <pre className={styles.receiptPre}>{generatedSlip}</pre>
              ) : (
                <div
                  style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                  dangerouslySetInnerHTML={{ __html: visualSlipHtml }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={styles.footer}>
          <button type="button" className={styles.btnCancel} onClick={onClose} disabled={saving}>
            Close
          </button>

          <div className={styles.actionButtonGroup}>
            <button
              type="button"
              className={styles.btnAltAction}
              onClick={handleCopyText}
              title="Copy formatted receipt text"
            >
              📋 Copy Text
            </button>

            <button
              type="button"
              className={styles.btnAltAction}
              onClick={handlePrintA4}
              title="Print standard A4 GST tax invoice layout"
            >
              📄 Print A4 Invoice
            </button>

            <button
              type="button"
              className={styles.btnAltAction}
              onClick={() => handlePrintThermal(paperWidth)}
              title="Print slip directly using exact thermal receipt styling"
              style={{ borderColor: '#38bdf8', color: '#38bdf8' }}
            >
              🖨️ Print Slip ({paperWidth})
            </button>

            <button
              type="button"
              className={styles.btnPrintThermal}
              onClick={handleSaveAndPrint}
              disabled={saving}
              title="Save modified bill details into database and print thermal receipt"
            >
              {saving ? 'Saving...' : `💾 Save & Print Slip (₹${grandTotal})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
