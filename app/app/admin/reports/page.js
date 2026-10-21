'use client';

// app/admin/reports/page.js - Dedicated Reports & Analytics Route
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReportsDashboard from '../components/ReportsDashboard';
import styles from '../admin.module.css';

export default function ReportsPage() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('sgr_admin_theme');
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('sgr_admin_theme', next);
  };

  return (
    <div className={styles.adminContainer} data-theme={theme}>
      {/* Top Header */}
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
                    e.currentTarget.parentElement.innerText = '🍛';
                  }
                }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={styles.brandName}>SRI GOKULAM</span>
                <span className={styles.brandBadge}>REPORTS SUITE</span>
              </div>
              <span className={styles.brandSub}>Executive Financial, Sales, Inventory &amp; Performance Audit</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
              }}
            >
              🔐 Admin Login
            </Link>
            <button
              type="button"
              className={styles.statusPill}
              onClick={toggleTheme}
              style={{ cursor: 'pointer' }}
            >
              {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1600px', margin: '0 auto', width: '100%', padding: '1rem 1.25rem' }}>
        <ReportsDashboard />
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '1.25rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        Sri Gokulam Veg Restaurant • Advanced Agentic POS &amp; Analytics • Automated Financial Reconciliation &amp; Audit Engine
      </footer>
    </div>
  );
}
