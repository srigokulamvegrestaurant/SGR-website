// lib/thermalSlipFormatter.js - High-Precision ESC/POS & A4 Invoice Engine for Sri Gokulam
// Supports 80mm (TVSE RP3200 Plus 3-inch), 58mm (2-inch compact), and Standard A4/A5 Tax Invoices

export const DEFAULT_BILL_SLIP_FORMAT = {
  restaurantNameEnglish: 'SRI GOKULAM VEG RESTAURANT',
  restaurantNameTamil: 'ஸ்ரீ கோகுலம் சைவ உணவகம்',
  tagline: 'Authentic Pure Vegetarian Chettinad',
  addressLine1: 'Main Road, Near Kovil',
  addressLine2: 'Karaikudi, Chettinad, Tamil Nadu - 630001',
  phonePrimary: '+91 94431 23456',
  phoneSecondary: '+91 98765 43210',
  email: 'contact@srigokulam.com',
  website: 'https://www.srigokulamvegrestaurant.com',
  gstin: '33AABCS1234F1Z8',
  fssaiNumber: '12423018000456',
  paperWidth: '80MM', // '80MM' | '58MM'
  headerNote: '|| ஸ்ரீ கணேசாய நமஹ ||',
  footerGreetingTamil: 'நன்றி! மீண்டும் வருக!',
  footerGreetingEnglish: 'Thank You! Visit Again For Blissful Dining!',
  footerDisclaimer: 'Goods once sold cannot be returned. Pls check bill before leaving counter.',
  techPartnerNote: 'Technology Partner: AJ Nanjil Tech Solutions (https://ajnanjiltechsolutions.com/)',
  showLogoArt: true,
  showTamilItemNames: true,
  showCashierName: true,
  showCustomerDetails: true,
  showOrderType: true,
  showTableNumber: true,
  showTaxBreakdown: true,
  showFssaiNumber: true,
  showGstinNumber: true,
  showPaymentMode: true,
  showTransactionRef: true,
  showItemAddons: true,
  showItemNotes: true,
  showBarcodeQr: true,
  upiQrVpa: 'srigokulam@sbi',
};

// Helper: center text within column width
function centerText(str = '', width = 42) {
  const s = String(str).trim();
  if (s.length >= width) return s.slice(0, width);
  const left = Math.floor((width - s.length) / 2);
  const right = width - s.length - left;
  return ' '.repeat(left) + s + ' '.repeat(right);
}

// Generate ESC/POS Thermal Receipt Text (80mm / 58mm)
export function generateThermalReceiptText({
  billNumber = `SGR-${new Date().getFullYear()}-0001`,
  tableNumber = 'TK',
  orderType = 'DINE_IN',
  customer = { name: 'Walk-in Guest', phone: '' },
  cashierName = 'Rajan (POS 01)',
  items = [],
  subtotal = 0,
  discountAmount = 0,
  discountReason = '',
  packagingCharge = 0,
  deliveryCharge = 0,
  serviceChargeAmount = 0,
  cgst = 0,
  sgst = 0,
  roundOff = 0,
  totalAmount = 0,
  paymentMode = 'CASH',
  splitDetails = null,
  transactionRef = '',
  settledAt = new Date().toISOString(),
  settings = {},
  formatOverrides = {},
}) {
  // Merge settings and format options
  const fmt = {
    ...DEFAULT_BILL_SLIP_FORMAT,
    ...(settings?.bill_slip_format || {}),
    ...(formatOverrides || {}),
  };

  const is58mm = fmt.paperWidth === '58MM';
  const width = is58mm ? 32 : 42;
  const line = '-'.repeat(width);
  const dline = '='.repeat(width);

  const dateStr = new Date(settledAt || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const orderTypeLabel =
    orderType === 'TAKEAWAY'
      ? 'TAKEAWAY / PARCEL'
      : orderType === 'DELIVERY'
      ? 'HOME DELIVERY'
      : `DINE-IN (T#${tableNumber})`;

  let receipt = '';

  // 1. Top Header Note
  if (fmt.headerNote) {
    receipt += `${centerText(fmt.headerNote, width)}\n`;
  }

  // 2. Logo / Decorative Art
  if (fmt.showLogoArt) {
    if (is58mm) {
      receipt += `${centerText('~*~ SRI GOKULAM ~*~', width)}\n`;
    } else {
      receipt += `${centerText('~*~*~*~*~ SRI GOKULAM VEG ~*~*~*~*~', width)}\n`;
    }
  }

  // 3. Restaurant Names & Tagline
  if (fmt.restaurantNameTamil) {
    receipt += `${centerText(fmt.restaurantNameTamil, width)}\n`;
  }
  if (fmt.restaurantNameEnglish) {
    receipt += `${centerText(fmt.restaurantNameEnglish, width)}\n`;
  }
  if (fmt.tagline) {
    receipt += `${centerText(fmt.tagline, width)}\n`;
  }

  // 4. Address & Contact
  const addr1 = fmt.addressLine1 || settings?.address || 'Karaikudi, Chettinad, Tamil Nadu';
  if (addr1) receipt += `${centerText(addr1, width)}\n`;
  if (fmt.addressLine2) receipt += `${centerText(fmt.addressLine2, width)}\n`;

  const phoneStr = fmt.phonePrimary || settings?.phone || '+91 94431 23456';
  receipt += `${centerText(`Phone: ${phoneStr}`, width)}\n`;

  // 5. GSTIN & FSSAI
  if (fmt.showGstinNumber && fmt.gstin) {
    if (is58mm) {
      receipt += `${centerText(`GSTIN: ${fmt.gstin}`, width)}\n`;
    } else {
      let statutory = `GSTIN: ${fmt.gstin}`;
      if (fmt.showFssaiNumber && fmt.fssaiNumber) {
        statutory += `  FSSAI: ${fmt.fssaiNumber}`;
      }
      receipt += `${centerText(statutory, width)}\n`;
    }
  }
  if (is58mm && fmt.showFssaiNumber && fmt.fssaiNumber) {
    receipt += `${centerText(`FSSAI: ${fmt.fssaiNumber}`, width)}\n`;
  }

  receipt += `${dline}\n`;

  // 6. Bill Header Meta
  if (is58mm) {
    receipt += `Bill No: ${billNumber}\n`;
    if (fmt.showOrderType) receipt += `Type:    ${orderTypeLabel}\n`;
    receipt += `Date:    ${dateStr}\n`;
    if (fmt.showCashierName) receipt += `Cashier: ${cashierName}\n`;
  } else {
    receipt += `Bill No:    ${String(billNumber).padEnd(16)} Date: ${dateStr}\n`;
    if (fmt.showOrderType) receipt += `Order Type: ${orderTypeLabel}\n`;
    if (fmt.showCashierName) receipt += `Cashier:    ${cashierName}\n`;
  }

  // Customer Details
  if (fmt.showCustomerDetails && customer && customer.name) {
    const custPhone = customer.phone ? ` (${customer.phone})` : '';
    const custTag = customer.tag ? ` [${customer.tag}]` : '';
    if (is58mm) {
      receipt += `Customer: ${customer.name}${custPhone}\n`;
    } else {
      receipt += `Customer:   ${customer.name}${custPhone}${custTag}\n`;
    }
    if (customer.gstin) {
      receipt += `Cust GSTIN: ${customer.gstin}\n`;
    }
  }

  // 7. Line Items Table
  receipt += `${line}\n`;
  if (is58mm) {
    // 32 cols: Name (15), Qty (3), Rate (6), Total (6) + spaces
    receipt += `Item            Qty   Rate Total\n`;
    receipt += `${line}\n`;
    items.forEach(it => {
      let titleStr = it.title || 'Item';
      if (it.variant) titleStr += ` (${it.variant})`;
      const name = titleStr.length > 15 ? titleStr.slice(0, 14) + '…' : titleStr.padEnd(15);
      const qty = String(it.quantity || 1).padStart(3);
      const rate = String(Math.round(it.price || 0)).padStart(6);
      const tot = String(Math.round((it.price || 0) * (it.quantity || 1))).padStart(6);
      receipt += `${name} ${qty} ${rate} ${tot}\n`;

      if (fmt.showTamilItemNames && it.tamilTitle) {
        receipt += `  * ${it.tamilTitle}\n`;
      }
      if (fmt.showItemAddons && it.addOns && it.addOns.length > 0) {
        receipt += `  + ${Array.isArray(it.addOns) ? it.addOns.join(', ') : it.addOns}\n`;
      }
      if (fmt.showItemNotes && it.specialNotes) {
        receipt += `  note: ${it.specialNotes}\n`;
      }
    });
  } else {
    // 42 cols: Name (22), Qty (3), Rate (6), Total (7) + spaces = 22 + 1 + 3 + 1 + 6 + 1 + 7 = 41
    receipt += `Item Description       Qty   Rate   Total\n`;
    receipt += `${line}\n`;
    items.forEach(it => {
      let titleStr = it.title || 'Item';
      if (it.variant) titleStr += ` (${it.variant})`;
      const name = titleStr.length > 22 ? titleStr.slice(0, 21) + '…' : titleStr.padEnd(22);
      const qty = String(it.quantity || 1).padStart(3);
      const rate = String(Math.round(it.price || 0)).padStart(6);
      const tot = String(Math.round((it.price || 0) * (it.quantity || 1))).padStart(7);
      receipt += `${name} ${qty} ${rate} ${tot}\n`;

      if (fmt.showTamilItemNames && it.tamilTitle) {
        receipt += `  * ${it.tamilTitle}\n`;
      }
      if (fmt.showItemAddons && it.addOns && it.addOns.length > 0) {
        receipt += `  + ${Array.isArray(it.addOns) ? it.addOns.join(', ') : it.addOns}\n`;
      }
      if (fmt.showItemNotes && it.specialNotes) {
        receipt += `  Note: ${it.specialNotes}\n`;
      }
    });
  }

  // 8. Totals & Tax Calculations
  receipt += `${line}\n`;

  const padRight = is58mm ? 22 : 31;
  const numPad = is58mm ? 8 : 9;

  receipt += `Subtotal:`.padEnd(padRight) + `Rs ${Number(subtotal || 0).toFixed(2).padStart(numPad)}\n`;

  if (discountAmount > 0) {
    const discLabel = `Discount (${discountReason || 'Special'}):`;
    receipt += discLabel.slice(0, padRight).padEnd(padRight) + `-Rs ${Number(discountAmount).toFixed(2).padStart(numPad)}\n`;
  }

  if (packagingCharge > 0) {
    receipt += `Parcel / Packing Charge:`.slice(0, padRight).padEnd(padRight) + `Rs ${Number(packagingCharge).toFixed(2).padStart(numPad)}\n`;
  }

  if (deliveryCharge > 0) {
    receipt += `Delivery Charge:`.slice(0, padRight).padEnd(padRight) + `Rs ${Number(deliveryCharge).toFixed(2).padStart(numPad)}\n`;
  }

  if (serviceChargeAmount > 0) {
    receipt += `Service Charge (5%):`.slice(0, padRight).padEnd(padRight) + `Rs ${Number(serviceChargeAmount).toFixed(2).padStart(numPad)}\n`;
  }

  if (fmt.showTaxBreakdown) {
    const cgstLabel = `CGST @ ${settings?.taxRateCgst ?? 2.5}%:`;
    const sgstLabel = `SGST @ ${settings?.taxRateSgst ?? 2.5}%:`;
    receipt += cgstLabel.padEnd(padRight) + `Rs ${Number(cgst || 0).toFixed(2).padStart(numPad)}\n`;
    receipt += sgstLabel.padEnd(padRight) + `Rs ${Number(sgst || 0).toFixed(2).padStart(numPad)}\n`;
  }

  if (roundOff !== 0) {
    receipt += `Round-Off:`.padEnd(padRight) + `Rs ${(roundOff > 0 ? '+' : '') + Number(roundOff).toFixed(2).padStart(numPad)}\n`;
  }

  receipt += `${dline}\n`;
  receipt += `NET TOTAL:`.padEnd(padRight) + `Rs ${Number(totalAmount || 0).toFixed(2).padStart(numPad)}\n`;
  receipt += `${dline}\n`;

  // 9. Payment Details
  if (fmt.showPaymentMode) {
    receipt += `Payment Mode: ${paymentMode}\n`;
    if (fmt.showTransactionRef && transactionRef) {
      receipt += `Txn Ref / UTR: ${transactionRef}\n`;
    }
    if (splitDetails && Array.isArray(splitDetails) && splitDetails.length > 0) {
      receipt += `Split Breakdown:\n`;
      splitDetails.forEach((sp, idx) => {
        receipt += `  Guest ${idx + 1} (${sp.mode}): Rs ${sp.amount}\n`;
      });
    }
  }

  receipt += `Status:       PAID & SETTLED\n\n`;

  // 10. UPI QR / Payment Verification info
  if (fmt.showBarcodeQr && fmt.upiQrVpa) {
    receipt += `${centerText('[ SCAN TO PAY / VERIFY INVOICE ]', width)}\n`;
    receipt += `${centerText(`UPI VPA: ${fmt.upiQrVpa}`, width)}\n\n`;
  }

  // 11. Footer Greetings & Disclaimer
  if (fmt.footerGreetingTamil) {
    receipt += `${centerText(fmt.footerGreetingTamil, width)}\n`;
  }
  if (fmt.footerGreetingEnglish) {
    receipt += `${centerText(fmt.footerGreetingEnglish, width)}\n`;
  }
  if (fmt.footerDisclaimer) {
    // Wrap disclaimer nicely if longer than width
    const words = fmt.footerDisclaimer.split(' ');
    let currentLine = '';
    words.forEach(w => {
      if ((currentLine + ' ' + w).trim().length > width) {
        receipt += `${centerText(currentLine.trim(), width)}\n`;
        currentLine = w;
      } else {
        currentLine += (currentLine ? ' ' : '') + w;
      }
    });
    if (currentLine.trim()) {
      receipt += `${centerText(currentLine.trim(), width)}\n`;
    }
  }

  // 12. Tech Partner Note
  if (fmt.techPartnerNote) {
    receipt += `\n${centerText(fmt.techPartnerNote, width)}\n`;
  }

  return receipt;
}

// Generate A4 / A5 Tax Invoice HTML with Full Styling
export function generateA4TaxInvoiceHtml({
  billNumber = 'SGR-2026-0001',
  tableNumber = 'TK',
  orderType = 'DINE_IN',
  customer = { name: 'Walk-in Guest', phone: '' },
  cashierName = 'Rajan (POS 01)',
  items = [],
  subtotal = 0,
  discountAmount = 0,
  discountReason = '',
  packagingCharge = 0,
  deliveryCharge = 0,
  serviceChargeAmount = 0,
  cgst = 0,
  sgst = 0,
  roundOff = 0,
  totalAmount = 0,
  paymentMode = 'CASH',
  transactionRef = '',
  settledAt = new Date().toISOString(),
  settings = {},
  formatOverrides = {},
}) {
  const fmt = {
    ...DEFAULT_BILL_SLIP_FORMAT,
    ...(settings?.bill_slip_format || {}),
    ...(formatOverrides || {}),
  };

  const dateFormatted = new Date(settledAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = new Date(settledAt || Date.now()).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tax Invoice #${billNumber} - Sri Gokulam Veg Restaurant</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #ffffff; color: #1e293b; margin: 0; padding: 24px; font-size: 13px; line-height: 1.4; }
    .invoice-card { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; background: #fff; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #059669; padding-bottom: 18px; margin-bottom: 20px; }
    .brand-title { font-size: 24px; font-weight: 800; color: #065f46; margin: 0; letter-spacing: -0.5px; }
    .brand-tamil { font-size: 16px; font-weight: 700; color: #047857; margin: 4px 0 0; }
    .brand-tagline { font-size: 12px; color: #64748b; font-style: italic; margin-top: 4px; }
    .brand-address { font-size: 12px; color: #475569; margin-top: 6px; line-height: 1.4; }
    .invoice-badge-box { text-align: right; }
    .invoice-title { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
    .invoice-meta { font-size: 12px; color: #475569; margin-top: 6px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .info-block h4 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
    .info-block p { margin: 2px 0; font-size: 13px; color: #1e293b; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 10px 12px; font-size: 12px; border-bottom: 2px solid #cbd5e1; }
    .items-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .summary-grid { display: grid; grid-template-columns: 1fr 300px; gap: 24px; align-items: start; }
    .payment-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 12px; }
    .totals-table { width: 100%; border-collapse: collapse; }
    .totals-table td { padding: 6px 0; font-size: 13px; }
    .totals-table tr.grand-total td { font-size: 16px; font-weight: 800; color: #065f46; border-top: 2px solid #059669; border-bottom: 2px solid #059669; padding: 10px 0; }
    .footer-section { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 11px; color: #64748b; }
    @media print {
      body { padding: 0; background: #fff; }
      .invoice-card { border: none; padding: 0; border-radius: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header-row">
      <div>
        <h1 class="brand-title">${fmt.restaurantNameEnglish}</h1>
        <div class="brand-tamil">${fmt.restaurantNameTamil}</div>
        <div class="brand-tagline">${fmt.tagline}</div>
        <div class="brand-address">
          ${fmt.addressLine1}, ${fmt.addressLine2}<br/>
          Phone: ${fmt.phonePrimary} | Email: ${fmt.email}<br/>
          <strong>GSTIN:</strong> ${fmt.gstin} | <strong>FSSAI Lic:</strong> ${fmt.fssaiNumber}
        </div>
      </div>
      <div class="invoice-badge-box">
        <h2 class="invoice-title">TAX INVOICE</h2>
        <div class="invoice-meta">
          <strong>Invoice #:</strong> ${billNumber}<br/>
          <strong>Date:</strong> ${dateFormatted} ${timeFormatted}<br/>
          <strong>Order Type:</strong> ${orderType} ${tableNumber ? `(Table #${tableNumber})` : ''}<br/>
          <strong>Cashier:</strong> ${cashierName}
        </div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-block">
        <h4>Billed To (Customer)</h4>
        <p><strong>Name:</strong> ${customer?.name || 'Walk-in Guest'}</p>
        <p><strong>Phone:</strong> ${customer?.phone || 'N/A'}</p>
        ${customer?.gstin ? `<p><strong>Customer GSTIN:</strong> ${customer.gstin}</p>` : ''}
        ${customer?.address ? `<p><strong>Address:</strong> ${customer.address}</p>` : ''}
      </div>
      <div class="info-block">
        <h4>Place of Supply &amp; Order Meta</h4>
        <p><strong>State:</strong> 33 - Tamil Nadu</p>
        <p><strong>Payment Mode:</strong> ${paymentMode}</p>
        ${transactionRef ? `<p><strong>Txn Ref / UTR:</strong> ${transactionRef}</p>` : ''}
        <p><strong>Status:</strong> <span style="color:#059669;font-weight:700;">PAID &amp; SETTLED</span></p>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Item Description &amp; Tamil Name</th>
          <th class="text-center" style="width: 90px;">HSN/SAC</th>
          <th class="text-center" style="width: 60px;">Qty</th>
          <th class="text-right" style="width: 90px;">Rate (₹)</th>
          <th class="text-right" style="width: 100px;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <strong>${it.title || 'Item'}</strong>
              ${it.tamilTitle ? `<br/><span style="font-size:11px;color:#059669;">${it.tamilTitle}</span>` : ''}
              ${it.variant ? `<br/><span style="font-size:11px;color:#64748b;">Variant: ${it.variant}</span>` : ''}
              ${it.addOns && it.addOns.length ? `<br/><span style="font-size:11px;color:#64748b;">Addons: ${Array.isArray(it.addOns) ? it.addOns.join(', ') : it.addOns}</span>` : ''}
            </td>
            <td class="text-center" style="color:#64748b;">996331</td>
            <td class="text-center"><strong>${it.quantity || 1}</strong></td>
            <td class="text-right">₹${Number(it.price || 0).toFixed(2)}</td>
            <td class="text-right"><strong>₹${(Number(it.price || 0) * (it.quantity || 1)).toFixed(2)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary-grid">
      <div class="payment-box">
        <h4 style="margin:0 0 6px;text-transform:uppercase;color:#64748b;">Payment &amp; Terms</h4>
        <p style="margin:2px 0;"><strong>UPI Payment ID:</strong> ${fmt.upiQrVpa}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#475569;">${fmt.footerDisclaimer}</p>
        <div style="margin-top:12px;padding:8px;background:#ecfdf5;border:1px dashed #059669;border-radius:6px;font-size:11px;color:#065f46;">
          🌿 100% Pure Vegetarian Sattvic Heritage Cuisine. Cooked fresh with pure ghee and wood-pressed oils.
        </div>
      </div>

      <div>
        <table class="totals-table">
          <tr>
            <td>Subtotal:</td>
            <td class="text-right">₹${Number(subtotal).toFixed(2)}</td>
          </tr>
          ${discountAmount > 0 ? `
            <tr style="color:#dc2626;">
              <td>Discount (${discountReason || 'Special'}):</td>
              <td class="text-right">-₹${Number(discountAmount).toFixed(2)}</td>
            </tr>
          ` : ''}
          ${packagingCharge > 0 ? `
            <tr>
              <td>Packaging / Parcel:</td>
              <td class="text-right">₹${Number(packagingCharge).toFixed(2)}</td>
            </tr>
          ` : ''}
          ${deliveryCharge > 0 ? `
            <tr>
              <td>Delivery Charge:</td>
              <td class="text-right">₹${Number(deliveryCharge).toFixed(2)}</td>
            </tr>
          ` : ''}
          ${serviceChargeAmount > 0 ? `
            <tr>
              <td>Service Charge (5%):</td>
              <td class="text-right">₹${Number(serviceChargeAmount).toFixed(2)}</td>
            </tr>
          ` : ''}
          <tr>
            <td>CGST @ ${settings?.taxRateCgst ?? 2.5}%:</td>
            <td class="text-right">₹${Number(cgst).toFixed(2)}</td>
          </tr>
          <tr>
            <td>SGST @ ${settings?.taxRateSgst ?? 2.5}%:</td>
            <td class="text-right">₹${Number(sgst).toFixed(2)}</td>
          </tr>
          ${roundOff !== 0 ? `
            <tr>
              <td>Round-Off:</td>
              <td class="text-right">${roundOff > 0 ? '+' : ''}₹${Number(roundOff).toFixed(2)}</td>
            </tr>
          ` : ''}
          <tr class="grand-total">
            <td>GRAND TOTAL:</td>
            <td class="text-right">₹${Number(totalAmount).toFixed(2)}</td>
          </tr>
        </table>
      </div>
    </div>

    <div class="footer-section">
      <div style="font-weight:700;font-size:13px;color:#047857;margin-bottom:4px;">
        ${fmt.footerGreetingTamil} • ${fmt.footerGreetingEnglish}
      </div>
      <div>This is a computer-generated tax invoice. No physical signature required.</div>
      <div style="margin-top:4px;font-size:10px;color:#94a3b8;">${fmt.techPartnerNote}</div>
    </div>
  </div>
</body>
</html>`;
}
