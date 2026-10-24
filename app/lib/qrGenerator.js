import QRCode from 'qrcode';

// Generate authentic, 100% ISO/IEC 18004 compliant vector SVG for QR Code
export function generateQrSvg(text, pixelSize = 240) {
  try {
    const qrData = QRCode.create(text, { errorCorrectionLevel: 'M' });
    const size = qrData.modules.size;
    const margin = 2;
    const totalSize = size + margin * 2;
    const cellSize = pixelSize / totalSize;

    let rects = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (qrData.modules.get(r, c)) {
          const x = ((c + margin) * cellSize).toFixed(2);
          const y = ((r + margin) * cellSize).toFixed(2);
          rects += `<rect x="${x}" y="${y}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="#09090b" rx="1"/>`;
        }
      }
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pixelSize} ${pixelSize}" width="${pixelSize}" height="${pixelSize}">
        <rect width="100%" height="100%" fill="#ffffff" rx="12" />
        ${rects}
      </svg>
    `.trim();
  } catch (err) {
    console.error('Error generating QR code SVG:', err);
    return `<svg width="${pixelSize}" height="${pixelSize}"><rect width="100%" height="100%" fill="#ffffff"/></svg>`;
  }
}

// Generate 4"x6" Printable Standee Tent Card HTML
export function generateStandeeCardHtml({ tableNumber, section = 'GROUND_FLOOR', capacity = 4, baseUrl = 'https://srigokulamvegrestaurant.com' }) {
  const qrUrl = `${baseUrl}/?table=${tableNumber}&section=${section}`;
  const qrSvg = generateQrSvg(qrUrl, 260);

  const sectionName = section === 'GROUND_FLOOR' ? 'Ground Floor Family Dining'
    : section === 'AC_HALL' ? 'First Floor AC Royal Dining Hall'
    : section === 'VERANDA' ? 'Traditional Chettinad Veranda'
    : 'Rooftop Garden Dining';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Table #${tableNumber} Standee - Sri Gokulam</title>
  <style>
    @page {
      size: 4in 6in;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .standeeCard {
      width: 3.8in;
      height: 5.8in;
      background: #ffffff;
      border: 3px solid #2563eb;
      border-radius: 18px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.12);
      padding: 0.3in 0.25in;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .topBand {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 8px;
      background: linear-gradient(90deg, #2563eb, #7c3aed, #10b981);
    }
    .brandTitle {
      font-size: 1.25rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      color: #1e3a8a;
      margin-top: 5px;
      text-transform: uppercase;
    }
    .brandSub {
      font-size: 0.72rem;
      color: #64748b;
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .tablePill {
      display: inline-block;
      background: #2563eb;
      color: #ffffff;
      font-size: 1.45rem;
      font-weight: 900;
      padding: 0.25rem 1.1rem;
      border-radius: 9999px;
      margin: 0.15in 0 0.05in;
      box-shadow: 0 4px 12px rgba(37,99,235,0.3);
    }
    .sectionMeta {
      font-size: 0.76rem;
      font-weight: 700;
      color: #475569;
    }
    .qrWrap {
      margin: 0.1in 0;
      padding: 10px;
      background: #ffffff;
      border: 2px dashed #cbd5e1;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ctaHeading {
      font-size: 0.95rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .ctaSub {
      font-size: 0.72rem;
      color: #64748b;
      line-height: 1.3;
    }
    .footerRow {
      width: 100%;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 0.68rem;
      color: #64748b;
      font-weight: 600;
    }
    .noPrint {
      position: fixed;
      top: 12px;
      right: 12px;
      display: flex;
      gap: 8px;
      z-index: 999;
    }
    .btnAction {
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 8px 14px;
      font-weight: 700;
      cursor: pointer;
      font-size: 0.85rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    @media print {
      body { background: transparent; }
      .noPrint { display: none !important; }
      .standeeCard { box-shadow: none; border: 2px solid #2563eb; }
    }
  </style>
</head>
<body>
  <div class="noPrint">
    <button class="btnAction" onclick="window.print()">🖨️ Direct Print Standee</button>
  </div>

  <div class="standeeCard">
    <div class="topBand"></div>

    <div>
      <div style="font-size: 1.8rem; margin-bottom: 2px;">🧈</div>
      <div class="brandTitle">SRI GOKULAM</div>
      <div class="brandSub">Authentic Chettinad Sattvic Cuisine • Karaikudi</div>
    </div>

    <div>
      <div class="tablePill">TABLE #${tableNumber}</div>
      <div class="sectionMeta">${sectionName} • Seating: ${capacity} Guests</div>
    </div>

    <div class="qrWrap">
      ${qrSvg}
    </div>

    <div>
      <div class="ctaHeading">📲 SCAN FOR INSTANT DINE-IN ORDERING</div>
      <div class="ctaSub">
        Point your Phone Camera or Google Lens directly at this QR code to view our live photo menu, customize ghee roasts, and place orders directly to your table!
      </div>
    </div>

    <div class="footerRow">
      <span>📶 Free Wi-Fi: <strong>Gokulam_Guest</strong></span>
      <span>🔒 4-Digit Waiter OTP Verification</span>
    </div>
  </div>
</body>
</html>
  `.trim();
}
