'use client';

import { useState, useMemo } from 'react';
import styles from './BillSlipFormatDesigner.module.css';
import { DEFAULT_BILL_SLIP_FORMAT, generateThermalReceiptText } from '@/lib/thermalSlipFormatter';

// Sample dishes to render realistic live slip preview
const SAMPLE_PREVIEW_ITEMS = [
  {
    title: 'Special Ghee Podi Roast',
    tamilTitle: 'நெய் பொடி ரோஸ்ட்',
    price: 120,
    quantity: 1,
    variant: 'Extra Ghee Roast',
    addOns: ['Gunpowder Podi Cup'],
  },
  {
    title: 'Gokulam Button Sambar Idli',
    tamilTitle: 'மினி சாம்பார் இட்லி (14 pcs)',
    price: 85,
    quantity: 2,
    variant: 'Podi Button Idli',
  },
  {
    title: 'South Indian Filter Coffee',
    tamilTitle: 'கும்பகோணம் டிகிரி காபி',
    price: 40,
    quantity: 2,
  },
];

export default function BillSlipFormatDesigner({
  currentSettings = {},
  onSaveSuccess,
  currentUser = { name: 'Admin', role: 'SUPER_ADMIN' },
  isModal = false,
  onClose,
}) {
  // Initialize state from existing settings or defaults
  const [formData, setFormData] = useState({
    ...DEFAULT_BILL_SLIP_FORMAT,
    ...(currentSettings?.bill_slip_format || {}),
  });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Live generated receipt preview using current form values
  const liveSlipText = useMemo(() => {
    return generateThermalReceiptText({
      billNumber: 'SGR-2026-8842',
      tableNumber: '04',
      orderType: 'DINE_IN',
      customer: {
        name: 'Muthukumar Alagappan',
        phone: '+91 94431 88990',
        tag: 'Regular Patron',
        gstin: '33AAACM1234F1Z1',
      },
      cashierName: currentUser.name || 'Rajan (POS 01)',
      items: SAMPLE_PREVIEW_ITEMS,
      subtotal: 370,
      discountAmount: 37,
      discountReason: 'Loyalty 10% Off',
      serviceChargeAmount: 0,
      packagingCharge: 0,
      deliveryCharge: 0,
      cgst: 8.33,
      sgst: 8.33,
      roundOff: 0.34,
      totalAmount: 350,
      paymentMode: 'ONLINE_UPI',
      transactionRef: 'UPI/2026/894101',
      settledAt: new Date().toISOString(),
      settings: currentSettings,
      formatOverrides: formData,
    });
  }, [formData, currentSettings, currentUser]);

  // Save Format Settings to API
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_SETTINGS',
          section: 'bill_slip_format',
          data: formData,
          caller: { name: currentUser.name, role: currentUser.role },
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('success', 'Bill Slip format template saved successfully!');
        if (onSaveSuccess) onSaveSuccess(formData);
      } else {
        showToast('error', data.error || 'Failed to save format');
      }
    } catch (e) {
      showToast('error', 'Network error saving slip format: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Test Print to Thermal Printer
  const handleTestPrint = () => {
    const is58mm = formData.paperWidth === '58MM';
    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) {
      showToast('error', 'Pop-up blocked. Please allow pop-ups for test printing.');
      return;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Test Print - Bill Slip Format</title>
  <style>
    @page { size: ${is58mm ? '58mm' : '80mm'} auto; margin: 0; }
    body { margin: 0; padding: ${is58mm ? '2mm' : '4mm'}; background: #ffffff; color: #000000; width: ${is58mm ? '48mm' : '72mm'}; }
    pre { font-family: 'Courier New', Courier, monospace; font-size: ${is58mm ? '9pt' : '10.5pt'}; line-height: 1.25; margin: 0; white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <pre>${liveSlipText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
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
    showToast('success', 'Sending sample test print to thermal printer...');
  };

  // Reset to default
  const handleResetDefaults = () => {
    if (confirm('Reset bill slip format to Sri Gokulam recommended defaults?')) {
      setFormData(DEFAULT_BILL_SLIP_FORMAT);
      showToast('success', 'Reset format to recommended defaults.');
    }
  };

  const content = (
    <div className={styles.designerContainer}>
      {/* Left Columns: Format Configurations */}
      <div className={styles.formSection}>
        {toast && (
          <div style={{
            background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: toast.type === 'success' ? '#6ee7b7' : '#fca5a5',
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
          }}>
            {toast.type === 'success' ? '✅ ' : '⚠️ '}
            {toast.message}
          </div>
        )}

        {/* 1. Restaurant Header & Identity */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              🏪 Restaurant Slip Header &amp; Branding
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Printed at top of every 80mm &amp; 58mm slip
            </span>
          </div>

          <div className={styles.formGrid2}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Restaurant Name (English)</label>
              <input
                type="text"
                className={styles.input}
                value={formData.restaurantNameEnglish || ''}
                onChange={e => handleFieldChange('restaurantNameEnglish', e.target.value)}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Restaurant Name (Tamil)</label>
              <input
                type="text"
                className={styles.input}
                value={formData.restaurantNameTamil || ''}
                onChange={e => handleFieldChange('restaurantNameTamil', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Tagline / Heritage Speciality</label>
            <input
              type="text"
              className={styles.input}
              value={formData.tagline || ''}
              onChange={e => handleFieldChange('tagline', e.target.value)}
            />
          </div>

          <div className={styles.formGrid2}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Address Line 1</label>
              <input
                type="text"
                className={styles.input}
                value={formData.addressLine1 || ''}
                onChange={e => handleFieldChange('addressLine1', e.target.value)}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Address Line 2 (City &amp; PIN)</label>
              <input
                type="text"
                className={styles.input}
                value={formData.addressLine2 || ''}
                onChange={e => handleFieldChange('addressLine2', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGrid2}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Primary Phone</label>
              <input
                type="text"
                className={styles.input}
                value={formData.phonePrimary || ''}
                onChange={e => handleFieldChange('phonePrimary', e.target.value)}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Secondary Phone / WhatsApp</label>
              <input
                type="text"
                className={styles.input}
                value={formData.phoneSecondary || ''}
                onChange={e => handleFieldChange('phoneSecondary', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGrid2}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>GSTIN Registration No</label>
              <input
                type="text"
                className={styles.input}
                value={formData.gstin || ''}
                onChange={e => handleFieldChange('gstin', e.target.value.toUpperCase())}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>FSSAI License No</label>
              <input
                type="text"
                className={styles.input}
                value={formData.fssaiNumber || ''}
                onChange={e => handleFieldChange('fssaiNumber', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 2. Paper Size & Header Invocation */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              📄 Paper Size &amp; Invocation Note
            </h3>
          </div>

          <div className={styles.formGrid2}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Default Paper Roll Width</label>
              <select
                className={styles.input}
                value={formData.paperWidth || '80MM'}
                onChange={e => handleFieldChange('paperWidth', e.target.value)}
              >
                <option value="80MM">3-Inch Thermal Roll (80mm - TVSE RP3200 Plus, 42 Cols)</option>
                <option value="58MM">2-Inch Compact Thermal Roll (58mm - Mobile/EDC, 32 Cols)</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Top Header Invocation Note</label>
              <input
                type="text"
                className={styles.input}
                value={formData.headerNote || ''}
                placeholder="|| ஸ்ரீ கணேசாய நமஹ ||"
                onChange={e => handleFieldChange('headerNote', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 3. Content Visibility Toggles */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              👁️ Content &amp; Section Visibility Toggles
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Enable/disable specific elements on the slip
            </span>
          </div>

          <div className={styles.toggleGrid}>
            <div className={styles.toggleItem}>
              <span className={styles.toggleLabel}>Show Logo / ASCII Border</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={!!formData.showLogoArt}
                  onChange={e => handleFieldChange('showLogoArt', e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.toggleItem}>
              <span className={styles.toggleLabel}>Show Tamil Dish Names</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={!!formData.showTamilItemNames}
                  onChange={e => handleFieldChange('showTamilItemNames', e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.toggleItem}>
              <span className={styles.toggleLabel}>Show Customer Details</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={!!formData.showCustomerDetails}
                  onChange={e => handleFieldChange('showCustomerDetails', e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.toggleItem}>
              <span className={styles.toggleLabel}>Show Cashier Name</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={!!formData.showCashierName}
                  onChange={e => handleFieldChange('showCashierName', e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.toggleItem}>
              <span className={styles.toggleLabel}>Show Order Type &amp; Table</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={!!formData.showOrderType}
                  onChange={e => handleFieldChange('showOrderType', e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.toggleItem}>
              <span className={styles.toggleLabel}>Show CGST &amp; SGST Tax Lines</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={!!formData.showTaxBreakdown}
                  onChange={e => handleFieldChange('showTaxBreakdown', e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.toggleItem}>
              <span className={styles.toggleLabel}>Show GSTIN on Receipt</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={!!formData.showGstinNumber}
                  onChange={e => handleFieldChange('showGstinNumber', e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.toggleItem}>
              <span className={styles.toggleLabel}>Show FSSAI License Number</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={!!formData.showFssaiNumber}
                  onChange={e => handleFieldChange('showFssaiNumber', e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.toggleItem}>
              <span className={styles.toggleLabel}>Show Payment Mode &amp; UTR</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={!!formData.showPaymentMode}
                  onChange={e => handleFieldChange('showPaymentMode', e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.toggleItem}>
              <span className={styles.toggleLabel}>Show UPI QR / VPA on Slip</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={!!formData.showBarcodeQr}
                  onChange={e => handleFieldChange('showBarcodeQr', e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>

          {formData.showBarcodeQr && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>UPI Payment VPA for Receipt QR Code</label>
              <input
                type="text"
                className={styles.input}
                value={formData.upiQrVpa || ''}
                placeholder="srigokulam@sbi"
                onChange={e => handleFieldChange('upiQrVpa', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* 4. Footer Greetings & Disclaimer */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              🙏 Footer Greetings &amp; Disclaimers
            </h3>
          </div>

          <div className={styles.formGrid2}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Tamil Closing Greeting</label>
              <input
                type="text"
                className={styles.input}
                value={formData.footerGreetingTamil || ''}
                placeholder="நன்றி! மீண்டும் வருக!"
                onChange={e => handleFieldChange('footerGreetingTamil', e.target.value)}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>English Closing Greeting</label>
              <input
                type="text"
                className={styles.input}
                value={formData.footerGreetingEnglish || ''}
                placeholder="Thank You! Visit Again For Blissful Dining!"
                onChange={e => handleFieldChange('footerGreetingEnglish', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Return Policy / Counter Disclaimer</label>
            <input
              type="text"
              className={styles.input}
              value={formData.footerDisclaimer || ''}
              placeholder="Goods once sold cannot be returned. Please check bill before leaving."
              onChange={e => handleFieldChange('footerDisclaimer', e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Technology Partner Credit</label>
            <input
              type="text"
              className={styles.input}
              value={formData.techPartnerNote || ''}
              onChange={e => handleFieldChange('techPartnerNote', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Right Column: Live Simulated Thermal Paper */}
      <div className={styles.previewCol}>
        <div className={styles.previewCard}>
          <div className={styles.previewToolbar}>
            <strong style={{ fontSize: '0.88rem', color: '#10b981' }}>
              🖨️ Real-Time Thermal Slip Preview
            </strong>
            <span style={{ fontSize: '0.72rem', background: '#2563eb', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
              {formData.paperWidth || '80MM'} Roll
            </span>
          </div>

          <div className={styles.receiptContainer} data-width={formData.paperWidth || '80MM'}>
            <pre className={styles.receiptPre}>{liveSlipText}</pre>
          </div>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.btnSave}
              onClick={handleSave}
              disabled={saving}
              title="Save bill slip format template to database"
            >
              {saving ? 'Saving...' : '💾 Save Slip Format'}
            </button>

            <button
              type="button"
              className={styles.btnTestPrint}
              onClick={handleTestPrint}
              title="Test print sample slip on connected thermal printer"
            >
              🖨️ Test Print Slip
            </button>

            <button
              type="button"
              className={styles.btnReset}
              onClick={handleResetDefaults}
              title="Reset format fields to defaults"
            >
              🔄 Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // If presented as a modal dialog from POS
  if (isModal) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          overflowY: 'auto',
        }}
        onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
      >
        <div
          style={{
            background: 'var(--bg-card, #1e293b)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '1200px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}
        >
          <div
            style={{
              padding: '1rem 1.5rem',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(16, 185, 129, 0.15) 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', margin: 0 }}>
                ⚙️ Bill Slip &amp; Thermal Receipt Designer
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Customize restaurant slip header, paper width, statutory info, and greetings
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.2rem 0.5rem',
                }}
              >
                ✕
              </button>
            )}
          </div>
          <div style={{ padding: '1.25rem', overflowY: 'auto' }}>
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
}
