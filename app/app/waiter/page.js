'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import styles from './waiter.module.css';

// ─── Tamil & English Dual Language Dictionary ────────────────────────────────
const DICT = {
  ta: {
    portalTitle: 'ஸ்ரீ கோகுலம் — கேப்டன் & சர்வர் முனையம்',
    captainLead: 'கேப்டன் முருகன் • காரைக்குடி கிளை',
    guestView: '← வாடிக்கையாளர் திரை',
    live: '🟢 நேரலை',
    reconnecting: '🔴 மீண்டும் இணைகிறது...',
    connecting: '🟡 இணைகிறது...',
    allClear: '✨ அனைத்து டேபிள்களும் தயார்!',
    noPending: 'புதிய ஆர்டர்கள் எதுவும் நிலுவையில் இல்லை.',
    noKitchen: 'அடுப்பறையில் தற்சமயம் ஆர்டர்கள் இல்லை.',
    noCalls: 'அழைப்புகள் எதுவும் இல்லை.',
    tabTables: 'டேபிள்கள்',
    tabQuickOrder: 'உடனடி KOT',
    tabPending: 'QR அனுமதி',
    tabKitchen: 'கிச்சன் நிலை',
    tabCalls: 'சர்வீஸ் அழைப்பு',
    available: 'காலி / தயார்',
    occupied: 'சாப்பிடுகிறார்கள்',
    billed: 'பில் கேட்கப்பட்டது',
    cleaning: 'வாழை இலை எடுக்க',
    totalTables: 'மொத்த டேபிள்கள்',
    takeOrder: 'ஆர்டர் எடு',
    runningAddon: 'ரன்னிங் ஆர்டர்',
    requestBill: 'பில் போடு',
    markCleaned: 'இலை எடுத்தாச்சு',
    tableDetails: 'விவரங்கள்',
    orderFiredSuccess: 'KOT அடுப்பறைக்கு வெற்றிகரமாக அனுப்பப்பட்டது!',
    billRequestedAlert: 'பில் கோரிக்கை கேஷியருக்கு அனுப்பப்பட்டது!',
    tableCleanedAlert: 'டேபிள் சுத்தம் செய்யப்பட்டு புதிய வாடிக்கையாளருக்கு தயார்!',
    allSections: 'அனைத்து பிரிவுகள்',
    searchPlaceholder: 'உணவு பெயர் தேடவும் (எ.கா: ரோஸ்ட், பொங்கல், காபி)...',
    diners: 'சாப்பிடுபவர்கள்',
    cookingPref: 'செட்டிநாடு சமையல் விருப்பம்',
    fireKotBtn: '🔥 KOT அடுப்பறைக்கு அனுப்பு',
    subtotal: 'கூடுதல் தொகை',
    cgstSgst: 'ஜிஎஸ்டி வரி (5%)',
    totalAmount: 'மொத்த பில் தொகை',
    itemsCount: 'பொருட்கள்',
    guestName: 'விருந்தினர் பெயர்',
    notes: 'சமையல் குறிப்பு',
    verifyOtp: 'சரிபார் & அனுமதி',
    enterOtpDesc: 'வாடிக்கையாளர் மொபைலில் உள்ள 4-இலக்க OTP எண்ணை உள்ளிடவும்:',
    authorizeSubmit: '✅ சரிபார்த்து KOT அனுப்பு',
    cancel: 'ரத்து செய்',
    waterRefill: '💧 தண்ணீர் கொண்டு வா',
    extraSambar: '🍲 சாம்பார் / சட்னி எக்ஸ்ட்ரா',
    leafClean: '🌿 வாழை இலை மாற்று',
    callAttended: 'கவனித்தாச்சு',
    stationTiffin: '🫓 டிபன் & தோசை நிலையம்',
    stationMeals: '🍛 சாப்பாடு & குழம்பு நிலையம்',
    stationBeverages: '☕ காபி & பானங்கள்',
    statusCooking: '🔥 வெந்து கொண்டிருக்கிறது',
    statusPlating: '🍽️ தட்டில் வைக்கப்படுகிறது',
    statusReady: '✅ பரிமாற தயார்!',
    markPlating: '→ தட்டில் வை',
    markReady: '→ பரிமாற தயார்',
    markServed: '🍲 பரிமாறியாச்சு',
  },
  en: {
    portalTitle: 'Sri Gokulam — Captain & Waiter Terminal',
    captainLead: 'Captain Murugan • Karaikudi Branch',
    guestView: '← Guest View',
    live: '🟢 Live',
    reconnecting: '🔴 Reconnecting...',
    connecting: '🟡 Connecting...',
    allClear: '✨ All clear — no pending orders!',
    noPending: 'No orders awaiting OTP verification.',
    noKitchen: 'Kitchen clear — no orders cooking.',
    noCalls: 'No table calls active.',
    tabTables: 'Tables Map',
    tabQuickOrder: 'Quick KOT',
    tabPending: 'QR OTP Verify',
    tabKitchen: 'Kitchen KDS',
    tabCalls: 'Service Calls',
    available: 'Available',
    occupied: 'Dining / Active',
    billed: 'Bill Requested',
    cleaning: 'Needs Cleaning',
    totalTables: 'Total Tables',
    takeOrder: 'Take Order',
    runningAddon: 'Add-on KOT',
    requestBill: 'Request Bill',
    markCleaned: 'Mark Cleaned',
    tableDetails: 'Details',
    orderFiredSuccess: 'KOT fired to kitchen stations successfully!',
    billRequestedAlert: 'Bill requested! Cashier has been alerted.',
    tableCleanedAlert: 'Table sanitized & ready for new guests!',
    allSections: 'All Sections',
    searchPlaceholder: 'Search dishes (e.g., roast, pongal, coffee)...',
    diners: 'Diners / Guests',
    cookingPref: 'Chettinad Preferences',
    fireKotBtn: '🔥 Fire KOT to Kitchen',
    subtotal: 'Subtotal',
    cgstSgst: 'GST Tax (5%)',
    totalAmount: 'Total Bill Amount',
    itemsCount: 'items',
    guestName: 'Guest Name',
    notes: 'Cooking Notes',
    verifyOtp: 'Verify OTP',
    enterOtpDesc: 'Enter the 4-digit OTP shown on guest screen:',
    authorizeSubmit: '✅ Authorize & Fire KOT',
    cancel: 'Cancel',
    waterRefill: '💧 Water Refill',
    extraSambar: '🍲 Extra Sambar & Chutney',
    leafClean: '🌿 Fresh Banana Leaf',
    callAttended: 'Attended',
    stationTiffin: '🫓 Tiffin & Dosa Station',
    stationMeals: '🍛 Meals & Gravy Station',
    stationBeverages: '☕ Filter Coffee Counter',
    statusCooking: '🔥 Cooking on Stove',
    statusPlating: '🍽️ Plating on Leaf',
    statusReady: '✅ Ready to Serve!',
    markPlating: '→ Mark Plating',
    markReady: '→ Mark Ready',
    markServed: '🍲 Mark Served',
  },
};

// ─── Tamil Nadu Culinary Cooking Preferences ─────────────────────────────────
const COOKING_PREFERENCES = [
  { id: 'EXTRA_GHEE', labelTa: '🧈 நெய் அதிகம்', labelEn: 'Extra Ghee' },
  { id: 'LESS_SPICY', labelTa: '🌶️ காரம் கம்மி', labelEn: 'Less Spicy' },
  { id: 'CRISPY_ROAST', labelTa: '🔥 மொறுமொறுப்பாக', labelEn: 'Extra Crispy' },
  { id: 'STRONG_COFFEE', labelTa: '☕ ஸ்ட்ராங் காபி', labelEn: 'Strong Coffee' },
  { id: 'LESS_SUGAR', labelTa: '🍯 இனிப்பு கம்மி', labelEn: 'Less Sugar' },
  { id: 'HOT_SAMBAR', labelTa: '🍲 சுடச்சுட சாம்பார்', labelEn: 'Piping Hot Sambar' },
];

function getCategoryIcon(cat = '') {
  const c = String(cat).toLowerCase();
  if (c.includes('tiffin')) return '🫓';
  if (c.includes('dosa')) return '🥞';
  if (c.includes('meal') || c.includes('rice')) return '🍛';
  if (c.includes('beverage') || c.includes('tea') || c.includes('coffee')) return '☕';
  if (c.includes('snack') || c.includes('starter') || c.includes('parotta')) return '🥟';
  if (c.includes('chinese') || c.includes('north')) return '🍜';
  return '🍲';
}

// ─── Audio Engine ────────────────────────────────────────────────────────────
function playChime(type = 'new_order', soundEnabled = true) {
  if (!soundEnabled) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();

    const freqMap = {
      new_order:    [440, 554, 659, 880],       // Urgent ascending alert
      otp_verify:   [523, 659, 784],             // Verified success chime
      waiter_call:  [880, 659, 880],             // Double service ping
      ready:        [523, 659, 784, 1047],       // Food ready fanfare
      service_bell: [784, 988, 1175],            // Bell chime
    };

    const freqs = freqMap[type] || freqMap.new_order;
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = (type === 'waiter_call' || type === 'service_bell') ? 'triangle' : 'sine';
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.24);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.24);
    });
  } catch {}
}

export default function WaiterTerminal() {
  const [lang, setLang] = useState('ta'); // 'ta' (Tamil) or 'en' (English)
  const t = DICT[lang] || DICT.ta;

  // Waiter Authentication & Session State
  const [waiterUser, setWaiterUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [activeTab, setActiveTab] = useState('tables'); // 'tables' | 'quick_order' | 'pending' | 'kitchen' | 'calls'
  const [tables, setTables] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // SSE & Live Notifications
  const [sseStatus, setSseStatus] = useState('connecting');
  const [flashAlerts, setFlashAlerts] = useState([]);
  const [alertMsg, setAlertMsg] = useState(null);
  const [serviceCalls, setServiceCalls] = useState([]);
  const sseRef = useRef(null);
  const prevPendingCount = useRef(0);

  // Table Filter & Selection
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [tableStatusFilter, setTableStatusFilter] = useState('ALL');
  const [inspectTable, setInspectTable] = useState(null);

  // Quick Order Punching State
  const [orderTargetTable, setOrderTargetTable] = useState('');
  const [orderGuestName, setOrderGuestName] = useState('Walk-in Guest');
  const [orderCustomerPhone, setOrderCustomerPhone] = useState('');
  const [orderGuestCount, setOrderGuestCount] = useState(2);
  const [orderCategory, setOrderCategory] = useState('ALL');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedPrefs, setSelectedPrefs] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderCart, setOrderCart] = useState({}); // { [dishId]: quantity }
  const [isFiringKot, setIsFiringKot] = useState(false);
  const [isAddonMode, setIsAddonMode] = useState(false);
  const [addonParentOrderId, setAddonParentOrderId] = useState(null);
  const [showMobileCartDrawer, setShowMobileCartDrawer] = useState(false);

  // OTP Verification Modal
  const [selectedOtpOrder, setSelectedOtpOrder] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [advancingId, setAdvancingId] = useState(null);

  // ─── Verify Waiter Session & Redirect If Inactive ───────────────────────────
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await fetch('/api/waiter/session', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.authenticated || !data.waiter?.isActive) {
          window.location.href = '/waiter/login';
          return;
        }
        if (isMounted) {
          setWaiterUser(data.waiter);
          setAuthChecking(false);
        }
      } catch (err) {
        window.location.href = '/waiter/login';
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/waiter/logout', { method: 'POST' });
    } catch (e) {}
    try {
      localStorage.removeItem('sgr_waiter_user');
      localStorage.removeItem('sgr_waiter_token');
    } catch (e) {}
    window.location.href = '/waiter/login';
  };

  // ─── Fetch Core Data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/tables', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setTables(data.tables || []);
        if (Array.isArray(data.floorPlans)) {
          setFloorPlans(data.floorPlans);
        }
        if (Array.isArray(data.menu)) {
          setMenu(data.menu);
        }
        if (Array.isArray(data.orders)) {
          setOrders(data.orders);
          const pendingCount = data.orders.filter(o => o.status === 'otp_pending').length;
          if (pendingCount > prevPendingCount.current) {
            playChime('new_order', soundEnabled);
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
          }
          prevPendingCount.current = pendingCount;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch tables:', err);
    } finally {
      setLoading(false);
    }
  }, [soundEnabled]);

  // ─── Real-Time SSE Connection ────────────────────────────────────────────────
  useEffect(() => {
    let retryTimer;
    function connect() {
      setSseStatus('connecting');
      const es = new EventSource('/api/events?role=waiter');
      sseRef.current = es;

      es.onopen = () => setSseStatus('live');

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'PING' || event.type === 'CONNECTED') return;

          // Add flash alert
          const alertId = `${event.type}-${Date.now()}`;
          setFlashAlerts((prev) => [{ ...event, id: alertId }, ...prev].slice(0, 6));

          // Contextual notifications & audio
          if (event.type === 'NEW_ORDER_OTP_PENDING') {
            playChime('new_order', soundEnabled);
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
            fetchData();
          } else if (event.type === 'ORDER_OTP_VERIFIED') {
            playChime('otp_verify', soundEnabled);
            fetchData();
          } else if (event.type === 'WAITER_CALL') {
            playChime('waiter_call', soundEnabled);
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([400, 200, 400]);
            }
            setServiceCalls((prev) => [event, ...prev].slice(0, 10));
          } else if (event.type === 'ORDER_STATUS_UPDATE') {
            if (event.newStatus === 'ready') {
              playChime('ready', soundEnabled);
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([300, 150, 300]);
              }
            }
            fetchData();
          } else if (event.type === 'TABLE_STATUS_UPDATED') {
            fetchData();
          }
        } catch {}
      };

      es.onerror = () => {
        setSseStatus('error');
        es.close();
        retryTimer = setTimeout(connect, 4000);
      };
    }

    connect();
    fetchData();
    const pollInterval = setInterval(fetchData, 6000);

    return () => {
      sseRef.current?.close();
      clearTimeout(retryTimer);
      clearInterval(pollInterval);
    };
  }, [fetchData, soundEnabled]);

  // ─── Filtered Data Lists ──────────────────────────────────────────────────
  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'otp_pending'), [orders]);
  const kitchenOrders = useMemo(() => orders.filter(o => ['cooking', 'plating', 'ready'].includes(o.status)), [orders]);

  const categories = useMemo(() => {
    const set = new Set();
    menu.forEach(d => { if (d.category) set.add(d.category); });
    return Array.from(set);
  }, [menu]);

  const filteredDishes = useMemo(() => {
    return menu.filter(dish => {
      if (orderCategory !== 'ALL' && dish.category !== orderCategory) return false;
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const matchTitle = (dish.title || '').toLowerCase().includes(q);
        const matchTamil = (dish.tamilTitle || dish.titleTamil || '').toLowerCase().includes(q);
        const matchCategory = (dish.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchTamil && !matchCategory) return false;
      }
      return true;
    });
  }, [menu, orderCategory, orderSearchQuery]);

  // ─── Table Operational Actions ──────────────────────────────────────────────
  const handleTableStatus = async (tableNumber, newStatus) => {
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        if (newStatus === 'AVAILABLE') setAlertMsg({ type: 'success', text: `Table #${tableNumber}: ${t.tableCleanedAlert}` });
        if (newStatus === 'BILL_REQUESTED') setAlertMsg({ type: 'success', text: `Table #${tableNumber}: ${t.billRequestedAlert}` });
        fetchData();
        if (inspectTable && String(inspectTable.tableNumber) === String(tableNumber)) {
          setInspectTable(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.message });
    }
  };

  // ─── Quick Order Punching (Direct KOT) ──────────────────────────────────────
  const openTakeOrder = (tableNum, isAddon = false, parentOrder = null) => {
    setOrderTargetTable(String(tableNum));
    setIsAddonMode(isAddon);
    setAddonParentOrderId(parentOrder ? parentOrder.orderId : null);
    setOrderCart({});
    setSelectedPrefs([]);
    setOrderNotes('');
    if (parentOrder) {
      setOrderGuestName(parentOrder.guestName || 'Guest');
      setOrderGuestCount(parentOrder.guestCount || 2);
    } else {
      setOrderGuestName(`Guest #${tableNum}`);
      setOrderGuestCount(2);
    }
    setActiveTab('quick_order');
    if (inspectTable) setInspectTable(null);
  };

  const handleUpdateCart = (dishId, delta) => {
    setOrderCart(prev => {
      const current = prev[dishId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[dishId];
        return copy;
      }
      return { ...prev, [dishId]: next };
    });
  };

  const handleTogglePref = (prefLabel) => {
    setSelectedPrefs(prev =>
      prev.includes(prefLabel) ? prev.filter(p => p !== prefLabel) : [...prev, prefLabel]
    );
  };

  const cartItems = useMemo(() => {
    return Object.entries(orderCart).map(([dishId, qty]) => {
      const dish = menu.find(d => String(d.id) === String(dishId)) || { id: dishId, title: 'Dish', price: 0 };
      return {
        dishId: dish.id,
        title: dish.title,
        tamilTitle: dish.tamilTitle || dish.titleTamil || '',
        price: dish.price || 0,
        quantity: qty,
      };
    });
  }, [orderCart, menu]);

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
  }, [cartItems]);
  const cartGst = useMemo(() => Math.round(cartSubtotal * 0.05 * 100) / 100, [cartSubtotal]);
  const cartGrandTotal = useMemo(() => Math.round((cartSubtotal + cartGst) * 100) / 100, [cartSubtotal, cartGst]);

  const handleFireKot = async () => {
    if (!orderTargetTable) {
      setAlertMsg({ type: 'error', text: 'Please select a table number first!' });
      return;
    }
    if (cartItems.length === 0) {
      setAlertMsg({ type: 'error', text: 'Please add at least one dish to the order!' });
      return;
    }

    setIsFiringKot(true);
    try {
      const fullNotes = [
        selectedPrefs.join(', '),
        orderNotes.trim(),
      ].filter(Boolean).join(' • ') || 'Standard Chettinad Sattvic Prep';

      const cleanTableNum = String(orderTargetTable).replace(/^Table\s*#?/i, '').padStart(2, '0');

      const payload = {
        tables: [cleanTableNum],
        orderType: 'DINE_IN',
        guestName: orderGuestName.trim() || `Table #${cleanTableNum}`,
        customerName: orderGuestName.trim() || `Table #${cleanTableNum}`,
        guestPhone: orderCustomerPhone.trim(),
        customerPhone: orderCustomerPhone.trim(),
        guestCount: orderGuestCount,
        cookingNotes: fullNotes,
        items: cartItems.map(it => ({
          title: it.title,
          price: it.price,
          quantity: it.quantity,
        })),
        isStaffPunch: true,
        verifiedBy: waiterUser ? `Captain ${waiterUser.fullName}` : 'Floor Captain',
        isAddon: isAddonMode,
        parentOrderId: addonParentOrderId,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fire KOT');

      playChime('ready', soundEnabled);
      setAlertMsg({ type: 'success', text: `Table #${cleanTableNum}: ${t.orderFiredSuccess}` });
      setOrderCart({});
      setSelectedPrefs([]);
      setOrderNotes('');
      setOrderCustomerPhone('');
      setOrderGuestName('Walk-in Guest');
      setShowMobileCartDrawer(false);
      setActiveTab('tables');
      fetchData();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.message });
    } finally {
      setIsFiringKot(false);
    }
  };

  // ─── OTP Authorization ──────────────────────────────────────────────────────
  const handleAuthorizeOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedOtpOrder || !enteredOtp) return;
    setVerifyingOtp(true);
    try {
      const res = await fetch('/api/orders/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOtpOrder.orderId,
          otp: enteredOtp.trim(),
          staffName: waiterUser ? `Captain ${waiterUser.fullName}` : 'Floor Captain',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      playChime('otp_verify', soundEnabled);
      setAlertMsg({ type: 'success', text: `Table #${selectedOtpOrder.tables?.join(' & #')} verified & KOT fired to kitchen!` });
      setSelectedOtpOrder(null);
      setEnteredOtp('');
      fetchData();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.message });
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ─── Kitchen Status Advancing ───────────────────────────────────────────────
  const nextStatusMap = { cooking: 'plating', plating: 'ready', ready: 'served' };
  const handleAdvanceStatus = async (orderId, newStatus) => {
    setAdvancingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, staffName: waiterUser ? `Captain ${waiterUser.fullName}` : 'Floor Captain' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      if (newStatus === 'ready') playChime('ready', soundEnabled);
      setAlertMsg({ type: 'success', text: `Order ${orderId} → ${newStatus.toUpperCase()}` });
      fetchData();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.message });
    } finally {
      setAdvancingId(null);
    }
  };

  // ─── Service Call Attending ────────────────────────────────────────────────
  const handleDismissCall = (timestamp) => {
    setServiceCalls(prev => prev.filter(c => c.timestamp !== timestamp));
    playChime('service_bell', soundEnabled);
  };

  // Render Section Lists
  const displaySections = useMemo(() => {
    if (floorPlans && floorPlans.length > 0) {
      return floorPlans;
    }
    const derived = new Set();
    tables.forEach(t => { if (t.section) derived.add(t.section); });
    return Array.from(derived).map(secId => ({
      id: secId,
      name: secId.replace('_', ' '),
      icon: '🏛️',
    }));
  }, [floorPlans, tables]);

  // Clean Table Number Display
  const cleanOrderTableNumber = String(orderTargetTable).replace(/^Table\s*#?/i, '') || '01';

  if (authChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#041f17',
        color: '#fef3c7',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(251, 191, 36, 0.25)',
          borderTopColor: '#fbbf24',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '1rem'
        }} />
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.02em' }}>
          {lang === 'ta' ? 'கேப்டன் கணக்கு சரிபார்க்கப்படுகிறது...' : 'Verifying Captain Terminal Session...'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ─── Top Staff Header ──────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.brandBadge}>{t.portalTitle}</span>
          <h1 className={styles.headerTitle}>
            🧑‍🍳 {lang === 'ta' ? 'கேப்டன் முனையம்' : 'Captain Terminal'}
          </h1>
          <div className={styles.serverBadge}>
            <span>
              {waiterUser ? (
                <>
                  <strong>{lang === 'ta' ? `கேப்டன் ${waiterUser.fullName}` : `Captain ${waiterUser.fullName}`}</strong>
                  {waiterUser.username && <span style={{ opacity: 0.75, marginLeft: '0.35rem' }}>@{waiterUser.username}</span>}
                </>
              ) : (
                t.captainLead
              )}
            </span> •{' '}
            <span className={sseStatus === 'live' ? styles.sseLive : sseStatus === 'error' ? styles.sseError : styles.sseConnecting}>
              {sseStatus === 'live' ? t.live : sseStatus === 'error' ? t.reconnecting : t.connecting}
            </span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.btnLangToggle}
            onClick={() => setLang(l => l === 'ta' ? 'en' : 'ta')}
            title="Switch Language / மொழி மாற்று"
          >
            {lang === 'ta' ? '🇬🇧 EN' : '🇮🇳 தமிழ்'}
          </button>
          <button
            type="button"
            className={styles.btnSoundToggle}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>
          <button
            type="button"
            className={styles.btnLogout}
            onClick={handleLogout}
            title="Logout of Waiter Terminal / வெளியேறு"
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              color: '#fca5a5',
              padding: '0.42rem 0.8rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            🚪 {lang === 'ta' ? 'வெளியேறு' : 'Logout'}
          </button>
          <Link href="/" className={styles.guestLink}>
            {t.guestView}
          </Link>
        </div>
      </header>

      {/* ─── Real-Time SSE Banners ─────────────────────────────────────────── */}
      {flashAlerts.length > 0 && (
        <div className={styles.flashStack}>
          {flashAlerts.map(a => (
            <div
              key={a.id}
              className={`${styles.flashItem} ${
                a.type === 'NEW_ORDER_OTP_PENDING' ? styles.flashOrder
                : a.type === 'WAITER_CALL' ? styles.flashCall
                : a.type === 'ORDER_STATUS_UPDATE' ? styles.flashStatus
                : styles.flashGeneric
              }`}
            >
              <span className={styles.flashMsg}>{a.message}</span>
              <button
                type="button"
                className={styles.flashDismiss}
                onClick={() => setFlashAlerts(prev => prev.filter(x => x.id !== a.id))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── Action Alert Notification ─────────────────────────────────────── */}
      {alertMsg && (
        <div className={`${styles.alertBanner} ${alertMsg.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
          <span>{alertMsg.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{alertMsg.text}</span>
          <button type="button" onClick={() => setAlertMsg(null)} className={styles.alertClose}>✕</button>
        </div>
      )}

      {/* ─── Operational Stats Bar ─────────────────────────────────────────── */}
      <div className={styles.statsBar}>
        <div className={styles.statPill} onClick={() => setActiveTab('tables')}>
          <span className={styles.statCount}>{tables.length}</span>
          <span className={styles.statLabel}>{t.totalTables}</span>
        </div>
        <div className={styles.statPill} onClick={() => { setActiveTab('tables'); setTableStatusFilter('AVAILABLE'); }}>
          <span className={styles.statCount} style={{ color: '#16a34a' }}>
            {tables.filter(tbl => tbl.status === 'AVAILABLE').length}
          </span>
          <span className={styles.statLabel}>{t.available}</span>
        </div>
        <div className={styles.statPill} onClick={() => { setActiveTab('tables'); setTableStatusFilter('OCCUPIED'); }}>
          <span className={styles.statCount} style={{ color: '#d97706' }}>
            {tables.filter(tbl => tbl.status === 'OCCUPIED').length}
          </span>
          <span className={styles.statLabel}>{t.occupied}</span>
        </div>
        <div className={`${styles.statPill} ${tables.some(tbl => tbl.status === 'BILL_REQUESTED') ? styles.statPillBilled : ''}`} onClick={() => { setActiveTab('tables'); setTableStatusFilter('BILL_REQUESTED'); }}>
          <span className={styles.statCount} style={{ color: '#2563eb' }}>
            {tables.filter(tbl => tbl.status === 'BILL_REQUESTED').length}
          </span>
          <span className={styles.statLabel}>{t.billed}</span>
        </div>
        <div className={`${styles.statPill} ${tables.some(tbl => tbl.status === 'CLEANING') ? styles.statPillCleaning : ''}`} onClick={() => { setActiveTab('tables'); setTableStatusFilter('CLEANING'); }}>
          <span className={styles.statCount} style={{ color: '#dc2626' }}>
            {tables.filter(tbl => tbl.status === 'CLEANING').length}
          </span>
          <span className={styles.statLabel}>{t.cleaning}</span>
        </div>
        <div className={`${styles.statPill} ${pendingOrders.length > 0 ? styles.statPillAlert : ''}`} onClick={() => setActiveTab('pending')}>
          <span className={styles.statCount} style={{ color: '#ea580c' }}>{pendingOrders.length}</span>
          <span className={styles.statLabel}>{t.tabPending}</span>
        </div>
      </div>

      {/* ─── Navigation Tabs Bar ───────────────────────────────────────────── */}
      <div className={styles.tabsRow}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'tables' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('tables')}
        >
          <span>🪑</span> {t.tabTables}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'quick_order' ? styles.tabActive : ''}`}
          onClick={() => {
            if (!orderTargetTable && tables.length > 0) {
              setOrderTargetTable(String(tables[0].tableNumber));
            }
            setActiveTab('quick_order');
          }}
        >
          <span>⚡</span> {t.tabQuickOrder}
          {cartItems.length > 0 && <span className={styles.tabBadge}>{cartItems.length}</span>}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'pending' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <span>🔔</span> {t.tabPending}
          {pendingOrders.length > 0 && <span className={styles.tabBadge}>{pendingOrders.length}</span>}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'kitchen' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('kitchen')}
        >
          <span>🔥</span> {t.tabKitchen}
          {kitchenOrders.length > 0 && <span className={styles.tabBadge}>{kitchenOrders.length}</span>}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'calls' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('calls')}
        >
          <span>🛎️</span> {t.tabCalls}
          {serviceCalls.length > 0 && <span className={styles.tabBadge}>{serviceCalls.length}</span>}
        </button>
      </div>

      {/* ─── Main Tab Panes ────────────────────────────────────────────────── */}
      <main className={styles.main}>
        {loading ? (
          <div className={styles.loadingBox}>
            <div className={styles.loadingSpinner}></div>
            Connecting to Sri Gokulam Karaikudi Floor Engine...
          </div>
        ) : activeTab === 'tables' ? (

          /* ═════════ TAB 1: FLOOR & TABLES MAP ═════════ */
          <div>
            <div className={styles.sectionHeader}>
              <div>
                <h2>🪑 {t.tabTables} — {tables.length} {t.totalTables}</h2>
                <p>Real-time Chettinad dining hall floor status, running orders &amp; banana leaf clearance.</p>
              </div>
              <button
                type="button"
                className={styles.btnOrderPrimary}
                style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem' }}
                onClick={() => {
                  if (tables.length > 0) openTakeOrder(tables[0].tableNumber);
                }}
              >
                ➕ {t.takeOrder} (New KOT)
              </button>
            </div>

            {/* Section & Status Filter Pills */}
            <div className={styles.filterPillsRow}>
              <button
                type="button"
                className={`${styles.filterPill} ${tableStatusFilter === 'ALL' ? styles.filterPillActive : ''}`}
                onClick={() => setTableStatusFilter('ALL')}
              >
                All Status
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${tableStatusFilter === 'AVAILABLE' ? styles.filterPillActive : ''}`}
                onClick={() => setTableStatusFilter('AVAILABLE')}
              >
                🟢 {t.available}
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${tableStatusFilter === 'OCCUPIED' ? styles.filterPillActive : ''}`}
                onClick={() => setTableStatusFilter('OCCUPIED')}
              >
                🟡 {t.occupied}
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${tableStatusFilter === 'BILL_REQUESTED' ? styles.filterPillActive : ''}`}
                onClick={() => setTableStatusFilter('BILL_REQUESTED')}
              >
                🔵 {t.billed}
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${tableStatusFilter === 'CLEANING' ? styles.filterPillActive : ''}`}
                onClick={() => setTableStatusFilter('CLEANING')}
              >
                🔴 {t.cleaning}
              </button>
            </div>

            {tables.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🏛️</span>
                <h3>No Dining Tables Configured</h3>
                <p>Create tables in Admin Floor Plan settings to manage live dining.</p>
              </div>
            ) : (
              (displaySections.length > 0 ? displaySections : [{ id: 'ALL', name: 'Main Dining Hall', icon: '🏛️' }]).map(sec => {
                const secTables = tables.filter(tbl => {
                  if (displaySections.length > 1 && tbl.section && tbl.section !== sec.id) return false;
                  if (tableStatusFilter !== 'ALL' && tbl.status !== tableStatusFilter) return false;
                  return true;
                });

                if (secTables.length === 0 && tableStatusFilter !== 'ALL') return null;

                return (
                  <div key={sec.id} className={styles.sectionBlock}>
                    <div className={styles.sectionBlockTitle}>
                      <span>{sec.icon || '📍'} {sec.name || sec.id}</span>
                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                        {secTables.length} {t.totalTables}
                      </span>
                    </div>

                    <div className={styles.tablesGrid}>
                      {secTables.map(tbl => {
                        const activeOrder = orders.find(o =>
                          (String(o.tableNumber) === String(tbl.tableNumber) || (o.tables && o.tables.includes(String(tbl.tableNumber)))) &&
                          o.status !== 'CANCELLED' && o.status !== 'PAID_SETTLED' && o.status !== 'completed'
                        );
                        const hasServiceCall = serviceCalls.some(c => String(c.tableNumber) === String(tbl.tableNumber));

                        return (
                          <div
                            key={tbl.tableNumber || tbl.id}
                            className={`${styles.tableCard} ${
                              tbl.status === 'AVAILABLE' ? styles.cardAvailable
                              : tbl.status === 'OCCUPIED' ? styles.cardOccupied
                              : tbl.status === 'BILL_REQUESTED' ? styles.cardBilled
                              : styles.cardCleaning
                            } ${hasServiceCall ? styles.cardCallAlert : ''}`}
                            onClick={() => setInspectTable(tbl)}
                          >
                            <div className={styles.tableTopRow}>
                              <span className={styles.tableBadgeBig}>#{tbl.tableNumber}</span>
                              <span className={`${styles.statusBadgePill} ${
                                tbl.status === 'AVAILABLE' ? styles.statusBadgeAvailable
                                : tbl.status === 'OCCUPIED' ? styles.statusBadgeOccupied
                                : tbl.status === 'BILL_REQUESTED' ? styles.statusBadgeBilled
                                : styles.statusBadgeCleaning
                              }`}>
                                {tbl.status === 'AVAILABLE' ? t.available
                                 : tbl.status === 'OCCUPIED' ? t.occupied
                                 : tbl.status === 'BILL_REQUESTED' ? t.billed
                                 : t.cleaning}
                              </span>
                            </div>

                            <div className={styles.tableCapacity}>
                              👥 {tbl.capacity || 4} {t.diners} • {tbl.shape || 'SQUARE'}
                            </div>

                            {activeOrder && (
                              <div className={styles.tableMetaRow}>
                                <span>{activeOrder.items?.length || 0} {t.itemsCount}</span>
                                <span className={styles.tableRunningTotal}>
                                  {activeOrder.totalAmount > 0 ? `₹${activeOrder.totalAmount}` : 'KOT Active'}
                                </span>
                              </div>
                            )}

                            {hasServiceCall && (
                              <div style={{ fontSize: '0.68rem', background: '#f3e8ff', color: '#7e22ce', padding: '3px 6px', borderRadius: '6px', fontWeight: 800 }}>
                                🔔 {t.tabCalls}!
                              </div>
                            )}

                            {/* Contextual Action Buttons */}
                            <div className={styles.tableActionBtns} onClick={e => e.stopPropagation()}>
                              {tbl.status === 'AVAILABLE' ? (
                                <button
                                  type="button"
                                  className={`${styles.btnTableQuick} ${styles.btnOrderPrimary}`}
                                  onClick={() => openTakeOrder(tbl.tableNumber)}
                                >
                                  ⚡ {t.takeOrder}
                                </button>
                              ) : tbl.status === 'OCCUPIED' ? (
                                <>
                                  <button
                                    type="button"
                                    className={`${styles.btnTableQuick} ${styles.btnOrderAddon}`}
                                    onClick={() => openTakeOrder(tbl.tableNumber, true, activeOrder)}
                                    title="Add more items (ரன்னிங் ஆர்டர்)"
                                  >
                                    ➕ {t.runningAddon}
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.btnTableQuick} ${styles.btnTableBill}`}
                                    onClick={() => handleTableStatus(tbl.tableNumber, 'BILL_REQUESTED')}
                                    title="Notify cashier to generate bill"
                                  >
                                    🧾 {t.requestBill}
                                  </button>
                                </>
                              ) : tbl.status === 'BILL_REQUESTED' ? (
                                <button
                                  type="button"
                                  className={`${styles.btnTableQuick} ${styles.btnTableCleaned}`}
                                  onClick={() => handleTableStatus(tbl.tableNumber, 'CLEANING')}
                                >
                                  🧹 {t.cleaning}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className={`${styles.btnTableQuick} ${styles.btnTableCleaned}`}
                                  onClick={() => handleTableStatus(tbl.tableNumber, 'AVAILABLE')}
                                >
                                  ✨ {t.markCleaned}
                                </button>
                              )}
                              <button
                                type="button"
                                className={`${styles.btnTableQuick} ${styles.btnTableDetail}`}
                                onClick={() => setInspectTable(tbl)}
                              >
                                🔍
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        ) : activeTab === 'quick_order' ? (

          /* ═════════ TAB 2: FAST KOT ORDER PUNCHING ═════════ */
          <div>
            <div className={styles.sectionHeader}>
              <div>
                <h2>
                  ⚡ {t.tabQuickOrder} — {isAddonMode ? `Add-on KOT to Table #${cleanOrderTableNumber}` : `Table #${cleanOrderTableNumber}`}
                </h2>
                <p>One-handed mobile POS order punching directly at the dining table with live menu images.</p>
              </div>
              {isAddonMode && (
                <button
                  type="button"
                  className={styles.filterPill}
                  onClick={() => setIsAddonMode(false)}
                >
                  Switch to New Order
                </button>
              )}
            </div>

            <div className={styles.orderPunchLayout}>
              {/* Menu Catalog with Photos & Stepper */}
              <div className={styles.menuCatalogSection}>
                {/* Search Bar & Categories */}
                <div className={styles.catalogSearchBar}>
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={orderSearchQuery}
                    onChange={e => setOrderSearchQuery(e.target.value)}
                    className={styles.catalogSearchInput}
                  />
                </div>

                <div className={styles.filterPillsRow}>
                  <button
                    type="button"
                    className={`${styles.filterPill} ${orderCategory === 'ALL' ? styles.filterPillActive : ''}`}
                    onClick={() => setOrderCategory('ALL')}
                  >
                    All Items ({menu.length})
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`${styles.filterPill} ${orderCategory === cat ? styles.filterPillActive : ''}`}
                      onClick={() => setOrderCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {filteredDishes.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>🔍</span>
                    <h3>No dishes found</h3>
                    <p>Try clearing your search query or picking another category.</p>
                  </div>
                ) : (
                  <div className={styles.dishGrid}>
                    {filteredDishes.map(dish => {
                      const qty = orderCart[dish.id] || 0;
                      // Resolve dish image from DB or local storage cache
                      const dishImg = dish.image || (typeof window !== 'undefined' ? (localStorage.getItem('sgr_dish_img_' + dish.id) || localStorage.getItem('sgr_dish_img_' + dish.title)) : null);

                      return (
                        <div key={dish.id} className={styles.dishCard}>
                          {/* Dish Photo Header */}
                          <div className={styles.dishImgWrap}>
                            {dishImg ? (
                              <img
                                src={dishImg}
                                alt={dish.title}
                                className={styles.dishImg}
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.style.display = 'none';
                                  const next = e.currentTarget.nextElementSibling;
                                  if (next) next.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className={styles.dishImgFallback}
                              style={{ display: dishImg ? 'none' : 'flex' }}
                            >
                              <span className={styles.dishCategoryIcon}>
                                {getCategoryIcon(dish.category)}
                              </span>
                            </div>
                            <span className={styles.vegIndicatorPill} title="100% Pure Vegetarian">
                              <span className={styles.vegDot} />
                            </span>
                          </div>

                          {/* Dish Information */}
                          <div className={styles.dishInfo}>
                            <div className={styles.dishTitleTa}>
                              {dish.tamilTitle || dish.titleTamil || dish.title}
                            </div>
                            <div className={styles.dishTitleEn}>{dish.title}</div>

                            <div className={styles.dishBottomRow}>
                              {dish.price > 0 ? (
                                <span className={styles.dishPrice}>₹{dish.price}</span>
                              ) : (
                                <span className={styles.dishUnpriced}>✨ Heritage</span>
                              )}

                              {qty === 0 ? (
                                <button
                                  type="button"
                                  className={styles.btnDishAdd}
                                  onClick={() => handleUpdateCart(dish.id, 1)}
                                >
                                  + {lang === 'ta' ? 'சேர்' : 'Add'}
                                </button>
                              ) : (
                                <div className={styles.dishStepper}>
                                  <button
                                    type="button"
                                    className={styles.stepperBtn}
                                    onClick={() => handleUpdateCart(dish.id, -1)}
                                  >
                                    -
                                  </button>
                                  <span className={styles.stepperCount}>{qty}</span>
                                  <button
                                    type="button"
                                    className={styles.stepperBtn}
                                    onClick={() => handleUpdateCart(dish.id, 1)}
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Desktop KOT Cart Sidebar */}
              <div className={styles.kotCartSidebar}>
                <div className={styles.cartHeader}>
                  <h3>📝 {isAddonMode ? 'Add-on KOT Tray' : 'New KOT Tray'}</h3>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#004080' }}>
                    {cartItems.length} {t.itemsCount}
                  </span>
                </div>

                {/* Table Picker */}
                <div className={styles.tableSelectorRow}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569' }}>Table:</label>
                  <select
                    value={orderTargetTable}
                    onChange={e => setOrderTargetTable(e.target.value)}
                    className={styles.tableSelectField}
                  >
                    {tables.map(tbl => (
                      <option key={tbl.tableNumber} value={tbl.tableNumber}>
                        Table #{tbl.tableNumber} ({tbl.status === 'AVAILABLE' ? '🟢 Free' : '🟡 Dining'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Diner Count */}
                <div className={styles.tableSelectorRow}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569' }}>Diners:</label>
                  <select
                    value={orderGuestCount}
                    onChange={e => setOrderGuestCount(Number(e.target.value))}
                    className={styles.tableSelectField}
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                      <option key={n} value={n}>{n} {t.diners}</option>
                    ))}
                  </select>
                </div>

                {/* Customer Name & Mobile for Method 2 & CRM Duplicate Prevention */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', margin: '0.35rem 0' }}>
                  <input
                    type="text"
                    placeholder={lang === 'ta' ? 'பெயர் (விருப்பம்)' : 'Name (Optional)'}
                    value={orderGuestName}
                    onChange={e => setOrderGuestName(e.target.value)}
                    className={styles.tableSelectField}
                    style={{ fontSize: '0.76rem', padding: '5px 8px' }}
                  />
                  <input
                    type="tel"
                    placeholder={lang === 'ta' ? 'மொபைல் எண்' : 'Mobile No.'}
                    value={orderCustomerPhone}
                    onChange={e => setOrderCustomerPhone(e.target.value)}
                    className={styles.tableSelectField}
                    style={{ fontSize: '0.76rem', padding: '5px 8px' }}
                  />
                </div>

                {/* Chettinad Cooking Preferences */}
                <div className={styles.preferenceChipsTitle}>{t.cookingPref}</div>
                <div className={styles.preferenceChips}>
                  {COOKING_PREFERENCES.map(pref => {
                    const active = selectedPrefs.includes(lang === 'ta' ? pref.labelTa : pref.labelEn);
                    return (
                      <button
                        key={pref.id}
                        type="button"
                        className={`${styles.prefChip} ${active ? styles.prefChipActive : ''}`}
                        onClick={() => handleTogglePref(lang === 'ta' ? pref.labelTa : pref.labelEn)}
                      >
                        {lang === 'ta' ? pref.labelTa : pref.labelEn}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Notes */}
                <input
                  type="text"
                  placeholder={lang === 'ta' ? 'கூடுதல் சமையல் குறிப்பு...' : 'Special instructions...'}
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  className={styles.catalogSearchInput}
                  style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                />

                {/* Cart Items List */}
                <div className={styles.cartItemsList}>
                  {cartItems.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem', padding: '16px 0' }}>
                      Tap &quot;+&quot; on dishes to add to KOT
                    </div>
                  ) : (
                    cartItems.map(it => (
                      <div key={it.dishId} className={styles.cartItemLine}>
                        <span>{it.quantity}× {it.tamilTitle || it.title}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800 }}>
                            {it.price > 0 ? `₹${it.price * it.quantity}` : '—'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCart(it.dishId, -it.quantity)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 800 }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total & Action Button */}
                <div className={styles.cartTotalBox}>
                  <div className={styles.totalRow}>
                    <span>{t.subtotal}</span>
                    <span>₹{cartSubtotal}</span>
                  </div>
                  <div className={styles.totalRow}>
                    <span>{t.cgstSgst}</span>
                    <span>₹{cartGst}</span>
                  </div>
                  <div className={styles.grandTotalRow}>
                    <span>{t.totalAmount}</span>
                    <span>₹{cartGrandTotal}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.btnFireKot}
                  onClick={handleFireKot}
                  disabled={isFiringKot || cartItems.length === 0}
                >
                  {isFiringKot ? '⏳ Firing to Kitchen...' : t.fireKotBtn}
                </button>
              </div>
            </div>

            {/* ─── Mobile Floating Cart Sticky Bar ─── */}
            {cartItems.length > 0 && (
              <div
                className={styles.floatingCartBar}
                onClick={() => setShowMobileCartDrawer(true)}
              >
                <div className={styles.floatingCartInfo}>
                  <span className={styles.floatingCartCount}>{cartItems.length} {t.itemsCount} in KOT</span>
                  <span className={styles.floatingCartTotal}>
                    {cartGrandTotal > 0 ? `₹${cartGrandTotal}` : 'Ready to Fire'}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.floatingCartBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMobileCartDrawer(true);
                  }}
                >
                  Review KOT 🔥
                </button>
              </div>
            )}
          </div>

        ) : activeTab === 'pending' ? (

          /* ═════════ TAB 3: QR OTP VERIFICATION ═════════ */
          <div>
            <div className={styles.sectionHeader}>
              <div>
                <h2>📋 {t.tabPending} — {pendingOrders.length} {t.itemsCount}</h2>
                <p>Cross-check dishes with the customer at their table and punch their 4-digit mobile OTP.</p>
              </div>
            </div>

            {pendingOrders.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>✨</span>
                <h3>{t.allClear}</h3>
                <p>{t.noPending}</p>
              </div>
            ) : (
              <div className={styles.ordersGrid}>
                {pendingOrders.map(ord => (
                  <div key={ord.orderId} className={`${styles.orderCard} ${styles.orderCardPending}`}>
                    <div className={styles.orderCardTop}>
                      <span className={styles.tableBadge}>TABLE #{ord.tables?.join(' & #')}</span>
                      <span className={styles.timeBadge}>⏰ {ord.placedAt}</span>
                    </div>

                    <div className={styles.guestInfo}>
                      <strong>{ord.guestName}</strong> • {ord.guestCount} {t.diners} • {ord.guestPhone || '—'}
                    </div>

                    <div className={styles.itemsSummary}>
                      {(ord.items || []).map((it, idx) => (
                        <div key={idx} className={styles.itemLine}>
                          <span>{it.quantity}× {it.title}</span>
                          <span>₹{(it.price || 0) * (it.quantity || 1)}</span>
                        </div>
                      ))}
                    </div>

                    {ord.cookingNotes && (
                      <div className={styles.noteLine}>📝 {ord.cookingNotes}</div>
                    )}

                    <div className={styles.cardFooter}>
                      <span className={styles.cardTotal}>₹{ord.totalAmount}</span>
                      <button
                        type="button"
                        className={styles.btnOpenVerify}
                        onClick={() => { setSelectedOtpOrder(ord); setEnteredOtp(''); }}
                      >
                        🔑 {t.verifyOtp}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : activeTab === 'kitchen' ? (

          /* ═════════ TAB 4: KITCHEN TRACKER ═════════ */
          <div>
            <div className={styles.sectionHeader}>
              <div>
                <h2>🔥 {t.tabKitchen} — {kitchenOrders.length} Active KOTs</h2>
                <p>Live preparation across Tiffin Iron Tawa, Meals Gravy and Kumbakonam Degree Coffee stations.</p>
              </div>
            </div>

            {kitchenOrders.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🥘</span>
                <h3>{t.noKitchen}</h3>
                <p>Orders will flash here in real time as they are fired.</p>
              </div>
            ) : (
              <div className={styles.ordersGrid}>
                {kitchenOrders.map(ord => (
                  <div key={ord.orderId} className={`${styles.orderCard} ${styles.orderCardKitchen}`}>
                    <div className={styles.orderCardTop}>
                      <span className={styles.tableBadge}>TABLE #{ord.tables?.join(' & #')}</span>
                      <span className={`${styles.statusPill} ${
                        ord.status === 'cooking' ? styles.statusCooking
                        : ord.status === 'plating' ? styles.statusPlating
                        : styles.statusReady
                      }`}>
                        {ord.status === 'cooking' ? t.statusCooking
                         : ord.status === 'plating' ? t.statusPlating
                         : t.statusReady}
                      </span>
                    </div>

                    <div className={styles.guestInfo}>
                      <strong>{ord.guestName}</strong> • {ord.orderId}
                    </div>

                    {ord.stationRouting && (
                      <div className={styles.stationGrid}>
                        {Object.entries(ord.stationRouting).map(([station, items]) => items.length > 0 && (
                          <div key={station} className={styles.stationBox}>
                            <span className={styles.stationLabel}>
                              {station === 'TIFFIN' ? t.stationTiffin
                               : station === 'MEALS_GRAVY' ? t.stationMeals
                               : t.stationBeverages}
                            </span>
                            {items.map((it, i) => (
                              <div key={i} className={styles.stationItem}>
                                {it.quantity}× {it.title}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={styles.cardFooter}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        By: {ord.verifiedBy || 'Floor Captain'}
                      </span>
                      {nextStatusMap[ord.status] && (
                        <button
                          type="button"
                          className={styles.btnAdvance}
                          onClick={() => handleAdvanceStatus(ord.orderId, nextStatusMap[ord.status])}
                          disabled={advancingId === ord.orderId}
                        >
                          {advancingId === ord.orderId ? '...'
                           : ord.status === 'cooking' ? t.markPlating
                           : ord.status === 'plating' ? t.markReady
                           : t.markServed}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : (

          /* ═════════ TAB 5: SERVICE CALLS ═════════ */
          <div>
            <div className={styles.sectionHeader}>
              <div>
                <h2>🛎️ {t.tabCalls} — Guest QR Table Requests</h2>
                <p>Instant table service calls: water refill, extra sambar/chutney, leaf wipe, bill request.</p>
              </div>
            </div>

            {serviceCalls.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🛎️</span>
                <h3>{t.noCalls}</h3>
                <p>When guests ring the bell on their QR screen, alerts appear here instantly.</p>
              </div>
            ) : (
              <div className={styles.callsGrid}>
                {serviceCalls.map((c, idx) => (
                  <div key={idx} className={styles.callCard}>
                    <div className={styles.callCardHeader}>
                      <span className={styles.tableBadge}>TABLE #{c.tableNumber}</span>
                      <span className={styles.callTypeBadge}>{c.requestType}</span>
                    </div>

                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                      {c.message}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        type="button"
                        className={styles.btnAdvance}
                        onClick={() => handleDismissCall(c.timestamp)}
                      >
                        ✓ {t.callAttended}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── Mobile Cart Review Drawer Modal ─────────────────────────────────── */}
      {showMobileCartDrawer && (
        <div className={styles.modalOverlay} onClick={() => setShowMobileCartDrawer(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3>📝 {isAddonMode ? `Add-on KOT — Table #${cleanOrderTableNumber}` : `KOT — Table #${cleanOrderTableNumber}`}</h3>
                <p style={{ fontSize: '0.75rem', color: '#fbe08e', margin: '2px 0 0' }}>
                  {cartItems.length} {t.itemsCount} • Total: ₹{cartGrandTotal}
                </p>
              </div>
              <button type="button" onClick={() => setShowMobileCartDrawer(false)} className={styles.modalClose}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {/* Table Selector */}
              <div className={styles.tableSelectorRow}>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569' }}>Table:</label>
                <select
                  value={orderTargetTable}
                  onChange={e => setOrderTargetTable(e.target.value)}
                  className={styles.tableSelectField}
                >
                  {tables.map(tbl => (
                    <option key={tbl.tableNumber} value={tbl.tableNumber}>
                      Table #{tbl.tableNumber} ({tbl.status === 'AVAILABLE' ? '🟢 Free' : '🟡 Dining'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Diners Count */}
              <div className={styles.tableSelectorRow}>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569' }}>Diners:</label>
                <select
                  value={orderGuestCount}
                  onChange={e => setOrderGuestCount(Number(e.target.value))}
                  className={styles.tableSelectField}
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                    <option key={n} value={n}>{n} {t.diners}</option>
                  ))}
                </select>
              </div>

              {/* Customer Name & Mobile for Method 2 & CRM Duplicate Prevention */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', margin: '0.35rem 0' }}>
                <input
                  type="text"
                  placeholder={lang === 'ta' ? 'பெயர் (விருப்பம்)' : 'Name (Optional)'}
                  value={orderGuestName}
                  onChange={e => setOrderGuestName(e.target.value)}
                  className={styles.tableSelectField}
                  style={{ fontSize: '0.76rem', padding: '6px 8px' }}
                />
                <input
                  type="tel"
                  placeholder={lang === 'ta' ? 'மொபைல் எண்' : 'Mobile No.'}
                  value={orderCustomerPhone}
                  onChange={e => setOrderCustomerPhone(e.target.value)}
                  className={styles.tableSelectField}
                  style={{ fontSize: '0.76rem', padding: '6px 8px' }}
                />
              </div>

              {/* Preferences */}
              <div className={styles.preferenceChipsTitle}>{t.cookingPref}</div>
              <div className={styles.preferenceChips}>
                {COOKING_PREFERENCES.map(pref => {
                  const active = selectedPrefs.includes(lang === 'ta' ? pref.labelTa : pref.labelEn);
                  return (
                    <button
                      key={pref.id}
                      type="button"
                      className={`${styles.prefChip} ${active ? styles.prefChipActive : ''}`}
                      onClick={() => handleTogglePref(lang === 'ta' ? pref.labelTa : pref.labelEn)}
                    >
                      {lang === 'ta' ? pref.labelTa : pref.labelEn}
                    </button>
                  );
                })}
              </div>

              {/* Notes */}
              <input
                type="text"
                placeholder={lang === 'ta' ? 'கூடுதல் சமையல் குறிப்பு...' : 'Special instructions...'}
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                className={styles.catalogSearchInput}
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              />

              {/* Items List */}
              <div className={styles.cartItemsList} style={{ maxHeight: '180px' }}>
                {cartItems.map(it => (
                  <div key={it.dishId} className={styles.cartItemLine}>
                    <span>{it.quantity}× {it.tamilTitle || it.title}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 850 }}>
                        {it.price > 0 ? `₹${it.price * it.quantity}` : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateCart(it.dishId, -it.quantity)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 800 }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Row */}
              <div className={styles.cartTotalBox}>
                <div className={styles.grandTotalRow}>
                  <span>{t.totalAmount}:</span>
                  <span>₹{cartGrandTotal}</span>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnFireKot}
                  onClick={handleFireKot}
                  disabled={isFiringKot || cartItems.length === 0}
                >
                  {isFiringKot ? '⏳ Firing to Kitchen...' : t.fireKotBtn}
                </button>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setShowMobileCartDrawer(false)}
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Table Inspector Modal (Running KOT, Actions) ───────────────────── */}
      {inspectTable && (
        <div className={styles.modalOverlay} onClick={() => setInspectTable(null)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3>🏛️ Table #{inspectTable.tableNumber} — {inspectTable.section?.replace('_', ' ')}</h3>
                <p style={{ fontSize: '0.74rem', color: '#fbe08e', margin: '2px 0 0' }}>
                  Capacity: {inspectTable.capacity} Diners • Status: {inspectTable.status}
                </p>
              </div>
              <button type="button" onClick={() => setInspectTable(null)} className={styles.modalClose}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {/* Table Quick Dispatch */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.btnTableQuick}
                  style={{ background: '#0284c7', color: '#ffffff', padding: '7px 10px' }}
                  onClick={() => handleTableStatus(inspectTable.tableNumber, 'BILL_REQUESTED')}
                >
                  🧾 {t.requestBill}
                </button>
                <button
                  type="button"
                  className={styles.btnTableQuick}
                  style={{ background: '#dc2626', color: '#ffffff', padding: '7px 10px' }}
                  onClick={() => handleTableStatus(inspectTable.tableNumber, 'CLEANING')}
                >
                  🧹 {t.cleaning}
                </button>
                <button
                  type="button"
                  className={styles.btnTableQuick}
                  style={{ background: '#16a34a', color: '#ffffff', padding: '7px 10px' }}
                  onClick={() => handleTableStatus(inspectTable.tableNumber, 'AVAILABLE')}
                >
                  ✨ {t.markCleaned}
                </button>
              </div>

              {/* Running Dishes if Occupied */}
              {(() => {
                const active = orders.find(o =>
                  (String(o.tableNumber) === String(inspectTable.tableNumber) || (o.tables && o.tables.includes(String(inspectTable.tableNumber)))) &&
                  o.status !== 'CANCELLED' && o.status !== 'PAID_SETTLED' && o.status !== 'completed'
                );

                if (!active) {
                  return (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                      <p>Table is currently empty or available.</p>
                      <button
                        type="button"
                        className={styles.btnOrderPrimary}
                        style={{ padding: '8px 16px', borderRadius: '10px' }}
                        onClick={() => openTakeOrder(inspectTable.tableNumber)}
                      >
                        ⚡ {t.takeOrder} (New KOT)
                      </button>
                    </div>
                  );
                }

                return (
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#051B41' }}>
                      Active KOT: {active.orderId} ({active.guestName})
                    </h4>
                    <div className={styles.itemsSummary}>
                      {(active.items || []).map((it, idx) => (
                        <div key={idx} className={styles.itemLine}>
                          <span>{it.quantity}× {it.title}</span>
                          <span style={{ fontWeight: 800 }}>
                            {it.price > 0 ? `₹${(it.price || 0) * (it.quantity || 1)}` : '—'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '0.98rem', color: '#051B41', margin: '8px 0 12px' }}>
                      <span>Total Bill:</span>
                      <span>₹{active.totalAmount}</span>
                    </div>

                    <button
                      type="button"
                      className={styles.btnFireKot}
                      style={{ width: '100%', background: '#f59e0b' }}
                      onClick={() => openTakeOrder(inspectTable.tableNumber, true, active)}
                    >
                      ➕ {t.runningAddon} (Add Items)
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ─── OTP Authorization Modal ───────────────────────────────────────── */}
      {selectedOtpOrder && (
        <div className={styles.modalOverlay} onClick={() => setSelectedOtpOrder(null)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3>🔑 Table #{selectedOtpOrder.tables?.join(' & #')} Authorization</h3>
                <p style={{ fontSize: '0.74rem', color: '#fbe08e', margin: '2px 0 0' }}>
                  {selectedOtpOrder.guestName} • {selectedOtpOrder.items?.length} items • ₹{selectedOtpOrder.totalAmount}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedOtpOrder(null)} className={styles.modalClose}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>{t.enterOtpDesc}</p>
              <form onSubmit={handleAuthorizeOtp}>
                <div className={styles.otpInputRow}>
                  {[0, 1, 2, 3].map(i => (
                    <input
                      key={i}
                      type="text"
                      maxLength={1}
                      inputMode="numeric"
                      className={styles.otpSingleInput}
                      value={enteredOtp[i] || ''}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/, '');
                        const arr = enteredOtp.split('');
                        arr[i] = val;
                        setEnteredOtp(arr.join(''));
                        if (val && e.target.nextSibling) e.target.nextSibling.focus();
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && !enteredOtp[i] && e.target.previousSibling) {
                          e.target.previousSibling.focus();
                        }
                      }}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <div className={styles.modalActions} style={{ marginTop: '14px' }}>
                  <button
                    type="submit"
                    className={styles.btnAuthorizeSubmit}
                    disabled={verifyingOtp || enteredOtp.replace(/\D/g, '').length < 4}
                  >
                    {verifyingOtp ? '⏳ Authorizing...' : t.authorizeSubmit}
                  </button>
                  <button
                    type="button"
                    className={styles.btnCancel}
                    onClick={() => setSelectedOtpOrder(null)}
                  >
                    {t.cancel}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
