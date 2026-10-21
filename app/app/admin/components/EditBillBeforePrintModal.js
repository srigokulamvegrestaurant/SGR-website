'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './EditBillBeforePrintModal.module.css';
import { generateThermalReceiptText, generateA4TaxInvoiceHtml } from '@/lib/thermalSlipFormatter';

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

  // Editor mode: 'FORM' | 'RAW'
  const [editorMode, setEditorMode] = useState('FORM');

  // Customer fields
  const [customer, setCustomer] = useState({
    name: bill.customer?.name || 'Walk-in Guest',
    phone: bill.customer?.phone || '',
    gstin: bill.customer?.gstin || '',
    address: bill.customer?.address || '',
  });

  // Items
  const [items, setItems] = useState(
    (bill.items || []).map(it => ({
      id: it.id,
      title: it.title || 'Item',
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
  const [paymentMode, setPaymentMode] = useState(bill.paymentMode || 'CASH');
  const [transactionRef, setTransactionRef] = useState(bill.transactionRef || '');

  // Format Toggles for this bill print
  const [paperWidth, setPaperWidth] = useState(settings?.bill_slip_format?.paperWidth || '80MM');
  const [showTamilItemNames, setShowTamilItemNames] = useState(true);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(true);
  const [showCustomerDetails, setShowCustomerDetails] = useState(true);
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

  // Live generated receipt string when in FORM mode
  const generatedSlip = useMemo(() => {
    if (editorMode === 'RAW') {
      return rawSlipText;
    }
    return generateThermalReceiptText({
      billNumber: bill.billNumber,
      tableNumber: bill.tableNumber,
      orderType: bill.orderType,
      customer,
      cashierName: bill.cashierName || currentUser.name,
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
      formatOverrides: {
        paperWidth,
        showTamilItemNames,
        showTaxBreakdown,
        showCustomerDetails,
        footerDisclaimer: customFooterNote || undefined,
      },
    });
  }, [
    editorMode,
    rawSlipText,
    bill,
    customer,
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
    showTamilItemNames,
    showTaxBreakdown,
    showCustomerDetails,
    customFooterNote,
    currentUser,
    settings,
  ]);

  // Keep rawSlipText in sync when switching to RAW mode
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
        title: newItem.title.trim(),
        tamilTitle: newItem.tamilTitle.trim(),
        price: Number(newItem.price),
        quantity: Math.max(1, Number(newItem.quantity) || 1),
      },
    ]);
    setNewItem({ title: '', price: '', quantity: 1, tamilTitle: '' });
    setShowAddItem(false);
  };

  // Direct Thermal Print
  const handlePrintThermal = (slipTextToPrint = generatedSlip) => {
    const is58mm = paperWidth === '58MM';
    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) {
      alert('Pop-up was blocked. Please allow pop-ups for thermal receipt printing.');
      return;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Thermal Receipt - ${bill.billNumber}</title>
  <style>
    @page {
      size: ${is58mm ? '58mm' : '80mm'} auto;
      margin: 0;
    }
    body {
      margin: 0;
      padding: ${is58mm ? '2mm' : '4mm'};
      background: #ffffff;
      color: #000000;
      width: ${is58mm ? '48mm' : '72mm'};
    }
    pre {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${is58mm ? '9pt' : '10.5pt'};
      line-height: 1.25;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <pre>${slipTextToPrint.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  <script>
    window.onload = function() {
      window.focus();
      window.print();
      setTimeout(function() { window.close(); }, 750);
    };
  </script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Print A4 Tax Invoice
  const handlePrintA4 = () => {
    const html = generateA4TaxInvoiceHtml({
      billNumber: bill.billNumber,
      tableNumber: bill.tableNumber,
      orderType: bill.orderType,
      customer,
      cashierName: bill.cashierName || currentUser.name,
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
      formatOverrides: {
        paperWidth: 'A4',
        footerDisclaimer: customFooterNote || undefined,
      },
    });

    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 400);
    }
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
            showTamilItemNames,
            showTaxBreakdown,
            showCustomerDetails,
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
        handlePrintThermal(data.thermalReceipt || generatedSlip);
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
              ✏️ Edit Bill Before Print #{bill.billNumber}
            </h2>
            <div className={styles.headerSub}>
              Modify items, rates, customer details, or customize the raw thermal printout before sending to printer
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
          {/* Left: Edit Controls */}
          <div className={styles.editPanel}>
            {/* Mode Switcher */}
            <div className={styles.modeToggleBar}>
              <button
                type="button"
                className={`${styles.modeTab} ${editorMode === 'FORM' ? styles.modeTabActive : ''}`}
                onClick={() => setEditorMode('FORM')}
              >
                📝 Visual Form &amp; Format Options
              </button>
              <button
                type="button"
                className={`${styles.modeTab} ${editorMode === 'RAW' ? styles.modeTabActive : ''}`}
                onClick={() => {
                  setRawSlipText(generatedSlip);
                  setEditorMode('RAW');
                }}
              >
                🖨️ Direct Raw ESC/POS Text Editor
              </button>
            </div>

            {editorMode === 'RAW' ? (
              /* Raw Text Editor Mode */
              <div className={styles.rawEditorWrap}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 'bold' }}>
                    🟢 Direct Monospace ESC/POS Editor (42 cols 80mm / 32 cols 58mm)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Type or edit anything directly
                  </span>
                </div>
                <textarea
                  className={styles.rawTextarea}
                  value={rawSlipText}
                  onChange={(e) => setRawSlipText(e.target.value)}
                  placeholder="Raw receipt text..."
                  spellCheck="false"
                />
              </div>
            ) : (
              /* Visual Form Mode */
              <>
                {/* 1. Customer Section */}
                <div className={styles.cardSection}>
                  <div className={styles.sectionTitle}>
                    <span>👤 Customer &amp; Tax Info</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Table #{bill.tableNumber} • {bill.orderType}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Customer Name</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={customer.name}
                        onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Phone</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={customer.phone}
                        onChange={(e) => setCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Customer GSTIN</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="33XXXXX0000X0Z0"
                        value={customer.gstin}
                        onChange={(e) => setCustomer(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Payment Method</label>
                      <select
                        className={styles.input}
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                      >
                        <option value="CASH">Cash</option>
                        <option value="ONLINE_UPI">UPI (GPay / PhonePe)</option>
                        <option value="CARD">Credit / Debit Card</option>
                        <option value="CREDIT_DUE">Credit / Due</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Items & Pricing Section */}
                <div className={styles.cardSection}>
                  <div className={styles.sectionTitle}>
                    <span>🍽️ Bill Items &amp; Rates ({items.length})</span>
                    <button
                      type="button"
                      style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}
                      onClick={() => setShowAddItem(!showAddItem)}
                    >
                      {showAddItem ? '✕ Close' : '+ Add Item'}
                    </button>
                  </div>

                  {/* Inline Add Item Form */}
                  {showAddItem && (
                    <form onSubmit={handleAddNewItem} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.4rem' }}>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Dish Name *"
                          required
                          value={newItem.title}
                          onChange={e => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                        />
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Tamil Name"
                          value={newItem.tamilTitle}
                          onChange={e => setNewItem(prev => ({ ...prev, tamilTitle: e.target.value }))}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.4rem' }}>
                        <input
                          type="number"
                          className={styles.input}
                          placeholder="Price (₹) *"
                          required
                          value={newItem.price}
                          onChange={e => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                        />
                        <input
                          type="number"
                          className={styles.input}
                          placeholder="Qty"
                          min="1"
                          value={newItem.quantity}
                          onChange={e => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        />
                        <button type="submit" className={styles.btnPrintThermal} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                          + Add
                        </button>
                      </div>
                    </form>
                  )}

                  <table className={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Qty</th>
                        <th style={{ width: '70px', textAlign: 'right' }}>Rate (₹)</th>
                        <th style={{ width: '60px', textAlign: 'right' }}>Total</th>
                        <th style={{ width: '25px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{it.title}</strong>
                            {it.tamilTitle && <div style={{ fontSize: '0.68rem', color: '#10b981' }}>{it.tamilTitle}</div>}
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
                              style={{ width: '60px', padding: '0.2rem', textAlign: 'right', fontSize: '0.78rem' }}
                              value={it.price}
                              onChange={(e) => handlePriceChange(idx, e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#38bdf8' }}>
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

                {/* 3. Adjustments & Format Toggles */}
                <div className={styles.cardSection}>
                  <div className={styles.sectionTitle}>
                    <span>⚙️ Format Options &amp; Extra Charges</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.4rem' }}>
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

                  {/* Format Toggles */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={showTamilItemNames}
                        onChange={e => setShowTamilItemNames(e.target.checked)}
                      />
                      <span>Show Tamil Names</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={showTaxBreakdown}
                        onChange={e => setShowTaxBreakdown(e.target.checked)}
                      />
                      <span>Show CGST/SGST Taxes</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={showCustomerDetails}
                        onChange={e => setShowCustomerDetails(e.target.checked)}
                      />
                      <span>Show Customer Details</span>
                    </label>
                  </div>

                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Custom One-Off Footer Note (e.g. Special thanks to Sri Murugan & family)"
                    value={customFooterNote}
                    onChange={e => setCustomFooterNote(e.target.value)}
                    style={{ marginTop: '0.35rem' }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Right: Live Slip Preview */}
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
                  80mm (3-Inch TVSE)
                </button>
                <button
                  type="button"
                  className={`${styles.widthPill} ${paperWidth === '58MM' ? styles.widthPillActive : ''}`}
                  onClick={() => setPaperWidth('58MM')}
                >
                  58mm (2-Inch)
                </button>
              </div>
            </div>

            {/* Rendered Thermal Paper Slip */}
            <div className={styles.receiptPaper} data-width={paperWidth}>
              <pre className={styles.receiptPre}>{generatedSlip}</pre>
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
              onClick={() => handlePrintThermal(generatedSlip)}
              title="Print slip directly without modifying database records"
              style={{ borderColor: '#38bdf8', color: '#38bdf8' }}
            >
              🖨️ Print Without Saving
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
