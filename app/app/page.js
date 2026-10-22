'use client';

import { useState, useEffect } from 'react';
import Preloader from './components/Preloader';
import Header from './components/Header';
import ActiveTableBar from './components/ActiveTableBar';
import HeroBanner from './components/HeroBanner';
import MarqueeTicker from './components/MarqueeTicker';
import OurSpecials from './components/OurSpecials';
import SensoryDishes from './components/SensoryDishes';
import MenuSection from './components/MenuSection';
import ChooseUsSection from './components/ChooseUsSection';
import ReviewsSection from './components/ReviewsSection';
import Footer from './components/Footer';
import FloatingCart from './components/FloatingCart';
import OrderDrawer from './components/OrderDrawer';
import QrModal from './components/QrModal';
import KotStatusModal from './components/KotStatusModal';
import MobileToast from './components/MobileToast';
import CustomerAuthModal from './components/CustomerAuthModal';
import TableReservationModal from './components/TableReservationModal';
import ScrollRevealInit from './components/ScrollRevealInit';

export default function Home() {
  const [cart, setCart] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [cms, setCms] = useState(null);
  const [liveMenu, setLiveMenu] = useState([]);
  const [liveCategories, setLiveCategories] = useState([]);

  // Restore cart from localStorage or sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sgr_cart') || sessionStorage.getItem('sgr_cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCart(parsed);
          }
        }
      } catch (e) {}

      // Cross-tab/window storage synchronization
      const handleStorageChange = (e) => {
        if (e.key === 'sgr_cart') {
          try {
            const updated = e.newValue ? JSON.parse(e.newValue) : [];
            setCart(Array.isArray(updated) ? updated : []);
          } catch (err) {}
        }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  // Sync cart to localStorage and sessionStorage when user adds/removes items
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (cart && cart.length > 0) {
          localStorage.setItem('sgr_cart', JSON.stringify(cart));
          sessionStorage.setItem('sgr_cart', JSON.stringify(cart));
        } else {
          localStorage.removeItem('sgr_cart');
          sessionStorage.removeItem('sgr_cart');
        }
      } catch (e) {}
    }
  }, [cart]);

  // Ingest deep-link table parameter from Google Lens / Phone Camera QR scan (?table=XX)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tbl = params.get('table');
      if (tbl) {
        const formatted = tbl.replace(/[^0-9a-zA-Z]/g, '').padStart(2, '0');
        setSelectedTables([formatted]);
        try {
          sessionStorage.setItem('sgr_active_table', formatted);
        } catch (e) {}
        setToast({
          title: `✨ Connected to Table #${formatted}! Contactless dine-in active.`,
          price: null,
          id: Date.now(),
        });
      } else {
        try {
          const saved = sessionStorage.getItem('sgr_active_table');
          if (saved) {
            setSelectedTables([saved]);
          }
        } catch (e) {}
      }
    }
  }, []);

  // Fetch published CMS configuration in real time with cache-busting and live polling
  useEffect(() => {
    let ignore = false;
    async function fetchCms() {
      try {
        const res = await fetch(`/api/cms?t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();
        if (!ignore && data.success) {
          if (data.cms) setCms(data.cms);
          if (Array.isArray(data.menu)) setLiveMenu(data.menu);
          if (Array.isArray(data.categories)) setLiveCategories(data.categories);
        }
      } catch (e) {
        console.error('Failed to load dynamic CMS data:', e);
      }
    }
    fetchCms();

    // Check for CMS changes every 3.5 seconds or when user focuses window
    const interval = setInterval(fetchCms, 3500);
    const onFocus = () => fetchCms();
    window.addEventListener('focus', onFocus);

    return () => {
      ignore = true;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Modals
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [kotModalOpen, setKotModalOpen] = useState(false);
  const [customerAuthModalOpen, setCustomerAuthModalOpen] = useState(false);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);

  // Toast & Filters
  const [toast, setToast] = useState(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');

  const handleCloseToast = () => {
    setToast(null);
  };

  // Add dish to dining tab with instant mobile feedback toast
  const handleAddToCart = (title, price) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.title === title);
      if (existing) {
        return prev.map((item) =>
          item.title === title ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { title, price, quantity: 1 }];
    });
    setToast({ title, price, id: Date.now() });
  };

  // Update quantity in cart
  const handleUpdateQuantity = (title, delta) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.title === title) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  // Clear cart on successful order
  const handleClearCart = () => {
    setCart([]);
  };

  // Filter menu when category card is clicked in OurSpecials
  const handleSelectSpecialCategory = (catId) => {
    let target = 'all';
    let catName = 'All Specials';
    if (catId === 'tiffin') {
      target = 'tiffin';
      catName = 'Tiffin Specials';
    } else if (catId === 'south-indian') {
      target = 'tiffin';
      catName = 'South Indian Specials';
    } else if (catId === 'north-indian') {
      target = 'meals';
      catName = 'North Indian & Meals';
    } else if (catId === 'chettinad') {
      target = 'chettinad';
      catName = 'Chettinad Special';
    }
    setActiveCategoryFilter(target);
    setToast({ title: `Viewing ${catName}`, price: null });

    const el = document.getElementById('menu');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Dynamic homepage section ordering and visibility
  const sectionsList = cms?.sections || [
    { id: 'hero', isVisible: true, order: 1 },
    { id: 'ticker', isVisible: true, order: 2 },
    { id: 'specials', isVisible: true, order: 3 },
    { id: 'sensory', isVisible: true, order: 4 },
    { id: 'menu', isVisible: true, order: 5 },
    { id: 'tableQr', isVisible: true, order: 6 },
    { id: 'reviews', isVisible: true, order: 7 },
    { id: 'footer', isVisible: true, order: 8 },
  ];

  const sortedSections = [...sectionsList]
    .filter((s) => s.isVisible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const navLinks = cms?.header?.navLinks || (cms?.pages
    ? cms.pages.filter((p) => p.inNav !== false).map((p) => ({ label: p.title, href: p.slug }))
    : undefined);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: cms?.design?.bgBody || '#ffffff' }}>
      {/* 1. Chettinad Mansion & Ornate Brass Pot Luxury Preloader */}
      <Preloader />

      {/* 1B. Performance-optimized Scroll-Triggered Reveal & Parallax Engine */}
      <ScrollRevealInit />

      {/* 2. Top Bar & Navigation Header */}
      <Header
        onOpenOrderDrawer={() => setDrawerOpen(true)}
        onOpenQrModal={() => setQrModalOpen(true)}
        onOpenCustomerAuth={() => setCustomerAuthModalOpen(true)}
        onOpenReservationModal={() => setReservationModalOpen(true)}
        buttons={cms?.buttons}
        announcement={cms?.header || cms?.content}
        brand={cms?.header || cms?.design}
        navLinks={navLinks}
        headerConfig={cms?.header}
      />

      {/* 2B. Active Connected Dining Table Status Bar */}
      <ActiveTableBar
        selectedTables={selectedTables}
        onOpenQrScanner={() => setQrModalOpen(true)}
        activeOrder={activeOrder}
        onOpenKotTracker={() => setKotModalOpen(true)}
      />

      {/* Dynamic Homepage Sections */}
      {sortedSections.map((sec) => {
        switch (sec.id) {
          case 'hero':
            return (
              <HeroBanner
                key="hero"
                slides={cms?.heroSlides}
                onOpenOrderDrawer={() => setDrawerOpen(true)}
                onOpenQrModal={() => setQrModalOpen(true)}
                onOpenReservationModal={() => setReservationModalOpen(true)}
              />
            );
          case 'ticker':
            return <MarqueeTicker key="ticker" items={cms?.content?.marqueeItems} />;
          case 'specials':
            return (
              <OurSpecials
                key="specials"
                categories={cms?.content?.specialCategories}
                onSelectCategory={handleSelectSpecialCategory}
              />
            );
          case 'sensory':
            return <SensoryDishes key="sensory" onAddToCart={handleAddToCart} />;
          case 'menu':
            return (
              <MenuSection
                key="menu"
                onAddToCart={handleAddToCart}
                activeCategoryFilter={activeCategoryFilter}
                liveMenu={liveMenu}
                liveCategories={liveCategories}
              />
            );
          case 'chooseUs':
          case 'tableQr':
            return (
              <ChooseUsSection
                key="chooseUs"
                onOpenReservationModal={() => setReservationModalOpen(true)}
              />
            );
          case 'reviews':
            return (
              <ReviewsSection
                key="reviews"
                customerReviews={cms?.customerReviews}
                videoReviews={cms?.videoReviews}
              />
            );
          case 'footer':
            return (
              <Footer
                key="footer"
                content={cms?.footer || cms?.content}
                design={cms?.design}
                pages={cms?.pages}
                footerConfig={cms?.footer}
              />
            );
          default:
            return null;
        }
      })}

      {/* Floating Active Tab Pill (Bottom Right) */}
      <FloatingCart cart={cart} onOpenDrawer={() => setDrawerOpen(true)} />

      {/* Slide-out Dining Tab / Order Drawer & Checkout Form */}
      <OrderDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        cart={cart}
        selectedTables={selectedTables}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        onOrderPlaced={(orderData) => {
          setActiveOrder(orderData);
          setKotModalOpen(true);
          setToast({
            title: `Order Placed! OTP: ${orderData.otp}`,
            price: null,
            id: Date.now(),
          });
        }}
      />

      {/* QR Camera Scanner Modal Popup */}
      <QrModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        initialTables={selectedTables}
        onConfirmTables={(tables) => {
          setSelectedTables(tables);
          if (tables && tables.length > 0) {
            try {
              sessionStorage.setItem('sgr_active_table', tables[0]);
            } catch (e) {}
          } else {
            try {
              sessionStorage.removeItem('sgr_active_table');
            } catch (e) {}
          }
          setToast({
            title: `Connected to Table #${tables.join(' & #')}!`,
            price: null,
            id: Date.now(),
          });
        }}
      />

      {/* Live Digital KOT, Waiter OTP & Kitchen Cooking Tracker Modal */}
      <KotStatusModal
        isOpen={kotModalOpen}
        onClose={() => setKotModalOpen(false)}
        order={activeOrder}
        onOrderMore={() => setDrawerOpen(true)}
      />

      {/* Customer Mobile + Email OTP Login & Register Modal */}
      <CustomerAuthModal
        isOpen={customerAuthModalOpen}
        onClose={() => setCustomerAuthModalOpen(false)}
        onSuccess={(cust) => {
          setToast({
            title: `Welcome, ${cust.name}! Logged in successfully.`,
            price: null,
            id: Date.now(),
          });
          // Redirect or notify
        }}
      />

      {/* Table Reservation Modal */}
      <TableReservationModal
        isOpen={reservationModalOpen}
        onClose={() => setReservationModalOpen(false)}
        onReservationConfirmed={(res) => {
          setToast({
            title: `Table #${res.tableNumber} Reserved for ${res.guestName}!`,
            price: null,
            id: Date.now(),
          });
        }}
      />

      {/* Mobile Interactive Toast Notification for Added Dishes / Actions */}
      <MobileToast
        toast={toast}
        onOpenDrawer={() => setDrawerOpen(true)}
        onClose={handleCloseToast}
      />
    </div>
  );
}
