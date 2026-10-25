'use client';

// app/admin/page.js - Sri Gokulam Enterprise Back-Office Admin Suite
// Fully optimized for TVSE TP 415C 15" Touch POS (1024x768) & TVSE RP3200 Plus 3" Thermal Printer
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import styles from './admin.module.css';
import ReportsDashboard from './components/ReportsDashboard';
import SettingsDashboard from './components/SettingsDashboard';
import WebsiteCmsDashboard from './components/WebsiteCmsDashboard';
import ManualBillModal from './components/ManualBillModal';
import EditBillBeforePrintModal from './components/EditBillBeforePrintModal';
import BillSlipFormatDesigner from './components/BillSlipFormatDesigner';

// Pre-seeded staff roles
const STAFF_PRESETS = [
  { role: 'DEVELOPER_ADMIN', name: 'AJ Nanjil Tech Solutions', email: 'info.ajnanjiltechsolutions@gmail.com', badge: '#7c3aed' },
  { role: 'DEVELOPER_ADMIN', name: 'AJ Tech Solutions', email: 'info.ajtechsolutions@gmail.com', badge: '#7c3aed' },
  { role: 'SUPER_ADMIN', name: 'Owner - Sri Gokulam', email: 'owner@srigokulam.com', badge: '#dc2626' },
  { role: 'STORE_MANAGER', name: 'Karthikeyan (Manager)', email: 'manager@srigokulam.com', badge: '#ea580c' },
  { role: 'CASHIER', name: 'Rajan (POS Cashier)', email: 'cashier@srigokulam.com', badge: '#0284c7' },
  { role: 'WAITER', name: 'Murugan (Floor Captain)', email: 'waiter@srigokulam.com', badge: '#16a34a' },
  { role: 'KITCHEN', name: 'Selvam (Head Cook)', email: 'kitchen@srigokulam.com', badge: '#d97706' },
];

const DEFAULT_POS_MENU = [];

export default function AdminPage() {
  // Theme State (Light / Dark) — Scoped strictly to Admin Container!
  const [theme, setTheme] = useState('light'); // default to Light for bright restaurant POS counters

  useEffect(() => {
    const saved = localStorage.getItem('sgr_admin_theme');
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
    }
    const storedUser = localStorage.getItem('sgr_admin_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.email) {
          setCurrentUser({
            name: parsed.fullName || parsed.name || 'Admin',
            email: parsed.email,
            role: parsed.role,
            badge: parsed.role === 'DEVELOPER_ADMIN' ? '#7c3aed' : '#dc2626',
          });
        }
      } catch (e) {}
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('sgr_admin_theme', next);
  };

  // Current logged in user & role
  const [currentUser, setCurrentUser] = useState(STAFF_PRESETS[0]);

  // Synchronize with verified admin session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sgr_admin_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.email) {
            setCurrentUser({
              name: parsed.fullName || parsed.name || 'Admin',
              email: parsed.email,
              role: parsed.role || 'DEVELOPER_ADMIN',
              badge: parsed.role === 'DEVELOPER_ADMIN' ? '#7c3aed' : (parsed.role === 'SUPER_ADMIN' ? '#dc2626' : '#ea580c'),
            });
          }
        } catch (e) {}
      }
    }
  }, []);

  const [activeTab, setActiveTabState] = useState('overview');

  const setActiveTab = useCallback((tab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) {
        setActiveTabState(tabParam);
      }
    }
  }, []);

  const [sseConnected, setSseConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);

  // Dashboard Enhancement States (12 Requirements)
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [notificationsList, setNotificationsList] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemData, setNewItemData] = useState({ title: '', tamilTitle: '', category: 'Tiffin', price: '', description: '' });
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Web Audio API Synthesizer for Kitchen & POS Chimes (Zero latency, no asset files needed)
  const playChime = useCallback((type = 'notification') => {
    if (!soundAlerts || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'urgent') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // AudioContext autoplay restrictions handled gracefully
    }
  }, [soundAlerts]);

  // Data states
  const [analytics, setAnalytics] = useState(null);
  const [posData, setPosData] = useState({
    tables: [],
    menu: DEFAULT_POS_MENU,
    customers: [],
    recentBills: [],
    currentShift: null,
    heldOrders: [],
    qrOrders: [],
    refundLogs: [],
    settings: {},
  });
  const [selectedTable, setSelectedTable] = useState(null);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountFlat, setDiscountFlat] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [lastSettledBill, setLastSettledBill] = useState(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [showManualBillModal, setShowManualBillModal] = useState(false);
  const [editBillTarget, setEditBillTarget] = useState(null);
  const [showSlipDesignerModal, setShowSlipDesignerModal] = useState(false);

  // Enhanced POS States (18 Requirements)
  const [posOrderType, setPosOrderType] = useState('DINE_IN'); // DINE_IN, TAKEAWAY, DELIVERY
  const [posCustomer, setPosCustomer] = useState({ name: 'Walk-in Guest', phone: '', tag: 'Walk-in' });
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('all');
  const [posCart, setPosCart] = useState([]);
  const [posActiveView, setPosActiveView] = useState('CART'); // 'CART' or 'TABLE_BILL'

  // POS Modals
  const [showTablePickerModal, setShowTablePickerModal] = useState(false);
  const [customizingDish, setCustomizingDish] = useState(null);
  const [customVariant, setCustomVariant] = useState(null);
  const [customAddOns, setCustomAddOns] = useState([]);
  const [customNotes, setCustomNotes] = useState('');
  const [showCustomerPickerModal, setShowCustomerPickerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [showQrOrdersModal, setShowQrOrdersModal] = useState(false);
  const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftPayoutAmt, setShiftPayoutAmt] = useState('');
  const [shiftPayoutDesc, setShiftPayoutDesc] = useState('');
  const [shiftCloseCash, setShiftCloseCash] = useState('');
  const [shiftReportReceipt, setShiftReportReceipt] = useState(null);
  const [showBillsHistoryModal, setShowBillsHistoryModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitMethod, setSplitMethod] = useState('EQUAL'); // 'EQUAL' or 'CUSTOM'
  const [splitGuestsCount, setSplitGuestsCount] = useState(2);
  const [splitLines, setSplitLines] = useState([
    { id: 1, label: 'Guest 1', mode: 'CASH', amount: '' },
    { id: 2, label: 'Guest 2', mode: 'UPI', amount: '' },
  ]);
  const [showManagerPinModal, setShowManagerPinModal] = useState(false);
  const [managerPinAction, setManagerPinAction] = useState(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [voidBillTarget, setVoidBillTarget] = useState(null);
  const [voidReasonText, setVoidReasonText] = useState('');
  const [refundBillTarget, setRefundBillTarget] = useState(null);
  const [refundAmountVal, setRefundAmountVal] = useState('');
  const [refundReasonText, setRefundReasonText] = useState('');

  // TVSE Touch POS Tender & Change Calculation
  const [cashTendered, setCashTendered] = useState('');
  const [showNumpad, setShowNumpad] = useState(false);

  // KDS states (15 Requirements)
  const [kdsTickets, setKdsTickets] = useState([]);
  const [kdsSummary, setKdsSummary] = useState({});
  const [kdsStation, setKdsStation] = useState('ALL'); // 'ALL', 'DOSA', 'TIFFIN', 'MEALS', 'SNACKS', 'BEVERAGES'
  const [kdsView, setKdsView] = useState('ACTIVE'); // 'ACTIVE' or 'HISTORY'
  const [kdsHistoryStatus, setKdsHistoryStatus] = useState('ALL'); // 'ALL', 'READY', 'SERVED', 'CANCELLED'
  const [kdsSearch, setKdsSearch] = useState('');
  const [kdsPendingOtpOrders, setKdsPendingOtpOrders] = useState([]);
  const [kdsSelectedTicketForSlip, setKdsSelectedTicketForSlip] = useState(null);
  const [kdsCancelTicketModal, setKdsCancelTicketModal] = useState(null);
  const [kdsCancelReason, setKdsCancelReason] = useState('');
  const [kdsManagerPin, setKdsManagerPin] = useState('');
  const [, setKdsTimerTick] = useState(0);

  // Floor plan & Table Management states (20 Requirements)
  const [floorPlans, setFloorPlans] = useState([
    { id: 'GROUND_FLOOR', name: 'Ground Floor Dining', tamilName: 'தரைத்தளம் சாப்பாட்டு கூடம்', icon: '🏛️', description: 'Main traditional Chettinad dining area with open counter', floorLevel: 0 },
    { id: 'AC_HALL', name: 'AC Royal Hall', tamilName: 'ஏசி ராயல் ஹால்', icon: '❄️', description: 'Air-conditioned premium family dining hall', floorLevel: 1 },
    { id: 'VERANDA', name: 'Chettinad Veranda', tamilName: 'செட்டிநாடு வராண்டா', icon: '🌿', description: 'Traditional open-air courtyard and garden seating', floorLevel: 0 },
  ]);
  const [showAddFloorPlanModal, setShowAddFloorPlanModal] = useState(false);
  const [newFloorPlanForm, setNewFloorPlanForm] = useState({
    name: '',
    tamilName: '',
    icon: '🏛️',
    floorLevel: 0,
    description: '',
  });
  const [floorPlanToDelete, setFloorPlanToDelete] = useState(null);
  const [deletePlanPin, setDeletePlanPin] = useState('');
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  const [floorSections, setFloorSections] = useState({ GROUND_FLOOR: [], AC_HALL: [], VERANDA: [] });
  const [floorStats, setFloorStats] = useState({});
  const [floorTables, setFloorTables] = useState([]);
  const [floorReservations, setFloorReservations] = useState([]);
  const [floorWaitlist, setFloorWaitlist] = useState([]);
  const [floorSessionLogs, setFloorSessionLogs] = useState([]);
  const [floorWaiters, setFloorWaiters] = useState([]);
  const [floorFilterStatus, setFloorFilterStatus] = useState('ALL');
  const [floorFilterSection, setFloorFilterSection] = useState('ALL');
  const [floorFilterCapacity, setFloorFilterCapacity] = useState('ALL');
  const [floorFilterWaiter, setFloorFilterWaiter] = useState('ALL');
  const [floorSearch, setFloorSearch] = useState('');
  const [floorSelectedTable, setFloorSelectedTable] = useState(null); // Table Drawer Inspector
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableData, setNewTableData] = useState({ tableNumber: '', capacity: 4, section: 'GROUND_FLOOR', shape: 'SQUARE', assignedWaiter: 'Murugan (Floor Captain)' });
  const [showEditTableModal, setShowEditTableModal] = useState(null);
  const [showQrStandeeModal, setShowQrStandeeModal] = useState(null);
  const [qrStandeeData, setQrStandeeData] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergePrimaryTable, setMergePrimaryTable] = useState('');
  const [mergeSelectedTables, setMergeSelectedTables] = useState([]);
  const [showReservationsModal, setShowReservationsModal] = useState(false);
  const [newReservationData, setNewReservationData] = useState({ guestName: '', phone: '', partySize: 2, tableNumber: '01', date: '', timeSlot: '01:00 PM', specialRequests: '' });
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [newWaitlistData, setNewWaitlistData] = useState({ guestName: '', phone: '', partySize: 2, preferredSection: 'GROUND_FLOOR', notes: '' });
  const [showTableHistoryModal, setShowTableHistoryModal] = useState(false);
  const [showAddItemsTableModal, setShowAddItemsTableModal] = useState(false);
  const [selectedDishToAdd, setSelectedDishToAdd] = useState('dish_01');
  const [addDishQty, setAddDishQty] = useState(1);
  const [addDishNotes, setAddDishNotes] = useState('');
  const [drawerPaymentMethod, setDrawerPaymentMethod] = useState('UPI');
  const [drawerTxnRef, setDrawerTxnRef] = useState('');
  const [drawerAmount, setDrawerAmount] = useState('');
  const [qrStandeePreviewMode, setQrStandeePreviewMode] = useState('4X6'); // '4X6' or '80MM'
  const [waitlistSeatTableNum, setWaitlistSeatTableNum] = useState('');

  // ─── Inventory, Suppliers & Food Costing States (12 Comprehensive Requirements) ───
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [wastageLogs, setWastageLogs] = useState([]);
  const [invSummary, setInvSummary] = useState({
    totalIngredients: 0,
    availableStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    expiringSoonCount: 0,
    expiredCount: 0,
    totalValuation: 0,
    monthlyPurchasesTotal: 0,
    monthlyWastageTotal: 0,
    avgFoodCostPercent: 28,
  });
  const [invActiveSubTab, setInvActiveSubTab] = useState('STOCK'); // 'STOCK', 'RECIPES', 'PURCHASES', 'SUPPLIERS', 'ADJUSTMENTS', 'REPORTS'
  const [invSearchQuery, setInvSearchQuery] = useState('');
  const [invCategoryFilter, setInvCategoryFilter] = useState('ALL');
  const [invSupplierFilter, setInvSupplierFilter] = useState('ALL');
  const [invStockStatusFilter, setInvStockStatusFilter] = useState('ALL');
  const [invLoading, setInvLoading] = useState(false);

  // Quick Restock & Spoilage
  const [restockItem, setRestockItem] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [spoilageItem, setSpoilageItem] = useState(null);
  const [spoilageQty, setSpoilageQty] = useState('');
  const [spoilageReason, setSpoilageReason] = useState('SPOILED');

  // Modals for Inventory Management
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [ingredientForm, setIngredientForm] = useState({
    id: null,
    name: '',
    tamilName: '',
    category: 'BASE',
    unit: 'KG',
    currentStock: 10,
    lowStockThreshold: 3,
    costPerUnit: 50,
    supplierId: '',
    expiryDate: '',
    storageLocation: 'Dry Provisions Store',
  });

  const [showStockAdjustmentModal, setShowStockAdjustmentModal] = useState(false);
  const [stockAdjustForm, setStockAdjustForm] = useState({
    itemId: '',
    adjustmentType: 'SPOILED', // 'SPOILED', 'DAMAGED', 'EXPIRED', 'PREP_ERROR', 'RETURNED', 'MANUAL_CORRECTION'
    quantity: '',
    reason: 'SPOILED',
    notes: '',
  });

  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [poForm, setPoForm] = useState({
    supplierId: '',
    invoiceNumber: '',
    notes: '',
    items: [{ invId: '', qty: 10, unitPrice: 0 }],
  });

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    id: null,
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    categories: ['BASE'],
    paymentTerms: 'Net 30 Days',
    paymentStatus: 'PAID',
    balanceDue: 0,
  });

  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipeForm, setRecipeForm] = useState({
    id: null,
    menuItemName: '',
    sellingPrice: 100,
    ingredients: [{ invId: '', qty: 0.1, unit: 'KG' }],
  });

  // Developer Hub states
  const [devSettings, setDevSettings] = useState({});
  const [staffUsers, setStaffUsers] = useState([]);

  // ─── Menu Management States (18 Comprehensive Requirements) ─────────────
  const [menuItems, setMenuItems] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [menuAuditLogs, setMenuAuditLogs] = useState([]);
  const [menuSummary, setMenuSummary] = useState({
    totalItems: 0,
    totalArchived: 0,
    totalCategories: 0,
    availableCount: 0,
    soldOutCount: 0,
    unavailableCount: 0,
    featuredCount: 0,
    bestsellerCount: 0,
    activeOffersCount: 0,
    recipeLinkedCount: 0,
  });
  const [menuLoading, setMenuLoading] = useState(false);
  const [mealSections, setMealSections] = useState([]);
  const [savingMealSectionId, setSavingMealSectionId] = useState(null);
  const [menuMealSectionFilter, setMenuMealSectionFilter] = useState('ALL');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuSelectedCategory, setMenuSelectedCategory] = useState('ALL');
  const [menuAvailabilityFilter, setMenuAvailabilityFilter] = useState('ALL');
  const [menuStationFilter, setMenuStationFilter] = useState('ALL');
  const [menuDietaryFilter, setMenuDietaryFilter] = useState('ALL');
  const [menuSortBy, setMenuSortBy] = useState('displayOrder');
  const [menuViewMode, setMenuViewMode] = useState('cards'); // 'cards' | 'table'
  const [selectedDishIds, setSelectedDishIds] = useState([]);
  const [showArchivedDishes, setShowArchivedDishes] = useState(false);

  // Menu Modals & Sub-Panels
  const [showDishModal, setShowDishModal] = useState(false);
  const [dishModalMode, setDishModalMode] = useState('ADD'); // 'ADD' | 'EDIT'
  const [dishFormTab, setDishFormTab] = useState('INFO'); // 'INFO' | 'VARIANTS' | 'DIETARY' | 'OFFER' | 'RECIPE' | 'PHOTO'
  const [dishFormData, setDishFormData] = useState({
    id: '',
    title: '',
    tamilTitle: '',
    mealSection: 'BREAKFAST',
    category: 'Tiffin',
    price: '',
    portionSize: 'Standard (1 Person)',
    prepTime: 10,
    image: '',
    description: '',
    station: 'TIFFIN',
    available: true,
    status: 'AVAILABLE',
    isFeatured: false,
    isBestseller: false,
    isChefSpecial: false,
    dietary: { isVeg: true, isJain: false, isVegan: false, isGlutenFree: false, spiceLevel: 2 },
    allergens: [],
    ingredients: [],
    variants: [{ name: 'Standard Portion', priceDiff: 0 }],
    addOns: [],
    recipeId: null,
    discount: { active: false, type: 'PERCENT', value: 0, discountedPrice: 0, label: '', startDate: '', endDate: '' },
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadStatus, setImageUploadStatus] = useState('');

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({ id: '', name: '', tamilName: '', icon: '🍽️', description: '', station: 'TIFFIN' });
  const [isEditingCategory, setIsEditingCategory] = useState(false);

  const [showAuditLogsModal, setShowAuditLogsModal] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [bulkActionType, setBulkActionType] = useState('STATUS'); // 'STATUS' | 'CATEGORY' | 'PRICE' | 'DELETE'
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState('Tiffin');
  const [bulkPriceDeltaType, setBulkPriceDeltaType] = useState('FLAT');
  const [bulkPriceDeltaValue, setBulkPriceDeltaValue] = useState(10);

  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [csvImportText, setCsvImportText] = useState('');

  // ─── Module 8: Live Order Management Dashboard States ───────────────────
  const [ordersList, setOrdersList] = useState([]);
  const [ordersSummary, setOrdersSummary] = useState({
    totalToday: 0,
    otpPending: 0,
    otpVerified: 0,
    kotSent: 0,
    preparing: 0,
    readyToServe: 0,
    served: 0,
    billed: 0,
    paid: 0,
    cancelled: 0,
    delayedCount: 0,
    activeCount: 0,
    qrCount: 0,
    posCount: 0,
  });
  const [ordersFilter, setOrdersFilter] = useState('ALL'); // 'ALL', 'QR', 'POS', 'PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [showEditItemsModal, setShowEditItemsModal] = useState(false);
  const [editOrderItems, setEditOrderItems] = useState([]);
  const [editCookingNotes, setEditCookingNotes] = useState('');
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('Guest requested cancellation');
  const [showBillModal, setShowBillModal] = useState(false);
  const [billDiscountPercent, setBillDiscountPercent] = useState(0);
  const [billDiscountReason, setBillDiscountReason] = useState('');
  const [billPaymentMode, setBillPaymentMode] = useState('CASH');
  const [billCashTendered, setBillCashTendered] = useState('');
  const [billTransactionRef, setBillTransactionRef] = useState('');
  const [showThermalReceiptModal, setShowThermalReceiptModal] = useState(false);
  const [thermalReceiptText, setThermalReceiptText] = useState('');
  const [showKotSlipModal, setShowKotSlipModal] = useState(false);
  const [kotSlipText, setKotSlipText] = useState('');
  const [ordersViewMode, setOrdersViewMode] = useState('CARDS'); // 'CARDS' | 'TABLE'
  const [addDishSelectId, setAddDishSelectId] = useState('');
  const [addDishPortion, setAddDishPortion] = useState('Standard');

  // ─── Customer CRM & Loyalty Management States ──────────────────────────
  const [crmCustomers, setCrmCustomers] = useState([]);
  const [crmSummary, setCrmSummary] = useState({
    totalCustomers: 0,
    newThisMonth: 0,
    returningCustomers: 0,
    retentionRate: 0,
    totalLoyaltyPoints: 0,
    totalSpendAll: 0,
    averageSpendPerCustomer: 0,
    vipCount: 0,
  });
  const [crmSegmentDistribution, setCrmSegmentDistribution] = useState({
    ALL: 0,
    NEW: 0,
    REGULAR: 0,
    VIP: 0,
    HIGH_SPENDING: 0,
    INACTIVE: 0,
  });
  const [crmTopCustomers, setCrmTopCustomers] = useState([]);
  const [crmSelectedSegment, setCrmSelectedSegment] = useState('ALL');
  const [crmSearch, setCrmSearch] = useState('');
  const [crmSortBy, setCrmSortBy] = useState('recent'); // 'recent', 'visits', 'spend', 'points'
  const [crmLoading, setCrmLoading] = useState(false);
  const [privacyMasked, setPrivacyMasked] = useState(false); // Front desk privacy toggle
  const [crmSelectedCustomer, setCrmSelectedCustomer] = useState(null);
  const [crmModalTab, setCrmModalTab] = useState('OVERVIEW'); // 'OVERVIEW', 'ORDERS', 'DISHES', 'LOYALTY', 'FEEDBACK', 'NOTES', 'OFFERS'

  // CRM Modals
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustForm, setNewCustForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    birthday: '',
    anniversary: '',
    initialPoints: 50,
    notes: '',
    segment: 'NEW',
  });
  const [showAdjustLoyaltyModal, setShowAdjustLoyaltyModal] = useState(false);
  const [loyaltyAdjustForm, setLoyaltyAdjustForm] = useState({
    points: 100,
    type: 'EARN',
    reason: 'Dining Visit Reward',
  });
  const [showAddFeedbackModal, setShowAddFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    category: 'Food Taste',
    comments: '',
    status: 'RESOLVED',
  });
  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState({
    title: 'Chettinad Special Treat (10% Off)',
    promoCode: 'CHETTI-10',
    discountPercent: 10,
    validTill: '2026-12-31',
    type: 'PROMOTION',
  });
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({
    text: '',
    type: 'PREFERENCE',
  });

  // Toast notice helper
  const showNotice = (msg, isErr = false) => {
    setStatusNotice({ text: msg, isErr });
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // ─── Data Fetching Loaders ──────────────────────────────────────────────
  const fetchAnalytics = useCallback(async (period = selectedPeriod) => {
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data);
        if (data.notifications) {
          setNotificationsList(data.notifications);
        }
      }
    } catch (e) {
      console.error('Failed to load analytics:', e);
    }
  }, [selectedPeriod]);

  const fetchPos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pos');
      const data = await res.json();
      if (data.success) {
        setPosData(data);
        setSelectedTable(prev => {
          if (prev) {
            const updated = (data.tables || []).find(t => t.id === prev.id || t.tableNumber === prev.tableNumber);
            if (!updated) return prev;
            if (
              updated.subtotal === prev.subtotal &&
              updated.status === prev.status &&
              updated.activeOrderId === prev.activeOrderId
            ) {
              return prev;
            }
            return updated;
          }
          const active = (data.tables || []).find(t => t.subtotal > 0);
          return active || null;
        });
      }
    } catch (e) {
      console.error('Failed to load POS:', e);
    }
  }, []);

  const fetchKds = useCallback(async (station = kdsStation, view = kdsView, status = kdsHistoryStatus) => {
    try {
      const res = await fetch(`/api/admin/kds?station=${station}&view=${view}&status=${status}`);
      const data = await res.json();
      if (data.success) {
        setKdsTickets(data.tickets || []);
        setKdsSummary(data.summary || {});
        if (data.pendingOtpOrders) {
          setKdsPendingOtpOrders(data.pendingOtpOrders);
        }
      }
    } catch (e) {
      console.error('Failed to load KDS:', e);
    }
  }, [kdsStation, kdsView, kdsHistoryStatus]);

  // Live ticking interval for KDS preparation timers (Requirement 7)
  useEffect(() => {
    if (activeTab !== 'kds') return;
    const interval = setInterval(() => {
      setKdsTimerTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchFloor = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/floor?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.floorPlans) && data.floorPlans.length > 0) {
          setFloorPlans(data.floorPlans);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('sgr_floor_plans', JSON.stringify(data.floorPlans));
            } catch (err) {}
          }
        }
        setFloorSections(data.sections || {});
        setFloorStats(data.stats || {});
        if (Array.isArray(data.tables)) {
          setFloorTables(data.tables);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('sgr_floor_tables', JSON.stringify(data.tables));
            } catch (err) {}
          }
        }
        setFloorReservations(data.reservations || []);
        setFloorWaitlist(data.waitlist || []);
        setFloorSessionLogs(data.sessionLogs || []);
        setFloorWaiters((data.waiters || []).map(w => typeof w === 'object' ? (w.name || w.fullName || w.id) : w));
        setFloorSelectedTable(prev => {
          if (!prev) return null;
          return (data.tables || []).find(t => String(t.tableNumber) === String(prev.tableNumber)) || prev;
        });
      }
    } catch (e) {
      console.error('Failed to load floor:', e);
      if (typeof window !== 'undefined') {
        try {
          const cachedPlans = localStorage.getItem('sgr_floor_plans');
          if (cachedPlans) setFloorPlans(JSON.parse(cachedPlans));
          const cachedTables = localStorage.getItem('sgr_floor_tables');
          if (cachedTables) setFloorTables(JSON.parse(cachedTables));
        } catch (err) {}
      }
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      setInvLoading(true);
      const query = new URLSearchParams();
      if (invSearchQuery) query.set('search', invSearchQuery);
      if (invCategoryFilter && invCategoryFilter !== 'ALL') query.set('category', invCategoryFilter);
      if (invSupplierFilter && invSupplierFilter !== 'ALL') query.set('supplier', invSupplierFilter);
      if (invStockStatusFilter && invStockStatusFilter !== 'ALL') query.set('stockStatus', invStockStatusFilter);

      const res = await fetch(`/api/admin/inventory?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setInventory(data.inventory || []);
        setSuppliers(data.suppliers || []);
        setPurchaseOrders(data.purchaseOrders || []);
        setStockMovements(data.stockMovements || []);
        setRecipes(data.recipes || []);
        setWastageLogs(data.wastageLogs || []);
        setInvSummary(data.summary || {});
      }
    } catch (e) {
      console.error('Failed to load inventory:', e);
    } finally {
      setInvLoading(false);
    }
  }, [invSearchQuery, invCategoryFilter, invSupplierFilter, invStockStatusFilter]);

  const fetchDevHub = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/features');
      const data = await res.json();
      if (data.success) setDevSettings(data.settings);

      const staffRes = await fetch('/api/auth/login');
      const staffData = await staffRes.json();
      if (staffData.success) setStaffUsers(staffData.users);
    } catch (e) {
      console.error('Failed to load DevHub:', e);
    }
  }, []);

  const fetchMenu = useCallback(async () => {
    try {
      setMenuLoading(true);
      const res = await fetch(`/api/admin/menu?includeArchived=true&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      const data = await res.json();
      if (data.success) {
        const rawItems = data.allMenu || data.menu || [];
        const hydratedItems = rawItems.map(item => {
          if (item.image && typeof window !== 'undefined') {
            try {
              localStorage.setItem('sgr_dish_img_' + item.id, item.image);
              if (item.title) localStorage.setItem('sgr_dish_img_' + item.title, item.image);
            } catch (e) {}
            return item;
          }
          if (!item.image && typeof window !== 'undefined') {
            try {
              const localImg = localStorage.getItem('sgr_dish_img_' + item.id) || localStorage.getItem('sgr_dish_img_' + item.title);
              if (localImg) return { ...item, image: localImg };
            } catch (e) {}
          }
          return item;
        });
        setMenuItems(hydratedItems);
        setCategoriesList(data.categories || []);
        setMenuAuditLogs(data.auditLogs || []);
        if (Array.isArray(data.mealSections)) setMealSections(data.mealSections);
        if (data.summary) setMenuSummary(data.summary);
      }
    } catch (e) {
      console.error('Failed to load menu:', e);
    } finally {
      setMenuLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      const query = new URLSearchParams();
      if (ordersFilter && ordersFilter !== 'ALL') query.set('filter', ordersFilter);
      if (ordersSearch) query.set('search', ordersSearch);

      const res = await fetch(`/api/admin/orders?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrdersList(data.orders || []);
        if (data.summary) setOrdersSummary(data.summary);
      }
    } catch (e) {
      console.error('Failed to load live orders:', e);
    } finally {
      setOrdersLoading(false);
    }
  }, [ordersFilter, ordersSearch]);

  const fetchCrmCustomers = useCallback(async () => {
    try {
      setCrmLoading(true);
      const query = new URLSearchParams();
      if (crmSelectedSegment && crmSelectedSegment !== 'ALL') query.set('segment', crmSelectedSegment);
      if (crmSearch) query.set('search', crmSearch);
      if (crmSortBy) query.set('sort', crmSortBy);

      const res = await fetch(`/api/admin/crm?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCrmCustomers(data.customers || []);
        if (data.summary) setCrmSummary(data.summary);
        if (data.segmentDistribution) setCrmSegmentDistribution(data.segmentDistribution);
        if (data.topCustomers) setCrmTopCustomers(data.topCustomers);
      }
    } catch (e) {
      console.error('Failed to load CRM data:', e);
    } finally {
      setCrmLoading(false);
    }
  }, [crmSelectedSegment, crmSearch, crmSortBy]);

  // Initial load - runs only once on mount
  useEffect(() => {
    fetchAnalytics();
    fetchPos();
    fetchKds();
    fetchFloor();
    fetchInventory();
    fetchDevHub();
    fetchMenu();
    fetchOrders();
    fetchCrmCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling interval for live orders when tab is active (gentle 30s background check)
  useEffect(() => {
    if (activeTab !== 'orders') return;
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab, fetchOrders]);

  // Refresh CRM when CRM tab is activated
  useEffect(() => {
    if (activeTab === 'crm') {
      fetchCrmCustomers();
    }
  }, [activeTab, fetchCrmCustomers]);

  // Refresh Floor Plan when Floor tab is activated
  useEffect(() => {
    if (activeTab === 'floor') {
      fetchFloor();
    }
  }, [activeTab, fetchFloor]);

  // ─── Real-Time SSE Subscription (Stable persistent connection) ───────────
  const sseCallbacksRef = useRef({});
  sseCallbacksRef.current = {
    fetchPos,
    fetchKds,
    fetchFloor,
    fetchAnalytics,
    fetchInventory,
    fetchMenu,
    fetchOrders,
    fetchCrmCustomers,
    playChime,
  };

  useEffect(() => {
    let evtSource = null;
    try {
      evtSource = new EventSource('/api/events');
      evtSource.onopen = () => setSseConnected(true);
      evtSource.onerror = () => setSseConnected(false);

      evtSource.addEventListener('message', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if ([
            'BILL_SETTLED',
            'ORDER_CREATED',
            'OTP_VERIFIED',
            'KDS_STATUS_CHANGE',
            'TABLE_STATUS_CHANGED',
            'MENU_UPDATED',
            'ORDERS_UPDATED',
            'NEW_ORDER_OTP_PENDING',
            'ORDER_OTP_VERIFIED',
            'KITCHEN_KOT_FIRED',
            'ORDER_STATUS_UPDATE',
            'BILL_GENERATED',
            'BILL_PAID',
            'ORDER_CANCELLED',
          ].includes(payload.type) || (payload.type && payload.type.startsWith('CRM_'))) {
            const cb = sseCallbacksRef.current;
            cb.fetchPos?.();
            cb.fetchKds?.();
            cb.fetchFloor?.();
            cb.fetchAnalytics?.();
            cb.fetchInventory?.();
            cb.fetchMenu?.();
            cb.fetchOrders?.();
            cb.fetchCrmCustomers?.();
            cb.playChime?.(['BILL_SETTLED', 'BILL_PAID', 'ORDER_OTP_VERIFIED', 'CRM_LOYALTY_ADJUSTED'].includes(payload.type) ? 'notification' : 'urgent');
          }
        } catch (err) {}
      });
    } catch (err) {
      console.error('SSE initialization error:', err);
    }

    return () => {
      if (evtSource) evtSource.close();
    };
  }, []);

  // ─── Role Switcher ──────────────────────────────────────────────────────
  const handleRoleChange = (e) => {
    const roleKey = e.target.value;
    const found = STAFF_PRESETS.find(s => s.role === roleKey);
    if (found) {
      setCurrentUser(found);
      showNotice(`Switched to: ${found.name} (${found.role})`);
    }
  };

  // ─── POS Cart & Bill Computations (Requirements 4, 9, 10, 11) ───────────
  const cartSubtotal = useMemo(() => {
    return posCart.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity || 1)), 0);
  }, [posCart]);

  // Active bill subtotal based on view
  const activeBillSubtotal = useMemo(() => {
    if (posActiveView === 'TABLE_BILL' && selectedTable?.subtotal > 0) {
      return selectedTable.subtotal;
    }
    return cartSubtotal;
  }, [posActiveView, selectedTable, cartSubtotal]);

  // Net payable with discounts, optional service charge, taxes & round-off
  const netPayable = useMemo(() => {
    const sub = activeBillSubtotal;
    if (sub <= 0) return 0;
    let disc = 0;
    if (discountFlat > 0) disc = Math.min(sub, Number(discountFlat));
    else if (discountPercent > 0) disc = Math.min(sub, (sub * Number(discountPercent)) / 100);
    const discounted = Math.max(0, sub - disc);
    const serviceCharge = serviceChargeEnabled ? (discounted * 0.05) : 0;
    const taxable = discounted + serviceCharge;
    const gst = taxable * 0.05; // 2.5% CGST + 2.5% SGST
    return Math.round(taxable + gst);
  }, [activeBillSubtotal, discountFlat, discountPercent, serviceChargeEnabled]);

  // Change to return to customer for cash tender
  const changeToReturn = useMemo(() => {
    if (!cashTendered || isNaN(Number(cashTendered)) || netPayable <= 0) return 0;
    return Math.max(0, Number(cashTendered) - netPayable);
  }, [cashTendered, netPayable]);

  // ─── POS Food Item & Cart Operations (Requirements 1, 4) ──────────────────
  const handleDishClick = (dish) => {
    if ((dish.variants && dish.variants.length > 0) || (dish.addOns && dish.addOns.length > 0)) {
      setCustomizingDish(dish);
      setCustomVariant(dish.variants ? dish.variants[0] : null);
      setCustomAddOns([]);
      setCustomNotes('');
    } else {
      // Add directly
      setPosCart(prev => {
        const existingIdx = prev.findIndex(it => it.dishId === dish.id && !it.variant && (!it.addOns || it.addOns.length === 0));
        if (existingIdx > -1) {
          const copy = [...prev];
          copy[existingIdx].quantity += 1;
          return copy;
        }
        return [...prev, {
          id: `it_${Date.now()}_${Math.random()}`,
          dishId: dish.id,
          title: dish.title,
          price: dish.price,
          quantity: 1,
          variant: null,
          addOns: [],
          specialNotes: '',
          station: dish.station || 'TIFFIN',
        }];
      });
      playChime('notification');
      showNotice(`Added ${dish.title} to Cart`);
    }
  };

  const handleConfirmCustomization = () => {
    if (!customizingDish) return;
    const variantDiff = customVariant?.priceDiff || 0;
    const addOnsTotal = customAddOns.reduce((sum, a) => sum + (a.price || 0), 0);
    const finalPrice = customizingDish.price + variantDiff + addOnsTotal;

    setPosCart(prev => [
      ...prev,
      {
        id: `it_${Date.now()}_${Math.random()}`,
        dishId: customizingDish.id,
        title: customizingDish.title,
        price: finalPrice,
        quantity: 1,
        variant: customVariant?.name || null,
        addOns: customAddOns.map(a => a.name),
        specialNotes: customNotes.trim(),
        station: customizingDish.station || 'TIFFIN',
      }
    ]);

    playChime('notification');
    showNotice(`Added ${customizingDish.title} (${customVariant?.name || 'Custom'}) to Cart`);
    setCustomizingDish(null);
  };

  const handleCartQty = (index, delta) => {
    setPosCart(prev => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        copy.splice(index, 1);
      } else {
        copy[index].quantity = newQty;
      }
      return copy;
    });
  };

  const handleRemoveCartItem = (index) => {
    setPosCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleCartNoteChange = (index, note) => {
    setPosCart(prev => {
      const copy = [...prev];
      copy[index].specialNotes = note;
      return copy;
    });
  };

  const handleClearCart = () => {
    setPosCart([]);
    showNotice('Shopping cart cleared');
  };

  // ─── Hold & Resume Orders (Requirement 17) ──────────────────────────────
  const handleHoldOrder = async () => {
    if (posCart.length === 0) {
      showNotice('Cart is empty, nothing to hold', true);
      return;
    }
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'HOLD_ORDER',
          orderData: {
            orderType: posOrderType,
            tableNumber: selectedTable?.tableNumber || '01',
            customer: posCustomer,
            items: posCart,
            subtotal: cartSubtotal,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('Order parked on hold');
        setPosCart([]);
        fetchPos();
      }
    } catch (e) {
      showNotice('Failed to hold order', true);
    }
  };

  const handleResumeOrder = async (held) => {
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESUME_ORDER', orderId: held.id }),
      });
      const data = await res.json();
      if (data.success && data.resumedOrder) {
        setPosCart(data.resumedOrder.items || []);
        if (data.resumedOrder.orderType) setPosOrderType(data.resumedOrder.orderType);
        if (data.resumedOrder.customer) setPosCustomer(data.resumedOrder.customer);
        if (data.resumedOrder.tableNumber && posData.tables) {
          const tbl = posData.tables.find(t => String(t.tableNumber) === String(data.resumedOrder.tableNumber));
          if (tbl) setSelectedTable(tbl);
        }
        setShowHeldOrdersModal(false);
        showNotice('Order resumed into cart');
        fetchPos();
      }
    } catch (e) {
      showNotice('Failed to resume order', true);
    }
  };

  // ─── KOT Punch & Kitchen Routing (Requirement 6, 16) ────────────────────
  const handlePunchKot = async () => {
    if (posCart.length === 0) {
      showNotice('Shopping cart is empty', true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PUNCH_KOT',
          orderType: posOrderType,
          tableNumber: posOrderType === 'TAKEAWAY' ? 'TK' : (selectedTable?.tableNumber || '01'),
          customer: posCustomer,
          items: posCart,
          cashierName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        playChime('urgent');
        showNotice(`KOT ${data.kot.kotNumber} routed to Kitchen!`);
        if (data.bomAlerts && data.bomAlerts.length > 0) {
          showNotice(`⚠️ Low Stock Alert: ${data.bomAlerts[0].name}`, true);
        }
        setPosCart([]);
        setPosActiveView('TABLE_BILL');
        fetchPos();
        fetchKds();
        fetchFloor();
        fetchInventory();
      } else {
        showNotice(data.error || 'Failed to punch KOT', true);
      }
    } catch (e) {
      showNotice('Network error punching KOT', true);
    } finally {
      setLoading(false);
    }
  };

  // ─── POS Bill Settlement & Thermal Slip (Requirements 9, 10, 11, 12) ─────
  const handleSettleBill = async () => {
    const tableNum = posOrderType === 'TAKEAWAY' ? 'TK' : selectedTable?.tableNumber;
    if (!tableNum && posOrderType === 'DINE_IN') {
      showNotice('Please select an active table to settle', true);
      return;
    }

    // Role check for high discount
    if (Number(discountPercent) > 15 && currentUser.role === 'CASHIER') {
      setManagerPinAction({
        type: 'SETTLE_WITH_DISCOUNT',
        title: `Authorize ${discountPercent}% Discount`,
        onConfirm: () => executeSettleBill(),
      });
      setShowManagerPinModal(true);
      return;
    }

    await executeSettleBill();
  };

  const executeSettleBill = async () => {
    setLoading(true);
    try {
      const tableNum = posOrderType === 'TAKEAWAY' ? 'TK' : selectedTable?.tableNumber;
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SETTLE_BILL',
          tableNumber: tableNum,
          orderType: posOrderType,
          customer: posCustomer,
          paymentMode,
          splitDetails: paymentMode === 'SPLIT' ? splitLines : null,
          transactionRef,
          discountPercent: Number(discountPercent) || 0,
          discountFlat: Number(discountFlat) || 0,
          discountReason: discountReason || 'Counter Settlement',
          serviceChargePercent: serviceChargeEnabled ? 5 : 0,
          cashierName: currentUser.name,
        }),
      });

      const data = await res.json();
      if (data.success) {
        playChime('notification');
        showNotice(`Bill ${data.bill.billNumber} settled: ₹${data.bill.totalAmount}`);
        setActiveReceipt(data.thermalReceipt);
        setLastSettledBill(data.bill);
        fetchPos();
        fetchFloor();
        fetchAnalytics();
        setDiscountPercent('');
        setDiscountFlat('');
        setDiscountReason('');
        setCashTendered('');
        setTransactionRef('');
        setPosActiveView('CART');
      } else {
        showNotice(data.error || 'Failed to settle bill', true);
      }
    } catch (e) {
      showNotice('Network error settling bill', true);
    } finally {
      setLoading(false);
    }
  };

  // ─── Void Bill & Refund Handlers (Requirements 13, 18) ───────────────────
  const handleVoidBill = async () => {
    if (!voidBillTarget || !voidReasonText || voidReasonText.trim().length < 4) {
      showNotice('Please enter a valid reason for voiding this bill', true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VOID_BILL',
          billNumber: voidBillTarget.billNumber,
          tableNumber: voidBillTarget.tableNumber,
          reason: voidReasonText,
          authorizedBy: currentUser.name,
          managerPin: enteredPin || '1234',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Bill #${voidBillTarget.billNumber} voided successfully`);
        setVoidBillTarget(null);
        setVoidReasonText('');
        setEnteredPin('');
        fetchPos();
        fetchFloor();
        fetchAnalytics();
      } else {
        showNotice(data.error || 'Void failed', true);
      }
    } catch (e) {
      showNotice('Network error voiding bill', true);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!refundBillTarget || !refundAmountVal || !refundReasonText) {
      showNotice('Please enter refund amount and mandatory reason', true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PROCESS_REFUND',
          billNumber: refundBillTarget.billNumber,
          amount: Number(refundAmountVal),
          reason: refundReasonText,
          authorizedBy: currentUser.name,
          managerPin: enteredPin || '1234',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Refund of ₹${refundAmountVal} processed`);
        setRefundBillTarget(null);
        setRefundAmountVal('');
        setRefundReasonText('');
        setEnteredPin('');
        fetchPos();
        fetchAnalytics();
      } else {
        showNotice(data.error || 'Refund failed', true);
      }
    } catch (e) {
      showNotice('Network error processing refund', true);
    } finally {
      setLoading(false);
    }
  };

  // ─── QR Order Acceptance (Requirement 7) ─────────────────────────────────
  const handleMergeQrOrder = async (qrOrderId) => {
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MERGE_QR_ORDER', qrOrderId }),
      });
      const data = await res.json();
      if (data.success) {
        playChime('notification');
        showNotice('Customer QR Order approved & merged into POS!');
        setShowQrOrdersModal(false);
        fetchPos();
        fetchFloor();
      } else {
        showNotice(data.error || 'Failed to merge QR order', true);
      }
    } catch (e) {
      showNotice('Network error accepting QR order', true);
    }
  };

  // ─── Cashier Shift Actions (Requirement 14) ──────────────────────────────
  const handleShiftPayout = async () => {
    if (!shiftPayoutAmt || Number(shiftPayoutAmt) <= 0) {
      showNotice('Enter valid payout amount', true);
      return;
    }
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SHIFT_ACTION',
          shiftAction: 'CASH_PAYOUT',
          payoutAmount: Number(shiftPayoutAmt),
          payoutReason: shiftPayoutDesc || 'Petty cash purchase',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Logged ₹${shiftPayoutAmt} cash withdrawal`);
        setShiftPayoutAmt('');
        setShiftPayoutDesc('');
        fetchPos();
      }
    } catch (e) {
      showNotice('Failed to log payout', true);
    }
  };

  const handleCloseShift = async () => {
    if (!shiftCloseCash) {
      showNotice('Please enter closing cash counted in drawer', true);
      return;
    }
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SHIFT_ACTION',
          shiftAction: 'CLOSE_SHIFT',
          closingCash: Number(shiftCloseCash),
        }),
      });
      const data = await res.json();
      if (data.success && data.shift) {
        const sh = data.shift;
        const xzSlip = `
==========================================
        SRI GOKULAM VEG RESTAURANT
    CASHIER SHIFT SUMMARY (Z-REPORT)
==========================================
Shift ID:     ${sh.id}
Cashier:      ${sh.cashierName}
Opened At:    ${new Date(sh.startedAt).toLocaleTimeString()}
Closed At:    ${new Date(sh.closedAt).toLocaleTimeString()}
------------------------------------------
Opening Float:                 Rs ${sh.openingFloat.toFixed(2)}
Cash Sales:                    Rs ${sh.cashSales.toFixed(2)}
UPI Sales:                     Rs ${sh.upiSales.toFixed(2)}
Card Sales:                    Rs ${sh.cardSales.toFixed(2)}
------------------------------------------
Total Collections:             Rs ${(sh.cashSales + sh.upiSales + sh.cardSales).toFixed(2)}
Petty Cash Payouts:           -Rs ${((sh.payouts || []).reduce((s, p) => s + p.amount, 0)).toFixed(2)}
------------------------------------------
Expected Cash in Drawer:       Rs ${sh.expectedCash.toFixed(2)}
Actual Cash Counted:           Rs ${sh.closingCash.toFixed(2)}
Cash Difference / Variance:    Rs ${sh.difference >= 0 ? '+' : ''}${sh.difference.toFixed(2)}
==========================================
Status: SHIFT CLOSED & VERIFIED
`;
        setShiftReportReceipt(xzSlip);
        showNotice('Cashier shift closed successfully');
        fetchPos();
      }
    } catch (e) {
      showNotice('Failed to close shift', true);
    }
  };

  // ─── Direct Print to TVSE RP3200 Plus Thermal Printer ───────────────────
  const handlePrintReceipt = () => {
    window.print();
  };

  // ─── KDS Handlers (15 Requirements) ─────────────────────────────────────
  const handleKdsAdvance = async (ticket, nextStatus) => {
    try {
      const res = await fetch('/api/admin/kds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          ticketId: ticket.id,
          kotNumber: ticket.kotNumber,
          orderId: ticket.orderId,
          newStatus: nextStatus,
          staffName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (nextStatus === 'READY') {
          playChime('urgent');
          showNotice(`🔔 Food READY for Table #${ticket.tableNumber}! Waiter notified.`);
        } else if (nextStatus === 'PREPARING') {
          playChime('notification');
          showNotice(`🍳 Preparation started for Table #${ticket.tableNumber} (Recipe BOM Deducted)`);
          fetchInventory();
        } else if (nextStatus === 'ACCEPTED') {
          showNotice(`✓ KOT #${ticket.kotNumber} accepted by ${currentUser.name}`);
        } else if (nextStatus === 'SERVED') {
          showNotice(`🍽️ Food served to Table #${ticket.tableNumber}`);
        }
        fetchKds();
        fetchFloor();
        fetchPos();
      } else {
        showNotice(data.error || 'Failed to update ticket status', true);
      }
    } catch (e) {
      showNotice('Error advancing KDS status', true);
    }
  };

  const handleKdsPrintTicket = async (ticket) => {
    try {
      const res = await fetch('/api/admin/kds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PRINT_KOT',
          ticketId: ticket.id,
          kotNumber: ticket.kotNumber,
        }),
      });
      const data = await res.json();
      if (data.success && data.thermalSlip) {
        setKdsSelectedTicketForSlip({ ...ticket, thermalSlip: data.thermalSlip, printCount: data.printCount });
        showNotice(`KOT #${ticket.kotNumber} thermal ticket ready`);
      } else {
        showNotice(data.error || 'Failed to generate KOT slip', true);
      }
    } catch (e) {
      showNotice('Network error printing KOT', true);
    }
  };

  const handleKdsNotifyWaiter = async (ticket) => {
    try {
      const res = await fetch('/api/admin/kds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'NOTIFY_WAITER',
          ticketId: ticket.id,
          kotNumber: ticket.kotNumber,
        }),
      });
      const data = await res.json();
      if (data.success) {
        playChime('urgent');
        showNotice(`📢 Waiter alerted for Table #${ticket.tableNumber} pickup!`);
      }
    } catch (e) {
      showNotice('Failed to notify waiter', true);
    }
  };

  const handleKdsCancelSubmit = async () => {
    if (!kdsCancelTicketModal || !kdsCancelReason || kdsCancelReason.trim().length < 4) {
      showNotice('Please enter a mandatory cancellation reason (min 4 chars)', true);
      return;
    }

    // Role check: WAITER or CASHIER needs PIN 1234
    if ((currentUser.role === 'CASHIER' || currentUser.role === 'WAITER') && kdsManagerPin !== '1234') {
      showNotice('Invalid Manager PIN. Default is 1234', true);
      return;
    }

    try {
      const res = await fetch('/api/admin/kds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CANCEL_KOT',
          ticketId: kdsCancelTicketModal.id,
          kotNumber: kdsCancelTicketModal.kotNumber,
          reason: kdsCancelReason.trim(),
          staffName: currentUser.name,
          managerPin: kdsManagerPin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`KOT #${kdsCancelTicketModal.kotNumber} cancelled`);
        setKdsCancelTicketModal(null);
        setKdsCancelReason('');
        setKdsManagerPin('');
        fetchKds();
        fetchFloor();
        fetchPos();
      } else {
        showNotice(data.error || 'Failed to cancel KOT', true);
      }
    } catch (e) {
      showNotice('Network error cancelling KOT', true);
    }
  };

  // ─── Floor Table Status Change ──────────────────────────────────────────
  const handleFloorStatus = async (tableNumber, newStatus) => {
    try {
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          tableNumber,
          newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Table #${tableNumber} is now ${newStatus}`);
        fetchFloor();
        fetchPos();
      }
    } catch (e) {
      showNotice('Error updating table', true);
    }
  };

  const handleFloorAssignWaiter = async (tableNumber, waiterName) => {
    try {
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ASSIGN_WAITER', tableNumber, waiterName }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Assigned ${waiterName} to Table #${tableNumber}`);
        fetchFloor();
      }
    } catch (e) {
      showNotice('Failed to assign waiter', true);
    }
  };

  const handleAddTableSubmit = async (e) => {
    e.preventDefault();
    if (!newTableData.tableNumber) {
      showNotice('Please enter table number', true);
      return;
    }
    try {
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADD_TABLE', ...newTableData }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Table #${newTableData.tableNumber} created successfully`);
        setShowAddTableModal(false);
        setNewTableData({ tableNumber: '', capacity: 4, section: 'GROUND_FLOOR', shape: 'SQUARE', assignedWaiter: 'Murugan (Floor Captain)' });
        fetchFloor();
        fetchPos();
      } else {
        showNotice(data.error || 'Failed to create table', true);
      }
    } catch (e) {
      showNotice('Network error creating table', true);
    }
  };

  const handleEditTableSubmit = async (e) => {
    e.preventDefault();
    if (!showEditTableModal) return;
    try {
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'EDIT_TABLE', ...showEditTableModal }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Table #${showEditTableModal.tableNumber} updated`);
        setShowEditTableModal(null);
        fetchFloor();
        fetchPos();
      } else {
        showNotice(data.error || 'Failed to update table', true);
      }
    } catch (e) {
      showNotice('Network error updating table', true);
    }
  };

  const handleDeleteTable = async (tableNumber) => {
    const pin = prompt('Enter 4-digit Manager PIN to delete Table #' + tableNumber + ':');
    if (!pin) return;
    try {
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_TABLE', tableNumber, managerPin: pin }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Table #${tableNumber} deleted`);
        if (floorSelectedTable?.tableNumber === tableNumber) setFloorSelectedTable(null);
        fetchFloor();
        fetchPos();
      } else {
        showNotice(data.error || 'Failed to delete table', true);
      }
    } catch (e) {
      showNotice('Network error deleting table', true);
    }
  };

  const handleAddFloorPlanSubmit = async (e) => {
    e.preventDefault();
    if (!newFloorPlanForm.name.trim()) {
      showNotice('Please enter floor plan name', true);
      return;
    }
    try {
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_FLOOR_PLAN',
          ...newFloorPlanForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Floor plan "${newFloorPlanForm.name}" created successfully`);
        setShowAddFloorPlanModal(false);
        setNewFloorPlanForm({ name: '', tamilName: '', icon: '🏛️', floorLevel: 0, description: '' });
        fetchFloor();
      } else {
        showNotice(data.error || 'Failed to create floor plan', true);
      }
    } catch (err) {
      showNotice('Network error creating floor plan', true);
    }
  };

  const handleConfirmDeleteFloorPlan = async () => {
    if (!floorPlanToDelete) return;
    setIsDeletingPlan(true);
    try {
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_FLOOR_PLAN',
          id: floorPlanToDelete.id,
          managerPin: deletePlanPin || '1234',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Floor plan "${floorPlanToDelete.name}" deleted successfully`);
        setFloorPlanToDelete(null);
        setDeletePlanPin('');
        if (floorFilterSection === floorPlanToDelete.id) {
          setFloorFilterSection('ALL');
        }
        fetchFloor();
        fetchPos();
      } else {
        showNotice(data.error || 'Failed to delete floor plan', true);
      }
    } catch (err) {
      showNotice('Network error deleting floor plan', true);
    } finally {
      setIsDeletingPlan(false);
    }
  };

  const handleOpenQrStandee = async (table) => {
    try {
      const PROD_URL = 'https://srigokulamvegrestaurant.com';
      const origin = typeof window !== 'undefined' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1' &&
        !window.location.hostname.startsWith('192.168.') &&
        !window.location.hostname.startsWith('10.')
        ? window.location.origin
        : PROD_URL;
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GET_QR_STANDEE',
          tableNumber: table.tableNumber,
          section: table.section,
          capacity: table.capacity,
          baseUrl: origin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQrStandeeData({ ...data, table });
        setShowQrStandeeModal(table);
      }
    } catch (e) {
      showNotice('Failed to generate QR Standee', true);
    }
  };

  const handleDownloadQrSvg = (tableNumber, svgString) => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sri_Gokulam_Table_${tableNumber}_QR.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotice(`Downloaded QR SVG for Table #${tableNumber}`);
  };

  const handlePrintQrStandee = (htmlString) => {
    if (!htmlString) return;
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (printWindow) {
      printWindow.document.write(htmlString);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 400);
    } else {
      showNotice('Pop-up was blocked. Please allow pop-ups for thermal/standee printing.', true);
    }
  };

  const handleMergeTablesSubmit = async () => {
    if (!mergePrimaryTable || mergeSelectedTables.length === 0) {
      showNotice('Select primary table and at least 1 table to join', true);
      return;
    }
    try {
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MERGE_TABLES',
          primaryTableNumber: mergePrimaryTable,
          joinTableNumbers: mergeSelectedTables,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Tables merged successfully`);
        setShowMergeModal(false);
        setMergePrimaryTable('');
        setMergeSelectedTables([]);
        fetchFloor();
        fetchPos();
      } else {
        showNotice(data.error || 'Failed to merge tables', true);
      }
    } catch (e) {
      showNotice('Network error merging tables', true);
    }
  };

  const handleSplitTables = async (tableNumber) => {
    try {
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SPLIT_TABLES', tableNumber }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Tables split successfully`);
        fetchFloor();
        fetchPos();
      }
    } catch (e) {
      showNotice('Network error splitting tables', true);
    }
  };

  const handleReservationAction = async (subAction, data = {}, id = null) => {
    try {
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESERVATION_ACTION',
          subAction,
          reservationData: data,
          reservationId: id,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        showNotice(resData.message || 'Reservation updated');
        fetchFloor();
        if (subAction === 'CREATE') {
          setNewReservationData({ guestName: '', phone: '', partySize: 2, tableNumber: '01', date: '', timeSlot: '01:00 PM', specialRequests: '' });
        }
      } else {
        showNotice(resData.error || 'Reservation action failed', true);
      }
    } catch (e) {
      showNotice('Network error with reservations', true);
    }
  };

  const handleWaitlistAction = async (subAction, data = {}, id = null, targetTableNumber = null) => {
    try {
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'WAITLIST_ACTION',
          subAction,
          waitlistData: data,
          waitlistId: id,
          targetTableNumber,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        showNotice(resData.message || 'Waitlist updated');
        fetchFloor();
        if (subAction === 'ADD') {
          setNewWaitlistData({ guestName: '', phone: '', partySize: 2, preferredSection: 'GROUND_FLOOR', notes: '' });
        }
      } else {
        showNotice(resData.error || 'Waitlist action failed', true);
      }
    } catch (e) {
      showNotice('Network error with waitlist', true);
    }
  };

  const handleRequestBill = async (tableNumber) => {
    try {
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REQUEST_BILL', tableNumber }),
      });
      const data = await res.json();
      if (data.success) {
        playChime('urgent');
        showNotice(`Bill requested for Table #${tableNumber}`);
        fetchFloor();
      }
    } catch (e) {
      showNotice('Failed to request bill', true);
    }
  };

  const handleGenerateBill = async (tableNumber, subtotal) => {
    try {
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GENERATE_BILL', tableNumber, subtotal }),
      });
      const data = await res.json();
      if (data.success) {
        playChime('notification');
        showNotice(`Bill #${data.bill.billNumber} generated!`);
        fetchFloor();
        fetchPos();
      }
    } catch (e) {
      showNotice('Failed to generate bill', true);
    }
  };

  const handleSettlePayment = async (tableNumber, paymentMethod, transactionRef, amountPaid, guestName) => {
    try {
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SETTLE_PAYMENT',
          tableNumber,
          paymentMethod,
          transactionRef,
          amountPaid,
          guestName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Table #${tableNumber} settled & marked for cleaning!`);
        fetchFloor();
        fetchPos();
        fetchAnalytics();
      }
    } catch (e) {
      showNotice('Failed to settle payment', true);
    }
  };

  const handleAddExtraItemsToTable = async (tableNumber) => {
    const dish = posData.menu.find(m => m.id === selectedDishToAdd) || posData.menu[0];
    if (!dish) return;
    try {
      const res = await fetch('/api/admin/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_ITEMS',
          tableNumber,
          items: [{
            title: dish.title,
            tamilTitle: dish.tamilTitle,
            price: dish.price,
            quantity: Number(addDishQty) || 1,
            variant: dish.variants?.[0]?.name || '',
            addOns: [],
            specialNotes: addDishNotes || '',
            station: dish.station || categorizeStation(dish.title),
          }],
          guestName: floorSelectedTable?.guestNames?.split(',')[0] || 'Dine-In Guest',
          waiterName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message);
        setShowAddItemsTableModal(false);
        setAddDishNotes('');
        setAddDishQty(1);
        fetchFloor();
        fetchKds();
        fetchPos();
      }
    } catch (e) {
      showNotice('Failed to add items', true);
    }
  };

  const handleOpenTableInPos = (tbl) => {
    const posTable = posData.tables.find(t => String(t.tableNumber) === String(tbl.tableNumber));
    if (posTable) {
      setSelectedTable(posTable);
    }
    setActiveTab('pos');
    showNotice(`Switched to POS for Table #${tbl.tableNumber}`);
  };

  // ─── Inventory Action Handlers (12 Requirements) ────────────────────────
  const isManagerOrAdmin = ['DEVELOPER_ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER'].includes(currentUser.role);

  // 1. Add / Edit Ingredient
  const handleSaveIngredient = async (e) => {
    e.preventDefault();
    if (!ingredientForm.name || !ingredientForm.unit) {
      showNotice('Please provide ingredient name and unit', true);
      return;
    }
    try {
      const isEdit = Boolean(ingredientForm.id);
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEdit ? 'UPDATE_INGREDIENT' : 'ADD_INGREDIENT',
          itemId: ingredientForm.id,
          ...ingredientForm,
          staffName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message || (isEdit ? 'Ingredient updated' : 'Ingredient added'));
        setShowAddIngredientModal(false);
        setIngredientForm({
          id: null,
          name: '',
          tamilName: '',
          category: 'BASE',
          unit: 'KG',
          currentStock: 10,
          lowStockThreshold: 3,
          costPerUnit: 50,
          supplierId: '',
          expiryDate: '',
          storageLocation: 'Dry Provisions Store',
        });
        fetchInventory();
        playChime('notification');
      } else {
        showNotice(data.error || 'Failed to save ingredient', true);
      }
    } catch (err) {
      showNotice('Error saving ingredient', true);
    }
  };

  // 2. Delete Ingredient (Manager Restricted)
  const handleDeleteIngredient = async (itemId, itemName) => {
    if (!isManagerOrAdmin) {
      showNotice('Permission Denied: Only Managers and Admins can delete ingredients', true);
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${itemName}? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_INGREDIENT', itemId }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message || `Deleted ${itemName}`);
        fetchInventory();
      } else {
        showNotice(data.error || 'Failed to delete ingredient', true);
      }
    } catch (err) {
      showNotice('Error deleting ingredient', true);
    }
  };

  // 3. Stock Adjustment & Wastage
  const handleStockAdjustmentSubmit = async (e) => {
    e.preventDefault();
    if (!stockAdjustForm.itemId || !stockAdjustForm.quantity) {
      showNotice('Please select ingredient and enter quantity', true);
      return;
    }
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'STOCK_ADJUSTMENT',
          itemId: stockAdjustForm.itemId,
          adjustmentType: stockAdjustForm.adjustmentType,
          quantity: stockAdjustForm.quantity,
          reason: stockAdjustForm.reason,
          notes: stockAdjustForm.notes,
          staffName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message || 'Stock adjustment recorded successfully');
        setShowStockAdjustmentModal(false);
        setStockAdjustForm({ itemId: '', adjustmentType: 'SPOILED', quantity: '', reason: 'SPOILED', notes: '' });
        fetchInventory();
        fetchAnalytics();
        playChime('notification');
      } else {
        showNotice(data.error || 'Failed to record adjustment', true);
      }
    } catch (err) {
      showNotice('Error recording stock adjustment', true);
    }
  };

  // 4. Create Purchase Order
  const handleCreatePurchaseOrder = async (e) => {
    e.preventDefault();
    if (!poForm.supplierId) {
      showNotice('Please select a supplier', true);
      return;
    }
    const validItems = (poForm.items || []).filter(i => i.invId && Number(i.qty) > 0);
    if (validItems.length === 0) {
      showNotice('Add at least one valid item to the purchase order', true);
      return;
    }
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_PURCHASE_ORDER',
          supplierId: poForm.supplierId,
          invoiceNumber: poForm.invoiceNumber,
          notes: poForm.notes,
          items: validItems,
          staffName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message || 'Purchase Order created');
        setShowPurchaseOrderModal(false);
        setPoForm({ supplierId: '', invoiceNumber: '', notes: '', items: [{ invId: '', qty: 10, unitPrice: 0 }] });
        fetchInventory();
        playChime('notification');
      } else {
        showNotice(data.error || 'Failed to create PO', true);
      }
    } catch (err) {
      showNotice('Error creating purchase order', true);
    }
  };

  // 5. Receive Purchase Order (Automated Stock Update)
  const handleReceivePurchaseOrder = async (poId, poNumber) => {
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECEIVE_PURCHASE_ORDER',
          poId,
          staffName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message || `Received PO #${poNumber}. Stock automatically updated!`);
        fetchInventory();
        playChime('urgent');
      } else {
        showNotice(data.error || 'Failed to receive PO', true);
      }
    } catch (err) {
      showNotice('Error receiving purchase order', true);
    }
  };

  // 6. Save Supplier
  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name || !supplierForm.phone) {
      showNotice('Supplier name and phone are required', true);
      return;
    }
    try {
      const isEdit = Boolean(supplierForm.id);
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEdit ? 'UPDATE_SUPPLIER' : 'ADD_SUPPLIER',
          supplierId: supplierForm.id,
          ...supplierForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message || (isEdit ? 'Supplier updated' : 'Supplier added'));
        setShowSupplierModal(false);
        setSupplierForm({ id: null, name: '', contactPerson: '', phone: '', email: '', address: '', categories: ['BASE'], paymentTerms: 'Net 30 Days', paymentStatus: 'PAID', balanceDue: 0 });
        fetchInventory();
        playChime('notification');
      } else {
        showNotice(data.error || 'Failed to save supplier', true);
      }
    } catch (err) {
      showNotice('Error saving supplier', true);
    }
  };

  // 7. Save Recipe BOM
  const handleSaveRecipeBOM = async (e) => {
    e.preventDefault();
    if (!recipeForm.menuItemName) {
      showNotice('Menu item name is required', true);
      return;
    }
    const validIngs = (recipeForm.ingredients || []).filter(i => i.invId && Number(i.qty) > 0);
    if (validIngs.length === 0) {
      showNotice('Recipe must have at least one ingredient', true);
      return;
    }
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_RECIPE',
          recipeId: recipeForm.id,
          menuItemName: recipeForm.menuItemName,
          sellingPrice: recipeForm.sellingPrice,
          ingredients: validIngs,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message || 'Recipe BOM saved');
        setShowRecipeModal(false);
        fetchInventory();
        playChime('notification');
      } else {
        showNotice(data.error || 'Failed to save recipe', true);
      }
    } catch (err) {
      showNotice('Error saving recipe', true);
    }
  };

  // 8. Export Inventory CSV
  const handleExportInventoryCsv = () => {
    if (!inventory || inventory.length === 0) {
      showNotice('No inventory items to export', true);
      return;
    }
    const headers = ['ID', 'Ingredient Name', 'Category', 'Current Stock', 'Unit', 'Threshold', 'Cost Per Unit (INR)', 'Total Valuation (INR)', 'Supplier', 'Storage Location', 'Expiry Date', 'Status'];
    const rows = inventory.map(i => [
      i.id,
      `"${i.name.replace(/"/g, '""')}"`,
      i.category,
      i.currentStock,
      i.unit,
      i.lowStockThreshold,
      i.costPerUnit,
      i.itemValuation || Math.round(i.currentStock * i.costPerUnit),
      `"${(i.supplierName || '').replace(/"/g, '""')}"`,
      `"${(i.storageLocation || '').replace(/"/g, '""')}"`,
      i.expiryDate || 'N/A',
      i.computedStatus,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SriGokulam_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice(`Exported ${inventory.length} inventory items to CSV!`);
  };

  // Legacy Restock handler
  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockItem || !restockQty) return;
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESTOCK',
          itemId: restockItem.id,
          quantity: restockQty,
          staffName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Restocked ${restockItem.name} (+${restockQty} ${restockItem.unit})`);
        setRestockItem(null);
        setRestockQty('');
        fetchInventory();
      }
    } catch (e) {
      showNotice('Error restocking item', true);
    }
  };

  // Legacy Spoilage handler
  const handleSpoilageSubmit = async (e) => {
    e.preventDefault();
    if (!spoilageItem || !spoilageQty) return;
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOG_WASTAGE',
          itemId: spoilageItem.id,
          quantity: spoilageQty,
          reason: spoilageReason,
          staffName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Logged spoilage for ${spoilageItem.name} (-${spoilageQty} ${spoilageItem.unit})`);
        setSpoilageItem(null);
        setSpoilageQty('');
        fetchInventory();
        fetchAnalytics();
      }
    } catch (e) {
      showNotice('Error logging wastage', true);
    }
  };

  // ─── Feature Flag Toggle ────────────────────────────────────────────────
  const handleToggleFlag = async (flagName, curVal) => {
    try {
      const res = await fetch('/api/admin/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_FLAG',
          flagName,
          value: !curVal,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDevSettings(data.settings);
        showNotice(`Flag ${flagName}: ${!curVal ? 'Enabled' : 'Disabled'}`);
      }
    } catch (e) {
      showNotice('Failed to toggle flag', true);
    }
  };

  // ─── Menu Filtering & Sorting (Requirements 3 & 11) ──────────────────────
  const filteredDishes = useMemo(() => {
    let result = (menuItems || []).filter(dish => {
      if (!showArchivedDishes && dish.status === 'ARCHIVED') return false;
      if (showArchivedDishes && dish.status !== 'ARCHIVED') return false;

      // Meal Section filter
      if (menuMealSectionFilter !== 'ALL') {
        const dishSec = String(dish.mealSection || '').toUpperCase();
        if (dishSec !== menuMealSectionFilter) return false;
      }

      // Category filter
      if (menuSelectedCategory !== 'ALL') {
        const catName = menuSelectedCategory.toLowerCase();
        if ((dish.category || '').toLowerCase() !== catName) return false;
      }

      // Availability filter
      if (menuAvailabilityFilter !== 'ALL') {
        if (menuAvailabilityFilter === 'AVAILABLE' && (dish.status !== 'AVAILABLE' || dish.available === false)) return false;
        if (menuAvailabilityFilter === 'SOLD_OUT' && (dish.status !== 'SOLD_OUT' && dish.available !== false)) return false;
        if (menuAvailabilityFilter === 'UNAVAILABLE' && dish.status !== 'UNAVAILABLE') return false;
      }

      // Station filter
      if (menuStationFilter !== 'ALL') {
        if ((dish.station || '').toUpperCase() !== menuStationFilter.toUpperCase()) return false;
      }

      // Dietary filter
      if (menuDietaryFilter !== 'ALL') {
        if (menuDietaryFilter === 'JAIN' && !dish.dietary?.isJain) return false;
        if (menuDietaryFilter === 'VEGAN' && !dish.dietary?.isVegan) return false;
        if (menuDietaryFilter === 'GLUTEN_FREE' && !dish.dietary?.isGlutenFree) return false;
      }

      // Search query
      if (menuSearchQuery.trim()) {
        const q = menuSearchQuery.toLowerCase();
        const tEn = (dish.title || '').toLowerCase();
        const tTa = (dish.tamilTitle || '').toLowerCase();
        const d = (dish.description || '').toLowerCase();
        if (!tEn.includes(q) && !tTa.includes(q) && !d.includes(q)) return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (menuSortBy === 'priceAsc') return (a.price || 0) - (b.price || 0);
      if (menuSortBy === 'priceDesc') return (b.price || 0) - (a.price || 0);
      if (menuSortBy === 'name') return (a.title || '').localeCompare(b.title || '');
      if (menuSortBy === 'prepTime') return (a.prepTime || 10) - (b.prepTime || 10);
      if (menuSortBy === 'popular') return (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0);
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });

    return result;
  }, [menuItems, showArchivedDishes, menuMealSectionFilter, menuSelectedCategory, menuAvailabilityFilter, menuStationFilter, menuDietaryFilter, menuSearchQuery, menuSortBy]);

  // ─── Menu Action Handlers (18 Requirements + Meal Scheduling) ─────────────
  const handleUpdateMealSection = async (sectionId, updates) => {
    setSavingMealSectionId(sectionId);
    const updated = mealSections.map(sec => {
      if (sec.id === sectionId) {
        return { ...sec, ...updates };
      }
      return sec;
    });
    setMealSections(updated);
    try {
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_MEAL_SECTIONS',
          mealSections: updated,
          authorizedBy: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        playChime('notification');
        showNotice(data.message || 'Meal section updated');
        if (Array.isArray(data.mealSections)) setMealSections(data.mealSections);
      } else {
        showNotice(data.error || 'Failed to update meal section', true);
        fetchMenu();
      }
    } catch (err) {
      showNotice('Network error updating meal section', true);
      fetchMenu();
    } finally {
      setSavingMealSectionId(null);
    }
  };

  const handleToggleDishAvailability = async (dishId, currentStatus) => {
    const nextStatus = currentStatus === 'AVAILABLE' ? 'SOLD_OUT' : 'AVAILABLE';
    try {
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_AVAILABILITY',
          dishId,
          status: nextStatus,
          authorizedBy: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        playChime(nextStatus === 'AVAILABLE' ? 'notification' : 'urgent');
        showNotice(data.message);
        fetchMenu();
        fetchPos();
      } else {
        showNotice(data.error || 'Failed to update availability', true);
      }
    } catch (e) {
      showNotice('Network error updating availability', true);
    }
  };

  const handleToggleDishFeatured = async (dishId) => {
    try {
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_FEATURED',
          dishId,
          authorizedBy: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.isFeatured ? 'Pinned to Featured delicacies' : 'Removed from Featured');
        fetchMenu();
      }
    } catch (e) {
      showNotice('Failed to toggle featured status', true);
    }
  };

  const handleToggleDishBestseller = async (dishId) => {
    try {
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_BESTSELLER',
          dishId,
          authorizedBy: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.isBestseller ? 'Awarded Bestseller Crown badge' : 'Bestseller badge removed');
        fetchMenu();
      }
    } catch (e) {
      showNotice('Failed to toggle bestseller status', true);
    }
  };

  const handleOpenDishModal = (mode, dish = null) => {
    setDishModalMode(mode);
    setDishFormTab('INFO');
    if (mode === 'EDIT' && dish) {
      const localDishImg = typeof window !== 'undefined' ? (localStorage.getItem('sgr_dish_img_' + dish.id) || localStorage.getItem('sgr_dish_img_' + dish.title) || '') : '';
      setDishFormData({
        id: dish.id,
        title: dish.title || '',
        tamilTitle: dish.tamilTitle || '',
        mealSection: dish.mealSection ? String(dish.mealSection).toUpperCase() : 'BREAKFAST',
        category: dish.category || 'Tiffin',
        price: dish.price !== undefined && dish.price !== null ? dish.price : '',
        portionSize: dish.portionSize || 'Standard (1 Person)',
        prepTime: dish.prepTime || 10,
        image: dish.image || localDishImg || '',
        description: dish.description || '',
        station: dish.station || 'TIFFIN',
        available: dish.available !== false,
        status: dish.status || 'AVAILABLE',
        isFeatured: Boolean(dish.isFeatured),
        isBestseller: Boolean(dish.isBestseller),
        isChefSpecial: Boolean(dish.isChefSpecial),
        dietary: dish.dietary || { isVeg: true, isJain: false, isVegan: false, isGlutenFree: false, spiceLevel: 2 },
        allergens: Array.isArray(dish.allergens) ? dish.allergens : [],
        ingredients: Array.isArray(dish.ingredients) ? dish.ingredients : [],
        variants: Array.isArray(dish.variants) && dish.variants.length > 0 ? dish.variants : [{ name: 'Standard Portion', priceDiff: 0 }],
        addOns: Array.isArray(dish.addOns) ? dish.addOns : [],
        recipeId: dish.recipeId || null,
        discount: dish.discount || { active: false, type: 'PERCENT', value: 0, discountedPrice: dish.price, label: '', startDate: '', endDate: '' },
      });
    } else {
      setDishFormData({
        id: '',
        title: '',
        tamilTitle: '',
        mealSection: menuMealSectionFilter !== 'ALL' ? menuMealSectionFilter : 'BREAKFAST',
        category: categoriesList[0]?.name || 'Tiffin',
        price: '',
        portionSize: 'Standard (1 Person)',
        prepTime: 10,
        image: '',
        description: '',
        station: 'TIFFIN',
        available: true,
        status: 'AVAILABLE',
        isFeatured: false,
        isBestseller: false,
        isChefSpecial: false,
        dietary: { isVeg: true, isJain: false, isVegan: false, isGlutenFree: false, spiceLevel: 2 },
        allergens: [],
        ingredients: [],
        variants: [{ name: 'Standard Portion', priceDiff: 0 }],
        addOns: [],
        recipeId: null,
        discount: { active: false, type: 'PERCENT', value: 0, discountedPrice: 0, label: '', startDate: '', endDate: '' },
      });
    }
    setShowDishModal(true);
  };

  const handleSaveDish = async (e) => {
    if (e) e.preventDefault();
    if (!dishFormData.title) {
      showNotice('Dish title is required', true);
      return;
    }

    try {
      setLoading(true);
      const action = dishModalMode === 'ADD' ? 'ADD_ITEM' : 'UPDATE_ITEM';
      const itemToSave = {
        ...dishFormData,
        price: dishFormData.price !== '' && dishFormData.price !== undefined ? Number(dishFormData.price) : 0,
        mealSection: dishFormData.mealSection ? String(dishFormData.mealSection).toUpperCase() : 'BREAKFAST',
      };
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          item: itemToSave,
          authorizedBy: currentUser.name,
          role: currentUser.role,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = `Server error (${res.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error) errMsg = parsed.error;
        } catch {
          if (errText) errMsg += `: ${errText.slice(0, 100)}`;
        }
        showNotice(errMsg, true);
        return;
      }

      const data = await res.json();
      if (data.success) {
        playChime('notification');
        showNotice(data.message || `Dish saved successfully!`);
        setShowDishModal(false);
        setImageUploadStatus('');

        // Persist image to client-side localStorage as fail-safe fallback
        if (typeof window !== 'undefined') {
          const savedImg = (data.item && data.item.image) || itemToSave.image;
          const targetId = (data.item && data.item.id) || itemToSave.id;
          const targetTitle = (data.item && data.item.title) || itemToSave.title;
          if (savedImg && targetId) {
            try {
              localStorage.setItem('sgr_dish_img_' + targetId, savedImg);
              if (targetTitle) localStorage.setItem('sgr_dish_img_' + targetTitle, savedImg);
            } catch (e) {}
          }
        }

        // Optimistically update the menu in state so the card displays the new image IMMEDIATELY
        if (data.item) {
          setMenuItems(prev => {
            const exists = prev.some(d => d.id === data.item.id);
            if (exists) {
              return prev.map(d => d.id === data.item.id ? { ...d, ...data.item } : d);
            }
            return [data.item, ...prev];
          });
        }

        await fetchMenu();
        fetchPos();
      } else {
        showNotice(data.error || 'Failed to save delicacy', true);
      }
    } catch (err) {
      console.error('Save dish error:', err);
      showNotice(err.message || 'Error saving delicacy', true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDish = async (dishId, dishTitle) => {
    let pin = '1234';
    if (currentUser.role !== 'DEVELOPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      const entered = window.prompt(`Manager PIN required to permanently delete "${dishTitle}":`);
      if (!entered) return;
      pin = entered;
    }

    try {
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_ITEM',
          dishId,
          managerPin: pin,
          authorizedBy: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Permanently deleted ${dishTitle}`);
        fetchMenu();
        fetchPos();
      } else {
        showNotice(data.error || 'Delete failed', true);
      }
    } catch (e) {
      showNotice('Failed to delete item', true);
    }
  };

  const handleArchiveDish = async (dishId, isArchived) => {
    const action = isArchived ? 'UNARCHIVE_ITEM' : 'ARCHIVE_ITEM';
    try {
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          dishId,
          authorizedBy: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message);
        fetchMenu();
        fetchPos();
      } else {
        showNotice(data.error || 'Archive action failed', true);
      }
    } catch (e) {
      showNotice('Error archiving delicacy', true);
    }
  };

  const handleSaveCategory = async (e) => {
    if (e) e.preventDefault();
    if (!categoryFormData.name) {
      showNotice('Category name is required', true);
      return;
    }

    try {
      const subAction = isEditingCategory ? 'UPDATE_CATEGORY' : 'ADD_CATEGORY';
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MANAGE_CATEGORY',
          subAction,
          categoryData: categoryFormData,
          authorizedBy: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Category ${categoryFormData.name} saved successfully`);
        setCategoryFormData({ id: '', name: '', tamilName: '', icon: '🍽️', description: '', station: 'TIFFIN' });
        setIsEditingCategory(false);
        fetchMenu();
      } else {
        showNotice(data.error || 'Failed to save category', true);
      }
    } catch (e) {
      showNotice('Error saving category', true);
    }
  };

  const handleReorderCategory = async (catId, direction) => {
    const list = [...categoriesList];
    const idx = list.findIndex(c => c.id === catId);
    if (idx === -1) return;
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    const orderedIds = list.map(c => c.id);
    try {
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MANAGE_CATEGORY',
          subAction: 'REORDER_CATEGORIES',
          payload: { orderedIds },
          authorizedBy: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('Category order updated');
        fetchMenu();
      }
    } catch (e) {
      showNotice('Failed to reorder categories', true);
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    let pin = '1234';
    if (currentUser.role !== 'DEVELOPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      const entered = window.prompt(`Manager PIN required to delete category "${catName}":`);
      if (!entered) return;
      pin = entered;
    }

    try {
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MANAGE_CATEGORY',
          subAction: 'DELETE_CATEGORY',
          payload: { id: catId },
          managerPin: pin,
          authorizedBy: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Deleted category ${catName}`);
        fetchMenu();
      } else {
        showNotice(data.error || 'Failed to delete category', true);
      }
    } catch (e) {
      showNotice('Error deleting category', true);
    }
  };

  const handleApplyBulkAction = async () => {
    if (selectedDishIds.length === 0) {
      showNotice('Please select at least one delicacy', true);
      return;
    }

    let pin = '1234';
    if ((bulkActionType === 'PRICE' || bulkActionType === 'DELETE') && currentUser.role !== 'DEVELOPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      const entered = window.prompt(`Manager PIN required for bulk ${bulkActionType}:`);
      if (!entered) return;
      pin = entered;
    }

    let subAction = 'SET_AVAILABLE';
    let payload = {};

    if (bulkActionType === 'STATUS_AVAILABLE') subAction = 'SET_AVAILABLE';
    else if (bulkActionType === 'STATUS_SOLDOUT') subAction = 'SET_SOLDOUT';
    else if (bulkActionType === 'CATEGORY') {
      subAction = 'CHANGE_CATEGORY';
      payload = { newCategory: bulkCategoryTarget };
    } else if (bulkActionType === 'PRICE') {
      subAction = 'ADJUST_PRICE';
      payload = { deltaType: bulkPriceDeltaType, deltaValue: bulkPriceDeltaValue };
    } else if (bulkActionType === 'DELETE') {
      subAction = 'DELETE_SELECTED';
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BULK_UPDATE',
          subAction,
          dishIds: selectedDishIds,
          payload,
          managerPin: pin,
          authorizedBy: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message || `Updated ${data.affectedCount} items`);
        setSelectedDishIds([]);
        setShowBulkActionModal(false);
        fetchMenu();
        fetchPos();
      } else {
        showNotice(data.error || 'Bulk update failed', true);
      }
    } catch (e) {
      showNotice('Error performing bulk update', true);
    } finally {
      setLoading(false);
    }
  };

  const handleExportMenuCsv = () => {
    const headers = ['id', 'title', 'tamilTitle', 'category', 'price', 'portionSize', 'prepTime', 'station', 'status', 'isFeatured', 'isBestseller', 'description'];
    const rows = menuItems.map(d => [
      d.id,
      `"${(d.title || '').replace(/"/g, '""')}"`,
      `"${(d.tamilTitle || '').replace(/"/g, '""')}"`,
      d.category,
      d.price,
      `"${(d.portionSize || '').replace(/"/g, '""')}"`,
      d.prepTime || 10,
      d.station,
      d.status,
      d.isFeatured ? 'TRUE' : 'FALSE',
      d.isBestseller ? 'TRUE' : 'FALSE',
      `"${(d.description || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sri_gokulam_menu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice('Exported menu catalog to CSV');
  };

  const handleExportMenuJson = () => {
    const blob = new Blob([JSON.stringify(menuItems, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sri_gokulam_menu_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Exported full menu backup to JSON');
  };

  const handleImportMenuCsv = async () => {
    if (!csvImportText.trim()) {
      showNotice('Please paste CSV content to import', true);
      return;
    }
    try {
      const lines = csvImportText.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        showNotice('Invalid CSV: Header line and at least 1 data row required', true);
        return;
      }
      const parsedItems = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 4) {
          parsedItems.push({
            id: cols[0] || `dish_${Date.now()}_${i}`,
            title: cols[1],
            tamilTitle: cols[2] || '',
            category: cols[3] || 'Tiffin',
            price: Number(cols[4]) || 50,
            portionSize: cols[5] || 'Standard (1 Person)',
            prepTime: Number(cols[6]) || 10,
            station: cols[7] || 'TIFFIN',
            description: cols[11] || '',
          });
        }
      }

      if (parsedItems.length === 0) {
        showNotice('Could not parse any valid delicacy rows from CSV', true);
        return;
      }

      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'IMPORT_MENU',
          items: parsedItems,
          authorizedBy: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message);
        setCsvImportText('');
        setShowImportExportModal(false);
        fetchMenu();
        fetchPos();
      } else {
        showNotice(data.error || 'Import failed', true);
      }
    } catch (e) {
      showNotice('Error processing CSV import', true);
    }
  };

  // Client-side HTML5 Canvas Image Resizer & Optimizer (<60KB WebP)
  const compressImageFile = (file, maxWidth = 800, maxHeight = 800, quality = 0.80) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image file format'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          try {
            const webpData = canvas.toDataURL('image/webp', quality);
            if (webpData.startsWith('data:image/webp')) {
              resolve(webpData);
              return;
            }
          } catch {
            // fallback below
          }
          const jpegData = canvas.toDataURL('image/jpeg', quality);
          resolve(jpegData);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotice('Invalid format. Please upload JPG, PNG, or WEBP image.', true);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showNotice('Image exceeds 20MB limit. Please choose a smaller file.', true);
      return;
    }

    try {
      setImageUploading(true);
      setImageUploadStatus('Compressing & optimizing photo...');

      // 1. Client-side canvas compression: scales down to max 800px and converts to high-efficiency WebP (~35-60KB)
      const compressedDataUrl = await compressImageFile(file, 800, 800, 0.80);
      const estSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);

      setDishFormData(prev => ({ ...prev, image: compressedDataUrl }));
      setImageUploadStatus(`Photo ready (${estSizeKb} KB)`);
      showNotice(`✅ Photo optimized successfully (${estSizeKb} KB)`);
    } catch (err) {
      console.error('Image processing error:', err);
      showNotice('Failed to process image: ' + (err.message || 'Unknown error'), true);
      setImageUploadStatus('Image processing failed');
    } finally {
      setImageUploading(false);
    }
  };

  // ─── Module 8: Live Orders Handlers ─────────────────────────────────────
  const handleVerifyOtp = async (orderId, otpVal, isOverride = false) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY_OTP',
          orderId,
          otp: otpVal,
          isManagerOverride: isOverride,
          staffName: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('✅ OTP Verified! KOT dispatched to kitchen');
        playChime('notification');
        setShowOtpModal(false);
        setEnteredOtp('');
        fetchOrders();
        fetchKds();
        fetchFloor();
      } else {
        showNotice(data.error || 'Failed to verify OTP', true);
      }
    } catch (e) {
      showNotice('Error verifying OTP', true);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          orderId,
          newStatus,
          staffName: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Order updated to ${newStatus.replace(/_/g, ' ')}`);
        if (newStatus === 'READY_TO_SERVE') playChime('urgent');
        fetchOrders();
        fetchKds();
        fetchFloor();
      } else {
        showNotice(data.error || 'Failed to update order status', true);
      }
    } catch (e) {
      showNotice('Error updating status', true);
    }
  };

  const handleOpenEditItems = (order) => {
    setSelectedOrder(order);
    setEditOrderItems(JSON.parse(JSON.stringify(order.items || [])));
    setEditCookingNotes(order.cookingNotes || '');
    setShowEditItemsModal(true);
  };

  const handleSaveEditItems = async () => {
    if (!selectedOrder) return;
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EDIT_ITEMS',
          orderId: selectedOrder.id,
          items: editOrderItems,
          cookingNotes: editCookingNotes,
          staffName: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('Order items updated successfully');
        setShowEditItemsModal(false);
        fetchOrders();
        fetchKds();
      } else {
        showNotice(data.error || 'Failed to edit items', true);
      }
    } catch (e) {
      showNotice('Error saving edited items', true);
    }
  };

  const handleOpenCancelModal = (order) => {
    setSelectedOrder(order);
    setCancellationReason('Guest requested cancellation');
    setShowCancelOrderModal(true);
  };

  const handleConfirmCancelOrder = async () => {
    if (!selectedOrder) return;
    if (!cancellationReason || cancellationReason.trim().length < 3) {
      showNotice('Please provide a valid cancellation reason', true);
      return;
    }
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CANCEL_ORDER',
          orderId: selectedOrder.id,
          reason: cancellationReason,
          staffName: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('Order cancelled successfully');
        setShowCancelOrderModal(false);
        fetchOrders();
        fetchKds();
        fetchFloor();
      } else {
        showNotice(data.error || 'Failed to cancel order', true);
      }
    } catch (e) {
      showNotice('Error cancelling order', true);
    }
  };

  const handleOpenBillModal = (order) => {
    setSelectedOrder(order);
    setBillDiscountPercent(0);
    setBillDiscountReason('');
    setBillPaymentMode('CASH');
    setBillCashTendered('');
    setBillTransactionRef('');
    setShowBillModal(true);
  };

  const handleGenerateBillOnly = async () => {
    if (!selectedOrder) return;
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GENERATE_BILL',
          orderId: selectedOrder.id,
          discountPercent: billDiscountPercent,
          discountReason: billDiscountReason,
          staffName: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Bill #${data.bill?.billNumber} generated!`);
        setShowBillModal(false);
        fetchOrders();
        fetchPos();
        fetchFloor();
      } else {
        showNotice(data.error || 'Failed to generate bill', true);
      }
    } catch (e) {
      showNotice('Error generating bill', true);
    }
  };

  const handleProcessPaymentSettlement = async () => {
    if (!selectedOrder) return;
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SETTLE_PAYMENT',
          orderId: selectedOrder.id,
          billNumber: selectedOrder.billNumber,
          paymentMode: billPaymentMode,
          transactionRef: billTransactionRef,
          amountReceived: billCashTendered ? Number(billCashTendered) : undefined,
          staffName: currentUser.name,
          role: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Payment settled via ${billPaymentMode}!`);
        playChime('notification');
        setShowBillModal(false);
        if (data.receiptText) {
          setThermalReceiptText(data.receiptText);
          setShowThermalReceiptModal(true);
        }
        fetchOrders();
        fetchPos();
        fetchFloor();
      } else {
        showNotice(data.error || 'Failed to settle payment', true);
      }
    } catch (e) {
      showNotice('Error processing payment', true);
    }
  };

  const handlePrintKotSlip = async (order) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RE_FIRE_KOT',
          orderId: order.id,
          station: 'ALL',
          staffName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success && data.kotSlip) {
        setKotSlipText(data.kotSlip);
        setShowKotSlipModal(true);
      } else {
        showNotice(data.error || 'Failed to print KOT', true);
      }
    } catch (e) {
      showNotice('Error printing KOT', true);
    }
  };

  const handleOpenOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetailsModal(true);
  };

  const handleOpenOtpModal = (order) => {
    setSelectedOrder(order);
    setEnteredOtp(order.otpCode || order.otp || '');
    setShowOtpModal(true);
  };

  const handleAddDishToEditOrder = () => {
    if (!addDishSelectId) return;
    const dish = (menuItems || []).find(d => d.id === addDishSelectId);
    if (!dish) return;
    const newItem = {
      title: dish.title,
      tamilTitle: dish.tamilTitle || '',
      category: dish.category || 'Tiffin',
      price: Number(dish.price || 0),
      portion: addDishPortion,
      quantity: Number(addDishQty || 1),
      station: dish.station || 'TIFFIN',
    };
    setEditOrderItems(prev => [...prev, newItem]);
    setAddDishSelectId('');
    setAddDishQty(1);
    showNotice(`Added ${dish.title} to order`);
  };

  // ─── Customer CRM Privacy & Action Handlers ─────────────────────────────
  const maskPhone = (phone, masked) => {
    if (!masked || !phone || phone.length < 5) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 3);
  };

  const maskEmail = (email, masked) => {
    if (!masked || !email || !email.includes('@')) return email;
    const [u, d] = email.split('@');
    return (u.length > 2 ? u[0] + '****' + u.slice(-1) : '****') + '@' + d;
  };

  const handleCreateCustomer = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newCustForm.name.trim() || !newCustForm.phone.trim()) {
      showNotice('Customer Name and Phone number are required', true);
      return;
    }
    try {
      const res = await fetch('/api/admin/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_CUSTOMER',
          ...newCustForm,
          staffName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Customer ${data.customer.name} registered successfully`);
        playChime('notification');
        setShowAddCustomerModal(false);
        setNewCustForm({
          name: '',
          phone: '',
          email: '',
          address: '',
          birthday: '',
          anniversary: '',
          initialPoints: 50,
          notes: '',
          segment: 'NEW',
        });
        fetchCrmCustomers();
      } else {
        showNotice(data.error || 'Failed to create customer', true);
      }
    } catch (err) {
      showNotice('Error creating customer', true);
    }
  };

  const handleAdjustLoyalty = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!crmSelectedCustomer) return;
    try {
      const res = await fetch('/api/admin/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADJUST_LOYALTY',
          customerId: crmSelectedCustomer.id,
          points: Number(loyaltyAdjustForm.points),
          type: loyaltyAdjustForm.type,
          reason: loyaltyAdjustForm.reason,
          staffName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Loyalty points updated for ${data.customer.name}. New Balance: ${data.customer.loyaltyPoints} pts`);
        playChime('notification');
        setCrmSelectedCustomer(data.customer);
        setShowAdjustLoyaltyModal(false);
        fetchCrmCustomers();
      } else {
        showNotice(data.error || 'Failed to adjust points', true);
      }
    } catch (err) {
      showNotice('Error adjusting loyalty points', true);
    }
  };

  const handleAddFeedback = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!crmSelectedCustomer) return;
    try {
      const res = await fetch('/api/admin/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_FEEDBACK',
          customerId: crmSelectedCustomer.id,
          rating: Number(feedbackForm.rating),
          category: feedbackForm.category,
          comments: feedbackForm.comments,
          status: feedbackForm.status,
          staffName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Feedback recorded for ${data.customer.name}`);
        playChime('notification');
        setCrmSelectedCustomer(data.customer);
        setShowAddFeedbackModal(false);
        setFeedbackForm({ rating: 5, category: 'Food Taste', comments: '', status: 'RESOLVED' });
        fetchCrmCustomers();
      } else {
        showNotice(data.error || 'Failed to log feedback', true);
      }
    } catch (err) {
      showNotice('Error recording feedback', true);
    }
  };

  const handleCreateOffer = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!crmSelectedCustomer) return;
    try {
      const res = await fetch('/api/admin/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_OFFER',
          customerId: crmSelectedCustomer.id,
          title: offerForm.title,
          promoCode: offerForm.promoCode,
          discountPercent: Number(offerForm.discountPercent),
          validTill: offerForm.validTill,
          type: offerForm.type,
          staffName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Offer ${offerForm.promoCode} assigned to ${data.customer.name}`);
        playChime('notification');
        setCrmSelectedCustomer(data.customer);
        setShowCreateOfferModal(false);
        fetchCrmCustomers();
      } else {
        showNotice(data.error || 'Failed to assign offer', true);
      }
    } catch (err) {
      showNotice('Error assigning offer', true);
    }
  };

  const handleAddNote = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!crmSelectedCustomer) return;
    if (!noteForm.text.trim()) {
      showNotice('Note text cannot be empty', true);
      return;
    }
    try {
      const res = await fetch('/api/admin/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_NOTE',
          customerId: crmSelectedCustomer.id,
          text: noteForm.text,
          type: noteForm.type,
          staffName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Staff note added for ${data.customer.name}`);
        setCrmSelectedCustomer(data.customer);
        setShowAddNoteModal(false);
        setNoteForm({ text: '', type: 'PREFERENCE' });
        fetchCrmCustomers();
      } else {
        showNotice(data.error || 'Failed to add note', true);
      }
    } catch (err) {
      showNotice('Error adding note', true);
    }
  };

  const handleExportCrmCsv = () => {
    try {
      if (!crmCustomers || crmCustomers.length === 0) {
        showNotice('No customer data to export', true);
        return;
      }
      const headers = ['Customer ID', 'Name', 'Phone', 'Email', 'Address', 'Registered Date', 'Segment', 'Loyalty Tier', 'Loyalty Points', 'Total Visits', 'Last Visit', 'Total Spend (INR)', 'Average Bill Value (INR)'];
      const rows = crmCustomers.map(c => [
        `"${c.customerId || c.id}"`,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${privacyMasked ? maskPhone(c.phone, true) : c.phone}"`,
        `"${privacyMasked ? maskEmail(c.email, true) : (c.email || '')}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        `"${c.registeredAt ? new Date(c.registeredAt).toLocaleDateString() : ''}"`,
        `"${c.segment || 'REGULAR'}"`,
        `"${c.loyaltyTier || 'BRONZE'}"`,
        c.loyaltyPoints || 0,
        c.visits || 0,
        `"${c.lastVisit ? new Date(c.lastVisit).toLocaleString() : 'Never'}"`,
        c.totalSpend || 0,
        c.averageBillValue || 0,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `SriGokulam_CRM_Customers_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotice(`Exported ${crmCustomers.length} customer records to CSV`);
    } catch (e) {
      showNotice('Failed to export CSV', true);
    }
  };

  return (
    <div className={styles.adminContainer} data-theme={theme}>
      {/* ─── Top Navigation & Command Bar ─── */}
      <header className={styles.topNav}>
        {devSettings?.maintenanceMode && (
          <div className={styles.maintenanceAlert}>
            ⚠️ SYSTEM IN MAINTENANCE MODE — Customer QR Ordering Temporarily Blacked Out by Developer Admin
          </div>
        )}
        <div className={styles.navInner}>
          <div className={styles.brandGroup}>
            <div className={styles.brandLogo}>
              <img
                src="/restaurant_logo.jpg"
                alt="Sri Gokulam Logo"
                className={styles.brandLogoImg}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerText = '🍛';
                  }
                }}
              />
            </div>
            <div className={styles.brandMeta}>
              <h1>SRI GOKULAM</h1>
              <div className={styles.brandSub}>
                Admin Panel • Karaikudi
              </div>
            </div>
          </div>

          <div className={styles.navControls}>
            {/* ☀️ / 🌙 Segmented Theme Switcher (Scoped to Admin only!) */}
            <div className={styles.themePillToggle} title="Switch Admin UI Theme">
              <button
                type="button"
                className={`${styles.themeOption} ${theme === 'light' ? styles.themeOptionActive : ''}`}
                onClick={() => {
                  setTheme('light');
                  localStorage.setItem('sgr_admin_theme', 'light');
                }}
              >
                ☀️ Light
              </button>
              <button
                type="button"
                className={`${styles.themeOption} ${theme === 'dark' ? styles.themeOptionActive : ''}`}
                onClick={() => {
                  setTheme('dark');
                  localStorage.setItem('sgr_admin_theme', 'dark');
                }}
              >
                🌙 Dark Black
              </button>
            </div>

            {/* Live SSE Status */}
            <div className={styles.liveBadge} title="Real-time Server-Sent Events link">
              <span className={styles.pulseDot} style={{ background: sseConnected ? '#22c55e' : '#f59e0b' }}></span>
              {sseConnected ? 'POS Online' : 'Reconnecting...'}
            </div>

            {/* 🔔 Notifications Drawer & Audio Chime Toggle (Requirement 9) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={styles.profileChipBtn}
                onClick={() => {
                  setShowNotifDrawer(prev => !prev);
                  setShowProfileMenu(false);
                }}
                title="Notifications & Urgent Kitchen Alerts"
              >
                <span>🔔</span>
                {(analytics?.notifications || []).filter(n => !n.read).length > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    borderRadius: '9999px',
                    padding: '0.1rem 0.4rem',
                  }}>
                    {(analytics?.notifications || []).filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {showNotifDrawer && (
                <div className={styles.notifDrawer}>
                  <div className={styles.notifHeader}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      🔔 Live Alerts &amp; Activities
                    </strong>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        className={styles.dateBtn}
                        onClick={() => {
                          const next = !soundAlerts;
                          setSoundAlerts(next);
                          if (next) playChime('notification');
                        }}
                        title="Toggle chime audio alerts"
                      >
                        {soundAlerts ? '🔊 Sound On' : '🔇 Muted'}
                      </button>
                      <button
                        type="button"
                        className={styles.dateBtn}
                        onClick={() => setShowNotifDrawer(false)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {(notificationsList.length > 0 ? notificationsList : analytics?.notifications || []).map((notif) => (
                      <div
                        key={notif.id}
                        className={styles.notifCard}
                        style={{
                          borderLeft: notif.type === 'URGENT' ? '3px solid #ef4444' : notif.type === 'OTP' ? '3px solid #f59e0b' : '3px solid #22c55e',
                          opacity: notif.read ? 0.75 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-primary)' }}>
                          <span>{notif.title}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{notif.time}</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          {notif.message}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.btnStatusQuick}
                    style={{ width: '100%', marginTop: '0.25rem' }}
                    onClick={() => {
                      setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
                      showNotice('All notifications marked as read');
                    }}
                  >
                    ✓ Mark All as Read
                  </button>
                </div>
              )}
            </div>

            {/* 👤 Admin Profile & Role Dropdown (Requirement 12) */}
            <div style={{ position: 'relative' }}>
              <div
                className={styles.profileChipBtn}
                onClick={() => {
                  setShowProfileMenu(prev => !prev);
                  setShowNotifDrawer(false);
                }}
                title="Logged-in User, Role & Profile Settings"
              >
                <div className={styles.profileAvatar}>
                  {currentUser.name.charAt(0)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.1 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    {currentUser.role.replace('_', ' ')}
                  </span>
                </div>
                <span style={{ fontSize: '0.65rem' }}>▼</span>
              </div>

              {showProfileMenu && (
                <div className={styles.profileMenuModal}>
                  <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                      {currentUser.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {currentUser.email}
                    </div>
                    <div style={{ marginTop: '0.35rem' }}>
                      <span style={{
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        background: currentUser.badge || '#7c3aed',
                        color: '#ffffff'
                      }}>
                        {currentUser.role}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className={styles.btnStatusQuick}
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowProfileModal(true);
                      }}
                    >
                      ⚙️ Profile Settings
                    </button>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      Quick Switch Staff Role:
                    </div>
                    <select
                      className={styles.roleSelect}
                      style={{ width: '100%' }}
                      value={currentUser.role}
                      onChange={(e) => {
                        handleRoleChange(e);
                        setShowProfileMenu(false);
                      }}
                    >
                      {STAFF_PRESETS.map(s => (
                        <option key={s.role} value={s.role}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                    <Link
                      href="/admin/login"
                      className={styles.btnStatusQuick}
                      style={{
                        textDecoration: 'none',
                        textAlign: 'center',
                        background: 'rgba(124, 58, 237, 0.18)',
                        color: '#c084fc',
                        borderColor: 'rgba(168, 85, 247, 0.4)',
                        marginTop: '0.2rem',
                        fontWeight: 700,
                      }}
                    >
                      🔐 Admin OTP Login
                    </Link>
                    <button
                      type="button"
                      className={styles.btnStatusQuick}
                      style={{ background: '#dc2626', color: '#ffffff', borderColor: '#dc2626', marginTop: '0.4rem' }}
                      onClick={async () => {
                        setShowProfileMenu(false);
                        try {
                          await fetch('/api/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'LOGOUT' }),
                          });
                        } catch (e) {}
                        localStorage.removeItem('sgr_admin_session');
                        localStorage.removeItem('sgr_admin_user');
                        showNotice('Logged out of Sri Gokulam POS Suite');
                        window.location.href = '/admin/login';
                      }}
                    >
                      🚪 Logout
                    </button>
                  </div>

                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem' }}>
                    Terminal: TVSE TP 415C • v2.4 Enterprise
                  </div>
                </div>
              )}
            </div>

            {/* External Quick Links & TVSE Dual Display */}
            <div className={styles.navLinks}>
              <Link
                href="/admin/login"
                className={styles.btnNavAlt}
                style={{ color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.4)', fontWeight: 700 }}
                title="Secure OTP Admin Login Gateway"
              >
                🔐 Admin Login
              </Link>
              <button
                className={styles.btnNavAlt}
                onClick={() => window.open('/admin/customer-display', '_blank', 'width=900,height=600')}
                title="Open Customer-Facing Rear Display on TVSE TP 415C 2nd Screen"
              >
                🖥️ Customer Display
              </button>
              <Link href="/waiter" className={styles.btnNavAlt} title="Floor Captain Terminal">
                📱 Waiter
              </Link>
              <Link href="/" className={styles.btnNavAlt} target="_blank" title="Customer QR Menu Portal">
                🍽️ Guest Menu
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Toast Notice ─── */}
      {statusNotice && (
        <div style={{
          background: statusNotice.isErr ? '#dc2626' : '#16a34a',
          color: '#ffffff',
          textAlign: 'center',
          padding: '0.4rem',
          fontSize: '0.82rem',
          fontWeight: '700',
        }}>
          {statusNotice.text}
        </div>
      )}

      {/* ─── Tab Bar Navigation (Touch Optimized for TVSE TP 415C) ─── */}
      <nav className={styles.tabBar}>
        <div className={styles.tabInner}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Executive Dashboard
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'reports' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            📈 Reports &amp; Analytics
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'pos' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('pos')}
          >
            🧾 High-Speed POS Billing
            {posData.tables.filter(t => t.subtotal > 0).length > 0 && (
              <span className={styles.tabBadge}>{posData.tables.filter(t => t.subtotal > 0).length}</span>
            )}
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'kds' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('kds')}
          >
            🍳 Kitchen KDS
            {kdsTickets.length > 0 && (
              <span className={styles.tabBadge}>{kdsTickets.length}</span>
            )}
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'floor' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('floor')}
          >
            🗺️ Live Floor Plan
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'orders' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📋 Live Orders
            {ordersSummary.activeCount > 0 && (
              <span className={styles.tabBadge} style={{ background: ordersSummary.delayedCount > 0 ? '#ef4444' : '#2563eb' }}>
                {ordersSummary.activeCount}
              </span>
            )}
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'menu' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            🍽️ Menu Delicacies
            {menuSummary.totalItems > 0 && (
              <span className={styles.tabBadge}>{menuSummary.totalItems}</span>
            )}
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'inventory' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            📦 Recipe BOM &amp; Stock
            {invSummary?.lowStockCount > 0 && (
              <span className={styles.tabBadge} style={{ background: '#b91c1c' }}>{invSummary.lowStockCount} Low</span>
            )}
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'crm' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('crm')}
          >
            👥 Customer CRM
            {crmSummary.totalCustomers > 0 && (
              <span className={styles.tabBadge} style={{ background: '#7c3aed' }}>
                {crmSummary.totalCustomers}
              </span>
            )}
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('settings')}
            style={{ color: '#38bdf8' }}
          >
            ⚙️ Settings
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'cms' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('cms')}
            style={{ color: '#10b981' }}
          >
            🌐 Website CMS
          </button>
          {currentUser.role === 'DEVELOPER_ADMIN' && (
            <button
              className={`${styles.tabBtn} ${activeTab === 'devhub' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('devhub')}
              style={{ color: '#c084fc' }}
            >
              ⚙️ Developer Hub
            </button>
          )}
        </div>
      </nav>

      {/* ─── Body Area ─── */}
      <main className={styles.adminBody}>
        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 1: HIGH-SPEED TOUCH POS BILLING (18 COMPREHENSIVE REQUIREMENTS)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'pos' && (
          <div className={styles.posSystemWrap}>
            {/* ─── Requirement 15 & 17: POS Top Toolbar, Status Bar & Quick Actions ─── */}
            <div className={styles.posTopBar}>
              {/* Order Type Toggle (Requirement 2) */}
              <div className={styles.posOrderTypePills}>
                <button
                  type="button"
                  className={`${styles.posTypeBtn} ${posOrderType === 'DINE_IN' ? styles.posTypeBtnActive : ''}`}
                  onClick={() => setPosOrderType('DINE_IN')}
                >
                  🍽️ Dine-In
                </button>
                <button
                  type="button"
                  className={`${styles.posTypeBtn} ${posOrderType === 'TAKEAWAY' ? styles.posTypeBtnActive : ''}`}
                  onClick={() => setPosOrderType('TAKEAWAY')}
                >
                  🥡 Takeaway
                </button>
                <button
                  type="button"
                  className={`${styles.posTypeBtn} ${posOrderType === 'DELIVERY' ? styles.posTypeBtnActive : ''}`}
                  onClick={() => setPosOrderType('DELIVERY')}
                >
                  🛵 Delivery
                </button>
              </div>

              {/* Table Selection Chip (Requirement 3) */}
              {posOrderType === 'DINE_IN' ? (
                <div
                  className={styles.posSessionPill}
                  onClick={() => setShowTablePickerModal(true)}
                  title="Click to select or switch dining table"
                >
                  🪑 Table #{selectedTable?.tableNumber || '01'} ({selectedTable?.section?.replace('_', ' ') || 'Ground Floor'}) ▾
                </div>
              ) : (
                <div className={styles.posSessionPill} style={{ borderColor: '#10b981', color: '#10b981' }}>
                  {posOrderType === 'TAKEAWAY' ? `🥡 Token #TK-${(posData.recentBills?.length || 0) + 101}` : '🛵 Swiggy/Zomato/Direct'}
                </div>
              )}

              {/* Customer Selector Chip (Requirement 5) */}
              <div
                className={styles.posSessionPill}
                style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }}
                onClick={() => setShowCustomerPickerModal(true)}
                title="Click to select repeat guest or add new customer"
              >
                👤 {posCustomer.name} {posCustomer.phone ? `(${posCustomer.phone})` : ''} ▾
              </div>

              {/* Quick Actions (Requirement 17) */}
              <div className={styles.posActionButtonsRow}>
                <button
                  type="button"
                  className={styles.posActionBtn}
                  onClick={() => {
                    handleClearCart();
                    setPosActiveView('CART');
                  }}
                  title="Start a fresh order"
                >
                  ➕ New Order
                </button>
                <button
                  type="button"
                  className={styles.posActionBtn}
                  onClick={handleClearCart}
                  title="Empty items in current cart"
                >
                  🧹 Clear Cart
                </button>
                <button
                  type="button"
                  className={styles.posActionBtn}
                  onClick={handleHoldOrder}
                  title="Park current order on hold"
                >
                  ⏸️ Hold Cart
                </button>
                <button
                  type="button"
                  className={styles.posActionBtn}
                  onClick={() => setShowHeldOrdersModal(true)}
                  style={{ color: (posData.heldOrders?.length || 0) > 0 ? '#3b82f6' : undefined }}
                  title="View and resume parked orders"
                >
                  ▶️ Resume ({posData.heldOrders?.length || 0})
                </button>
                <button
                  type="button"
                  className={styles.posActionBtn}
                  onClick={() => setShowQrOrdersModal(true)}
                  style={{ color: (posData.qrOrders?.filter(q => q.status === 'PENDING_POS_ACCEPT').length || 0) > 0 ? '#10b981' : undefined }}
                  title="Review customer table QR orders"
                >
                  📱 QR Orders ({posData.qrOrders?.filter(q => q.status === 'PENDING_POS_ACCEPT').length || 0})
                </button>
                <button
                  type="button"
                  className={styles.posActionBtn}
                  onClick={() => setShowShiftModal(true)}
                  title="Cashier shift register, opening float & cash payouts"
                >
                  💰 Shift ({posData.currentShift?.status || 'OPEN'})
                </button>
                <button
                  type="button"
                  className={styles.posActionBtn}
                  onClick={() => setShowBillsHistoryModal(true)}
                  title="Settled bills history, reprints, voids & refunds"
                >
                  📜 Bills &amp; Voids
                </button>
                <button
                  type="button"
                  className={styles.posActionBtn}
                  onClick={() => setShowManualBillModal(true)}
                  title="Create manual customer bill / direct counter invoice"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#ffffff', borderColor: '#10b981', fontWeight: 800 }}
                >
                  🧾 + Manual Bill
                </button>
                <button
                  type="button"
                  className={styles.posActionBtn}
                  onClick={() => setShowSlipDesignerModal(true)}
                  title="Customize 80mm &amp; 58mm thermal receipt slip template"
                  style={{ borderColor: '#38bdf8', color: '#38bdf8' }}
                >
                  ⚙️ Format Slip
                </button>
              </div>
            </div>

            {/* ─── Main POS Workspace: Left Menu Catalog, Right Cart & Bill ─── */}
            <div className={styles.posMainGrid}>
              {/* ─── LEFT: Food Menu Catalog (Requirement 1) ─── */}
              <div className={styles.posCatalogBox}>
                <div className={styles.posCatalogToolbar}>
                  {/* Search Bar */}
                  <input
                    type="text"
                    placeholder="🔍 Search dishes by name (e.g. Dosa, Coffee, Idli, Meals, Paniyaram)..."
                    className={styles.posSearchInput}
                    value={posSearch}
                    onChange={e => setPosSearch(e.target.value)}
                  />

                  {/* Category Filter Pills */}
                  <div className={styles.posCategoryFilterRow}>
                    {[
                      { id: 'all', label: 'All Items' },
                      { id: 'Tiffin', label: '🥞 Tiffin' },
                      { id: 'Meals', label: '🍛 Raja Meals' },
                      { id: 'Chettinad', label: '🌶️ Chettinad Special' },
                      { id: 'Beverages', label: '☕ Degree Coffee & Drinks' },
                      { id: 'Dessert', label: '🍨 Traditional Sweets' },
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`${styles.posCatFilterBtn} ${posCategory === cat.id ? styles.posCatFilterBtnActive : ''}`}
                        onClick={() => setPosCategory(cat.id)}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dishes Grid */}
                <div className={styles.posDishesGrid}>
                  {(posData.menu && posData.menu.length > 0 ? posData.menu : DEFAULT_POS_MENU)
                    .filter(dish => {
                      if (posCategory !== 'all' && dish.category !== posCategory) return false;
                      if (!posSearch.trim()) return true;
                      const q = posSearch.toLowerCase();
                      return (
                        dish.title.toLowerCase().includes(q) ||
                        (dish.tamilTitle && dish.tamilTitle.toLowerCase().includes(q)) ||
                        dish.category.toLowerCase().includes(q)
                      );
                    })
                    .map(dish => (
                      <div
                        key={dish.id}
                        className={styles.posDishCard}
                        onClick={() => handleDishClick(dish)}
                        title={`Click to add ${dish.title} to Cart`}
                      >
                        {(() => {
                          const posImg = dish.image || (typeof window !== 'undefined' ? (localStorage.getItem('sgr_dish_img_' + dish.id) || localStorage.getItem('sgr_dish_img_' + dish.title)) : null);
                          return (
                            <img
                              src={posImg || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231f2937'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='28'%3E🍲%3C/text%3E%3C/svg%3E"}
                              alt={dish.title}
                              className={styles.posDishThumb}
                              loading="eager"
                              decoding="async"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231f2937'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='28'%3E🍲%3C/text%3E%3C/svg%3E";
                              }}
                            />
                          );
                        })()}
                        <div className={styles.posDishInfo}>
                          <span className={styles.posDishTitle}>{dish.title}</span>
                          {dish.tamilTitle && (
                            <span className={styles.posDishTaTitle}>{dish.tamilTitle}</span>
                          )}
                          <div className={styles.posDishBottom}>
                            <span className={styles.posDishPrice}>₹{dish.price}</span>
                            <span className={styles.posDishAddBadge}>+ Add</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* ─── RIGHT: Shopping Cart & Table Billing Engine (Requirements 4, 6, 8, 9, 10, 11, 12) ─── */}
              <div className={styles.posCartPanel}>
                <div className={styles.posCartHeader}>
                  <div className={styles.posCartTabs}>
                    <button
                      type="button"
                      className={`${styles.posCartTabBtn} ${posActiveView === 'CART' ? styles.posCartTabBtnActive : ''}`}
                      onClick={() => setPosActiveView('CART')}
                    >
                      🛒 Cart ({posCart.length})
                    </button>
                    {posOrderType === 'DINE_IN' && (
                      <button
                        type="button"
                        className={`${styles.posCartTabBtn} ${posActiveView === 'TABLE_BILL' ? styles.posCartTabBtnActive : ''}`}
                        onClick={() => setPosActiveView('TABLE_BILL')}
                      >
                        📋 Table Running Tab ({selectedTable?.items?.length || 0})
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Cashier: <strong>{currentUser.name}</strong>
                  </span>
                </div>

                {/* Customer Tag Bar */}
                <div className={styles.posCartCustomerBar}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Customer: <strong>{posCustomer.name}</strong> • {posCustomer.phone || 'Walk-in'}
                  </span>
                </div>

                {/* ─── VIEW 1: ACTIVE CART (Requirement 4) ─── */}
                {posActiveView === 'CART' ? (
                  <>
                    {posCart.length === 0 ? (
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem 1rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                      }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛒</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                          Shopping Cart is Empty
                        </div>
                        <div style={{ fontSize: '0.78rem' }}>
                          Touch any delicacy from the menu on the left to add items, customize variants, and punch KOT.
                        </div>
                      </div>
                    ) : (
                      <div className={styles.posCartItemsList}>
                        {posCart.map((it, idx) => (
                          <div key={idx} className={styles.posCartItem}>
                            <div className={styles.posCartItemTop}>
                              <span className={styles.posCartItemTitle}>{it.title}</span>
                              <span className={styles.posCartItemPrice}>
                                ₹{(Number(it.price) || 0) * (Number(it.quantity) || 1)}
                              </span>
                            </div>

                            <div className={styles.posCartItemMeta}>
                              <div className={styles.posCartDetails}>
                                {it.variant && <span>Option: {it.variant} • </span>}
                                <span>₹{it.price} each</span>
                                {it.addOns && it.addOns.length > 0 && (
                                  <div>+ {it.addOns.join(', ')}</div>
                                )}
                              </div>

                              <div className={styles.posCartQtyControl}>
                                <button
                                  type="button"
                                  className={styles.posCartQtyBtn}
                                  onClick={() => handleCartQty(idx, -1)}
                                >
                                  -
                                </button>
                                <span className={styles.posCartQtyVal}>{it.quantity}</span>
                                <button
                                  type="button"
                                  className={styles.posCartQtyBtn}
                                  onClick={() => handleCartQty(idx, 1)}
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  className={styles.posCartItemDel}
                                  onClick={() => handleRemoveCartItem(idx)}
                                  title="Remove item"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>

                            {/* Special instructions per item */}
                            <input
                              type="text"
                              placeholder="Special note (e.g. less spicy, crispy, no sugar)..."
                              className={styles.posCartInstructionInput}
                              value={it.specialNotes || ''}
                              onChange={e => handleCartNoteChange(idx, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Cart Bill Summary */}
                    <div className={styles.posBillSummary}>
                      <div className={styles.posBillRow}>
                        <span>Cart Subtotal ({posCart.reduce((s, i) => s + (i.quantity || 1), 0)} items):</span>
                        <span>₹{cartSubtotal.toFixed(2)}</span>
                      </div>
                      <div className={styles.posBillRow}>
                        <span>CGST (2.5%) + SGST (2.5%):</span>
                        <span>₹{(cartSubtotal * 0.05).toFixed(2)}</span>
                      </div>
                      <div className={styles.posBillTotalRow}>
                        <span>Est. Total:</span>
                        <span>₹{Math.round(cartSubtotal * 1.05)}</span>
                      </div>
                    </div>

                    {/* Cart Actions */}
                    <div className={styles.posCartButtonBox}>
                      <button
                        type="button"
                        className={styles.btnPunchKot}
                        onClick={handlePunchKot}
                        disabled={loading || posCart.length === 0}
                      >
                        {loading ? 'Routing to Kitchen...' : `🍳 Punch KOT & Route to Kitchen (${posOrderType === 'TAKEAWAY' ? 'Takeaway' : `Table #${selectedTable?.tableNumber || '01'}`})`}
                      </button>
                      {selectedTable?.subtotal > 0 && posOrderType === 'DINE_IN' && (
                        <button
                          type="button"
                          className={styles.posActionBtn}
                          style={{ justifyContent: 'center', height: '40px' }}
                          onClick={() => setPosActiveView('TABLE_BILL')}
                        >
                          📋 Switch to Table Billing Tab (₹{Math.round(selectedTable.subtotal * 1.05)})
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  /* ─── VIEW 2: TABLE RUNNING BILL & SETTLEMENT (Requirements 8, 9, 10, 11, 12) ─── */
                  <>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.65rem',
                      padding: '0.4rem 0.6rem',
                      background: 'rgba(37, 99, 235, 0.08)',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                    }}>
                      <span style={{ fontWeight: 800, color: 'var(--accent-blue)' }}>
                        Table #{selectedTable?.tableNumber} Active Tab
                      </span>
                      <button
                        type="button"
                        className={styles.posActionBtn}
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                        onClick={() => setPosActiveView('CART')}
                      >
                        + Add Extra Dishes (Cart)
                      </button>
                    </div>

                    {(!selectedTable?.items || selectedTable.items.length === 0) ? (
                      <div style={{
                        flex: 1,
                        padding: '2rem 1rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.88rem',
                      }}>
                        No running orders currently at Table #{selectedTable?.tableNumber}.
                        <br />
                        <span style={{ color: 'var(--accent-blue)', fontSize: '0.78rem' }}>
                          Punch dishes from the Cart or choose another occupied table.
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Table Items List */}
                        <div className={styles.posItemList}>
                          {selectedTable.items.map((it, idx) => (
                            <div key={idx} className={styles.posItemRow}>
                              <div>
                                <div className={styles.posItemName}>
                                  {it.title} {it.variant ? `(${it.variant})` : ''}
                                </div>
                                <div className={styles.posItemMeta}>
                                  {it.quantity || 1} x ₹{it.price} • {it.guestName || 'Guest'}
                                </div>
                              </div>
                              <div className={styles.posItemPrice}>
                                ₹{(it.price || 0) * (it.quantity || 1)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Bill Breakdown */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.3rem',
                          fontSize: '0.82rem',
                          color: 'var(--text-secondary)',
                          padding: '0.5rem 0',
                          borderTop: '1px solid var(--border-subtle)',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Subtotal:</span>
                            <span>₹{selectedTable.subtotal.toFixed(2)}</span>
                          </div>
                          {serviceChargeEnabled && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Service Charge (5%):</span>
                              <span>₹{(selectedTable.subtotal * 0.05).toFixed(2)}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>CGST (2.5%) + SGST (2.5%):</span>
                            <span>₹{((selectedTable.subtotal + (serviceChargeEnabled ? selectedTable.subtotal * 0.05 : 0)) * 0.05).toFixed(2)}</span>
                          </div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontWeight: 900,
                            fontSize: '1.05rem',
                            color: '#10b981',
                            borderTop: '1px dashed var(--border-subtle)',
                            paddingTop: '0.35rem',
                          }}>
                            <span>Net Amount Payable:</span>
                            <span>₹{netPayable}</span>
                          </div>
                        </div>

                        {/* Service Charge & Discounts */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.78rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <input
                              type="checkbox"
                              checked={serviceChargeEnabled}
                              onChange={e => setServiceChargeEnabled(e.target.checked)}
                            />
                            Apply 5% Service Charge
                          </label>
                        </div>

                        {/* Discount Inputs */}
                        <div className={styles.posDiscountBox}>
                          <input
                            type="number"
                            placeholder="Disc % (e.g. 10)"
                            className={styles.posDiscountInput}
                            value={discountPercent}
                            onChange={e => { setDiscountPercent(e.target.value); setDiscountFlat(''); }}
                          />
                          <input
                            type="number"
                            placeholder="Flat ₹ Disc"
                            className={styles.posDiscountInput}
                            value={discountFlat}
                            onChange={e => { setDiscountFlat(e.target.value); setDiscountPercent(''); }}
                          />
                          <input
                            type="text"
                            placeholder="Reason (e.g. VIP / Festival)"
                            className={styles.posDiscountInput}
                            value={discountReason}
                            onChange={e => setDiscountReason(e.target.value)}
                          />
                        </div>

                        {/* Quick Touch Tender for Cash */}
                        <div style={{ marginBottom: '0.45rem' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: '700' }}>
                            QUICK TOUCH TENDER (CASH):
                          </div>
                          <div className={styles.touchTenderBar}>
                            <button
                              type="button"
                              className={styles.btnTenderChip}
                              onClick={() => setCashTendered(String(netPayable))}
                            >
                              Exact (₹{netPayable})
                            </button>
                            {[100, 200, 500, 1000, 2000].map(amt => (
                              <button
                                key={amt}
                                type="button"
                                className={styles.btnTenderChip}
                                onClick={() => setCashTendered(String(amt))}
                              >
                                ₹{amt}
                              </button>
                            ))}
                            <button
                              type="button"
                              className={styles.btnTenderChip}
                              style={{ minWidth: '40px', background: showNumpad ? 'var(--accent-blue)' : undefined, color: showNumpad ? '#ffffff' : undefined }}
                              onClick={() => setShowNumpad(!showNumpad)}
                            >
                              🔢
                            </button>
                          </div>
                        </div>

                        {/* Virtual Numpad */}
                        {showNumpad && (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '0.35rem',
                            marginBottom: '0.65rem',
                            background: 'var(--bg-card-subtle)',
                            padding: '0.5rem',
                            borderRadius: '8px',
                          }}>
                            {[1, 2, 3, 'C', 4, 5, 6, '00', 7, 8, 9, 0].map((k, i) => (
                              <button
                                key={i}
                                type="button"
                                className={styles.btnTenderChip}
                                style={{ height: '36px', fontSize: '0.95rem' }}
                                onClick={() => {
                                  if (k === 'C') setCashTendered('');
                                  else setCashTendered(prev => prev + String(k));
                                }}
                              >
                                {k}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Cash Tendered & Change Return */}
                        {paymentMode === 'CASH' && (
                          <div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.45rem' }}>
                              <input
                                type="number"
                                placeholder="Cash Received from Customer (₹)"
                                className={styles.posDiscountInput}
                                value={cashTendered}
                                onChange={e => setCashTendered(e.target.value)}
                              />
                            </div>

                            {Number(cashTendered) > 0 && (
                              <div className={styles.changeReturnBox}>
                                <span className={styles.changeReturnLabel}>
                                  {Number(cashTendered) >= netPayable ? '💵 Return Change:' : '⚠️ Balance Due:'}
                                </span>
                                <span className={styles.changeReturnValue}>
                                  ₹{Math.abs(Number(cashTendered) - netPayable)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Payment Mode Selector (Requirement 10) */}
                        <div className={styles.posPayModes}>
                          {['CASH', 'ONLINE_UPI', 'CARD', 'SPLIT'].map(mode => (
                            <button
                              key={mode}
                              type="button"
                              className={`${styles.payModeBtn} ${paymentMode === mode ? styles.payModeActive : ''}`}
                              onClick={() => {
                                setPaymentMode(mode);
                                if (mode === 'SPLIT') setShowSplitModal(true);
                              }}
                            >
                              {mode === 'ONLINE_UPI' ? '📱 UPI' : mode === 'CASH' ? '💵 Cash' : mode === 'CARD' ? '💳 Card' : '✂️ Split'}
                            </button>
                          ))}
                        </div>

                        {/* UPI QR & Ref input */}
                        {paymentMode === 'ONLINE_UPI' && (
                          <div style={{
                            background: 'var(--bg-card-subtle)',
                            padding: '0.65rem',
                            borderRadius: '8px',
                            marginBottom: '0.65rem',
                            fontSize: '0.78rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: '#38bdf8' }}>📱 Dynamic UPI QR Active</span>
                              <Link
                                href="/admin/customer-display"
                                target="_blank"
                                style={{ color: '#10b981', fontSize: '0.72rem', textDecoration: 'none' }}
                              >
                                View Customer Display ↗
                              </Link>
                            </div>
                            <input
                              type="text"
                              placeholder="Transaction Ref / UTR (Optional, e.g. 4291882910)"
                              className={styles.posDiscountInput}
                              style={{ height: '36px' }}
                              value={transactionRef}
                              onChange={e => setTransactionRef(e.target.value)}
                            />
                          </div>
                        )}

                        {/* Settle Action */}
                        <button
                          className={styles.btnSettle}
                          onClick={handleSettleBill}
                          disabled={loading}
                        >
                          {loading ? 'Processing...' : `Settle ₹${netPayable} & Print Slip (Table #${selectedTable?.tableNumber})`}
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* ESC/POS Thermal Receipt Slip Preview (Requirement 12) */}
                {activeReceipt && (
                  <div style={{ marginTop: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        🖨️ Thermal Receipt Preview (TVSE RP3200 Plus)
                      </span>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className={styles.btnNavAlt}
                          onClick={() => {
                            const targetBill = lastSettledBill || (posData.recentBills && posData.recentBills[0]) || { billNumber: 'SGR-RECENT', thermalSlip: activeReceipt, items: [], totalAmount: 0 };
                            setEditBillTarget({ bill: targetBill, thermalSlip: activeReceipt });
                          }}
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderColor: '#38bdf8', color: '#38bdf8', fontWeight: 'bold' }}
                          title="Edit items, customer, rates, or customize raw slip before printing"
                        >
                          ✏️ Edit Before Print
                        </button>
                        <button
                          type="button"
                          className={styles.btnNavAlt}
                          onClick={() => setShowSlipDesignerModal(true)}
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          title="Customize slip format and store headers"
                        >
                          ⚙️ Format Slip
                        </button>
                        <button
                          type="button"
                          className={styles.btnThermalPrint}
                          onClick={handlePrintReceipt}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                        >
                          🖨️ Direct Print
                        </button>
                      </div>
                    </div>
                    <div className={styles.thermalReceiptBox}>
                      <pre>{activeReceipt}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 2: KITCHEN DISPLAY SYSTEM (KDS)
           ══════════════════════════════════════════════════════════════════════ */}
        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 2: KITCHEN DISPLAY SYSTEM (KDS) & LIVE KOT DASHBOARD (15 REQUIREMENTS)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'kds' && (
          <div>
            {/* ─── Requirement 14: KDS Performance & Kitchen Metrics Bar ─── */}
            <div className={styles.kdsPerformanceBar}>
              <div className={styles.kdsMetricCard}>
                <span className={styles.kdsMetricTitle}>Active Kitchen Queue</span>
                <div className={styles.kdsMetricValue}>
                  <span style={{ color: '#2563eb' }}>{kdsSummary.totalActive || 0}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>tickets</span>
                </div>
                <span className={styles.kdsMetricSub}>
                  {kdsSummary.newTickets || 0} New • {kdsSummary.preparingTickets || 0} Preparing • {kdsSummary.readyTickets || 0} Ready
                </span>
              </div>

              <div className={styles.kdsMetricCard}>
                <span className={styles.kdsMetricTitle}>Avg Preparation Time</span>
                <div className={styles.kdsMetricValue}>
                  <span style={{ color: '#10b981' }}>{kdsSummary.avgPrepMinutes || '9.2'}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>min/ticket</span>
                </div>
                <span className={styles.kdsMetricSub}>Target benchmark: &lt; 15 mins</span>
              </div>

              <div className={styles.kdsMetricCard}>
                <span className={styles.kdsMetricTitle}>On-Time Completion Rate</span>
                <div className={styles.kdsMetricValue}>
                  <span style={{ color: '#8b5cf6' }}>{kdsSummary.onTimeRate || 94}%</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>on-time</span>
                </div>
                <span className={styles.kdsMetricSub}>{kdsSummary.servedToday || 0} orders served to tables today</span>
              </div>

              <div className={styles.kdsMetricCard} style={{ borderColor: (kdsSummary.delayedCount || 0) > 0 ? '#ef4444' : undefined }}>
                <span className={styles.kdsMetricTitle}>Priority Delays (&gt;15m)</span>
                <div className={styles.kdsMetricValue}>
                  <span style={{ color: (kdsSummary.delayedCount || 0) > 0 ? '#ef4444' : '#10b981' }}>
                    {kdsSummary.delayedCount || 0}
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>orders</span>
                </div>
                <span className={styles.kdsMetricSub}>
                  {(kdsSummary.delayedCount || 0) > 0 ? '⚠️ High priority chef attention needed' : '✓ All stations operating on time'}
                </span>
              </div>
            </div>

            {/* ─── Requirement 2: Order Verification (QR Table Orders Pending OTP Banner) ─── */}
            {kdsPendingOtpOrders.length > 0 && (
              <div className={styles.kdsOtpWarningBanner}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>⏳</span>
                  <span>
                    <strong>{kdsPendingOtpOrders.length} QR Table Order(s) Awaiting Waiter OTP Verification</strong> (Table #{kdsPendingOtpOrders.map(p => p.table).join(', ')}) — Held in staging buffer until floor captain validates customer OTP.
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', background: 'rgba(234, 179, 8, 0.25)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  Safety Check Active
                </span>
              </div>
            )}

            {/* ─── Requirement 6: Kitchen Stations & Controls Bar ─── */}
            <div className={styles.kdsTopControlsRow}>
              {/* Station Filter Tabs */}
              <div className={styles.kdsStationTabs} style={{ margin: 0 }}>
                {[
                  { id: 'ALL', label: 'All Stations', count: kdsSummary.totalActive || 0 },
                  { id: 'DOSA', label: '🥞 Dosa Counter', count: kdsSummary.dosaCount || 0 },
                  { id: 'TIFFIN', label: '🥣 Tiffin', count: kdsSummary.tiffinCount || 0 },
                  { id: 'MEALS', label: '🍛 Chettinad Meals', count: kdsSummary.mealsCount || 0 },
                  { id: 'SNACKS', label: '🥟 Snacks & Paniyaram', count: kdsSummary.snacksCount || 0 },
                  { id: 'BEVERAGES', label: '☕ Beverages & Coffee', count: kdsSummary.beveragesCount || 0 },
                ].map(st => (
                  <button
                    key={st.id}
                    className={`${styles.kdsStationBtn} ${kdsStation === st.id ? styles.kdsStationActive : ''}`}
                    onClick={() => {
                      setKdsStation(st.id);
                      fetchKds(st.id, kdsView, kdsHistoryStatus);
                    }}
                  >
                    <span>{st.label}</span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.45rem',
                      borderRadius: '9999px',
                      background: kdsStation === st.id ? '#ffffff' : 'var(--bg-card)',
                      color: kdsStation === st.id ? '#2563eb' : 'var(--text-primary)',
                    }}>
                      {st.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* View Switcher: Active Queue vs Order History (Requirement 13) */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div className={styles.kdsViewToggleGroup}>
                  <button
                    type="button"
                    className={`${styles.kdsViewToggleBtn} ${kdsView === 'ACTIVE' ? styles.kdsViewToggleBtnActive : ''}`}
                    onClick={() => {
                      setKdsView('ACTIVE');
                      fetchKds(kdsStation, 'ACTIVE', kdsHistoryStatus);
                    }}
                  >
                    🍳 Live Queue ({kdsSummary.totalActive || 0})
                  </button>
                  <button
                    type="button"
                    className={`${styles.kdsViewToggleBtn} ${kdsView === 'HISTORY' ? styles.kdsViewToggleBtnActive : ''}`}
                    onClick={() => {
                      setKdsView('HISTORY');
                      fetchKds(kdsStation, 'HISTORY', kdsHistoryStatus);
                    }}
                  >
                    📜 KOT History
                  </button>
                </div>

                {/* Search Input */}
                <input
                  type="text"
                  placeholder="Search KOT / Table / Dish..."
                  className={styles.posDiscountInput}
                  style={{ width: '190px', height: '36px' }}
                  value={kdsSearch}
                  onChange={e => setKdsSearch(e.target.value)}
                />
              </div>
            </div>

            {/* History Status Filters (Requirement 13) */}
            {kdsView === 'HISTORY' && (
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>STATUS FILTER:</span>
                {[
                  { id: 'ALL', label: 'All History' },
                  { id: 'READY', label: 'Ready for Pickup' },
                  { id: 'SERVED', label: 'Served to Guests' },
                  { id: 'CANCELLED', label: 'Cancelled KOTs' },
                ].map(flt => (
                  <button
                    key={flt.id}
                    type="button"
                    className={`${styles.posCatFilterBtn} ${kdsHistoryStatus === flt.id ? styles.posCatFilterBtnActive : ''}`}
                    onClick={() => {
                      setKdsHistoryStatus(flt.id);
                      fetchKds(kdsStation, 'HISTORY', flt.id);
                    }}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>
            )}

            {/* ─── Tickets Grid (Requirements 1, 3, 4, 5, 7, 8, 9, 10, 11, 12) ─── */}
            {kdsTickets.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'var(--bg-card)',
                borderRadius: '12px',
                color: 'var(--text-muted)'
              }}>
                <h3>🎉 All Kitchen Orders Cleared!</h3>
                <p>New guest orders placed via Touch POS, QR codes, or waiter tablets will chime and appear here in real-time.</p>
              </div>
            ) : (
              <div className={styles.kdsTicketsGrid}>
                {kdsTickets
                  .filter(tkt => {
                    if (!kdsSearch) return true;
                    const q = kdsSearch.toLowerCase();
                    return (
                      tkt.kotNumber?.toLowerCase().includes(q) ||
                      String(tkt.tableNumber).includes(q) ||
                      tkt.customerName?.toLowerCase().includes(q) ||
                      tkt.waiterName?.toLowerCase().includes(q) ||
                      (tkt.items || []).some(it => it.title?.toLowerCase().includes(q))
                    );
                  })
                  .map(tkt => {
                    const isNew = tkt.status === 'NEW';
                    const isAccepted = tkt.status === 'ACCEPTED';
                    const isCooking = tkt.status === 'PREPARING' || tkt.status === 'COOKING';
                    const isReady = tkt.status === 'READY';
                    const isServed = tkt.status === 'SERVED';
                    const isCancelled = tkt.status === 'CANCELLED';
                    const isDelayed = tkt.isDelayed;

                    const cardClass = isCancelled
                      ? styles.ticketCancelled
                      : isDelayed
                      ? styles.ticketDelayed
                      : isReady
                      ? styles.ticketReady
                      : isCooking
                      ? styles.ticketPreparing
                      : isAccepted
                      ? styles.ticketAccepted
                      : isServed
                      ? styles.ticketServed
                      : styles.ticketNew;

                    return (
                      <div key={tkt.id} className={`${styles.kdsTicketCard} ${cardClass}`}>
                        {/* Header: Table, Round Badge, Priority Alert, Timer */}
                        <div className={styles.kdsTicketHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span className={styles.kdsTablePill}>
                              {tkt.orderType === 'TAKEAWAY' ? `🥡 TK-${tkt.tableNumber}` : `Table #${tkt.tableNumber}`}
                            </span>

                            {/* Supplementary Round Badge (Requirement 9 & 10) */}
                            {tkt.isSupplementary && (
                              <span className={styles.kdsSupplementaryBadge}>
                                🏷️ Round {tkt.roundNumber} (Supplementary)
                              </span>
                            )}

                            {/* Delayed Priority Alert (Requirement 7) */}
                            {isDelayed && (
                              <span className={styles.kdsDelayedBadge}>
                                ⚠️ DELAYED {tkt.elapsedMinutes}m
                              </span>
                            )}
                          </div>

                          {/* Live Preparation Timer (Requirement 7) */}
                          <span className={styles.kdsTimer} style={{ color: isDelayed ? '#ef4444' : (isReady ? '#10b981' : undefined) }}>
                            ⏱️ {Math.floor(tkt.elapsedSeconds / 60)}m {tkt.elapsedSeconds % 60}s ago
                          </span>
                        </div>

                        {/* Sub-header Details (Requirement 3: KOT details) */}
                        <div className={styles.kdsSubHeaderRow}>
                          <span>
                            <strong>{tkt.kotNumber}</strong> • {tkt.orderType}
                          </span>
                          <span>
                            Station: <strong style={{ color: '#3b82f6' }}>{tkt.station}</strong>
                          </span>
                        </div>

                        <div style={{ padding: '0.45rem 0.9rem', fontSize: '0.72rem', color: 'var(--text-muted)', borderBottom: '1px dashed var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Guest: <strong style={{ color: 'var(--text-primary)' }}>{tkt.customerName || 'Walk-in'}</strong></span>
                          <span>Waiter: <strong>{tkt.waiterName || 'POS Captain'}</strong></span>
                        </div>

                        {/* Food Items List (Requirement 4: Dish names, quantities, variants, add-ons, notes) */}
                        <div className={styles.kdsItemList}>
                          {tkt.items.map((item, idx) => (
                            <div key={idx} className={styles.kdsItemCard}>
                              <div className={styles.kdsItemRow}>
                                <div>
                                  <div className={styles.kdsItemTitle}>{item.title}</div>
                                  {item.tamilTitle && (
                                    <div className={styles.kdsItemTaTitle}>{item.tamilTitle}</div>
                                  )}
                                </div>
                                <span className={styles.kdsItemQty}>x{item.quantity || 1}</span>
                              </div>

                              {/* Variants & Add-ons */}
                              {(item.variant || (item.addOns && item.addOns.length > 0)) && (
                                <div className={styles.kdsItemMetaRow}>
                                  {item.variant && (
                                    <span className={styles.kdsVariantChip}>
                                      Option: {item.variant}
                                    </span>
                                  )}
                                  {(item.addOns || []).map((addon, aIdx) => (
                                    <span key={aIdx} className={styles.kdsAddOnChip}>
                                      +{addon}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Special Cooking Instructions Box */}
                              {(item.specialNotes || item.cookingNotes) && (
                                <div className={styles.kdsCookingNoteBox}>
                                  ⚠️ Chef Note: {item.specialNotes || item.cookingNotes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Overall Order Notes */}
                        {tkt.notes && (
                          <div className={styles.kdsTicketFooterNote}>
                            📝 Order Note: <em>{tkt.notes}</em>
                          </div>
                        )}

                        {/* Cancellation Reason Record (Requirement 11) */}
                        {isCancelled && (
                          <div style={{
                            padding: '0.55rem 0.9rem',
                            background: 'rgba(239, 68, 68, 0.15)',
                            borderTop: '1px solid #ef4444',
                            fontSize: '0.75rem',
                            color: '#ef4444'
                          }}>
                            <strong>❌ CANCELLED:</strong> {tkt.cancellationReason || 'Cancelled by staff'} (by {tkt.cancelledBy || 'Staff'})
                          </div>
                        )}

                        {/* ─── KOT Actions (Requirements 5, 8, 11, 12) ─── */}
                        {!isCancelled && !isServed && (
                          <div className={styles.kdsTicketActions}>
                            {isNew && (
                              <button
                                className={`${styles.btnKdsAction} ${styles.btnAccept}`}
                                onClick={() => handleKdsAdvance(tkt, 'ACCEPTED')}
                                title="Acknowledge order into kitchen queue"
                              >
                                ✓ Accept Ticket
                              </button>
                            )}
                            {isAccepted && (
                              <button
                                className={`${styles.btnKdsAction} ${styles.btnCooking}`}
                                onClick={() => handleKdsAdvance(tkt, 'PREPARING')}
                                title="Start preparation and deduct recipe BOM"
                              >
                                🍳 Start Cooking (BOM)
                              </button>
                            )}
                            {isCooking && (
                              <button
                                className={`${styles.btnKdsAction} ${styles.btnReady}`}
                                onClick={() => handleKdsAdvance(tkt, 'READY')}
                                title="Mark items ready and alert floor captain"
                              >
                                ✅ Mark Ready (Alert Waiter)
                              </button>
                            )}
                            {isReady && (
                              <>
                                <button
                                  className={`${styles.btnKdsAction} ${styles.btnServed}`}
                                  onClick={() => handleKdsAdvance(tkt, 'SERVED')}
                                  title="Mark as delivered to dining table"
                                >
                                  🍽️ Served
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.btnKdsAction} ${styles.btnNotifyWaiter}`}
                                  onClick={() => handleKdsNotifyWaiter(tkt)}
                                  title="Ring floor captain bell for pickup"
                                >
                                  🔔 Bell
                                </button>
                              </>
                            )}

                            {/* 80mm ESC/POS KOT Thermal Print (Requirement 12) */}
                            <button
                              type="button"
                              className={`${styles.btnKdsAction} ${styles.btnPrintKot}`}
                              onClick={() => handleKdsPrintTicket(tkt)}
                              title="Print 80mm ESC/POS KOT kitchen ticket"
                            >
                              🖨️ KOT Slip
                            </button>

                            {/* Cancellation with Reason (Requirement 11) */}
                            <button
                              type="button"
                              className={`${styles.btnKdsAction} ${styles.btnCancelKot}`}
                              onClick={() => {
                                setKdsCancelTicketModal(tkt);
                                setKdsCancelReason('');
                                setKdsManagerPin('');
                              }}
                              title="Cancel KOT with mandatory reason"
                            >
                              ❌ Cancel
                            </button>
                          </div>
                        )}

                        {/* Historical Reprints (Requirement 12 & 13) */}
                        {(isServed || isCancelled) && (
                          <div className={styles.kdsTicketActions}>
                            <button
                              type="button"
                              className={`${styles.btnKdsAction} ${styles.btnPrintKot}`}
                              onClick={() => handleKdsPrintTicket(tkt)}
                              style={{ flex: 1 }}
                            >
                              🖨️ Reprint KOT Slip
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 3: LIVE FLOOR PLAN & TABLE STATES
           ══════════════════════════════════════════════════════════════════════ */}
        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 3: LIVE FLOOR PLAN & TABLE MANAGEMENT (ALL 20 REQUIREMENTS)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'floor' && (
          <div className={styles.floorSectionsWrap}>
            {/* ─── 1 & 2: Status Summary Bar (All 8 Statuses + Total) ─── */}
            <div className={styles.floorSummaryBar}>
              <div
                className={`${styles.floorSummaryChip} ${floorFilterStatus === 'ALL' ? styles.floorSummaryChipActive : ''}`}
                onClick={() => setFloorFilterStatus('ALL')}
                title="Show all tables"
              >
                <span>🏢 Total Tables:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{floorTables.length}</strong>
              </div>
              <div
                className={`${styles.floorSummaryChip} ${floorFilterStatus === 'AVAILABLE' ? styles.floorSummaryChipActive : ''}`}
                onClick={() => setFloorFilterStatus(floorFilterStatus === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')}
                style={{ borderLeft: '3px solid #16a34a' }}
              >
                <span>🟢 Available:</span>
                <strong style={{ color: '#16a34a' }}>{floorStats.available || 0}</strong>
              </div>
              <div
                className={`${styles.floorSummaryChip} ${floorFilterStatus === 'OCCUPIED' ? styles.floorSummaryChipActive : ''}`}
                onClick={() => setFloorFilterStatus(floorFilterStatus === 'OCCUPIED' ? 'ALL' : 'OCCUPIED')}
                style={{ borderLeft: '3px solid #ea580c' }}
              >
                <span>🟠 Occupied:</span>
                <strong style={{ color: '#ea580c' }}>{floorStats.occupied || 0}</strong>
              </div>
              <div
                className={`${styles.floorSummaryChip} ${floorFilterStatus === 'BILL_REQUESTED' ? styles.floorSummaryChipActive : ''}`}
                onClick={() => setFloorFilterStatus(floorFilterStatus === 'BILL_REQUESTED' ? 'ALL' : 'BILL_REQUESTED')}
                style={{ borderLeft: '3px solid #f43f5e' }}
              >
                <span>🔔 Bill Requested:</span>
                <strong style={{ color: '#f43f5e' }}>{floorStats.billRequested || 0}</strong>
              </div>
              <div
                className={`${styles.floorSummaryChip} ${floorFilterStatus === 'BILL_GENERATED' ? styles.floorSummaryChipActive : ''}`}
                onClick={() => setFloorFilterStatus(floorFilterStatus === 'BILL_GENERATED' ? 'ALL' : 'BILL_GENERATED')}
                style={{ borderLeft: '3px solid #0284c7' }}
              >
                <span>🧾 Bill Generated:</span>
                <strong style={{ color: '#0284c7' }}>{floorStats.billPending || 0}</strong>
              </div>
              <div
                className={`${styles.floorSummaryChip} ${floorFilterStatus === 'PAYMENT_PENDING' ? styles.floorSummaryChipActive : ''}`}
                onClick={() => setFloorFilterStatus(floorFilterStatus === 'PAYMENT_PENDING' ? 'ALL' : 'PAYMENT_PENDING')}
                style={{ borderLeft: '3px solid #a855f7' }}
              >
                <span>⏳ Pay Pending:</span>
                <strong style={{ color: '#a855f7' }}>{floorStats.paymentPending || 0}</strong>
              </div>
              <div
                className={`${styles.floorSummaryChip} ${floorFilterStatus === 'PAID' ? styles.floorSummaryChipActive : ''}`}
                onClick={() => setFloorFilterStatus(floorFilterStatus === 'PAID' ? 'ALL' : 'PAID')}
                style={{ borderLeft: '3px solid #0d9488' }}
              >
                <span>✅ Paid:</span>
                <strong style={{ color: '#0d9488' }}>{floorStats.paid || 0}</strong>
              </div>
              <div
                className={`${styles.floorSummaryChip} ${floorFilterStatus === 'RESERVED' ? styles.floorSummaryChipActive : ''}`}
                onClick={() => setFloorFilterStatus(floorFilterStatus === 'RESERVED' ? 'ALL' : 'RESERVED')}
                style={{ borderLeft: '3px solid #8b5cf6' }}
              >
                <span>🟣 Reserved:</span>
                <strong style={{ color: '#8b5cf6' }}>{floorStats.reserved || 0}</strong>
              </div>
              <div
                className={`${styles.floorSummaryChip} ${floorFilterStatus === 'CLEANING' ? styles.floorSummaryChipActive : ''}`}
                onClick={() => setFloorFilterStatus(floorFilterStatus === 'CLEANING' ? 'ALL' : 'CLEANING')}
                style={{ borderLeft: '3px solid #dc2626' }}
              >
                <span>🧹 Cleaning:</span>
                <strong style={{ color: '#dc2626' }}>{floorStats.cleaning || 0}</strong>
              </div>
            </div>

            {/* ─── Command Toolbar & Multi-Filters (Requirements 3, 13, 14, 15, 19) ─── */}
            <div className={styles.floorCommandBar}>
              {/* Section Tabs */}
              <div className={styles.floorSectionTabs} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className={`${styles.floorSectionBtn} ${floorFilterSection === 'ALL' ? styles.floorSectionBtnActive : ''}`}
                  onClick={() => setFloorFilterSection('ALL')}
                >
                  All Sections
                </button>
                {(floorPlans.length > 0 ? floorPlans : [
                  { id: 'GROUND_FLOOR', name: 'Ground Floor', icon: '🏛️' },
                  { id: 'AC_HALL', name: 'AC Royal Hall', icon: '❄️' },
                  { id: 'VERANDA', name: 'Chettinad Veranda', icon: '🌿' },
                ]).map(sec => (
                  <button
                    key={sec.id}
                    type="button"
                    className={`${styles.floorSectionBtn} ${floorFilterSection === sec.id ? styles.floorSectionBtnActive : ''}`}
                    onClick={() => setFloorFilterSection(sec.id)}
                  >
                    {sec.icon || '📍'} {sec.name}
                  </button>
                ))}
                <button
                  type="button"
                  className={styles.floorSectionBtn}
                  onClick={() => setShowAddFloorPlanModal(true)}
                  style={{ background: 'rgba(37, 99, 235, 0.12)', borderColor: '#2563eb', color: '#3b82f6', fontWeight: 700 }}
                  title="Create new dining section / floor plan"
                >
                  ➕ Add Floor Plan
                </button>
              </div>

              {/* Filters: Capacity, Waiter, Search */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={floorFilterCapacity}
                  onChange={e => setFloorFilterCapacity(e.target.value)}
                  className={styles.posSelectField}
                  style={{ height: '36px', fontSize: '0.78rem' }}
                  title="Filter by seating capacity"
                >
                  <option value="ALL">All Capacities</option>
                  <option value="2">2 Seats</option>
                  <option value="4">4 Seats</option>
                  <option value="6">6+ Seats</option>
                </select>

                <select
                  value={floorFilterWaiter}
                  onChange={e => setFloorFilterWaiter(e.target.value)}
                  className={styles.posSelectField}
                  style={{ height: '36px', fontSize: '0.78rem' }}
                  title="Filter by floor captain"
                >
                  <option value="ALL">All Captains</option>
                  {floorWaiters.map((w, idx) => {
                    const name = typeof w === 'object' ? (w.name || w.fullName || w.id) : w;
                    return <option key={name || idx} value={name}>{name}</option>;
                  })}
                </select>

                <input
                  type="text"
                  placeholder="🔍 Search Table / Guest..."
                  value={floorSearch}
                  onChange={e => setFloorSearch(e.target.value)}
                  className={styles.posSearchInput}
                  style={{ width: '170px', height: '36px', fontSize: '0.78rem' }}
                />
              </div>

              {/* Action Buttons: Add Table, Merge/Split, Reservations, Waitlist */}
              <div className={styles.floorActionBtns}>
                <button
                  type="button"
                  className={styles.btnFloorAction}
                  onClick={() => setShowAddFloorPlanModal(true)}
                  style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: '#10b981' }}
                  title="Create new custom dining floor plan"
                >
                  ➕ New Floor Plan
                </button>
                <button
                  type="button"
                  className={styles.btnFloorAction}
                  onClick={() => setShowAddTableModal(true)}
                  style={{ background: '#2563eb', color: '#ffffff', borderColor: '#2563eb' }}
                  title="Add new table to floor layout"
                >
                  ➕ Add Table
                </button>
                <button
                  type="button"
                  className={styles.btnFloorAction}
                  onClick={() => setShowMergeModal(true)}
                  title="Merge adjacent tables for large party"
                >
                  🔗 Merge / Split
                </button>
                <button
                  type="button"
                  className={styles.btnFloorAction}
                  onClick={() => setShowReservationsModal(true)}
                  title="View and manage table reservations"
                >
                  📅 Reservations ({floorReservations.filter(r => r.status === 'CONFIRMED').length})
                </button>
                <button
                  type="button"
                  className={styles.btnFloorAction}
                  onClick={() => setShowWaitlistModal(true)}
                  title="Manage walk-in guest waitlist"
                >
                  ⏳ Waitlist ({floorWaitlist.filter(w => w.status === 'WAITING').length})
                </button>
                <button
                  type="button"
                  className={styles.btnFloorAction}
                  onClick={fetchFloor}
                  title="Refresh floor state from server"
                >
                  🔄
                </button>
              </div>
            </div>

            {/* ─── Visual Floor Layout Cards Grid ─── */}
            {floorTables.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                background: 'var(--bg-card, #18181b)',
                borderRadius: '12px',
                border: '1px dashed var(--border-subtle, #3f3f46)',
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🪑</div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Floor Plan Ready for Custom Setup</h3>
                <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  No tables found. Click below to add your tables manually to Ground Floor, AC Royal Dining Hall, Chettinad Veranda, or create a new floor plan.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className={styles.btnFloorAction}
                    onClick={() => setShowAddTableModal(true)}
                    style={{ background: '#2563eb', color: '#ffffff', borderColor: '#2563eb', padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
                  >
                    ➕ Add New Table
                  </button>
                  <button
                    type="button"
                    className={styles.btnFloorAction}
                    onClick={() => setShowAddFloorPlanModal(true)}
                    style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', borderColor: '#10b981', padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
                  >
                    ➕ Create Floor Plan
                  </button>
                </div>
              </div>
            )}

            {(floorPlans.length > 0 ? floorPlans : [
              { id: 'GROUND_FLOOR', name: 'Ground Floor Chettinad Dining', tamilName: 'தரைத்தளம்', icon: '🏛️' },
              { id: 'AC_HALL', name: 'AC Royal Dining Hall', tamilName: 'ஏசி ராயல் ஹால்', icon: '❄️' },
              { id: 'VERANDA', name: 'Traditional Courtyard / Veranda', tamilName: 'வராண்டா', icon: '🌿' },
            ]).map(floorPlan => {
              const secKey = floorPlan.id || floorPlan.sectionId;
              if (floorFilterSection !== 'ALL' && floorFilterSection !== secKey) return null;
              const secTables = floorTables.filter(tbl => {
                if (tbl.section !== secKey) return false;
                if (floorFilterStatus !== 'ALL' && tbl.status !== floorFilterStatus) return false;
                if (floorFilterCapacity === '2' && Number(tbl.capacity) !== 2) return false;
                if (floorFilterCapacity === '4' && Number(tbl.capacity) !== 4) return false;
                if (floorFilterCapacity === '6' && Number(tbl.capacity) < 6) return false;
                if (floorFilterWaiter !== 'ALL' && tbl.assignedWaiter !== floorFilterWaiter) return false;
                if (floorSearch.trim()) {
                  const q = floorSearch.trim().toLowerCase();
                  const mNum = String(tbl.tableNumber).toLowerCase().includes(q);
                  const mGuest = tbl.guestNames && tbl.guestNames.toLowerCase().includes(q);
                  const mWaiter = tbl.assignedWaiter && tbl.assignedWaiter.toLowerCase().includes(q);
                  if (!mNum && !mGuest && !mWaiter) return false;
                }
                return true;
              });

              if (secTables.length === 0 && floorFilterSection === 'ALL' && (floorFilterStatus !== 'ALL' || floorSearch.trim())) {
                return null;
              }

              const sectionTitle = `${floorPlan.icon || '📍'} ${floorPlan.name}${floorPlan.tamilName ? ` • ${floorPlan.tamilName}` : ''}`;

              return (
                <div key={secKey} style={{ marginBottom: '1.75rem', background: 'var(--bg-card, #18181b)', border: '1px solid var(--border-subtle, #27272a)', borderRadius: '12px', padding: '1.25rem' }}>
                  <div className={styles.floorSectionTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle, #27272a)', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{sectionTitle}</span>
                      <span className={styles.statusBadge} style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#3b82f6', border: '1px solid #3b82f6', fontSize: '0.75rem' }}>
                        {secTables.length} tables
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        className={styles.btnFloorAction}
                        onClick={() => {
                          setNewTableData(prev => ({ ...prev, section: secKey }));
                          setShowAddTableModal(true);
                        }}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', background: '#2563eb', color: '#fff', borderColor: '#2563eb' }}
                        title={`Add table to ${floorPlan.name}`}
                      >
                        ➕ Add Table
                      </button>
                      <button
                        type="button"
                        className={styles.btnFloorAction}
                        onClick={() => {
                          setFloorPlanToDelete({ ...floorPlan, tableCount: secTables.length });
                          setDeletePlanPin('');
                        }}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}
                        title={`Delete floor plan ${floorPlan.name}`}
                      >
                        🗑️ Delete Plan
                      </button>
                    </div>
                  </div>

                  {secTables.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1.5rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                      <span>No tables currently in this section.</span>
                      <button
                        type="button"
                        className={styles.btnFloorAction}
                        onClick={() => {
                          setNewTableData(prev => ({ ...prev, section: secKey }));
                          setShowAddTableModal(true);
                        }}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem', background: '#2563eb', color: '#fff', borderColor: '#2563eb' }}
                      >
                        ➕ Add Table to {floorPlan.name}
                      </button>
                    </div>
                  ) : (
                    <div className={styles.tablesGridFloor}>
                      {secTables.map(tbl => {
                        const statusClass =
                          tbl.status === 'AVAILABLE' ? styles.tblAvailable :
                          tbl.status === 'OCCUPIED' ? styles.tblOccupied :
                          tbl.status === 'BILL_REQUESTED' ? styles.tblBillRequested :
                          tbl.status === 'BILL_GENERATED' ? styles.tblBillGenerated :
                          tbl.status === 'PAYMENT_PENDING' ? styles.tblPaymentPending :
                          tbl.status === 'PAID' ? styles.tblPaid :
                          tbl.status === 'RESERVED' ? styles.tblReserved :
                          tbl.status === 'CLEANING' ? styles.tblCleaning : styles.tblAvailable;

                        const badgeColor =
                          tbl.status === 'AVAILABLE' ? '#16a34a' :
                          tbl.status === 'OCCUPIED' ? '#ea580c' :
                          tbl.status === 'BILL_REQUESTED' ? '#f43f5e' :
                          tbl.status === 'BILL_GENERATED' ? '#0284c7' :
                          tbl.status === 'PAYMENT_PENDING' ? '#a855f7' :
                          tbl.status === 'PAID' ? '#0d9488' :
                          tbl.status === 'RESERVED' ? '#8b5cf6' : '#dc2626';

                        return (
                          <div
                            key={tbl.id || tbl.tableNumber}
                            className={`${styles.floorTableCard} ${statusClass}`}
                            onClick={() => setFloorSelectedTable(tbl)}
                            style={{ cursor: 'pointer' }}
                          >
                            {/* Card Header: Table #, Shape, Capacity, Status */}
                            <div className={styles.floorTableHead}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span className={styles.floorTableNumber}>Table #{tbl.tableNumber}</span>
                                <span className={styles.tableShapeBadge}>{tbl.shape || 'SQUARE'}</span>
                              </div>
                              <span
                                className={styles.statusBadge}
                                style={{
                                  background: `${badgeColor}22`,
                                  color: badgeColor,
                                  border: `1px solid ${badgeColor}`,
                                }}
                              >
                                {tbl.status}
                              </span>
                            </div>

                            {/* Card Body: Capacity, Assigned Captain, Session info */}
                            <div className={styles.floorTableBody}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <span>👥 {tbl.capacity} Seats</span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                  🤵 {tbl.assignedWaiter ? tbl.assignedWaiter.split(' ')[0] : 'Unassigned'}
                                </span>
                              </div>

                              {/* Active Dining Info */}
                              {tbl.currentBillSubtotal > 0 && (
                                <div style={{ color: '#16a34a', fontWeight: '800', fontSize: '0.88rem', margin: '0.2rem 0' }}>
                                  Tab: ₹{tbl.currentBillSubtotal} {tbl.diningDurationMinutes ? `• ⏱️ ${tbl.diningDurationMinutes}m` : ''}
                                </div>
                              )}

                              {/* Multiple Customers Display */}
                              {tbl.guestOrders && tbl.guestOrders.length > 0 && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                  👥 {tbl.guestOrders.length} {tbl.guestOrders.length === 1 ? 'Guest' : 'Guests'} ({tbl.guestNames || 'Dine-In'})
                                </div>
                              )}

                              {/* Live Order Counts: KOT, Preparing, Ready */}
                              {(tbl.kotCount > 0 || tbl.preparingCount > 0 || tbl.readyCount > 0) && (
                                <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                                  {tbl.kotCount > 0 && <span className={styles.tableOrderMiniTag}>KOT: {tbl.kotCount}</span>}
                                  {tbl.preparingCount > 0 && (
                                    <span className={styles.tableOrderMiniTag} style={{ background: 'rgba(234, 88, 12, 0.15)', color: '#ea580c' }}>
                                      🍳 {tbl.preparingCount} Cooking
                                    </span>
                                  )}
                                  {tbl.readyCount > 0 && (
                                    <span className={styles.tableOrderMiniTag} style={{ background: 'rgba(22, 163, 74, 0.18)', color: '#16a34a', fontWeight: '800' }}>
                                      ✅ {tbl.readyCount} Ready
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Alert Pills */}
                              {tbl.status === 'BILL_REQUESTED' && (
                                <div className={styles.tableAlertPill} style={{ background: '#f43f5e' }}>
                                  🔔 Bill Requested by Guest
                                </div>
                              )}
                              {tbl.pendingOtpCount > 0 && (
                                <div className={styles.tableAlertPill} style={{ background: '#2563eb' }}>
                                  📱 {tbl.pendingOtpCount} Pending OTP
                                </div>
                              )}
                              {tbl.status === 'CLEANING' && (
                                <div className={styles.tableAlertPill} style={{ background: '#dc2626' }}>
                                  🧹 Busboy Cleaning Required
                                </div>
                              )}
                              {tbl.isMerged && (
                                <div className={styles.tableAlertPill} style={{ background: '#8b5cf6' }}>
                                  🔗 Merged with: {tbl.mergedWith?.join(', ')}
                                </div>
                              )}
                            </div>

                            {/* Card Action Controls (Requirements 2, 8, 10, 11, 16) */}
                            <div className={styles.floorTableControls} onClick={e => e.stopPropagation()}>
                              {tbl.status === 'CLEANING' ? (
                                <button
                                  className={styles.btnStatusQuick}
                                  style={{ background: '#16a34a', color: '#ffffff', fontWeight: '800' }}
                                  onClick={() => handleFloorStatus(tbl.tableNumber, 'AVAILABLE')}
                                  title="Mark table sanitized and ready for seating"
                                >
                                  ✨ Sanitize &amp; Free
                                </button>
                              ) : tbl.status === 'AVAILABLE' ? (
                                <>
                                  <button
                                    className={styles.btnStatusQuick}
                                    style={{ background: '#2563eb', color: '#ffffff' }}
                                    onClick={() => handleFloorStatus(tbl.tableNumber, 'OCCUPIED')}
                                    title="Seat walk-in guests"
                                  >
                                    👥 Seat
                                  </button>
                                  <button
                                    className={styles.btnStatusQuick}
                                    onClick={() => handleOpenQrStandee(tbl)}
                                    title="Generate 4x6 QR Table Standee"
                                  >
                                    📱 QR
                                  </button>
                                </>
                              ) : tbl.status === 'OCCUPIED' ? (
                                <>
                                  <button
                                    className={styles.btnStatusQuick}
                                    onClick={() => {
                                      setFloorSelectedTable(tbl);
                                      setShowAddItemsTableModal(true);
                                    }}
                                    title="Punch supplementary items (generates new KOT)"
                                  >
                                    ➕ Add
                                  </button>
                                  <button
                                    className={styles.btnStatusQuick}
                                    style={{ color: '#f43f5e', borderColor: '#f43f5e' }}
                                    onClick={() => handleRequestBill(tbl.tableNumber)}
                                    title="Guest requested bill"
                                  >
                                    🔔 Bill
                                  </button>
                                  <button
                                    className={styles.btnStatusQuick}
                                    style={{ background: '#2563eb', color: '#ffffff' }}
                                    onClick={() => handleOpenTableInPos(tbl)}
                                    title="Open table in POS for full ordering and checkout"
                                  >
                                    ⚡ POS
                                  </button>
                                </>
                              ) : tbl.status === 'BILL_REQUESTED' ? (
                                <>
                                  <button
                                    className={styles.btnStatusQuick}
                                    style={{ background: '#0284c7', color: '#ffffff' }}
                                    onClick={() => handleGenerateBill(tbl.tableNumber, tbl.currentBillSubtotal)}
                                    title="Generate formal tax bill with SGR invoice number"
                                  >
                                    🧾 Bill
                                  </button>
                                  <button
                                    className={styles.btnStatusQuick}
                                    style={{ background: '#2563eb', color: '#ffffff' }}
                                    onClick={() => handleOpenTableInPos(tbl)}
                                    title="Open table in POS"
                                  >
                                    ⚡ POS
                                  </button>
                                </>
                              ) : (tbl.status === 'BILL_GENERATED' || tbl.status === 'PAYMENT_PENDING') ? (
                                <>
                                  <button
                                    className={styles.btnStatusQuick}
                                    style={{ background: '#16a34a', color: '#ffffff' }}
                                    onClick={() => setFloorSelectedTable(tbl)}
                                    title="Collect payment and clear table"
                                  >
                                    💳 Settle
                                  </button>
                                  <button
                                    className={styles.btnStatusQuick}
                                    onClick={() => handleOpenTableInPos(tbl)}
                                    title="Open table in POS"
                                  >
                                    ⚡ POS
                                  </button>
                                </>
                              ) : tbl.status === 'RESERVED' ? (
                                <>
                                  <button
                                    className={styles.btnStatusQuick}
                                    style={{ background: '#8b5cf6', color: '#ffffff' }}
                                    onClick={() => handleFloorStatus(tbl.tableNumber, 'OCCUPIED')}
                                    title="Seat reserved party"
                                  >
                                    👥 Seat
                                  </button>
                                  <button
                                    className={styles.btnStatusQuick}
                                    onClick={() => handleFloorStatus(tbl.tableNumber, 'AVAILABLE')}
                                    title="Cancel reservation"
                                  >
                                    ✕ Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  className={styles.btnStatusQuick}
                                  onClick={() => handleFloorStatus(tbl.tableNumber, 'CLEANING')}
                                  title="Send busboy to clean table"
                                >
                                  🧹 Busboy
                                </button>
                              )}

                              {/* Details button opens right inspector drawer */}
                              <button
                                className={styles.btnStatusQuick}
                                onClick={() => setFloorSelectedTable(tbl)}
                                title="Inspect table orders and billing"
                              >
                                🔍
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ─── Slide-Over Table Inspector Drawer (Requirements 6, 7, 8, 9, 10, 11, 12, 17) ─── */}
            {floorSelectedTable && (
              <div className={styles.tableDrawerOverlay} onClick={() => setFloorSelectedTable(null)}>
                <div className={styles.tableDrawerBox} onClick={e => e.stopPropagation()}>
                  {/* Drawer Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                        Table #{floorSelectedTable.tableNumber}
                      </h2>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {floorSelectedTable.section?.replace('_', ' ')} • {floorSelectedTable.capacity} Guests • {floorSelectedTable.shape || 'SQUARE'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.posModalCloseBtn}
                      onClick={() => setFloorSelectedTable(null)}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Status & Waiter Quick Control */}
                  <div className={styles.drawerSectionCard}>
                    <div className={styles.drawerSectionTitle}>
                      <span>TABLE STATUS &amp; CAPTAIN</span>
                      <span className={styles.statusBadge} style={{ background: '#2563eb22', color: '#2563eb', border: '1px solid #2563eb' }}>
                        {floorSelectedTable.status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                          Update Status:
                        </label>
                        <select
                          value={floorSelectedTable.status}
                          onChange={e => handleFloorStatus(floorSelectedTable.tableNumber, e.target.value)}
                          className={styles.posSelectField}
                          style={{ width: '100%', height: '36px', fontSize: '0.78rem' }}
                        >
                          <option value="AVAILABLE">AVAILABLE</option>
                          <option value="OCCUPIED">OCCUPIED</option>
                          <option value="BILL_REQUESTED">BILL_REQUESTED</option>
                          <option value="BILL_GENERATED">BILL_GENERATED</option>
                          <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
                          <option value="PAID">PAID</option>
                          <option value="CLEANING">CLEANING</option>
                          <option value="RESERVED">RESERVED</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                          Assign Captain:
                        </label>
                        <select
                          value={floorSelectedTable.assignedWaiter || 'Unassigned'}
                          onChange={e => handleFloorAssignWaiter(floorSelectedTable.tableNumber, e.target.value)}
                          className={styles.posSelectField}
                          style={{ width: '100%', height: '36px', fontSize: '0.78rem' }}
                        >
                          {floorWaiters.map((w, idx) => {
                            const name = typeof w === 'object' ? (w.name || w.fullName || w.id) : w;
                            return <option key={name || idx} value={name}>{name}</option>;
                          })}
                        </select>
                      </div>
                    </div>

                    {floorSelectedTable.isMerged && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(139, 92, 246, 0.1)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                        <span style={{ color: '#8b5cf6', fontWeight: 700 }}>🔗 Merged with: {floorSelectedTable.mergedWith?.join(', ')}</span>
                        <button
                          type="button"
                          className={styles.btnStatusQuick}
                          style={{ maxWidth: '100px', height: '28px', fontSize: '0.72rem' }}
                          onClick={() => handleSplitTables(floorSelectedTable.tableNumber)}
                        >
                          ✂️ Split
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Active Dining Session Details (Requirement 6) */}
                  <div className={styles.drawerSectionCard}>
                    <div className={styles.drawerSectionTitle}>
                      <span>ACTIVE DINING SESSION</span>
                      {floorSelectedTable.activeSessionId ? (
                        <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 800 }}>
                          ACTIVE ({floorSelectedTable.diningDurationMinutes || 0}m)
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>NO ACTIVE SESSION</span>
                      )}
                    </div>

                    {floorSelectedTable.activeSessionId ? (
                      <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-secondary)' }}>
                        <div>Session ID: <code style={{ color: 'var(--text-primary)' }}>{floorSelectedTable.activeSessionId}</code></div>
                        <div>Guests: <strong style={{ color: 'var(--text-primary)' }}>{floorSelectedTable.guestNames || 'Dine-In Customer'}</strong></div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Table is currently empty. Seat guests or punch POS order to initiate dining session.
                      </div>
                    )}
                  </div>

                  {/* Multiple Customers & Order Breakdown (Requirements 7, 8) */}
                  <div className={styles.drawerSectionCard}>
                    <div className={styles.drawerSectionTitle}>
                      <span>DINE-IN GUEST ORDERS ({floorSelectedTable.guestOrders?.length || 0})</span>
                      <button
                        type="button"
                        className={styles.btnStatusQuick}
                        style={{ maxWidth: '110px', height: '28px', fontSize: '0.72rem', background: '#2563eb', color: '#ffffff' }}
                        onClick={() => setShowAddItemsTableModal(true)}
                      >
                        ➕ Add Items
                      </button>
                    </div>

                    {floorSelectedTable.guestOrders && floorSelectedTable.guestOrders.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {floorSelectedTable.guestOrders.map((ord, idx) => (
                          <div key={ord.orderId || idx} className={styles.guestOrderBlock}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
                              <div>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                                  👤 {ord.guestName || `Guest ${idx + 1}`}
                                </strong>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                                  ({ord.orderId})
                                </span>
                              </div>
                              <span className={styles.tableOrderMiniTag}>
                                {ord.kotNumber ? `KOT #${ord.kotNumber}` : 'Direct POS'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.76rem' }}>
                              {ord.items?.map((it, iIdx) => (
                                <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                  <span>
                                    {it.quantity}x {it.title} {it.variant ? `(${it.variant})` : ''}
                                  </span>
                                  <strong style={{ color: 'var(--text-primary)' }}>
                                    ₹{Number(it.price) * Number(it.quantity)}
                                  </strong>
                                </div>
                              ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.35rem', fontSize: '0.78rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Status: {ord.status || 'ORDERED'}</span>
                              <strong style={{ color: '#16a34a' }}>Subtotal: ₹{ord.subtotal}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                        No orders punched yet for this table.
                      </div>
                    )}
                  </div>

                  {/* Bill Management & Settlement (Requirements 11, 12) */}
                  <div className={styles.drawerSectionCard}>
                    <div className={styles.drawerSectionTitle}>
                      <span>BILL &amp; PAYMENT TRACKING</span>
                      {floorSelectedTable.billNumber && (
                        <span style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 800 }}>
                          #{floorSelectedTable.billNumber}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
                      <div className={styles.drawerSummaryRow}>
                        <span>Food Subtotal:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>₹{floorSelectedTable.currentBillSubtotal || 0}</strong>
                      </div>
                      <div className={styles.drawerSummaryRow}>
                        <span>GST (CGST 2.5% + SGST 2.5%):</span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          ₹{Math.round((floorSelectedTable.currentBillSubtotal || 0) * 0.05)}
                        </strong>
                      </div>
                      <div className={styles.drawerSummaryRow} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Net Payable:</span>
                        <strong style={{ fontSize: '1.05rem', color: '#16a34a' }}>
                          ₹{Math.round((floorSelectedTable.currentBillSubtotal || 0) * 1.05)}
                        </strong>
                      </div>
                    </div>

                    {/* Settle Payment Controls */}
                    {floorSelectedTable.currentBillSubtotal > 0 && (
                      <div style={{ marginTop: '0.5rem', background: 'var(--bg-card)', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                          QUICK SETTLE &amp; CLEAR TABLE
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                          <select
                            value={drawerPaymentMethod}
                            onChange={e => setDrawerPaymentMethod(e.target.value)}
                            className={styles.posSelectField}
                            style={{ height: '34px', fontSize: '0.75rem' }}
                          >
                            <option value="UPI">UPI / GPay / PhonePe</option>
                            <option value="CASH">Cash Counter</option>
                            <option value="CARD">Card Swipe (POS)</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Txn Ref / UTR #"
                            value={drawerTxnRef}
                            onChange={e => setDrawerTxnRef(e.target.value)}
                            className={styles.posDiscountInput}
                            style={{ height: '34px', fontSize: '0.75rem' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className={styles.btnFloorAction}
                            style={{ flex: 1, background: '#16a34a', color: '#ffffff', borderColor: '#16a34a', justifyContent: 'center' }}
                            onClick={() => {
                              const total = Math.round((floorSelectedTable.currentBillSubtotal || 0) * 1.05);
                              handleSettlePayment(
                                floorSelectedTable.tableNumber,
                                drawerPaymentMethod,
                                drawerTxnRef || `TXN-${Date.now().toString().slice(-6)}`,
                                total,
                                floorSelectedTable.guestNames?.split(',')[0] || 'Dine-In Guest'
                              );
                              setDrawerTxnRef('');
                            }}
                          >
                            💳 Settle ₹{Math.round((floorSelectedTable.currentBillSubtotal || 0) * 1.05)} &amp; Send to Cleaning
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Action Navigation Bar */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={styles.btnFloorAction}
                      style={{ flex: 1, background: '#2563eb', color: '#ffffff', borderColor: '#2563eb', justifyContent: 'center' }}
                      onClick={() => handleOpenTableInPos(floorSelectedTable)}
                    >
                      ⚡ Open POS Terminal
                    </button>
                    <button
                      type="button"
                      className={styles.btnFloorAction}
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => handleOpenQrStandee(floorSelectedTable)}
                    >
                      📱 4"x6" QR Standee
                    </button>
                  </div>

                  {/* Table Configuration & History Actions (Requirements 3, 17, 20) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                    <button
                      type="button"
                      className={styles.btnFloorAction}
                      onClick={() => setShowEditTableModal(floorSelectedTable)}
                      title="Edit table number, capacity, section"
                    >
                      ✏️ Edit Config
                    </button>

                    <button
                      type="button"
                      className={styles.btnFloorAction}
                      style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                      onClick={() => handleDeleteTable(floorSelectedTable.tableNumber)}
                      title="Requires Manager PIN"
                    >
                      🗑️ Delete Table
                    </button>
                  </div>

                  {/* Completed Session History Logs for this Table (Requirement 17) */}
                  <div className={styles.drawerSectionCard}>
                    <div className={styles.drawerSectionTitle}>
                      <span>SESSION &amp; BILL HISTORY (LAST 5 VISITS)</span>
                    </div>
                    {floorSessionLogs.filter(s => String(s.tableNumber) === String(floorSelectedTable.tableNumber)).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
                        {floorSessionLogs
                          .filter(s => String(s.tableNumber) === String(floorSelectedTable.tableNumber))
                          .slice(-5)
                          .reverse()
                          .map((log, lIdx) => (
                            <div key={log.id || lIdx} style={{ fontSize: '0.72rem', background: 'var(--bg-card)', padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                              <div>
                                <strong style={{ color: 'var(--text-primary)' }}>{log.billNumber || 'Bill Settled'}</strong>
                                <div style={{ color: 'var(--text-muted)' }}>{log.settledAt ? new Date(log.settledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'} • {log.paymentMethod}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <strong style={{ color: '#16a34a' }}>₹{log.amountPaid || log.totalAmount || 0}</strong>
                                <div style={{ color: 'var(--text-muted)' }}>{log.guestName}</div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.35rem' }}>
                        No previous settled sessions recorded for this table today.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 8: LIVE ORDER MANAGEMENT DASHBOARD (ALL REQUIREMENTS)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'orders' && (
          <div>
            {/* ─── 1. KPI Summary Cards Strip ─── */}
            <div className={styles.ordersSummaryGrid}>
              <div
                className={styles.orderKpiCard}
                onClick={() => setOrdersFilter('ALL')}
                style={{ cursor: 'pointer', borderLeft: '4px solid #3b82f6' }}
              >
                <div className={styles.orderKpiIcon} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                  📋
                </div>
                <div>
                  <div className={styles.orderKpiVal}>{ordersSummary.totalToday}</div>
                  <div className={styles.orderKpiLabel}>Total Orders Today</div>
                </div>
              </div>

              <div className={styles.orderKpiCard} style={{ borderLeft: '4px solid #10b981' }}>
                <div className={styles.orderKpiIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  ⚡
                </div>
                <div>
                  <div className={styles.orderKpiVal}>{ordersSummary.activeCount}</div>
                  <div className={styles.orderKpiLabel}>Active In Hall</div>
                </div>
              </div>

              <div
                className={styles.orderKpiCard}
                onClick={() => setOrdersFilter('PENDING')}
                style={{ cursor: 'pointer', borderLeft: '4px solid #f97316' }}
              >
                <div className={styles.orderKpiIcon} style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}>
                  🔑
                </div>
                <div>
                  <div className={styles.orderKpiVal} style={{ color: ordersSummary.otpPending > 0 ? '#f97316' : 'inherit' }}>
                    {ordersSummary.otpPending}
                  </div>
                  <div className={styles.orderKpiLabel}>OTP Pending Verification</div>
                </div>
              </div>

              <div
                className={styles.orderKpiCard}
                onClick={() => setOrdersFilter('PREPARING')}
                style={{ cursor: 'pointer', borderLeft: '4px solid #6366f1' }}
              >
                <div className={styles.orderKpiIcon} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                  🍳
                </div>
                <div>
                  <div className={styles.orderKpiVal}>{ordersSummary.kotSent + ordersSummary.preparing}</div>
                  <div className={styles.orderKpiLabel}>Cooking in Kitchen</div>
                </div>
              </div>

              <div
                className={styles.orderKpiCard}
                onClick={() => setOrdersFilter('READY')}
                style={{ cursor: 'pointer', borderLeft: '4px solid #10b981' }}
              >
                <div className={styles.orderKpiIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  🔔
                </div>
                <div>
                  <div className={styles.orderKpiVal} style={{ color: ordersSummary.readyToServe > 0 ? '#10b981' : 'inherit' }}>
                    {ordersSummary.readyToServe}
                  </div>
                  <div className={styles.orderKpiLabel}>Ready to Serve</div>
                </div>
              </div>

              <div className={styles.orderKpiCard} style={{ borderLeft: '4px solid #14b8a6' }}>
                <div className={styles.orderKpiIcon} style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6' }}>
                  🍽️
                </div>
                <div>
                  <div className={styles.orderKpiVal}>{ordersSummary.served}</div>
                  <div className={styles.orderKpiLabel}>Served on Table</div>
                </div>
              </div>

              <div className={styles.orderKpiCard} style={{ borderLeft: '4px solid #a855f7' }}>
                <div className={styles.orderKpiIcon} style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                  🧾
                </div>
                <div>
                  <div className={styles.orderKpiVal}>{ordersSummary.billed}</div>
                  <div className={styles.orderKpiLabel}>Bill Generated</div>
                </div>
              </div>

              <div
                className={styles.orderKpiCard}
                onClick={() => setOrdersFilter('COMPLETED')}
                style={{ cursor: 'pointer', borderLeft: '4px solid #059669' }}
              >
                <div className={styles.orderKpiIcon} style={{ background: 'rgba(5, 150, 105, 0.15)', color: '#059669' }}>
                  💰
                </div>
                <div>
                  <div className={styles.orderKpiVal}>{ordersSummary.paid}</div>
                  <div className={styles.orderKpiLabel}>Paid &amp; Settled</div>
                </div>
              </div>

              <div
                className={`${styles.orderKpiCard} ${ordersSummary.delayedCount > 0 ? styles.orderCardDelayed : ''}`}
                style={{ borderLeft: '4px solid #ef4444' }}
              >
                <div className={styles.orderKpiIcon} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                  ⚠️
                </div>
                <div>
                  <div className={styles.orderKpiVal} style={{ color: ordersSummary.delayedCount > 0 ? '#ef4444' : 'inherit' }}>
                    {ordersSummary.delayedCount}
                  </div>
                  <div className={styles.orderKpiLabel}>Delayed &gt; 15 mins</div>
                </div>
              </div>
            </div>

            {/* ─── 2. Controls & Filter Bar ─── */}
            <div className={styles.ordersToolbar}>
              <div className={styles.ordersFilterPills}>
                <button
                  type="button"
                  className={`${styles.orderFilterBtn} ${ordersFilter === 'ALL' ? styles.orderFilterBtnActive : ''}`}
                  onClick={() => setOrdersFilter('ALL')}
                >
                  All Orders <span className={styles.orderFilterBadge}>{ordersSummary.totalToday}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.orderFilterBtn} ${ordersFilter === 'QR' ? styles.orderFilterBtnActive : ''}`}
                  onClick={() => setOrdersFilter('QR')}
                >
                  📱 QR Orders <span className={styles.orderFilterBadge}>{ordersSummary.qrCount}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.orderFilterBtn} ${ordersFilter === 'POS' ? styles.orderFilterBtnActive : ''}`}
                  onClick={() => setOrdersFilter('POS')}
                >
                  💻 POS Orders <span className={styles.orderFilterBadge}>{ordersSummary.posCount}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.orderFilterBtn} ${ordersFilter === 'PENDING' ? styles.orderFilterBtnActive : ''}`}
                  onClick={() => setOrdersFilter('PENDING')}
                >
                  ⏳ Pending OTP <span className={styles.orderFilterBadge}>{ordersSummary.otpPending + ordersSummary.otpVerified}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.orderFilterBtn} ${ordersFilter === 'PREPARING' ? styles.orderFilterBtnActive : ''}`}
                  onClick={() => setOrdersFilter('PREPARING')}
                >
                  🍳 Preparing <span className={styles.orderFilterBadge}>{ordersSummary.kotSent + ordersSummary.preparing}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.orderFilterBtn} ${ordersFilter === 'READY' ? styles.orderFilterBtnActive : ''}`}
                  onClick={() => setOrdersFilter('READY')}
                >
                  🔔 Ready <span className={styles.orderFilterBadge}>{ordersSummary.readyToServe}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.orderFilterBtn} ${ordersFilter === 'COMPLETED' ? styles.orderFilterBtnActive : ''}`}
                  onClick={() => setOrdersFilter('COMPLETED')}
                >
                  ✅ Completed <span className={styles.orderFilterBadge}>{ordersSummary.served + ordersSummary.billed + ordersSummary.paid}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.orderFilterBtn} ${ordersFilter === 'CANCELLED' ? styles.orderFilterBtnActive : ''}`}
                  onClick={() => setOrdersFilter('CANCELLED')}
                >
                  ❌ Cancelled <span className={styles.orderFilterBadge}>{ordersSummary.cancelled}</span>
                </button>
              </div>

              {/* Search Box + Real-time Sync Indicator + Controls */}
              <div className={styles.ordersControlBar}>
                <input
                  type="text"
                  placeholder="🔍 Search Order ID, Table #, Name, Phone, Delicacy..."
                  className={styles.ordersSearchInput}
                  value={ordersSearch}
                  onChange={(e) => setOrdersSearch(e.target.value)}
                />
                {ordersSearch && (
                  <button
                    type="button"
                    onClick={() => setOrdersSearch('')}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 0.4rem' }}
                    title="Clear search"
                  >
                    ✖
                  </button>
                )}

                {/* View Mode Toggle: Cards / History Table */}
                <div style={{ display: 'inline-flex', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setOrdersViewMode('CARDS')}
                    style={{
                      padding: '0.35rem 0.65rem',
                      border: 'none',
                      background: ordersViewMode === 'CARDS' ? '#2563eb' : 'var(--bg-card-subtle)',
                      color: ordersViewMode === 'CARDS' ? '#fff' : 'var(--text-secondary)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🗂️ Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrdersViewMode('TABLE')}
                    style={{
                      padding: '0.35rem 0.65rem',
                      border: 'none',
                      borderLeft: '1px solid var(--border-subtle)',
                      background: ordersViewMode === 'TABLE' ? '#2563eb' : 'var(--bg-card-subtle)',
                      color: ordersViewMode === 'TABLE' ? '#fff' : 'var(--text-secondary)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    📑 Table
                  </button>
                </div>

                {/* Audio Sound Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setSoundAlerts(!soundAlerts);
                    if (!soundAlerts) playChime('notification');
                  }}
                  className={styles.orderFilterBtn}
                  style={{ color: soundAlerts ? '#10b981' : '#94a3b8' }}
                  title="Toggle Audio Chimes for New &amp; Ready Orders"
                >
                  {soundAlerts ? '🔊 Sound ON' : '🔇 Muted'}
                </button>

                {/* Real-time Indicator & Manual Refresh */}
                <button
                  type="button"
                  onClick={() => {
                    fetchOrders();
                    showNotice('Refreshed live orders');
                  }}
                  className={styles.orderFilterBtn}
                  style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                  title="Real-time SSE active (updates every 5s)"
                >
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', marginRight: '4px' }}></span>
                  {ordersLoading ? 'Syncing...' : 'Live 5s'}
                </button>
              </div>
            </div>

            {/* ─── 3. Orders Content (Cards or History Table) ─── */}
            {ordersList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-subtle)', margin: '1rem 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🍃</div>
                <h3 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>No orders found</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {ordersSearch ? `No orders matched search query "${ordersSearch}"` : `No orders currently match filter "${ordersFilter}"`}
                </p>
                <button
                  type="button"
                  className={styles.btnOrderAction}
                  style={{ background: '#2563eb', color: '#fff', padding: '0.4rem 1rem', marginTop: '0.5rem' }}
                  onClick={() => { setOrdersFilter('ALL'); setOrdersSearch(''); }}
                >
                  Reset Filters &amp; View All
                </button>
              </div>
            ) : ordersViewMode === 'CARDS' ? (
              <div className={styles.ordersGrid}>
                {ordersList.map(order => {
                  const isDelayed = order.isDelayed;
                  const statusClass =
                    order.canonicalStatus === 'OTP_PENDING' ? styles.statusOtpPending :
                    order.canonicalStatus === 'OTP_VERIFIED' ? styles.statusOtpVerified :
                    order.canonicalStatus === 'KOT_SENT' ? styles.statusKotSent :
                    order.canonicalStatus === 'PREPARING' ? styles.statusPreparing :
                    order.canonicalStatus === 'READY_TO_SERVE' ? styles.statusReady :
                    order.canonicalStatus === 'SERVED' ? styles.statusServed :
                    order.canonicalStatus === 'BILLED' ? styles.statusBilled :
                    order.canonicalStatus === 'PAID' ? styles.statusPaid :
                    styles.statusCancelled;

                  const orderTimeStr = order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';

                  return (
                    <div
                      key={order.id}
                      className={`${styles.orderCard} ${isDelayed ? styles.orderCardDelayed : ''}`}
                    >
                      {isDelayed && (
                        <div className={styles.orderDelayedBadge}>
                          ⚠️ DELAYED ({order.elapsedMinutes}m)
                        </div>
                      )}

                      {/* Card Content Top Block */}
                      <div>
                        {/* Top Row: Table badge + Source + Status pill */}
                        <div className={styles.orderTopRow}>
                          <div className={styles.orderTableBadge}>
                            🪑 Table {order.tableNumber}
                            <span className={`${styles.orderSourceTag} ${order.orderSource === 'QR' ? styles.orderSourceQr : styles.orderSourcePos}`}>
                              {order.orderSource === 'QR' ? '📱 QR Order' : '💻 POS Order'}
                            </span>
                          </div>
                          <span className={`${styles.orderStatusPill} ${statusClass}`}>
                            {order.canonicalStatus.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Meta Line: Order ID + Guest Name + Elapsed time */}
                        <div className={styles.orderMetaLine}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--text-muted)' }}>
                            #{order.orderId || order.id}
                          </span>
                          <span className={styles.orderElapsedTimer}>
                            ⏱️ {orderTimeStr} ({order.elapsedMinutes}m ago)
                          </span>
                        </div>

                        <div className={styles.orderGuestName}>
                          <span>👤 {order.customerName}</span>
                          {order.customerPhone && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                              ({order.customerPhone})
                            </span>
                          )}
                        </div>

                        {/* KOT & Kitchen Routing Line */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem', fontSize: '0.7rem' }}>
                          <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                            🎫 {order.kotNumber}
                          </span>
                          <span style={{ background: 'rgba(234, 88, 12, 0.15)', color: '#fb923c', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                            🍳 {order.primaryStation} Station
                          </span>
                          <span style={{ background: order.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)', color: order.priority === 'HIGH' ? '#f87171' : 'var(--text-secondary)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                            {order.priority === 'HIGH' ? '🔥 HIGH PRIORITY' : 'NORMAL'}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            Est: {order.prepTimeMinutes}m
                          </span>
                        </div>

                        {/* Items Box with Title, Quantity, Price */}
                        <div className={styles.orderItemsBox}>
                          {(order.items || []).map((it, idx) => (
                            <div key={idx} className={styles.orderItemRow}>
                              <div>
                                <span className={styles.orderItemQty}>{it.quantity || 1}x</span>
                                <strong style={{ color: 'var(--text-primary)' }}>{it.title}</strong>
                                {it.portion && (
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>
                                    ({it.portion})
                                  </span>
                                )}
                              </div>
                              <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                                ₹{(Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          {order.cookingNotes && (
                            <div style={{ marginTop: '0.3rem', fontSize: '0.68rem', color: '#fb923c', fontStyle: 'italic', background: 'rgba(251, 146, 60, 0.08)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                              📝 Note: {order.cookingNotes}
                            </div>
                          )}
                        </div>

                        {/* Subtotal & Financials Strip */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.2rem', borderTop: '1px dashed var(--border-subtle)', fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>
                            Items: {(order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0)} • GST: ₹{((order.cgst || 0) + (order.sgst || 0)).toFixed(2)}
                          </span>
                          <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--accent-gold, #f59e0b)' }}>
                            ₹{Number(order.totalAmount || 0).toFixed(2)}
                          </span>
                        </div>

                        {/* Bill / Payment Status pill */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                          <span>Bill Status:</span>
                          <span style={{ fontWeight: 800, color: order.canonicalStatus === 'PAID' ? '#10b981' : order.canonicalStatus === 'BILLED' ? '#c084fc' : '#94a3b8' }}>
                            {order.billNumber ? `🧾 ${order.billNumber} (${order.canonicalStatus === 'PAID' ? 'PAID ' + (order.paymentMode || 'UPI') : 'UNPAID'})` : 'UNBILLED'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div className={styles.orderCardActions}>
                        <button
                          type="button"
                          className={`${styles.btnOrderAction} ${styles.btnOrderGhost}`}
                          onClick={() => handleOpenOrderDetails(order)}
                          title="View full order details &amp; audit trail"
                        >
                          👁️ Details
                        </button>

                        {/* OTP Pending: Verify OTP button */}
                        {order.canonicalStatus === 'OTP_PENDING' && (
                          <button
                            type="button"
                            className={`${styles.btnOrderAction} ${styles.btnOrderPrimary}`}
                            onClick={() => handleOpenOtpModal(order)}
                            style={{ background: '#f97316' }}
                          >
                            🔑 Verify OTP
                          </button>
                        )}

                        {/* KOT Sent: Start Cooking */}
                        {order.canonicalStatus === 'KOT_SENT' && (
                          <button
                            type="button"
                            className={`${styles.btnOrderAction} ${styles.btnOrderPrimary}`}
                            onClick={() => handleUpdateOrderStatus(order.id, 'PREPARING')}
                          >
                            🍳 Cook
                          </button>
                        )}

                        {/* Preparing: Mark Ready to Serve */}
                        {order.canonicalStatus === 'PREPARING' && (
                          <button
                            type="button"
                            className={`${styles.btnOrderAction} ${styles.btnOrderSuccess}`}
                            onClick={() => handleUpdateOrderStatus(order.id, 'READY_TO_SERVE')}
                          >
                            🔔 Mark Ready
                          </button>
                        )}

                        {/* Ready to Serve: Mark Served */}
                        {order.canonicalStatus === 'READY_TO_SERVE' && (
                          <button
                            type="button"
                            className={`${styles.btnOrderAction} ${styles.btnOrderSuccess}`}
                            onClick={() => handleUpdateOrderStatus(order.id, 'SERVED')}
                          >
                            🍽️ Mark Served
                          </button>
                        )}

                        {/* Served or Ready: Generate Bill (Cashier / Admin / Captain) */}
                        {['READY_TO_SERVE', 'SERVED'].includes(order.canonicalStatus) && (
                          <button
                            type="button"
                            className={`${styles.btnOrderAction} ${styles.btnOrderWarning}`}
                            onClick={() => handleOpenBillModal(order)}
                          >
                            🧾 Bill
                          </button>
                        )}

                        {/* Billed: Settle Payment */}
                        {order.canonicalStatus === 'BILLED' && (
                          <button
                            type="button"
                            className={`${styles.btnOrderAction} ${styles.btnOrderSuccess}`}
                            onClick={() => handleOpenBillModal(order)}
                          >
                            💳 Settle
                          </button>
                        )}

                        {/* Edit Permitted Items (allowed before served/billed/paid/cancelled) */}
                        {!['SERVED', 'BILLED', 'PAID', 'CANCELLED'].includes(order.canonicalStatus) && (
                          <button
                            type="button"
                            className={`${styles.btnOrderAction} ${styles.btnOrderGhost}`}
                            onClick={() => handleOpenEditItems(order)}
                            title="Edit permitted items before served"
                          >
                            ✏️ Edit
                          </button>
                        )}

                        {/* Re-fire / Print KOT Slip */}
                        <button
                          type="button"
                          className={`${styles.btnOrderAction} ${styles.btnOrderGhost}`}
                          onClick={() => handlePrintKotSlip(order)}
                          title="Print Kitchen KOT Slip"
                        >
                          🖨️ KOT
                        </button>

                        {/* Cancel with reason (allowed if not completed/cancelled) */}
                        {!['SERVED', 'BILLED', 'PAID', 'CANCELLED'].includes(order.canonicalStatus) && (
                          <button
                            type="button"
                            className={`${styles.btnOrderAction} ${styles.btnOrderDanger}`}
                            onClick={() => handleOpenCancelModal(order)}
                            title="Cancel order with mandatory reason"
                          >
                            ❌ Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ─── Compact Table View for Order History & Auditing ─── */
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)', overflowX: 'auto', marginBottom: '2rem' }}>
                <table className={styles.menuTable} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-card-subtle)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Order ID</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Table</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Source</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Customer</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Placed At</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Items Summary</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Total</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Status</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Bill / Settle</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersList.map(ord => (
                      <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace', fontWeight: 800 }}>
                          #{ord.orderId || ord.id}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>
                          Table {ord.tableNumber}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <span className={`${styles.orderSourceTag} ${ord.orderSource === 'QR' ? styles.orderSourceQr : styles.orderSourcePos}`}>
                            {ord.orderSource}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <strong>{ord.customerName}</strong>
                          {ord.customerPhone && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ord.customerPhone}</div>}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          <div style={{ fontSize: '0.68rem' }}>({ord.elapsedMinutes}m ago)</div>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          {(ord.items || []).map(i => `${i.quantity || 1}x ${i.title}`).join(', ')}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: '#f59e0b' }}>
                          ₹{Number(ord.totalAmount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <span className={styles.orderStatusPill} style={{ fontSize: '0.65rem' }}>
                            {ord.canonicalStatus.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.72rem' }}>
                          {ord.billNumber ? (
                            <span style={{ color: ord.canonicalStatus === 'PAID' ? '#10b981' : '#c084fc', fontWeight: 700 }}>
                              {ord.billNumber} ({ord.canonicalStatus === 'PAID' ? ord.paymentMode || 'PAID' : 'UNPAID'})
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>UNBILLED</span>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                            <button
                              type="button"
                              className={`${styles.btnOrderAction} ${styles.btnOrderGhost}`}
                              onClick={() => handleOpenOrderDetails(ord)}
                              style={{ height: '26px', padding: '0 0.5rem', fontSize: '0.68rem' }}
                            >
                              👁️
                            </button>
                            {ord.canonicalStatus === 'OTP_PENDING' && (
                              <button
                                type="button"
                                className={`${styles.btnOrderAction} ${styles.btnOrderPrimary}`}
                                onClick={() => handleOpenOtpModal(ord)}
                                style={{ height: '26px', padding: '0 0.5rem', fontSize: '0.68rem', background: '#f97316' }}
                              >
                                🔑 OTP
                              </button>
                            )}
                            {['READY_TO_SERVE', 'SERVED'].includes(ord.canonicalStatus) && (
                              <button
                                type="button"
                                className={`${styles.btnOrderAction} ${styles.btnOrderWarning}`}
                                onClick={() => handleOpenBillModal(ord)}
                                style={{ height: '26px', padding: '0 0.5rem', fontSize: '0.68rem' }}
                              >
                                🧾 Bill
                              </button>
                            )}
                            {ord.canonicalStatus === 'BILLED' && (
                              <button
                                type="button"
                                className={`${styles.btnOrderAction} ${styles.btnOrderSuccess}`}
                                onClick={() => handleOpenBillModal(ord)}
                                style={{ height: '26px', padding: '0 0.5rem', fontSize: '0.68rem' }}
                              >
                                💳 Settle
                              </button>
                            )}
                            <button
                              type="button"
                              className={`${styles.btnOrderAction} ${styles.btnOrderGhost}`}
                              onClick={() => handlePrintKotSlip(ord)}
                              style={{ height: '26px', padding: '0 0.5rem', fontSize: '0.68rem' }}
                              title="Print KOT Slip"
                            >
                              🖨️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 7: ENTERPRISE MENU MANAGEMENT SUITE (18 REQUIREMENTS)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'menu' && (
          <div>
            {/* ─── 1. Dashboard Summary Cards (Requirement 1) ─── */}
            <div className={styles.menuSummaryStrip}>
              <div className={styles.menuStatCard} style={{ borderLeft: '4px solid #3b82f6' }}>
                <div className={styles.menuStatIcon} style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                  🍽️
                </div>
                <div>
                  <div className={styles.menuStatVal}>{menuSummary.totalItems}</div>
                  <div className={styles.menuStatLabel}>Total Delicacies ({menuSummary.totalCategories} Categories)</div>
                </div>
              </div>

              <div className={styles.menuStatCard} style={{ borderLeft: '4px solid #10b981' }}>
                <div className={styles.menuStatIcon} style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                  🟢
                </div>
                <div>
                  <div className={styles.menuStatVal} style={{ color: '#10b981' }}>{menuSummary.availableCount}</div>
                  <div className={styles.menuStatLabel}>Available in Kitchen</div>
                </div>
              </div>

              <div className={styles.menuStatCard} style={{ borderLeft: '4px solid #ef4444' }}>
                <div className={styles.menuStatIcon} style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                  🔴
                </div>
                <div>
                  <div className={styles.menuStatVal} style={{ color: '#ef4444' }}>{menuSummary.soldOutCount}</div>
                  <div className={styles.menuStatLabel}>Sold Out / 86'd</div>
                </div>
              </div>

              <div className={styles.menuStatCard} style={{ borderLeft: '4px solid #8b5cf6' }}>
                <div className={styles.menuStatIcon} style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
                  ⭐
                </div>
                <div>
                  <div className={styles.menuStatVal} style={{ color: '#a78bfa' }}>
                    {menuSummary.featuredCount} / {menuSummary.bestsellerCount}
                  </div>
                  <div className={styles.menuStatLabel}>Featured / Bestsellers</div>
                </div>
              </div>

              <div className={styles.menuStatCard} style={{ borderLeft: '4px solid #f43f5e' }}>
                <div className={styles.menuStatIcon} style={{ background: 'rgba(244, 63, 94, 0.12)', color: '#f43f5e' }}>
                  🏷️
                </div>
                <div>
                  <div className={styles.menuStatVal} style={{ color: '#fb7185' }}>{menuSummary.activeOffersCount}</div>
                  <div className={styles.menuStatLabel}>Active Seasonal Offers</div>
                </div>
              </div>

              <div className={styles.menuStatCard} style={{ borderLeft: '4px solid #06b6d4' }}>
                <div className={styles.menuStatIcon} style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4' }}>
                  📦
                </div>
                <div>
                  <div className={styles.menuStatVal} style={{ color: '#38bdf8' }}>{menuSummary.recipeLinkedCount}</div>
                  <div className={styles.menuStatLabel}>Recipe BOM Linked</div>
                </div>
              </div>
            </div>

            {/* ─── 1.5 Meal Timing Schedules & Availability Automation Panel ─── */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '1rem',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.35rem' }}>🕒</span>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Meal Timing Schedules &amp; Auto-Availability Controls
                    </h3>
                    <span style={{ fontSize: '0.75rem', background: '#e2a829', color: '#051B41', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 800 }}>
                      உணவு நேர அட்டவணை
                    </span>
                  </div>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Delicacies automatically appear on customer menu during scheduled IST hours. Use admin controls below to manually enable/disable or override availability anytime.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={fetchMenu}
                    disabled={menuLoading}
                    className={styles.btnNavAlt}
                    style={{ height: '32px', fontSize: '0.75rem' }}
                  >
                    🔄 Refresh Status
                  </button>
                </div>
              </div>

              {/* 4 Scheduled Meal Section Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
                {(mealSections.length > 0 ? mealSections : [
                  { id: 'BREAKFAST', name: 'Breakfast', tamilName: 'காலை உணவு', icon: '🌅', startTime: '07:00', endTime: '11:30', timeLabel: '7:00 AM – 11:30 AM', isEnabled: true, overrideStatus: 'AUTO' },
                  { id: 'LUNCH', name: 'Lunch', tamilName: 'மதிய உணவு', icon: '☀️', startTime: '11:30', endTime: '15:00', timeLabel: '11:30 AM – 3:00 PM', isEnabled: true, overrideStatus: 'AUTO' },
                  { id: 'EVENING_SNACKS', name: 'Evening Snacks', tamilName: 'செட்டிநாடு பலகாரம்', icon: '☕', startTime: '16:00', endTime: '18:00', timeLabel: '4:00 PM – 6:00 PM', isEnabled: true, overrideStatus: 'AUTO' },
                  { id: 'DINNER', name: 'Dinner', tamilName: 'இரவு உணவு', icon: '🌙', startTime: '18:00', endTime: '22:30', timeLabel: '6:00 PM – 10:30 PM', isEnabled: true, overrideStatus: 'AUTO' },
                ]).map(sec => {
                  const secId = String(sec.id).toUpperCase();
                  const isSaving = savingMealSectionId === sec.id;
                  const count = menuItems.filter(d => String(d.mealSection || '').toUpperCase() === secId).length;
                  const isEnabled = sec.isEnabled !== false;
                  const override = sec.overrideStatus || 'AUTO';
                  const isActiveNow = sec.isActive;

                  // Border & background accent according to state
                  let statusBadgeBg = '#f59e0b';
                  let statusBadgeText = '#ffffff';
                  let statusLabel = `⏰ Scheduled (${sec.startTime} - ${sec.endTime})`;
                  let cardBorder = 'rgba(245, 158, 11, 0.3)';

                  if (!isEnabled) {
                    statusBadgeBg = '#64748b';
                    statusLabel = '⚪ Section Disabled';
                    cardBorder = 'rgba(100, 116, 139, 0.3)';
                  } else if (override === 'FORCE_ACTIVE') {
                    statusBadgeBg = '#2563eb';
                    statusLabel = '🟢 Force Active (Override)';
                    cardBorder = 'rgba(37, 99, 235, 0.5)';
                  } else if (override === 'FORCE_INACTIVE') {
                    statusBadgeBg = '#ef4444';
                    statusLabel = '🔴 Force Closed (Override)';
                    cardBorder = 'rgba(239, 68, 68, 0.5)';
                  } else if (isActiveNow) {
                    statusBadgeBg = '#10b981';
                    statusLabel = '🟢 Live Now (By Schedule)';
                    cardBorder = 'rgba(16, 185, 129, 0.5)';
                  }

                  return (
                    <div
                      key={sec.id}
                      style={{
                        background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.03))',
                        border: `1.5px solid ${cardBorder}`,
                        borderRadius: '12px',
                        padding: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                        position: 'relative',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Section Card Top */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '1.25rem' }}>{sec.icon}</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              {sec.name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#e2a829', fontWeight: 600 }}>
                              {sec.tamilName}
                            </div>
                          </div>
                        </div>

                        {/* Master On/Off Switch */}
                        <button
                          type="button"
                          onClick={() => handleUpdateMealSection(sec.id, { isEnabled: !isEnabled })}
                          disabled={isSaving}
                          title={isEnabled ? 'Click to Disable this Section' : 'Click to Enable this Section'}
                          style={{
                            border: 'none',
                            background: isEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isEnabled ? '#10b981' : '#ef4444',
                            fontWeight: 800,
                            fontSize: '0.7rem',
                            padding: '0.25rem 0.55rem',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isEnabled ? '#10b981' : '#ef4444' }} />
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>

                      {/* Live Status Pill */}
                      <div style={{
                        background: statusBadgeBg,
                        color: statusBadgeText,
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        textAlign: 'center',
                        letterSpacing: '0.02em',
                      }}>
                        {statusLabel}
                      </div>

                      {/* Timings Schedule Editor */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                            START TIME (IST)
                          </label>
                          <input
                            type="time"
                            value={sec.startTime}
                            disabled={isSaving}
                            onChange={(e) => handleUpdateMealSection(sec.id, { startTime: e.target.value })}
                            className={styles.posDiscountInput}
                            style={{ width: '100%', height: '30px', fontSize: '0.78rem', padding: '0 0.4rem', textAlign: 'center' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                            END TIME (IST)
                          </label>
                          <input
                            type="time"
                            value={sec.endTime}
                            disabled={isSaving}
                            onChange={(e) => handleUpdateMealSection(sec.id, { endTime: e.target.value })}
                            className={styles.posDiscountInput}
                            style={{ width: '100%', height: '30px', fontSize: '0.78rem', padding: '0 0.4rem', textAlign: 'center' }}
                          />
                        </div>
                      </div>

                      {/* Override Availability Select */}
                      <div>
                        <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                          AVAILABILITY OVERRIDE CONTROL
                        </label>
                        <select
                          value={override}
                          disabled={isSaving}
                          onChange={(e) => handleUpdateMealSection(sec.id, { overrideStatus: e.target.value })}
                          className={styles.posSelectField}
                          style={{ width: '100%', height: '30px', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          <option value="AUTO">🕒 Automatic (Follows Schedule)</option>
                          <option value="FORCE_ACTIVE">🟢 Force Active (Always Show Now)</option>
                          <option value="FORCE_INACTIVE">🔴 Force Inactive (Hide / Closed)</option>
                        </select>
                      </div>

                      {/* Card Footer: Items Count & Quick Filter Button */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.4rem', borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                          🍽️ {count} Delicacies
                        </span>
                        <button
                          type="button"
                          onClick={() => setMenuMealSectionFilter(secId)}
                          style={{
                            background: menuMealSectionFilter === secId ? '#2563eb' : 'transparent',
                            color: menuMealSectionFilter === secId ? '#ffffff' : '#38bdf8',
                            border: '1px solid #38bdf8',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            cursor: 'pointer',
                          }}
                        >
                          {menuMealSectionFilter === secId ? '✓ Filtered' : 'Filter Menu'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── 2. Controls, Search, Filter & Action Toolbar (Requirements 3, 6, 11, 16) ─── */}
            <div className={styles.menuToolbar}>
              <div className={styles.menuToolbarRow1}>
                {/* Search Box (EN / Tamil / Description) */}
                <div className={styles.menuSearchBox}>
                  <span style={{ fontSize: '1rem', marginRight: '0.4rem', color: 'var(--text-muted)' }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search delicacy in English, தமிழ் பெயர், or ingredients..."
                    value={menuSearchQuery}
                    onChange={e => setMenuSearchQuery(e.target.value)}
                    className={styles.menuSearchInput}
                  />
                  {menuSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMenuSearchQuery('')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className={styles.menuFilterGroup}>
                  {/* Availability Filter */}
                  <select
                    value={menuAvailabilityFilter}
                    onChange={e => setMenuAvailabilityFilter(e.target.value)}
                    className={styles.menuSelect}
                    title="Filter by Availability"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="AVAILABLE">🟢 Available Only</option>
                    <option value="SOLD_OUT">🔴 Sold Out (86'd)</option>
                    <option value="UNAVAILABLE">⚪ Temporarily Inactive</option>
                  </select>

                  {/* Kitchen Station Filter */}
                  <select
                    value={menuStationFilter}
                    onChange={e => setMenuStationFilter(e.target.value)}
                    className={styles.menuSelect}
                    title="Filter by Kitchen Station"
                  >
                    <option value="ALL">All Kitchen Stations</option>
                    <option value="TIFFIN">🥞 Tiffin (Idli/Vadai)</option>
                    <option value="DOSA">🪙 Dosa Station</option>
                    <option value="MEALS">🍱 Meals &amp; Gravy</option>
                    <option value="BEVERAGES">☕ Beverages &amp; Coffee</option>
                    <option value="SNACKS">🥟 Snacks Counter</option>
                  </select>

                  {/* Dietary Filter */}
                  <select
                    value={menuDietaryFilter}
                    onChange={e => setMenuDietaryFilter(e.target.value)}
                    className={styles.menuSelect}
                    title="Filter by Dietary Classification"
                  >
                    <option value="ALL">All Dietary Tags</option>
                    <option value="JAIN">🌱 Jain Friendly (No Onion/Garlic)</option>
                    <option value="VEGAN">🌿 Pure Vegan (No Dairy/Ghee)</option>
                    <option value="GLUTEN_FREE">🌾 Gluten Free</option>
                  </select>

                  {/* Sort Order */}
                  <select
                    value={menuSortBy}
                    onChange={e => setMenuSortBy(e.target.value)}
                    className={styles.menuSelect}
                    title="Sort Delicacies"
                  >
                    <option value="displayOrder">🔢 Display Sequence</option>
                    <option value="name">🔤 Name (A - Z)</option>
                    <option value="priceAsc">💰 Price: Low to High</option>
                    <option value="priceDesc">💎 Price: High to Low</option>
                    <option value="popular">👑 Popularity / Bestsellers</option>
                    <option value="prepTime">⏱️ Prep Time</option>
                  </select>

                  {/* View Mode Toggle (Cards vs Table) */}
                  <div className={styles.menuViewToggle}>
                    <button
                      type="button"
                      className={`${styles.menuViewBtn} ${menuViewMode === 'cards' ? styles.menuViewBtnActive : ''}`}
                      onClick={() => setMenuViewMode('cards')}
                      title="Rich Visual Cards Layout"
                    >
                      🗂️ Cards
                    </button>
                    <button
                      type="button"
                      className={`${styles.menuViewBtn} ${menuViewMode === 'table' ? styles.menuViewBtnActive : ''}`}
                      onClick={() => setMenuViewMode('table')}
                      title="Compact POS Table Sheet Layout"
                    >
                      📋 Table
                    </button>
                  </div>
                </div>
              </div>

              {/* Meal Section Filter Row */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', margin: '0.6rem 0 0.4rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.25rem' }}>
                  Meal Schedule:
                </span>
                <button
                  type="button"
                  className={`${styles.menuCatPill} ${menuMealSectionFilter === 'ALL' ? styles.menuCatPillActive : ''}`}
                  onClick={() => setMenuMealSectionFilter('ALL')}
                >
                  🍽️ All Sections
                  <span className={styles.menuCatPillCount}>
                    {menuItems.filter(d => !showArchivedDishes ? d.status !== 'ARCHIVED' : d.status === 'ARCHIVED').length}
                  </span>
                </button>
                {[
                  { id: 'BREAKFAST', icon: '🌅', name: 'Breakfast', ta: 'காலை உணவு' },
                  { id: 'LUNCH', icon: '☀️', name: 'Lunch', ta: 'மதிய உணவு' },
                  { id: 'EVENING_SNACKS', icon: '☕', name: 'Snacks', ta: 'செட்டிநாடு பலகாரம்' },
                  { id: 'DINNER', icon: '🌙', name: 'Dinner', ta: 'இரவு உணவு' },
                ].map(sec => {
                  const secState = mealSections.find(s => String(s.id).toUpperCase() === sec.id);
                  const count = menuItems.filter(d => (!showArchivedDishes ? d.status !== 'ARCHIVED' : d.status === 'ARCHIVED') && String(d.mealSection || '').toUpperCase() === sec.id).length;
                  const isActiveNow = secState?.isActive;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      className={`${styles.menuCatPill} ${menuMealSectionFilter === sec.id ? styles.menuCatPillActive : ''}`}
                      onClick={() => setMenuMealSectionFilter(sec.id)}
                      style={{
                        borderColor: isActiveNow ? '#10b981' : undefined,
                      }}
                    >
                      <span>{sec.icon}</span>
                      <span>{sec.name}</span>
                      <span style={{ opacity: 0.75, fontSize: '0.68rem' }}>({sec.ta})</span>
                      {isActiveNow && <span style={{ background: '#10b981', color: '#fff', borderRadius: '4px', fontSize: '0.6rem', padding: '0.1rem 0.3rem', fontWeight: 800 }}>LIVE</span>}
                      <span className={styles.menuCatPillCount}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Category Pills Scroller (Requirement 6) */}
              <div className={styles.menuCatPills}>
                <button
                  type="button"
                  className={`${styles.menuCatPill} ${menuSelectedCategory === 'ALL' ? styles.menuCatPillActive : ''}`}
                  onClick={() => setMenuSelectedCategory('ALL')}
                >
                  🍽️ All Delicacies
                  <span className={styles.menuCatPillCount}>
                    {menuItems.filter(d => !showArchivedDishes ? d.status !== 'ARCHIVED' : d.status === 'ARCHIVED').length}
                  </span>
                </button>
                {categoriesList.map(cat => {
                  const count = menuItems.filter(d => (!showArchivedDishes ? d.status !== 'ARCHIVED' : d.status === 'ARCHIVED') && (d.category || '').toLowerCase() === cat.name.toLowerCase()).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`${styles.menuCatPill} ${menuSelectedCategory.toLowerCase() === cat.name.toLowerCase() ? styles.menuCatPillActive : ''}`}
                      onClick={() => setMenuSelectedCategory(cat.name)}
                    >
                      <span>{cat.icon || '🍽️'}</span>
                      <span>{cat.name}</span>
                      {cat.tamilName && <span style={{ opacity: 0.75, fontSize: '0.7rem' }}>({cat.tamilName})</span>}
                      <span className={styles.menuCatPillCount}>{count}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  className={`${styles.menuCatPill} ${showArchivedDishes ? styles.menuCatPillActive : ''}`}
                  onClick={() => setShowArchivedDishes(!showArchivedDishes)}
                  style={{ marginLeft: 'auto', background: showArchivedDishes ? '#dc2626' : 'transparent', color: showArchivedDishes ? '#fff' : 'var(--text-muted)' }}
                >
                  📦 {showArchivedDishes ? 'Showing Archived' : 'Show Archived'}
                  <span className={styles.menuCatPillCount}>{menuSummary.totalArchived || 0}</span>
                </button>
              </div>

              {/* Action Buttons Toolbar Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.35rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Showing <strong>{filteredDishes.length}</strong> of {menuItems.length} delicacies
                  {selectedDishIds.length > 0 && (
                    <span style={{ marginLeft: '0.75rem', color: '#60a5fa', fontWeight: 800 }}>
                      ✓ {selectedDishIds.length} Selected
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {/* Bulk Select All / Clear */}
                  <button
                    type="button"
                    className={styles.btnStatusQuick}
                    style={{ fontSize: '0.75rem', height: '32px' }}
                    onClick={() => {
                      if (selectedDishIds.length === filteredDishes.length) {
                        setSelectedDishIds([]);
                      } else {
                        setSelectedDishIds(filteredDishes.map(d => d.id));
                      }
                    }}
                  >
                    {selectedDishIds.length === filteredDishes.length && filteredDishes.length > 0 ? 'Deselect All' : 'Select All Filtered'}
                  </button>

                  {/* Add Delicacy */}
                  <button
                    type="button"
                    className={styles.btnPunchKot}
                    style={{ background: '#2563eb', height: '32px', fontSize: '0.78rem', padding: '0 0.85rem' }}
                    onClick={() => handleOpenDishModal('ADD')}
                  >
                    ➕ Add Delicacy
                  </button>

                  {/* Manage Categories */}
                  <button
                    type="button"
                    className={styles.btnNavAlt}
                    style={{ height: '32px', fontSize: '0.78rem' }}
                    onClick={() => setShowCategoryModal(true)}
                  >
                    🏷️ Categories ({categoriesList.length})
                  </button>

                  {/* Bulk Operations */}
                  <button
                    type="button"
                    className={styles.btnNavAlt}
                    style={{ height: '32px', fontSize: '0.78rem' }}
                    onClick={() => {
                      if (selectedDishIds.length === 0) {
                        showNotice('Select one or more delicacies first using checkboxes', true);
                        return;
                      }
                      setShowBulkActionModal(true);
                    }}
                  >
                    ⚡ Bulk Actions ({selectedDishIds.length})
                  </button>

                  {/* Audit Trail */}
                  <button
                    type="button"
                    className={styles.btnNavAlt}
                    style={{ height: '32px', fontSize: '0.78rem' }}
                    onClick={() => setShowAuditLogsModal(true)}
                  >
                    📜 Audit History
                  </button>

                  {/* Import / Export */}
                  <button
                    type="button"
                    className={styles.btnNavAlt}
                    style={{ height: '32px', fontSize: '0.78rem' }}
                    onClick={() => setShowImportExportModal(true)}
                  >
                    📥 Import / 📤 Export
                  </button>
                </div>
              </div>
            </div>

            {/* ─── 3. Menu Presentation: Cards View vs Table View ─── */}
            {menuViewMode === 'cards' ? (
              <div className={styles.menuCardsGrid}>
                {filteredDishes.map(dish => {
                  const isSoldOut = dish.status === 'SOLD_OUT' || dish.available === false;
                  const isArchived = dish.status === 'ARCHIVED';
                  const isSelected = selectedDishIds.includes(dish.id);
                  const hasDiscount = dish.discount?.active && dish.discount?.value > 0;

                  return (
                    <div
                      key={dish.id}
                      className={`${styles.menuCard} ${isSoldOut ? styles.menuCardSoldOut : ''}`}
                      style={{
                        borderColor: isSelected ? '#3b82f6' : (isSoldOut ? 'rgba(239, 68, 68, 0.4)' : undefined),
                        boxShadow: isSelected ? '0 0 0 2px #3b82f6' : undefined,
                      }}
                    >
                      {/* Photo Header */}
                      <div className={styles.menuCardImgWrap}>
                        {(() => {
                          const localImage = typeof window !== 'undefined' ? (localStorage.getItem('sgr_dish_img_' + dish.id) || localStorage.getItem('sgr_dish_img_' + dish.title)) : null;
                          const effectiveImg = dish.image || localImage;
                          return (
                            <img
                              src={effectiveImg || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231f2937'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='28'%3E🍲%3C/text%3E%3C/svg%3E"}
                              alt={dish.title}
                              className={styles.menuCardImg}
                              loading="eager"
                              decoding="async"
                              onError={(e) => {
                                const fallbackImg = typeof window !== 'undefined' ? (localStorage.getItem('sgr_dish_img_' + dish.id) || localStorage.getItem('sgr_dish_img_' + dish.title)) : null;
                                if (fallbackImg && e.currentTarget.src !== fallbackImg) {
                                  e.currentTarget.src = fallbackImg;
                                  return;
                                }
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231f2937'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='28'%3E🍲%3C/text%3E%3C/svg%3E";
                              }}
                            />
                          );
                        })()}
                        {/* Overlay Badges */}
                        <div className={styles.menuCardOverlayBadge}>
                          <span className={styles.badgeVeg} title="100% Pure Vegetarian Karaikudi Heritage">
                            <span className={styles.badgeVegDot} />
                          </span>

                          {dish.isBestseller && (
                            <span style={{ background: '#7c3aed', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                              👑 Bestseller
                            </span>
                          )}

                          {dish.isFeatured && (
                            <span style={{ background: '#0284c7', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                              ⭐ Featured
                            </span>
                          )}

                          {hasDiscount && (
                            <span className={`${styles.badgeDietary} ${styles.badgePromo}`}>
                              🏷️ {dish.discount.value}{dish.discount.type === 'PERCENT' ? '%' : '₹'} OFF
                            </span>
                          )}
                        </div>

                        {/* Station Badge */}
                        <div className={styles.menuCardStationBadge}>
                          {dish.station || 'TIFFIN'}
                        </div>

                        {/* Selection Checkbox (Top Right) */}
                        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 2 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDishIds(prev => [...prev, dish.id]);
                              } else {
                                setSelectedDishIds(prev => prev.filter(id => id !== dish.id));
                              }
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                          />
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className={styles.menuCardBody}>
                        <div className={styles.menuCardTitleRow}>
                          <div>
                            <div className={styles.menuCardTitle}>{dish.title}</div>
                            {dish.tamilTitle && (
                              <div className={styles.menuCardTamilTitle}>{dish.tamilTitle}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.68rem', background: '#051B41', color: '#e2a829', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>
                              {dish.mealSection === 'BREAKFAST' ? '🌅 Breakfast' : dish.mealSection === 'LUNCH' ? '☀️ Lunch' : dish.mealSection === 'EVENING_SNACKS' ? '☕ Snacks' : dish.mealSection === 'DINNER' ? '🌙 Dinner' : dish.mealSection}
                            </span>
                            <span style={{ fontSize: '0.72rem', background: 'var(--bg-card-subtle)', padding: '0.15rem 0.45rem', borderRadius: '4px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                              {dish.category}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <div className={styles.menuCardDesc}>
                          {dish.description || 'Authentic traditional Chettinad delicacy cooked fresh on order.'}
                        </div>

                        {/* Dietary & Spice chips */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', margin: '0.2rem 0' }}>
                          {dish.dietary?.spiceLevel === 3 && <span style={{ fontSize: '0.7rem' }} title="Karaikudi Fiery Hot">🌶️🌶️🌶️</span>}
                          {dish.dietary?.spiceLevel === 2 && <span style={{ fontSize: '0.7rem' }} title="Medium Spicy">🌶️🌶️</span>}
                          {dish.dietary?.spiceLevel === 1 && <span style={{ fontSize: '0.7rem' }} title="Mild Delicate">🌱 Mild</span>}
                          {dish.dietary?.isJain && <span className={`${styles.badgeDietary} ${styles.badgeJain}`}>Jain Friendly</span>}
                          {dish.dietary?.isVegan && <span className={`${styles.badgeDietary} ${styles.badgeVegan}`}>Pure Vegan</span>}
                          {dish.dietary?.isGlutenFree && <span className={`${styles.badgeDietary} ${styles.badgeGf}`}>Gluten-Free</span>}
                          {dish.recipeId ? (
                            <span style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 700 }}>📦 BOM Linked</span>
                          ) : (
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>⚠️ No BOM</span>
                          )}
                        </div>

                        {/* Price & Prep Time Row */}
                        <div className={styles.menuCardMetaRow}>
                          <div className={styles.menuCardPriceBox}>
                            <span className={styles.menuCardPrice} style={{ color: dish.price > 0 ? undefined : '#a1a1aa', fontSize: dish.price > 0 ? undefined : '0.82rem' }}>
                              {dish.price > 0 ? (hasDiscount ? `₹${dish.discount.discountedPrice}` : `₹${dish.price}`) : 'Price Pending'}
                            </span>
                            {hasDiscount && dish.price > 0 && (
                              <span className={styles.menuCardPriceOrig}>₹{dish.price}</span>
                            )}
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              • {dish.portionSize || 'Standard'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <span>⏱️</span>
                            <span>{dish.prepTime || 10}m</span>
                          </div>
                        </div>

                        {/* 1-Touch Availability Toggle Row */}
                        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleDishAvailability(dish.id, 'SOLD_OUT')}
                            className={styles.btnStatusQuick}
                            style={{
                              flex: 1,
                              height: '28px',
                              fontSize: '0.72rem',
                              background: !isSoldOut ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                              borderColor: !isSoldOut ? '#10b981' : 'var(--border-subtle)',
                              color: !isSoldOut ? '#34d399' : 'var(--text-muted)',
                              fontWeight: 800,
                            }}
                            title="Set In Stock (Available for orders)"
                          >
                            🟢 In Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleDishAvailability(dish.id, 'AVAILABLE')}
                            className={styles.btnStatusQuick}
                            style={{
                              flex: 1,
                              height: '28px',
                              fontSize: '0.72rem',
                              background: isSoldOut ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                              borderColor: isSoldOut ? '#ef4444' : 'var(--border-subtle)',
                              color: isSoldOut ? '#f87171' : 'var(--text-muted)',
                              fontWeight: 800,
                            }}
                            title="Set Sold Out (86'd from kitchen)"
                          >
                            🔴 Sold Out
                          </button>
                        </div>

                        {/* Action Buttons Row */}
                        <div className={styles.menuCardActionsRow}>
                          <button
                            type="button"
                            className={styles.btnNavAlt}
                            style={{ flex: 1, height: '28px', fontSize: '0.72rem', padding: '0 0.4rem' }}
                            onClick={() => handleOpenDishModal('EDIT', dish)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className={styles.btnNavAlt}
                            style={{ height: '28px', fontSize: '0.72rem', padding: '0 0.45rem', color: dish.isFeatured ? '#38bdf8' : 'var(--text-muted)' }}
                            onClick={() => handleToggleDishFeatured(dish.id)}
                            title="Toggle Featured"
                          >
                            ⭐
                          </button>
                          <button
                            type="button"
                            className={styles.btnNavAlt}
                            style={{ height: '28px', fontSize: '0.72rem', padding: '0 0.45rem', color: dish.isBestseller ? '#a78bfa' : 'var(--text-muted)' }}
                            onClick={() => handleToggleDishBestseller(dish.id)}
                            title="Toggle Bestseller"
                          >
                            👑
                          </button>
                          <button
                            type="button"
                            className={styles.btnNavAlt}
                            style={{ height: '28px', fontSize: '0.72rem', padding: '0 0.45rem', color: isArchived ? '#34d399' : '#a1a1aa' }}
                            onClick={() => handleArchiveDish(dish.id, isArchived)}
                            title={isArchived ? 'Restore to Menu' : 'Archive Delicacy'}
                          >
                            {isArchived ? '📦 Restore' : '📦 Archive'}
                          </button>
                          <button
                            type="button"
                            className={styles.btnNavAlt}
                            style={{ height: '28px', fontSize: '0.72rem', padding: '0 0.45rem', color: '#ef4444' }}
                            onClick={() => handleDeleteDish(dish.id, dish.title)}
                            title="Permanently Delete Delicacy (Manager PIN)"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ─── Table View (Requirement 3) ─── */
              <div className={styles.menuTableWrap}>
                <table className={styles.menuTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedDishIds.length === filteredDishes.length && filteredDishes.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedDishIds(filteredDishes.map(d => d.id));
                            else setSelectedDishIds([]);
                          }}
                          style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                        />
                      </th>
                      <th style={{ width: '56px' }}>Photo</th>
                      <th>Delicacy &amp; Tamil Name</th>
                      <th>Category</th>
                      <th>Station</th>
                      <th>Price &amp; Offer</th>
                      <th>Portion &amp; Time</th>
                      <th>Dietary &amp; Spice</th>
                      <th>Recipe Stock</th>
                      <th>Kitchen Availability</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDishes.map(dish => {
                      const isSoldOut = dish.status === 'SOLD_OUT' || dish.available === false;
                      const isArchived = dish.status === 'ARCHIVED';
                      const isSelected = selectedDishIds.includes(dish.id);
                      const hasDiscount = dish.discount?.active && dish.discount?.value > 0;

                      return (
                        <tr
                          key={dish.id}
                          className={`${styles.menuTableRow} ${isSoldOut ? styles.menuTableRowSoldOut : ''}`}
                          style={{ background: isSelected ? 'rgba(37, 99, 235, 0.08)' : undefined }}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedDishIds(prev => [...prev, dish.id]);
                                else setSelectedDishIds(prev => prev.filter(id => id !== dish.id));
                              }}
                              style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                            />
                          </td>
                          <td>
                            {(() => {
                              const tblImg = dish.image || (typeof window !== 'undefined' ? (localStorage.getItem('sgr_dish_img_' + dish.id) || localStorage.getItem('sgr_dish_img_' + dish.title)) : null);
                              return (
                                <img
                                  src={tblImg || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%231f2937'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='18'%3E🍲%3C/text%3E%3C/svg%3E"}
                                  alt={dish.title}
                                  className={styles.menuImgThumb}
                                  loading="eager"
                                  decoding="async"
                                  onError={(e) => {
                                    const fallbackImg = typeof window !== 'undefined' ? (localStorage.getItem('sgr_dish_img_' + dish.id) || localStorage.getItem('sgr_dish_img_' + dish.title)) : null;
                                    if (fallbackImg && e.currentTarget.src !== fallbackImg) {
                                      e.currentTarget.src = fallbackImg;
                                      return;
                                    }
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%231f2937'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='18'%3E🍲%3C/text%3E%3C/svg%3E";
                                  }}
                                />
                              );
                            })()}
                          </td>
                          <td>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                              {dish.title}
                            </div>
                            {dish.tamilTitle && (
                              <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>
                                {dish.tamilTitle}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <span style={{ fontSize: '0.65rem', background: '#051B41', color: '#e2a829', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 800, width: 'fit-content' }}>
                                {dish.mealSection === 'BREAKFAST' ? '🌅 Breakfast' : dish.mealSection === 'LUNCH' ? '☀️ Lunch' : dish.mealSection === 'EVENING_SNACKS' ? '☕ Snacks' : dish.mealSection === 'DINNER' ? '🌙 Dinner' : dish.mealSection}
                              </span>
                              <span style={{ fontSize: '0.72rem', background: 'var(--bg-card-subtle)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700, width: 'fit-content' }}>
                                {dish.category}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 800 }}>
                              {dish.station || 'TIFFIN'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                              <span style={{ fontWeight: 900, fontSize: dish.price > 0 ? '0.95rem' : '0.8rem', color: dish.price > 0 ? undefined : '#a1a1aa' }}>
                                {dish.price > 0 ? (hasDiscount ? `₹${dish.discount.discountedPrice}` : `₹${dish.price}`) : 'Price Pending'}
                              </span>
                              {hasDiscount && dish.price > 0 && (
                                <span style={{ fontSize: '0.72rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                                  ₹{dish.price}
                                </span>
                              )}
                            </div>
                            {hasDiscount && (
                              <div style={{ fontSize: '0.65rem', color: '#fb7185', fontWeight: 800 }}>
                                {dish.discount.label || `${dish.discount.value}% OFF`}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                              {dish.portionSize || 'Standard'}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              ⏱️ {dish.prepTime || 10} mins
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span className={styles.badgeVeg} title="Pure Veg"><span className={styles.badgeVegDot} /></span>
                              {dish.dietary?.spiceLevel === 3 && <span title="Fiery">🌶️🌶️🌶️</span>}
                              {dish.dietary?.spiceLevel === 2 && <span title="Medium">🌶️🌶️</span>}
                              {dish.dietary?.spiceLevel === 1 && <span title="Mild">🌱</span>}
                              {dish.dietary?.isJain && <span className={`${styles.badgeDietary} ${styles.badgeJain}`}>Jain</span>}
                              {dish.dietary?.isVegan && <span className={`${styles.badgeDietary} ${styles.badgeVegan}`}>Vegan</span>}
                            </div>
                          </td>
                          <td>
                            {dish.recipeId ? (
                              <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700 }}>
                                ✓ Linked ({dish.recipeId})
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                — None
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleDishAvailability(dish.id, 'SOLD_OUT')}
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  fontSize: '0.7rem',
                                  borderRadius: '4px',
                                  border: '1px solid',
                                  cursor: 'pointer',
                                  background: !isSoldOut ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                  borderColor: !isSoldOut ? '#10b981' : 'var(--border-subtle)',
                                  color: !isSoldOut ? '#34d399' : 'var(--text-muted)',
                                  fontWeight: 800,
                                }}
                              >
                                🟢 In Stock
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleDishAvailability(dish.id, 'AVAILABLE')}
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  fontSize: '0.7rem',
                                  borderRadius: '4px',
                                  border: '1px solid',
                                  cursor: 'pointer',
                                  background: isSoldOut ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                  borderColor: isSoldOut ? '#ef4444' : 'var(--border-subtle)',
                                  color: isSoldOut ? '#f87171' : 'var(--text-muted)',
                                  fontWeight: 800,
                                }}
                              >
                                🔴 Sold Out
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                              <button
                                type="button"
                                className={styles.btnNavAlt}
                                style={{ height: '28px', fontSize: '0.72rem', padding: '0 0.5rem' }}
                                onClick={() => handleOpenDishModal('EDIT', dish)}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                className={styles.btnNavAlt}
                                style={{ height: '28px', fontSize: '0.72rem', padding: '0 0.4rem', color: dish.isFeatured ? '#38bdf8' : 'var(--text-muted)' }}
                                onClick={() => handleToggleDishFeatured(dish.id)}
                                title="Toggle Featured"
                              >
                                ⭐
                              </button>
                              <button
                                type="button"
                                className={styles.btnNavAlt}
                                style={{ height: '28px', fontSize: '0.72rem', padding: '0 0.4rem', color: dish.isBestseller ? '#a78bfa' : 'var(--text-muted)' }}
                                onClick={() => handleToggleDishBestseller(dish.id)}
                                title="Toggle Bestseller"
                              >
                                👑
                              </button>
                              <button
                                type="button"
                                className={styles.btnNavAlt}
                                style={{ height: '28px', fontSize: '0.72rem', padding: '0 0.4rem', color: isArchived ? '#34d399' : '#a1a1aa' }}
                                onClick={() => handleArchiveDish(dish.id, isArchived)}
                                title={isArchived ? 'Restore Delicacy' : 'Archive Delicacy'}
                              >
                                {isArchived ? 'Restore' : 'Archive'}
                              </button>
                              <button
                                type="button"
                                className={styles.btnNavAlt}
                                style={{ height: '28px', fontSize: '0.72rem', padding: '0 0.4rem', color: '#ef4444' }}
                                onClick={() => handleDeleteDish(dish.id, dish.title)}
                                title="Delete Delicacy (Manager PIN)"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ─── 4. Floating Bulk Bar (Requirement 16) ─── */}
            {selectedDishIds.length > 0 && (
              <div className={styles.menuBulkBar}>
                <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                  ✓ {selectedDishIds.length} Delicacies Selected:
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={styles.btnStatusQuick}
                    style={{ background: '#10b981', color: '#ffffff', borderColor: '#10b981', height: '32px', fontSize: '0.75rem' }}
                    onClick={() => {
                      setBulkActionType('STATUS_AVAILABLE');
                      handleApplyBulkAction();
                    }}
                  >
                    🟢 Mark Available
                  </button>
                  <button
                    type="button"
                    className={styles.btnStatusQuick}
                    style={{ background: '#ef4444', color: '#ffffff', borderColor: '#ef4444', height: '32px', fontSize: '0.75rem' }}
                    onClick={() => {
                      setBulkActionType('STATUS_SOLDOUT');
                      handleApplyBulkAction();
                    }}
                  >
                    🔴 Mark Sold Out
                  </button>
                  <button
                    type="button"
                    className={styles.btnNavAlt}
                    style={{ height: '32px', fontSize: '0.75rem' }}
                    onClick={() => {
                      setBulkActionType('CATEGORY');
                      setShowBulkActionModal(true);
                    }}
                  >
                    🏷️ Move Category
                  </button>
                  <button
                    type="button"
                    className={styles.btnNavAlt}
                    style={{ height: '32px', fontSize: '0.75rem' }}
                    onClick={() => {
                      setBulkActionType('PRICE');
                      setShowBulkActionModal(true);
                    }}
                  >
                    💰 Adjust Price
                  </button>
                  <button
                    type="button"
                    className={styles.btnNavAlt}
                    style={{ height: '32px', fontSize: '0.75rem', color: '#ef4444' }}
                    onClick={() => {
                      setBulkActionType('DELETE');
                      setShowBulkActionModal(true);
                    }}
                  >
                    🗑️ Delete Selected
                  </button>
                  <button
                    type="button"
                    className={styles.btnNavAlt}
                    style={{ height: '32px', fontSize: '0.75rem', opacity: 0.7 }}
                    onClick={() => setSelectedDishIds([])}
                  >
                    ✕ Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 4: ANALYTICS & RUSH HEATMAP
           ══════════════════════════════════════════════════════════════════════ */}
        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 0: 12-REQUIREMENT EXECUTIVE DASHBOARD SUITE
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div>
            {/* ─── 10 & 11: Date Filters & Quick Actions Command Bar ─── */}
            <div className={styles.dashControlBar}>
              {/* Requirement 11: Date Filters */}
              <div className={styles.dateFilterGroup}>
                {[
                  { key: 'today', label: "Today" },
                  { key: 'yesterday', label: 'Yesterday' },
                  { key: 'week', label: 'This Week' },
                  { key: 'month', label: 'This Month' },
                  { key: 'custom', label: '📅 Custom Range' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`${styles.dateBtn} ${selectedPeriod === item.key ? styles.dateBtnActive : ''}`}
                    onClick={() => {
                      if (item.key === 'custom') {
                        setShowCustomDateModal(true);
                      } else {
                        setSelectedPeriod(item.key);
                        fetchAnalytics(item.key);
                        showNotice(`Filtered dashboard by: ${item.label}`);
                      }
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Requirement 10: Quick Actions */}
              <div className={styles.quickActionsGroup}>
                <button
                  type="button"
                  className={`${styles.quickActionBtn} ${styles.btnPrimaryGold}`}
                  onClick={() => setShowAddItemModal(true)}
                  title="Add a new dish to the live restaurant menu"
                >
                  ➕ Add Menu Item
                </button>
                <button
                  type="button"
                  className={styles.quickActionBtn}
                  onClick={() => setActiveTab('pos')}
                  title="Open POS Terminal to punch a new order"
                >
                  ⚡ Create POS Order
                </button>
                <button
                  type="button"
                  className={styles.quickActionBtn}
                  onClick={() => setActiveTab('floor')}
                  title="View & manage table seating arrangements"
                >
                  🪑 Manage Tables
                </button>
                <button
                  type="button"
                  className={styles.quickActionBtn}
                  onClick={() => {
                    setActiveTab('pos');
                    showNotice('Select an occupied table in POS to generate & settle bill');
                  }}
                  title="Quickly jump to billing counter"
                >
                  🧾 Generate Bill
                </button>
                <button
                  type="button"
                  className={styles.quickActionBtn}
                  onClick={() => {
                    setActiveTab('reports');
                  }}
                  title="Open comprehensive Reports & Analytics Suite"
                >
                  📈 Reports &amp; Analytics
                </button>
                <button
                  type="button"
                  className={styles.quickActionBtn}
                  onClick={() => {
                    const next = !soundAlerts;
                    setSoundAlerts(next);
                    if (next) playChime('notification');
                    showNotice(next ? '🔔 Kitchen & POS Sound Chime Enabled' : '🔕 Sound Chime Muted');
                  }}
                  title="Toggle Kitchen & Order notification chimes"
                >
                  {soundAlerts ? '🔔 Sound: ON' : '🔕 Sound: OFF'}
                </button>
              </div>
            </div>

            {/* ─── 1: 6 Summary KPI Cards ─── */}
            <div className={styles.kpiSixGrid}>
              {/* Card 1: Sales */}
              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiTitle}>
                    {selectedPeriod === 'today' ? "Today's Sales" : `${selectedPeriod.toUpperCase()} Sales`}
                  </span>
                  <span className={styles.kpiIcon}>💰</span>
                </div>
                <div className={styles.kpiValue} style={{ color: 'var(--accent-green)' }}>
                  ₹{(analytics?.metrics?.totalSales || 0).toLocaleString('en-IN')}
                </div>
                <div className={styles.kpiTrend} style={{ color: '#22c55e' }}>
                  ↑ 18.4% vs prev • {analytics?.metrics?.totalOrders || 0} Bills
                </div>
              </div>

              {/* Card 2: Total Orders */}
              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiTitle}>Total Orders</span>
                  <span className={styles.kpiIcon}>🧾</span>
                </div>
                <div className={styles.kpiValue}>
                  {analytics?.metrics?.totalOrders || 0}
                </div>
                <div className={styles.kpiTrend} style={{ color: '#0284c7' }}>
                  Dine-In + Online QR Orders
                </div>
              </div>

              {/* Card 3: Average Order Value */}
              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiTitle}>Avg Order Value</span>
                  <span className={styles.kpiIcon}>📈</span>
                </div>
                <div className={styles.kpiValue}>
                  ₹{(analytics?.metrics?.avgOrderValue || 0).toLocaleString('en-IN')}
                </div>
                <div className={styles.kpiTrend} style={{ color: '#a855f7' }}>
                  Target ₹450+ • High Margin
                </div>
              </div>

              {/* Card 4: Occupied Tables */}
              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiTitle}>Occupied Tables</span>
                  <span className={styles.kpiIcon}>🪑</span>
                </div>
                <div className={styles.kpiValue}>
                  {analytics?.metrics?.occupiedTables || '0 / 16'}
                </div>
                <div className={styles.kpiTrend} style={{ color: '#f59e0b' }}>
                  Occupancy: {analytics?.metrics?.occupancyRate || 0}% • Turn ~30m
                </div>
              </div>

              {/* Card 5: Pending KOTs */}
              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiTitle}>Pending KOTs</span>
                  <span className={styles.kpiIcon}>🔥</span>
                </div>
                <div className={styles.kpiValue} style={{ color: (analytics?.metrics?.pendingKots || 0) > 0 ? '#ef4444' : '#22c55e' }}>
                  {analytics?.metrics?.pendingKots || 0}
                </div>
                <div className={styles.kpiTrend} style={{ color: (analytics?.metrics?.pendingKots || 0) > 0 ? '#ef4444' : '#22c55e' }}>
                  {(analytics?.metrics?.pendingKots || 0) > 0 ? 'Active in Kitchen' : 'Kitchen Cleared'}
                </div>
              </div>

              {/* Card 6: Low Stock Items */}
              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiTitle}>Low Stock Items</span>
                  <span className={styles.kpiIcon}>⚠️</span>
                </div>
                <div className={styles.kpiValue} style={{ color: (analytics?.metrics?.lowStockCount || 0) > 0 ? '#ef4444' : '#16a34a' }}>
                  {analytics?.metrics?.lowStockCount || 0}
                </div>
                <div className={styles.kpiTrend} style={{ color: (analytics?.metrics?.lowStockCount || 0) > 0 ? '#ef4444' : '#16a34a' }}>
                  {(analytics?.metrics?.lowStockCount || 0) > 0 ? 'Urgent Restock Req' : 'Inventory Healthy'}
                </div>
              </div>
            </div>

            {/* ─── 2: Sales Analytics Charts & Breakdowns ─── */}
            <div className={styles.salesAnalyticsRow}>
              {/* Sales Chart & Order Trends */}
              <div className={styles.panelBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, border: 'none', padding: 0 }}>📊 Sales Analytics &amp; Order Trends</h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Period: <strong>{selectedPeriod.toUpperCase()}</strong>
                  </span>
                </div>
                
                <div className={styles.chartContainer}>
                  {(() => {
                    const trendBars = Array.isArray(analytics?.salesTrend)
                      ? analytics.salesTrend
                      : Array.isArray(analytics?.salesTrend?.items)
                      ? analytics.salesTrend.items
                      : Array.isArray(analytics?.salesTrend?.labels)
                      ? analytics.salesTrend.labels.map((lbl, i) => ({
                          label: lbl,
                          sales: analytics.salesTrend.values?.[i] || 0,
                          orders: Math.max(1, Math.round((analytics.salesTrend.values?.[i] || 0) / 400)),
                        }))
                      : [];

                    return trendBars.map((t, idx) => {
                      const maxVal = Math.max(...trendBars.map(x => x.sales), 100);
                      const fillHeight = Math.max(6, Math.round((t.sales / maxVal) * 100));
                      return (
                        <div key={idx} className={styles.barCol}>
                          <div className={styles.barPillWrap} title={`${t.label}: ₹${t.sales.toLocaleString('en-IN')} (${t.orders} orders)`}>
                            <div className={styles.barPillFill} style={{ height: `${fillHeight}%` }}></div>
                            <span className={styles.barAmountTip}>₹{t.sales > 999 ? `${Math.round(t.sales/1000)}k` : t.sales}</span>
                          </div>
                          <span className={styles.barLabel}>{t.label}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', paddingTop: '0.25rem' }}>
                  <span>• Bars reflect billing volume per time interval</span>
                  <span>• Live touch tooltips on TVSE screen</span>
                </div>
              </div>

              {/* Category Sales & Payment Breakdown */}
              <div className={styles.panelBox}>
                <h3 style={{ margin: '0 0 0.75rem 0', border: 'none', padding: 0 }}>🥧 Category Sales &amp; Payment Breakdown</h3>
                
                <div className={styles.categoryList}>
                  {(analytics?.categorySales || []).map((cat, idx) => (
                    <div key={idx} className={styles.categoryItem}>
                      <div className={styles.categoryMeta}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cat.category}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          ₹{cat.amount.toLocaleString('en-IN')} ({cat.percentage}%)
                        </span>
                      </div>
                      <div className={styles.categoryBarWrap}>
                        <div
                          className={styles.categoryBarFill}
                          style={{
                            width: `${cat.percentage}%`,
                            background: cat.color || '#3b82f6',
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.paymentGrid}>
                  {(analytics?.paymentBreakdown || []).map((pm, idx) => (
                    <div key={idx} className={styles.paymentChip}>
                      <span className={styles.paymentModeTitle}>{pm.method}</span>
                      <span className={styles.paymentModeValue}>₹{pm.amount.toLocaleString('en-IN')}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {pm.percentage}% • {pm.count} bills
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ─── 4 & 5: Kitchen Status (KDS Pulse) & Table Management ─── */}
            <div className={styles.kdsFloorRow}>
              {/* Kitchen Status (Requirement 4) */}
              <div className={styles.panelBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, border: 'none', padding: 0 }}>🍳 Kitchen Live Status (KOT Pulse)</h3>
                  <button
                    type="button"
                    className={styles.btnStatusQuick}
                    onClick={() => setActiveTab('kds')}
                    style={{ padding: '0.25rem 0.65rem' }}
                  >
                    Open Full KDS →
                  </button>
                </div>
                
                <div className={styles.kdsPulseGrid}>
                  <div className={`${styles.kdsPulseCard} ${styles.pulseNew}`}>
                    <span className={styles.kdsPulseCount}>{analytics?.kitchenStatus?.new || 0}</span>
                    <span className={styles.kdsPulseLabel}>🔴 New KOTs</span>
                  </div>
                  <div className={`${styles.kdsPulseCard} ${styles.pulseCooking}`}>
                    <span className={styles.kdsPulseCount}>{analytics?.kitchenStatus?.preparing || 0}</span>
                    <span className={styles.kdsPulseLabel}>🟡 Preparing</span>
                  </div>
                  <div className={`${styles.kdsPulseCard} ${styles.pulseReady}`}>
                    <span className={styles.kdsPulseCount}>{analytics?.kitchenStatus?.ready || 0}</span>
                    <span className={styles.kdsPulseLabel}>🟢 Ready</span>
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  ⚡ Head Chef Selvam active • Average turnaround: <strong>14.2 mins</strong>
                </div>
              </div>

              {/* Table Management (Requirement 5) */}
              <div className={styles.panelBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, border: 'none', padding: 0 }}>🪑 Table Management</h3>
                  <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 700 }}>
                    <span style={{ color: '#22c55e' }}>🟢 {analytics?.tableStatus?.available || 0} Free</span>
                    <span style={{ color: '#f59e0b' }}>🟠 {analytics?.tableStatus?.occupied || 0} Busy</span>
                    <span style={{ color: '#0284c7' }}>🔵 {analytics?.tableStatus?.reserved || 0} Rsvd</span>
                    <span style={{ color: '#ef4444' }}>🔴 {analytics?.tableStatus?.cleaning || 0} Clean</span>
                  </div>
                </div>

                <div className={styles.miniTablesGrid}>
                  {posData.tables.map((t) => {
                    let bg = 'rgba(34, 197, 94, 0.15)';
                    let border = '#22c55e';
                    let color = '#22c55e';
                    if (t.status === 'OCCUPIED') {
                      bg = 'rgba(245, 158, 11, 0.2)';
                      border = '#f59e0b';
                      color = '#f59e0b';
                    } else if (t.status === 'CLEANING') {
                      bg = 'rgba(239, 68, 68, 0.2)';
                      border = '#ef4444';
                      color = '#ef4444';
                    } else if (t.status === 'RESERVED') {
                      bg = 'rgba(2, 132, 199, 0.2)';
                      border = '#0284c7';
                      color = '#0284c7';
                    }
                    return (
                      <div
                        key={t.id}
                        className={styles.miniTableChip}
                        style={{ background: bg, borderColor: border, color }}
                        onClick={() => {
                          setSelectedTable(t);
                          setActiveTab('pos');
                        }}
                        title={`Table #${t.tableNumber} - ${t.status} (${t.capacity} seater) - Click to manage in POS`}
                      >
                        <span>T-{t.tableNumber}</span>
                        <span style={{ fontSize: '0.6rem', opacity: 0.85 }}>
                          {t.subtotal > 0 ? `₹${t.subtotal}` : `${t.capacity}p`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── 3, 6, 7 & 8: Operations Lower Grid ─── */}
            <div className={styles.dashLowerGrid}>
              {/* Left Column: Live Orders (Req 3) & Recent Activities (Req 8) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Live Orders Feed (Requirement 3) */}
                <div className={styles.panelBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, border: 'none', padding: 0 }}>⚡ Live Orders Feed</h3>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Real-time POS &amp; Table Orders
                    </span>
                  </div>

                  <div className={styles.liveOrdersTableWrap}>
                    <table className={styles.liveOrdersTable}>
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Table</th>
                          <th>Customer</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Payment</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(analytics?.liveOrders || []).length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                              No active live orders at this moment. Ready for next walk-in!
                            </td>
                          </tr>
                        ) : (
                          (analytics?.liveOrders || []).map((ord) => {
                            let badgeClass = styles.statusPreparing;
                            if (ord.status === 'PAID' || ord.status === 'SETTLED') badgeClass = styles.statusPaid;
                            else if (ord.status === 'READY') badgeClass = styles.statusReady;
                            else if (ord.status === 'PENDING_OTP') badgeClass = styles.statusPendingOtp;

                            return (
                              <tr key={ord.id}>
                                <td><strong>{ord.orderNumber}</strong></td>
                                <td><span style={{ fontWeight: 800, color: 'var(--accent-blue)' }}>T-{ord.table}</span></td>
                                <td>{ord.customerName}</td>
                                <td><strong>₹{ord.totalAmount}</strong></td>
                                <td>
                                  <span className={`${styles.orderStatusBadge} ${badgeClass}`}>
                                    {ord.status}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                                    {ord.paymentMethod} • {ord.paymentStatus}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className={styles.btnStatusQuick}
                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                    onClick={() => {
                                      const tbl = posData.tables.find(t => String(t.tableNumber) === String(ord.table));
                                      if (tbl) setSelectedTable(tbl);
                                      setActiveTab('pos');
                                    }}
                                  >
                                    Settle POS
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Activities Audit Stream (Requirement 8) */}
                <div className={styles.panelBox}>
                  <h3 style={{ margin: '0 0 0.75rem 0', border: 'none', padding: 0 }}>📋 Recent Activities &amp; Staff Audit</h3>
                  <div className={styles.activityStream}>
                    {(analytics?.recentActivities || []).map((act) => (
                      <div key={act.id} className={styles.activityItem}>
                        <div className={styles.activityIcon}>{act.icon || '📌'}</div>
                        <div style={{ flex: 1 }}>
                          <div className={styles.activityText}>
                            <strong>{act.title}</strong>: {act.desc}
                          </div>
                          <div className={styles.activityTime}>{act.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Inventory Alerts (Req 7) & Popular Dishes (Req 6) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Inventory Alerts (Requirement 7) */}
                <div className={styles.panelBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, border: 'none', padding: 0 }}>🚨 Inventory Alerts &amp; Restock</h3>
                    <button
                      type="button"
                      className={styles.btnStatusQuick}
                      onClick={() => setActiveTab('inventory')}
                      style={{ padding: '0.25rem 0.65rem' }}
                    >
                      View All Stock →
                    </button>
                  </div>

                  {(analytics?.lowStockItems || []).length > 0 ? (
                    <div className={styles.invAlertBanner}>
                      <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '0.85rem' }}>
                        ⚠️ {analytics.lowStockItems.length} Ingredients Below Low-Stock Threshold
                      </div>
                      {analytics.lowStockItems.map((it) => (
                        <div key={it.id} className={styles.invAlertRow}>
                          <div>
                            <strong>{it.name}</strong> ({it.category})
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Current: {it.currentStock} {it.unit} (Min: {it.lowStockThreshold} {it.unit})
                            </div>
                          </div>
                          <button
                            type="button"
                            className={styles.btnStatusQuick}
                            style={{ background: '#0284c7', color: '#ffffff' }}
                            onClick={() => setRestockItem(it)}
                          >
                            + Restock
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '0.85rem', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', fontSize: '0.8rem', color: '#16a34a', marginBottom: '0.75rem' }}>
                      ✅ All core ingredients &amp; BOM items are above safe inventory thresholds.
                    </div>
                  )}

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>📦 Supplier Orders: <strong>2 Scheduled Today</strong></span>
                    <span>Truck ETA: <strong>11:30 AM</strong></span>
                  </div>
                </div>

                {/* Popular Dishes Leaderboard (Requirement 6) */}
                <div className={styles.panelBox}>
                  <h3 style={{ margin: '0 0 0.75rem 0', border: 'none', padding: 0 }}>🏆 Popular Dishes Leaderboard</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {(analytics?.popularDishes || []).map((dish, idx) => (
                      <div key={dish.id} className={styles.popularDishCard}>
                        <div className={styles.popularDishLeft}>
                          <div className={styles.popularDishIcon}>
                            {dish.image || (dish.category === 'Tiffin' ? '🧈' : dish.category === 'Beverages' ? '☕' : '🍃')}
                          </div>
                          <div>
                            <div className={styles.popularDishTitle}>
                              #{idx + 1} {dish.title}
                            </div>
                            <div className={styles.popularDishSub}>
                              {dish.category} • Chettinad Signature
                            </div>
                          </div>
                        </div>
                        <div className={styles.popularDishSales}>
                          <div className={styles.popularDishQty}>{dish.count} orders</div>
                          <div className={styles.popularDishRev}>₹{(dish.revenue || 0).toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE: REPORTS & ANALYTICS SUITE (ALL 14 COMPREHENSIVE REQUIREMENTS)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'reports' && (
          <ReportsDashboard initialPeriod={selectedPeriod} />
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 5: RECIPE BOM INVENTORY & SPOILAGE AUDITING
           ══════════════════════════════════════════════════════════════════════ */}
        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 5: COMPREHENSIVE INVENTORY, SUPPLIERS & FOOD COSTING DASHBOARD
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'inventory' && (
          <div className={styles.invWrap}>
            {/* Header Banner */}
            <div className={styles.invHeader}>
              <div className={styles.invHeaderLeft}>
                <div className={styles.invTitleRow}>
                  <h2 className={styles.invTitle}>
                    📦 Inventory &amp; Food Costing Hub
                  </h2>
                  <span className={styles.invHeritageBadge}>
                    Sri Gokulam Kitchen &amp; Stores
                  </span>
                </div>
                <p className={styles.invSubtitle}>
                  Raw materials, BOM recipes, automated KOT stock tracking, procurement, supplier ledger, and food cost margins.
                </p>
              </div>

              <div className={styles.invHeaderActions}>
                <button
                  type="button"
                  className={styles.invActionBtnSec}
                  onClick={handleExportInventoryCsv}
                  title="Export complete inventory catalog to CSV"
                >
                  📊 Export CSV
                </button>
                <button
                  type="button"
                  className={styles.invActionBtnSec}
                  onClick={fetchInventory}
                  title="Refresh stock levels from database"
                >
                  🔄 {invLoading ? 'Loading...' : 'Refresh'}
                </button>
                <button
                  type="button"
                  className={styles.invActionBtnSec}
                  onClick={() => setShowStockAdjustmentModal(true)}
                  style={{ borderColor: '#ea580c', color: '#ea580c' }}
                >
                  ⚖️ Stock Adjustment
                </button>
                <button
                  type="button"
                  className={styles.invActionBtnSec}
                  onClick={() => setShowPurchaseOrderModal(true)}
                  style={{ borderColor: '#7c3aed', color: '#7c3aed' }}
                >
                  🛒 New Purchase Order
                </button>
                <button
                  type="button"
                  className={styles.invActionBtnPrimary}
                  onClick={() => {
                    setIngredientForm({
                      id: null,
                      name: '',
                      tamilName: '',
                      category: 'BASE',
                      unit: 'KG',
                      currentStock: 10,
                      lowStockThreshold: 3,
                      costPerUnit: 50,
                      supplierId: suppliers[0]?.id || '',
                      expiryDate: '',
                      storageLocation: 'Dry Provisions Store',
                    });
                    setShowAddIngredientModal(true);
                  }}
                >
                  ➕ Add Ingredient
                </button>
              </div>
            </div>

            {/* 6 Executive KPI Analytics Cards */}
            <div className={styles.invKpiGrid}>
              {/* Card 1: Total Ingredients */}
              <div className={styles.invKpiCard}>
                <div className={styles.invKpiHeader}>
                  <span className={styles.invKpiLabel}>Total Ingredients</span>
                  <span className={styles.invKpiIcon}>🌾</span>
                </div>
                <div className={styles.invKpiValue}>
                  {invSummary.totalIngredients || inventory.length}
                </div>
                <div className={styles.invKpiSubtext}>
                  <strong style={{ color: '#10b981' }}>{invSummary.availableStockCount || 0}</strong> in safe stock
                </div>
              </div>

              {/* Card 2: Low-Stock Alerts */}
              <div className={styles.invKpiCard} style={{ borderColor: invSummary.lowStockCount > 0 ? 'rgba(245, 158, 11, 0.4)' : undefined }}>
                <div className={styles.invKpiHeader}>
                  <span className={styles.invKpiLabel} style={{ color: invSummary.lowStockCount > 0 ? '#d97706' : undefined }}>
                    Low-Stock Alerts
                  </span>
                  <span className={styles.invKpiIcon}>⚠️</span>
                </div>
                <div className={styles.invKpiValue} style={{ color: invSummary.lowStockCount > 0 ? '#d97706' : undefined }}>
                  {invSummary.lowStockCount || 0}
                </div>
                <div className={styles.invKpiSubtext}>
                  {invSummary.lowStockCount > 0 ? 'Requires procurement reorder' : 'All items above minimum threshold'}
                </div>
              </div>

              {/* Card 3: Out-of-Stock Items */}
              <div className={styles.invKpiCard} style={{ borderColor: invSummary.outOfStockCount > 0 ? 'rgba(239, 68, 68, 0.4)' : undefined }}>
                <div className={styles.invKpiHeader}>
                  <span className={styles.invKpiLabel} style={{ color: invSummary.outOfStockCount > 0 ? '#dc2626' : undefined }}>
                    Out of Stock
                  </span>
                  <span className={styles.invKpiIcon}>🚨</span>
                </div>
                <div className={styles.invKpiValue} style={{ color: invSummary.outOfStockCount > 0 ? '#dc2626' : undefined }}>
                  {invSummary.outOfStockCount || 0}
                </div>
                <div className={styles.invKpiSubtext}>
                  {invSummary.outOfStockCount > 0 ? 'Kitchen preparations blocked' : 'Zero ingredient stockouts'}
                </div>
              </div>

              {/* Card 4: Total Inventory Valuation */}
              <div className={styles.invKpiCard}>
                <div className={styles.invKpiHeader}>
                  <span className={styles.invKpiLabel}>Inventory Valuation</span>
                  <span className={styles.invKpiIcon}>💰</span>
                </div>
                <div className={styles.invKpiValue}>
                  ₹{(invSummary.totalValuation || 0).toLocaleString('en-IN')}
                </div>
                <div className={styles.invKpiSubtext}>
                  Current stock assets across warehouse &amp; pantry
                </div>
              </div>

              {/* Card 5: Expiry & Shelf Life */}
              <div className={styles.invKpiCard}>
                <div className={styles.invKpiHeader}>
                  <span className={styles.invKpiLabel}>Expiry Audit</span>
                  <span className={styles.invKpiIcon}>⏳</span>
                </div>
                <div className={styles.invKpiValue} style={{ color: (invSummary.expiringSoonCount || invSummary.expiredCount) ? '#ea580c' : undefined }}>
                  {invSummary.expiringSoonCount || 0}
                  {invSummary.expiredCount > 0 && <span style={{ fontSize: '0.85rem', color: '#b91c1c' }}> ({invSummary.expiredCount} Expired)</span>}
                </div>
                <div className={styles.invKpiSubtext}>
                  Perishable items nearing end of shelf-life
                </div>
              </div>

              {/* Card 6: Average Food Cost % */}
              <div className={styles.invKpiCard}>
                <div className={styles.invKpiHeader}>
                  <span className={styles.invKpiLabel}>Avg Food Cost</span>
                  <span className={styles.invKpiIcon}>📈</span>
                </div>
                <div className={styles.invKpiValue} style={{ color: (invSummary.avgFoodCostPercent || 28) <= 30 ? '#10b981' : '#f59e0b' }}>
                  {invSummary.avgFoodCostPercent || 28}%
                </div>
                <div className={styles.invKpiSubtext}>
                  Chettinad margin target: &lt;30% of menu price
                </div>
              </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className={styles.invSubTabs}>
              <button
                type="button"
                className={`${styles.invSubTabBtn} ${invActiveSubTab === 'STOCK' ? styles.invSubTabActive : ''}`}
                onClick={() => setInvActiveSubTab('STOCK')}
              >
                📦 Stock &amp; Ingredients ({inventory.length})
              </button>
              <button
                type="button"
                className={`${styles.invSubTabBtn} ${invActiveSubTab === 'RECIPES' ? styles.invSubTabActive : ''}`}
                onClick={() => setInvActiveSubTab('RECIPES')}
              >
                📜 Recipe BOM &amp; Food Costing ({recipes.length})
              </button>
              <button
                type="button"
                className={`${styles.invSubTabBtn} ${invActiveSubTab === 'PURCHASES' ? styles.invSubTabActive : ''}`}
                onClick={() => setInvActiveSubTab('PURCHASES')}
              >
                🛒 Purchase Orders ({purchaseOrders.length})
              </button>
              <button
                type="button"
                className={`${styles.invSubTabBtn} ${invActiveSubTab === 'SUPPLIERS' ? styles.invSubTabActive : ''}`}
                onClick={() => setInvActiveSubTab('SUPPLIERS')}
              >
                🚚 Suppliers Directory ({suppliers.length})
              </button>
              <button
                type="button"
                className={`${styles.invSubTabBtn} ${invActiveSubTab === 'ADJUSTMENTS' ? styles.invSubTabActive : ''}`}
                onClick={() => setInvActiveSubTab('ADJUSTMENTS')}
              >
                ⚖️ Spoilage &amp; Wastage ({wastageLogs.length})
              </button>
              <button
                type="button"
                className={`${styles.invSubTabBtn} ${invActiveSubTab === 'REPORTS' ? styles.invSubTabActive : ''}`}
                onClick={() => setInvActiveSubTab('REPORTS')}
              >
                📊 Movement Audit &amp; Reports ({stockMovements.length})
              </button>
            </div>

            {/* ─── SUB-TAB 1: STOCK & INGREDIENTS DIRECTORY ─── */}
            {invActiveSubTab === 'STOCK' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Search & Filters Toolbar */}
                <div className={styles.invControlsPanel}>
                  <div className={styles.invFilterRow}>
                    <div className={styles.invSearchBox}>
                      <span>🔍</span>
                      <input
                        type="text"
                        placeholder="Search ingredients by English or Tamil name, supplier, storage location..."
                        value={invSearchQuery}
                        onChange={(e) => setInvSearchQuery(e.target.value)}
                        className={styles.invSearchInput}
                      />
                      {invSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setInvSearchQuery('')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Supplier:</span>
                      <select
                        value={invSupplierFilter}
                        onChange={(e) => setInvSupplierFilter(e.target.value)}
                        className={styles.posDiscountInput}
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                      >
                        <option value="ALL">All Suppliers</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Category Pills & Stock Status Pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className={styles.invPillsWrap}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginRight: '0.25rem' }}>
                        CATEGORY:
                      </span>
                      {[
                        { key: 'ALL', label: 'All Categories' },
                        { key: 'BASE', label: '🌾 Base Staples' },
                        { key: 'DAIRY', label: '🥛 Dairy & Ghee' },
                        { key: 'MASALA', label: '🌶️ Masalas & Podi' },
                        { key: 'BEVERAGE', label: '☕ Beverages' },
                        { key: 'PULSE', label: '🥣 Pulses & Dals' },
                        { key: 'OIL', label: '🛢️ Oils' },
                        { key: 'SWEETENER', label: '🍯 Jaggery & Sugar' },
                        { key: 'SERVING', label: '🍃 Banana Leaves' },
                      ].map(cat => (
                        <button
                          key={cat.key}
                          type="button"
                          className={`${styles.invPill} ${invCategoryFilter === cat.key ? styles.invPillActive : ''}`}
                          onClick={() => setInvCategoryFilter(cat.key)}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className={styles.invPillsWrap}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginRight: '0.25rem' }}>
                        STOCK STATUS:
                      </span>
                      {[
                        { key: 'ALL', label: 'All Stock Levels' },
                        { key: 'IN_STOCK', label: '✅ Healthy Stock' },
                        { key: 'LOW_STOCK', label: '⚠️ Low Stock Alerts' },
                        { key: 'OUT_OF_STOCK', label: '🚨 Out of Stock' },
                        { key: 'EXPIRING_SOON', label: '⏳ Expiring Soon (≤ 7 Days)' },
                        { key: 'EXPIRED', label: '❌ Expired' },
                      ].map(st => (
                        <button
                          key={st.key}
                          type="button"
                          className={`${styles.invPill} ${invStockStatusFilter === st.key ? styles.invPillActive : ''}`}
                          onClick={() => setInvStockStatusFilter(st.key)}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ingredients Table */}
                <div className={styles.invTableWrap}>
                  <table className={styles.invTable}>
                    <thead>
                      <tr>
                        <th>Ingredient Details</th>
                        <th>Category</th>
                        <th>Storage Location</th>
                        <th>Current Stock</th>
                        <th>Reorder Level</th>
                        <th>Cost / Unit</th>
                        <th>Total Valuation</th>
                        <th>Supplier</th>
                        <th>Shelf Life / Expiry</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.length === 0 ? (
                        <tr>
                          <td colSpan="10" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                            No ingredients matched the selected filters.
                          </td>
                        </tr>
                      ) : (
                        inventory.map(item => {
                          const isLow = item.computedStatus === 'LOW_STOCK';
                          const isOut = item.computedStatus === 'OUT_OF_STOCK';
                          return (
                            <tr key={item.id}>
                              <td>
                                <strong style={{ color: 'var(--text-primary)' }}>{item.name}</strong>
                                {item.tamilName && (
                                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                                    {item.tamilName}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span style={{
                                  background: 'var(--bg-card-subtle)',
                                  border: '1px solid var(--border-subtle)',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                }}>
                                  {item.category}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                                📍 {item.storageLocation || 'Main Store'}
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span style={{
                                    fontWeight: 800,
                                    fontSize: '0.88rem',
                                    color: isOut ? '#dc2626' : isLow ? '#d97706' : '#10b981',
                                  }}>
                                    {item.currentStock} {item.unit}
                                  </span>
                                  {isOut && <span className={styles.statusOutOfStock}>OUT OF STOCK</span>}
                                  {isLow && !isOut && <span className={styles.statusLowStock}>LOW STOCK</span>}
                                  {!isLow && !isOut && <span className={styles.statusInStock}>IN STOCK</span>}
                                </div>
                              </td>
                              <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {item.lowStockThreshold} {item.unit}
                              </td>
                              <td style={{ fontWeight: 600 }}>
                                ₹{item.costPerUnit}
                              </td>
                              <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                                ₹{(item.itemValuation || Math.round(item.currentStock * item.costPerUnit)).toLocaleString('en-IN')}
                              </td>
                              <td style={{ fontSize: '0.76rem' }}>
                                {item.supplierName || 'Market'}
                              </td>
                              <td>
                                {item.isExpired ? (
                                  <span className={styles.statusExpired}>❌ EXPIRED ({item.expiryDate})</span>
                                ) : item.isExpiringSoon ? (
                                  <span className={styles.statusExpiring}>⏳ In {item.daysToExpiry} days ({item.expiryDate})</span>
                                ) : item.expiryDate ? (
                                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                                    {item.expiryDate} ({item.daysToExpiry}d)
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Non-perishable</span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    className={styles.btnStatusQuick}
                                    style={{ background: '#0284c7', color: '#ffffff', padding: '0.25rem 0.55rem' }}
                                    onClick={() => setRestockItem(item)}
                                    title="Quick Restock"
                                  >
                                    + Restock
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.btnStatusQuick}
                                    style={{ background: '#dc2626', color: '#ffffff', padding: '0.25rem 0.55rem' }}
                                    onClick={() => setSpoilageItem(item)}
                                    title="Log Spoilage / Wastage"
                                  >
                                    🗑️ Wastage
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.btnStatusQuick}
                                    style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-secondary)', padding: '0.25rem 0.55rem' }}
                                    onClick={() => {
                                      setIngredientForm({
                                        id: item.id,
                                        name: item.name,
                                        tamilName: item.tamilName || '',
                                        category: item.category,
                                        unit: item.unit,
                                        currentStock: item.currentStock,
                                        lowStockThreshold: item.lowStockThreshold,
                                        costPerUnit: item.costPerUnit,
                                        supplierId: item.supplierId || '',
                                        expiryDate: item.expiryDate || '',
                                        storageLocation: item.storageLocation || 'Dry Provisions Store',
                                      });
                                      setShowAddIngredientModal(true);
                                    }}
                                    title="Edit Ingredient"
                                  >
                                    ✏️
                                  </button>
                                  {isManagerOrAdmin && (
                                    <button
                                      type="button"
                                      className={styles.btnStatusQuick}
                                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', padding: '0.25rem 0.55rem' }}
                                      onClick={() => handleDeleteIngredient(item.id, item.name)}
                                      title="Delete Ingredient (Manager Restricted)"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── SUB-TAB 2: RECIPE BOM & FOOD COSTING ─── */}
            {invActiveSubTab === 'RECIPES' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                      📜 Recipe Bill of Materials (BOM) &amp; Food Cost Margins
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Live kitchen food costing calculated dynamically from raw material purchase prices.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.invActionBtnPrimary}
                    onClick={() => {
                      setRecipeForm({
                        id: null,
                        menuItemName: '',
                        sellingPrice: 100,
                        ingredients: [{ invId: inventory[0]?.id || '', qty: 0.1, unit: 'KG' }],
                      });
                      setShowRecipeModal(true);
                    }}
                  >
                    ➕ New Recipe BOM
                  </button>
                </div>

                <div className={styles.invRecipeGrid}>
                  {recipes.map(rec => {
                    const isHealthyMargin = rec.foodCostPercent <= 30;
                    return (
                      <div key={rec.id} className={styles.invRecipeCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              {rec.menuItemName}
                            </strong>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              Selling Price: <strong style={{ color: 'var(--accent-blue)' }}>₹{rec.menuPrice}</strong>
                            </div>
                          </div>
                          <button
                            type="button"
                            className={styles.btnStatusQuick}
                            style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-secondary)' }}
                            onClick={() => {
                              setRecipeForm({
                                id: rec.id,
                                menuItemName: rec.menuItemName,
                                sellingPrice: rec.menuPrice,
                                ingredients: rec.ingredients || [],
                              });
                              setShowRecipeModal(true);
                            }}
                          >
                            ✏️ Edit BOM
                          </button>
                        </div>

                        {/* Cost & Profit Strip */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '0.5rem',
                          padding: '0.65rem',
                          background: 'var(--bg-card-subtle)',
                          borderRadius: '8px',
                          textAlign: 'center',
                        }}>
                          <div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>FOOD COST</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#dc2626' }}>
                              ₹{rec.costPerDish}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>GROSS PROFIT</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981' }}>
                              ₹{rec.grossProfit}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>MARGIN %</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: isHealthyMargin ? '#10b981' : '#f59e0b' }}>
                              {rec.profitMarginPercent}%
                            </div>
                          </div>
                        </div>

                        {/* Food Cost % Meter */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Food Cost Target: &lt;30%</span>
                            <strong style={{ color: isHealthyMargin ? '#10b981' : '#f59e0b' }}>
                              {rec.foodCostPercent}% of Sale
                            </strong>
                          </div>
                          <div className={styles.invCostMeter}>
                            <div
                              className={styles.invCostFill}
                              style={{
                                width: `${Math.min(100, rec.foodCostPercent)}%`,
                                background: isHealthyMargin ? '#10b981' : rec.foodCostPercent <= 40 ? '#f59e0b' : '#dc2626',
                              }}
                            />
                          </div>
                        </div>

                        {/* Ingredients Breakdown */}
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                            INGREDIENT CONSUMPTION PER DISH:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {(rec.ingredientDetails || []).map((ing, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontSize: '0.74rem',
                                  padding: '0.25rem 0.4rem',
                                  background: 'var(--bg-input)',
                                  borderRadius: '4px',
                                }}
                              >
                                <span>• {ing.name} ({ing.qty} {ing.unit})</span>
                                <strong style={{ color: 'var(--text-secondary)' }}>₹{ing.lineCost}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── SUB-TAB 3: PURCHASE ORDERS & INVOICING ─── */}
            {invActiveSubTab === 'PURCHASES' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                      🛒 Purchase Orders &amp; Procurement Invoicing
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Track supplier orders, invoices, and receive stock with one-click automatic inventory updates.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.invActionBtnPrimary}
                    onClick={() => setShowPurchaseOrderModal(true)}
                  >
                    ➕ Create Purchase Order
                  </button>
                </div>

                <div className={styles.invTableWrap}>
                  <table className={styles.invTable}>
                    <thead>
                      <tr>
                        <th>PO Number</th>
                        <th>Supplier</th>
                        <th>Invoice #</th>
                        <th>Order Date</th>
                        <th>Received Date</th>
                        <th>Items Count</th>
                        <th>Total Amount</th>
                        <th>Payment Status</th>
                        <th>PO Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseOrders.length === 0 ? (
                        <tr>
                          <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No purchase orders found. Click &quot;Create Purchase Order&quot; to issue one.
                          </td>
                        </tr>
                      ) : (
                        purchaseOrders.map(po => {
                          const isReceived = po.status === 'RECEIVED';
                          return (
                            <tr key={po.id}>
                              <td>
                                <strong style={{ color: 'var(--accent-blue)' }}>{po.poNumber}</strong>
                              </td>
                              <td>
                                <strong>{po.supplierName}</strong>
                              </td>
                              <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {po.invoiceNumber || 'Pending'}
                              </td>
                              <td style={{ fontSize: '0.75rem' }}>
                                {new Date(po.orderDate).toLocaleDateString('en-IN')}
                              </td>
                              <td style={{ fontSize: '0.75rem' }}>
                                {po.receivedDate ? new Date(po.receivedDate).toLocaleDateString('en-IN') : '—'}
                              </td>
                              <td style={{ fontSize: '0.78rem' }}>
                                {(po.items || []).length} items
                              </td>
                              <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                                ₹{Number(po.totalAmount || 0).toLocaleString('en-IN')}
                              </td>
                              <td>
                                <span style={{
                                  background: po.paymentStatus === 'PAID' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.15)',
                                  color: po.paymentStatus === 'PAID' ? '#10b981' : '#d97706',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                }}>
                                  {po.paymentStatus}
                                </span>
                              </td>
                              <td>
                                <span style={{
                                  background: isReceived ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 88, 12, 0.15)',
                                  color: isReceived ? '#10b981' : '#ea580c',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                }}>
                                  {isReceived ? '✅ RECEIVED' : '⏳ PENDING'}
                                </span>
                              </td>
                              <td>
                                {!isReceived ? (
                                  <button
                                    type="button"
                                    className={styles.btnStatusQuick}
                                    style={{ background: '#10b981', color: '#ffffff' }}
                                    onClick={() => handleReceivePurchaseOrder(po.id, po.poNumber)}
                                  >
                                    📥 Receive Stock
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                    Stock Added ✓
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── SUB-TAB 4: SUPPLIERS DIRECTORY & LEDGER ─── */}
            {invActiveSubTab === 'SUPPLIERS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                      🚚 Karaikudi Chettinad Suppliers Directory
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Manage contact information, supplied raw materials, payment terms, and creditor balances.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.invActionBtnPrimary}
                    onClick={() => {
                      setSupplierForm({
                        id: null,
                        name: '',
                        contactPerson: '',
                        phone: '',
                        email: '',
                        address: '',
                        categories: ['BASE'],
                        paymentTerms: 'Net 30 Days',
                        paymentStatus: 'PAID',
                        balanceDue: 0,
                      });
                      setShowSupplierModal(true);
                    }}
                  >
                    ➕ Add Supplier
                  </button>
                </div>

                <div className={styles.invSupplierGrid}>
                  {suppliers.map(sup => (
                    <div key={sup.id} className={styles.invSupplierCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {sup.name}
                          </strong>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            Contact: <strong>{sup.contactPerson || 'Vendor'}</strong>
                          </div>
                        </div>
                        <span style={{
                          background: 'rgba(245, 158, 11, 0.12)',
                          color: '#b45309',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}>
                          ⭐ {sup.rating || 4.8}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div>📞 Phone: <strong>{sup.phone}</strong></div>
                        {sup.email && <div>✉️ Email: {sup.email}</div>}
                        <div>📍 Address: {sup.address}</div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {(sup.categories || []).map((cat, i) => (
                          <span
                            key={i}
                            style={{
                              background: 'var(--bg-input)',
                              border: '1px solid var(--border-subtle)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                            }}
                          >
                            {cat}
                          </span>
                        ))}
                      </div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.6rem 0.75rem',
                        background: 'var(--bg-card-subtle)',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                      }}>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>TERMS / STATUS</div>
                          <strong>{sup.paymentTerms}</strong> • <span style={{ color: sup.paymentStatus === 'PAID' ? '#10b981' : '#d97706' }}>{sup.paymentStatus}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>BALANCE DUE</div>
                          <strong style={{ color: sup.balanceDue > 0 ? '#dc2626' : '#10b981' }}>
                            ₹{Number(sup.balanceDue || 0).toLocaleString('en-IN')}
                          </strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto' }}>
                        <button
                          type="button"
                          className={styles.btnStatusQuick}
                          style={{ flex: 1, background: '#0284c7', color: '#ffffff' }}
                          onClick={() => {
                            setPoForm({
                              supplierId: sup.id,
                              invoiceNumber: '',
                              notes: '',
                              items: [{ invId: inventory.find(i => i.supplierId === sup.id)?.id || inventory[0]?.id || '', qty: 10, unitPrice: 0 }],
                            });
                            setShowPurchaseOrderModal(true);
                          }}
                        >
                          🛒 Create PO
                        </button>
                        <button
                          type="button"
                          className={styles.btnStatusQuick}
                          style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-secondary)' }}
                          onClick={() => {
                            setSupplierForm({
                              id: sup.id,
                              name: sup.name,
                              contactPerson: sup.contactPerson || '',
                              phone: sup.phone,
                              email: sup.email || '',
                              address: sup.address || '',
                              categories: sup.categories || ['BASE'],
                              paymentTerms: sup.paymentTerms || 'Net 30 Days',
                              paymentStatus: sup.paymentStatus || 'PAID',
                              balanceDue: sup.balanceDue || 0,
                            });
                            setShowSupplierModal(true);
                          }}
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── SUB-TAB 5: STOCK ADJUSTMENTS & WASTAGE AUDIT ─── */}
            {invActiveSubTab === 'ADJUSTMENTS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                      ⚖️ Spoilage, Damage &amp; Wastage Audit
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Audit log of kitchen trimming losses, spoiled batches, expired shelf-life, and manual corrections.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.invActionBtnPrimary}
                    onClick={() => setShowStockAdjustmentModal(true)}
                  >
                    ➕ Record Stock Adjustment
                  </button>
                </div>

                <div className={styles.invTableWrap}>
                  <table className={styles.invTable}>
                    <thead>
                      <tr>
                        <th>Date &amp; Time</th>
                        <th>Ingredient</th>
                        <th>Quantity Lost</th>
                        <th>Estimated Financial Loss</th>
                        <th>Reason Category</th>
                        <th>Reported By</th>
                        <th>Notes / Root Cause</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wastageLogs.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No wastage or spoilage recorded today. High kitchen discipline!
                          </td>
                        </tr>
                      ) : (
                        wastageLogs.map(wst => (
                          <tr key={wst.id}>
                            <td style={{ fontSize: '0.74rem' }}>
                              {new Date(wst.createdAt).toLocaleString('en-IN')}
                            </td>
                            <td>
                              <strong>{wst.itemName}</strong>
                            </td>
                            <td style={{ fontWeight: 800, color: '#dc2626' }}>
                              -{wst.quantity} {wst.unit}
                            </td>
                            <td style={{ fontWeight: 800, color: '#dc2626' }}>
                              -₹{wst.estimatedLoss}
                            </td>
                            <td>
                              <span style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#dc2626',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                              }}>
                                {wst.reason}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.75rem' }}>
                              {wst.reportedBy}
                            </td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {wst.notes || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── SUB-TAB 6: MOVEMENT AUDIT & REPORTS ─── */}
            {invActiveSubTab === 'REPORTS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                      📊 Stock Movements &amp; Consumption Audit Trail
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Chronological ledger of every single procurement addition, kitchen preparation consumption, and manual correction.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.invActionBtnSec}
                    onClick={handleExportInventoryCsv}
                  >
                    📥 Download CSV Report
                  </button>
                </div>

                <div className={styles.invTableWrap}>
                  <table className={styles.invTable}>
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Movement Type</th>
                        <th>Ingredient</th>
                        <th>Change</th>
                        <th>Balance After</th>
                        <th>Audit Reason &amp; Reference</th>
                        <th>Authorized Staff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockMovements.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No stock movement records available.
                          </td>
                        </tr>
                      ) : (
                        stockMovements.map(mov => {
                          const isPositive = Number(mov.qtyChange) > 0;
                          return (
                            <tr key={mov.id}>
                              <td style={{ fontSize: '0.74rem' }}>
                                {new Date(mov.date).toLocaleString('en-IN')}
                              </td>
                              <td>
                                <span style={{
                                  background: mov.type === 'PURCHASE_RECEIPT'
                                    ? 'rgba(16, 185, 129, 0.12)'
                                    : mov.type === 'RECIPE_CONSUMPTION'
                                    ? 'rgba(2, 132, 199, 0.12)'
                                    : 'rgba(239, 68, 68, 0.12)',
                                  color: mov.type === 'PURCHASE_RECEIPT'
                                    ? '#10b981'
                                    : mov.type === 'RECIPE_CONSUMPTION'
                                    ? '#0284c7'
                                    : '#dc2626',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                }}>
                                  {mov.type}
                                </span>
                              </td>
                              <td>
                                <strong>{mov.itemName}</strong>
                              </td>
                              <td style={{ fontWeight: 800, color: isPositive ? '#10b981' : '#dc2626' }}>
                                {isPositive ? `+${mov.qtyChange}` : mov.qtyChange} {mov.unit}
                              </td>
                              <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {mov.balanceAfter} {mov.unit}
                              </td>
                              <td style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                                {mov.reason}
                              </td>
                              <td style={{ fontSize: '0.75rem' }}>
                                {mov.staff}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            INVENTORY MODAL 1: ADD / EDIT INGREDIENT
           ══════════════════════════════════════════════════════════════════════ */}
        {showAddIngredientModal && (
          <div className={styles.crmModalBackdrop} onClick={() => setShowAddIngredientModal(false)}>
            <div className={styles.crmModalBox} style={{ maxWidth: '620px' }} onClick={e => e.stopPropagation()}>
              <div className={styles.crmModalHeader}>
                <h3 className={styles.crmModalTitle}>
                  {ingredientForm.id ? `✏️ Edit Ingredient: ${ingredientForm.name}` : '➕ Add Raw Material / Ingredient'}
                </h3>
                <button
                  type="button"
                  className={styles.crmModalClose}
                  onClick={() => setShowAddIngredientModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveIngredient} style={{ padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>INGREDIENT NAME (ENGLISH) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pure Cow Ghee"
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={ingredientForm.name}
                      onChange={e => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>TAMIL NAME</label>
                    <input
                      type="text"
                      placeholder="e.g. நாட்டு பசு நெய்"
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={ingredientForm.tamilName}
                      onChange={e => setIngredientForm({ ...ingredientForm, tamilName: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>CATEGORY *</label>
                    <select
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={ingredientForm.category}
                      onChange={e => setIngredientForm({ ...ingredientForm, category: e.target.value })}
                    >
                      <option value="BASE">Base Staples</option>
                      <option value="DAIRY">Dairy &amp; Ghee</option>
                      <option value="MASALA">Masalas &amp; Spices</option>
                      <option value="BEVERAGE">Beverages</option>
                      <option value="PULSE">Pulses &amp; Dals</option>
                      <option value="OIL">Oils</option>
                      <option value="SWEETENER">Jaggery &amp; Sugar</option>
                      <option value="CONDIMENT">Condiments</option>
                      <option value="SERVING">Serving Leaves</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>UNIT OF MEASURE *</label>
                    <select
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={ingredientForm.unit}
                      onChange={e => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                    >
                      <option value="KG">Kilogram (KG)</option>
                      <option value="LTR">Litre (LTR)</option>
                      <option value="GM">Gram (GM)</option>
                      <option value="ML">Millilitre (ML)</option>
                      <option value="BUNCH">Bunch (BUNCH)</option>
                      <option value="PACKET">Packet (PKT)</option>
                      <option value="PIECE">Piece (PCS)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>PURCHASE COST / UNIT (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 680"
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={ingredientForm.costPerUnit}
                      onChange={e => setIngredientForm({ ...ingredientForm, costPerUnit: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>CURRENT STOCK QUANTITY *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 10.0"
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={ingredientForm.currentStock}
                      onChange={e => setIngredientForm({ ...ingredientForm, currentStock: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>MINIMUM LOW-STOCK THRESHOLD *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 3.0"
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={ingredientForm.lowStockThreshold}
                      onChange={e => setIngredientForm({ ...ingredientForm, lowStockThreshold: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>DEFAULT SUPPLIER</label>
                    <select
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={ingredientForm.supplierId}
                      onChange={e => setIngredientForm({ ...ingredientForm, supplierId: e.target.value })}
                    >
                      <option value="">Direct Market Purchase</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>STORAGE LOCATION</label>
                    <select
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={ingredientForm.storageLocation}
                      onChange={e => setIngredientForm({ ...ingredientForm, storageLocation: e.target.value })}
                    >
                      <option value="Dry Provisions Store">Dry Provisions Store</option>
                      <option value="Cold Storage Room (2°C)">Cold Storage Room (2°C)</option>
                      <option value="Kitchen Line Heated Well">Kitchen Line Heated Well</option>
                      <option value="Spice Vault Shelf A">Spice Vault Shelf A</option>
                      <option value="Spice Vault Shelf B">Spice Vault Shelf B</option>
                      <option value="Oil Storage Drum Bay">Oil Storage Drum Bay</option>
                      <option value="Vegetable Cool Shed">Vegetable Cool Shed</option>
                      <option value="Beverage Counter Air-tight Caddy">Beverage Counter Air-tight Caddy</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>BATCH EXPIRY DATE</label>
                  <input
                    type="date"
                    className={styles.posDiscountInput}
                    style={{ width: '100%', marginTop: '0.2rem' }}
                    value={ingredientForm.expiryDate}
                    onChange={e => setIngredientForm({ ...ingredientForm, expiryDate: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className={styles.btnNavAlt}
                    onClick={() => setShowAddIngredientModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.btnThermalPrint}
                    style={{ minWidth: '140px' }}
                  >
                    {ingredientForm.id ? 'Save Changes' : 'Add Ingredient'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            INVENTORY MODAL 2: STOCK ADJUSTMENT & WASTAGE
           ══════════════════════════════════════════════════════════════════════ */}
        {showStockAdjustmentModal && (
          <div className={styles.crmModalBackdrop} onClick={() => setShowStockAdjustmentModal(false)}>
            <div className={styles.crmModalBox} style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
              <div className={styles.crmModalHeader}>
                <h3 className={styles.crmModalTitle}>
                  ⚖️ Record Stock Adjustment / Wastage
                </h3>
                <button
                  type="button"
                  className={styles.crmModalClose}
                  onClick={() => setShowStockAdjustmentModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleStockAdjustmentSubmit} style={{ padding: '1.25rem' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>SELECT INGREDIENT *</label>
                  <select
                    required
                    className={styles.posDiscountInput}
                    style={{ width: '100%', marginTop: '0.2rem' }}
                    value={stockAdjustForm.itemId}
                    onChange={e => setStockAdjustForm({ ...stockAdjustForm, itemId: e.target.value })}
                  >
                    <option value="">-- Choose Ingredient --</option>
                    {inventory.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name} (Current: {i.currentStock} {i.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>ADJUSTMENT TYPE *</label>
                    <select
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={stockAdjustForm.adjustmentType}
                      onChange={e => setStockAdjustForm({ ...stockAdjustForm, adjustmentType: e.target.value, reason: e.target.value })}
                    >
                      <option value="SPOILED">Spoiled / Curdled</option>
                      <option value="DAMAGED">Damaged in Storage</option>
                      <option value="EXPIRED">Expired Shelf-Life</option>
                      <option value="PREP_ERROR">Prep / Trimming Loss</option>
                      <option value="RETURNED">Return to Supplier</option>
                      <option value="MANUAL_CORRECTION">Stock Count Correction</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>QUANTITY *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 2.5"
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={stockAdjustForm.quantity}
                      onChange={e => setStockAdjustForm({ ...stockAdjustForm, quantity: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>REASON / ROOT CAUSE NOTES</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Cooler temperature dip caused curdling during night hours"
                    className={styles.crmTextarea}
                    style={{ width: '100%', marginTop: '0.2rem' }}
                    value={stockAdjustForm.notes}
                    onChange={e => setStockAdjustForm({ ...stockAdjustForm, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className={styles.btnNavAlt}
                    onClick={() => setShowStockAdjustmentModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.btnThermalPrint}
                    style={{ background: '#dc2626' }}
                  >
                    Confirm Adjustment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            INVENTORY MODAL 3: CREATE PURCHASE ORDER
           ══════════════════════════════════════════════════════════════════════ */}
        {showPurchaseOrderModal && (
          <div className={styles.crmModalBackdrop} onClick={() => setShowPurchaseOrderModal(false)}>
            <div className={styles.crmModalBox} style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
              <div className={styles.crmModalHeader}>
                <h3 className={styles.crmModalTitle}>
                  🛒 Create Supplier Purchase Order (PO)
                </h3>
                <button
                  type="button"
                  className={styles.crmModalClose}
                  onClick={() => setShowPurchaseOrderModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePurchaseOrder} style={{ padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>SUPPLIER *</label>
                    <select
                      required
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={poForm.supplierId}
                      onChange={e => setPoForm({ ...poForm, supplierId: e.target.value })}
                    >
                      <option value="">-- Choose Supplier --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.paymentTerms})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>INVOICE / BILL REF #</label>
                    <input
                      type="text"
                      placeholder="e.g. INV-KD-9041"
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={poForm.invoiceNumber}
                      onChange={e => setPoForm({ ...poForm, invoiceNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      PURCHASE ORDER LINE ITEMS *
                    </label>
                    <button
                      type="button"
                      className={styles.btnStatusQuick}
                      style={{ background: '#0284c7', color: '#ffffff', padding: '0.2rem 0.5rem' }}
                      onClick={() => setPoForm({
                        ...poForm,
                        items: [...poForm.items, { invId: inventory[0]?.id || '', qty: 10, unitPrice: inventory[0]?.costPerUnit || 50 }],
                      })}
                    >
                      + Add Item
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {poForm.items.map((it, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          className={styles.posDiscountInput}
                          value={it.invId}
                          onChange={e => {
                            const chosen = inventory.find(i => i.id === e.target.value);
                            const updated = [...poForm.items];
                            updated[idx].invId = e.target.value;
                            if (chosen) updated[idx].unitPrice = chosen.costPerUnit;
                            setPoForm({ ...poForm, items: updated });
                          }}
                        >
                          {inventory.map(i => (
                            <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Qty"
                          className={styles.posDiscountInput}
                          value={it.qty}
                          onChange={e => {
                            const updated = [...poForm.items];
                            updated[idx].qty = e.target.value;
                            setPoForm({ ...poForm, items: updated });
                          }}
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Price (₹)"
                          className={styles.posDiscountInput}
                          value={it.unitPrice}
                          onChange={e => {
                            const updated = [...poForm.items];
                            updated[idx].unitPrice = e.target.value;
                            setPoForm({ ...poForm, items: updated });
                          }}
                        />
                        {poForm.items.length > 1 && (
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.1rem' }}
                            onClick={() => {
                              const updated = poForm.items.filter((_, i) => i !== idx);
                              setPoForm({ ...poForm, items: updated });
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>DELIVERY INSTRUCTIONS / NOTES</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Deliver before 7:30 AM morning breakfast prep"
                    className={styles.crmTextarea}
                    style={{ width: '100%', marginTop: '0.2rem' }}
                    value={poForm.notes}
                    onChange={e => setPoForm({ ...poForm, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className={styles.btnNavAlt}
                    onClick={() => setShowPurchaseOrderModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.btnThermalPrint}
                    style={{ minWidth: '150px' }}
                  >
                    Issue Purchase Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            INVENTORY MODAL 4: ADD / EDIT SUPPLIER
           ══════════════════════════════════════════════════════════════════════ */}
        {showSupplierModal && (
          <div className={styles.crmModalBackdrop} onClick={() => setShowSupplierModal(false)}>
            <div className={styles.crmModalBox} style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
              <div className={styles.crmModalHeader}>
                <h3 className={styles.crmModalTitle}>
                  {supplierForm.id ? `✏️ Edit Supplier: ${supplierForm.name}` : '➕ Add Chettinad Supplier'}
                </h3>
                <button
                  type="button"
                  className={styles.crmModalClose}
                  onClick={() => setShowSupplierModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveSupplier} style={{ padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>SUPPLIER / FIRM NAME *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Karaikudi Dairy Farm"
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={supplierForm.name}
                      onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>CONTACT PERSON</label>
                    <input
                      type="text"
                      placeholder="e.g. S. Muthukrishnan"
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={supplierForm.contactPerson}
                      onChange={e => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>PHONE NUMBER *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9443187654"
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={supplierForm.phone}
                      onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>EMAIL</label>
                    <input
                      type="email"
                      placeholder="e.g. vendor@heritage.in"
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={supplierForm.email}
                      onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>KARAIKUDI / REGIONAL ADDRESS</label>
                  <input
                    type="text"
                    placeholder="e.g. Kalanivasal Road, Karaikudi"
                    className={styles.posDiscountInput}
                    style={{ width: '100%', marginTop: '0.2rem' }}
                    value={supplierForm.address}
                    onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>PAYMENT TERMS</label>
                    <select
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={supplierForm.paymentTerms}
                      onChange={e => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}
                    >
                      <option value="Cash on Delivery">Cash on Delivery</option>
                      <option value="Net 15 Days">Net 15 Days</option>
                      <option value="Net 30 Days">Net 30 Days</option>
                      <option value="Weekly Settlement">Weekly Settlement</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>PAYMENT STATUS</label>
                    <select
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={supplierForm.paymentStatus}
                      onChange={e => setSupplierForm({ ...supplierForm, paymentStatus: e.target.value })}
                    >
                      <option value="PAID">PAID</option>
                      <option value="PENDING_INVOICE">PENDING INVOICE</option>
                      <option value="CREDIT_30_DAYS">CREDIT 30 DAYS</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className={styles.btnNavAlt}
                    onClick={() => setShowSupplierModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.btnThermalPrint}
                    style={{ minWidth: '140px' }}
                  >
                    {supplierForm.id ? 'Save Changes' : 'Add Supplier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            INVENTORY MODAL 5: RECIPE BOM & FOOD COSTING
           ══════════════════════════════════════════════════════════════════════ */}
        {showRecipeModal && (
          <div className={styles.crmModalBackdrop} onClick={() => setShowRecipeModal(false)}>
            <div className={styles.crmModalBox} style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
              <div className={styles.crmModalHeader}>
                <h3 className={styles.crmModalTitle}>
                  {recipeForm.id ? `📜 Edit Recipe BOM: ${recipeForm.menuItemName}` : '➕ Link Menu Dish to Recipe BOM'}
                </h3>
                <button
                  type="button"
                  className={styles.crmModalClose}
                  onClick={() => setShowRecipeModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveRecipeBOM} style={{ padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>MENU ITEM NAME *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Special Ghee Podi Roast"
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={recipeForm.menuItemName}
                      onChange={e => setRecipeForm({ ...recipeForm, menuItemName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>SELLING PRICE (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="120"
                      className={styles.posDiscountInput}
                      style={{ width: '100%', marginTop: '0.2rem' }}
                      value={recipeForm.sellingPrice}
                      onChange={e => setRecipeForm({ ...recipeForm, sellingPrice: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      INGREDIENT PORTIONS PER DISH (BOM) *
                    </label>
                    <button
                      type="button"
                      className={styles.btnStatusQuick}
                      style={{ background: '#0284c7', color: '#ffffff', padding: '0.2rem 0.5rem' }}
                      onClick={() => setRecipeForm({
                        ...recipeForm,
                        ingredients: [...recipeForm.ingredients, { invId: inventory[0]?.id || '', qty: 0.1, unit: inventory[0]?.unit || 'KG' }],
                      })}
                    >
                      + Add Ingredient
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {recipeForm.ingredients.map((ing, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          className={styles.posDiscountInput}
                          value={ing.invId}
                          onChange={e => {
                            const chosen = inventory.find(i => i.id === e.target.value);
                            const updated = [...recipeForm.ingredients];
                            updated[idx].invId = e.target.value;
                            if (chosen) updated[idx].unit = chosen.unit;
                            setRecipeForm({ ...recipeForm, ingredients: updated });
                          }}
                        >
                          {inventory.map(i => (
                            <option key={i.id} value={i.id}>{i.name} (₹{i.costPerUnit}/{i.unit})</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.001"
                          placeholder="Qty"
                          className={styles.posDiscountInput}
                          value={ing.qty}
                          onChange={e => {
                            const updated = [...recipeForm.ingredients];
                            updated[idx].qty = e.target.value;
                            setRecipeForm({ ...recipeForm, ingredients: updated });
                          }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {ing.unit}
                        </span>
                        {recipeForm.ingredients.length > 1 && (
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.1rem' }}
                            onClick={() => {
                              const updated = recipeForm.ingredients.filter((_, i) => i !== idx);
                              setRecipeForm({ ...recipeForm, ingredients: updated });
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className={styles.btnNavAlt}
                    onClick={() => setShowRecipeModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.btnThermalPrint}
                    style={{ minWidth: '150px' }}
                  >
                    Save Recipe BOM
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── Quick Restock Modal ─── */}
        {restockItem && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <form onSubmit={handleRestockSubmit} style={{
              background: 'var(--bg-card)',
              border: '2px solid var(--accent-blue)',
              borderRadius: '12px',
              padding: '1.5rem',
              width: '90%',
              maxWidth: '380px',
            }}>
              <h3 style={{ marginTop: 0, color: 'var(--accent-blue)' }}>Restock: {restockItem.name}</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Current Stock: {restockItem.currentStock} {restockItem.unit}
              </p>
              <input
                type="number"
                step="0.1"
                placeholder={`Quantity in ${restockItem.unit}`}
                required
                className={styles.posDiscountInput}
                style={{ width: '100%', marginBottom: '1rem' }}
                value={restockQty}
                onChange={e => setRestockQty(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className={styles.btnThermalPrint} style={{ flex: 1 }}>
                  Confirm Restock
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => setRestockItem(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── Quick Spoilage Modal ─── */}
        {spoilageItem && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <form onSubmit={handleSpoilageSubmit} style={{
              background: 'var(--bg-card)',
              border: '2px solid #dc2626',
              borderRadius: '12px',
              padding: '1.5rem',
              width: '90%',
              maxWidth: '380px',
            }}>
              <h3 style={{ marginTop: 0, color: '#dc2626' }}>Log Wastage: {spoilageItem.name}</h3>
              <input
                type="number"
                step="0.1"
                placeholder={`Wasted quantity (${spoilageItem.unit})`}
                required
                className={styles.posDiscountInput}
                style={{ width: '100%', marginBottom: '0.8rem' }}
                value={spoilageQty}
                onChange={e => setSpoilageQty(e.target.value)}
              />
              <select
                className={styles.posDiscountInput}
                style={{ width: '100%', marginBottom: '1rem' }}
                value={spoilageReason}
                onChange={e => setSpoilageReason(e.target.value)}
              >
                <option value="SPOILED">Spoiled / Sour Batter / Curdled Milk</option>
                <option value="EXPIRED">Expired Shelf Life</option>
                <option value="PREP_ERROR">Prep Trimming Loss</option>
                <option value="OVERCOOKED">Burnt / Overcooked in Pan</option>
              </select>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className={styles.btnThermalPrint} style={{ background: '#dc2626', flex: 1 }}>
                  Record Wastage
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => setSpoilageItem(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 7: DEVELOPER ADMIN HUB (ASWIN / AJ TECH SOLUTIONS)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'devhub' && currentUser.role === 'DEVELOPER_ADMIN' && (
          <div className={styles.devHubGrid}>
            <div className={styles.panelBox}>
              <h3>🛠️ Platform Feature Flags &amp; Toggles</h3>

              <div className={styles.toggleRow}>
                <div className={styles.toggleMeta}>
                  <span className={styles.toggleTitle}>System Maintenance Mode</span>
                  <span className={styles.toggleDesc}>Disables guest QR order placement during store closure</span>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={!!devSettings.maintenanceMode}
                    onChange={() => handleToggleFlag('maintenanceMode', devSettings.maintenanceMode)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.toggleRow}>
                <div className={styles.toggleMeta}>
                  <span className={styles.toggleTitle}>Swiggy &amp; Zomato Aggregator Sync</span>
                  <span className={styles.toggleDesc}>Unified webhook pipeline to route external delivery orders into KDS</span>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={!!devSettings.swiggyZomatoSync}
                    onChange={() => handleToggleFlag('swiggyZomatoSync', devSettings.swiggyZomatoSync)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.toggleRow}>
                <div className={styles.toggleMeta}>
                  <span className={styles.toggleTitle}>WhatsApp Receipt Automation</span>
                  <span className={styles.toggleDesc}>Dispatches digital PDF receipt to guest mobile on bill settlement</span>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={!!devSettings.whatsappReceipts}
                    onChange={() => handleToggleFlag('whatsappReceipts', devSettings.whatsappReceipts)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.toggleRow}>
                <div className={styles.toggleMeta}>
                  <span className={styles.toggleTitle}>Automatic KDS Thermal Print</span>
                  <span className={styles.toggleDesc}>Fires raw ESC/POS ticket to kitchen stations upon OTP confirmation</span>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={!!devSettings.autoPrintKds}
                    onChange={() => handleToggleFlag('autoPrintKds', devSettings.autoPrintKds)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>

            <div className={styles.panelBox}>
              <h3>👥 Granular RBAC Staff Directory</h3>
              <div className={styles.staffUserList}>
                {staffUsers.map(u => (
                  <div key={u.id} className={styles.staffUserRow}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{u.fullName}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                    <span
                      className={styles.userRoleBadge}
                      style={{ background: u.permissions?.badgeColor || '#64748b' }}
                    >
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 10: CUSTOMER CRM & LOYALTY DASHBOARD (11 COMPREHENSIVE REQUIREMENTS)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'crm' && (
          <div className={styles.crmWrap}>
            {/* Header Strip */}
            <div className={styles.crmHeader}>
              <div className={styles.crmHeaderLeft}>
                <div className={styles.crmTitleRow}>
                  <h2 className={styles.crmTitle}>
                    👥 Customer CRM &amp; Loyalty Hub
                  </h2>
                  <span className={styles.crmHeritageBadge}>Karaikudi Chettinad Circle</span>
                </div>
                <p className={styles.crmSubtitle}>
                  Track dining history, loyalty points, Chettinad preferences, feedback reviews, and targeted patron promotions.
                </p>
              </div>

              <div className={styles.crmHeaderActions}>
                <button
                  type="button"
                  className={styles.crmActionBtnSec}
                  onClick={() => setPrivacyMasked(prev => !prev)}
                  title="Mask/Unmask sensitive phone numbers and emails for front-desk privacy"
                >
                  {privacyMasked ? '👁️ Unmask Private Data' : '🔒 Mask Private Data'}
                </button>
                <button
                  type="button"
                  className={styles.crmActionBtnSec}
                  onClick={handleExportCrmCsv}
                  title="Export customer directory to CSV"
                >
                  📊 Export CSV
                </button>
                <button
                  type="button"
                  className={styles.crmActionBtnSec}
                  onClick={fetchCrmCustomers}
                  title="Refresh customer database"
                >
                  🔄 Refresh
                </button>
                <button
                  type="button"
                  className={styles.crmActionBtnPrimary}
                  onClick={() => setShowAddCustomerModal(true)}
                >
                  ➕ Register Customer
                </button>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className={styles.crmKpiGrid}>
              <div className={styles.crmKpiCard}>
                <div className={styles.crmKpiHeader}>
                  <span className={styles.crmKpiLabel}>Total Patrons</span>
                  <span className={styles.crmKpiIcon}>👥</span>
                </div>
                <div className={styles.crmKpiValue}>{crmSummary.totalCustomers || 0}</div>
                <div className={styles.crmKpiSubtext}>
                  <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{crmSummary.vipCount || 0} VIP Members</span> in circle
                </div>
              </div>

              <div className={styles.crmKpiCard}>
                <div className={styles.crmKpiHeader}>
                  <span className={styles.crmKpiLabel}>New Registrations</span>
                  <span className={styles.crmKpiIcon}>✨</span>
                </div>
                <div className={styles.crmKpiValue}>{crmSummary.newThisMonth || 0}</div>
                <div className={styles.crmKpiSubtext}>Joined this month in Karaikudi</div>
              </div>

              <div className={styles.crmKpiCard}>
                <div className={styles.crmKpiHeader}>
                  <span className={styles.crmKpiLabel}>Retention Rate</span>
                  <span className={styles.crmKpiIcon}>🔄</span>
                </div>
                <div className={styles.crmKpiValue}>{crmSummary.retentionRate || 0}%</div>
                <div className={styles.crmKpiSubtext}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>{crmSummary.returningCustomers || 0} repeat</span> dining guests
                </div>
              </div>

              <div className={styles.crmKpiCard}>
                <div className={styles.crmKpiHeader}>
                  <span className={styles.crmKpiLabel}>Loyalty Points Bank</span>
                  <span className={styles.crmKpiIcon}>⭐</span>
                </div>
                <div className={styles.crmKpiValue}>{(crmSummary.totalLoyaltyPoints || 0).toLocaleString()}</div>
                <div className={styles.crmKpiSubtext}>Total active points across tiers</div>
              </div>

              <div className={styles.crmKpiCard}>
                <div className={styles.crmKpiHeader}>
                  <span className={styles.crmKpiLabel}>Total Lifetime Spend</span>
                  <span className={styles.crmKpiIcon}>💰</span>
                </div>
                <div className={styles.crmKpiValue}>₹{(crmSummary.totalSpendAll || 0).toLocaleString()}</div>
                <div className={styles.crmKpiSubtext}>Across all QR &amp; POS orders</div>
              </div>

              <div className={styles.crmKpiCard}>
                <div className={styles.crmKpiHeader}>
                  <span className={styles.crmKpiLabel}>Average Bill Value</span>
                  <span className={styles.crmKpiIcon}>📈</span>
                </div>
                <div className={styles.crmKpiValue}>₹{Math.round(crmSummary.averageSpendPerCustomer || 0).toLocaleString()}</div>
                <div className={styles.crmKpiSubtext}>Average patron ticket size</div>
              </div>
            </div>

            {/* Main CRM Grid & Sidebar Layout */}
            <div className={styles.crmLayoutColumns}>
              {/* Left Column: Directory & Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Search & Segmentation Toolbar */}
                <div className={styles.crmControlsPanel}>
                  <div className={styles.crmFilterRow}>
                    <div className={styles.crmSearchBox}>
                      <span>🔍</span>
                      <input
                        type="text"
                        className={styles.crmSearchInput}
                        placeholder="Search by name, phone, CUST-ID, or email..."
                        value={crmSearch}
                        onChange={(e) => setCrmSearch(e.target.value)}
                      />
                      {crmSearch && (
                        <button
                          type="button"
                          onClick={() => setCrmSearch('')}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sort By:</span>
                      <select
                        className={styles.crmSortSelect}
                        value={crmSortBy}
                        onChange={(e) => setCrmSortBy(e.target.value)}
                      >
                        <option value="recent">Recently Visited</option>
                        <option value="spend">Highest Lifetime Spend</option>
                        <option value="visits">Most Visits</option>
                        <option value="points">Most Loyalty Points</option>
                      </select>
                    </div>
                  </div>

                  {/* Segment Filter Pills (Customer Segmentation Requirement) */}
                  <div className={styles.crmSegmentPills}>
                    <button
                      type="button"
                      className={`${styles.crmPill} ${crmSelectedSegment === 'ALL' ? styles.crmPillActive : ''}`}
                      onClick={() => setCrmSelectedSegment('ALL')}
                    >
                      All Customers
                      <span className={styles.crmPillCount}>{crmSegmentDistribution.ALL || 0}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.crmPill} ${crmSelectedSegment === 'NEW' ? styles.crmPillActive : ''}`}
                      onClick={() => setCrmSelectedSegment('NEW')}
                    >
                      🌱 New Customers
                      <span className={styles.crmPillCount}>{crmSegmentDistribution.NEW || 0}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.crmPill} ${crmSelectedSegment === 'REGULAR' ? styles.crmPillActive : ''}`}
                      onClick={() => setCrmSelectedSegment('REGULAR')}
                    >
                      🍛 Regular Patrons
                      <span className={styles.crmPillCount}>{crmSegmentDistribution.REGULAR || 0}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.crmPill} ${crmSelectedSegment === 'VIP' ? styles.crmPillActive : ''}`}
                      onClick={() => setCrmSelectedSegment('VIP')}
                    >
                      👑 VIP Chettiar Circle
                      <span className={styles.crmPillCount}>{crmSegmentDistribution.VIP || 0}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.crmPill} ${crmSelectedSegment === 'HIGH_SPENDING' ? styles.crmPillActive : ''}`}
                      onClick={() => setCrmSelectedSegment('HIGH_SPENDING')}
                    >
                      💎 High Spenders
                      <span className={styles.crmPillCount}>{crmSegmentDistribution.HIGH_SPENDING || 0}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.crmPill} ${crmSelectedSegment === 'INACTIVE' ? styles.crmPillActive : ''}`}
                      onClick={() => setCrmSelectedSegment('INACTIVE')}
                    >
                      ⏳ Inactive / Win-Back
                      <span className={styles.crmPillCount}>{crmSegmentDistribution.INACTIVE || 0}</span>
                    </button>
                  </div>
                </div>

                {/* Customer Cards Grid */}
                {crmLoading ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading customer profiles...
                  </div>
                ) : crmCustomers.length === 0 ? (
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)'
                  }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👥</div>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>No customers found</strong>
                    <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                      Try adjusting your search criteria or register a new customer profile.
                    </p>
                    <button
                      type="button"
                      className={styles.crmActionBtnPrimary}
                      style={{ margin: '1rem auto 0 auto' }}
                      onClick={() => setShowAddCustomerModal(true)}
                    >
                      ➕ Register First Customer
                    </button>
                  </div>
                ) : (
                  <div className={styles.crmCustomersGrid}>
                    {crmCustomers.map((cust) => {
                      const tierClass = cust.loyaltyTier === 'PLATINUM' ? styles.tierPlatinum
                        : cust.loyaltyTier === 'GOLD' ? styles.tierGold
                        : cust.loyaltyTier === 'SILVER' ? styles.tierSilver
                        : styles.tierBronze;

                      const segClass = cust.segment === 'VIP' ? styles.segmentVIP
                        : cust.segment === 'HIGH_SPENDING' ? styles.segmentHighSpend
                        : cust.segment === 'NEW' ? styles.segmentNew
                        : cust.segment === 'INACTIVE' ? styles.segmentInactive
                        : styles.segmentRegular;

                      return (
                        <div key={cust.id} className={styles.crmCustomerCard}>
                          {/* Card Top: Avatar, Name, ID, Badges */}
                          <div className={styles.crmCardTop}>
                            <div className={styles.crmAvatarRow}>
                              <div className={styles.crmAvatar}>
                                {cust.name ? cust.name.charAt(0).toUpperCase() : 'C'}
                              </div>
                              <div className={styles.crmCustomerMeta}>
                                <div className={styles.crmCustomerName}>
                                  {cust.name}
                                </div>
                                <span className={styles.crmIdTag}>
                                  {cust.customerId || cust.id}
                                </span>
                              </div>
                            </div>

                            <div className={styles.crmBadgeCluster}>
                              <span className={`${styles.crmTierBadge} ${tierClass}`}>
                                {cust.loyaltyTier || 'BRONZE'}
                              </span>
                              <span className={`${styles.crmSegmentBadge} ${segClass}`}>
                                {cust.segment === 'HIGH_SPENDING' ? 'HIGH SPEND' : cust.segment || 'REGULAR'}
                              </span>
                            </div>
                          </div>

                          {/* Contact Strip */}
                          <div className={styles.crmContactStrip}>
                            <div className={styles.crmContactRow}>
                              <span>📞 {privacyMasked ? maskPhone(cust.phone, true) : cust.phone}</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Reg: {cust.registeredAt ? new Date(cust.registeredAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            {cust.email && (
                              <div className={styles.crmContactRow}>
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  ✉️ {privacyMasked ? maskEmail(cust.email, true) : cust.email}
                                </span>
                              </div>
                            )}
                            {cust.address && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                📍 {cust.address}
                              </div>
                            )}
                          </div>

                          {/* Metrics Strip (Visit Tracking & Spend) */}
                          <div className={styles.crmMetricsRow}>
                            <div className={styles.crmMetricItem}>
                              <span className={styles.crmMetricLabel}>Visits</span>
                              <span className={styles.crmMetricVal}>{cust.visits || 0}</span>
                            </div>
                            <div className={styles.crmMetricItem}>
                              <span className={styles.crmMetricLabel}>Total Spend</span>
                              <span className={styles.crmMetricVal} style={{ color: '#10b981' }}>
                                ₹{cust.totalSpend || 0}
                              </span>
                            </div>
                            <div className={styles.crmMetricItem}>
                              <span className={styles.crmMetricLabel}>Avg Bill</span>
                              <span className={styles.crmMetricVal}>
                                ₹{Math.round(cust.averageBillValue || 0)}
                              </span>
                            </div>
                            <div className={styles.crmMetricItem}>
                              <span className={styles.crmMetricLabel}>Points</span>
                              <span className={styles.crmMetricVal} style={{ color: '#f59e0b' }}>
                                ⭐ {cust.loyaltyPoints || 0}
                              </span>
                            </div>
                          </div>

                          {/* Frequently Ordered Delicacies */}
                          {cust.favoriteDishes && cust.favoriteDishes.length > 0 && (
                            <div className={styles.crmFavDishes}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                                Favorites:
                              </span>
                              {cust.favoriteDishes.slice(0, 2).map((fav, i) => (
                                <span key={i} className={styles.crmFavChip}>
                                  🍛 {fav.title} ({fav.count}x)
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Upcoming Birthday Notice */}
                          {cust.birthday && (
                            <div style={{ fontSize: '0.7rem', color: '#ea580c', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              🎂 Birthday: {new Date(cust.birthday).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              {cust.promotions && cust.promotions.length > 0 && (
                                <span style={{ color: '#10b981', fontWeight: 700, marginLeft: 'auto' }}>
                                  🎁 {cust.promotions.length} Active Offers
                                </span>
                              )}
                            </div>
                          )}

                          {/* Quick Actions */}
                          <div className={styles.crmCardActions}>
                            <button
                              type="button"
                              className={`${styles.crmBtnSm} ${styles.crmBtnSmPrimary}`}
                              onClick={() => {
                                setCrmSelectedCustomer(cust);
                                setCrmModalTab('OVERVIEW');
                                setShowCustomerDetailsModal(true);
                              }}
                            >
                              👁️ Profile &amp; History
                            </button>
                            <button
                              type="button"
                              className={`${styles.crmBtnSm} ${styles.crmBtnSmOutline}`}
                              onClick={() => {
                                setCrmSelectedCustomer(cust);
                                setShowAdjustLoyaltyModal(true);
                              }}
                              title="Earn or redeem loyalty reward points"
                            >
                              ⭐ Points
                            </button>
                            <button
                              type="button"
                              className={`${styles.crmBtnSm} ${styles.crmBtnSmOutline}`}
                              onClick={() => {
                                setCrmSelectedCustomer(cust);
                                setShowAddFeedbackModal(true);
                              }}
                              title="Log customer feedback & review"
                            >
                              💬 Feedback
                            </button>
                            <button
                              type="button"
                              className={`${styles.crmBtnSm} ${styles.crmBtnSmOutline}`}
                              onClick={() => {
                                setCrmSelectedCustomer(cust);
                                setShowCreateOfferModal(true);
                              }}
                              title="Issue targeted coupon or birthday offer"
                            >
                              🎁 Offer
                            </button>
                            <button
                              type="button"
                              className={`${styles.crmBtnSm} ${styles.crmBtnSmOutline}`}
                              onClick={() => {
                                setCrmSelectedCustomer(cust);
                                setShowAddNoteModal(true);
                              }}
                              title="Add internal note or dietary preference"
                            >
                              📝 Note
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: VIP Leaderboard & Loyalty Insights */}
              <div className={styles.crmSidebar}>
                {/* Top 5 VIP Leaderboard */}
                <div className={styles.crmSideCard}>
                  <h4 className={styles.crmSideTitle}>
                    <span>👑 Top VIP Patrons</span>
                    <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>Lifetime Spenders</span>
                  </h4>

                  <div className={styles.crmLeaderboardList}>
                    {(crmTopCustomers && crmTopCustomers.length > 0 ? crmTopCustomers : crmCustomers.slice(0, 5)).map((top, idx) => (
                      <div
                        key={top.id}
                        className={styles.crmLeaderboardItem}
                        onClick={() => {
                          setCrmSelectedCustomer(top);
                          setCrmModalTab('OVERVIEW');
                          setShowCustomerDetailsModal(true);
                        }}
                      >
                        <div className={styles.crmLeaderRank}>#{idx + 1}</div>
                        <div className={styles.crmLeaderInfo}>
                          <span className={styles.crmLeaderName}>{top.name}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {top.visits || 0} visits • {top.loyaltyTier || 'BRONZE'}
                          </span>
                        </div>
                        <div className={styles.crmLeaderSpend}>
                          ₹{(top.totalSpend || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Loyalty Tier Progress Breakdown */}
                <div className={styles.crmSideCard}>
                  <h4 className={styles.crmSideTitle}>
                    <span>⭐ Tier Distribution</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Karaikudi Circle</span>
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.78rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700, color: '#3730a3' }}>👑 Platinum (1500+ pts)</span>
                        <span style={{ fontWeight: 800 }}>{crmCustomers.filter(c => c.loyaltyTier === 'PLATINUM').length} members</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ width: `${(crmCustomers.filter(c => c.loyaltyTier === 'PLATINUM').length / Math.max(1, crmCustomers.length)) * 100}%`, height: '100%', background: '#818cf8' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700, color: '#92400e' }}>🥇 Gold (800 - 1499 pts)</span>
                        <span style={{ fontWeight: 800 }}>{crmCustomers.filter(c => c.loyaltyTier === 'GOLD').length} members</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ width: `${(crmCustomers.filter(c => c.loyaltyTier === 'GOLD').length / Math.max(1, crmCustomers.length)) * 100}%`, height: '100%', background: '#f59e0b' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700, color: '#334155' }}>🥈 Silver (300 - 799 pts)</span>
                        <span style={{ fontWeight: 800 }}>{crmCustomers.filter(c => c.loyaltyTier === 'SILVER').length} members</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ width: `${(crmCustomers.filter(c => c.loyaltyTier === 'SILVER').length / Math.max(1, crmCustomers.length)) * 100}%`, height: '100%', background: '#94a3b8' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700, color: '#9a3412' }}>🥉 Bronze (0 - 299 pts)</span>
                        <span style={{ fontWeight: 800 }}>{crmCustomers.filter(c => c.loyaltyTier === 'BRONZE' || !c.loyaltyTier).length} members</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ width: `${(crmCustomers.filter(c => c.loyaltyTier === 'BRONZE' || !c.loyaltyTier).length / Math.max(1, crmCustomers.length)) * 100}%`, height: '100%', background: '#f97316' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chettinad Hospitality Perks Summary */}
                <div className={styles.crmSideCard} style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(139,92,246,0.06))' }}>
                  <h4 className={styles.crmSideTitle}>
                    <span>🧈 Chettinad Perks</span>
                    <span style={{ fontSize: '0.72rem', color: '#ea580c' }}>Active Rules</span>
                  </h4>
                  <ul style={{ paddingLeft: '1.1rem', margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <li><strong>10% Points Back:</strong> ₹10 spent = 1 Loyalty Point (1 pt = ₹1 discount).</li>
                    <li><strong>Free Filter Coffee:</strong> Complimentary degree coffee on every 5th visit.</li>
                    <li><strong>Birthday Special:</strong> 15% dining discount &amp; festive Chettinad sweet box.</li>
                    <li><strong>VIP Table Priority:</strong> Guaranteed AC Hall reserved seating.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 18: RESTAURANT ADMIN SETTINGS SUITE (ALL 18 CONFIG MODULES)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <SettingsDashboard currentUser={currentUser} />
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 19: CLIENT WEBSITE MANAGEMENT DASHBOARD (CMS)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'cms' && (
          <WebsiteCmsDashboard currentUser={currentUser} />
        )}
      </main>

      {/* ─── Add Menu Item Modal (Requirement 10) ─── */}
      {showAddItemModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
        }}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch('/api/admin/menu', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'ADD_ITEM', item: newItemData }),
                });
                const data = await res.json();
                if (data.success) {
                  showNotice(`Added ${newItemData.title} to live menu!`);
                  setShowAddItemModal(false);
                  setNewItemData({ title: '', tamilTitle: '', category: 'Tiffin', price: '', description: '' });
                  fetchAnalytics();
                } else {
                  showNotice(data.error || 'Failed to add item', true);
                }
              } catch (err) {
                showNotice('Error creating menu item', true);
              }
            }}
            style={{
              background: 'var(--bg-card)',
              border: '2px solid var(--accent-blue)',
              borderRadius: '14px',
              padding: '1.5rem',
              width: '90%',
              maxWidth: '440px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.9)',
            }}
          >
            <h3 style={{ marginTop: 0, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ➕ Add Menu Delicacy
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Publish new items directly to the TVSE Touch POS and QR guest menu.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Dish Title (English)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chettinad Nei Idli (4 pcs)"
                  className={styles.posDiscountInput}
                  style={{ width: '100%', marginTop: '0.2rem' }}
                  value={newItemData.title}
                  onChange={e => setNewItemData({ ...newItemData, title: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Category</label>
                <select
                  className={styles.posDiscountInput}
                  style={{ width: '100%', marginTop: '0.2rem' }}
                  value={newItemData.category}
                  onChange={e => setNewItemData({ ...newItemData, category: e.target.value })}
                >
                  <option value="Tiffin">Tiffin (Dosa, Idli, Pongal)</option>
                  <option value="Meals">Chettinad Heritage Meals</option>
                  <option value="Curries">Traditional Kulambu &amp; Curries</option>
                  <option value="Snacks">Chettinad Savories &amp; Snacks</option>
                  <option value="Beverages">Kumbakonam Coffee &amp; Drinks</option>
                  <option value="Desserts">Traditional Sweets &amp; Payasam</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Price (₹ INR)</label>
                <input
                  type="number"
                  required
                  min="5"
                  placeholder="e.g. 110"
                  className={styles.posDiscountInput}
                  style={{ width: '100%', marginTop: '0.2rem' }}
                  value={newItemData.price}
                  onChange={e => setNewItemData({ ...newItemData, price: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Description / Ingredients</label>
                <input
                  type="text"
                  placeholder="e.g. Steamed mini idlis steeped in hot Chettinad sambar & cow ghee"
                  className={styles.posDiscountInput}
                  style={{ width: '100%', marginTop: '0.2rem' }}
                  value={newItemData.description}
                  onChange={e => setNewItemData({ ...newItemData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" className={styles.btnThermalPrint} style={{ flex: 1 }}>
                  ✓ Publish Dish
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => setShowAddItemModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ─── Profile Settings Modal (Requirement 12) ─── */}
      {showProfileModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--accent-purple)',
            borderRadius: '14px',
            padding: '1.5rem',
            width: '90%',
            maxWidth: '420px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.9)',
          }}>
            <h3 style={{ marginTop: 0, color: 'var(--accent-purple)' }}>⚙️ Admin Profile Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
              <div>
                <label style={{ color: 'var(--text-muted)' }}>Full Name</label>
                <input
                  type="text"
                  disabled
                  value={currentUser.name}
                  className={styles.posDiscountInput}
                  style={{ width: '100%', marginTop: '0.2rem', opacity: 0.8 }}
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-muted)' }}>Email ID</label>
                <input
                  type="text"
                  disabled
                  value={currentUser.email}
                  className={styles.posDiscountInput}
                  style={{ width: '100%', marginTop: '0.2rem', opacity: 0.8 }}
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-muted)' }}>Current Role</label>
                <div style={{ marginTop: '0.25rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                    background: currentUser.badge || '#7c3aed',
                    color: '#ffffff'
                  }}>
                    {currentUser.role}
                  </span>
                </div>
              </div>
              <div>
                <label style={{ color: 'var(--text-muted)' }}>Quick POS PIN (4-digit)</label>
                <input
                  type="password"
                  maxLength="4"
                  defaultValue="2026"
                  className={styles.posDiscountInput}
                  style={{ width: '100%', marginTop: '0.2rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.btnThermalPrint}
                  style={{ flex: 1 }}
                  onClick={() => {
                    showNotice('Profile settings saved successfully');
                    setShowProfileModal(false);
                  }}
                >
                  Save Settings
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => setShowProfileModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Custom Date Range Modal (Requirement 11) ─── */}
      {showCustomDateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--accent-cyan)',
            borderRadius: '14px',
            padding: '1.5rem',
            width: '90%',
            maxWidth: '380px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.9)',
          }}>
            <h3 style={{ marginTop: 0, color: 'var(--accent-cyan)' }}>📅 Select Custom Date Range</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
              <div>
                <label style={{ color: 'var(--text-muted)' }}>Start Date</label>
                <input
                  type="date"
                  className={styles.posDiscountInput}
                  style={{ width: '100%', marginTop: '0.2rem' }}
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-muted)' }}>End Date</label>
                <input
                  type="date"
                  className={styles.posDiscountInput}
                  style={{ width: '100%', marginTop: '0.2rem' }}
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.btnThermalPrint}
                  style={{ flex: 1 }}
                  onClick={() => {
                    setSelectedPeriod('custom');
                    fetchAnalytics('custom');
                    showNotice(`Filtered custom date range`);
                    setShowCustomDateModal(false);
                  }}
                >
                  Apply Filter
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => setShowCustomDateModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 1. Dish Customizer Modal (Requirement 4: Variants & Add-ons) ─── */}
      {customizingDish && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '480px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#2563eb' }}>
                  ✨ Customize: {customizingDish.title}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {customizingDish.tamilTitle} • Base Price: ₹{customizingDish.price}
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setCustomizingDish(null)}
              >
                ✕
              </button>
            </div>

            {/* Variants */}
            {customizingDish.variants && customizingDish.variants.length > 0 && (
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
                  SELECT VARIANT
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {customizingDish.variants.map((v, i) => {
                    const isSelected = customVariant?.name === v.name;
                    return (
                      <div
                        key={i}
                        className={`${styles.posOptionPill} ${isSelected ? styles.posOptionPillActive : ''}`}
                        onClick={() => setCustomVariant(v)}
                      >
                        <span>{isSelected ? '● ' : '○ '} {v.name}</span>
                        <span style={{ fontWeight: 800 }}>
                          {v.priceDiff > 0 ? `+₹${v.priceDiff}` : 'Standard'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add-ons */}
            {customizingDish.addOns && customizingDish.addOns.length > 0 && (
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
                  SELECT CHEF ADD-ONS (OPTIONAL)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {customizingDish.addOns.map((a, i) => {
                    const isChecked = customAddOns.some(x => x.name === a.name);
                    return (
                      <div
                        key={i}
                        className={`${styles.posOptionPill} ${isChecked ? styles.posOptionPillActive : ''}`}
                        onClick={() => {
                          if (isChecked) {
                            setCustomAddOns(prev => prev.filter(x => x.name !== a.name));
                          } else {
                            setCustomAddOns(prev => [...prev, a]);
                          }
                        }}
                      >
                        <span>{isChecked ? '☑ ' : '☐ '} {a.name}</span>
                        <span style={{ fontWeight: 800, color: '#10b981' }}>+₹{a.price}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Instructions / Notes */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
                SPECIAL COOKING INSTRUCTIONS FOR CHEF
              </label>
              <input
                type="text"
                placeholder="e.g. Extra crispy roast, less spicy, separate sambar..."
                className={styles.posDiscountInput}
                style={{ width: '100%', height: '36px' }}
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
              />
            </div>

            {/* Confirm & Calculated Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Dish Price</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981' }}>
                  ₹{customizingDish.price + (customVariant?.priceDiff || 0) + customAddOns.reduce((s, a) => s + a.price, 0)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.btnThermalPrint}
                  onClick={handleConfirmCustomization}
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
                >
                  ✓ Add to Cart
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => setCustomizingDish(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. Table Selection Modal (Requirement 3: Dining Sessions) ─── */}
      {showTablePickerModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '640px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#2563eb' }}>
                  🪑 Select Dining Table (16 Tables)
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Ground Floor • AC Royal Hall • Chettinad Veranda
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowTablePickerModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.posTableModalGrid}>
              {(posData.tables && posData.tables.length > 0 ? posData.tables : Array.from({ length: 16 }, (_, i) => ({
                id: `tbl_${i+1}`,
                tableNumber: String(i + 1).padStart(2, '0'),
                capacity: i < 8 ? 4 : (i < 14 ? 6 : 2),
                status: i === 1 || i === 4 ? 'OCCUPIED' : 'AVAILABLE',
                subtotal: i === 1 ? 520 : (i === 4 ? 310 : 0),
                section: i < 8 ? 'GROUND_FLOOR' : (i < 14 ? 'AC_HALL' : 'VERANDA'),
              }))).map(t => {
                const isSelected = selectedTable?.tableNumber === t.tableNumber;
                const isOccupied = t.status === 'OCCUPIED' || t.subtotal > 0;
                const isCleaning = t.status === 'CLEANING';
                return (
                  <div
                    key={t.id || t.tableNumber}
                    className={`${styles.posTableModalCard} ${isSelected ? styles.posTableModalCardSelected : ''}`}
                    onClick={() => {
                      setSelectedTable(t);
                      setPosOrderType('DINE_IN');
                      setShowTablePickerModal(false);
                      showNotice(`Selected Table #${t.tableNumber}`);
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        Table {t.tableNumber}
                      </strong>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '9999px',
                        background: isOccupied ? 'rgba(59, 130, 246, 0.2)' : (isCleaning ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.2)'),
                        color: isOccupied ? '#3b82f6' : (isCleaning ? '#eab308' : '#10b981'),
                      }}>
                        {isOccupied ? 'OCCUPIED' : (isCleaning ? 'CLEANING' : 'OPEN')}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      👥 {t.capacity || 4} Seater • {t.section?.replace('_', ' ') || 'Hall'}
                    </div>

                    {isOccupied && (
                      <div style={{
                        marginTop: '0.25rem',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: '#10b981',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span>Running:</span>
                        <span>₹{t.subtotal || 0}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className={styles.btnNavAlt}
                onClick={() => setShowTablePickerModal(false)}
              >
                Close Table Grid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. Customer Directory & Quick Add Modal (Requirement 5) ─── */}
      {showCustomerPickerModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '520px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#8b5cf6' }}>
                  👥 Customer CRM Directory
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Attach guest profile for loyalty visits, GST billing & WhatsApp slip
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowCustomerPickerModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Quick Add Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCustomerName) return;
                const newCust = {
                  id: `cust_${Date.now()}`,
                  name: newCustomerName,
                  phone: newCustomerPhone,
                  visits: 1,
                  totalSpend: 0,
                  tag: 'New Guest'
                };
                setPosCustomer(newCust);
                showNotice(`Guest profile set: ${newCustomerName}`);
                setNewCustomerName('');
                setNewCustomerPhone('');
                setShowCustomerPickerModal(false);
              }}
              style={{
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#8b5cf6' }}>
                ➕ Quick Add New Guest
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input
                  type="text"
                  required
                  placeholder="Guest Full Name"
                  className={styles.posDiscountInput}
                  value={newCustomerName}
                  onChange={e => setNewCustomerName(e.target.value)}
                />
                <input
                  type="tel"
                  placeholder="Phone (10 digits)"
                  className={styles.posDiscountInput}
                  value={newCustomerPhone}
                  onChange={e => setNewCustomerPhone(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className={styles.btnThermalPrint}
                style={{ padding: '0.5rem', fontSize: '0.8rem', background: '#8b5cf6' }}
              >
                ✓ Save &amp; Select Guest
              </button>
            </form>

            {/* Existing Customers Directory */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>
                EXISTING REPEAT CUSTOMERS
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '240px', overflowY: 'auto' }}>
                {/* Walk-in Option */}
                <div
                  className={styles.posCustomerRow}
                  onClick={() => {
                    setPosCustomer({ name: 'Walk-in Guest', phone: '', tag: 'Walk-in' });
                    setShowCustomerPickerModal(false);
                    showNotice('Reset to Walk-in Guest');
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>🚶 Walk-in Guest</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Default anonymous POS walk-in</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 700 }}>Select</span>
                </div>

                {(posData.customers || []).map(c => (
                  <div
                    key={c.id}
                    className={styles.posCustomerRow}
                    onClick={() => {
                      setPosCustomer(c);
                      setShowCustomerPickerModal(false);
                      showNotice(`Selected Customer: ${c.name}`);
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{c.name}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        📞 {c.phone} • {c.visits || 1} Visits • Spent ₹{c.totalSpend || 0}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      background: 'rgba(139, 92, 246, 0.15)',
                      color: '#8b5cf6',
                    }}>
                      {c.tag || 'Regular'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className={styles.btnNavAlt}
                onClick={() => setShowCustomerPickerModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. Table QR Orders Drawer / Modal (Requirement 7) ─── */}
      {showQrOrdersModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '580px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#10b981' }}>
                  📱 Customer QR Table Orders
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Self-service orders placed from smartphone web menu via table QR code
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowQrOrdersModal(false)}
              >
                ✕
              </button>
            </div>

            {(!posData.qrOrders || posData.qrOrders.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                📭 No pending customer QR orders at this moment.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '380px', overflowY: 'auto' }}>
                {posData.qrOrders.map(q => (
                  <div key={q.id} className={styles.posQrOrderCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          Table #{q.tableNumber} • {q.customerName || 'Guest'}
                        </strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Order ID: {q.id} • Placed {new Date(q.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <span
                        className={styles.posOtpBadge}
                        style={{
                          background: q.otpVerified ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                          color: q.otpVerified ? '#10b981' : '#eab308',
                        }}
                      >
                        {q.otpVerified ? `✓ OTP: ${q.otp || '7087'} (VERIFIED)` : `⏳ OTP: ${q.otp || '7087'} (PENDING)`}
                      </span>
                    </div>

                    {/* Items Breakdown */}
                    <div style={{
                      background: 'var(--bg-card)',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem'
                    }}>
                      {(q.items || []).map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{it.quantity}x {it.title} {it.variant ? `(${it.variant})` : ''}</span>
                          <span style={{ fontWeight: 700 }}>₹{it.price * it.quantity}</span>
                        </div>
                      ))}
                      <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.25rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                        <span>QR Order Total</span>
                        <span style={{ color: '#10b981' }}>₹{q.subtotal}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={styles.btnPunchKot}
                      onClick={() => handleMergeQrOrder(q.id)}
                      style={{ padding: '0.55rem', fontSize: '0.82rem' }}
                    >
                      ✓ Approve &amp; Merge into Table #{q.tableNumber} POS
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className={styles.btnNavAlt}
                onClick={() => setShowQrOrdersModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. Held Orders Queue Modal (Requirement 17) ─── */}
      {showHeldOrdersModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '520px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#3b82f6' }}>
                  ⏸️ Parked / Held Orders Queue
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Resume incomplete carts without losing customer items or seat data
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowHeldOrdersModal(false)}
              >
                ✕
              </button>
            </div>

            {(!posData.heldOrders || posData.heldOrders.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                📭 No orders currently on hold.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto' }}>
                {posData.heldOrders.map(h => (
                  <div
                    key={h.id}
                    style={{
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {h.orderType} • Table #{h.tableNumber}
                      </strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Guest: {h.customer?.name || 'Walk-in'} • {h.items?.length || 0} items • Parked {new Date(h.parkedAt).toLocaleTimeString()}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>
                        ₹{h.subtotal}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.btnThermalPrint}
                      onClick={() => handleResumeOrder(h)}
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                    >
                      ▶ Resume Cart
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className={styles.btnNavAlt}
                onClick={() => setShowHeldOrdersModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. Cashier Shift Management Modal (Requirement 14: X/Z-Report) ─── */}
      {showShiftModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '580px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#0284c7' }}>
                  💼 Cashier Shift Management &amp; Register
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Opening float, cash reconciliations, petty payouts &amp; Z-Report
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowShiftModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Current Shift Summary Cards */}
            {posData.currentShift ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.5rem',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ background: 'var(--bg-card-subtle)', padding: '0.5rem', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Opening Float</div>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      ₹{posData.currentShift.openingFloat?.toFixed(2) || '2000.00'}
                    </strong>
                  </div>
                  <div style={{ background: 'var(--bg-card-subtle)', padding: '0.5rem', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Cash Sales</div>
                    <strong style={{ fontSize: '0.95rem', color: '#10b981' }}>
                      ₹{posData.currentShift.cashSales?.toFixed(2) || '0.00'}
                    </strong>
                  </div>
                  <div style={{ background: 'var(--bg-card-subtle)', padding: '0.5rem', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-muted)' }}>UPI Sales</div>
                    <strong style={{ fontSize: '0.95rem', color: '#38bdf8' }}>
                      ₹{posData.currentShift.upiSales?.toFixed(2) || '0.00'}
                    </strong>
                  </div>
                  <div style={{ background: 'var(--bg-card-subtle)', padding: '0.5rem', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Total Sold</div>
                    <strong style={{ fontSize: '0.95rem', color: '#a855f7' }}>
                      ₹{((posData.currentShift.cashSales || 0) + (posData.currentShift.upiSales || 0) + (posData.currentShift.cardSales || 0)).toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* Petty Cash Payout Form */}
                <div style={{
                  background: 'var(--bg-card-subtle)',
                  padding: '0.65rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}>
                  <strong style={{ fontSize: '0.78rem', color: '#ef4444' }}>
                    💸 Record Petty Cash Payout (Drawer Withdrawal)
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: '0.4rem' }}>
                    <input
                      type="number"
                      placeholder="Amount ₹"
                      className={styles.posDiscountInput}
                      value={shiftPayoutAmt}
                      onChange={e => setShiftPayoutAmt(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Reason (e.g. Milk, Coriander, Ice)"
                      className={styles.posDiscountInput}
                      value={shiftPayoutDesc}
                      onChange={e => setShiftPayoutDesc(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.btnThermalPrint}
                      onClick={handleShiftPayout}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', background: '#ef4444' }}
                    >
                      Deduct
                    </button>
                  </div>
                  {(posData.currentShift.payouts && posData.currentShift.payouts.length > 0) && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Total Payouts: -₹{posData.currentShift.payouts.reduce((s, p) => s + p.amount, 0)} ({posData.currentShift.payouts.length} transactions)
                    </div>
                  )}
                </div>

                {/* Close Shift & Reconciliation */}
                <div style={{
                  background: 'var(--bg-card-subtle)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #3b82f6',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                      🔒 Close Cashier Register (Z-Report)
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Expected Drawer Cash: <strong style={{ color: '#10b981' }}>
                        ₹{(
                          (posData.currentShift.openingFloat || 0) +
                          (posData.currentShift.cashSales || 0) -
                          ((posData.currentShift.payouts || []).reduce((s, p) => s + p.amount, 0))
                        ).toFixed(2)}
                      </strong>
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
                    <input
                      type="number"
                      placeholder="Enter Actual Counted Cash in Drawer (₹)"
                      className={styles.posDiscountInput}
                      value={shiftCloseCash}
                      onChange={e => setShiftCloseCash(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.btnPunchKot}
                      onClick={handleCloseShift}
                      style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                    >
                      Verify &amp; Close Shift
                    </button>
                  </div>

                  {shiftCloseCash && (
                    <div style={{ fontSize: '0.78rem' }}>
                      {(() => {
                        const expected = (posData.currentShift.openingFloat || 0) + (posData.currentShift.cashSales || 0) - ((posData.currentShift.payouts || []).reduce((s, p) => s + p.amount, 0));
                        const diff = Number(shiftCloseCash) - expected;
                        return (
                          <span style={{ color: diff >= 0 ? '#10b981' : '#ef4444', fontWeight: 800 }}>
                            {diff >= 0 ? `✓ Cash Surplus / Balanced: +₹${diff.toFixed(2)}` : `⚠️ Cash Shortage: -₹${Math.abs(diff).toFixed(2)}`}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                No active cashier shift session found. Opening register automatically on next bill.
              </div>
            )}

            {/* Printable Z-Report Preview */}
            {shiftReportReceipt && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>🖨️ Shift Z-Report Receipt Slip</strong>
                  <button
                    type="button"
                    className={styles.btnThermalPrint}
                    onClick={handlePrintReceipt}
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                  >
                    Print Z-Report
                  </button>
                </div>
                <div className={styles.thermalReceiptBox}>
                  <pre>{shiftReportReceipt}</pre>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className={styles.btnNavAlt}
                onClick={() => setShowShiftModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. Bills History, Refunds & Voids Modal (Requirements 8, 12, 13) ─── */}
      {showBillsHistoryModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '680px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#06b6d4' }}>
                  🧾 Bills History, Thermal Reprints &amp; Audit Logs
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Reprint 80mm thermal slips, authorize bill voids &amp; process refunds
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowBillsHistoryModal(false);
                    setShowManualBillModal(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  🧾 + New Manual Bill
                </button>
                <button
                  type="button"
                  className={styles.posModalCloseBtn}
                  onClick={() => setShowBillsHistoryModal(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            {(!posData.recentBills || posData.recentBills.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                📭 No bills settled yet for this shift.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '380px', overflowY: 'auto' }}>
                {posData.recentBills.map(b => (
                  <div
                    key={b.id || b.billNumber}
                    style={{
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          #{b.billNumber}
                        </strong>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.4rem',
                          borderRadius: '9999px',
                          background: b.status === 'SETTLED' ? 'rgba(16, 185, 129, 0.15)' : (b.status === 'VOIDED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)'),
                          color: b.status === 'SETTLED' ? '#10b981' : (b.status === 'VOIDED' ? '#ef4444' : '#eab308'),
                        }}>
                          {b.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Table #{b.tableNumber} • {b.customer?.name || 'Walk-in'} • {b.paymentMode || 'CASH'} • {new Date(b.createdAt).toLocaleTimeString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1rem', color: '#10b981' }}>
                        ₹{b.totalAmount}
                      </strong>
                      <button
                        type="button"
                        className={styles.btnThermalPrint}
                        onClick={() => {
                          if (b.thermalSlip) {
                            setActiveReceipt(b.thermalSlip);
                            setLastSettledBill(b);
                            setShowBillsHistoryModal(false);
                            showNotice(`Loaded Bill #${b.billNumber} for Thermal Printing`);
                          } else {
                            showNotice('Generating thermal slip...');
                          }
                        }}
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      >
                        🖨️ Slip
                      </button>
                      <button
                        type="button"
                        className={styles.btnNavAlt}
                        onClick={() => {
                          setEditBillTarget({ bill: b, thermalSlip: b.thermalSlip });
                          setShowBillsHistoryModal(false);
                        }}
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderColor: '#38bdf8', color: '#38bdf8', fontWeight: 'bold' }}
                        title="Edit items, customer, discount, or customize slip before printing"
                      >
                        ✏️ Edit &amp; Print
                      </button>

                      {b.status === 'SETTLED' && (
                        <>
                          <button
                            type="button"
                            className={styles.btnNavAlt}
                            onClick={() => {
                              setVoidBillTarget(b);
                              setManagerPinAction({
                                type: 'VOID_BILL',
                                title: `Authorize Void for Bill #${b.billNumber}`,
                                onConfirm: handleVoidBill,
                              });
                              setShowManagerPinModal(true);
                            }}
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#ef4444' }}
                          >
                            ❌ Void
                          </button>
                          <button
                            type="button"
                            className={styles.btnNavAlt}
                            onClick={() => {
                              setRefundBillTarget(b);
                              setRefundAmountVal(String(b.totalAmount));
                              setManagerPinAction({
                                type: 'REFUND_BILL',
                                title: `Authorize Refund for Bill #${b.billNumber}`,
                                onConfirm: handleProcessRefund,
                              });
                              setShowManagerPinModal(true);
                            }}
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#eab308' }}
                          >
                            ↩️ Refund
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className={styles.btnNavAlt}
                onClick={() => setShowBillsHistoryModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. Split Bill & Partial Payment Modal (Requirement 11) ─── */}
      {showSplitModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '480px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#2563eb' }}>
                  ➗ Split Bill &amp; Partial Settlement
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Total Payable: <strong style={{ color: '#10b981' }}>₹{netPayable}</strong>
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowSplitModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Split Method Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
              <button
                type="button"
                className={`${styles.posOptionPill} ${splitMethod === 'EQUAL' ? styles.posOptionPillActive : ''}`}
                onClick={() => setSplitMethod('EQUAL')}
                style={{ justifyContent: 'center' }}
              >
                👥 Equal Split (N Guests)
              </button>
              <button
                type="button"
                className={`${styles.posOptionPill} ${splitMethod === 'CUSTOM' ? styles.posOptionPillActive : ''}`}
                onClick={() => setSplitMethod('CUSTOM')}
                style={{ justifyContent: 'center' }}
              >
                💳 Custom Multi-Tender
              </button>
            </div>

            {splitMethod === 'EQUAL' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  SELECT NUMBER OF DINERS:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[2, 3, 4, 5, 6].map(count => (
                    <button
                      key={count}
                      type="button"
                      className={`${styles.posCatFilterBtn} ${splitGuestsCount === count ? styles.posCatFilterBtnActive : ''}`}
                      onClick={() => setSplitGuestsCount(count)}
                      style={{ flex: 1, padding: '0.65rem 0', fontSize: '0.9rem' }}
                    >
                      {count} Guests
                    </button>
                  ))}
                </div>

                <div style={{
                  background: 'var(--bg-card-subtle)',
                  padding: '1rem',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Each Guest Pays</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981' }}>
                    ₹{Math.ceil(netPayable / splitGuestsCount)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    ({splitGuestsCount} × ₹{Math.ceil(netPayable / splitGuestsCount)} ≈ ₹{netPayable})
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.btnPunchKot}
                  onClick={() => {
                    setPaymentMode('SPLIT');
                    setShowSplitModal(false);
                    showNotice(`Bill split equally among ${splitGuestsCount} guests (₹${Math.ceil(netPayable / splitGuestsCount)} each)`);
                  }}
                >
                  ✓ Apply Equal Split
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.5rem 0' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Tender lines for Cash, UPI and Card:
                </span>
                {splitLines.map((line, idx) => (
                  <div key={line.id} style={{ display: 'grid', gridTemplateColumns: '90px 100px 1fr', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{line.label}</span>
                    <select
                      className={styles.posDiscountInput}
                      value={line.mode}
                      onChange={e => {
                        const copy = [...splitLines];
                        copy[idx].mode = e.target.value;
                        setSplitLines(copy);
                      }}
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Amount ₹"
                      className={styles.posDiscountInput}
                      value={line.amount}
                      onChange={e => {
                        const copy = [...splitLines];
                        copy[idx].amount = e.target.value;
                        setSplitLines(copy);
                      }}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  className={styles.btnPunchKot}
                  onClick={() => {
                    setPaymentMode('SPLIT');
                    setShowSplitModal(false);
                    showNotice('Custom multi-tender split applied');
                  }}
                >
                  ✓ Apply Multi-Tender Split
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 9. Manager PIN Authorization Modal (Requirement 18: RBAC) ─── */}
      {showManagerPinModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '380px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#ef4444' }}>
                  🔐 Manager Authorization
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {managerPinAction?.title || 'Restricted staff operation'}
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => {
                  setShowManagerPinModal(false);
                  setEnteredPin('');
                }}
              >
                ✕
              </button>
            </div>

            {/* Mandatory Reason Input for Voids or Refunds */}
            {managerPinAction?.type === 'VOID_BILL' && (
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>
                  MANDATORY VOID REASON
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer cancelled, duplicate punch..."
                  className={styles.posDiscountInput}
                  style={{ width: '100%', marginTop: '0.2rem' }}
                  value={voidReasonText}
                  onChange={e => setVoidReasonText(e.target.value)}
                />
              </div>
            )}

            {managerPinAction?.type === 'REFUND_BILL' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#eab308' }}>
                    REFUND AMOUNT (₹)
                  </label>
                  <input
                    type="number"
                    className={styles.posDiscountInput}
                    style={{ width: '100%', marginTop: '0.2rem' }}
                    value={refundAmountVal}
                    onChange={e => setRefundAmountVal(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#eab308' }}>
                    MANDATORY REFUND REASON
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Food quality dissatisfaction, spilled coffee..."
                    className={styles.posDiscountInput}
                    style={{ width: '100%', marginTop: '0.2rem' }}
                    value={refundReasonText}
                    onChange={e => setRefundReasonText(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* PIN Display */}
            <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Enter 4-Digit Manager PIN (Default: 1234)
              </div>
              <input
                type="password"
                maxLength="4"
                readOnly
                value={enteredPin}
                placeholder="••••"
                style={{
                  textAlign: 'center',
                  fontSize: '1.8rem',
                  letterSpacing: '0.4rem',
                  width: '160px',
                  background: 'var(--bg-input)',
                  border: '2px solid #ef4444',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  padding: '0.4rem',
                }}
              />
            </div>

            {/* TVSE Touch Screen Numpad */}
            <div className={styles.posKeypadGrid}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(k => (
                <button
                  key={k}
                  type="button"
                  className={styles.posKeypadBtn}
                  onClick={() => {
                    if (k === 'C') {
                      setEnteredPin('');
                    } else if (k === '⌫') {
                      setEnteredPin(prev => prev.slice(0, -1));
                    } else if (enteredPin.length < 4) {
                      setEnteredPin(prev => prev + k);
                    }
                  }}
                >
                  {k}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className={styles.btnPunchKot}
                style={{ flex: 1, background: '#ef4444' }}
                onClick={() => {
                  if (enteredPin === '1234' || currentUser.role === 'DEVELOPER_ADMIN' || currentUser.role === 'SUPER_ADMIN') {
                    setShowManagerPinModal(false);
                    if (managerPinAction?.onConfirm) {
                      managerPinAction.onConfirm();
                    }
                  } else {
                    showNotice('Invalid Manager PIN. Default is 1234', true);
                  }
                }}
              >
                ✓ Authorize Operation
              </button>
              <button
                type="button"
                className={styles.btnNavAlt}
                onClick={() => {
                  setShowManagerPinModal(false);
                  setEnteredPin('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── KDS 1: KOT 80mm ESC/POS Thermal Slip Modal (Requirement 12) ─── */}
      {kdsSelectedTicketForSlip && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '460px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#06b6d4' }}>
                  🖨️ KOT Thermal Ticket Slip
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  TVSE RP3200 Plus 80mm Station Kitchen Printer (Print #{kdsSelectedTicketForSlip.printCount || 1})
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setKdsSelectedTicketForSlip(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.thermalReceiptBox} style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <pre>{kdsSelectedTicketForSlip.thermalSlip}</pre>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className={styles.btnThermalPrint}
                style={{ flex: 1 }}
                onClick={() => {
                  window.print();
                  showNotice(`Printing KOT #${kdsSelectedTicketForSlip.kotNumber}...`);
                }}
              >
                🖨️ Direct Print KOT Slip
              </button>
              <button
                type="button"
                className={styles.btnNavAlt}
                onClick={() => setKdsSelectedTicketForSlip(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── KDS 2: KOT Cancellation Modal with Audit Reason (Requirement 11 & 15) ─── */}
      {kdsCancelTicketModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '420px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#ef4444' }}>
                  ❌ Cancel Kitchen Order (KOT)
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {kdsCancelTicketModal.kotNumber} • Table #{kdsCancelTicketModal.tableNumber}
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setKdsCancelTicketModal(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.65rem', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Ticket Summary:</div>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {kdsCancelTicketModal.items?.map(it => `${it.quantity}x ${it.title}`).join(', ')}
                </strong>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', display: 'block', marginBottom: '0.25rem' }}>
                  MANDATORY CANCELLATION REASON
                </label>
                <input
                  type="text"
                  placeholder="e.g. Guest changed mind, kitchen ingredient out of stock..."
                  className={styles.posDiscountInput}
                  style={{ width: '100%', height: '36px' }}
                  value={kdsCancelReason}
                  onChange={e => setKdsCancelReason(e.target.value)}
                />
              </div>

              {/* Manager PIN for Cashier/Waiter */}
              {(currentUser.role === 'CASHIER' || currentUser.role === 'WAITER') && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    ENTER MANAGER PIN (Required for {currentUser.role}):
                  </label>
                  <input
                    type="password"
                    maxLength="4"
                    placeholder="•••• (Default: 1234)"
                    className={styles.posDiscountInput}
                    style={{ width: '100%', height: '36px', textAlign: 'center', letterSpacing: '0.3rem' }}
                    value={kdsManagerPin}
                    onChange={e => setKdsManagerPin(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.btnPunchKot}
                  style={{ flex: 1, background: '#ef4444' }}
                  onClick={handleKdsCancelSubmit}
                >
                  ✓ Confirm KOT Cancellation
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => setKdsCancelTicketModal(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TABLE MANAGEMENT MODALS (ALL 20 REQUIREMENTS)
         ══════════════════════════════════════════════════════════════════════ */}

      {/* ─── 1: QR Standee Preview & Physical Print Modal (Requirements 4, 5) ─── */}
      {showQrStandeeModal && qrStandeeData && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '640px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#2563eb' }}>
                  📱 Table #{showQrStandeeModal.tableNumber} QR Standee Card
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {showQrStandeeModal.section?.replace('_', ' ')} • {showQrStandeeModal.capacity} Seats • Gokulam Smart Dine
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => {
                  setShowQrStandeeModal(null);
                  setQrStandeeData(null);
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Preview Mode Switcher */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  className={`${styles.floorSectionBtn} ${qrStandeePreviewMode === '4X6' ? styles.floorSectionBtnActive : ''}`}
                  onClick={() => setQrStandeePreviewMode('4X6')}
                >
                  🖼️ 4"x6" Acrylic Table Tent
                </button>
                <button
                  type="button"
                  className={`${styles.floorSectionBtn} ${qrStandeePreviewMode === '80MM' ? styles.floorSectionBtnActive : ''}`}
                  onClick={() => setQrStandeePreviewMode('80MM')}
                >
                  🧾 80mm ESC/POS Roll Paper
                </button>
              </div>

              {/* Preview Canvas */}
              <div className={styles.standeePreviewWrapper}>
                {qrStandeePreviewMode === '4X6' ? (
                  <div className={styles.standeeCardBox}>
                    <div style={{ fontSize: '0.68rem', letterSpacing: '0.12rem', color: '#dc2626', fontWeight: 900, textTransform: 'uppercase' }}>
                      Sri Gokulam Veg Restaurant
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#4b5563', margin: '2px 0 8px 0' }}>
                      Karaikudi Chettinad Heritage • Pure Vegetarian
                    </div>

                    <div style={{ background: '#dc2626', color: '#ffffff', padding: '0.25rem 0.85rem', borderRadius: '9999px', fontWeight: 900, fontSize: '0.9rem', marginBottom: '8px' }}>
                      TABLE #{showQrStandeeModal.tableNumber}
                    </div>

                    {/* Vector SVG Render */}
                    <div
                      dangerouslySetInnerHTML={{ __html: qrStandeeData.svgString }}
                      style={{ margin: '6px 0', background: '#ffffff', padding: '6px', borderRadius: '8px' }}
                    />

                    <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#111827', marginTop: '4px' }}>
                      Scan to Browse Menu &amp; Order
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#6b7280', margin: '2px 0 8px 0' }}>
                      No app download required • Instant Waiter Verification
                    </div>

                    <div style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.35rem 0.6rem', fontSize: '0.62rem', color: '#374151', width: '100%' }}>
                      📶 <strong>Guest Wi-Fi:</strong> SriGokulam_Guest • <strong>Pass:</strong> gokulam1985
                    </div>
                  </div>
                ) : (
                  <div className={styles.standeePaperRollBox}>
                    <div style={{ fontWeight: 900, fontSize: '0.85rem' }}>*** SRI GOKULAM VEG ***</div>
                    <div style={{ fontSize: '0.65rem' }}>TABLE QR ORDER CODE</div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, margin: '4px 0' }}>TABLE #{showQrStandeeModal.tableNumber}</div>
                    <div
                      dangerouslySetInnerHTML={{ __html: qrStandeeData.svgString }}
                      style={{ margin: '6px 0' }}
                    />
                    <div style={{ fontSize: '0.65rem' }}>Scan with camera to order</div>
                    <div style={{ fontSize: '0.62rem', color: '#4b5563' }}>URL: {qrStandeeData.qrUrl}</div>
                  </div>
                )}
              </div>

              {/* Target Scan URL */}
              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.74rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Scan Destination URL:</span>
                <code style={{ color: '#2563eb', fontWeight: 700 }}>{qrStandeeData.qrUrl}</code>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.btnFloorAction}
                  style={{ flex: 1, background: '#2563eb', color: '#ffffff', borderColor: '#2563eb', justifyContent: 'center' }}
                  onClick={() => handlePrintQrStandee(qrStandeeData.standeeHtml)}
                >
                  🖨️ Print Physical Standee Card
                </button>
                <button
                  type="button"
                  className={styles.btnFloorAction}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => handleDownloadQrSvg(showQrStandeeModal.tableNumber, qrStandeeData.svgString)}
                >
                  📥 Download Vector SVG
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => {
                    setShowQrStandeeModal(null);
                    setQrStandeeData(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2: Add New Table Modal (Requirement 3) ─── */}
      {showAddTableModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '460px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#2563eb' }}>
                  ➕ Add New Restaurant Table
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Configure table number, seating capacity, section and floor captain
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowAddTableModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTableSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  TABLE NUMBER / LABEL:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 17 or V05"
                  value={newTableData.tableNumber}
                  onChange={e => setNewTableData({ ...newTableData, tableNumber: e.target.value })}
                  className={styles.posDiscountInput}
                  style={{ width: '100%', height: '36px' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                    SEATING CAPACITY:
                  </label>
                  <select
                    value={newTableData.capacity}
                    onChange={e => setNewTableData({ ...newTableData, capacity: Number(e.target.value) })}
                    className={styles.posSelectField}
                    style={{ width: '100%', height: '36px' }}
                  >
                    <option value="2">2 Guests</option>
                    <option value="4">4 Guests</option>
                    <option value="6">6 Guests</option>
                    <option value="8">8 Guests</option>
                    <option value="12">12 Guests (Family)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                    TABLE SHAPE:
                  </label>
                  <select
                    value={newTableData.shape}
                    onChange={e => setNewTableData({ ...newTableData, shape: e.target.value })}
                    className={styles.posSelectField}
                    style={{ width: '100%', height: '36px' }}
                  >
                    <option value="SQUARE">Square</option>
                    <option value="RECTANGLE">Rectangle</option>
                    <option value="ROUND">Round</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  DINING SECTION:
                </label>
                <select
                  value={newTableData.section}
                  onChange={e => setNewTableData({ ...newTableData, section: e.target.value })}
                  className={styles.posSelectField}
                  style={{ width: '100%', height: '36px' }}
                >
                  {(floorPlans.length > 0 ? floorPlans : [
                    { id: 'GROUND_FLOOR', name: 'Ground Floor Chettinad Dining', icon: '🏛️' },
                    { id: 'AC_HALL', name: 'AC Royal Dining Hall', icon: '❄️' },
                    { id: 'VERANDA', name: 'Traditional Courtyard / Veranda', icon: '🌿' },
                  ]).map(fp => (
                    <option key={fp.id} value={fp.id}>
                      {fp.icon || '📍'} {fp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  ASSIGN FLOOR CAPTAIN:
                </label>
                <select
                  value={newTableData.assignedWaiter}
                  onChange={e => setNewTableData({ ...newTableData, assignedWaiter: e.target.value })}
                  className={styles.posSelectField}
                  style={{ width: '100%', height: '36px' }}
                >
                  {floorWaiters.map((w, idx) => {
                    const name = typeof w === 'object' ? (w.name || w.fullName || w.id) : w;
                    return <option key={name || idx} value={name}>{name}</option>;
                  })}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className={styles.btnPunchKot}
                  style={{ flex: 1, background: '#2563eb' }}
                >
                  ➕ Save &amp; Add Table
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => setShowAddTableModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 3: Edit Table Modal (Requirement 3) ─── */}
      {showEditTableModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '460px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#2563eb' }}>
                  ✏️ Edit Table #{showEditTableModal.tableNumber}
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Modify seating capacity, shape, section, or operational status
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowEditTableModal(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditTableSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                    SEATING CAPACITY:
                  </label>
                  <select
                    value={showEditTableModal.capacity}
                    onChange={e => setShowEditTableModal({ ...showEditTableModal, capacity: Number(e.target.value) })}
                    className={styles.posSelectField}
                    style={{ width: '100%', height: '36px' }}
                  >
                    <option value="2">2 Guests</option>
                    <option value="4">4 Guests</option>
                    <option value="6">6 Guests</option>
                    <option value="8">8 Guests</option>
                    <option value="12">12 Guests</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                    TABLE SHAPE:
                  </label>
                  <select
                    value={showEditTableModal.shape || 'SQUARE'}
                    onChange={e => setShowEditTableModal({ ...showEditTableModal, shape: e.target.value })}
                    className={styles.posSelectField}
                    style={{ width: '100%', height: '36px' }}
                  >
                    <option value="SQUARE">Square</option>
                    <option value="RECTANGLE">Rectangle</option>
                    <option value="ROUND">Round</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  DINING SECTION:
                </label>
                <select
                  value={showEditTableModal.section}
                  onChange={e => setShowEditTableModal({ ...showEditTableModal, section: e.target.value })}
                  className={styles.posSelectField}
                  style={{ width: '100%', height: '36px' }}
                >
                  {(floorPlans.length > 0 ? floorPlans : [
                    { id: 'GROUND_FLOOR', name: 'Ground Floor Chettinad Dining', icon: '🏛️' },
                    { id: 'AC_HALL', name: 'AC Royal Dining Hall', icon: '❄️' },
                    { id: 'VERANDA', name: 'Traditional Courtyard / Veranda', icon: '🌿' },
                  ]).map(fp => (
                    <option key={fp.id} value={fp.id}>
                      {fp.icon || '📍'} {fp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  FLOOR CAPTAIN:
                </label>
                <select
                  value={showEditTableModal.assignedWaiter}
                  onChange={e => setShowEditTableModal({ ...showEditTableModal, assignedWaiter: e.target.value })}
                  className={styles.posSelectField}
                  style={{ width: '100%', height: '36px' }}
                >
                  {floorWaiters.map((w, idx) => {
                    const name = typeof w === 'object' ? (w.name || w.fullName || w.id) : w;
                    return <option key={name || idx} value={name}>{name}</option>;
                  })}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="tableActiveCheck"
                  checked={showEditTableModal.isActive !== false}
                  onChange={e => setShowEditTableModal({ ...showEditTableModal, isActive: e.target.checked })}
                />
                <label htmlFor="tableActiveCheck" style={{ fontSize: '0.78rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Table is Active and Visible in Floor Plan
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className={styles.btnPunchKot}
                  style={{ flex: 1, background: '#2563eb' }}
                >
                  ✓ Save Changes
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => setShowEditTableModal(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Floor Plan Confirmation Modal ─── */}
      {floorPlanToDelete && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '480px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#ef4444' }}>
                  🗑️ Delete Floor Plan
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Confirm removal of dining section &amp; all associated tables
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => {
                  setFloorPlanToDelete(null);
                  setDeletePlanPin('');
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '0.85rem', color: '#ef4444', fontSize: '0.82rem', lineHeight: '1.4' }}>
                <div style={{ fontWeight: 800, marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                  ⚠️ Warning: Irreversible Action
                </div>
                Are you sure you want to delete <strong>{floorPlanToDelete.icon || '📍'} {floorPlanToDelete.name}</strong>?
                {floorPlanToDelete.tableCount > 0 ? (
                  <div style={{ marginTop: '0.5rem', color: '#f87171' }}>
                    This section currently contains <strong>{floorPlanToDelete.tableCount} table(s)</strong>. Deleting this floor plan will also permanently remove all tables in this section from the live database.
                  </div>
                ) : (
                  <div style={{ marginTop: '0.5rem' }}>
                    This floor plan currently has 0 tables and will be removed from your layout.
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                  ENTER MANAGER PIN TO CONFIRM (Default: 1234 or 4321):
                </label>
                <input
                  type="password"
                  placeholder="Manager PIN"
                  value={deletePlanPin}
                  onChange={e => setDeletePlanPin(e.target.value)}
                  className={styles.posDiscountInput}
                  style={{ width: '100%', height: '38px', letterSpacing: '0.2rem', textAlign: 'center', fontSize: '1.1rem' }}
                  maxLength={6}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.btnPunchKot}
                  style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }}
                  onClick={handleConfirmDeleteFloorPlan}
                  disabled={isDeletingPlan}
                >
                  {isDeletingPlan ? '⏳ Deleting...' : '🗑️ Confirm & Delete Floor Plan'}
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => {
                    setFloorPlanToDelete(null);
                    setDeletePlanPin('');
                  }}
                  disabled={isDeletingPlan}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Floor Plan Modal ─── */}
      {showAddFloorPlanModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '480px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#10b981' }}>
                  ➕ Create New Dining Floor Plan
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Add a new restaurant zone, hall, rooftop terrace, or outdoor courtyard
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowAddFloorPlanModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFloorPlanSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  FLOOR PLAN NAME (ENGLISH) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rooftop Garden Dining or VIP Banquet Hall"
                  value={newFloorPlanForm.name}
                  onChange={e => setNewFloorPlanForm({ ...newFloorPlanForm, name: e.target.value })}
                  className={styles.posDiscountInput}
                  style={{ width: '100%', height: '36px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  TAMIL NAME (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. மாடி தோட்டம் அல்லது விஐபி கூடம்"
                  value={newFloorPlanForm.tamilName}
                  onChange={e => setNewFloorPlanForm({ ...newFloorPlanForm, tamilName: e.target.value })}
                  className={styles.posDiscountInput}
                  style={{ width: '100%', height: '36px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                    ICON
                  </label>
                  <select
                    value={newFloorPlanForm.icon}
                    onChange={e => setNewFloorPlanForm({ ...newFloorPlanForm, icon: e.target.value })}
                    className={styles.posSelectField}
                    style={{ width: '100%', height: '36px' }}
                  >
                    <option value="🏛️">🏛️ Traditional Heritage</option>
                    <option value="❄️">❄️ AC Royal Hall</option>
                    <option value="🌿">🌿 Chettinad Veranda</option>
                    <option value="🌴">🌴 Palm Garden / Rooftop</option>
                    <option value="🌟">🌟 VIP Lounge</option>
                    <option value="🏮">🏮 Lantern Courtyard</option>
                    <option value="🍽️">🍽️ Dining Hall</option>
                    <option value="☕">☕ Coffee &amp; Tiffin Nook</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                    FLOOR LEVEL
                  </label>
                  <select
                    value={newFloorPlanForm.floorLevel}
                    onChange={e => setNewFloorPlanForm({ ...newFloorPlanForm, floorLevel: Number(e.target.value) })}
                    className={styles.posSelectField}
                    style={{ width: '100%', height: '36px' }}
                  >
                    <option value={0}>Ground Floor (Level 0)</option>
                    <option value={1}>First Floor (Level 1)</option>
                    <option value={2}>Second Floor (Level 2)</option>
                    <option value={3}>Rooftop / Terrace (Level 3)</option>
                    <option value={-1}>Lower Ground / Basement</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  DESCRIPTION
                </label>
                <textarea
                  placeholder="e.g. Scenic open-air rooftop dining area for evening dinners and celebrations"
                  value={newFloorPlanForm.description}
                  onChange={e => setNewFloorPlanForm({ ...newFloorPlanForm, description: e.target.value })}
                  className={styles.posDiscountInput}
                  style={{ width: '100%', height: '60px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className={styles.btnPunchKot}
                  style={{ flex: 1, background: '#10b981', borderColor: '#10b981' }}
                >
                  ➕ Save &amp; Create Floor Plan
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => setShowAddFloorPlanModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 4: Merge & Split Tables Modal (Requirement 15) ─── */}
      {showMergeModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '520px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#8b5cf6' }}>
                  🔗 Table Merge &amp; Split Control
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Combine adjacent tables for large family or party dining
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowMergeModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.82rem' }}>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '0.65rem 0.85rem', borderRadius: '8px', color: '#8b5cf6' }}>
                ℹ️ <strong>Merge Protocol:</strong> All open customer tabs, orders, and KOTs will be consolidated under the primary table session.
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  1. SELECT PRIMARY TABLE (Holds Main Billing Tab):
                </label>
                <select
                  value={mergePrimaryTable}
                  onChange={e => setMergePrimaryTable(e.target.value)}
                  className={styles.posSelectField}
                  style={{ width: '100%', height: '36px' }}
                >
                  <option value="">-- Choose Primary Table --</option>
                  {floorTables.map(t => (
                    <option key={t.tableNumber} value={t.tableNumber}>
                      Table #{t.tableNumber} ({t.section} • {t.capacity} seats • {t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  2. SELECT TABLES TO JOIN INTO PRIMARY:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem', maxHeight: '160px', overflowY: 'auto', padding: '0.25rem' }}>
                  {floorTables
                    .filter(t => String(t.tableNumber) !== String(mergePrimaryTable))
                    .map(t => {
                      const isSelected = mergeSelectedTables.includes(t.tableNumber);
                      return (
                        <div
                          key={t.tableNumber}
                          className={`${styles.posOptionPill} ${isSelected ? styles.posOptionPillActive : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              setMergeSelectedTables(mergeSelectedTables.filter(num => num !== t.tableNumber));
                            } else {
                              setMergeSelectedTables([...mergeSelectedTables, t.tableNumber]);
                            }
                          }}
                          style={{ padding: '0.45rem', fontSize: '0.75rem' }}
                        >
                          <span>#{t.tableNumber} ({t.capacity}p)</span>
                          <span>{isSelected ? '✓' : '+'}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Currently Merged Tables to Split */}
              {floorTables.filter(t => t.isMerged).length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    CURRENTLY MERGED TABLES:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {floorTables.filter(t => t.isMerged).map(t => (
                      <div key={t.tableNumber} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card-subtle)', padding: '0.45rem 0.65rem', borderRadius: '6px' }}>
                        <span>Table #{t.tableNumber} (Merged with: {t.mergedWith?.join(', ')})</span>
                        <button
                          type="button"
                          className={styles.btnStatusQuick}
                          style={{ maxWidth: '100px', height: '28px', fontSize: '0.72rem' }}
                          onClick={() => handleSplitTables(t.tableNumber)}
                        >
                          ✂️ Split Back
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.btnPunchKot}
                  style={{ flex: 1, background: '#8b5cf6' }}
                  onClick={handleMergeTablesSubmit}
                >
                  🔗 Confirm Table Merge
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => setShowMergeModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5: Table Reservations Modal (Requirement 13) ─── */}
      {showReservationsModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '720px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#8b5cf6' }}>
                  📅 Table Reservations Management
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Create, view, seat, and cancel dining bookings
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowReservationsModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Form to Create New Reservation */}
              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  ➕ BOOK NEW TABLE RESERVATION
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Guest Name *"
                    value={newReservationData.guestName}
                    onChange={e => setNewReservationData({ ...newReservationData, guestName: e.target.value })}
                    className={styles.posDiscountInput}
                    style={{ height: '34px', fontSize: '0.76rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Phone Number *"
                    value={newReservationData.phone}
                    onChange={e => setNewReservationData({ ...newReservationData, phone: e.target.value })}
                    className={styles.posDiscountInput}
                    style={{ height: '34px', fontSize: '0.76rem' }}
                  />
                  <select
                    value={newReservationData.partySize}
                    onChange={e => setNewReservationData({ ...newReservationData, partySize: Number(e.target.value) })}
                    className={styles.posSelectField}
                    style={{ height: '34px', fontSize: '0.76rem' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map(n => (
                      <option key={n} value={n}>{n} Guests</option>
                    ))}
                  </select>
                  <select
                    value={newReservationData.tableNumber}
                    onChange={e => setNewReservationData({ ...newReservationData, tableNumber: e.target.value })}
                    className={styles.posSelectField}
                    style={{ height: '34px', fontSize: '0.76rem' }}
                  >
                    {floorTables.map(t => (
                      <option key={t.tableNumber} value={t.tableNumber}>
                        Table #{t.tableNumber} ({t.capacity} seats • {t.section})
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={newReservationData.date}
                    onChange={e => setNewReservationData({ ...newReservationData, date: e.target.value })}
                    className={styles.posDiscountInput}
                    style={{ height: '34px', fontSize: '0.76rem' }}
                  />
                  <select
                    value={newReservationData.timeSlot}
                    onChange={e => setNewReservationData({ ...newReservationData, timeSlot: e.target.value })}
                    className={styles.posSelectField}
                    style={{ height: '34px', fontSize: '0.76rem' }}
                  >
                    {['12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM'].map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Special requests (e.g. High chair, AC seating, birthday...)"
                    value={newReservationData.specialRequests}
                    onChange={e => setNewReservationData({ ...newReservationData, specialRequests: e.target.value })}
                    className={styles.posDiscountInput}
                    style={{ flex: 1, height: '34px', fontSize: '0.76rem' }}
                  />
                  <button
                    type="button"
                    className={styles.btnFloorAction}
                    style={{ background: '#8b5cf6', color: '#ffffff', borderColor: '#8b5cf6' }}
                    onClick={() => {
                      if (!newReservationData.guestName || !newReservationData.phone) {
                        showNotice('Please enter guest name and phone number', true);
                        return;
                      }
                      handleReservationAction('CREATE', newReservationData);
                    }}
                  >
                    ➕ Book Reservation
                  </button>
                </div>
              </div>

              {/* Reservations List */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  UPCOMING &amp; ACTIVE BOOKINGS ({floorReservations.length})
                </div>
                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  <table className={styles.tableModalTable}>
                    <thead>
                      <tr>
                        <th>Guest Details</th>
                        <th>Party</th>
                        <th>Table #</th>
                        <th>Date &amp; Time</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {floorReservations.map(res => (
                        <tr key={res.id}>
                          <td>
                            <strong>{res.guestName}</strong>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{res.phone}</div>
                          </td>
                          <td>{res.partySize}p</td>
                          <td>
                            <strong style={{ color: '#2563eb' }}>Table #{res.tableNumber}</strong>
                          </td>
                          <td>
                            {res.date} • {res.timeSlot}
                            {res.specialRequests && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Note: {res.specialRequests}</div>
                            )}
                          </td>
                          <td>
                            <span
                              className={styles.statusBadge}
                              style={{
                                background: res.status === 'CONFIRMED' ? 'rgba(139, 92, 246, 0.15)' :
                                  res.status === 'SEATED' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: res.status === 'CONFIRMED' ? '#8b5cf6' :
                                  res.status === 'SEATED' ? '#16a34a' : '#ef4444',
                              }}
                            >
                              {res.status}
                            </span>
                          </td>
                          <td>
                            {res.status === 'CONFIRMED' && (
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button
                                  type="button"
                                  className={styles.btnStatusQuick}
                                  style={{ background: '#16a34a', color: '#ffffff', height: '28px', padding: '0 0.5rem', fontSize: '0.72rem' }}
                                  onClick={() => handleReservationAction('SEAT', {}, res.id)}
                                >
                                  👥 Seat
                                </button>
                                <button
                                  type="button"
                                  className={styles.btnStatusQuick}
                                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', height: '28px', padding: '0 0.5rem', fontSize: '0.72rem' }}
                                  onClick={() => handleReservationAction('CANCEL', {}, res.id)}
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 6: Walk-In Guest Waitlist Modal (Requirement 14) ─── */}
      {showWaitlistModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '720px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#ea580c' }}>
                  ⏳ Walk-In Waitlist Management
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Queue walk-in customers and allocate tables with 1 tap
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowWaitlistModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Form to Add Walk-In Guest */}
              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  ➕ ADD WALK-IN GUEST TO QUEUE
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Guest Name *"
                    value={newWaitlistData.guestName}
                    onChange={e => setNewWaitlistData({ ...newWaitlistData, guestName: e.target.value })}
                    className={styles.posDiscountInput}
                    style={{ height: '34px', fontSize: '0.76rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Phone Number *"
                    value={newWaitlistData.phone}
                    onChange={e => setNewWaitlistData({ ...newWaitlistData, phone: e.target.value })}
                    className={styles.posDiscountInput}
                    style={{ height: '34px', fontSize: '0.76rem' }}
                  />
                  <select
                    value={newWaitlistData.partySize}
                    onChange={e => setNewWaitlistData({ ...newWaitlistData, partySize: Number(e.target.value) })}
                    className={styles.posSelectField}
                    style={{ height: '34px', fontSize: '0.76rem' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                      <option key={n} value={n}>{n} Guests</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <select
                    value={newWaitlistData.preferredSection}
                    onChange={e => setNewWaitlistData({ ...newWaitlistData, preferredSection: e.target.value })}
                    className={styles.posSelectField}
                    style={{ flex: 1, height: '34px', fontSize: '0.76rem' }}
                  >
                    <option value="GROUND_FLOOR">Preferred: 🏛️ Ground Floor</option>
                    <option value="AC_HALL">Preferred: ❄️ AC Royal Hall</option>
                    <option value="VERANDA">Preferred: 🌿 Chettinad Veranda</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Notes (e.g. Window table, kids...)"
                    value={newWaitlistData.notes}
                    onChange={e => setNewWaitlistData({ ...newWaitlistData, notes: e.target.value })}
                    className={styles.posDiscountInput}
                    style={{ flex: 1, height: '34px', fontSize: '0.76rem' }}
                  />
                  <button
                    type="button"
                    className={styles.btnFloorAction}
                    style={{ background: '#ea580c', color: '#ffffff', borderColor: '#ea580c' }}
                    onClick={() => {
                      if (!newWaitlistData.guestName || !newWaitlistData.phone) {
                        showNotice('Please enter guest name and phone number', true);
                        return;
                      }
                      handleWaitlistAction('ADD', newWaitlistData);
                    }}
                  >
                    ➕ Add to Queue
                  </button>
                </div>
              </div>

              {/* Waiting Queue List */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  CURRENT WAITING LIST ({floorWaitlist.filter(w => w.status === 'WAITING').length} parties waiting)
                </div>
                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  <table className={styles.tableModalTable}>
                    <thead>
                      <tr>
                        <th>Guest</th>
                        <th>Party</th>
                        <th>Section</th>
                        <th>Arrival / Wait</th>
                        <th>Allocate Table</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {floorWaitlist.map(w => (
                        <tr key={w.id}>
                          <td>
                            <strong>{w.guestName}</strong>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{w.phone}</div>
                          </td>
                          <td>{w.partySize}p</td>
                          <td>{w.preferredSection?.replace('_', ' ')}</td>
                          <td>
                            {w.arrivalTime}
                            <div style={{ color: '#ea580c', fontWeight: 700, fontSize: '0.7rem' }}>
                              ⏱️ {w.waitMinutes || 5}m elapsed
                            </div>
                          </td>
                          <td>
                            {w.status === 'WAITING' ? (
                              <select
                                className={styles.posSelectField}
                                style={{ height: '28px', fontSize: '0.72rem' }}
                                value={waitlistSeatTableNum || ''}
                                onChange={e => setWaitlistSeatTableNum(e.target.value)}
                              >
                                <option value="">Select Available Table</option>
                                {floorTables
                                  .filter(t => t.status === 'AVAILABLE' || t.status === 'CLEANING')
                                  .map(t => (
                                    <option key={t.tableNumber} value={t.tableNumber}>
                                      Table #{t.tableNumber} ({t.capacity} seats • {t.status})
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <span style={{ color: '#16a34a', fontWeight: 700 }}>Seated at #{w.seatedTable}</span>
                            )}
                          </td>
                          <td>
                            {w.status === 'WAITING' && (
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button
                                  type="button"
                                  className={styles.btnStatusQuick}
                                  style={{ background: '#16a34a', color: '#ffffff', height: '28px', padding: '0 0.5rem', fontSize: '0.72rem' }}
                                  onClick={() => {
                                    const targetTbl = waitlistSeatTableNum || floorTables.find(t => t.status === 'AVAILABLE')?.tableNumber;
                                    if (!targetTbl) {
                                      showNotice('Select an available table to seat guest', true);
                                      return;
                                    }
                                    handleWaitlistAction('SEAT', {}, w.id, targetTbl);
                                  }}
                                >
                                  🪑 Seat Now
                                </button>
                                <button
                                  type="button"
                                  className={styles.btnStatusQuick}
                                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', height: '28px', padding: '0 0.5rem', fontSize: '0.72rem' }}
                                  onClick={() => handleWaitlistAction('REMOVE', {}, w.id)}
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7: Add Extra Items / Supplementary KOT Modal (Requirement 10) ─── */}
      {showAddItemsTableModal && floorSelectedTable && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '440px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#2563eb' }}>
                  ➕ Add Extra Items • Table #{floorSelectedTable.tableNumber}
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Generates Supplementary KOT (Round 2+) and sends to kitchen
                </span>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowAddItemsTableModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  SELECT FOOD ITEM:
                </label>
                <select
                  value={selectedDishToAdd}
                  onChange={e => setSelectedDishToAdd(e.target.value)}
                  className={styles.posSelectField}
                  style={{ width: '100%', height: '36px', fontSize: '0.82rem' }}
                >
                  {(posData.menu || DEFAULT_POS_MENU).map(dish => (
                    <option key={dish.id} value={dish.id}>
                      {dish.title} • ₹{dish.price} ({dish.station || 'KITCHEN'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  QUANTITY:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={styles.btnStatusQuick}
                    style={{ width: '40px', fontSize: '1.1rem' }}
                    onClick={() => setAddDishQty(Math.max(1, addDishQty - 1))}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, minWidth: '40px', textAlign: 'center' }}>
                    {addDishQty}
                  </span>
                  <button
                    type="button"
                    className={styles.btnStatusQuick}
                    style={{ width: '40px', fontSize: '1.1rem' }}
                    onClick={() => setAddDishQty(addDishQty + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  SPECIAL COOKING NOTES:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra spicy, less oil, podi on the side..."
                  value={addDishNotes}
                  onChange={e => setAddDishNotes(e.target.value)}
                  className={styles.posDiscountInput}
                  style={{ width: '100%', height: '36px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.btnPunchKot}
                  style={{ flex: 1, background: '#2563eb' }}
                  onClick={() => handleAddExtraItemsToTable(floorSelectedTable.tableNumber)}
                >
                  🍳 Send Supplementary KOT
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => setShowAddItemsTableModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MENU MANAGEMENT MODALS (REQUIREMENTS 2, 4, 5, 6, 7, 9, 10, 13, 14, 16, 17)
         ══════════════════════════════════════════════════════════════════════ */}

      {/* ─── 1. Add / Edit Dish Modal ─── */}
      {showDishModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle}>
                  {dishModalMode === 'ADD' ? '➕ Add New Chettinad Delicacy' : `✏️ Edit: ${dishFormData.title}`}
                </h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  TVSE TP 415C Touch POS &amp; Customer QR Digital Catalog
                </div>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowDishModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Sub-Tab Navigation inside Dish Modal */}
            <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', marginBottom: '1rem', overflowX: 'auto' }}>
              {[
                { id: 'INFO', label: 'ℹ️ Basic Info' },
                { id: 'VARIANTS', label: '💰 Pricing & Portions' },
                { id: 'DIETARY', label: '🌱 Dietary & Spice' },
                { id: 'KITCHEN', label: '🍳 Kitchen & BOM' },
                { id: 'OFFER', label: '🏷️ Offers & Promos' },
                { id: 'PHOTO', label: '📸 Food Photography' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={styles.btnNavAlt}
                  style={{
                    background: dishFormTab === tab.id ? '#2563eb' : 'transparent',
                    color: dishFormTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                    borderColor: dishFormTab === tab.id ? '#3b82f6' : 'var(--border-subtle)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.3rem 0.65rem',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => setDishFormTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveDish} noValidate>
              {/* TAB 1: BASIC INFO */}
              {dishFormTab === 'INFO' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                        DISH NAME (ENGLISH) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Special Ghee Podi Roast"
                        value={dishFormData.title}
                        onChange={e => setDishFormData({ ...dishFormData, title: e.target.value })}
                        className={styles.posDiscountInput}
                        style={{ width: '100%', height: '36px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                        TAMIL SCRIPT TITLE (தமிழ் பெயர்)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. நெய் பொடி ரோஸ்ட்"
                        value={dishFormData.tamilTitle}
                        onChange={e => setDishFormData({ ...dishFormData, tamilTitle: e.target.value })}
                        className={styles.posDiscountInput}
                        style={{ width: '100%', height: '36px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                        MEAL SECTION (SCHEDULE) *
                      </label>
                      <select
                        value={dishFormData.mealSection || 'BREAKFAST'}
                        onChange={e => setDishFormData({ ...dishFormData, mealSection: e.target.value })}
                        className={styles.posSelectField}
                        style={{ width: '100%', height: '36px' }}
                      >
                        <option value="BREAKFAST">🌅 Breakfast (7:00 AM–11:30 AM)</option>
                        <option value="LUNCH">☀️ Lunch (11:30 AM–3:00 PM)</option>
                        <option value="EVENING_SNACKS">☕ Evening Snacks (4:00 PM–6:00 PM)</option>
                        <option value="DINNER">🌙 Dinner (6:00 PM–10:30 PM)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                        CATEGORY *
                      </label>
                      <select
                        value={dishFormData.category}
                        onChange={e => setDishFormData({ ...dishFormData, category: e.target.value })}
                        className={styles.posSelectField}
                        style={{ width: '100%', height: '36px' }}
                      >
                        {categoriesList.map(cat => (
                          <option key={cat.id} value={cat.name}>
                            {cat.icon || '🍽️'} {cat.name} ({cat.tamilName || ''})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                        KITCHEN STATION *
                      </label>
                      <select
                        value={dishFormData.station}
                        onChange={e => setDishFormData({ ...dishFormData, station: e.target.value })}
                        className={styles.posSelectField}
                        style={{ width: '100%', height: '36px' }}
                      >
                        <option value="TIFFIN">🥞 Tiffin (Idli/Vadai/Poori)</option>
                        <option value="DOSA">🪙 Dosa Station (Roasts/Uthappams)</option>
                        <option value="MEALS">🍱 Meals &amp; Gravy Counter</option>
                        <option value="BEVERAGES">☕ Beverages &amp; Degree Coffee</option>
                        <option value="SNACKS">🥟 Evening Snacks &amp; Savories</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                      DESCRIPTION &amp; CHEF NOTES
                    </label>
                    <textarea
                      rows="3"
                      placeholder="e.g. Crisp golden dosa roasted in pure cow ghee with fiery podi and 3 signature Karaikudi chutneys."
                      value={dishFormData.description}
                      onChange={e => setDishFormData({ ...dishFormData, description: e.target.value })}
                      className={styles.posDiscountInput}
                      style={{ width: '100%', padding: '0.5rem', height: 'auto', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={dishFormData.isFeatured}
                        onChange={e => setDishFormData({ ...dishFormData, isFeatured: e.target.checked })}
                        style={{ accentColor: '#2563eb', width: '16px', height: '16px' }}
                      />
                      ⭐ Feature on Homepage Banner
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={dishFormData.isBestseller}
                        onChange={e => setDishFormData({ ...dishFormData, isBestseller: e.target.checked })}
                        style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }}
                      />
                      👑 Bestseller Crown Badge
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={dishFormData.isChefSpecial}
                        onChange={e => setDishFormData({ ...dishFormData, isChefSpecial: e.target.checked })}
                        style={{ accentColor: '#0284c7', width: '16px', height: '16px' }}
                      />
                      🏺 Karaikudi Heritage Special
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: PRICING, PORTIONS, VARIANTS & ADD-ONS */}
              {dishFormTab === 'VARIANTS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                        BASE PRICE (₹ INR) (0 if unpriced draft)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0 (Unpriced draft)"
                        value={dishFormData.price}
                        onChange={e => setDishFormData({ ...dishFormData, price: e.target.value })}
                        className={styles.posDiscountInput}
                        style={{ width: '100%', height: '36px', fontSize: '1rem', fontWeight: 800 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                        PORTION SIZE LABEL
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Standard (1 Person), 14 pcs"
                        value={dishFormData.portionSize}
                        onChange={e => setDishFormData({ ...dishFormData, portionSize: e.target.value })}
                        className={styles.posDiscountInput}
                        style={{ width: '100%', height: '36px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                        PREPARATION TIME (MINS)
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="60"
                        placeholder="e.g. 10"
                        value={dishFormData.prepTime}
                        onChange={e => setDishFormData({ ...dishFormData, prepTime: e.target.value })}
                        className={styles.posDiscountInput}
                        style={{ width: '100%', height: '36px' }}
                      />
                    </div>
                  </div>

                  {/* Variants Builder (Requirement 9) */}
                  <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        PORTION VARIANTS ({dishFormData.variants?.length || 0})
                      </div>
                      <button
                        type="button"
                        className={styles.btnStatusQuick}
                        style={{ fontSize: '0.7rem', height: '26px' }}
                        onClick={() => {
                          const cur = dishFormData.variants || [];
                          setDishFormData({
                            ...dishFormData,
                            variants: [...cur, { name: 'Extra Portion', priceDiff: 20 }]
                          });
                        }}
                      >
                        + Add Variant
                      </button>
                    </div>

                    {(dishFormData.variants || []).map((v, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Variant name (e.g. Extra Ghee Roast)"
                          value={v.name}
                          onChange={e => {
                            const updated = [...dishFormData.variants];
                            updated[i].name = e.target.value;
                            setDishFormData({ ...dishFormData, variants: updated });
                          }}
                          className={styles.posDiscountInput}
                          style={{ flex: 2, height: '30px', fontSize: '0.78rem' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+₹</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={v.priceDiff}
                            onChange={e => {
                              const updated = [...dishFormData.variants];
                              updated[i].priceDiff = Number(e.target.value) || 0;
                              setDishFormData({ ...dishFormData, variants: updated });
                            }}
                            className={styles.posDiscountInput}
                            style={{ width: '70px', height: '30px', fontSize: '0.78rem' }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = dishFormData.variants.filter((_, idx) => idx !== i);
                            setDishFormData({ ...dishFormData, variants: updated });
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add-ons Builder (Requirement 9) */}
                  <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        ADD-ONS &amp; EXTRA TOPPINGS ({dishFormData.addOns?.length || 0})
                      </div>
                      <button
                        type="button"
                        className={styles.btnStatusQuick}
                        style={{ fontSize: '0.7rem', height: '26px' }}
                        onClick={() => {
                          const cur = dishFormData.addOns || [];
                          setDishFormData({
                            ...dishFormData,
                            addOns: [...cur, { name: 'Extra Gunpowder Podi Cup', price: 15 }]
                          });
                        }}
                      >
                        + Add Add-on
                      </button>
                    </div>

                    {(dishFormData.addOns || []).map((addon, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Add-on item (e.g. Sambar Bowl, Extra Ghee)"
                          value={addon.name}
                          onChange={e => {
                            const updated = [...dishFormData.addOns];
                            updated[i].name = e.target.value;
                            setDishFormData({ ...dishFormData, addOns: updated });
                          }}
                          className={styles.posDiscountInput}
                          style={{ flex: 2, height: '30px', fontSize: '0.78rem' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>₹</span>
                          <input
                            type="number"
                            placeholder="15"
                            value={addon.price}
                            onChange={e => {
                              const updated = [...dishFormData.addOns];
                              updated[i].price = Number(e.target.value) || 0;
                              setDishFormData({ ...dishFormData, addOns: updated });
                            }}
                            className={styles.posDiscountInput}
                            style={{ width: '70px', height: '30px', fontSize: '0.78rem' }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = dishFormData.addOns.filter((_, idx) => idx !== i);
                            setDishFormData({ ...dishFormData, addOns: updated });
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: DIETARY & ALLERGENS (Requirement 10) */}
              {dishFormTab === 'DIETARY' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                      SPICE LEVEL SELECTION
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[
                        { level: 1, label: '🌱 Mild', desc: 'Delicate, kid-friendly' },
                        { level: 2, label: '🌶️🌶️ Medium', desc: 'Standard Chettinad spice' },
                        { level: 3, label: '🌶️🌶️🌶️ Karaikudi Fiery', desc: 'Authentic fiery black pepper & shallot' },
                      ].map(sp => (
                        <button
                          key={sp.level}
                          type="button"
                          onClick={() => setDishFormData({
                            ...dishFormData,
                            dietary: { ...dishFormData.dietary, spiceLevel: sp.level }
                          })}
                          className={styles.btnStatusQuick}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            textAlign: 'center',
                            background: dishFormData.dietary?.spiceLevel === sp.level ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                            borderColor: dishFormData.dietary?.spiceLevel === sp.level ? '#3b82f6' : 'var(--border-subtle)',
                            color: dishFormData.dietary?.spiceLevel === sp.level ? '#60a5fa' : 'var(--text-secondary)',
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{sp.label}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{sp.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      DIETARY CLASSIFICATIONS
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={dishFormData.dietary?.isJain}
                          onChange={e => setDishFormData({
                            ...dishFormData,
                            dietary: { ...dishFormData.dietary, isJain: e.target.checked }
                          })}
                          style={{ accentColor: '#3b82f6' }}
                        />
                        🌱 Jain Friendly (No Onion, No Garlic)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={dishFormData.dietary?.isVegan}
                          onChange={e => setDishFormData({
                            ...dishFormData,
                            dietary: { ...dishFormData.dietary, isVegan: e.target.checked }
                          })}
                          style={{ accentColor: '#10b981' }}
                        />
                        🌿 Pure Vegan (Zero Dairy / No Cow Ghee)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={dishFormData.dietary?.isGlutenFree}
                          onChange={e => setDishFormData({
                            ...dishFormData,
                            dietary: { ...dishFormData.dietary, isGlutenFree: e.target.checked }
                          })}
                          style={{ accentColor: '#8b5cf6' }}
                        />
                        🌾 Gluten-Free Recipe
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', opacity: 0.8 }}>
                        <input type="checkbox" checked disabled style={{ accentColor: '#10b981' }} />
                        🟢 100% Pure Vegetarian (Sri Gokulam Standard)
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                      ALLERGEN ADVISORY INFORMATION
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {['Dairy/Milk', 'Tree Nuts/Cashew', 'Peanuts', 'Mustard', 'Sesame', 'Soy'].map(al => {
                        const hasAl = (dishFormData.allergens || []).includes(al);
                        return (
                          <button
                            key={al}
                            type="button"
                            onClick={() => {
                              const cur = dishFormData.allergens || [];
                              setDishFormData({
                                ...dishFormData,
                                allergens: hasAl ? cur.filter(x => x !== al) : [...cur, al]
                              });
                            }}
                            className={styles.btnStatusQuick}
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.25rem 0.6rem',
                              background: hasAl ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                              borderColor: hasAl ? '#ef4444' : 'var(--border-subtle)',
                              color: hasAl ? '#f87171' : 'var(--text-secondary)',
                            }}
                          >
                            {hasAl ? '⚠️ Contains ' : '+ '}{al}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: KITCHEN & RECIPE BOM (Requirements 14 & 15) */}
              {dishFormTab === 'KITCHEN' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ background: 'var(--bg-card-subtle)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8', marginBottom: '0.35rem' }}>
                      📦 INVENTORY RECIPE LINKAGE (BOM DEDUCTION)
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      Linking this dish to a Recipe Bill-of-Materials ensures raw ingredients (batter, ghee, sambar) are automatically decremented upon POS order settlement.
                    </p>

                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                      SELECT RECIPE BOM:
                    </label>
                    <select
                      value={dishFormData.recipeId || ''}
                      onChange={e => setDishFormData({ ...dishFormData, recipeId: e.target.value || null })}
                      className={styles.posSelectField}
                      style={{ width: '100%', height: '36px' }}
                    >
                      <option value="">— No Recipe Linked (Manual Stock Tracking) —</option>
                      {recipes.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.menuItemName} ({r.ingredients?.length || 0} Ingredients in BOM)
                        </option>
                      ))}
                    </select>

                    {dishFormData.recipeId && (
                      <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'var(--bg-card)', borderRadius: '6px', fontSize: '0.72rem' }}>
                        <div style={{ fontWeight: 800, color: '#10b981', marginBottom: '0.25rem' }}>
                          ✓ Recipe Ingredients In BOM:
                        </div>
                        {recipes.find(r => r.id === dishFormData.recipeId)?.ingredients?.map((ing, idx) => {
                          const inv = inventory.find(i => i.id === ing.invId);
                          return (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', padding: '0.15rem 0' }}>
                              <span>• {inv?.name || ing.invId}</span>
                              <span style={{ fontWeight: 700 }}>{ing.qty} {ing.unit} per dish</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: OFFERS & DISCOUNTS (Requirement 13) */}
              {dishFormTab === 'OFFER' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        ENABLE PROMOTIONAL DISCOUNT
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Shows celebratory discount badge and strikethrough price on POS and customer QR menu.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={dishFormData.discount?.active}
                      onChange={e => setDishFormData({
                        ...dishFormData,
                        discount: { ...dishFormData.discount, active: e.target.checked }
                      })}
                      style={{ width: '20px', height: '20px', accentColor: '#f43f5e', cursor: 'pointer' }}
                    />
                  </div>

                  {dishFormData.discount?.active && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(244, 63, 94, 0.05)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                            DISCOUNT TYPE
                          </label>
                          <select
                            value={dishFormData.discount?.type || 'PERCENT'}
                            onChange={e => {
                              const type = e.target.value;
                              const val = dishFormData.discount?.value || 0;
                              const origPrice = Number(dishFormData.price) || 0;
                              const discountedPrice = type === 'PERCENT' ? Math.round(origPrice * (1 - val / 100)) : origPrice - val;
                              setDishFormData({
                                ...dishFormData,
                                discount: { ...dishFormData.discount, type, discountedPrice }
                              });
                            }}
                            className={styles.posSelectField}
                            style={{ width: '100%', height: '36px' }}
                          >
                            <option value="PERCENT">Percentage (%) OFF</option>
                            <option value="FLAT">Flat (₹ INR) OFF</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                            DISCOUNT VALUE ({dishFormData.discount?.type === 'PERCENT' ? '%' : '₹'})
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={dishFormData.discount?.value || ''}
                            onChange={e => {
                              const val = Number(e.target.value) || 0;
                              const origPrice = Number(dishFormData.price) || 0;
                              const type = dishFormData.discount?.type || 'PERCENT';
                              const discountedPrice = type === 'PERCENT' ? Math.max(1, Math.round(origPrice * (1 - val / 100))) : Math.max(1, origPrice - val);
                              setDishFormData({
                                ...dishFormData,
                                discount: { ...dishFormData.discount, value: val, discountedPrice }
                              });
                            }}
                            className={styles.posDiscountInput}
                            style={{ width: '100%', height: '36px' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                          OFFER / PROMO LABEL
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Karaikudi Heritage Utsav - 10% OFF"
                          value={dishFormData.discount?.label || ''}
                          onChange={e => setDishFormData({
                            ...dishFormData,
                            discount: { ...dishFormData.discount, label: e.target.value }
                          })}
                          className={styles.posDiscountInput}
                          style={{ width: '100%', height: '36px' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                            START DATE
                          </label>
                          <input
                            type="date"
                            value={dishFormData.discount?.startDate || ''}
                            onChange={e => setDishFormData({
                              ...dishFormData,
                              discount: { ...dishFormData.discount, startDate: e.target.value }
                            })}
                            className={styles.posDiscountInput}
                            style={{ width: '100%', height: '36px' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                            END DATE (EXPIRY)
                          </label>
                          <input
                            type="date"
                            value={dishFormData.discount?.endDate || ''}
                            onChange={e => setDishFormData({
                              ...dishFormData,
                              discount: { ...dishFormData.discount, endDate: e.target.value }
                            })}
                            className={styles.posDiscountInput}
                            style={{ width: '100%', height: '36px' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-card)', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Effective Selling Price:</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fb7185' }}>
                            ₹{dishFormData.discount?.discountedPrice || dishFormData.price}
                          </span>
                          <span style={{ fontSize: '0.8rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                            ₹{dishFormData.price}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: FOOD PHOTOGRAPHY & UPLOAD */}
              {dishFormTab === 'PHOTO' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '120px', height: '120px', borderRadius: '10px', overflow: 'hidden', border: '2px solid var(--border-subtle)', background: '#111', flexShrink: 0, position: 'relative' }}>
                      <img
                        src={dishFormData.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%231f2937'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='32'%3E📷%3C/text%3E%3C/svg%3E"}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {dishFormData.image && (
                        <button
                          type="button"
                          onClick={() => {
                            setDishFormData(prev => ({ ...prev, image: '' }));
                            setImageUploadStatus('');
                          }}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(220, 38, 38, 0.85)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Remove image"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        UPLOAD FOOD PHOTO (JPG, PNG, WEBP — AUTO OPTIMIZED):
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/*"
                        onChange={handleImageFileChange}
                        disabled={imageUploading}
                        className={styles.posDiscountInput}
                        style={{ width: '100%', height: '36px', padding: '0.3rem' }}
                      />
                      <div style={{ fontSize: '0.7rem', color: imageUploading ? '#3b82f6' : (imageUploadStatus.includes('ready') ? '#10b981' : 'var(--text-muted)') }}>
                        {imageUploading ? '⏳ Compressing & optimizing photo...' : (imageUploadStatus || 'Client-side canvas compression resizes photos to high-res WebP for instant save and speed.')}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                      OR DIRECT PHOTO URL:
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={dishFormData.image?.startsWith('data:') ? '' : (dishFormData.image || '')}
                      onChange={e => {
                        const val = e.target.value;
                        setDishFormData(prev => ({ ...prev, image: val }));
                        setImageUploadStatus('');
                      }}
                      className={styles.posDiscountInput}
                      style={{ width: '100%', height: '36px' }}
                    />
                    {dishFormData.image?.startsWith('data:') && (
                      <div style={{ fontSize: '0.68rem', color: '#10b981', marginTop: '0.2rem' }}>
                        ✓ Uploaded optimized photo is active (~{Math.round((dishFormData.image.length * 3) / 4 / 1024)} KB WebP). To use a direct URL instead, paste or type it above.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="submit"
                  disabled={loading}
                  className={styles.btnPunchKot}
                  style={{ flex: 1, background: '#2563eb' }}
                >
                  ✓ {dishModalMode === 'ADD' ? 'Publish Delicacy to Menu' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => setShowDishModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 2. Category Management Modal (Requirement 6) ─── */}
      {showCategoryModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle}>🏷️ Menu Category Management</h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Create, reorder, and configure kitchen station defaults for menu categories.
                </div>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => {
                  setShowCategoryModal(false);
                  setIsEditingCategory(false);
                  setCategoryFormData({ id: '', name: '', tamilName: '', icon: '🍽️', description: '', station: 'TIFFIN' });
                }}
              >
                ✕
              </button>
            </div>

            {/* Create / Edit Category Form */}
            <form onSubmit={handleSaveCategory} style={{ background: 'var(--bg-card-subtle)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8', marginBottom: '0.5rem' }}>
                {isEditingCategory ? `✏️ Edit Category: ${categoryFormData.name}` : '➕ Add New Menu Category'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Icon</label>
                  <input
                    type="text"
                    value={categoryFormData.icon}
                    onChange={e => setCategoryFormData({ ...categoryFormData, icon: e.target.value })}
                    className={styles.posDiscountInput}
                    style={{ width: '100%', height: '34px', textAlign: 'center', fontSize: '1.2rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Name (English) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dosa"
                    value={categoryFormData.name}
                    onChange={e => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    className={styles.posDiscountInput}
                    style={{ width: '100%', height: '34px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Tamil Script (தமிழ்)</label>
                  <input
                    type="text"
                    placeholder="e.g. தோசை வகைகள்"
                    value={categoryFormData.tamilName}
                    onChange={e => setCategoryFormData({ ...categoryFormData, tamilName: e.target.value })}
                    className={styles.posDiscountInput}
                    style={{ width: '100%', height: '34px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Default Kitchen Station</label>
                  <select
                    value={categoryFormData.station}
                    onChange={e => setCategoryFormData({ ...categoryFormData, station: e.target.value })}
                    className={styles.posSelectField}
                    style={{ width: '100%', height: '34px' }}
                  >
                    <option value="TIFFIN">🥞 Tiffin (Idli/Vadai)</option>
                    <option value="DOSA">🪙 Dosa Station</option>
                    <option value="MEALS">🍱 Meals &amp; Gravy</option>
                    <option value="BEVERAGES">☕ Beverages</option>
                    <option value="SNACKS">🥟 Snacks Counter</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Description</label>
                  <input
                    type="text"
                    placeholder="Brief description..."
                    value={categoryFormData.description}
                    onChange={e => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                    className={styles.posDiscountInput}
                    style={{ width: '100%', height: '34px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className={styles.btnPunchKot} style={{ flex: 1, background: '#2563eb', height: '32px', fontSize: '0.75rem' }}>
                  ✓ {isEditingCategory ? 'Update Category' : 'Save Category'}
                </button>
                {isEditingCategory && (
                  <button
                    type="button"
                    className={styles.btnNavAlt}
                    style={{ height: '32px', fontSize: '0.75rem' }}
                    onClick={() => {
                      setIsEditingCategory(false);
                      setCategoryFormData({ id: '', name: '', tamilName: '', icon: '🍽️', description: '', station: 'TIFFIN' });
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Existing Categories Reorder Table */}
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              CATEGORIES CATALOG ({categoriesList.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {categoriesList.map((cat, idx) => {
                const count = menuItems.filter(d => (d.category || '').toLowerCase() === cat.name.toLowerCase()).length;
                return (
                  <div
                    key={cat.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>{cat.icon || '🍽️'}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>
                          {cat.name} {cat.tamilName && <span style={{ color: '#38bdf8', fontSize: '0.72rem' }}>({cat.tamilName})</span>}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          Station: <strong>{cat.station || 'TIFFIN'}</strong> • {count} active dishes
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {/* Reorder Buttons */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleReorderCategory(cat.id, 'UP')}
                        className={styles.btnStatusQuick}
                        style={{ height: '26px', padding: '0 0.4rem', fontSize: '0.7rem' }}
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={idx === categoriesList.length - 1}
                        onClick={() => handleReorderCategory(cat.id, 'DOWN')}
                        className={styles.btnStatusQuick}
                        style={{ height: '26px', padding: '0 0.4rem', fontSize: '0.7rem' }}
                        title="Move Down"
                      >
                        ▼
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        className={styles.btnNavAlt}
                        style={{ height: '26px', padding: '0 0.5rem', fontSize: '0.7rem' }}
                        onClick={() => {
                          setIsEditingCategory(true);
                          setCategoryFormData({
                            id: cat.id,
                            name: cat.name,
                            tamilName: cat.tamilName || '',
                            icon: cat.icon || '🍽️',
                            description: cat.description || '',
                            station: cat.station || 'TIFFIN',
                          });
                        }}
                      >
                        ✏️
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        className={styles.btnNavAlt}
                        style={{ height: '26px', padding: '0 0.4rem', fontSize: '0.7rem', color: '#ef4444' }}
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        title="Delete Category (Manager PIN)"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. Menu Audit Trail Modal (Requirement 17) ─── */}
      {showAuditLogsModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '720px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle}>📜 Menu Audit Trail &amp; Governance Log</h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Immutable log of price changes, availability toggles, recipe edits, and staff actions.
                </div>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowAuditLogsModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Audit Search */}
            <div style={{ marginBottom: '0.75rem' }}>
              <input
                type="text"
                placeholder="Filter audit trail by delicacy name, action, or staff member..."
                value={auditSearchQuery}
                onChange={e => setAuditSearchQuery(e.target.value)}
                className={styles.posDiscountInput}
                style={{ width: '100%', height: '36px' }}
              />
            </div>

            {/* Audit Log Entries */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {menuAuditLogs
                .filter(log => {
                  if (!auditSearchQuery.trim()) return true;
                  const q = auditSearchQuery.toLowerCase();
                  return (
                    (log.dishName || '').toLowerCase().includes(q) ||
                    (log.action || '').toLowerCase().includes(q) ||
                    (log.details || '').toLowerCase().includes(q) ||
                    (log.changedBy || '').toLowerCase().includes(q)
                  );
                })
                .map(log => {
                  const time = new Date(log.timestamp).toLocaleString([], {
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={log.id}
                      style={{
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: log.action.includes('PRICE') ? 'rgba(59, 130, 246, 0.15)' : (log.action.includes('AVAILABILITY') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                            color: log.action.includes('PRICE') ? '#60a5fa' : (log.action.includes('AVAILABILITY') ? '#f87171' : '#34d399'),
                          }}>
                            {log.action}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            {log.dishName}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          ⏱️ {time}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {log.details}
                      </div>

                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.25rem', marginTop: '0.2rem' }}>
                        Authorized by: <strong>{log.changedBy}</strong> ({log.role})
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. Bulk Operations Modal (Requirement 16) ─── */}
      {showBulkActionModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '440px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle}>⚡ Bulk Operations</h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Targeting {selectedDishIds.length} selected delicacies
                </div>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowBulkActionModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {bulkActionType === 'CATEGORY' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                    MOVE TO CATEGORY:
                  </label>
                  <select
                    value={bulkCategoryTarget}
                    onChange={e => setBulkCategoryTarget(e.target.value)}
                    className={styles.posSelectField}
                    style={{ width: '100%', height: '36px' }}
                  >
                    {categoriesList.map(cat => (
                      <option key={cat.id} value={cat.name}>
                        {cat.icon || '🍽️'} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {bulkActionType === 'PRICE' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                    ADJUST PRICE ACROSS SELECTED:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <select
                      value={bulkPriceDeltaType}
                      onChange={e => setBulkPriceDeltaType(e.target.value)}
                      className={styles.posSelectField}
                      style={{ flex: 1, height: '36px' }}
                    >
                      <option value="FLAT">Flat Rate (₹ INR)</option>
                      <option value="PERCENT">Percentage (%)</option>
                    </select>
                    <input
                      type="number"
                      placeholder="e.g. 10 or -5"
                      value={bulkPriceDeltaValue}
                      onChange={e => setBulkPriceDeltaValue(Number(e.target.value) || 0)}
                      className={styles.posDiscountInput}
                      style={{ flex: 1, height: '36px' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Tip: Enter negative values (e.g. -10) to reduce prices, or positive values to increase.
                  </div>
                </div>
              )}

              {bulkActionType === 'DELETE' && (
                <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    ⚠️ Permanent Deletion Warning
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Are you sure you want to permanently delete {selectedDishIds.length} delicacies? Historical orders and receipts will remain intact, but these dishes will be removed from all active menus.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.btnPunchKot}
                  style={{
                    flex: 1,
                    background: bulkActionType === 'DELETE' ? '#dc2626' : '#2563eb',
                  }}
                  onClick={handleApplyBulkAction}
                >
                  Confirm &amp; Apply
                </button>
                <button
                  type="button"
                  className={styles.btnNavAlt}
                  onClick={() => setShowBulkActionModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. Import / Export Catalog Modal (Requirement 16) ─── */}
      {showImportExportModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '580px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle}>📥 Import / 📤 Export Menu Catalog</h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Excel CSV, Tally POS, and JSON catalog interchange.
                </div>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowImportExportModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Export Section */}
              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#38bdf8', marginBottom: '0.35rem' }}>
                  📤 EXPORT MENU CATALOG
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Download current menu catalog with prices, portion sizes, prep times, and stations.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={styles.btnPunchKot}
                    style={{ flex: 1, background: '#10b981', height: '34px', fontSize: '0.75rem' }}
                    onClick={handleExportMenuCsv}
                  >
                    📊 Download CSV (Excel / POS)
                  </button>
                  <button
                    type="button"
                    className={styles.btnNavAlt}
                    style={{ flex: 1, height: '34px', fontSize: '0.75rem' }}
                    onClick={handleExportMenuJson}
                  >
                    💾 Download JSON Backup
                  </button>
                </div>
              </div>

              {/* Import Section */}
              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#a78bfa', marginBottom: '0.35rem' }}>
                  📥 IMPORT DELICACIES VIA CSV
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Format: <code>id,title,tamilTitle,category,price,portionSize,prepTime,station</code>
                </p>
                <textarea
                  rows="4"
                  placeholder="Paste CSV text here..."
                  value={csvImportText}
                  onChange={e => setCsvImportText(e.target.value)}
                  className={styles.posDiscountInput}
                  style={{ width: '100%', height: 'auto', padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.72rem', resize: 'vertical' }}
                />
                <button
                  type="button"
                  className={styles.btnPunchKot}
                  style={{ width: '100%', background: '#7c3aed', marginTop: '0.5rem', height: '34px', fontSize: '0.75rem' }}
                  onClick={handleImportMenuCsv}
                >
                  🚀 Parse &amp; Import Delicacies
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODULE 8: LIVE ORDER MODALS (DETAILS, OTP, EDIT, CANCEL, BILL, KOT)
         ══════════════════════════════════════════════════════════════════════ */}

      {/* ─── Modal 1: Order Details & Audit Trail ─── */}
      {showOrderDetailsModal && selectedOrder && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '650px' }}>
            <div className={styles.posModalHeader}>
              <div>
                <h3 className={styles.posModalTitle} style={{ color: '#38bdf8' }}>
                  📋 Order Details • #{selectedOrder.orderId || selectedOrder.id}
                </h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Table {selectedOrder.tableNumber} • {selectedOrder.orderSource === 'QR' ? '📱 QR Self-Order' : '💻 POS Order'} • Placed {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleTimeString() : 'Recently'}
                </div>
              </div>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowOrderDetailsModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Customer & Status Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Customer</div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{selectedOrder.customerName}</div>
                {selectedOrder.customerPhone && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedOrder.customerPhone}</div>}
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>KOT Ticket</div>
                <div style={{ fontWeight: 800, color: '#818cf8' }}>{selectedOrder.kotNumber}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Station: {selectedOrder.primaryStation}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Current Status</div>
                <span className={styles.orderStatusPill} style={{ marginTop: '0.2rem' }}>
                  {selectedOrder.canonicalStatus?.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Bill Status</div>
                <div style={{ fontWeight: 800, color: selectedOrder.canonicalStatus === 'PAID' ? '#10b981' : selectedOrder.billNumber ? '#c084fc' : '#94a3b8' }}>
                  {selectedOrder.billNumber ? `🧾 ${selectedOrder.billNumber}` : 'UNBILLED'}
                </div>
              </div>
            </div>

            {/* Timestamps & Lifecycle Audit Trail */}
            <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ⏱️ Order Lifecycle Audit Log
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.4rem', fontSize: '0.72rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Created:</span>{' '}
                  <strong>{selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleTimeString() : '—'}</strong>
                </div>
                {selectedOrder.verifiedAt && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>OTP Verified:</span>{' '}
                    <strong>{new Date(selectedOrder.verifiedAt).toLocaleTimeString()}</strong>
                    {selectedOrder.verifiedBy && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>by {selectedOrder.verifiedBy}</div>}
                  </div>
                )}
                {selectedOrder.readyAt && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Ready:</span>{' '}
                    <strong>{new Date(selectedOrder.readyAt).toLocaleTimeString()}</strong>
                  </div>
                )}
                {selectedOrder.servedAt && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Served:</span>{' '}
                    <strong>{new Date(selectedOrder.servedAt).toLocaleTimeString()}</strong>
                    {selectedOrder.servedBy && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>by {selectedOrder.servedBy}</div>}
                  </div>
                )}
                {selectedOrder.billedAt && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Billed:</span>{' '}
                    <strong>{new Date(selectedOrder.billedAt).toLocaleTimeString()}</strong>
                    {selectedOrder.billedBy && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>by {selectedOrder.billedBy}</div>}
                  </div>
                )}
                {selectedOrder.settledAt && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Paid:</span>{' '}
                    <strong style={{ color: '#10b981' }}>{new Date(selectedOrder.settledAt).toLocaleTimeString()}</strong>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>via {selectedOrder.paymentMode || 'CASH'}</div>
                  </div>
                )}
                {selectedOrder.cancelledAt && (
                  <div style={{ gridColumn: '1 / -1', color: '#ef4444' }}>
                    <span>❌ Cancelled at:</span>{' '}
                    <strong>{new Date(selectedOrder.cancelledAt).toLocaleTimeString()}</strong> by {selectedOrder.cancelledBy || 'Staff'}
                    <div style={{ fontStyle: 'italic', marginTop: '0.15rem' }}>Reason: &quot;{selectedOrder.cancellationReason}&quot;</div>
                  </div>
                )}
              </div>
            </div>

            {/* Itemized Order Table */}
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Itemized Delicacies
              </div>
              <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                <table className={styles.menuTable} style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-card-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '0.4rem 0.6rem' }}>Delicacy</th>
                      <th style={{ padding: '0.4rem 0.6rem' }}>Station</th>
                      <th style={{ padding: '0.4rem 0.6rem' }}>Qty</th>
                      <th style={{ padding: '0.4rem 0.6rem' }}>Rate</th>
                      <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || []).map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.4rem 0.6rem' }}>
                          <strong>{it.title}</strong>
                          {it.portion && <span style={{ color: 'var(--text-muted)', marginLeft: '0.3rem' }}>({it.portion})</span>}
                        </td>
                        <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }}>{it.station || 'TIFFIN'}</td>
                        <td style={{ padding: '0.4rem 0.6rem', fontWeight: 800 }}>{it.quantity || 1}</td>
                        <td style={{ padding: '0.4rem 0.6rem' }}>₹{Number(it.price || 0).toFixed(2)}</td>
                        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 800 }}>
                          ₹{(Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Subtotal: ₹{Number(selectedOrder.subtotal || 0).toFixed(2)} • CGST (2.5%): ₹{Number(selectedOrder.cgst || 0).toFixed(2)} • SGST (2.5%): ₹{Number(selectedOrder.sgst || 0).toFixed(2)}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Grand Total</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-gold, #f59e0b)' }}>
                  ₹{Number(selectedOrder.totalAmount || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className={styles.btnOrderAction}
                style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '0.4rem 0.85rem' }}
                onClick={() => {
                  setShowOrderDetailsModal(false);
                  handlePrintKotSlip(selectedOrder);
                }}
              >
                🖨️ Print KOT Slip
              </button>
              {selectedOrder.canonicalStatus === 'OTP_PENDING' && (
                <button
                  type="button"
                  className={styles.btnOrderAction}
                  style={{ background: '#f97316', color: '#fff', padding: '0.4rem 1rem' }}
                  onClick={() => {
                    setShowOrderDetailsModal(false);
                    handleOpenOtpModal(selectedOrder);
                  }}
                >
                  🔑 Verify OTP
                </button>
              )}
              {['READY_TO_SERVE', 'SERVED', 'BILLED'].includes(selectedOrder.canonicalStatus) && (
                <button
                  type="button"
                  className={styles.btnOrderAction}
                  style={{ background: '#10b981', color: '#fff', padding: '0.4rem 1rem' }}
                  onClick={() => {
                    setShowOrderDetailsModal(false);
                    handleOpenBillModal(selectedOrder);
                  }}
                >
                  {selectedOrder.canonicalStatus === 'BILLED' ? '💳 Settle Payment' : '🧾 Generate Bill'}
                </button>
              )}
              <button
                type="button"
                className={styles.btnOrderAction}
                style={{ background: '#2563eb', color: '#fff', padding: '0.4rem 1rem' }}
                onClick={() => setShowOrderDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal 2: OTP Verification ─── */}
      {showOtpModal && selectedOrder && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div className={styles.posModalHeader}>
              <h3 className={styles.posModalTitle} style={{ color: '#f97316' }}>
                🔑 Verify Table QR Order OTP
              </h3>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowOtpModal(false)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0.75rem 0' }}>
              Confirm the 4-digit code displayed on the guest&apos;s mobile screen for <strong>Table #{selectedOrder.tableNumber}</strong> ({selectedOrder.customerName}).
            </p>

            {/* Customer OTP Hint / Quick Auto-fill banner */}
            <div style={{ background: 'rgba(249, 115, 22, 0.12)', border: '1px dashed #f97316', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#f97316', fontWeight: 700 }}>
                CUSTOMER MOBILE SCREEN OTP CODE:
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '0.3em', color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                {selectedOrder.otpCode || selectedOrder.otp || '4829'}
              </div>
              <button
                type="button"
                style={{
                  background: 'rgba(249, 115, 22, 0.2)',
                  border: '1px solid #f97316',
                  color: '#fb923c',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginTop: '0.25rem',
                }}
                onClick={() => setEnteredOtp(String(selectedOrder.otpCode || selectedOrder.otp || '4829'))}
              >
                ⚡ Auto-fill Customer OTP ({selectedOrder.otpCode || selectedOrder.otp || '4829'})
              </button>
            </div>

            {/* 4-Digit Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 700 }}>
                ENTER 4-DIGIT VERIFICATION OTP:
              </label>
              <input
                type="text"
                maxLength={4}
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • •"
                autoFocus
                style={{
                  width: '180px',
                  height: '48px',
                  textAlign: 'center',
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  letterSpacing: '0.4em',
                  borderRadius: '10px',
                  border: '2px solid #f97316',
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                className={styles.btnOrderAction}
                style={{
                  background: '#f97316',
                  color: '#fff',
                  height: '42px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                }}
                disabled={enteredOtp.length !== 4}
                onClick={() => handleVerifyOtp(selectedOrder.id, enteredOtp, false)}
              >
                ✅ Verify OTP &amp; Fire KOT to Kitchen
              </button>

              <button
                type="button"
                className={styles.btnOrderAction}
                style={{
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  height: '34px',
                  fontSize: '0.74rem',
                }}
                onClick={() => handleVerifyOtp(selectedOrder.id, '', true)}
              >
                🛡️ Floor Captain Override (Bypass OTP)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal 3: Edit Permitted Items (Before Served) ─── */}
      {showEditItemsModal && selectedOrder && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '600px' }}>
            <div className={styles.posModalHeader}>
              <h3 className={styles.posModalTitle} style={{ color: '#3b82f6' }}>
                ✏️ Edit Items • Table #{selectedOrder.tableNumber}
              </h3>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowEditItemsModal(false)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
              Add, remove, or modify portions for active order #{selectedOrder.orderId || selectedOrder.id} before the dish is served.
            </p>

            {/* Existing Items in Order */}
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.5rem' }}>
              {editOrderItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{item.title}</strong>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      ₹{Number(item.price || 0).toFixed(2)} • {item.station || 'TIFFIN'}
                    </div>
                  </div>

                  {/* Qty increment / decrement */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      type="button"
                      style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card-subtle)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 800 }}
                      onClick={() => {
                        const next = [...editOrderItems];
                        if (next[idx].quantity > 1) {
                          next[idx].quantity -= 1;
                          setEditOrderItems(next);
                        } else {
                          setEditOrderItems(next.filter((_, i) => i !== idx));
                        }
                      }}
                    >
                      -
                    </button>
                    <span style={{ fontWeight: 800, minWidth: '20px', textAlign: 'center', fontSize: '0.85rem' }}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card-subtle)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 800 }}
                      onClick={() => {
                        const next = [...editOrderItems];
                        next[idx].quantity += 1;
                        setEditOrderItems(next);
                      }}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      style={{ marginLeft: '0.5rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}
                      onClick={() => setEditOrderItems(editOrderItems.filter((_, i) => i !== idx))}
                      title="Remove item"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Dish from Menu */}
            <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', marginBottom: '0.4rem' }}>
                ➕ ADD EXTRA DELICACY FROM MENU
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  value={addDishSelectId}
                  onChange={(e) => setAddDishSelectId(e.target.value)}
                  className={styles.posDiscountInput}
                  style={{ flex: 2, minWidth: '180px', height: '34px' }}
                >
                  <option value="">Select Delicacy...</option>
                  {(menuItems || []).map(dish => (
                    <option key={dish.id} value={dish.id}>
                      {dish.title} (₹{dish.price})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  max="20"
                  value={addDishQty}
                  onChange={(e) => setAddDishQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className={styles.posDiscountInput}
                  style={{ width: '60px', height: '34px', textAlign: 'center' }}
                />

                <button
                  type="button"
                  className={styles.btnOrderAction}
                  style={{ background: '#2563eb', color: '#fff', height: '34px', padding: '0 0.85rem' }}
                  onClick={handleAddDishToEditOrder}
                  disabled={!addDishSelectId}
                >
                  Add Item
                </button>
              </div>
            </div>

            {/* Special Cooking Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.2rem' }}>
                SPECIAL COOKING INSTRUCTIONS / NOTES:
              </label>
              <textarea
                rows="2"
                placeholder="e.g. Extra spicy, serve chutney on side, crispy roast..."
                value={editCookingNotes}
                onChange={(e) => setEditCookingNotes(e.target.value)}
                className={styles.posDiscountInput}
                style={{ width: '100%', height: 'auto', padding: '0.4rem', fontSize: '0.75rem', resize: 'vertical' }}
              />
            </div>

            {/* Recalculated Financial Preview */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card-subtle)', padding: '0.6rem 0.85rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Updated Subtotal ({editOrderItems.reduce((acc, it) => acc + (it.quantity || 1), 0)} items):
              </span>
              <strong style={{ fontSize: '1rem', color: '#f59e0b' }}>
                ₹{editOrderItems.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0).toFixed(2)}
              </strong>
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className={styles.btnOrderAction}
                style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '0.4rem 0.85rem' }}
                onClick={() => setShowEditItemsModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnOrderAction}
                style={{ background: '#10b981', color: '#fff', padding: '0.4rem 1.25rem' }}
                onClick={handleSaveEditItems}
                disabled={editOrderItems.length === 0}
              >
                💾 Save Changes &amp; Dispatch to KDS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal 4: Cancel Order with Mandatory Reason ─── */}
      {showCancelOrderModal && selectedOrder && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '460px' }}>
            <div className={styles.posModalHeader}>
              <h3 className={styles.posModalTitle} style={{ color: '#ef4444' }}>
                ❌ Cancel Order • Table #{selectedOrder.tableNumber}
              </h3>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowCancelOrderModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.75rem', color: '#f87171' }}>
              ⚠️ Cancelling order <strong>#{selectedOrder.orderId || selectedOrder.id}</strong> will void associated kitchen KOT tickets and release Table #{selectedOrder.tableNumber} if no other active orders exist.
            </div>

            {/* Quick Preset Reasons */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.3rem' }}>
                SELECT CANCELLATION REASON:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                {[
                  'Guest requested cancellation',
                  'Customer left table / emergency',
                  'Duplicate order placed',
                  'Wrong table number entered',
                  'Item out of stock in kitchen',
                  'Customer changed mind on items',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCancellationReason(preset)}
                    style={{
                      background: cancellationReason === preset ? '#ef4444' : 'var(--bg-card-subtle)',
                      color: cancellationReason === preset ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.68rem',
                      cursor: 'pointer',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                rows="3"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Specify reason for cancelling order..."
                className={styles.posDiscountInput}
                style={{ width: '100%', height: 'auto', padding: '0.4rem', fontSize: '0.75rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className={styles.btnOrderAction}
                style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '0.4rem 0.85rem' }}
                onClick={() => setShowCancelOrderModal(false)}
              >
                Keep Order Active
              </button>
              <button
                type="button"
                className={styles.btnOrderAction}
                style={{ background: '#ef4444', color: '#fff', padding: '0.4rem 1.25rem' }}
                disabled={!cancellationReason || cancellationReason.trim().length < 3}
                onClick={handleConfirmCancelOrder}
              >
                ❌ Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal 5: Generate Bill & Settle Payment ─── */}
      {showBillModal && selectedOrder && (() => {
        const orderSubtotal = selectedOrder.subtotal || (selectedOrder.items || []).reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
        const discountVal = Math.round((orderSubtotal * (Number(billDiscountPercent) / 100)) * 100) / 100;
        const taxableSub = Math.max(0, orderSubtotal - discountVal);
        const cgstVal = Math.round(taxableSub * 0.025 * 100) / 100;
        const sgstVal = Math.round(taxableSub * 0.025 * 100) / 100;
        const grossVal = taxableSub + cgstVal + sgstVal;
        const finalNetPayable = Math.round(grossVal);
        const changeDue = billCashTendered && Number(billCashTendered) >= finalNetPayable ? Number(billCashTendered) - finalNetPayable : 0;

        return (
          <div className={styles.posModalOverlay}>
            <div className={styles.posModalBox} style={{ maxWidth: '620px' }}>
              <div className={styles.posModalHeader}>
                <h3 className={styles.posModalTitle} style={{ color: '#10b981' }}>
                  🧾 Billing &amp; Settlement • Table #{selectedOrder.tableNumber}
                </h3>
                <button
                  type="button"
                  className={styles.posModalCloseBtn}
                  onClick={() => setShowBillModal(false)}
                >
                  ✕
                </button>
              </div>

              {/* Order Overview Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card-subtle)', padding: '0.6rem 0.85rem', borderRadius: '8px' }}>
                <div>
                  <strong style={{ fontSize: '0.85rem' }}>{selectedOrder.customerName}</strong>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Order #{selectedOrder.orderId || selectedOrder.id} • {(selectedOrder.items || []).length} delicacies
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Bill Status</div>
                  <strong style={{ color: selectedOrder.billNumber ? '#c084fc' : '#f59e0b', fontSize: '0.85rem' }}>
                    {selectedOrder.billNumber ? `🧾 ${selectedOrder.billNumber}` : 'UNBILLED'}
                  </strong>
                </div>
              </div>

              {/* Discount Selector */}
              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  APPLY DISCOUNT / PROMO:
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setBillDiscountPercent(pct)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        background: billDiscountPercent === pct ? '#2563eb' : 'var(--bg-card)',
                        color: billDiscountPercent === pct ? '#fff' : 'var(--text-primary)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {pct === 0 ? 'No Discount' : `${pct}% Off`}
                    </button>
                  ))}
                  <input
                    type="text"
                    placeholder="Discount Reason (e.g. VIP / Festival Offer)"
                    value={billDiscountReason}
                    onChange={(e) => setBillDiscountReason(e.target.value)}
                    className={styles.posDiscountInput}
                    style={{ flex: 1, minWidth: '160px', height: '30px', fontSize: '0.72rem' }}
                  />
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.6rem 0.85rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Delicacies Subtotal:</span>
                  <strong>₹{orderSubtotal.toFixed(2)}</strong>
                </div>
                {billDiscountPercent > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#10b981' }}>
                    <span>Discount ({billDiscountPercent}%):</span>
                    <strong>-₹{discountVal.toFixed(2)}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: 'var(--text-muted)' }}>
                  <span>CGST (2.5%):</span>
                  <span>+₹{cgstVal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: 'var(--text-muted)' }}>
                  <span>SGST (2.5%):</span>
                  <span>+₹{sgstVal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0 0.2rem 0', borderTop: '1px dashed var(--border-subtle)', fontSize: '0.95rem' }}>
                  <span style={{ fontWeight: 800 }}>NET PAYABLE (Round-off):</span>
                  <strong style={{ fontSize: '1.25rem', color: '#f59e0b' }}>₹{finalNetPayable.toFixed(2)}</strong>
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  SELECT PAYMENT MODE:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {['CASH', 'UPI', 'CARD'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setBillPaymentMode(mode)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: billPaymentMode === mode ? '#10b981' : 'var(--bg-card)',
                        color: billPaymentMode === mode ? '#fff' : 'var(--text-primary)',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {mode === 'CASH' ? '💵 CASH' : mode === 'UPI' ? '📱 UPI / QR' : '💳 CARD'}
                    </button>
                  ))}
                </div>

                {/* Cash Calculator */}
                {billPaymentMode === 'CASH' && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                        CASH TENDERED (₹):
                      </label>
                      <input
                        type="number"
                        placeholder={`e.g. ${finalNetPayable}`}
                        value={billCashTendered}
                        onChange={(e) => setBillCashTendered(e.target.value)}
                        className={styles.posDiscountInput}
                        style={{ width: '100%', height: '34px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ flex: 1, background: 'var(--bg-card)', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>CHANGE DUE:</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: changeDue > 0 ? '#10b981' : 'var(--text-primary)' }}>
                        ₹{changeDue.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {/* UPI Ref */}
                {billPaymentMode === 'UPI' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      UPI TRANSACTION UTR / REF NUMBER (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 523891048192"
                      value={billTransactionRef}
                      onChange={(e) => setBillTransactionRef(e.target.value)}
                      className={styles.posDiscountInput}
                      style={{ width: '100%', height: '34px', fontSize: '0.78rem' }}
                    />
                  </div>
                )}

                {/* Card Ref */}
                {billPaymentMode === 'CARD' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      CARD MACHINE AUTH CODE / SLIP REF:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AUTH-91823"
                      value={billTransactionRef}
                      onChange={(e) => setBillTransactionRef(e.target.value)}
                      className={styles.posDiscountInput}
                      style={{ width: '100%', height: '34px', fontSize: '0.78rem' }}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.btnOrderAction}
                  style={{ background: '#d97706', color: '#fff', padding: '0.4rem 1rem' }}
                  onClick={handleGenerateBillOnly}
                >
                  🧾 Generate Bill Only (Unpaid)
                </button>

                <button
                  type="button"
                  className={styles.btnOrderAction}
                  style={{ background: '#059669', color: '#fff', padding: '0.4rem 1.25rem', fontWeight: 800 }}
                  onClick={handleProcessPaymentSettlement}
                >
                  ✅ Settle Payment &amp; Print Thermal Slip
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Modal 6: Thermal Receipt Slip (80mm) ─── */}
      {showThermalReceiptModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '420px' }}>
            <div className={styles.posModalHeader}>
              <h3 className={styles.posModalTitle} style={{ color: '#10b981' }}>
                🧾 Thermal Receipt (80mm ESC/POS)
              </h3>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowThermalReceiptModal(false)}
              >
                ✕
              </button>
            </div>

            <pre
              style={{
                background: '#ffffff',
                color: '#111827',
                padding: '1rem',
                borderRadius: '8px',
                fontFamily: 'Courier New, Courier, monospace',
                fontSize: '0.72rem',
                lineHeight: 1.25,
                maxHeight: '380px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                border: '1px solid #d1d5db',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              {thermalReceiptText}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className={styles.btnOrderAction}
                style={{ background: '#2563eb', color: '#fff', padding: '0.4rem 1rem' }}
                onClick={() => {
                  window.print();
                }}
              >
                🖨️ Print Receipt
              </button>
              <button
                type="button"
                className={styles.btnOrderAction}
                style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '0.4rem 0.85rem' }}
                onClick={() => setShowThermalReceiptModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal 7: Kitchen Order Ticket (KOT) Slip ─── */}
      {showKotSlipModal && (
        <div className={styles.posModalOverlay}>
          <div className={styles.posModalBox} style={{ maxWidth: '420px' }}>
            <div className={styles.posModalHeader}>
              <h3 className={styles.posModalTitle} style={{ color: '#818cf8' }}>
                🎫 Kitchen KOT Ticket Slip
              </h3>
              <button
                type="button"
                className={styles.posModalCloseBtn}
                onClick={() => setShowKotSlipModal(false)}
              >
                ✕
              </button>
            </div>

            <pre
              style={{
                background: '#ffffff',
                color: '#111827',
                padding: '1rem',
                borderRadius: '8px',
                fontFamily: 'Courier New, Courier, monospace',
                fontSize: '0.72rem',
                lineHeight: 1.25,
                maxHeight: '380px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                border: '1px solid #d1d5db',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              {kotSlipText}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className={styles.btnOrderAction}
                style={{ background: '#818cf8', color: '#fff', padding: '0.4rem 1rem' }}
                onClick={() => {
                  window.print();
                }}
              >
                🖨️ Print Ticket
              </button>
              <button
                type="button"
                className={styles.btnOrderAction}
                style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '0.4rem 0.85rem' }}
                onClick={() => setShowKotSlipModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CRM MODAL 1: CUSTOMER PROFILE & 360° DINING HISTORY
         ══════════════════════════════════════════════════════════════════════ */}
      {showCustomerDetailsModal && crmSelectedCustomer && (
        <div className={styles.crmModalBackdrop} onClick={() => setShowCustomerDetailsModal(false)}>
          <div className={styles.crmModalBox} style={{ maxWidth: '840px' }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.crmModalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className={styles.crmAvatar} style={{ width: '38px', height: '38px', fontSize: '0.95rem' }}>
                  {crmSelectedCustomer.name ? crmSelectedCustomer.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <div>
                  <h3 className={styles.crmModalTitle}>
                    {crmSelectedCustomer.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                    <span className={styles.crmIdTag}>{crmSelectedCustomer.customerId || crmSelectedCustomer.id}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Registered: {crmSelectedCustomer.registeredAt ? new Date(crmSelectedCustomer.registeredAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={styles.crmTierBadge} style={{
                  background: crmSelectedCustomer.loyaltyTier === 'PLATINUM' ? '#e0e7ff' : crmSelectedCustomer.loyaltyTier === 'GOLD' ? '#fef3c7' : '#f1f5f9',
                  color: crmSelectedCustomer.loyaltyTier === 'PLATINUM' ? '#3730a3' : crmSelectedCustomer.loyaltyTier === 'GOLD' ? '#92400e' : '#334155'
                }}>
                  {crmSelectedCustomer.loyaltyTier || 'BRONZE'}
                </span>
                <button
                  type="button"
                  className={styles.crmModalCloseBtn}
                  onClick={() => setShowCustomerDetailsModal(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Tabs Bar */}
            <div className={styles.crmModalTabs}>
              <button
                type="button"
                className={`${styles.crmModalTabBtn} ${crmModalTab === 'OVERVIEW' ? styles.crmModalTabActive : ''}`}
                onClick={() => setCrmModalTab('OVERVIEW')}
              >
                📊 Overview &amp; Stats
              </button>
              <button
                type="button"
                className={`${styles.crmModalTabBtn} ${crmModalTab === 'ORDERS' ? styles.crmModalTabActive : ''}`}
                onClick={() => setCrmModalTab('ORDERS')}
              >
                🧾 Orders &amp; Bills ({crmSelectedCustomer.orderHistory?.length || 0})
              </button>
              <button
                type="button"
                className={`${styles.crmModalTabBtn} ${crmModalTab === 'DISHES' ? styles.crmModalTabActive : ''}`}
                onClick={() => setCrmModalTab('DISHES')}
              >
                🍛 Favorite Dishes ({crmSelectedCustomer.favoriteDishes?.length || 0})
              </button>
              <button
                type="button"
                className={`${styles.crmModalTabBtn} ${crmModalTab === 'LOYALTY' ? styles.crmModalTabActive : ''}`}
                onClick={() => setCrmModalTab('LOYALTY')}
              >
                ⭐ Loyalty Points ({crmSelectedCustomer.loyaltyPoints || 0})
              </button>
              <button
                type="button"
                className={`${styles.crmModalTabBtn} ${crmModalTab === 'FEEDBACK' ? styles.crmModalTabActive : ''}`}
                onClick={() => setCrmModalTab('FEEDBACK')}
              >
                💬 Feedback &amp; Reviews ({crmSelectedCustomer.feedback?.length || 0})
              </button>
              <button
                type="button"
                className={`${styles.crmModalTabBtn} ${crmModalTab === 'NOTES' ? styles.crmModalTabActive : ''}`}
                onClick={() => setCrmModalTab('NOTES')}
              >
                📝 Notes &amp; Preferences ({crmSelectedCustomer.notes?.length || 0})
              </button>
              <button
                type="button"
                className={`${styles.crmModalTabBtn} ${crmModalTab === 'OFFERS' ? styles.crmModalTabActive : ''}`}
                onClick={() => setCrmModalTab('OFFERS')}
              >
                🎁 Offers ({crmSelectedCustomer.promotions?.length || 0})
              </button>
            </div>

            {/* Modal Body Content */}
            <div className={styles.crmModalBody}>
              {/* TAB 1: OVERVIEW & STATS */}
              {crmModalTab === 'OVERVIEW' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Stats Highlights */}
                  <div className={styles.crmMetricsRow} style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                    <div className={styles.crmMetricItem}>
                      <span className={styles.crmMetricLabel}>Total Visits</span>
                      <span className={styles.crmMetricVal} style={{ fontSize: '1.2rem' }}>{crmSelectedCustomer.visits || 0}</span>
                    </div>
                    <div className={styles.crmMetricItem}>
                      <span className={styles.crmMetricLabel}>Lifetime Spend</span>
                      <span className={styles.crmMetricVal} style={{ fontSize: '1.2rem', color: '#10b981' }}>
                        ₹{crmSelectedCustomer.totalSpend || 0}
                      </span>
                    </div>
                    <div className={styles.crmMetricItem}>
                      <span className={styles.crmMetricLabel}>Average Bill</span>
                      <span className={styles.crmMetricVal} style={{ fontSize: '1.2rem' }}>
                        ₹{Math.round(crmSelectedCustomer.averageBillValue || 0)}
                      </span>
                    </div>
                    <div className={styles.crmMetricItem}>
                      <span className={styles.crmMetricLabel}>Reward Points</span>
                      <span className={styles.crmMetricVal} style={{ fontSize: '1.2rem', color: '#f59e0b' }}>
                        ⭐ {crmSelectedCustomer.loyaltyPoints || 0}
                      </span>
                    </div>
                    <div className={styles.crmMetricItem}>
                      <span className={styles.crmMetricLabel}>Redeemed Points</span>
                      <span className={styles.crmMetricVal} style={{ fontSize: '1.2rem', color: '#8b5cf6' }}>
                        {crmSelectedCustomer.pointsRedeemedTotal || 0} pts
                      </span>
                    </div>
                  </div>

                  {/* Contact & Personal Information Card */}
                  <div style={{ background: 'var(--bg-card-subtle)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      👤 Contact &amp; Personal Info
                      <button
                        type="button"
                        onClick={() => setPrivacyMasked(prev => !prev)}
                        style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontSize: '0.74rem', cursor: 'pointer', fontWeight: 700 }}
                      >
                        {privacyMasked ? '👁️ Unmask Details' : '🔒 Mask Details'}
                      </button>
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Phone Number: </span>
                        <strong>{privacyMasked ? maskPhone(crmSelectedCustomer.phone, true) : crmSelectedCustomer.phone}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Email: </span>
                        <strong>{privacyMasked ? maskEmail(crmSelectedCustomer.email, true) : (crmSelectedCustomer.email || 'N/A')}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Karaikudi Address: </span>
                        <strong>{crmSelectedCustomer.address || 'Karaikudi, Tamil Nadu'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Last Visit Date: </span>
                        <strong>{crmSelectedCustomer.lastVisit ? new Date(crmSelectedCustomer.lastVisit).toLocaleString() : 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Birthday: </span>
                        <strong>{crmSelectedCustomer.birthday ? new Date(crmSelectedCustomer.birthday).toLocaleDateString() : 'Not recorded'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Anniversary: </span>
                        <strong>{crmSelectedCustomer.anniversary ? new Date(crmSelectedCustomer.anniversary).toLocaleDateString() : 'Not recorded'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Customer Segment & Privilege Notice */}
                  <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <strong style={{ color: 'var(--accent-blue)', fontSize: '0.84rem' }}>
                        Dining Segment: {crmSelectedCustomer.segment || 'REGULAR'}
                      </strong>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        Eligible for 10% loyalty cashback, priority reservations, and seasonal Chettinad vouchers.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className={styles.crmBtnSm}
                        style={{ background: '#f59e0b', color: '#fff' }}
                        onClick={() => setShowAdjustLoyaltyModal(true)}
                      >
                        ⭐ Points
                      </button>
                      <button
                        type="button"
                        className={styles.crmBtnSm}
                        style={{ background: '#7c3aed', color: '#fff' }}
                        onClick={() => setShowCreateOfferModal(true)}
                      >
                        🎁 Issue Offer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PREVIOUS QR & POS ORDERS */}
              {crmModalTab === 'ORDERS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                      Complete Order History ({crmSelectedCustomer.orderHistory?.length || 0} Bills)
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Combined QR Orders &amp; POS Counter Bills
                    </span>
                  </div>

                  {!crmSelectedCustomer.orderHistory || crmSelectedCustomer.orderHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      No order records found for this customer.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                      <table className={styles.crmHistoryTable}>
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Type</th>
                            <th>Date &amp; Time</th>
                            <th>Bill Number</th>
                            <th>Ordered Delicacies</th>
                            <th style={{ textAlign: 'right' }}>Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {crmSelectedCustomer.orderHistory.map((ord, idx) => (
                            <tr key={idx}>
                              <td>
                                <strong style={{ color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
                                  {ord.orderId}
                                </strong>
                              </td>
                              <td>
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  background: ord.type === 'QR' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                                  color: ord.type === 'QR' ? '#3b82f6' : '#10b981',
                                }}>
                                  {ord.type || 'POS'}
                                </span>
                              </td>
                              <td>{ord.date ? new Date(ord.date).toLocaleString() : 'N/A'}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{ord.billNumber || '—'}</td>
                              <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {ord.itemsSummary || 'Standard Dining Order'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                                ₹{ord.total || 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: FREQUENTLY ORDERED DISHES */}
              {crmModalTab === 'DISHES' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    🍛 Patron Delicacies Preference &amp; Re-order Frequency
                  </div>

                  {!crmSelectedCustomer.favoriteDishes || crmSelectedCustomer.favoriteDishes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      No dish favorites recorded yet.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                      {crmSelectedCustomer.favoriteDishes.map((fav, i) => (
                        <div key={i} style={{
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                              {fav.title}
                            </strong>
                            <span style={{
                              background: 'var(--accent-primary)',
                              color: '#fff',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              borderRadius: '9999px',
                              padding: '0.1rem 0.45rem',
                            }}>
                              {fav.count}x
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Ordered {fav.count} times across {crmSelectedCustomer.visits || 1} dining visits
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: LOYALTY POINTS & REWARDS LEDGER */}
              {crmModalTab === 'LOYALTY' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#92400e', fontWeight: 800 }}>
                        Active Points Balance
                      </span>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1.1 }}>
                        ⭐ {crmSelectedCustomer.loyaltyPoints || 0} pts
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Worth <strong>₹{crmSelectedCustomer.loyaltyPoints || 0}</strong> in dining discount credit
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                      <span className={styles.crmTierBadge} style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #f59e0b',
                        fontSize: '0.8rem',
                        padding: '0.3rem 0.8rem',
                      }}>
                        {crmSelectedCustomer.loyaltyTier || 'BRONZE'} TIER
                      </span>
                      <button
                        type="button"
                        className={styles.crmActionBtnPrimary}
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
                        onClick={() => setShowAdjustLoyaltyModal(true)}
                      >
                        ⭐ Adjust / Redeem Points
                      </button>
                    </div>
                  </div>

                  {/* Loyalty Benefits Checklist */}
                  <div style={{ background: 'var(--bg-card-subtle)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                      Privileges &amp; Rewards:
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <li>Earn 1 point for every ₹10 spent on dine-in meals or takeaway.</li>
                      <li>Points never expire for Active Karaikudi patrons.</li>
                      <li>Redeem points directly on TVSE Touch POS during final bill settlement.</li>
                      <li>Lifetime Points Redeemed so far: <strong>{crmSelectedCustomer.pointsRedeemedTotal || 0} pts</strong>.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 5: FEEDBACK & REVIEWS */}
              {crmModalTab === 'FEEDBACK' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                      Customer Reviews &amp; Suggestions ({crmSelectedCustomer.feedback?.length || 0})
                    </strong>
                    <button
                      type="button"
                      className={styles.crmBtnSmPrimary}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => setShowAddFeedbackModal(true)}
                    >
                      💬 Log Feedback
                    </button>
                  </div>

                  {!crmSelectedCustomer.feedback || crmSelectedCustomer.feedback.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      No feedback logs recorded yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {crmSelectedCustomer.feedback.map((fb, idx) => (
                        <div key={idx} style={{
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ color: '#f59e0b', fontSize: '0.95rem' }}>
                                {'★'.repeat(fb.rating || 5)}{'☆'.repeat(5 - (fb.rating || 5))}
                              </span>
                              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                                {fb.category || 'General'}
                              </span>
                            </div>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: fb.status === 'RESOLVED' ? 'rgba(16,185,129,0.15)' : 'rgba(234,88,12,0.15)',
                              color: fb.status === 'RESOLVED' ? '#10b981' : '#ea580c',
                            }}>
                              {fb.status || 'RESOLVED'}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                            &ldquo;{fb.comments}&rdquo;
                          </p>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Recorded: {fb.date ? new Date(fb.date).toLocaleDateString() : 'Recent'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: INTERNAL NOTES & PREFERENCES */}
              {crmModalTab === 'NOTES' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                      Staff Internal Notes &amp; Dietary Preferences ({crmSelectedCustomer.notes?.length || 0})
                    </strong>
                    <button
                      type="button"
                      className={styles.crmBtnSmPrimary}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => setShowAddNoteModal(true)}
                    >
                      📝 Add Note
                    </button>
                  </div>

                  {!crmSelectedCustomer.notes || crmSelectedCustomer.notes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      No internal notes added yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {crmSelectedCustomer.notes.map((nt, idx) => (
                        <div key={idx} style={{
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.3rem',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '0.1rem 0.45rem',
                              borderRadius: '4px',
                              background: nt.type === 'ALLERGY' ? 'rgba(239,68,68,0.15)' : nt.type === 'VIP' ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)',
                              color: nt.type === 'ALLERGY' ? '#ef4444' : nt.type === 'VIP' ? '#8b5cf6' : '#3b82f6',
                            }}>
                              {nt.type || 'PREFERENCE'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              By {nt.author || 'Staff'} • {nt.date ? new Date(nt.date).toLocaleDateString() : 'Recent'}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.35 }}>
                            {nt.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: ACTIVE OFFERS & PROMOTIONS */}
              {crmModalTab === 'OFFERS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                      Assigned Offers &amp; Birthday Specials ({crmSelectedCustomer.promotions?.length || 0})
                    </strong>
                    <button
                      type="button"
                      className={styles.crmBtnSmPrimary}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => setShowCreateOfferModal(true)}
                    >
                      🎁 Issue New Offer
                    </button>
                  </div>

                  {!crmSelectedCustomer.promotions || crmSelectedCustomer.promotions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      No active offers assigned to this patron.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                      {crmSelectedCustomer.promotions.map((pr, idx) => (
                        <div key={idx} style={{
                          background: 'linear-gradient(135deg, var(--bg-card-subtle), rgba(37,99,235,0.05))',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              background: '#10b981',
                              color: '#fff',
                            }}>
                              {pr.discountPercent}% OFF
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>
                              {pr.status || 'ACTIVE'}
                            </span>
                          </div>
                          <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                            {pr.title}
                          </strong>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.1)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.78rem' }}>
                              {pr.promoCode}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Valid till: {pr.validTill || 'End of Month'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={styles.crmModalFooter}>
              <button
                type="button"
                className={styles.crmActionBtnSec}
                onClick={() => setShowCustomerDetailsModal(false)}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CRM MODAL 2: REGISTER NEW CUSTOMER PROFILE
         ══════════════════════════════════════════════════════════════════════ */}
      {showAddCustomerModal && (
        <div className={styles.crmModalBackdrop} onClick={() => setShowAddCustomerModal(false)}>
          <div className={styles.crmModalBox} style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.crmModalHeader}>
              <h3 className={styles.crmModalTitle}>
                ➕ Register New Customer Profile
              </h3>
              <button
                type="button"
                className={styles.crmModalCloseBtn}
                onClick={() => setShowAddCustomerModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              <div className={styles.crmModalBody} style={{ gap: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alagappan Chettiar"
                      value={newCustForm.name}
                      onChange={(e) => setNewCustForm(p => ({ ...p, name: e.target.value }))}
                      className={styles.crmSearchInput}
                      style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.5rem', width: '100%', background: 'var(--bg-input)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9842100000"
                      value={newCustForm.phone}
                      onChange={(e) => setNewCustForm(p => ({ ...p, phone: e.target.value }))}
                      className={styles.crmSearchInput}
                      style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.5rem', width: '100%', background: 'var(--bg-input)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. patron@heritage.in"
                      value={newCustForm.email}
                      onChange={(e) => setNewCustForm(p => ({ ...p, email: e.target.value }))}
                      className={styles.crmSearchInput}
                      style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.5rem', width: '100%', background: 'var(--bg-input)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Initial Segment
                    </label>
                    <select
                      value={newCustForm.segment}
                      onChange={(e) => setNewCustForm(p => ({ ...p, segment: e.target.value }))}
                      className={styles.crmSortSelect}
                      style={{ width: '100%', padding: '0.5rem' }}
                    >
                      <option value="NEW">🌱 New Customer</option>
                      <option value="REGULAR">🍛 Regular Patron</option>
                      <option value="VIP">👑 VIP Circle</option>
                      <option value="HIGH_SPENDING">💎 High Spender</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Karaikudi Address / Neighborhood
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kalanivasal, Karaikudi"
                    value={newCustForm.address}
                    onChange={(e) => setNewCustForm(p => ({ ...p, address: e.target.value }))}
                    className={styles.crmSearchInput}
                    style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.5rem', width: '100%', background: 'var(--bg-input)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Birthday
                    </label>
                    <input
                      type="date"
                      value={newCustForm.birthday}
                      onChange={(e) => setNewCustForm(p => ({ ...p, birthday: e.target.value }))}
                      style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.45rem', width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Anniversary
                    </label>
                    <input
                      type="date"
                      value={newCustForm.anniversary}
                      onChange={(e) => setNewCustForm(p => ({ ...p, anniversary: e.target.value }))}
                      style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.45rem', width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Welcome Points
                    </label>
                    <input
                      type="number"
                      value={newCustForm.initialPoints}
                      onChange={(e) => setNewCustForm(p => ({ ...p, initialPoints: e.target.value }))}
                      style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.45rem', width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Dietary Notes / Table Preferences
                  </label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Prefers AC Hall seating, strictly no onion/garlic on fasting days..."
                    value={newCustForm.notes}
                    onChange={(e) => setNewCustForm(p => ({ ...p, notes: e.target.value }))}
                    style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.5rem', width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.8rem', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className={styles.crmModalFooter}>
                <button
                  type="button"
                  className={styles.crmActionBtnSec}
                  onClick={() => setShowAddCustomerModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.crmActionBtnPrimary}
                >
                  ✓ Register Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CRM MODAL 3: ADJUST LOYALTY REWARD POINTS
         ══════════════════════════════════════════════════════════════════════ */}
      {showAdjustLoyaltyModal && crmSelectedCustomer && (
        <div className={styles.crmModalBackdrop} onClick={() => setShowAdjustLoyaltyModal(false)}>
          <div className={styles.crmModalBox} style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.crmModalHeader}>
              <h3 className={styles.crmModalTitle}>
                ⭐ Adjust Loyalty Points
              </h3>
              <button
                type="button"
                className={styles.crmModalCloseBtn}
                onClick={() => setShowAdjustLoyaltyModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustLoyalty}>
              <div className={styles.crmModalBody} style={{ gap: '1rem' }}>
                <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                    {crmSelectedCustomer.name} ({crmSelectedCustomer.customerId || crmSelectedCustomer.id})
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#f59e0b', marginTop: '0.2rem', fontWeight: 700 }}>
                    Current Balance: ⭐ {crmSelectedCustomer.loyaltyPoints || 0} pts • {crmSelectedCustomer.loyaltyTier || 'BRONZE'} Tier
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Adjustment Action
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`${styles.crmBtnSm} ${loyaltyAdjustForm.type === 'EARN' ? styles.crmBtnSmPrimary : styles.crmBtnSmOutline}`}
                      style={{ justifyContent: 'center', padding: '0.5rem' }}
                      onClick={() => setLoyaltyAdjustForm(p => ({ ...p, type: 'EARN' }))}
                    >
                      ➕ Add / Earn Points
                    </button>
                    <button
                      type="button"
                      className={`${styles.crmBtnSm} ${loyaltyAdjustForm.type === 'REDEEM' ? styles.crmBtnSmPrimary : styles.crmBtnSmOutline}`}
                      style={{ justifyContent: 'center', padding: '0.5rem', background: loyaltyAdjustForm.type === 'REDEEM' ? '#ea580c' : undefined }}
                      onClick={() => setLoyaltyAdjustForm(p => ({ ...p, type: 'REDEEM' }))}
                    >
                      ➖ Redeem Points
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Points Amount *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={loyaltyAdjustForm.type === 'REDEEM' ? crmSelectedCustomer.loyaltyPoints || 1 : 10000}
                    value={loyaltyAdjustForm.points}
                    onChange={(e) => setLoyaltyAdjustForm(p => ({ ...p, points: e.target.value }))}
                    style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.5rem', width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 700 }}
                  />
                  {loyaltyAdjustForm.type === 'REDEEM' && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Max redeemable: {crmSelectedCustomer.loyaltyPoints || 0} pts (1 pt = ₹1 discount credit)
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Reason / Bill Reference *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dining Visit Reward, Birthday Gift, Bill Discount..."
                    value={loyaltyAdjustForm.reason}
                    onChange={(e) => setLoyaltyAdjustForm(p => ({ ...p, reason: e.target.value }))}
                    style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.5rem', width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div className={styles.crmModalFooter}>
                <button
                  type="button"
                  className={styles.crmActionBtnSec}
                  onClick={() => setShowAdjustLoyaltyModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.crmActionBtnPrimary}
                  style={{ background: loyaltyAdjustForm.type === 'REDEEM' ? '#ea580c' : 'var(--accent-primary)' }}
                >
                  ✓ Confirm Points Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CRM MODAL 4: LOG CUSTOMER FEEDBACK & REVIEWS
         ══════════════════════════════════════════════════════════════════════ */}
      {showAddFeedbackModal && crmSelectedCustomer && (
        <div className={styles.crmModalBackdrop} onClick={() => setShowAddFeedbackModal(false)}>
          <div className={styles.crmModalBox} style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.crmModalHeader}>
              <h3 className={styles.crmModalTitle}>
                💬 Log Customer Feedback
              </h3>
              <button
                type="button"
                className={styles.crmModalCloseBtn}
                onClick={() => setShowAddFeedbackModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFeedback}>
              <div className={styles.crmModalBody} style={{ gap: '0.85rem' }}>
                <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                    {crmSelectedCustomer.name} ({crmSelectedCustomer.customerId || crmSelectedCustomer.id})
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Star Rating (1 to 5 Stars) *
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '1.4rem', cursor: 'pointer' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        onClick={() => setFeedbackForm(p => ({ ...p, rating: star }))}
                        style={{ color: star <= feedbackForm.rating ? '#f59e0b' : '#9ca3af' }}
                      >
                        ★
                      </span>
                    ))}
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: '0.5rem' }}>
                      ({feedbackForm.rating} of 5 Stars)
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Category *
                    </label>
                    <select
                      value={feedbackForm.category}
                      onChange={(e) => setFeedbackForm(p => ({ ...p, category: e.target.value }))}
                      className={styles.crmSortSelect}
                      style={{ width: '100%', padding: '0.5rem' }}
                    >
                      <option value="Food Taste">🍛 Food Taste &amp; Flavor</option>
                      <option value="Service Speed">⚡ Service Speed</option>
                      <option value="Cleanliness">✨ Cleanliness &amp; Hygiene</option>
                      <option value="Ambience">🌿 Ambience &amp; Seating</option>
                      <option value="Pricing">💰 Value for Money</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Resolution Status
                    </label>
                    <select
                      value={feedbackForm.status}
                      onChange={(e) => setFeedbackForm(p => ({ ...p, status: e.target.value }))}
                      className={styles.crmSortSelect}
                      style={{ width: '100%', padding: '0.5rem' }}
                    >
                      <option value="RESOLVED">✓ Resolved / Compliment</option>
                      <option value="PENDING_REVIEW">⏳ Pending Review / Complaint</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Customer Comments / Complaint Details *
                  </label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Enter review comments or complaint details..."
                    value={feedbackForm.comments}
                    onChange={(e) => setFeedbackForm(p => ({ ...p, comments: e.target.value }))}
                    style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.5rem', width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.82rem', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className={styles.crmModalFooter}>
                <button
                  type="button"
                  className={styles.crmActionBtnSec}
                  onClick={() => setShowAddFeedbackModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.crmActionBtnPrimary}
                >
                  ✓ Submit Feedback Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CRM MODAL 5: ISSUE TARGETED OFFER / BIRTHDAY PROMO
         ══════════════════════════════════════════════════════════════════════ */}
      {showCreateOfferModal && crmSelectedCustomer && (
        <div className={styles.crmModalBackdrop} onClick={() => setShowCreateOfferModal(false)}>
          <div className={styles.crmModalBox} style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.crmModalHeader}>
              <h3 className={styles.crmModalTitle}>
                🎁 Issue Targeted Customer Promotion
              </h3>
              <button
                type="button"
                className={styles.crmModalCloseBtn}
                onClick={() => setShowCreateOfferModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOffer}>
              <div className={styles.crmModalBody} style={{ gap: '0.85rem' }}>
                <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                    Assigning Offer to: {crmSelectedCustomer.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Segment: {crmSelectedCustomer.segment || 'REGULAR'} • Tier: {crmSelectedCustomer.loyaltyTier || 'BRONZE'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Offer Campaign Type
                  </label>
                  <select
                    value={offerForm.type}
                    onChange={(e) => setOfferForm(p => ({ ...p, type: e.target.value }))}
                    className={styles.crmSortSelect}
                    style={{ width: '100%', padding: '0.5rem' }}
                  >
                    <option value="BIRTHDAY">🎂 Birthday Special Voucher</option>
                    <option value="VIP">👑 VIP Circle Privilege</option>
                    <option value="WIN_BACK">⏳ Win-Back Reactivation</option>
                    <option value="FESTIVE">✨ Festive Chettinad Special</option>
                    <option value="PROMOTION">🏷️ General Promotional Discount</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Offer Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Birthday Special Sweet Box & 15% Off"
                    value={offerForm.title}
                    onChange={(e) => setOfferForm(p => ({ ...p, title: e.target.value }))}
                    style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.5rem', width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Promo Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BDAY-GOKULAM"
                      value={offerForm.promoCode}
                      onChange={(e) => setOfferForm(p => ({ ...p, promoCode: e.target.value.toUpperCase() }))}
                      style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.5rem', width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Discount Percent (%) *
                    </label>
                    <input
                      type="number"
                      required
                      min="5"
                      max="50"
                      value={offerForm.discountPercent}
                      onChange={(e) => setOfferForm(p => ({ ...p, discountPercent: e.target.value }))}
                      style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.5rem', width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Valid Till Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={offerForm.validTill}
                    onChange={(e) => setOfferForm(p => ({ ...p, validTill: e.target.value }))}
                    style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.45rem', width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div className={styles.crmModalFooter}>
                <button
                  type="button"
                  className={styles.crmActionBtnSec}
                  onClick={() => setShowCreateOfferModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.crmActionBtnPrimary}
                >
                  ✓ Issue &amp; Assign Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CRM MODAL 6: ADD INTERNAL NOTE & PREFERENCE
         ══════════════════════════════════════════════════════════════════════ */}
      {showAddNoteModal && crmSelectedCustomer && (
        <div className={styles.crmModalBackdrop} onClick={() => setShowAddNoteModal(false)}>
          <div className={styles.crmModalBox} style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.crmModalHeader}>
              <h3 className={styles.crmModalTitle}>
                📝 Add Staff Internal Note
              </h3>
              <button
                type="button"
                className={styles.crmModalCloseBtn}
                onClick={() => setShowAddNoteModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNote}>
              <div className={styles.crmModalBody} style={{ gap: '0.85rem' }}>
                <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                    {crmSelectedCustomer.name} ({crmSelectedCustomer.customerId || crmSelectedCustomer.id})
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Note Category
                  </label>
                  <select
                    value={noteForm.type}
                    onChange={(e) => setNoteForm(p => ({ ...p, type: e.target.value }))}
                    className={styles.crmSortSelect}
                    style={{ width: '100%', padding: '0.5rem' }}
                  >
                    <option value="PREFERENCE">🍽️ Dining &amp; Seating Preference</option>
                    <option value="ALLERGY">⚠️ Dietary Restriction / Allergy</option>
                    <option value="VIP">👑 VIP Hospitality Protocol</option>
                    <option value="SERVICE">🛎️ General Service Note</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Note Details *
                  </label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Enter preferences (e.g. Mild spice only, extra podi ghee, Table 08 favorite...)"
                    value={noteForm.text}
                    onChange={(e) => setNoteForm(p => ({ ...p, text: e.target.value }))}
                    style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.5rem', width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.82rem', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className={styles.crmModalFooter}>
                <button
                  type="button"
                  className={styles.crmActionBtnSec}
                  onClick={() => setShowAddNoteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.crmActionBtnPrimary}
                >
                  ✓ Save Internal Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Manual Customer Bill Modal ─── */}
      <ManualBillModal
        isOpen={showManualBillModal}
        onClose={() => setShowManualBillModal(false)}
        menuItems={posData.menu || DEFAULT_POS_MENU}
        crmCustomers={crmCustomers}
        activeTables={posData.tables}
        currentUser={currentUser}
        settings={posData.settings}
        onBillCreated={(newBill, slip, printImmediate) => {
          setActiveReceipt(slip);
          setLastSettledBill(newBill);
          showNotice(`Manual Bill #${newBill.billNumber} settled successfully! (₹${newBill.totalAmount})`);
          playChime('notification');
          fetchPos();
          fetchAnalytics();
          if (printImmediate) {
            setTimeout(() => {
              const is58mm = posData.settings?.bill_slip_format?.paperWidth === '58MM';
              const printWindow = window.open('', '_blank', 'width=450,height=700');
              if (printWindow) {
                printWindow.document.write(`<html><head><title>Slip</title><style>@page{size:${is58mm ? '58mm' : '80mm'} auto;margin:0;}body{margin:0;padding:${is58mm ? '2mm' : '4mm'};background:#fff;color:#000;width:${is58mm ? '48mm' : '72mm'};}pre{font-family:'Courier New',Courier,monospace;font-size:${is58mm ? '9pt' : '10.5pt'};line-height:1.25;margin:0;white-space:pre-wrap;word-break:break-all;}</style></head><body><pre>${slip.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre><script>window.onload=function(){window.print();setTimeout(function(){window.close();},750);};</script></body></html>`);
                printWindow.document.close();
              }
            }, 300);
          }
        }}
        onEditBeforePrint={(newBill, slip) => {
          setLastSettledBill(newBill);
          setActiveReceipt(slip);
          setEditBillTarget({ bill: newBill, thermalSlip: slip });
          fetchPos();
          fetchAnalytics();
        }}
      />

      {/* ─── Edit Bill Before Print Modal ─── */}
      {Boolean(editBillTarget && editBillTarget.bill) && (
        <EditBillBeforePrintModal
          isOpen={true}
          onClose={() => setEditBillTarget(null)}
          bill={editBillTarget.bill}
          initialSlip={editBillTarget.thermalSlip}
          settings={posData.settings}
          currentUser={currentUser}
          onSaved={(updatedBill, slip) => {
            setActiveReceipt(slip);
            setLastSettledBill(updatedBill);
            showNotice(`Bill #${updatedBill.billNumber} updated and slip ready!`);
            fetchPos();
            fetchAnalytics();
          }}
        />
      )}

      {/* ─── Bill Slip Format Designer Modal (Quick POS Access) ─── */}
      {showSlipDesignerModal && (
        <BillSlipFormatDesigner
          isModal={true}
          onClose={() => setShowSlipDesignerModal(false)}
          currentSettings={posData.settings}
          onSaveSuccess={(fmt) => {
            showNotice('Receipt slip format updated successfully!');
            fetchPos();
          }}
          currentUser={currentUser}
        />
      )}

      {/* ─── Footer with Mandatory Attribution ─── */}
      <footer className={styles.adminFooter}>
        Sri Gokulam Veg Restaurant • Authentic Chettinad Delicacies • Karaikudi
        <br />
        Designed &amp; Developed with excellence by{' '}
        <a href="https://ajnanjiltechsolutions.com/" target="_blank" rel="noopener noreferrer">
          AJ Nanjil Tech Solutions
        </a>
      </footer>
    </div>
  );
}
