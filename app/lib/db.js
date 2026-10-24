// lib/db.js - Sri Gokulam Veg Restaurant Data & State Engine
// Handles in-memory + file-persisted data for development with relational schema hooks

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DEFAULT_WEBSITE_CMS, createInitialContentSnapshot } from './cms_defaults.js';
import { DEFAULT_BILL_SLIP_FORMAT } from './thermalSlipFormatter.js';
import { DEFAULT_MEAL_SECTIONS } from './meal_sections.js';
import { OFFICIAL_MENU_ITEMS } from './menu_pdf_items.js';

// Default protected Developer Admin email addresses (Permanently protected from modification, demotion, deactivation, or deletion)
export const PROTECTED_DEVELOPER_EMAILS = [
  'info.ajnanjiltechsolutions@gmail.com',
  'info.ajtechsolutions@gmail.com'
];

// Storage file location inside .next / app cache or data folder
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'restaurant_state.json');

// Initial seed data matching Sri Gokulam Master Plan
const SEED_DATA = {
  tables: [
    { id: 'tbl_01', tableNumber: '01', section: 'GROUND_FLOOR', capacity: 2, shape: 'ROUND', status: 'AVAILABLE', assignedWaiter: 'Murugan (Floor Captain)', activeOrderId: null, activeSessionId: null },
    { id: 'tbl_02', tableNumber: '02', section: 'GROUND_FLOOR', capacity: 4, shape: 'SQUARE', status: 'AVAILABLE', assignedWaiter: 'Murugan (Floor Captain)', activeOrderId: null, activeSessionId: null },
    { id: 'tbl_03', tableNumber: '03', section: 'GROUND_FLOOR', capacity: 4, shape: 'SQUARE', status: 'AVAILABLE', assignedWaiter: 'Murugan (Floor Captain)', activeOrderId: null, activeSessionId: null },
    { id: 'tbl_04', tableNumber: '04', section: 'GROUND_FLOOR', capacity: 6, shape: 'RECTANGLE', status: 'AVAILABLE', assignedWaiter: 'Murugan (Floor Captain)', activeOrderId: null, activeSessionId: null },
    { id: 'tbl_05', tableNumber: '05', section: 'GROUND_FLOOR', capacity: 2, shape: 'ROUND', status: 'AVAILABLE', assignedWaiter: 'Murugan (Floor Captain)', activeOrderId: null, activeSessionId: null },
    { id: 'tbl_06', tableNumber: '06', section: 'GROUND_FLOOR', capacity: 4, shape: 'SQUARE', status: 'AVAILABLE', assignedWaiter: 'Murugan (Floor Captain)', activeOrderId: null, activeSessionId: null },
    { id: 'tbl_07', tableNumber: '07', section: 'AC_HALL', capacity: 4, shape: 'SQUARE', status: 'AVAILABLE', assignedWaiter: 'Rajan (POS Cashier)', activeOrderId: null, activeSessionId: null },
    { id: 'tbl_08', tableNumber: '08', section: 'AC_HALL', capacity: 4, shape: 'SQUARE', status: 'AVAILABLE', assignedWaiter: 'Rajan (POS Cashier)', activeOrderId: null, activeSessionId: null },
    { id: 'tbl_09', tableNumber: '09', section: 'AC_HALL', capacity: 6, shape: 'RECTANGLE', status: 'AVAILABLE', assignedWaiter: 'Rajan (POS Cashier)', activeOrderId: null, activeSessionId: null },
    { id: 'tbl_10', tableNumber: '10', section: 'AC_HALL', capacity: 8, shape: 'RECTANGLE', status: 'AVAILABLE', assignedWaiter: 'Rajan (POS Cashier)', activeOrderId: null, activeSessionId: null },
    { id: 'tbl_11', tableNumber: '11', section: 'AC_HALL', capacity: 4, shape: 'SQUARE', status: 'AVAILABLE', assignedWaiter: 'Rajan (POS Cashier)', activeOrderId: null, activeSessionId: null },
    { id: 'tbl_12', tableNumber: '12', section: 'AC_HALL', capacity: 6, shape: 'RECTANGLE', status: 'AVAILABLE', assignedWaiter: 'Rajan (POS Cashier)', activeOrderId: null, activeSessionId: null },
    { id: 'tbl_13', tableNumber: '13', section: 'VERANDA', capacity: 2, shape: 'ROUND', status: 'AVAILABLE', assignedWaiter: 'Murugan (Floor Captain)', activeOrderId: null, activeSessionId: null },
    { id: 'tbl_14', tableNumber: '14', section: 'VERANDA', capacity: 4, shape: 'SQUARE', status: 'AVAILABLE', assignedWaiter: 'Murugan (Floor Captain)', activeOrderId: null, activeSessionId: null },
    { id: 'tbl_15', tableNumber: '15', section: 'VERANDA', capacity: 4, shape: 'SQUARE', status: 'AVAILABLE', assignedWaiter: 'Murugan (Floor Captain)', activeOrderId: null, activeSessionId: null },
    { id: 'tbl_16', tableNumber: '16', section: 'VERANDA', capacity: 6, shape: 'RECTANGLE', status: 'AVAILABLE', assignedWaiter: 'Murugan (Floor Captain)', activeOrderId: null, activeSessionId: null },
  ],
  reservations: [],
  waitlist: [],
  session_logs: [],
  orders: [],
  kots: [],
  bills: [],
  users: [
    {
      id: 'usr_dev_01',
      fullName: 'AJ Nanjil Tech Solutions',
      email: 'info.ajnanjiltechsolutions@gmail.com',
      phone: '+91 94431 23456',
      role: 'DEVELOPER_ADMIN',
      isActive: true,
      isProtected: true,
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      otpLockoutUntil: null,
      otpResendCount: 0,
      otpLastRequestedAt: null,
      createdAt: '2026-10-15T00:00:00.000Z'
    },
    {
      id: 'usr_dev_02',
      fullName: 'AJ Tech Solutions',
      email: 'info.ajtechsolutions@gmail.com',
      phone: '+91 98765 43210',
      role: 'DEVELOPER_ADMIN',
      isActive: true,
      isProtected: true,
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      otpLockoutUntil: null,
      otpResendCount: 0,
      otpLastRequestedAt: null,
      createdAt: '2026-10-15T00:00:00.000Z'
    },
    { id: 'usr_01', fullName: 'Aswin (AJ Tech)', email: 'aswin@ajtechsolutions.com', phone: '9999999999', role: 'DEVELOPER_ADMIN', isActive: true, isProtected: false, otpHash: null, otpExpiresAt: null, otpAttempts: 0, otpLockoutUntil: null, otpResendCount: 0, otpLastRequestedAt: null, createdAt: '2026-10-15T00:00:00.000Z' },
    { id: 'usr_02', fullName: 'Owner - Sri Gokulam', email: 'owner@srigokulam.com', phone: '9876500001', role: 'SUPER_ADMIN', isActive: true, isProtected: false, otpHash: null, otpExpiresAt: null, otpAttempts: 0, otpLockoutUntil: null, otpResendCount: 0, otpLastRequestedAt: null, createdAt: '2026-10-15T00:00:00.000Z' },
    { id: 'usr_03', fullName: 'Karthikeyan (Manager)', email: 'manager@srigokulam.com', phone: '9876500002', role: 'STORE_MANAGER', isActive: true, isProtected: false, otpHash: null, otpExpiresAt: null, otpAttempts: 0, otpLockoutUntil: null, otpResendCount: 0, otpLastRequestedAt: null, createdAt: '2026-10-15T00:00:00.000Z' },
    { id: 'usr_04', fullName: 'Rajan (Cashier)', email: 'cashier@srigokulam.com', phone: '9876500003', role: 'CASHIER', isActive: true, isProtected: false, otpHash: null, otpExpiresAt: null, otpAttempts: 0, otpLockoutUntil: null, otpResendCount: 0, otpLastRequestedAt: null, createdAt: '2026-10-15T00:00:00.000Z' },
    { id: 'usr_05', fullName: 'Murugan (Floor Captain)', email: 'waiter@srigokulam.com', phone: '9876500004', role: 'WAITER', isActive: true, isProtected: false, otpHash: null, otpExpiresAt: null, otpAttempts: 0, otpLockoutUntil: null, otpResendCount: 0, otpLastRequestedAt: null, createdAt: '2026-10-15T00:00:00.000Z' },
    { id: 'usr_06', fullName: 'Selvam (Head Cook)', email: 'kitchen@srigokulam.com', phone: '9876500005', role: 'KITCHEN', isActive: true, isProtected: false, otpHash: null, otpExpiresAt: null, otpAttempts: 0, otpLockoutUntil: null, otpResendCount: 0, otpLastRequestedAt: null, createdAt: '2026-10-15T00:00:00.000Z' },
  ],
  sessions: [],
  inventory: [],
  recipes: [],
  meal_sections: DEFAULT_MEAL_SECTIONS,
  menu: OFFICIAL_MENU_ITEMS,
  categories: [
    { id: 'cat_breakfast', name: 'Breakfast', tamilName: 'காலை சிற்றுண்டி', icon: '🌅', description: 'Fresh morning idlis, pongal, and crispy vadas', displayOrder: 1, isActive: true, station: 'TIFFIN' },
    { id: 'cat_tiffin', name: 'Tiffin', tamilName: 'டிபன் வகைகள்', icon: '🥞', description: 'All-day hot tiffin, paniyaram, poori, and snacks', displayOrder: 2, isActive: true, station: 'TIFFIN' },
    { id: 'cat_dosa', name: 'Dosa', tamilName: 'தோசை வகைகள்', icon: '🪙', description: 'Crisp ghee roasts, podi dosas, and uthappams', displayOrder: 3, isActive: true, station: 'DOSA' },
    { id: 'cat_meals', name: 'Meals', tamilName: 'ராஜா சாப்பாடு', icon: '🍱', description: 'Royal plantain leaf thali with 14 authentic items', displayOrder: 4, isActive: true, station: 'MEALS' },
    { id: 'cat_rice', name: 'Rice', tamilName: 'விதவித சாதம்', icon: '🍚', description: 'Sambar sadham, curd rice, and lemon rice specials', displayOrder: 5, isActive: true, station: 'MEALS' },
    { id: 'cat_chettinad', name: 'Chettinad', tamilName: 'செட்டிநாடு பாரம்பரியம்', icon: '🏺', description: 'Heritage kuzhambus, ennai kathirikai, and spice specialties', displayOrder: 6, isActive: true, station: 'MEALS' },
    { id: 'cat_snacks', name: 'Snacks', tamilName: 'மாலை பலகாரங்கள்', icon: '🥟', description: 'Crispy bajjis, bondas, medhu vadas, and evening savories', displayOrder: 7, isActive: true, station: 'SNACKS' },
    { id: 'cat_sweets', name: 'Sweets', tamilName: 'பாரம்பரிய இனிப்புகள்', icon: '🍯', description: 'Elaneer payasam, badam halwa, and sweet paniyaram', displayOrder: 8, isActive: true, station: 'BEVERAGES' },
    { id: 'cat_beverages', name: 'Beverages', tamilName: 'பானங்கள்', icon: '☕', description: 'Kumbakonam degree filter coffee, jigarthanda, and fresh juices', displayOrder: 9, isActive: true, station: 'BEVERAGES' },
  ],
  menu_audit_logs: [],
  customers: [],
  shifts: [],
  held_orders: [],
  refund_logs: [],
  qr_orders: [],
  wastage_logs: [],
  expenses: [],
  customer_reviews: [],
  audit_logs: [
    {
      id: 'audit_init_01',
      timestamp: '2026-10-24T00:00:00.000Z',
      user: 'System Lead',
      role: 'DEVELOPER_ADMIN',
      module: 'SYSTEM',
      action: 'SYSTEM_INITIALIZED',
      detail: 'Sri Gokulam Enterprise Restaurant Core deployed with Chettinad Sattvic configuration.',
      ip: '127.0.0.1',
    },
  ],
  settings: {
    // Backward-compatible flat keys for POS, KDS & legacy queries
    maintenanceMode: false,
    swiggyZomatoSync: false,
    whatsappReceipts: true,
    autoPrintKds: true,
    soundAlerts: true,
    currency: 'INR',
    taxRateCgst: 2.5,
    taxRateSgst: 2.5,
    serviceChargePercent: 0,
    gstin: '33AABCS1234F1Z8',
    fssai: '12423018000456',
    address: 'Mudiyarasan Salai, Near Bharat Petroleum Bunk and Thevar Silai, Karaikudi - 630003',
    phone: '+91 94431 23456',

    // 1. Restaurant Profile
    profile: {
      restaurantName: 'Sri Gokulam Veg Restaurant',
      restaurantNameTamil: 'ஸ்ரீ கோகுலம் சைவ உணவகம்',
      tagline: 'Authentic Chettinad Sattvic Culinary Heritage',
      logoUrl: '/restaurant_logo.jpg',
      address: 'Mudiyarasan Salai, Near Bharat Petroleum Bunk and Thevar Silai, Karaikudi, Tamil Nadu - 630003',
      city: 'Karaikudi',
      district: 'Sivaganga District',
      state: 'Tamil Nadu',
      pincode: '630003',
      primaryPhone: '+91 94431 23456',
      secondaryPhone: '+91 98765 43210',
      whatsappPhone: '+91 94431 23456',
      email: 'contact@srigokulam.com',
      supportEmail: 'support@srigokulam.com',
      gstin: '33AABCS1234F1Z8',
      fssai: '12423018000456',
      panCin: 'AABCS1234F',
      openingHours: {
        breakfast: '06:30 AM - 11:30 AM',
        lunch: '12:00 PM - 03:45 PM',
        snacks: '04:30 PM - 06:45 PM',
        dinner: '07:00 PM - 10:45 PM',
        closedDays: 'None (Open 7 Days a week for Sattvic service)',
      },
    },

    // 2. General Settings
    general: {
      currency: 'INR',
      currencySymbol: '₹',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12_HOUR',
      defaultLanguage: 'ta_en',
      taxInclusivePricing: false,
      autoRefreshIntervalSeconds: 15,
    },

    // 3 & 4. Roles & Granular Permissions Matrix
    roles_permissions: {
      DEVELOPER_ADMIN: {
        canViewDashboard: true,
        canManageOrders: true,
        canPosBilling: true,
        canKds: true,
        canFloorPlan: true,
        canMenuCrud: true,
        canInventory: true,
        canCrm: true,
        canReports: true,
        canSettings: true,
        canDevSettings: true,
        canDiscounts: true,
        canRefunds: true,
        canVoidKot: true,
        label: 'Developer Admin (Root)',
        badgeColor: '#7c3aed',
      },
      SUPER_ADMIN: {
        canViewDashboard: true,
        canManageOrders: true,
        canPosBilling: true,
        canKds: true,
        canFloorPlan: true,
        canMenuCrud: true,
        canInventory: true,
        canCrm: true,
        canReports: true,
        canSettings: true,
        canDevSettings: false,
        canDiscounts: true,
        canRefunds: true,
        canVoidKot: true,
        label: 'Super Admin (Owner)',
        badgeColor: '#dc2626',
      },
      STORE_MANAGER: {
        canViewDashboard: true,
        canManageOrders: true,
        canPosBilling: true,
        canKds: true,
        canFloorPlan: true,
        canMenuCrud: true,
        canInventory: true,
        canCrm: true,
        canReports: true,
        canSettings: true,
        canDevSettings: false,
        canDiscounts: true,
        canRefunds: true,
        canVoidKot: true,
        label: 'Store Manager',
        badgeColor: '#ea580c',
      },
      CASHIER: {
        canViewDashboard: true,
        canManageOrders: true,
        canPosBilling: true,
        canKds: false,
        canFloorPlan: true,
        canMenuCrud: false,
        canInventory: false,
        canCrm: true,
        canReports: false,
        canSettings: false,
        canDevSettings: false,
        canDiscounts: false,
        canRefunds: false,
        canVoidKot: false,
        label: 'POS Cashier',
        badgeColor: '#0284c7',
      },
      WAITER: {
        canViewDashboard: false,
        canManageOrders: true,
        canPosBilling: false,
        canKds: false,
        canFloorPlan: true,
        canMenuCrud: false,
        canInventory: false,
        canCrm: false,
        canReports: false,
        canSettings: false,
        canDevSettings: false,
        canDiscounts: false,
        canRefunds: false,
        canVoidKot: false,
        label: 'Floor Captain / Waiter',
        badgeColor: '#16a34a',
      },
      KITCHEN: {
        canViewDashboard: false,
        canManageOrders: false,
        canPosBilling: false,
        canKds: true,
        canFloorPlan: false,
        canMenuCrud: false,
        canInventory: true,
        canCrm: false,
        canReports: false,
        canSettings: false,
        canDevSettings: false,
        canDiscounts: false,
        canRefunds: false,
        canVoidKot: false,
        label: 'Kitchen Head & Cooks',
        badgeColor: '#d97706',
      },
      INVENTORY_STAFF: {
        canViewDashboard: false,
        canManageOrders: false,
        canPosBilling: false,
        canKds: false,
        canFloorPlan: false,
        canMenuCrud: false,
        canInventory: true,
        canCrm: false,
        canReports: false,
        canSettings: false,
        canDevSettings: false,
        canDiscounts: false,
        canRefunds: false,
        canVoidKot: false,
        label: 'Inventory Storekeeper',
        badgeColor: '#059669',
      },
    },

    // 5. Order Settings
    orders: {
      enabledOrderTypes: {
        dineIn: true,
        takeaway: true,
        delivery: true,
        qrDineIn: true,
      },
      orderPrefix: 'SGR-',
      kotPrefix: 'KOT-',
      orderNumberPadding: 4,
      numberingResetFrequency: 'DAILY',
      otpExpiryMinutes: 5,
      otpLength: 4,
      requireOtpForQr: true,
      allowPosOtpBypass: true,
      cancellationTimeLimitMinutes: 2,
      requireManagerPinForCancel: true,
      managerPin: '4321',
      cancellationReasonRequired: true,
      preparationWorkflow: [
        { key: 'RECEIVED', label: 'Order Received', color: '#64748b' },
        { key: 'KOT_SENT', label: 'KOT Fired to Kitchen', color: '#f59e0b' },
        { key: 'PREPARING', label: 'Cooking on Station', color: '#3b82f6' },
        { key: 'READY', label: 'Ready for Serving', color: '#10b981' },
        { key: 'SERVED', label: 'Served to Table', color: '#8b5cf6' },
      ],
      slaTiffinMinutes: 10,
      slaMealsMinutes: 15,
      slaBeveragesMinutes: 5,
    },

    // 6. Table & QR Settings
    tables_qr: {
      autoCloseSessionOnBillPaid: true,
      autoCloseDelayMinutes: 5,
      sessionAlertThresholdMinutes: 90,
      allowTableMerge: true,
      qrBaseUrl: 'https://www.srigokulamvegrestaurant.com',
      qrCardTemplate: 'CLASSIC_GOLD',
      tableSections: [
        { id: 'GROUND_FLOOR', label: 'Ground Floor Family Hall', icon: '🏛️' },
        { id: 'AC_HALL', label: 'AC Royal Hall (First Floor)', icon: '❄️' },
        { id: 'VERANDA', label: 'Traditional Courtyard / Veranda', icon: '🌿' },
      ],
    },

    // 7. Menu Settings
    menu_settings: {
      defaultKitchenStation: 'TIFFIN',
      autoMarkSoldOutOnZeroInventory: true,
      allowSpecialCustomizationNotes: true,
      displayTamilLabels: true,
      showDietaryBadges: true,
      defaultGstRate: 5,
    },

    // 8. Billing & Payment Settings
    billing_payments: {
      taxRateCgst: 2.5,
      taxRateSgst: 2.5,
      taxRateIgst: 5.0,
      isCompositionScheme: false,
      serviceChargeEnabled: false,
      serviceChargePercent: 5.0,
      serviceChargeTaxable: false,
      maxDiscountWithoutPin: 10,
      presetDiscountPercentages: [5, 10, 15, 20],
      discountReasonMandatory: true,
      invoicePrefix: 'INV-SGR-',
      invoicePaperWidth: '80MM',
      invoiceHeader: 'SRI GOKULAM VEG RESTAURANT\nAuthentic Chettinad Sattvic Heritage',
      invoiceFooter: 'நன்றி! மீண்டும் வருக! Thank you for dining with us!\nFSSAI Lic No: 12423018000456 | GSTIN: 33AABCS1234F1Z8',
      printFssaiOnBill: true,
      printGstinOnBill: true,
      paymentMethods: {
        cash: { enabled: true, label: 'Cash Tendered' },
        upi: { enabled: true, label: 'Direct UPI (GPay/PhonePe)', vpa: 'srigokulam@sbi' },
        card: { enabled: true, label: 'Credit / Debit Card EDC' },
        diningCredit: { enabled: true, label: 'Loyalty / VIP Dining Credit' },
      },
    },

    // 8B. Bill Slip & Receipt Format Designer Settings
    bill_slip_format: DEFAULT_BILL_SLIP_FORMAT,

    // 9. Printer & KOT Settings
    printers_kot: {
      receiptPrinter: {
        model: 'TVSE RP3200 Plus (3-Inch Thermal)',
        interface: 'USB_SERIAL',
        ipAddress: '192.168.1.100',
        port: 9100,
        paperWidth: '80mm',
        cutAfterPrint: true,
        openCashDrawer: true,
      },
      kitchenPrinters: [
        { id: 'kp_01', station: 'TIFFIN', name: 'Tiffin & Dosa Counter Printer', ip: '192.168.1.101', port: 9100, status: 'ONLINE' },
        { id: 'kp_02', station: 'MEALS', name: 'Meals & Gravy Kitchen Printer', ip: '192.168.1.102', port: 9100, status: 'ONLINE' },
        { id: 'kp_03', station: 'BEVERAGES', name: 'Filter Coffee & Juice Bar Printer', ip: '192.168.1.103', port: 9100, status: 'ONLINE' },
      ],
      kotSplitByStation: true,
      kotLargeFont: true,
      printDuplicateOnAmendment: true,
      buzzerOnNewKot: true,
    },

    // 10. Notification Settings
    notifications: {
      newOrderSoundAlert: true,
      soundTone: 'urgent',
      soundVolume: 80,
      lowStockAlerts: true,
      lowStockThresholdPercent: 20,
      paymentSuccessSpeech: true,
      dailySettlementReminder: true,
      smsOrderUpdates: false,
      whatsappOrderUpdates: true,
    },

    // 11. Inventory Settings
    inventory_config: {
      standardUnits: ['KG', 'LTR', 'G', 'ML', 'BUNCH', 'PIECE', 'PACKET', 'TIN'],
      globalLowStockThreshold: 15,
      criticalStockThreshold: 5,
      perishableExpiryWarningDays: 2,
      dryGroceriesExpiryWarningDays: 14,
      mandatoryWastageReason: true,
      wastageApprovalThreshold: 500,
      autoGeneratePoOnLowStock: false,
    },

    // 12. Customer & Loyalty Settings
    loyalty_customer: {
      customerPrivacyMasking: true,
      loyaltyEnabled: true,
      pointsPerHundredRupees: 1,
      pointValueInInr: 1.0,
      minimumPointsToRedeem: 50,
      pointsExpiryDays: 365,
      vipSpendThreshold: 5000,
      vipVisitThreshold: 10,
      birthdayDiscountPercent: 15,
      activePromotions: [
        { code: 'GOKULAM10', discountPercent: 10, minSpend: 300, validUntil: '2026-12-31', active: true },
        { code: 'FESTIVALFEST', discountPercent: 15, minSpend: 500, validUntil: '2026-11-15', active: true },
      ],
    },

    // 13. Website Settings
    website_config: {
      heroHeadline: 'Authentic Chettinad Sattvic Pure Vegetarian Feast',
      heroSubheadline: 'Handcrafted with pure cow ghee, freshly ground Karaikudi spices & timeless heritage recipes in every bite.',
      announcementStrip: {
        enabled: true,
        text: '100% PURE VEG • Chettinad Sattvic Culinary Heritage • Karaikudi, Tamil Nadu • Open for Dine-In & Takeaway',
        badge: '100% PURE VEG',
      },
      aboutSummary: 'Sri Gokulam Veg Restaurant brings the sacred vegetarian culinary traditions of Chettinad and Tamil Nadu. Every dish is cooked in brass and cast-iron cookware using wood-pressed oils and pure nattu pasu ghee.',
      socialLinks: {
        instagram: 'https://instagram.com/srigokulam_veg',
        facebook: 'https://facebook.com/srigokulamveg',
        googleMaps: 'https://maps.google.com/?q=Sri+Gokulam+Veg+Restaurant+Mudiyarasan+Salai+Near+Bharat+Petroleum+Karaikudi',
        youtube: 'https://youtube.com/@srigokulamveg',
      },
      footerCopyright: '© 2026 Sri Gokulam Veg Restaurant. Crafted by AJ Nanjil Tech Solutions.',
    },

    // 14. Integrations Settings (Truthful status: NOT_CONFIGURED by default until verified)
    integrations: {
      paymentGateway: {
        provider: 'RAZORPAY',
        keyId: '',
        keySecret: '',
        webhookSecret: '',
        isLive: false,
        status: 'NOT_CONFIGURED',
        lastVerifiedAt: null,
      },
      whatsapp: {
        provider: 'INTERAKT',
        apiKey: '',
        phoneNumberId: '',
        status: 'NOT_CONFIGURED',
        lastVerifiedAt: null,
      },
      email: {
        provider: 'RESEND',
        apiKey: '',
        senderEmail: 'orders@srigokulam.com',
        status: 'NOT_CONFIGURED',
        lastVerifiedAt: null,
      },
      githubCdn: {
        repo: 'Sri-Gokulam-Veg-Restaurant/assets-cdn',
        branch: 'main',
        token: '',
        status: 'NOT_CONFIGURED',
        lastVerifiedAt: null,
      },
      aggregators: {
        swiggy: {
          enabled: false,
          restaurantId: '',
          status: 'NOT_CONFIGURED',
          lastSyncAt: null,
        },
        zomato: {
          enabled: false,
          restaurantId: '',
          status: 'NOT_CONFIGURED',
          lastSyncAt: null,
        },
      },
    },

    // 15. Security Settings
    security: {
      twoFactorAuthSuperAdmin: true,
      twoFactorAuthDevAdmin: true,
      sessionTimeoutMinutes: 480,
      maxFailedLoginAttempts: 5,
      lockoutDurationMinutes: 15,
      forceManagerPinForVoids: true,
      activeSessions: [],
    },

    // 17. Developer Settings
    developer: {
      maintenanceMode: false,
      maintenanceMessage: 'Sri Gokulam Online Kitchen is currently undergoing scheduled maintenance. Please visit us directly at Karaikudi or call +91 94431 23456.',
      apiDebugLogging: false,
      logLevel: 'INFO',
      mockPaymentResponses: true,
      rateLimitingEnabled: true,
      corsAllowedOrigins: ['*'],
    },
  },
  website_cms: DEFAULT_WEBSITE_CMS,
};

// Default export alias for external importers
export const DEFAULT_SETTINGS = SEED_DATA.settings;

// Helper to keep legacy top-level keys synchronized with structured settings sections
export function syncLegacySettings(settings) {
  if (!settings) return;
  if (settings.developer?.maintenanceMode !== undefined) {
    settings.maintenanceMode = settings.developer.maintenanceMode;
  }
  if (settings.billing_payments?.taxRateCgst !== undefined) {
    settings.taxRateCgst = settings.billing_payments.taxRateCgst;
  }
  if (settings.billing_payments?.taxRateSgst !== undefined) {
    settings.taxRateSgst = settings.billing_payments.taxRateSgst;
  }
  if (settings.billing_payments?.serviceChargePercent !== undefined) {
    settings.serviceChargePercent = settings.billing_payments.serviceChargePercent;
  }
  if (settings.profile?.address) {
    settings.address = settings.profile.address;
  }
  if (settings.profile?.primaryPhone) {
    settings.phone = settings.profile.primaryPhone;
  }
  if (settings.profile?.gstin) {
    settings.gstin = settings.profile.gstin;
  }
  if (settings.profile?.fssai) {
    settings.fssai = settings.profile.fssai;
  }
  if (settings.general?.currency) {
    settings.currency = settings.general.currency;
  }
  if (settings.notifications?.newOrderSoundAlert !== undefined) {
    settings.soundAlerts = settings.notifications.newOrderSoundAlert;
  }
  if (settings.bill_slip_format) {
    if (settings.bill_slip_format.paperWidth) {
      if (!settings.billing_payments) settings.billing_payments = {};
      settings.billing_payments.invoicePaperWidth = settings.bill_slip_format.paperWidth;
      settings.invoicePaperWidth = settings.bill_slip_format.paperWidth;
    }
    if (settings.bill_slip_format.gstin) {
      if (!settings.profile) settings.profile = {};
      settings.profile.gstin = settings.bill_slip_format.gstin;
      settings.gstin = settings.bill_slip_format.gstin;
    }
    if (settings.bill_slip_format.fssaiNumber) {
      if (!settings.profile) settings.profile = {};
      settings.profile.fssai = settings.bill_slip_format.fssaiNumber;
      settings.fssai = settings.bill_slip_format.fssaiNumber;
    }
  }
}

// Append an audit log entry
export function recordAuditLog({
  user = 'Admin',
  role = 'SUPER_ADMIN',
  module = 'GENERAL',
  action = 'UPDATE',
  detail = '',
  ip = '127.0.0.1',
}) {
  const db = getDb();
  if (!Array.isArray(db.audit_logs)) {
    db.audit_logs = [];
  }
  const entry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    user,
    role,
    module,
    action,
    detail,
    ip,
  };
  db.audit_logs.unshift(entry);
  if (db.audit_logs.length > 500) {
    db.audit_logs = db.audit_logs.slice(0, 500); // Retain latest 500
  }
  saveDb(db);
  return entry;
}

// Mask secret strings for secure safe API transport
export function maskSecret(val) {
  if (!val || typeof val !== 'string') return '';
  const clean = val.trim();
  if (clean.length <= 4) return '••••••••';
  return '••••••••' + clean.slice(-4);
}

// Database Snapshot Backup
export function createDatabaseBackup() {
  const BACKUP_DIR = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_${timestamp}.json`;
  const targetPath = path.join(BACKUP_DIR, filename);
  
  const db = getDb();
  fs.writeFileSync(targetPath, JSON.stringify(db, null, 2), 'utf-8');
  
  const stats = fs.statSync(targetPath);
  return {
    filename,
    sizeBytes: stats.size,
    createdAt: new Date().toISOString(),
  };
}

// List all snapshots
export function listDatabaseBackups() {
  const BACKUP_DIR = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(BACKUP_DIR)) return [];
  try {
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
    return files.map(filename => {
      const p = path.join(BACKUP_DIR, filename);
      const stats = fs.statSync(p);
      return {
        filename,
        sizeBytes: stats.size,
        createdAt: stats.birthtime.toISOString(),
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (e) {
    console.error('Error listing backups:', e);
    return [];
  }
}

// Restore Database from Snapshot
export function restoreDatabaseBackup(filename) {
  const BACKUP_DIR = path.join(DATA_DIR, 'backups');
  const targetPath = path.join(BACKUP_DIR, path.basename(filename));
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Backup file ${filename} does not exist`);
  }
  const content = fs.readFileSync(targetPath, 'utf-8');
  const restored = JSON.parse(content);
  saveDb(restored);
  return {
    success: true,
    message: `Database successfully restored from ${filename}`,
  };
}

// Ensure data directory exists
function ensureDataStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error initializing data store:', err);
  }
}

// Global in-memory cache for fast sub-millisecond access
let memoryStore = null;

export function getDb() {
  if (memoryStore && memoryStore.inventory?.length > 0 && memoryStore.users?.length > 0) {
    return memoryStore;
  }
  
  ensureDataStore();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const loaded = JSON.parse(content);
      // Auto-migrate: populate any missing seed keys
      let needsSave = false;
      for (const [key, value] of Object.entries(SEED_DATA)) {
        if (loaded[key] === undefined) {
          loaded[key] = value;
          needsSave = true;
        }
      }

      // Auto-migrate: guarantee default Developer Admin accounts exist, are active, and are permanently protected
      if (!Array.isArray(loaded.users)) {
        loaded.users = JSON.parse(JSON.stringify(SEED_DATA.users));
        needsSave = true;
      }

      const REQUIRED_DEV_ADMINS = [
        {
          id: 'usr_dev_01',
          fullName: 'AJ Nanjil Tech Solutions',
          email: 'info.ajnanjiltechsolutions@gmail.com',
          phone: '+91 94431 23456',
          role: 'DEVELOPER_ADMIN',
          isActive: true,
          isProtected: true,
          createdAt: '2026-10-15T00:00:00.000Z'
        },
        {
          id: 'usr_dev_02',
          fullName: 'AJ Tech Solutions',
          email: 'info.ajtechsolutions@gmail.com',
          phone: '+91 98765 43210',
          role: 'DEVELOPER_ADMIN',
          isActive: true,
          isProtected: true,
          createdAt: '2026-10-15T00:00:00.000Z'
        }
      ];

      REQUIRED_DEV_ADMINS.forEach(dev => {
        const existing = loaded.users.find(u => u.email && u.email.toLowerCase() === dev.email.toLowerCase());
        if (!existing) {
          loaded.users.unshift({
            ...dev,
            otpHash: null,
            otpExpiresAt: null,
            otpAttempts: 0,
            otpLockoutUntil: null,
            otpResendCount: 0,
            otpLastRequestedAt: null,
          });
          needsSave = true;
        } else {
          // Permanently enforce Developer Admin privileges and protection
          if (existing.role !== 'DEVELOPER_ADMIN' || !existing.isActive || !existing.isProtected) {
            existing.role = 'DEVELOPER_ADMIN';
            existing.isActive = true;
            existing.isProtected = true;
            needsSave = true;
          }
        }
      });

      // Auto-migrate: populate structured settings sub-objects if missing
      if (!loaded.settings) {
        loaded.settings = JSON.parse(JSON.stringify(SEED_DATA.settings));
        needsSave = true;
      } else {
        const sections = [
          'profile', 'general', 'roles_permissions', 'orders', 'tables_qr',
          'menu_settings', 'billing_payments', 'bill_slip_format', 'printers_kot', 'notifications',
          'inventory_config', 'loyalty_customer', 'website_config', 'integrations',
          'security', 'developer'
        ];
        sections.forEach(sec => {
          if (!loaded.settings[sec]) {
            loaded.settings[sec] = JSON.parse(JSON.stringify(SEED_DATA.settings[sec] || {}));
            needsSave = true;
          }
        });
        syncLegacySettings(loaded.settings);
      }

      // Auto-migrate: populate website_cms if missing
      if (!loaded.website_cms) {
        loaded.website_cms = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CMS));
        needsSave = true;
      } else {
        if (!loaded.website_cms.draft) {
          loaded.website_cms.draft = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CMS.draft));
          needsSave = true;
        }
        if (!loaded.website_cms.published) {
          loaded.website_cms.published = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CMS.published));
          needsSave = true;
        }
        if (!Array.isArray(loaded.website_cms.versions) || loaded.website_cms.versions.length === 0) {
          loaded.website_cms.versions = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CMS.versions));
          needsSave = true;
        }
        if (!Array.isArray(loaded.website_cms.auditLog)) {
          loaded.website_cms.auditLog = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CMS.auditLog));
          needsSave = true;
        }
        if (!Array.isArray(loaded.website_cms.mediaLibrary)) {
          loaded.website_cms.mediaLibrary = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CMS.mediaLibrary));
          needsSave = true;
        }
      }

      // Ensure menu dishes have default values for portion, prepTime, dietary, and status
      if (Array.isArray(loaded.menu)) {
        loaded.menu = loaded.menu.map((dish, idx) => {
          const portionSize = dish.portionSize || 'Standard (1 Person)';
          const prepTime = dish.prepTime || (dish.category === 'Meals' ? 15 : (dish.category === 'Beverages' ? 5 : 10));
          const status = dish.status || (dish.available === false ? 'SOLD_OUT' : 'AVAILABLE');
          const isFeatured = dish.isFeatured !== undefined ? dish.isFeatured : (idx === 0 || idx === 4);
          const isBestseller = dish.isBestseller !== undefined ? dish.isBestseller : (idx === 0 || idx === 1 || idx === 6);
          const isChefSpecial = dish.isChefSpecial !== undefined ? dish.isChefSpecial : (idx === 3 || idx === 4 || idx === 5);
          const dietary = dish.dietary || { isVeg: true, isJain: idx === 1, isVegan: idx === 3 || idx === 5, isGlutenFree: idx === 1 || idx === 4, spiceLevel: idx === 0 || idx === 4 ? 3 : (idx === 1 ? 1 : 2) };
          const allergens = dish.allergens || (idx === 0 || idx === 6 || idx === 9 ? ['Dairy/Milk'] : []);
          const ingredients = dish.ingredients || (dish.description ? [dish.description] : ['Chettinad Heritage Spices']);
          const displayOrder = dish.displayOrder || (idx + 1);
          const discount = dish.discount || (idx === 4 ? { active: true, type: 'PERCENT', value: 10, discountedPrice: 189, label: 'Chettinad Heritage Festival', startDate: '2026-10-15', endDate: '2026-10-31' } : { active: false, type: 'PERCENT', value: 0, discountedPrice: dish.price, label: '', startDate: '', endDate: '' });
          const recipeId = dish.recipeId || (idx === 0 ? 'rec_01' : (idx === 1 ? 'rec_02' : (idx === 6 ? 'rec_03' : (idx === 4 ? 'rec_04' : null))));

          if (!dish.portionSize || !dish.prepTime || !dish.status || !dish.dietary || dish.isFeatured === undefined) {
            needsSave = true;
          }

          return {
            ...dish,
            portionSize,
            prepTime,
            status,
            isFeatured,
            isBestseller,
            isChefSpecial,
            dietary,
            allergens,
            ingredients,
            displayOrder,
            discount,
            recipeId,
          };
        });
      }
      memoryStore = loaded;
      if (needsSave) {
        saveDb(loaded);
      }
      return memoryStore;
    }
  } catch (e) {
    console.error('Error reading data file, using seed:', e);
  }

  memoryStore = JSON.parse(JSON.stringify(SEED_DATA));
  return memoryStore;
}

export function saveDb(data) {
  if (data && data.settings) {
    syncLegacySettings(data.settings);
  }
  memoryStore = data;
  try {
    ensureDataStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving data store:', err);
  }
  return memoryStore;
}

// Kitchen Station Categorizer (Requirement 6: Dosa, Tiffin, Meals, Snacks, Beverages)
export function categorizeStation(dishTitle) {
  const t = (dishTitle || '').toLowerCase();
  if (t.includes('coffee') || t.includes('tea') || t.includes('jigarthanda') || t.includes('payasam') || t.includes('butter milk') || t.includes('beverage') || t.includes('drink')) {
    return 'BEVERAGES';
  }
  if (t.includes('paniyaram') || t.includes('bajji') || t.includes('pakoda') || t.includes('bonda') || t.includes('sundal') || t.includes('snack')) {
    return 'SNACKS';
  }
  if (t.includes('meal') || t.includes('biryani') || t.includes('rice') || t.includes('sambar') || t.includes('curry') || t.includes('kuzhambu') || t.includes('gravy') || t.includes('paneer') || t.includes('kathirikai')) {
    return 'MEALS';
  }
  if (t.includes('dosa') || t.includes('roast') || t.includes('uthappam') || t.includes('kal dosa')) {
    return 'DOSA';
  }
  return 'TIFFIN'; // Idli, Vadai, Poori, Pongal
}

// Format 80mm ESC/POS Kitchen Order Ticket (KOT Slip)
export function generateKotReceiptText({
  kotNumber,
  orderId,
  tableNumber,
  orderType = 'DINE_IN',
  customerName = 'Walk-in Guest',
  waiterName = 'Murugan (Floor Captain)',
  station = 'ALL',
  items = [],
  notes = '',
  isSupplementary = false,
  roundNumber = 1,
  createdAt = new Date().toISOString(),
  printCount = 1,
}) {
  const timeStr = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date(createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  const isReprint = printCount > 1;

  let slip = `
==========================================
        KITCHEN ORDER TICKET (KOT)
        SRI GOKULAM VEG RESTAURANT
==========================================
${isReprint ? `*** REPRINT #${printCount - 1} - NOT DUPLICATE PREP ***\n` : ''}${isSupplementary ? `>>> SUPPLEMENTARY TICKET (ROUND ${roundNumber}) <<<\n` : ''}KOT No:       ${kotNumber}
Table No:     ${orderType === 'TAKEAWAY' ? `TAKEAWAY [TK-${tableNumber}]` : `TABLE #${tableNumber}`}
Order Type:   ${orderType}
Guest:        ${customerName}
Waiter / POS: ${waiterName}
Time Placed:  ${timeStr} (${dateStr})
Station:      ${station}
------------------------------------------
QTY   ITEM & COOKING INSTRUCTIONS
------------------------------------------\n`;

  items.forEach(it => {
    slip += ` ${(it.quantity || 1)}x   ${it.title}\n`;
    if (it.variant) {
      slip += `      [Option: ${it.variant}]\n`;
    }
    if (it.addOns && it.addOns.length > 0) {
      slip += `      [Add-on: ${it.addOns.join(', ')}]\n`;
    }
    if (it.specialNotes || it.cookingNotes) {
      slip += `      >> NOTE: ${it.specialNotes || it.cookingNotes} <<\n`;
    }
  });

  if (notes) {
    slip += `------------------------------------------\nOrder Note: ${notes}\n`;
  }

  slip += `------------------------------------------
Total Items:  ${items.reduce((sum, it) => sum + (it.quantity || 1), 0)} items
Station Prep: ${station}
==========================================
`;

  return slip;
}

// Automatic Recipe Bill-of-Materials (BOM) Ingredient Deduction
export function deductRecipeBom(items, db) {
  const alerts = [];
  if (!items || !db || !db.inventory || !db.recipes) return alerts;

  items.forEach(it => {
    const dishName = (it.title || it.name || '').toLowerCase();
    const recipe = db.recipes.find(r => 
      dishName.includes(r.menuItemName.toLowerCase()) || 
      r.menuItemName.toLowerCase().includes(dishName)
    );

    if (recipe && recipe.ingredients) {
      recipe.ingredients.forEach(ing => {
        const invItem = db.inventory.find(i => i.id === ing.invId);
        if (invItem) {
          const deductQty = ing.qty * (it.quantity || 1);
          invItem.currentStock = Math.max(0, Number((invItem.currentStock - deductQty).toFixed(3)));
          if (invItem.currentStock <= invItem.lowStockThreshold) {
            alerts.push({
              id: `alert_${invItem.id}_${Date.now()}`,
              name: invItem.name,
              currentStock: invItem.currentStock,
              unit: invItem.unit,
              threshold: invItem.lowStockThreshold,
            });
          }
        }
      });
    }
  });

  return alerts;
}

// ══════════════════════════════════════════════════════════════════════
// SRI GOKULAM CLIENT WEBSITE CMS ENGINE & VERSION RECOVERY
// ══════════════════════════════════════════════════════════════════════

// Retrieve Website CMS state with comprehensive deep auto-migration
export function getWebsiteCms() {
  const db = getDb();
  let needsSave = false;

  if (!db.website_cms) {
    db.website_cms = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CMS));
    needsSave = true;
  }

  const initial = createInitialContentSnapshot();

  // Ensure draft has all required collections
  if (!db.website_cms.draft) {
    db.website_cms.draft = JSON.parse(JSON.stringify(initial));
    needsSave = true;
  } else {
    for (const [key, val] of Object.entries(initial)) {
      if (db.website_cms.draft[key] === undefined) {
        db.website_cms.draft[key] = JSON.parse(JSON.stringify(val));
        needsSave = true;
      }
    }
  }

  // Ensure published has all required collections
  if (!db.website_cms.published) {
    db.website_cms.published = JSON.parse(JSON.stringify(initial));
    needsSave = true;
  } else {
    for (const [key, val] of Object.entries(initial)) {
      if (db.website_cms.published[key] === undefined) {
        db.website_cms.published[key] = JSON.parse(JSON.stringify(val));
        needsSave = true;
      }
    }
  }

  // Auto-migrate developer attribution and website url to AJ Nanjil Tech Solutions
  ['draft', 'published'].forEach((target) => {
    if (db.website_cms[target]?.footer) {
      const f = db.website_cms[target].footer;
      if (!f.developerUrl || f.developerUrl.includes('netlify') || f.developerUrl === 'https://ajtechsolutions.netlify.app/') {
        f.developerUrl = 'https://ajnanjiltechsolutions.com/';
        needsSave = true;
      }
      if (f.developerName !== 'AJ Nanjil Tech Solutions') {
        f.developerName = 'AJ Nanjil Tech Solutions';
        needsSave = true;
      }
      if (f.developerCreditText && f.developerCreditText.includes('ajtechsolutions')) {
        f.developerCreditText = 'Designed & Developed with excellence by';
        needsSave = true;
      }
    }
  });

  if (needsSave) {
    saveDb(db);
  }

  return db.website_cms;
}

// Save Website Draft
export function saveWebsiteDraft(draftData, user = { name: 'Admin', role: 'STORE_MANAGER' }) {
  const db = getDb();
  if (!db.website_cms) {
    db.website_cms = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CMS));
  }
  db.website_cms.draft = {
    ...db.website_cms.draft,
    ...draftData,
    updatedAt: new Date().toISOString(),
    updatedBy: user.name || 'Admin',
  };
  recordCmsAuditLog('SAVE_DRAFT', 'Updated website draft configuration', user.name, user.role);
  saveDb(db);
  return db.website_cms;
}

// Save AND Publish Website CMS in 1 step so live site is updated immediately
export function saveAndPublishWebsiteCms(data, user = { name: 'Admin', role: 'SUPER_ADMIN' }, changeSummary = 'Updated and published live website') {
  const db = getDb();
  if (!db.website_cms) {
    db.website_cms = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CMS));
  }
  // Update draft
  db.website_cms.draft = {
    ...db.website_cms.draft,
    ...data,
    updatedAt: new Date().toISOString(),
    updatedBy: user.name || 'Admin',
  };

  // Directly copy updated draft state to published
  const snapshot = JSON.parse(JSON.stringify(db.website_cms.draft));
  db.website_cms.published = snapshot;

  const versionCount = (db.website_cms.versions?.length || 0) + 1;
  const versionNum = `1.${versionCount}.0`;
  const newVersion = {
    id: `ver_${Date.now()}`,
    versionNumber: versionNum,
    timestamp: new Date().toISOString(),
    publishedBy: user.name || 'Admin',
    role: user.role || 'SUPER_ADMIN',
    summary: changeSummary || 'Direct live website update',
    snapshot,
  };

  if (!Array.isArray(db.website_cms.versions)) {
    db.website_cms.versions = [];
  }
  db.website_cms.versions.unshift(newVersion);
  if (db.website_cms.versions.length > 50) {
    db.website_cms.versions = db.website_cms.versions.slice(0, 50);
  }

  recordCmsAuditLog('LIVE_UPDATE', `Live website updated (${versionNum}): ${changeSummary}`, user.name, user.role);
  saveDb(db);
  return {
    success: true,
    publishedVersion: versionNum,
    published: db.website_cms.published,
    draft: db.website_cms.draft,
    versions: db.website_cms.versions,
  };
}

// Publish Website CMS (Draft -> Published + Creates Version Snapshot)
export function publishWebsiteCms(user = { name: 'Admin', role: 'SUPER_ADMIN' }, changeSummary = 'Published changes to live customer website') {
  const db = getDb();
  if (!db.website_cms) {
    db.website_cms = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CMS));
  }
  const snapshot = JSON.parse(JSON.stringify(db.website_cms.draft));
  db.website_cms.published = snapshot;

  const versionCount = (db.website_cms.versions?.length || 0) + 1;
  const versionNum = `1.${versionCount}.0`;
  const newVersion = {
    id: `ver_${Date.now()}`,
    versionNumber: versionNum,
    timestamp: new Date().toISOString(),
    publishedBy: user.name || 'Admin',
    role: user.role || 'SUPER_ADMIN',
    summary: changeSummary || 'Published website update',
    snapshot,
  };

  if (!Array.isArray(db.website_cms.versions)) {
    db.website_cms.versions = [];
  }
  db.website_cms.versions.unshift(newVersion);
  if (db.website_cms.versions.length > 50) {
    db.website_cms.versions = db.website_cms.versions.slice(0, 50);
  }

  recordCmsAuditLog('PUBLISH', `Live website published (Version ${versionNum}): ${changeSummary}`, user.name, user.role);
  saveDb(db);
  return {
    success: true,
    publishedVersion: versionNum,
    published: db.website_cms.published,
    versions: db.website_cms.versions,
  };
}

// Rollback Website to a previous Version Snapshot
export function rollbackWebsiteVersion(versionId, user = { name: 'Admin', role: 'SUPER_ADMIN' }) {
  const db = getDb();
  if (!db.website_cms || !Array.isArray(db.website_cms.versions)) {
    throw new Error('No version history available for rollback');
  }
  const targetVersion = db.website_cms.versions.find(v => v.id === versionId);
  if (!targetVersion || !targetVersion.snapshot) {
    throw new Error(`Version ${versionId} not found`);
  }

  // Restore snapshot into both published and draft
  const restoredSnapshot = JSON.parse(JSON.stringify(targetVersion.snapshot));
  db.website_cms.published = restoredSnapshot;
  db.website_cms.draft = JSON.parse(JSON.stringify(restoredSnapshot));

  // Record audit log
  recordCmsAuditLog('ROLLBACK', `Restored live website to Version ${targetVersion.versionNumber} (${targetVersion.id})`, user.name, user.role);
  saveDb(db);

  return {
    success: true,
    message: `Restored live website to Version ${targetVersion.versionNumber}`,
    restoredVersion: targetVersion.versionNumber,
    cms: db.website_cms,
  };
}

// Record CMS Audit Log
export function recordCmsAuditLog(action, details, user = 'Admin', role = 'STORE_MANAGER') {
  const db = getDb();
  if (!db.website_cms) {
    db.website_cms = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CMS));
  }
  if (!Array.isArray(db.website_cms.auditLog)) {
    db.website_cms.auditLog = [];
  }
  const entry = {
    id: `cms_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    action,
    details,
    user: user || 'Admin',
    role: role || 'STORE_MANAGER',
  };
  db.website_cms.auditLog.unshift(entry);
  if (db.website_cms.auditLog.length > 200) {
    db.website_cms.auditLog = db.website_cms.auditLog.slice(0, 200);
  }
  return entry;
}

// ══════════════════════════════════════════════════════════════════════
// DEVELOPER ADMIN SAFEGUARD & RBAC VALIDATORS
// ══════════════════════════════════════════════════════════════════════

// Verify if an email belongs to permanently protected Developer Admin
export function isProtectedDeveloperEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return PROTECTED_DEVELOPER_EMAILS.some(e => e.toLowerCase() === email.trim().toLowerCase());
}

// Check if caller can modify/delete target staff user
export function canCallerManageUser(callerRole, targetUser) {
  if (!targetUser) return { allowed: false, reason: 'Target user does not exist' };
  
  // Developer Admins are permanently protected against any demotion, deactivation, privilege change, or deletion
  if (isProtectedDeveloperEmail(targetUser.email) || targetUser.isProtected) {
    return {
      allowed: false,
      reason: 'Developer Admin accounts are permanently protected. Privileges cannot be modified, demoted, deactivated, or deleted by anyone.',
    };
  }

  if (callerRole === 'DEVELOPER_ADMIN') {
    return { allowed: true };
  }

  if (callerRole === 'SUPER_ADMIN') {
    // Owner Admin cannot touch Developer Admin or other Owner Admin accounts
    if (targetUser.role === 'DEVELOPER_ADMIN' || targetUser.role === 'SUPER_ADMIN') {
      return {
        allowed: false,
        reason: 'Owner Admin cannot modify, demote, or delete Developer Admin or other Owner Admin accounts.',
      };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'Insufficient privileges to manage staff accounts.' };
}

// Check if caller can assign role when creating/promoting
export function canCallerCreateRole(callerRole, targetRole) {
  if (targetRole === 'DEVELOPER_ADMIN' || targetRole === 'SUPER_ADMIN') {
    if (callerRole !== 'DEVELOPER_ADMIN') {
      return {
        allowed: false,
        reason: 'Restricted: Only Developer Admins can create Owner Admin (Super Admin) or Developer Admin accounts.',
      };
    }
    return { allowed: true };
  }

  if (callerRole === 'DEVELOPER_ADMIN' || callerRole === 'SUPER_ADMIN') {
    return { allowed: true };
  }

  return { allowed: false, reason: 'Insufficient privileges to create staff accounts.' };
}

// ══════════════════════════════════════════════════════════════════════
// SECURE SESSION TOKEN MANAGEMENT & CRYPTOGRAPHIC ENGINE
// ══════════════════════════════════════════════════════════════════════

export const AUTH_SECRET =
  process.env.APP_SECRET ||
  process.env.SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'sgr_sattvic_karaikudi_secret_key_2026_production_master_8e9b4c2a71f053e1987d65c4b3a2019f';

export function createSignedToken(payload) {
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payloadStr).digest('base64url');
  return `${payloadStr}.${sig}`;
}

export function verifySignedToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadStr, sig] = parts;
  if (!payloadStr || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payloadStr).digest('base64url');
  if (sig.length !== expectedSig.length) return null;
  const valid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  if (!valid) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    return payload;
  } catch (e) {
    return null;
  }
}

export function createSession(user, meta = {}) {
  const db = getDb();
  if (!Array.isArray(db.sessions)) {
    db.sessions = [];
  }

  const sessionData = {
    userId: user.id,
    email: user.email.toLowerCase(),
    role: user.role,
    fullName: user.fullName,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    device: meta.device || 'Admin Web Terminal (Chrome / Edge)',
    ip: meta.ip || '127.0.0.1',
  };

  // Create cryptographically signed token that works across any serverless lambda container
  const token = createSignedToken(sessionData);
  const session = {
    ...sessionData,
    token,
  };

  // Prune expired sessions and track in-memory
  db.sessions = (db.sessions || []).filter(s => new Date(s.expiresAt) > new Date());
  db.sessions.unshift(session);

  // Sync with active security sessions
  if (db.settings?.security) {
    if (!Array.isArray(db.settings.security.activeSessions)) {
      db.settings.security.activeSessions = [];
    }
    db.settings.security.activeSessions = db.settings.security.activeSessions.filter(s => s.id !== `sess_${user.id}`);
    db.settings.security.activeSessions.unshift({
      id: `sess_${token.slice(0, 8)}`,
      userName: user.fullName,
      role: user.role,
      device: session.device,
      ip: session.ip,
      loginTime: session.createdAt,
      lastActive: session.createdAt,
      isCurrent: true,
    });
  }

  saveDb(db);
  return session;
}

export function validateSession(token) {
  if (!token) return null;
  const db = getDb();

  // 1. Verify stateless cryptographic signed token first (serverless-proof)
  const decoded = verifySignedToken(token);
  if (decoded) {
    if (new Date() > new Date(decoded.expiresAt)) {
      return null;
    }
    let user = (db.users || []).find(u => u.email && u.email.toLowerCase() === decoded.email.toLowerCase());
    if (!user) {
      if (isProtectedDeveloperEmail(decoded.email)) {
        user = {
          id: decoded.userId || 'usr_dev_01',
          fullName: decoded.fullName || 'AJ Tech Solutions',
          email: decoded.email,
          role: 'DEVELOPER_ADMIN',
          isActive: true,
          isProtected: true,
        };
      } else {
        return null;
      }
    }
    if (!user.isActive) return null;
    return { session: decoded, user };
  }

  // 2. Fallback to state-based session lookup (for older hex tokens)
  if (Array.isArray(db.sessions)) {
    const session = db.sessions.find(s => s.token === token);
    if (session) {
      if (new Date() > new Date(session.expiresAt)) {
        db.sessions = db.sessions.filter(s => s.token !== token);
        saveDb(db);
        return null;
      }
      const user = (db.users || []).find(u => u.email.toLowerCase() === session.email.toLowerCase());
      if (!user || !user.isActive) return null;
      return { session, user };
    }
  }

  return null;
}

export function destroySession(token) {
  if (!token) return false;
  const db = getDb();
  if (Array.isArray(db.sessions)) {
    db.sessions = db.sessions.filter(s => s.token !== token);
    saveDb(db);
  }
  return true;
}

// ══════════════════════════════════════════════════════════════════════
// CUSTOMER CRM & OTP AUTHENTICATION ENGINE
// ══════════════════════════════════════════════════════════════════════

export function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  const cleaned = String(rawPhone).replace(/[^\d+]/g, '').trim();
  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    return cleaned.slice(3);
  }
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned.slice(2);
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return cleaned.slice(1);
  }
  return cleaned;
}

export function maskEmailAddress(email) {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [user, domain] = parts;
  if (user.length <= 2) {
    return `${user[0]}*@${domain}`;
  }
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(3, user.length - 2))}@${domain}`;
}

export function recordCustomerTransaction({ name, phone, email, order, bill, amount = 0, gstin = '', address = '' }) {
  if (!phone) return null;
  const normPhone = normalizePhoneNumber(phone);
  if (!normPhone || normPhone.length < 8) return null;

  const db = getDb();
  if (!Array.isArray(db.customers)) {
    db.customers = [];
  }

  const existing = db.customers.find(c => normalizePhoneNumber(c.phone) === normPhone);
  const now = new Date().toISOString();
  const numericAmount = Math.max(0, Number(amount) || 0);

  if (existing) {
    // Update name if current name is generic or new valid name provided
    if (name && name.trim() && (!existing.name || existing.name === 'Walk-in' || existing.name === 'Walk-in Guest' || existing.name === 'Guest' || existing.name === 'Valued Diner')) {
      existing.name = name.trim();
    }
    // Update or link email if provided
    if (email && email.trim() && (!existing.email || existing.email === '')) {
      existing.email = email.trim().toLowerCase();
    }
    if (gstin && gstin.trim()) existing.gstin = gstin.trim();
    if (address && address.trim()) existing.address = address.trim();

    existing.totalOrders = (existing.totalOrders || 0) + (order ? 1 : 0);
    existing.totalSpent = (existing.totalSpent || 0) + numericAmount;
    existing.loyaltyPoints = (existing.loyaltyPoints || 0) + Math.floor(numericAmount / 50);
    existing.lastOrderDate = now;

    if (order && (order.id || order.orderId)) {
      const ordId = order.id || order.orderId;
      existing.orderIds = existing.orderIds || [];
      if (!existing.orderIds.includes(ordId)) {
        existing.orderIds.unshift(ordId);
      }
    }
    if (bill && bill.billNumber) {
      existing.billNumbers = existing.billNumbers || [];
      if (!existing.billNumbers.includes(bill.billNumber)) {
        existing.billNumbers.unshift(bill.billNumber);
      }
    }

    saveDb(db);
    return existing;
  }

  // Create new customer account automatically from genuine restaurant order/bill
  const newCust = {
    id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: (name && name.trim()) || 'Valued Diner',
    phone: normPhone,
    email: (email && email.trim().toLowerCase()) || '',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    totalOrders: order ? 1 : (bill ? 1 : 0),
    totalSpent: numericAmount,
    loyaltyPoints: Math.floor(numericAmount / 50),
    gstin: gstin || '',
    address: address || '',
    dietaryPreferences: { isVeg: true, isJain: false, isVegan: false, isGlutenFree: false },
    savedAddresses: address ? [{ id: 'addr_1', label: 'Default Address', fullAddress: address }] : [],
    createdAt: now,
    lastOrderDate: now,
    orderIds: order && (order.id || order.orderId) ? [order.id || order.orderId] : [],
    billNumbers: bill && bill.billNumber ? [bill.billNumber] : [],
    otpHash: null,
    otpExpiresAt: null,
  };

  db.customers.unshift(newCust);
  saveDb(db);
  return newCust;
}

export function findCustomerByPhone(phone) {
  if (!phone) return null;
  const norm = normalizePhoneNumber(phone);
  const db = getDb();
  if (!Array.isArray(db.customers)) return null;
  return db.customers.find(c => normalizePhoneNumber(c.phone) === norm) || null;
}

export function createCustomerSession(customer, meta = {}) {
  const db = getDb();
  if (!Array.isArray(db.customer_sessions)) {
    db.customer_sessions = [];
  }
  const token = crypto.randomBytes(32).toString('hex');
  const session = {
    token,
    customerId: customer.id,
    phone: customer.phone,
    email: customer.email,
    name: customer.name,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    device: meta.device || 'Customer Web Browser',
    ip: meta.ip || '127.0.0.1',
  };

  db.customer_sessions = db.customer_sessions.filter(s => new Date(s.expiresAt) > new Date());
  db.customer_sessions.unshift(session);
  saveDb(db);

  return { token, session };
}

export function validateCustomerSession(token) {
  if (!token) return null;
  const db = getDb();
  if (!Array.isArray(db.customer_sessions)) return null;

  const session = db.customer_sessions.find(s => s.token === token);
  if (!session) return null;

  if (new Date() > new Date(session.expiresAt)) {
    db.customer_sessions = db.customer_sessions.filter(s => s.token !== token);
    saveDb(db);
    return null;
  }

  const customer = (db.customers || []).find(c => c.id === session.customerId || normalizePhoneNumber(c.phone) === normalizePhoneNumber(session.phone));
  if (!customer) return null;

  return { session, customer };
}

export function destroyCustomerSession(token) {
  if (!token) return false;
  const db = getDb();
  if (!Array.isArray(db.customer_sessions)) return true;
  db.customer_sessions = db.customer_sessions.filter(s => s.token !== token);
  saveDb(db);
  return true;
}

