'use client';

import { useState, useEffect } from 'react';
import Preloader from '../components/Preloader';
import Header from '../components/Header';
import ChooseUsSection from '../components/ChooseUsSection';
import Footer from '../components/Footer';
import TableReservationModal from '../components/TableReservationModal';
import CustomerAuthModal from '../components/CustomerAuthModal';
import QrModal from '../components/QrModal';
import { DEFAULT_WEBSITE_CMS } from '@/lib/cms_defaults';

export default function AboutPage() {
  const [cms, setCms] = useState(DEFAULT_WEBSITE_CMS.published);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/admin/cms?mode=published')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.published) setCms(data.published);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0908', color: '#f5f5f4' }}>
      <Preloader />

      <Header
        onOpenOrderDrawer={() => {}}
        onOpenQrModal={() => setQrModalOpen(true)}
        onOpenCustomerAuth={() => setAuthModalOpen(true)}
        onOpenReservationModal={() => setReservationModalOpen(true)}
        brand={cms?.brand}
        buttons={cms?.headerButtons}
        announcement={cms?.announcement}
        navLinks={cms?.navLinks}
      />

      <main style={{ flex: 1 }}>
        <div style={{ paddingTop: '100px', paddingBottom: '30px', textAlign: 'center', background: 'linear-gradient(180deg, #1c1917 0%, #0a0908 100%)', borderBottom: '1px solid #292524' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
            <span style={{ color: '#fbbf24', fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
              🌿 Our Sacred Culinary Roots
            </span>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontFamily: 'Cinzel, serif', color: '#fef3c7', margin: '10px 0 14px' }}>
              About Sri Gokulam
            </h1>
            <p style={{ color: '#a8a29e', fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
              Preserving the sacred vegetarian culinary arts of Chettinad and Tamil Nadu. Every dish is seasoned with generationally perfected recipes, pure cow ghee, and sattvic love.
            </p>
          </div>
        </div>

        <ChooseUsSection onOpenReservationModal={() => setReservationModalOpen(true)} />
      </main>

      <Footer
        content={cms?.footer || cms?.content}
        design={cms?.design}
        pages={cms?.pages}
        footerConfig={cms?.footer}
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
