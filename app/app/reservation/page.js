'use client';

import { useState, useEffect } from 'react';
import Preloader from '../components/Preloader';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TableReservationModal from '../components/TableReservationModal';
import CustomerAuthModal from '../components/CustomerAuthModal';
import QrModal from '../components/QrModal';
import { DEFAULT_WEBSITE_CMS } from '@/lib/cms_defaults';

export default function ReservationPage() {
  const [cms, setCms] = useState(DEFAULT_WEBSITE_CMS.published);
  const [reservationModalOpen, setReservationModalOpen] = useState(true); // Open directly on dedicated page
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
        brand={cms?.header || cms?.design}
        buttons={cms?.buttons}
        announcement={cms?.header || cms?.content}
        navLinks={cms?.header?.navLinks || cms?.pages}
      />

      <main style={{ flex: 1, paddingTop: '36px', paddingBottom: '60px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px', textAlign: 'center' }}>
          <span style={{ color: '#fbbf24', fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
            🪑 Online Dining Reservation
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontFamily: 'Cinzel, serif', color: '#fef3c7', margin: '10px 0 16px' }}>
            Reserve Your Table
          </h1>
          <p style={{ color: '#a8a29e', fontSize: '16px', lineHeight: 1.6, marginBottom: '30px' }}>
            Experience prompt and gracious Chettinad hospitality. Book your table for family lunches, business gatherings, or celebrations.
          </p>

          <div style={{ background: '#1c1917', border: '1px solid #78350f', borderRadius: '16px', padding: '36px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', textAlign: 'left' }}>
            <h2 style={{ fontSize: '20px', color: '#fbbf24', margin: '0 0 16px 0' }}>Dining Hall Options</h2>
            <ul style={{ color: '#d6d3d1', lineHeight: 1.8, paddingLeft: '20px', margin: '0 0 24px 0', fontSize: '15px' }}>
              <li><strong>AC Royal Hall:</strong> Intimate climate-controlled comfort for families and VIP parties.</li>
              <li><strong>Ground Floor Main Dining:</strong> Traditional brassware and lively family feast ambiance.</li>
              <li><strong>Traditional Veranda:</strong> Open-air heritage feel with breezy courtyard seating.</li>
            </ul>

            <button
              onClick={() => setReservationModalOpen(true)}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: '#000',
                fontWeight: 800,
                fontSize: '16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                boxShadow: '0 4px 20px rgba(217, 119, 6, 0.4)',
              }}
            >
              Click Here to Open Reservation Form
            </button>
          </div>
        </div>
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
