'use client';

import { useState, useEffect } from 'react';
import Preloader from '../components/Preloader';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TableReservationModal from '../components/TableReservationModal';
import CustomerAuthModal from '../components/CustomerAuthModal';
import QrModal from '../components/QrModal';
import { DEFAULT_WEBSITE_CMS } from '@/lib/cms_defaults';

export default function ContactPage() {
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
        brand={cms?.header || cms?.design}
        buttons={cms?.buttons}
        announcement={cms?.header || cms?.content}
        navLinks={cms?.header?.navLinks || cms?.pages}
      />

      <main style={{ flex: 1, paddingTop: '36px', paddingBottom: '60px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span style={{ color: '#fbbf24', fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
              📍 Karaikudi, Tamil Nadu
            </span>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontFamily: 'Cinzel, serif', color: '#fef3c7', margin: '10px 0 14px' }}>
              Contact &amp; Location
            </h1>
            <p style={{ color: '#a8a29e', fontSize: '16px', maxWidth: '650px', margin: '0 auto' }}>
              Visit us in the heart of Karaikudi for authentic Chettinad Sattvic vegetarian dining, or get in touch for reservations and queries.
            </p>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            {/* Address Card */}
            <div style={{ background: '#1c1917', border: '1px solid #292524', borderRadius: '16px', padding: '30px' }}>
              <div style={{ fontSize: '28px', marginBottom: '16px' }}>🏛️</div>
              <h2 style={{ fontSize: '20px', color: '#fef3c7', margin: '0 0 10px 0' }}>Restaurant Address</h2>
              <p style={{ color: '#d6d3d1', lineHeight: 1.6, margin: '0 0 16px 0', fontSize: '15px' }}>
                <strong>Sri Gokulam Veg Restaurant</strong><br />
                Mudiyarasan Salai,<br />
                Near Bharat Petroleum Bunk and Thevar Silai,<br />
                Karaikudi, Sivaganga District,<br />
                Tamil Nadu - 630003, India.
              </p>
              <a
                href="https://maps.google.com/?q=Sri+Gokulam+Veg+Restaurant+Mudiyarasan+Salai+Near+Bharat+Petroleum+Karaikudi"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#d97706',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '14px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                }}
              >
                🗺️ Open in Google Maps
              </a>
            </div>

            {/* Operating Hours Card */}
            <div style={{ background: '#1c1917', border: '1px solid #292524', borderRadius: '16px', padding: '30px' }}>
              <div style={{ fontSize: '28px', marginBottom: '16px' }}>⏰</div>
              <h2 style={{ fontSize: '20px', color: '#fef3c7', margin: '0 0 10px 0' }}>Operating Hours</h2>
              <div style={{ color: '#d6d3d1', fontSize: '14px', lineHeight: 1.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #292524', paddingBottom: '6px' }}>
                  <span>Morning Tiffin</span>
                  <strong style={{ color: '#fbbf24' }}>06:30 AM – 11:30 AM</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #292524', padding: '6px 0' }}>
                  <span>Raja Chettinad Lunch</span>
                  <strong style={{ color: '#fbbf24' }}>12:00 PM – 03:45 PM</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #292524', padding: '6px 0' }}>
                  <span>Evening Snacks &amp; Tiffin</span>
                  <strong style={{ color: '#fbbf24' }}>04:30 PM – 06:45 PM</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span>Royal Dinner</span>
                  <strong style={{ color: '#fbbf24' }}>07:00 PM – 10:45 PM</strong>
                </div>
              </div>
              <p style={{ marginTop: '16px', color: '#10b981', fontSize: '13px', fontWeight: 600 }}>
                ✓ Open 7 Days a Week for Dine-in &amp; Takeaway
              </p>
            </div>

            {/* Phone & Inquiries Card */}
            <div style={{ background: '#1c1917', border: '1px solid #292524', borderRadius: '16px', padding: '30px' }}>
              <div style={{ fontSize: '28px', marginBottom: '16px' }}>📞</div>
              <h2 style={{ fontSize: '20px', color: '#fef3c7', margin: '0 0 10px 0' }}>Phone &amp; Inquiries</h2>
              <p style={{ color: '#a8a29e', fontSize: '14px', margin: '0 0 16px 0' }}>
                For table reservations, bulk orders, and wedding catering:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a
                  href="tel:+919443123456"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 16px',
                    background: '#292524',
                    borderRadius: '8px',
                    color: '#fef3c7',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: 600,
                  }}
                >
                  📱 +91 94431 23456
                </a>
                <a
                  href="tel:+919876543210"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 16px',
                    background: '#292524',
                    borderRadius: '8px',
                    color: '#fef3c7',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: 600,
                  }}
                >
                  📞 +91 98765 43210
                </a>
                <button
                  onClick={() => setReservationModalOpen(true)}
                  style={{
                    marginTop: '8px',
                    background: 'transparent',
                    border: '1px solid #fbbf24',
                    color: '#fbbf24',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  🪑 Book Table Online
                </button>
              </div>
            </div>
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
