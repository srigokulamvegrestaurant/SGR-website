'use client';

// app/admin/settings/page.js - Dedicated Settings & Configuration Route
import { useState, useEffect } from 'react';
import Link from 'next/link';
import SettingsDashboard from '../components/SettingsDashboard';
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

export default function SettingsPage() {
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
                    e.currentTarget.parentElement.innerText = '⚙️';
                  }
                }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={styles.brandName}>SRI GOKULAM</span>
                <span className={styles.brandBadge}>SETTINGS SUITE</span>
              </div>
              <span className={styles.brandSub}>Restaurant Configuration, Security, Hardware &amp; Preferences</span>
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
                }}
                value={currentUser.role}
                onChange={(e) => {
                  const preset = STAFF_PRESETS.find((p) => p.role === e.target.value) || STAFF_PRESETS[0];
                  setCurrentUser(preset);
                }}
              >
                {STAFF_PRESETS.map((p) => (
                  <option key={p.role} value={p.role}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            <Link
              href="/admin?tab=overview"
              className={styles.statusPill}
              style={{ textDecoration: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              ← Back to Admin Console
            </Link>

            <Link
              href="/admin?tab=pos"
              className={styles.statusPill}
              style={{ textDecoration: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 700 }}
            >
              🧾 High-Speed POS
            </Link>

            <Link
              href="/admin/login"
              className={styles.statusPill}
              style={{
                textDecoration: 'none',
                color: '#c084fc',
                borderColor: 'rgba(168, 85, 247, 0.4)',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
              title="Secure OTP Admin Login Gateway"
            >
              🔐 Admin Login
            </Link>

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

      {/* Main Settings Suite Content */}
      <main className={styles.adminBody}>
        <SettingsDashboard currentUser={currentUser} />
      </main>
    </div>
  );
}
