'use client';

import { useState, useEffect } from 'react';
import Preloader from '../components/Preloader';
import Header from '../components/Header';
import ChooseUsSection from '../components/ChooseUsSection';
import Footer from '../components/Footer';
import TableReservationModal from '../components/TableReservationModal';
import CustomerAuthModal from '../components/CustomerAuthModal';
import QrModal from '../components/QrModal';
import OrderDrawer from '../components/OrderDrawer';
import FloatingCart from '../components/FloatingCart';
import { DEFAULT_WEBSITE_CMS } from '@/lib/cms_defaults';

export default function ChooseUsPage() {
  const [cms, setCms] = useState(DEFAULT_WEBSITE_CMS.published);
  const [cart, setCart] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  useEffect(() => {
    // Load CMS data
    fetch('/api/admin/cms?mode=published')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.published) {
          setCms(data.published);
        }
      })
      .catch((err) => console.error('Failed to load CMS data:', err));

    // Load active dining tab
    try {
      const stored = localStorage.getItem('sgr_cart') || sessionStorage.getItem('sgr_cart');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
      }
    } catch {
      /* ignore */
    }

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
  }, []);

  // Sync cart to storage when updated
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

  const handleClearCart = () => {
    setCart([]);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      {/* Preloader */}
      <Preloader />
      {/* 1. Header */}
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

      {/* 2. Choose Us Hero Breadcrumb Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #051B41 0%, #0E2954 60%, #004080 100%)',
          padding: '48px 24px 40px',
          textAlign: 'center',
          color: '#ffffff',
          borderBottom: '1px solid rgba(0, 89, 179, 0.35)',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#F5C564',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '12px',
              fontFamily: "'Cinzel', serif",
            }}
          >
            <span>HOME</span> • <span>WHY CHOOSE SRI GOKULAM</span>
          </div>

          <h1
            style={{
              fontFamily: "'Playfair Display', 'Cinzel', serif",
              fontSize: '2.5rem',
              fontWeight: 800,
              margin: '0 0 10px',
              color: '#FFF9ED',
            }}
          >
            Why Choose Sri Gokulam
          </h1>

          <p
            style={{
              fontFamily: "'Mukta Malar', serif",
              fontSize: '1.2rem',
              color: '#22c55e',
              fontWeight: 700,
              margin: '0 0 14px',
            }}
          >
            எங்களை ஏன் தேர்ந்தெடுக்க வேண்டும்?
          </p>

          <p
            style={{
              fontSize: '1rem',
              color: '#cbd5e1',
              maxWidth: '680px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Discover the time-honored Chettinad culinary secrets, 100% pure cow ghee preparations, and
            unmatched sattvic hospitality that makes us Karaikudi&apos;s most cherished vegetarian destination.
          </p>
        </div>
      </div>

      {/* 3. The Comprehensive Choose Us Showcase */}
      <main style={{ flex: 1 }}>
        <ChooseUsSection
          onOpenReservationModal={() => setReservationModalOpen(true)}
        />
      </main>

      {/* 4. Footer */}
      <Footer
        content={cms?.footer || cms?.content}
        design={cms?.design}
        pages={cms?.pages}
        footerConfig={cms?.footer}
      />

      {/* Modals & Overlays */}
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
