'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import WebsiteCmsDashboard from '../components/WebsiteCmsDashboard';
import styles from '../admin.module.css';

const STAFF_PRESETS = [
  { role: 'DEVELOPER_ADMIN', name: 'AJ Nanjil Tech Solutions', email: 'info.ajnanjiltechsolutions@gmail.com', badge: '#7c3aed' },
  { role: 'DEVELOPER_ADMIN', name: 'AJ Tech Solutions', email: 'info.ajtechsolutions@gmail.com', badge: '#7c3aed' },
  { role: 'SUPER_ADMIN', name: 'Owner - Sri Gokulam', email: 'owner@srigokulam.com', badge: '#dc2626' },
  { role: 'STORE_MANAGER', name: 'Karthikeyan (Manager)', email: 'manager@srigokulam.com', badge: '#ea580c' },
  { role: 'CASHIER', name: 'Rajan (POS Cashier)', email: 'cashier@srigokulam.com', badge: '#0284c7' },
  { role: 'WAITER', name: 'Murugan (Floor Captain)', email: 'waiter@srigokulam.com', badge: '#16a34a' },
  { role: 'KITCHEN', name: 'Selvam (Head Cook)', email: 'kitchen@srigokulam.com', badge: '#d97706' },
];

export default function WebsiteCmsPage() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('sgr_admin_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    }
    return 'dark';
  });
  const [currentUser, setCurrentUser] = useState(STAFF_PRESETS[0]);

  // Load authenticated session from localStorage if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sgr_admin_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.email) {
            setCurrentUser({
              name: parsed.fullName || parsed.name || 'Admin',
              email: parsed.email,
              role: parsed.role,
              badge: parsed.role === 'DEVELOPER_ADMIN' ? '#7c3aed' : '#dc2626',
            });
          }
        } catch (e) {}
      }
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('sgr_admin_theme', next);
  };

  return (
    <div className={styles.adminContainer} data-theme={theme}>
      {/* Top Header Command Bar */}
      <header className={styles.topNav}>
        <div className={styles.navInner}>
          <div className={styles.brandGroup}>
            <div className={styles.brandLogo}>
              <img
                src="/restaurant_logo.jpg"
                alt="Sri Gokulam Logo"
                className={styles.brandLogoImg}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerText = '🌐';
                  }
                }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={styles.brandName}>SRI GOKULAM</span>
                <span className={styles.brandBadge} style={{ background: '#10b981', color: '#ffffff' }}>WEBSITE CMS</span>
              </div>
              <span className={styles.brandSub}>Client Website Content Management System &amp; Live Publisher</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Quick Role Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Role:</span>
              <select
                className={styles.statusPill}
                style={{
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid var(--border-subtle)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                }}
                value={currentUser.role}
                onChange={(e) => {
                  const found = STAFF_PRESETS.find(s => s.role === e.target.value);
                  if (found) setCurrentUser(found);
                }}
              >
                {STAFF_PRESETS.map(s => (
                  <option key={s.role} value={s.role}>{s.name} ({s.role})</option>
                ))}
              </select>
            </div>

            {/* Link back to Main Admin Suite */}
            <Link
              href="/admin?tab=overview"
              className={styles.statusPill}
              style={{
                textDecoration: 'none',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                fontWeight: 700,
              }}
            >
              ← Back to Admin Suite
            </Link>

            {/* Link to live customer website */}
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.statusPill}
              style={{
                textDecoration: 'none',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontWeight: 700,
              }}
            >
              ↗ View Customer Website
            </Link>

            {/* Link to Secure Admin Login */}
            <Link
              href="/admin/login"
              className={styles.statusPill}
              style={{
                textDecoration: 'none',
                background: 'rgba(124, 58, 237, 0.15)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                fontWeight: 700,
              }}
            >
              🔐 Admin Login
            </Link>

            {/* Theme Toggle */}
            <button
              type="button"
              className={styles.statusPill}
              onClick={toggleTheme}
              style={{ cursor: 'pointer' }}
              title="Toggle Light / Dark Mode"
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>
      </header>

      {/* Main CMS Management Surface */}
      <main style={{ padding: '0.5rem 0 2rem 0' }}>
        <WebsiteCmsDashboard currentUser={currentUser} />
      </main>

      {/* Footer Attribution */}
      <footer className={styles.adminFooter}>
        Sri Gokulam Veg Restaurant • Authentic Chettinad Delicacies • Karaikudi
        <br />
        Designed &amp; Developed with excellence by{' '}
        <a href="https://ajnanjiltechsolutions.com/" target="_blank" rel="noopener noreferrer">
          AJ Nanjil Tech Solutions
        </a>
      </footer>
    </div>
  );
}
