// lib/thermalSlipFormatter.js - High-Precision ESC/POS & Exact Visual Thermal Invoice Engine for Sri Gokulam Veg Restaurant
// Supports 80mm (TVSE RP3200 Plus 3-inch), 58mm (2-inch compact), and Standard A4/A5 Tax Invoices
// Exact Visual Reference: Sri Gokulam Thermal Slip with Peacock Roundel, English-only items, Grand Total banner & AJ Nanjil Tech Solutions footer

export const DEFAULT_BILL_SLIP_FORMAT = {
  restaurantNameEnglish: 'Sri Gokulam',
  restaurantNameSub: 'Veg Restaurant',
  restaurantNameTamil: 'ஸ்ரீ கோகுலம் சைவ உணவகம்',
  tagline: 'Authentic Chettinad Sattvic Culinary Heritage',
  location: 'Karaikudi, Tamil Nadu',
  addressLine1: 'Mudiyarasan Rd, near Bharat Petroleum Bunk and Thevar Silai',
  addressLine2: 'Sekkalai, Karaikudi, Tamil Nadu - 630003',
  phonePrimary: '+91 73583 25113',
  phoneSecondary: '+91 73583 25113',
  email: 'srigokulamvegrestaurant@gmail.com',
  website: 'https://www.srigokulamvegrestaurant.com',
  gstin: '33AABCS1234F1Z8',
  fssaiNumber: '12423018000456',
  paperWidth: '80MM', // '80MM' | '58MM'
  headerNote: '|| ஸ்ரீ கணேசாய நமஹ ||',
  footerGreetingTamil: 'நன்றி! மீண்டும் வருக!',
  footerGreetingEnglish: 'Thank You Visit Again!',
  footerDisclaimer: 'Goods once sold cannot be returned. Pls check bill before leaving counter.',
  techPartnerName: 'AJ Nanjil Tech Solutions',
  techPartnerWebsite: 'www.ajnanjiltechsolutions.com',
  showLogoArt: true,
  showTamilItemNames: false, // Default to English-only bill items per reference bill
  showCashierName: true,
  showCustomerDetails: true,
  showOrderType: true,
  showTableNumber: true,
  showTaxBreakdown: false, // In sample bill, tax is included in item prices and cleanly summarized in Sub Total / Round Off
  showFssaiNumber: false,
  showGstinNumber: false,
  showPaymentMode: true,
  showTransactionRef: true,
  showItemAddons: false,
  showItemNotes: false,
  showBarcodeQr: true,
  upiQrVpa: 'srigokulam@sbi',
};

// Sanitizes dish name into clean English-only name (strips Tamil unicode and cleans brackets)
export function sanitizeEnglishTitle(title = '', fallback = 'Delicacy') {
  if (!title) return fallback;
  // If title has Tamil characters, strip them
  let clean = String(title).replace(/[\u0B80-\u0BFF]/g, '').trim();
  // Clean empty parentheses or brackets left behind
  clean = clean.replace(/\(\s*\)/g, '').replace(/\[\s*\]/g, '').trim();
  // Strip outer wrapping parentheses or brackets e.g. "(Mini Tiffin)" -> "Mini Tiffin"
  clean = clean.replace(/^\s*[\(\[\{]\s*/, '').replace(/\s*[\)\]\}]\s*$/, '').trim();
  // Clean leading/trailing punctuation like '-', '/', ':'
  clean = clean.replace(/^[\s\-\/\:\*~]+|[\s\-\/\:\*~]+$/g, '').trim();
  // Clean double spaces
  clean = clean.replace(/\s+/g, ' ');
  return clean || title || fallback;
}

// Format human-friendly Bill Title by order type
export function formatBillTitle(orderType = 'DINE_IN') {
  const t = String(orderType || '').toUpperCase().trim();
  if (t === 'DINE_IN' || t === 'DINEIN' || t.includes('DINE')) return 'Dine-In Bill';
  if (t === 'TAKEAWAY' || t.includes('TAKEAWAY')) return 'Takeaway Bill';
  if (t === 'PARCEL' || t.includes('PARCEL')) return 'Parcel Bill';
  if (t === 'DELIVERY' || t.includes('DELIVERY')) return 'Delivery Bill';
  if (t === 'WALK_IN' || t === 'WALKIN' || t.includes('WALK')) return 'Walk-In Bill';
  if (t === 'COUNTER' || t.includes('COUNTER')) return 'Counter Bill';
  return 'Restaurant Bill';
}

// Format Table label & value
export function formatTableDisplay(orderType = 'DINE_IN', tableNumber = '04') {
  const t = String(orderType || '').toUpperCase().trim();
  const rawTable = String(tableNumber || '01').trim();
  
  if (t === 'DINE_IN' || t === 'DINEIN' || t.includes('DINE')) {
    const numPart = rawTable.replace(/^[Tt\-#\s]+/, '');
    const formattedNum = numPart.padStart(2, '0');
    return { label: 'Table No', value: `T-${formattedNum}` };
  }
  if (t === 'TAKEAWAY') {
    const num = rawTable.replace(/^[TtKk\-#\s]+/, '') || '01';
    return { label: 'Token No', value: `TK-${num}` };
  }
  if (t === 'PARCEL') {
    const num = rawTable.replace(/^[Pp\-#\s]+/, '') || '01';
    return { label: 'Parcel No', value: `P-${num}` };
  }
  if (t === 'DELIVERY') {
    return { label: 'Delivery', value: `DEL-${rawTable || '01'}` };
  }
  if (t === 'COUNTER' || t === 'WALK_IN' || t === 'WALKIN') {
    return { label: 'Counter', value: `C-01` };
  }
  return { label: 'Table No', value: rawTable };
}

// Generate inline SVG QR code synchronously for UPI payment
export function generateInlineQrSvg(text = 'upi://pay?pa=srigokulam@sbi&pn=Sri+Gokulam&cu=INR', size = 56) {
  try {
    const QRCode = require('qrcode');
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
    const modCount = qr.modules.size;
    const cellSize = (size / modCount).toFixed(2);
    let rects = '';
    for (let r = 0; r < modCount; r++) {
      for (let c = 0; c < modCount; c++) {
        if (qr.modules.get(r, c)) {
          const x = (c * cellSize).toFixed(2);
          const y = (r * cellSize).toFixed(2);
          rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="#000000"/>`;
        }
      }
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;background:#fff;"><rect width="${size}" height="${size}" fill="#ffffff"/>${rects}</svg>`;
  } catch (err) {
    // Elegant fallback geometric QR placeholder SVG
    return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;background:#fff;"><rect width="48" height="48" fill="#ffffff"/><rect x="2" y="2" width="14" height="14" rx="2" stroke="#000" stroke-width="2.5"/><rect x="5.5" y="5.5" width="7" height="7" fill="#000"/><rect x="32" y="2" width="14" height="14" rx="2" stroke="#000" stroke-width="2.5"/><rect x="35.5" y="5.5" width="7" height="7" fill="#000"/><rect x="2" y="32" width="14" height="14" rx="2" stroke="#000" stroke-width="2.5"/><rect x="5.5" y="35.5" width="7" height="7" fill="#000"/><rect x="20" y="4" width="4" height="8" fill="#000"/><rect x="4" y="20" width="8" height="4" fill="#000"/><rect x="20" y="20" width="8" height="8" fill="#000"/><rect x="32" y="20" width="4" height="4" fill="#000"/><rect x="20" y="36" width="6" height="4" fill="#000"/><rect x="32" y="32" width="6" height="6" fill="#000"/><rect x="40" y="40" width="6" height="6" fill="#000"/><rect x="40" y="26" width="6" height="4" fill="#000"/></svg>`;
  }
}

// Peacock Logo Roundel SVG (High-Precision Vector Match for Sri Gokulam Emblem)
export const PEACOCK_ROUNDEL_SVG = `<svg width="44" height="44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
  <circle cx="50" cy="50" r="47" stroke="#000000" stroke-width="2.5" fill="#ffffff" />
  <circle cx="50" cy="50" r="43" stroke="#000000" stroke-width="1.2" fill="#ffffff" />
  <path d="M50 18 C40 18 31 25 31 36 C31 48 43 56 50 67 C57 56 69 48 69 36 C69 25 60 18 50 18 Z" fill="#000000" />
  <circle cx="50" cy="35" r="9" fill="#ffffff" />
  <circle cx="50" cy="35" r="5" fill="#000000" />
  <path d="M49 66 C46 73 39 80 28 84 C38 83 48 77 50 69 C52 77 62 83 72 84 C61 80 54 73 51 66 Z" fill="#000000" />
  <path d="M29 48 C22 53 20 62 23 69 C25 61 30 56 36 53 Z" fill="#000000" />
  <path d="M71 48 C78 53 80 62 77 69 C75 61 70 56 64 53 Z" fill="#000000" />
</svg>`;

// Lotus Flourish SVG
export const LOTUS_FLOURISH_SVG = `<svg width="22" height="14" viewBox="0 0 24 16" fill="#000000" style="display:inline-block;vertical-align:middle;">
  <path d="M12 0 C10 6 7 11 1 14 C6 14 10 11 12 7 C14 11 18 14 23 14 C17 11 14 6 12 0 Z"/>
  <path d="M12 8 C8 11 4 13 0 15 C5 16 9 14 12 11 C15 14 19 16 24 15 C20 13 16 11 12 8 Z"/>
</svg>`;

// Generate Exact HTML Thermal Slip Matching the Reference Image
export function generateThermalSlipHtml({
  billNumber = 'SGK100245',
  tableNumber = '04',
  persons = 3,
  orderType = 'DINE_IN',
  customer = { name: 'Walk-in Guest', phone: '' },
  cashierName = 'Admin',
  waiterName = '',
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
  paymentMode = 'UPI',
  paymentStatus = 'Paid',
  splitDetails = null,
  transactionRef = '',
  settledAt = new Date().toISOString(),
  isDuplicate = false,
  reprintCount = 0,
  paperWidth = '80MM',
  settings = {},
  formatOverrides = {},
  standalonePage = false,
}) {
  const fmt = {
    ...DEFAULT_BILL_SLIP_FORMAT,
    ...(settings?.bill_slip_format || {}),
    ...(formatOverrides || {}),
  };

  const is58mm = (paperWidth || fmt.paperWidth) === '58MM';
  const effectiveWidthMm = is58mm ? '58mm' : '80mm';
  const contentWidthMm = is58mm ? '48mm' : '72mm';

  // Dates formatted exactly like sample bill: "06 Nov 2026", "12:36 PM"
  const dateObj = new Date(settledAt || Date.now());
  const dateStr = dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const billTitle = formatBillTitle(orderType);
  const tableDisplay = formatTableDisplay(orderType, tableNumber);

  // Normalize Items & English-Only Dish Titles
  const normalizedItems = (items && items.length > 0 ? items : [
    { title: 'Mini Tiffin', quantity: 1, price: 120 },
    { title: 'Ghee Roast', quantity: 2, price: 90 },
    { title: 'Chettinad Meals', quantity: 1, price: 160 },
    { title: 'Filter Coffee', quantity: 3, price: 25 },
  ]).map((it, idx) => {
    const rawTitle = it.title || it.name || 'Item';
    const englishName = sanitizeEnglishTitle(rawTitle, `Dish ${idx + 1}`);
    const qty = Math.max(1, Number(it.quantity) || 1);
    const rate = Number(it.price || 0);
    const amount = Number(it.amount || (rate * qty));
    return {
      index: idx + 1,
      name: englishName,
      qty,
      rate,
      amount,
    };
  });

  // Calculate totals if missing
  const calcSubtotal = subtotal > 0 ? subtotal : normalizedItems.reduce((acc, it) => acc + it.amount, 0);
  const calcDiscount = Math.max(0, Number(discountAmount) || 0);
  const calcTotal = totalAmount > 0 ? totalAmount : Math.max(0, calcSubtotal - calcDiscount);
  const calcRoundOff = Number(roundOff || 0);

  // UPI QR String
  const upiId = fmt.upiQrVpa || 'srigokulam@sbi';
  const upiString = `upi://pay?pa=${upiId}&pn=Sri+Gokulam+Veg+Restaurant&am=${calcTotal.toFixed(2)}&cu=INR`;
  const qrSvg = generateInlineQrSvg(upiString, is58mm ? 46 : 56);

  // Payment status badge string
  const normStatus = String(paymentStatus || 'Paid').toUpperCase();
  const statusLabel = normStatus === 'PAID' ? 'Paid' : (normStatus === 'PENDING' ? 'Pending' : (normStatus === 'VOIDED' ? 'Cancelled' : normStatus));

  // Payment mode string
  const normMode = String(paymentMode || 'UPI').toUpperCase();
  const modeLabel = normMode.includes('UPI') ? 'UPI' : (normMode.includes('CASH') ? 'Cash' : (normMode.includes('CARD') ? 'Card' : (normMode.includes('SPLIT') ? 'Split' : normMode)));

  const innerHtml = `
    <div class="sgr-receipt-card ${is58mm ? 'is-58mm' : 'is-80mm'}">
      <!-- 1. Roundel Logo -->
      <div class="sgr-receipt-logo">
        ${PEACOCK_ROUNDEL_SVG}
      </div>

      <!-- 2. Typography Header -->
      <div class="sgr-brand-header">
        <h1 class="brand-name">Sri Gokulam</h1>
        <div class="brand-sub">
          <span class="sub-wave">~</span>
          <span class="sub-text">Veg Restaurant</span>
          <span class="sub-wave">~</span>
        </div>
        <div class="brand-lotus">
          ${LOTUS_FLOURISH_SVG}
        </div>
        <div class="brand-tagline">Authentic Chettinad Sattvic Culinary Heritage</div>
        <div class="brand-address">Karaikudi, Tamil Nadu</div>
      </div>

      <!-- Divider -->
      <div class="sgr-dashed-line"></div>

      <!-- 3. Centered Bill Title -->
      <div class="sgr-bill-title">${billTitle}</div>

      <!-- Duplicate Watermark Badge (when reprinting) -->
      ${isDuplicate ? `
        <div class="sgr-duplicate-badge">
          *** DUPLICATE BILL - REPRINT ${reprintCount ? `#${reprintCount}` : ''} ***
        </div>
      ` : ''}

      <!-- 4. Metadata 2-Column Grid -->
      <div class="sgr-meta-grid">
        <div class="meta-col meta-left">
          <div class="meta-row">
            <span class="meta-key">Bill No</span>
            <span class="meta-sep">:</span>
            <span class="meta-val font-bold">${billNumber}</span>
          </div>
          <div class="meta-row">
            <span class="meta-key">Date</span>
            <span class="meta-sep">:</span>
            <span class="meta-val">${dateStr}</span>
          </div>
          <div class="meta-row">
            <span class="meta-key">Time</span>
            <span class="meta-sep">:</span>
            <span class="meta-val">${timeStr}</span>
          </div>
        </div>
        <div class="meta-divider"></div>
        <div class="meta-col meta-right">
          <div class="meta-row">
            <span class="meta-key">${tableDisplay.label}</span>
            <span class="meta-sep">:</span>
            <span class="meta-val font-bold">${tableDisplay.value}</span>
          </div>
          <div class="meta-row">
            <span class="meta-key">Persons</span>
            <span class="meta-sep">:</span>
            <span class="meta-val">${persons || 1}</span>
          </div>
          <div class="meta-row">
            <span class="meta-key">Cashier</span>
            <span class="meta-sep">:</span>
            <span class="meta-val">${cashierName || 'Admin'}</span>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="sgr-dashed-line"></div>

      <!-- 5. Line Items Table (English Only) -->
      <table class="sgr-items-table">
        <thead>
          <tr>
            <th class="th-num">#</th>
            <th class="th-name">Item Name</th>
            <th class="th-qty">Qty</th>
            <th class="th-rate">Rate (₹)</th>
            <th class="th-amt">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${normalizedItems.map(it => `
            <tr>
              <td class="td-num">${it.index}</td>
              <td class="td-name font-medium">${it.name}</td>
              <td class="td-qty">${it.qty}</td>
              <td class="td-rate">${it.rate.toFixed(2)}</td>
              <td class="td-amt">${it.amount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Divider -->
      <div class="sgr-dashed-line"></div>

      <!-- 6. Totals Block -->
      <div class="sgr-totals-block">
        <div class="total-row">
          <span class="total-label">Sub Total</span>
          <span class="total-val">₹${calcSubtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Discount</span>
          <span class="total-val">- ₹${calcDiscount.toFixed(2)}</span>
        </div>
        ${fmt.showTaxBreakdown && (cgst > 0 || sgst > 0) ? `
          <div class="total-row">
            <span class="total-label">CGST (2.5%)</span>
            <span class="total-val">₹${Number(cgst).toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">SGST (2.5%)</span>
            <span class="total-val">₹${Number(sgst).toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="total-row">
          <span class="total-label">Round Off</span>
          <span class="total-val">${calcRoundOff >= 0 ? '+' : '-'} ₹${Math.abs(calcRoundOff).toFixed(2)}</span>
        </div>
      </div>

      <!-- 7. Grand Total Highlight Band -->
      <div class="sgr-grand-total-band">
        <span class="grand-label">Grand Total</span>
        <span class="grand-val">₹${calcTotal.toFixed(2)}</span>
      </div>

      <!-- Divider -->
      <div class="sgr-dashed-line"></div>

      <!-- 8. Payment & QR Footer -->
      <div class="sgr-footer-grid">
        <div class="footer-left">
          <div class="foot-row">
            <span class="foot-key">Payment Mode</span>
            <span class="foot-sep">:</span>
            <span class="foot-val font-bold">${modeLabel}</span>
          </div>
          <div class="foot-row">
            <span class="foot-key">Payment Status</span>
            <span class="foot-sep">:</span>
            <span class="foot-val font-bold status-${normStatus.toLowerCase()}">${statusLabel}</span>
          </div>
          ${customer?.phone ? `
            <div class="foot-row">
              <span class="foot-key">Customer</span>
              <span class="foot-sep">:</span>
              <span class="foot-val">${customer.phone}</span>
            </div>
          ` : ''}
          ${customer?.name && customer.name !== 'Walk-in Guest' ? `
            <div class="foot-row">
              <span class="foot-key">Name</span>
              <span class="foot-sep">:</span>
              <span class="foot-val">${customer.name}</span>
            </div>
          ` : ''}
          ${waiterName ? `
            <div class="foot-row">
              <span class="foot-key">Waiter</span>
              <span class="foot-sep">:</span>
              <span class="foot-val">${waiterName}</span>
            </div>
          ` : ''}
          ${transactionRef ? `
            <div class="foot-row">
              <span class="foot-key">Txn Ref</span>
              <span class="foot-sep">:</span>
              <span class="foot-val">${transactionRef}</span>
            </div>
          ` : ''}
        </div>

        <div class="footer-divider"></div>

        <div class="footer-right">
          <div class="qr-wrap">
            ${qrSvg}
          </div>
          <div class="greeting-wrap">
            <div class="greet-line">Thank You</div>
            <div class="greet-line">Visit Again!</div>
            <div class="greet-lotus">
              ${LOTUS_FLOURISH_SVG}
            </div>
          </div>
        </div>
      </div>

      <!-- 9. Bordered Technical Partner Box -->
      <div class="sgr-partner-box">
        <div class="partner-left">
          <div class="code-badge">
            <span class="code-symbol">&lt;/&gt;</span>
          </div>
          <div class="partner-text">
            <div class="partner-sub">Technical Partner</div>
            <div class="partner-title">AJ Nanjil Tech Solutions</div>
          </div>
        </div>

        <div class="partner-divider"></div>

        <div class="partner-right">
          <span class="globe-icon">🌐</span>
          <span class="partner-web">www.ajnanjiltechsolutions.com</span>
        </div>
      </div>

      <!-- 10. Thermal Serrated Paper Cut Edge -->
      <div class="sgr-serrated-edge">
        <svg viewBox="0 0 300 8" preserveAspectRatio="none">
          <path d="M0,0 L5,8 L10,0 L15,8 L20,0 L25,8 L30,0 L35,8 L40,0 L45,8 L50,0 L55,8 L60,0 L65,8 L70,0 L75,8 L80,0 L85,8 L90,0 L95,8 L100,0 L105,8 L110,0 L115,8 L120,0 L125,8 L130,0 L135,8 L140,0 L145,8 L150,0 L155,8 L160,0 L165,8 L170,0 L175,8 L180,0 L185,8 L190,0 L195,8 L200,0 L205,8 L210,0 L215,8 L220,0 L225,8 L230,0 L235,8 L240,0 L245,8 L250,0 L255,8 L260,0 L265,8 L270,0 L275,8 L280,0 L285,8 L290,0 L295,8 L300,0 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.75" />
        </svg>
      </div>
    </div>
  `;

  const stylesCss = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@400;500;600;700;800&display=swap');

    @page {
      size: ${effectiveWidthMm} auto;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      background: #f1f5f9;
      color: #000000;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 16px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
    }

    .sgr-receipt-card {
      width: ${is58mm ? '260px' : '340px'};
      background: #ffffff;
      color: #000000;
      padding: ${is58mm ? '12px 10px 6px' : '18px 14px 8px'};
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      border-radius: 4px;
      font-size: ${is58mm ? '10px' : '11.5px'};
      line-height: 1.35;
      position: relative;
    }

    .sgr-receipt-logo {
      margin-bottom: 4px;
      text-align: center;
    }

    .sgr-brand-header {
      text-align: center;
      margin-bottom: 8px;
    }

    .brand-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: ${is58mm ? '19px' : '23px'};
      font-weight: 700;
      color: #000000;
      letter-spacing: -0.3px;
      line-height: 1.15;
      margin: 0;
    }

    .brand-sub {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: ${is58mm ? '12px' : '14px'};
      font-weight: 700;
      color: #000000;
      margin-top: 2px;
    }

    .sub-wave {
      font-size: 13px;
      font-weight: normal;
    }

    .brand-lotus {
      margin: 2px 0;
      line-height: 1;
    }

    .brand-tagline {
      font-size: ${is58mm ? '8px' : '9.5px'};
      color: #1e293b;
      font-weight: 500;
      margin-top: 2px;
      letter-spacing: 0.2px;
    }

    .brand-address {
      font-size: ${is58mm ? '8.5px' : '10px'};
      color: #000000;
      font-weight: 600;
      margin-top: 1px;
    }

    .sgr-dashed-line {
      border-top: 1.5px dashed #000000;
      margin: 8px 0;
      width: 100%;
    }

    .sgr-bill-title {
      text-align: center;
      font-size: ${is58mm ? '13px' : '15px'};
      font-weight: 800;
      color: #000000;
      text-transform: capitalize;
      letter-spacing: 0.3px;
      margin: 4px 0;
    }

    .sgr-duplicate-badge {
      text-align: center;
      font-size: 9.5px;
      font-weight: 800;
      background: #fee2e2;
      color: #b91c1c;
      border: 1px dashed #ef4444;
      border-radius: 4px;
      padding: 3px 6px;
      margin: 4px 0 6px;
      letter-spacing: 0.5px;
    }

    .sgr-meta-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: stretch;
      margin: 6px 0;
      font-size: ${is58mm ? '9px' : '10.5px'};
    }

    .meta-col {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .meta-left {
      padding-right: 6px;
    }

    .meta-right {
      padding-left: 6px;
    }

    .meta-divider {
      width: 1.5px;
      background: #000000;
      margin: 0 4px;
    }

    .meta-row {
      display: flex;
      align-items: baseline;
      white-space: nowrap;
    }

    .meta-key {
      min-width: ${is58mm ? '42px' : '52px'};
      color: #1e293b;
    }

    .meta-sep {
      margin: 0 4px;
      font-weight: 600;
    }

    .meta-val {
      color: #000000;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .font-bold {
      font-weight: 800;
    }

    .font-medium {
      font-weight: 600;
    }

    /* Items Table */
    .sgr-items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
      font-size: ${is58mm ? '9px' : '10.5px'};
    }

    .sgr-items-table th {
      font-weight: 700;
      color: #000000;
      padding: 4px 2px;
      text-align: left;
    }

    .sgr-items-table td {
      padding: 3.5px 2px;
      vertical-align: top;
      color: #000000;
    }

    .th-num, .td-num {
      width: ${is58mm ? '12px' : '16px'};
      text-align: center;
    }

    .th-name, .td-name {
      text-align: left;
      padding-left: 4px !important;
    }

    .th-qty, .td-qty {
      width: ${is58mm ? '24px' : '30px'};
      text-align: center;
    }

    .th-rate, .td-rate {
      width: ${is58mm ? '42px' : '54px'};
      text-align: right;
    }

    .th-amt, .td-amt {
      width: ${is58mm ? '48px' : '62px'};
      text-align: right;
      font-weight: 600;
    }

    /* Totals */
    .sgr-totals-block {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 3px;
      margin: 4px 0;
      font-size: ${is58mm ? '9.5px' : '11px'};
    }

    .total-row {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      width: 100%;
    }

    .total-label {
      min-width: 90px;
      text-align: right;
      color: #000000;
      font-weight: 600;
    }

    .total-val {
      min-width: ${is58mm ? '55px' : '70px'};
      text-align: right;
      font-weight: 700;
      color: #000000;
    }

    /* Grand Total Banner */
    .sgr-grand-total-band {
      background: #e2e8f0;
      border-radius: 3px;
      padding: ${is58mm ? '5px 8px' : '6px 10px'};
      margin: 6px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .grand-label {
      font-size: ${is58mm ? '12px' : '14px'};
      font-weight: 800;
      color: #000000;
      letter-spacing: 0.2px;
    }

    .grand-val {
      font-size: ${is58mm ? '13px' : '16px'};
      font-weight: 800;
      color: #000000;
    }

    /* Footer Payment & QR */
    .sgr-footer-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      margin: 6px 0;
      font-size: ${is58mm ? '8.5px' : '10px'};
    }

    .footer-left {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding-right: 6px;
    }

    .footer-divider {
      width: 1.5px;
      background: #000000;
      height: 100%;
      min-height: 48px;
      margin: 0 4px;
    }

    .footer-right {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding-left: 6px;
    }

    .foot-row {
      display: flex;
      align-items: baseline;
      white-space: nowrap;
    }

    .foot-key {
      min-width: ${is58mm ? '60px' : '78px'};
      color: #1e293b;
    }

    .foot-sep {
      margin: 0 4px;
      font-weight: 600;
    }

    .foot-val {
      color: #000000;
    }

    .status-paid {
      color: #047857;
    }

    .status-pending {
      color: #b45309;
    }

    .status-voided, .status-cancelled {
      color: #b91c1c;
    }

    .qr-wrap {
      flex-shrink: 0;
    }

    .greeting-wrap {
      text-align: center;
      flex-grow: 1;
    }

    .greet-line {
      font-size: ${is58mm ? '9.5px' : '11.5px'};
      font-weight: 800;
      color: #000000;
      line-height: 1.2;
    }

    .greet-lotus {
      margin-top: 3px;
      line-height: 1;
    }

    /* Technical Partner Box */
    .sgr-partner-box {
      border: 1.5px solid #000000;
      border-radius: 6px;
      padding: ${is58mm ? '4px 6px' : '5px 8px'};
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      font-size: ${is58mm ? '8px' : '9px'};
    }

    .partner-left {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .code-badge {
      border: 1.2px solid #000000;
      border-radius: 3px;
      padding: 1px 3px;
      font-family: monospace;
      font-weight: 900;
      font-size: 8.5px;
      line-height: 1;
    }

    .partner-sub {
      font-size: ${is58mm ? '7px' : '8px'};
      color: #334155;
      line-height: 1;
    }

    .partner-title {
      font-size: ${is58mm ? '8.5px' : '10px'};
      font-weight: 800;
      color: #000000;
      line-height: 1.2;
    }

    .partner-divider {
      width: 1px;
      background: #000000;
      height: 20px;
    }

    .partner-right {
      display: flex;
      align-items: center;
      gap: 3px;
      white-space: nowrap;
    }

    .globe-icon {
      font-size: 10px;
    }

    .partner-web {
      font-size: ${is58mm ? '7.5px' : '9px'};
      font-weight: 600;
      color: #000000;
    }

    /* Serrated Thermal Edge */
    .sgr-serrated-edge {
      width: 100%;
      height: 8px;
      margin-top: 8px;
      overflow: hidden;
    }

    .sgr-serrated-edge svg {
      width: 100%;
      height: 8px;
      display: block;
    }

    /* Print Overrides */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        min-height: auto !important;
        display: block !important;
      }

      .sgr-receipt-card {
        width: ${contentWidthMm} !important;
        border: none !important;
        box-shadow: none !important;
        padding: 2mm 0 !important;
        margin: 0 auto !important;
        border-radius: 0 !important;
      }

      .sgr-serrated-edge {
        display: none !important;
      }

      .no-print {
        display: none !important;
      }
    }
  `;

  if (!standalonePage) {
    return `
      <style>${stylesCss}</style>
      ${innerHtml}
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bill #${billNumber} - Sri Gokulam Veg Restaurant</title>
  <style>${stylesCss}</style>
</head>
<body>
  ${innerHtml}
  <script>
    window.onload = function() {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`;
}

// Generate ESC/POS Thermal Receipt Text (Formatted with exact columns and dividers)
export function generateThermalReceiptText({
  billNumber = 'SGK100245',
  tableNumber = '04',
  orderType = 'DINE_IN',
  customer = { name: 'Walk-in Guest', phone: '' },
  cashierName = 'Admin',
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
  paymentMode = 'UPI',
  splitDetails = null,
  transactionRef = '',
  settledAt = new Date().toISOString(),
  isDuplicate = false,
  reprintCount = 0,
  settings = {},
  formatOverrides = {},
}) {
  const fmt = {
    ...DEFAULT_BILL_SLIP_FORMAT,
    ...(settings?.bill_slip_format || {}),
    ...(formatOverrides || {}),
  };

  const is58mm = fmt.paperWidth === '58MM';
  const width = is58mm ? 32 : 42;
  const line = '-'.repeat(width);
  const dline = '='.repeat(width);

  const centerText = (str = '', w = width) => {
    const s = String(str).trim();
    if (s.length >= w) return s.slice(0, w);
    const left = Math.floor((w - s.length) / 2);
    const right = w - s.length - left;
    return ' '.repeat(left) + s + ' '.repeat(right);
  };

  const dateObj = new Date(settledAt || Date.now());
  const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const billTitle = formatBillTitle(orderType);
  const tableDisplay = formatTableDisplay(orderType, tableNumber);

  let out = '';

  // 1. Logo text & Header
  out += `${centerText('~*~ (G) SRI GOKULAM (G) ~*~', width)}\n`;
  out += `${centerText('Veg Restaurant', width)}\n`;
  out += `${centerText('Authentic Chettinad Sattvic Heritage', width)}\n`;
  out += `${centerText('Karaikudi, Tamil Nadu', width)}\n`;
  out += `${line}\n`;

  // 2. Bill Title
  out += `${centerText(billTitle.toUpperCase(), width)}\n`;
  if (isDuplicate) {
    out += `${centerText(`*** DUPLICATE BILL - REPRINT ${reprintCount ? `#${reprintCount}` : ''} ***`, width)}\n`;
  }

  // 3. Metadata Grid
  if (is58mm) {
    out += `Bill No : ${billNumber}\n`;
    out += `Date    : ${dateStr} ${timeStr}\n`;
    out += `${tableDisplay.label.padEnd(8)}: ${tableDisplay.value}\n`;
    out += `Cashier : ${cashierName || 'Admin'}\n`;
  } else {
    out += `Bill No: ${String(billNumber).padEnd(14)} | ${tableDisplay.label}: ${tableDisplay.value}\n`;
    out += `Date   : ${dateStr}   | Time : ${timeStr}\n`;
    out += `Cashier: ${(cashierName || 'Admin').padEnd(14)} | Status: PAID\n`;
  }

  if (customer && customer.phone) {
    out += `Customer: ${customer.name || 'Guest'} (${customer.phone})\n`;
  }

  out += `${line}\n`;

  // 4. Line Items Table (English Only)
  if (is58mm) {
    // 32 cols: # (2) Name (15) Qty (3) Amt (8) + spaces
    out += `# Item            Qty    Amount\n`;
    out += `${line}\n`;
    items.forEach((it, idx) => {
      const nameStr = sanitizeEnglishTitle(it.title || 'Item');
      const name = nameStr.length > 15 ? nameStr.slice(0, 14) + '.' : nameStr.padEnd(15);
      const qty = String(it.quantity || 1).padStart(3);
      const amt = (Number(it.price || 0) * (it.quantity || 1)).toFixed(2).padStart(8);
      out += `${String(idx + 1).padEnd(2)}${name} ${qty} ${amt}\n`;
    });
  } else {
    // 42 cols: # (3) Item Name (18) Qty (4) Rate (7) Amount (8) + spaces = 3+1+18+1+4+1+7+1+8 = 43
    out += `#  Item Name           Qty   Rate   Amount\n`;
    out += `${line}\n`;
    items.forEach((it, idx) => {
      const nameStr = sanitizeEnglishTitle(it.title || 'Item');
      const name = nameStr.length > 18 ? nameStr.slice(0, 17) + '.' : nameStr.padEnd(18);
      const qty = String(it.quantity || 1).padStart(4);
      const rate = Number(it.price || 0).toFixed(2).padStart(7);
      const amt = (Number(it.price || 0) * (it.quantity || 1)).toFixed(2).padStart(8);
      out += `${String(idx + 1).padEnd(2)} ${name} ${qty} ${rate} ${amt}\n`;
    });
  }

  out += `${line}\n`;

  // 5. Totals
  const padLbl = is58mm ? 20 : 28;
  const padVal = is58mm ? 10 : 12;

  out += `Sub Total`.padEnd(padLbl) + `: Rs ${Number(subtotal).toFixed(2).padStart(padVal)}\n`;
  if (discountAmount > 0) {
    out += `Discount`.padEnd(padLbl) + `: -Rs ${Number(discountAmount).toFixed(2).padStart(padVal)}\n`;
  }
  if (roundOff !== 0) {
    out += `Round Off`.padEnd(padLbl) + `: ${roundOff >= 0 ? '+' : '-'}Rs ${Math.abs(Number(roundOff)).toFixed(2).padStart(padVal)}\n`;
  }

  out += `${dline}\n`;
  out += `GRAND TOTAL`.padEnd(padLbl) + `: Rs ${Number(totalAmount).toFixed(2).padStart(padVal)}\n`;
  out += `${dline}\n`;

  // 6. Payment & Footer
  out += `Payment Mode   : ${paymentMode || 'UPI'}\n`;
  out += `Payment Status : PAID\n`;
  if (transactionRef) out += `Txn Ref / UTR  : ${transactionRef}\n`;

  out += `\n${centerText('Thank You Visit Again!', width)}\n`;
  out += `${centerText('~ Pure Sattvic Chettinad Dining ~', width)}\n`;
  out += `${line}\n`;
  out += `${centerText('Technical Partner: AJ Nanjil Tech Solutions', width)}\n`;
  out += `${centerText('www.ajnanjiltechsolutions.com', width)}\n`;

  return out;
}

// Generate A4 / A5 Tax Invoice HTML with Full Styling
export function generateA4TaxInvoiceHtml({
  billNumber = 'SGK100245',
  tableNumber = '04',
  orderType = 'DINE_IN',
  customer = { name: 'Walk-in Guest', phone: '' },
  cashierName = 'Admin',
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
  paymentMode = 'UPI',
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

  const dateFormatted = new Date(settledAt || Date.now()).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = new Date(settledAt || Date.now()).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
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
          <th>Item Description (English)</th>
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
              <strong>${sanitizeEnglishTitle(it.title || 'Item')}</strong>
              ${it.variant ? `<br/><span style="font-size:11px;color:#64748b;">Variant: ${it.variant}</span>` : ''}
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
        ${fmt.footerGreetingEnglish}
      </div>
      <div>This is a computer-generated tax invoice. No physical signature required.</div>
      <div style="margin-top:4px;font-size:10px;color:#94a3b8;">Technology Partner: ${fmt.techPartnerName} (${fmt.techPartnerWebsite})</div>
    </div>
  </div>
</body>
</html>`;
}
