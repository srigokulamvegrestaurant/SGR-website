'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './Header.module.css';

const NAV_LINKS = [
  { label: 'Home', href: '#', active: true },
  { label: 'Our Specials', href: '#specials' },
  { label: 'Signature Dishes', href: '#signature' },
  { label: 'Full Menu', href: '#menu' },
  { label: 'Why Choose Us', href: '#choose-us' },
  { label: 'Contact', href: '#contact' },
];

export default function Header({
  onOpenOrderDrawer,
  onOpenQrModal,
  onOpenCustomerAuth,
  onOpenReservationModal,
  buttons,
  announcement,
  brand,
  navLinks,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customer, setCustomer] = useState(null);
  const headerRef = useRef(null);
  const [drawerTop, setDrawerTop] = useState(76);

  // Measure header bottom position for mobile drawer alignment
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        setDrawerTop(Math.round(rect.bottom));
      }
    };
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    window.addEventListener('scroll', updateHeaderHeight, { passive: true });
    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
      window.removeEventListener('scroll', updateHeaderHeight);
    };
  }, []);

  // Synchronize customer login session
  useEffect(() => {
    const checkCustomer = () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('sgr_customer_token');
        const data = localStorage.getItem('sgr_customer_data');
        if (token && data) {
          try {
            setCustomer(JSON.parse(data));
          } catch (e) {
            setCustomer(null);
          }
        } else {
          setCustomer(null);
        }
      }
    };
    checkCustomer();
    window.addEventListener('storage', checkCustomer);
    window.addEventListener('sgr_customer_auth_change', checkCustomer);
    window.addEventListener('focus', checkCustomer);
    return () => {
      window.removeEventListener('storage', checkCustomer);
      window.removeEventListener('sgr_customer_auth_change', checkCustomer);
      window.removeEventListener('focus', checkCustomer);
    };
  }, []);

  const rawNavLinks = (Array.isArray(navLinks) && navLinks.length > 0) ? navLinks : NAV_LINKS;
  const activeNavLinks = rawNavLinks.filter((link) => {
    if (link.isVisible === false) return false;
    const href = (link.href || '').toLowerCase();
    const label = (link.label || '').toLowerCase();
    const id = (link.id || '').toLowerCase();
    if (href.includes('/waiter') || href.includes('/admin')) return false;
    if (label.includes('waiter') || label.includes('staff') || label.includes('admin')) return false;
    if (id.includes('waiter') || id.includes('admin') || id.includes('staff')) return false;
    return true;
  });

  const isExcludedHeaderButton = (b) => {
    const text = `${b.name || ''} ${b.text || ''} ${b.link || ''} ${b.key || ''} ${b.id || ''}`.toLowerCase();
    return (
      text.includes('swiggy') ||
      text.includes('zomato') ||
      text.includes('swiyg') ||
      text.includes('waiter') ||
      text.includes('staff') ||
      text.includes('admin')
    );
  };

  // Buttons config from CMS: support preset and newly added buttons (excluding third-party aggregators & staff)
  const headerButtons = (Array.isArray(buttons) && buttons.length > 0)
    ? buttons.filter(
        (b) =>
          b.isVisible !== false &&
          !isExcludedHeaderButton(b) &&
          (b.position?.toLowerCase().includes('header') || b.key === 'orderNow' || b.key === 'qrDineIn' || b.key === 'tableReservation')
      ).map((b) => {
        // Change any online order button to Table Reservation
        if (b.key === 'orderNow' || (b.text && b.text.toLowerCase().includes('order online'))) {
          return {
            ...b,
            id: 'btn_reservation',
            key: 'tableReservation',
            text: 'Table Reservation',
            tamilText: 'மேஜை முன்பதிவு',
            icon: '📅',
            action: 'reservation',
          };
        }
        return b;
      })
    : [
        { id: 'btn_reservation', key: 'tableReservation', text: 'Table Reservation', icon: '📅', isVisible: true, action: 'reservation', bgColor: '#f59e0b', textColor: '#051B41' },
        { id: 'btn_qr_dine_in', key: 'qrDineIn', text: 'QR Dine-In', icon: '📲', isVisible: true, action: 'qr', bgColor: '#0284c7', textColor: '#ffffff' },
      ];

  const handleButtonClick = (btn, e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    setMobileMenuOpen(false);

    const act = (btn.action || '').toLowerCase();
    const key = (btn.key || '').toLowerCase();
    const text = (btn.text || btn.name || '').toLowerCase();
    const link = (btn.link || '').toLowerCase();

    // Prioritize QR Dine-In triggers
    if (act === 'qr' || key === 'qrdinein' || key.includes('qr') || text.includes('qr') || act.includes('qr') || link.includes('table-qr')) {
      if (onOpenQrModal) onOpenQrModal();
      return;
    }

    // Table Reservation trigger
    if (act === 'reservation' || key === 'tablereservation' || text.includes('table reservation') || text.includes('reservation')) {
      if (onOpenReservationModal) onOpenReservationModal();
      return;
    }

    if (act === 'drawer' || key === 'ordernow' || text.includes('order online') || text.includes('cart')) {
      if (onOpenOrderDrawer) onOpenOrderDrawer();
      return;
    }

    if (act === 'menu' || link === '#menu') {
      const el = document.getElementById('menu');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (act === 'web' || act === 'external') {
      if (btn.link && btn.link !== '#') {
        window.open(btn.link, btn.target || '_blank');
      }
    } else if (act === 'tel') {
      window.location.assign(btn.link || 'tel:+919876543210');
    } else if (act === 'whatsapp') {
      window.open(btn.link || 'https://wa.me/919443123456', '_blank');
    }
  };

  return (
    <>
      {/* Top Announcement Strip */}
      {announcement?.topAnnouncementEnabled !== false && (
        <div className={styles.topAnnouncement}>
          <div className={styles.announcementLeft}>
            <span className={styles.announcementBadge}>{announcement?.announcementBadge || '100% PURE VEG'}</span>
            <span className={styles.announcementText}>
              {announcement?.announcementText || 'Authentic Chettinad Sattvic Culinary Heritage • Karaikudi, Tamil Nadu'}
            </span>
          </div>
          <div className={styles.announcementRight}>
            <span>📞 Table Reservations &amp; Orders: <strong>{announcement?.announcementPhone || announcement?.primaryPhone || '+91 98765 43210'}</strong></span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header ref={headerRef} className={styles.header}>
        <div className={styles.headerTrim}></div>
        <div className={styles.headerInner}>

          {/* Brand Logo & Name */}
          <a href="#" className={styles.brandLink}>
            <div className={styles.brandLogoFrame}>
              <img src={brand?.logoUrl || '/restaurant_logo.jpg'} alt="Sri Gokulam Veg Restaurant Logo" />
            </div>
            <div className={styles.brandTextBlock}>
              <div className={styles.brandTa}>{brand?.brandTa || 'ஸ்ரீ கோகுலம்'}</div>
              <div className={styles.brandEn}>{brand?.brandEn || 'SRI GOKULAM'}</div>
              <div className={styles.brandSub}>
                <span className={styles.leafIcon}>🍃</span> {brand?.brandSub || 'VEG RESTAURANT'} <span className={styles.leafIcon}>🍃</span>
              </div>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <ul className={styles.navLinksList}>
            {activeNavLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className={link.active ? styles.activeLink : ''}
                  onClick={(e) => {
                    const label = (link.label || '').toLowerCase();
                    const href = (link.href || '').toLowerCase();
                    if (label.includes('qr') || href.includes('table-qr')) {
                      if (e && e.preventDefault) e.preventDefault();
                      if (onOpenQrModal) onOpenQrModal();
                    }
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Action Buttons */}
          <div className={styles.headerActions}>
            {headerButtons.map((btn) => (
              <button
                key={btn.id || btn.key || btn.name}
                type="button"
                className={btn.key === 'qrDineIn' ? styles.btnQrCta : styles.btnGoldCta}
                style={{
                  backgroundColor: btn.bgColor || undefined,
                  color: btn.textColor || undefined,
                }}
                onClick={(e) => handleButtonClick(btn, e)}
              >
                {btn.icon && <span>{btn.icon}</span>} {btn.text}
              </button>
            ))}
          </div>

          {/* Customer Account / Login CTA & Mobile Hamburger (Grouped on right) */}
          <div className={styles.headerRightGroup}>
            {customer ? (
              <a href="/account" className={styles.btnAccountCta} title="View Profile, Orders & Bills">
                <span>👤</span> <span className={styles.accountText}>{customer.name ? customer.name.split(' ')[0] : 'My Account'}</span>
              </a>
            ) : (
              <button
                type="button"
                className={styles.btnAccountCta}
                onClick={onOpenCustomerAuth || (() => { window.location.href = '/account'; })}
                title="Customer Sign In & Orders"
              >
                <span>👤</span> <span className={styles.accountText}>Login / Account</span>
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              className={`${styles.hamburger} ${mobileMenuOpen ? styles.hamburgerOpen : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className={styles.mobileBackdrop}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Navigation Drawer - Positioned outside header with dynamic top calculation */}
      <div
        className={`${styles.mobileDrawer} ${mobileMenuOpen ? styles.mobileDrawerOpen : ''}`}
        style={mobileMenuOpen ? { top: `${drawerTop}px`, maxHeight: `calc(100vh - ${drawerTop}px)` } : {}}
      >
        <nav className={styles.mobileNav}>
          {activeNavLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={link.active ? styles.activeLink : ''}
              onClick={(e) => {
                const label = (link.label || '').toLowerCase();
                const href = (link.href || '').toLowerCase();
                setMobileMenuOpen(false);
                if (label.includes('qr') || href.includes('table-qr')) {
                  if (e && e.preventDefault) e.preventDefault();
                  if (onOpenQrModal) onOpenQrModal();
                }
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className={styles.mobileActions}>
          {headerButtons.map((btn) => (
            <button
              key={btn.id || btn.key || btn.name}
              type="button"
              className={btn.key === 'qrDineIn' ? styles.btnQrCta : styles.btnGoldCta}
              style={{
                backgroundColor: btn.bgColor || undefined,
                color: btn.textColor || undefined,
              }}
              onClick={(e) => handleButtonClick(btn, e)}
            >
              {btn.icon && <span>{btn.icon}</span>} {btn.text}
            </button>
          ))}

          {/* Mobile Customer Account Button */}
          {customer ? (
            <a
              href="/account"
              className={styles.btnAccountCta}
              onClick={() => setMobileMenuOpen(false)}
              style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
            >
              <span>👤</span> My Account ({customer.name ? customer.name.split(' ')[0] : 'Member'})
            </a>
          ) : (
            <button
              type="button"
              className={styles.btnAccountCta}
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenCustomerAuth) onOpenCustomerAuth();
                else window.location.href = '/account';
              }}
              style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
            >
              <span>👤</span> Login / My Account
            </button>
          )}
        </div>
      </div>
    </>
  );
}
