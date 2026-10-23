'use client';

import { useState, useEffect } from 'react';
import Preloader from '../components/Preloader';
import Header from '../components/Header';
import MenuSection from '../components/MenuSection';
import Footer from '../components/Footer';
import TableReservationModal from '../components/TableReservationModal';
import CustomerAuthModal from '../components/CustomerAuthModal';
import QrModal from '../components/QrModal';
import OrderDrawer from '../components/OrderDrawer';
import FloatingCart from '../components/FloatingCart';
import { DEFAULT_WEBSITE_CMS } from '@/lib/cms_defaults';

export default function MenuPage() {
  const [cms, setCms] = useState(DEFAULT_WEBSITE_CMS.published);
  const [cart, setCart] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [liveMenu, setLiveMenu] = useState([]);
  const [liveCategories, setLiveCategories] = useState([]);

  useEffect(() => {
    // Load CMS data
    fetch('/api/admin/cms?mode=published')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.published) {
          setCms(data.published);
        }
      })
      .catch(() => {});

    // Load Live Menu
    fetch('/api/admin/menu')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (Array.isArray(data.items)) setLiveMenu(data.items);
          if (Array.isArray(data.categories)) setLiveCategories(data.categories);
        }
      })
      .catch(() => {});

    // Sync Cart from Local Storage
    try {
      const stored = localStorage.getItem('sgr_cart') || sessionStorage.getItem('sgr_cart');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setCart(parsed);
      }
    } catch {}

    const handleStorageChange = (e) => {
      if (e.key === 'sgr_cart') {
        try {
          const updated = e.newValue ? JSON.parse(e.newValue) : [];
          setCart(Array.isArray(updated) ? updated : []);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleAddToCart = (dish, variant, addOns, qty) => {
    const unitPrice = (dish.price || 0) + (variant?.priceDiff || 0) + (addOns || []).reduce((acc, a) => acc + (a.price || 0), 0);
    const cartItemId = `${dish.id}_${variant?.name || 'def'}_${(addOns || []).map(a => a.name).sort().join('_')}`;
    
    setCart((prev) => {
      const existingIdx = prev.findIndex(item => item.cartItemId === cartItemId);
      let updated;
      if (existingIdx > -1) {
        updated = [...prev];
        updated[existingIdx].quantity += qty;
      } else {
        updated = [
          ...prev,
          {
            ...dish,
            cartItemId,
            selectedVariant: variant,
            selectedAddOns: addOns,
            finalPrice: unitPrice,
            quantity: qty,
          },
        ];
      }
      try {
        localStorage.setItem('sgr_cart', JSON.stringify(updated));
        sessionStorage.setItem('sgr_cart', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setDrawerOpen(true);
  };

  const handleUpdateQuantity = (cartItemId, delta) => {
    setCart((prev) => {
      const updated = prev
        .map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + delta } : item)
        .filter(item => item.quantity > 0);
      try {
        localStorage.setItem('sgr_cart', JSON.stringify(updated));
        sessionStorage.setItem('sgr_cart', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearCart = () => {
    setCart([]);
    try {
      localStorage.removeItem('sgr_cart');
      sessionStorage.removeItem('sgr_cart');
    } catch {}
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0908', color: '#f5f5f4' }}>
      <Preloader />

      <Header
        onOpenOrderDrawer={() => setDrawerOpen(true)}
        onOpenQrModal={() => setQrModalOpen(true)}
        onOpenCustomerAuth={() => setAuthModalOpen(true)}
        onOpenReservationModal={() => setReservationModalOpen(true)}
        brand={cms?.header || cms?.design}
        buttons={cms?.buttons}
        announcement={cms?.header || cms?.content}
        navLinks={cms?.header?.navLinks || cms?.pages}
      />

      {/* Hero Banner for Menu */}
      <section style={{ paddingTop: '36px', paddingBottom: '30px', textAlign: 'center', background: 'linear-gradient(180deg, #1c1917 0%, #0a0908 100%)', borderBottom: '1px solid #292524' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
          <span style={{ color: '#fbbf24', fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
            🌿 100% Pure Sattvic Chettinad
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontFamily: 'Cinzel, serif', color: '#fef3c7', margin: '10px 0 14px' }}>
            Our Authentic Chettinad Menu
          </h1>
          <p style={{ color: '#a8a29e', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
            Cooked with wood-pressed sesame and groundnut oils, pure nattu pasu cow ghee, and freshly stone-ground Karaikudi spices.
          </p>
        </div>
      </section>

      {/* Main Interactive Menu */}
      <main style={{ flex: 1, padding: '30px 0 60px' }}>
        <MenuSection
          onAddToCart={handleAddToCart}
          liveMenu={liveMenu}
          liveCategories={liveCategories}
        />
      </main>

      <Footer
        content={cms?.footer || cms?.content}
        design={cms?.design}
        pages={cms?.pages}
        footerConfig={cms?.footer}
      />

      <FloatingCart cart={cart} onOpenDrawer={() => setDrawerOpen(true)} />

      <OrderDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
      />

      <TableReservationModal
        isOpen={reservationModalOpen}
        onClose={() => setReservationModalOpen(false)}
      />

      <CustomerAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <QrModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
}
