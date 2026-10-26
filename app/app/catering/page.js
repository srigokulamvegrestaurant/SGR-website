'use client';

import { useState, useEffect } from 'react';
import Preloader from '../components/Preloader';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TableReservationModal from '../components/TableReservationModal';
import CustomerAuthModal from '../components/CustomerAuthModal';
import QrModal from '../components/QrModal';
import { DEFAULT_WEBSITE_CMS } from '@/lib/cms_defaults';

export default function CateringPage() {
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

      <main style={{ flex: 1, paddingTop: '36px', paddingBottom: '70px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span style={{ color: '#fbbf24', fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
              🍌 Traditional Plantain Leaf Feasts
            </span>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontFamily: 'Cinzel, serif', color: '#fef3c7', margin: '10px 0 14px' }}>
              Vegetarian Catering &amp; Bulk Orders
            </h1>
            <p style={{ color: '#a8a29e', fontSize: '16px', maxWidth: '750px', margin: '0 auto', lineHeight: 1.6 }}>
              Celebrate your life’s auspicious milestones with the sacred culinary flavors of Chettinad. 100% pure vegetarian feasts crafted with wood-pressed oils and pure nattu pasu cow ghee.
            </p>
          </div>

          {/* Catering Packages Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            {/* Package 1 */}
            <div style={{ background: '#1c1917', border: '1px solid #78350f', borderRadius: '16px', padding: '30px' }}>
              <span style={{ background: '#78350f', color: '#fde68a', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', textTransform: 'uppercase' }}>
                Weddings &amp; Receptions
              </span>
              <h2 style={{ fontSize: '22px', color: '#fef3c7', margin: '16px 0 10px 0' }}>Royal Chettinad Leaf Feast</h2>
              <p style={{ color: '#a8a29e', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
                Complete 16-dish ceremonial feast served on fresh banana leaves with authentic Karaikudi sweets, kootu, poriyal, special sambar, and paal payasam.
              </p>
              <ul style={{ color: '#d6d3d1', fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: '0 0 24px 0' }}>
                <li>Live Counter Dosa &amp; Hot Kuzhi Paniyaram</li>
                <li>Unlimited traditional fragrant rice &amp; ghee</li>
                <li>Traditional brassware &amp; leaf service crew</li>
              </ul>
            </div>

            {/* Package 2 */}
            <div style={{ background: '#1c1917', border: '1px solid #78350f', borderRadius: '16px', padding: '30px' }}>
              <span style={{ background: '#78350f', color: '#fde68a', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', textTransform: 'uppercase' }}>
                Functions &amp; Poojas
              </span>
              <h2 style={{ fontSize: '22px', color: '#fef3c7', margin: '16px 0 10px 0' }}>Sattvic Temple &amp; Pooja Feast</h2>
              <p style={{ color: '#a8a29e', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
                Pure Sattvic preparation strictly without onion or garlic for housewarmings (Grihapravesam), temple festivals, and family poojas.
              </p>
              <ul style={{ color: '#d6d3d1', fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: '0 0 24px 0' }}>
                <li>Traditional Sarkarai Pongal with pure cow ghee</li>
                <li>Medu Vadai &amp; Vazhaipoo Vadai</li>
                <li>Authentic Kovil Puliyodharai &amp; Curd Rice</li>
              </ul>
            </div>

            {/* Package 3 */}
            <div style={{ background: '#1c1917', border: '1px solid #78350f', borderRadius: '16px', padding: '30px' }}>
              <span style={{ background: '#78350f', color: '#fde68a', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', textTransform: 'uppercase' }}>
                Corporate &amp; Gatherings
              </span>
              <h2 style={{ fontSize: '22px', color: '#fef3c7', margin: '16px 0 10px 0' }}>Executive Tiffin Boxes</h2>
              <p style={{ color: '#a8a29e', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
                Hygienic, premium packed tiffin boxes and lunch combos for corporate meetings, tourist bus groups, and celebrations.
              </p>
              <ul style={{ color: '#d6d3d1', fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: '0 0 24px 0' }}>
                <li>Eco-friendly leak-proof packaging</li>
                <li>Mini Tiffin Combos with fresh filter coffee</li>
                <li>On-time delivery across Karaikudi</li>
              </ul>
            </div>
          </div>

          {/* Contact Inquiry Box */}
          <div style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)', border: '1px solid #d97706', borderRadius: '16px', padding: '36px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '22px', color: '#fef3c7', margin: '0 0 10px 0' }}>Plan Your Catering With Our Master Chefs</h3>
            <p style={{ color: '#d6d3d1', fontSize: '15px', maxWidth: '600px', margin: '0 auto 24px auto' }}>
              Call our dedicated catering coordinator or message us directly on WhatsApp to customize your menu and get instant quotes.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="tel:+917358325113"
                style={{
                  background: '#d97706',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '15px',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                📞 Call: +91 73583 25113
              </a>
              <a
                href="https://wa.me/917358325113?text=Vanakkam%2C%20I%20would%20like%20to%20inquire%20about%20catering%20services%20from%20Sri%20Gokulam."
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#15803d',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '15px',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                💬 Chat on WhatsApp
              </a>
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
