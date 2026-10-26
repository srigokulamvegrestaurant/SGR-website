'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './Header.module.css';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Our Specials', href: '/#specials' },
  { label: 'Our Menu', href: '/#menu' },
  { label: 'About Us', href: '/#about' },
  { label: 'Contact', href: '/contact' },
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
  const [activeHash, setActiveHash] = useState('');
  const headerWrapperRef = useRef(null);
  const [drawerTop, setDrawerTop] = useState(64);

  // Synchronize hash for active link indicator
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncActiveHash = () => {
      setActiveHash(window.location.hash || '');
    };
    syncActiveHash();
    window.addEventListener('hashchange', syncActiveHash);
    window.addEventListener('popstate', syncActiveHash);
    return () => {
      window.removeEventListener('hashchange', syncActiveHash);
      window.removeEventListener('popstate', syncActiveHash);
    };
  }, []);

  // Measure fixed header height for layout spacer and mobile drawer positioning
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerWrapperRef.current) {
        const height = Math.round(headerWrapperRef.current.getBoundingClientRect().height || headerWrapperRef.current.offsetHeight || 64);
        setDrawerTop(height);
      }
    };
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    // Slight delay to catch web fonts loading
    const timer = setTimeout(updateHeaderHeight, 150);
    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
      clearTimeout(timer);
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
  const filteredNavLinks = rawNavLinks.filter((link) => {
    if (link.isVisible === false) return false;
    const href = (link.href || '').toLowerCase();
    const label = (link.label || '').toLowerCase();
    const id = (link.id || '').toLowerCase();
    if (href.includes('/waiter') || href.includes('/admin')) return false;
    if (label.includes('waiter') || label.includes('staff') || label.includes('admin')) return false;
    if (id.includes('waiter') || id.includes('admin') || id.includes('staff')) return false;
    if (label.includes('signature') || href.includes('signature') || id.includes('signature')) return false;
    if (label.includes('qr') || href.includes('table-qr') || id.includes('table_qr')) return false;
    if (label.includes('choose') || href.includes('choose-us') || id.includes('choose')) return false;
    return true;
  }).map((link) => {
    const label = (link.label || '').toLowerCase();
    const id = (link.id || '').toLowerCase();
    const href = (link.href || '').toLowerCase();
    if (label.includes('menu') || id.includes('menu') || href.includes('menu')) {
      return { ...link, label: 'Our Menu', href: '/#menu' };
    }
    if (label === 'about' || id.includes('about') || label.includes('about') || href.includes('choose')) {
      return { ...link, label: 'About Us', href: '/#about' };
    }
    return link;
  });

  // Ensure About Us is in the list before Contact if not present
  const hasAbout = filteredNavLinks.some(l => (l.label || '').toLowerCase().includes('about'));
  if (!hasAbout) {
    const contactIdx = filteredNavLinks.findIndex(l => (l.label || '').toLowerCase().includes('contact'));
    const aboutLink = { id: 'nav_about', label: 'About Us', href: '/#about', isVisible: true };
    if (contactIdx > -1) {
      filteredNavLinks.splice(contactIdx, 0, aboutLink);
    } else {
      filteredNavLinks.push(aboutLink);
    }
  }

  const activeNavLinks = filteredNavLinks;

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

  const isLinkActive = (link) => {
    const href = (link.href || '').toLowerCase();
    const label = (link.label || '').toLowerCase();

    if (activeHash) {
      if (activeHash === '#about' || activeHash === '#choose-us' || activeHash === '#why-choose-us') {
        return label.includes('about') || href.includes('about') || href.includes('choose');
      }
      if (activeHash === '#specials' || activeHash === '#signature') {
        return label.includes('special');
      }
      if (activeHash === '#menu') {
        return label.includes('menu');
      }
      if (activeHash === '#contact') {
        return label.includes('contact');
      }
      if (href.includes(activeHash)) {
        return true;
      }
      return false;
    }

    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      return href === '/' || label === 'home';
    }

    if (typeof window !== 'undefined' && href === window.location.pathname) {
      return true;
    }

    return !!link.active;
  };

  const handleNavClick = (link, safeHref, e) => {
    const label = (link.label || '').toLowerCase();
    const href = (safeHref || '').toLowerCase();

    setMobileMenuOpen(false);

    if (label.includes('qr') || href.includes('table-qr')) {
      if (e && e.preventDefault) e.preventDefault();
      if (onOpenQrModal) onOpenQrModal();
      return;
    }

    if (href.includes('#')) {
      const hashId = href.split('#')[1];
      setActiveHash(`#${hashId}`);

      if (typeof window !== 'undefined' && window.location.pathname === '/') {
        let el = document.getElementById(hashId);
        if (!el) {
          if (hashId === 'specials' || hashId === 'signature') {
            el = document.getElementById('specials') || document.getElementById('menu');
          } else if (hashId === 'about' || hashId === 'choose-us' || hashId === 'why-choose-us' || hashId === 'about-us') {
            el = document.getElementById('about') || document.getElementById('choose-us');
          } else if (hashId === 'contact') {
            el = document.getElementById('contact');
          }
        }

        if (el) {
          if (e && e.preventDefault) e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth' });
          window.history.pushState(null, '', `/#${hashId}`);
          return;
        }
      } else {
        if (e && e.preventDefault) e.preventDefault();
        window.location.href = `/#${hashId}`;
        return;
      }
    } else if (href === '/' || href === '') {
      setActiveHash('');
      if (typeof window !== 'undefined' && window.location.pathname === '/') {
        if (e && e.preventDefault) e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.history.pushState(null, '', '/');
        return;
      }
    }
  };

  return (
    <>
      {/* Fixed Top Restaurant Branding & Navigation Bar */}
      <div ref={headerWrapperRef} className={styles.headerWrapper}>
        {/* Top Announcement Strip (Desktop only, hidden on mobile) */}
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

        {/* Main Royal Blue Restaurant Branding Bar */}
        <header className={styles.header}>
          <div className={styles.headerInner}>

            {/* Brand Logo & Name */}
            <a href="/" className={styles.brandLink}>
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

            {/* Desktop Navigation Links (Centrally Positioned) */}
            <ul className={styles.navLinksList}>
              {activeNavLinks.map((link) => {
                const safeHref = link.href.startsWith('#') ? `/${link.href}` : link.href;
                const active = isLinkActive(link);
                return (
                  <li key={link.label}>
                    <a
                      href={safeHref}
                      className={active ? styles.activeLink : ''}
                      onClick={(e) => handleNavClick(link, safeHref, e)}
                    >
                      {link.label}
                    </a>
                  </li>
                );
              })}
            </ul>

            {/* Right Action & Account Group */}
            <div className={styles.headerRightSection}>
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

              {/* Customer Account / Login CTA & Mobile Hamburger */}
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
          </div>
        </header>
      </div>

      {/* Spacer to prevent page content from being obscured behind fixed header */}
      <div
        className={styles.headerSpacer}
        style={{ height: `${drawerTop}px` }}
        aria-hidden="true"
      />

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
          {activeNavLinks.map((link) => {
            const safeHref = link.href.startsWith('#') ? `/${link.href}` : link.href;
            const active = isLinkActive(link);
            return (
              <a
                key={link.label}
                href={safeHref}
                className={active ? styles.activeLink : ''}
                onClick={(e) => handleNavClick(link, safeHref, e)}
              >
                {link.label}
              </a>
            );
          })}
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
