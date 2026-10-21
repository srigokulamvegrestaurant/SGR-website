# Sri Gokulam Veg Restaurant — Enterprise Restaurant Operating System

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-success)]()

> **Sri Gokulam Veg Restaurant** (Karaikudi Chettinad Heritage) — A high-performance, real-time restaurant operating system combining an immersive customer ordering web app with full-suite Point of Sale (POS), Kitchen Display System (KDS), Waiter Floor Dispatch, and Admin CMS.

---

## 🍽️ Key Modules & Capabilities

### 1. Customer Ordering & Reservation Portal
- **Cinematic Experience**: Luxury preloader with authentic Chettinad palace visuals, smooth animations, and gold-honed aesthetics.
- **Dynamic Menu & Cart**: Filter by categories (Tiffin, Chettinad Meals, Desserts, Beverages), select dish variants and add-ons.
- **Table QR Scanner & Ordering**: Guests scan in-restaurant table QR codes to browse, place orders, or call their assigned waiter.
- **Table Reservation**: Online reservation system with party size selection, meal slots, and special dietary notes.
- **Customer Account & VIP Loyalty**: Track orders, OTP login, and order history.

### 2. Real-Time POS & Billing Desk (`/admin/pos` & `/admin`)
- Fast keyboard & touch-screen cashier billing.
- Split GST taxation (CGST 2.5% + SGST 2.5%), discounts, payment modes (UPI / Cash / Card).
- Multi-station KOT generation & instant 80mm thermal receipt printing.

### 3. Kitchen Display System (KDS) (`/admin/kds` & `/admin/customer-display`)
- Live order status tracking across kitchen prep stations (Tiffin, Meals, Beverages).
- Automatic auditory alerts and color-coded timers (New, Preparing, Ready, Served).

### 4. Waiter Dispatch & Floor Management (`/waiter`)
- Real-time waiter calling alerts via Server-Sent Events (SSE).
- Table occupancy and billing status monitoring.

### 5. Website CMS & Analytics (`/admin/cms` & `/admin/reports`)
- Visual live-editor for banners, announcements, seasonal dishes, and testimonials.
- Daily, weekly, and monthly revenue analytics, top sellers, and tax breakdown reports.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ or 20+ installed
- npm or yarn

### Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/srigokulamvegrestaurant/SGR-website.git
cd SGR-website

# Install dependencies (automatically runs postinstall for app)
npm install
```

### Running the App
```bash
# Start local development server (Accessible on LAN: 0.0.0.0:3000)
npm run dev

# Or build and run production bundle
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment on Railway

This repository is pre-configured for 1-click deployment on [Railway](https://railway.app):

1. **Create New Project**:
   - Go to [railway.app](https://railway.app/) -> **New Project** -> **Deploy from GitHub repo**.
   - Select `srigokulamvegrestaurant/SGR-website`.
2. **Settings**:
   - Root Directory: `/` (or `/app`)
   - Networking: Click **Generate Domain** for free SSL URL.
3. **Data Persistence**:
   - Click `+ New` -> `Volume` -> mount path `/app/.data` (or add PostgreSQL).

---

## 🏛️ Project Structure

```
SGR-website/
├── app/
│   ├── app/
│   │   ├── account/           # Customer Profile & Orders
│   │   ├── admin/             # POS, KDS, CMS, Reports, Settings
│   │   ├── api/               # Serverless & SSE endpoints
│   │   ├── choose-us/         # Heritage story & highlights
│   │   ├── components/        # Reusable UI components & animations
│   │   └── waiter/            # Waiter calling & floor console
│   ├── lib/
│   │   ├── cms_defaults.js    # Default CMS state & theme tokens
│   │   ├── db.js              # In-memory + persistent state engine
│   │   ├── qrGenerator.js     # Table QR code encoder
│   │   └── thermalSlipFormatter.js # ESC/POS 80mm thermal receipt generator
│   └── public/                # High-res brand photography & icons
├── docs/                      # Architectural specs & design references
├── package.json               # Root scripts & monorepo orchestration
└── README.md
```

---

## 📜 License & Ownership
Copyright © 2026 Sri Gokulam Veg Restaurant. Crafted by AJ Tech Solutions.
