'use client';

// app/admin/components/SettingsDashboard.js - Sri Gokulam Enterprise Admin Panel Settings Suite
// Complete configuration dashboard for Restaurant Profile, General, RBAC, Orders, Tables & QR,
// Menu, Billing, Printers & KOT, Notifications, Inventory, Customer Loyalty, Website, Integrations,
// Security, Audit & Backups, and Restricted Developer Settings.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import styles from './SettingsDashboard.module.css';
import { generateQrSvg, generateStandeeCardHtml } from '@/lib/qrGenerator';
import BillSlipFormatDesigner from './BillSlipFormatDesigner';

export default function SettingsDashboard({ currentUser = { name: 'Aswin', role: 'DEVELOPER_ADMIN' } }) {
  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState('profile');

  // Loading & State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingIntegration, setTestingIntegration] = useState('');
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }

  // Settings Data & Unsaved Changes Tracking
  const [settings, setSettings] = useState({});
  const [initialSettings, setInitialSettings] = useState({});
  const [staffUsers, setStaffUsers] = useState([]);
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuDishes, setMenuDishes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [backups, setBackups] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);

  // Search & Filter States
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('ALL');
  const [dishSearch, setDishSearch] = useState('');
  const [dishStationFilter, setDishStationFilter] = useState('ALL');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditModuleFilter, setAuditModuleFilter] = useState('ALL');
  const [qrSelectedTable, setQrSelectedTable] = useState('07');

  // Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [editingStaffUser, setEditingStaffUser] = useState(null);
  const [newStaffForm, setNewStaffForm] = useState({ fullName: '', email: '', phone: '', role: 'WAITER' });
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableForm, setNewTableForm] = useState({ tableNumber: '', section: 'GROUND_FLOOR', capacity: 4, shape: 'SQUARE' });
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({ id: '', name: '', tamilName: '', icon: '🍛', station: 'TIFFIN', description: '' });
  const [showConfirmModal, setShowConfirmModal] = useState(null); // { title, message, onConfirm, requiresPhrase, phrase }
  const [confirmPhraseInput, setConfirmPhraseInput] = useState('');
  const [showQrStandeeModal, setShowQrStandeeModal] = useState(false);

  // Web Audio Synthesizer for Test Chime
  const playTone = useCallback((toneType = 'urgent', volume = 80) => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const volRatio = (volume / 100) * 0.3;

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (toneType === 'urgent') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(volRatio, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (toneType === 'bell') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
        gain.gain.setValueAtTime(volRatio, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else {
        // Subtle Chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(volRatio, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('Audio playback restricted:', e);
    }
  }, []);

  // Toast Helper
  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  // Fetch Settings & Auxiliary Data from Server
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/settings?auditModule=${auditModuleFilter}&auditSearch=${encodeURIComponent(auditSearch)}`);
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings || {});
        setInitialSettings(JSON.parse(JSON.stringify(data.settings || {})));
        setStaffUsers(data.staffUsers || []);
        setTables(data.tables || []);
        setCategories(data.categories || []);
        setMenuDishes(data.menuDishes || []);
        setAuditLogs(data.auditLogs || []);
        setBackups(data.backupStatus?.backups || []);
        setSystemHealth(data.systemHealth || null);
      } else {
        showToast('error', data.error || 'Failed to load system settings');
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
      showToast('error', 'Network error connecting to settings engine');
    } finally {
      setLoading(false);
    }
  }, [auditModuleFilter, auditSearch, showToast]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/settings?auditModule=${auditModuleFilter}&auditSearch=${encodeURIComponent(auditSearch)}`);
        const data = await res.json();
        if (active && data.success) {
          setSettings(data.settings || {});
          setInitialSettings(JSON.parse(JSON.stringify(data.settings || {})));
          setStaffUsers(data.staffUsers || []);
          setTables(data.tables || []);
          setCategories(data.categories || []);
          setMenuDishes(data.menuDishes || []);
          setAuditLogs(data.auditLogs || []);
          setBackups(data.backupStatus?.backups || []);
          setSystemHealth(data.systemHealth || null);
        }
      } catch (err) {
        console.error('Load settings error:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [auditModuleFilter, auditSearch]);

  // Determine if active section has unsaved edits
  const isDirty = useMemo(() => {
    if (!settings || !initialSettings) return false;
    const currentSec = settings[activeSubTab];
    const initialSec = initialSettings[activeSubTab];
    if (!currentSec || !initialSec) return false;
    return JSON.stringify(currentSec) !== JSON.stringify(initialSec);
  }, [settings, initialSettings, activeSubTab]);

  // Nested setting modifier helper
  const handleUpdateField = (section, path, value) => {
    setSettings((prev) => {
      const updated = { ...prev };
      if (!updated[section]) updated[section] = {};

      const keys = path.split('.');
      let current = updated[section];
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return { ...updated };
    });
  };

  // Save current section to Server
  const handleSaveSection = async (sectionToSave = activeSubTab) => {
    setSaving(true);
    try {
      const payload = {
        action: 'UPDATE_SETTINGS',
        section: sectionToSave,
        data: settings[sectionToSave],
        caller: { name: currentUser.name, role: currentUser.role },
      };

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setSettings(data.settings);
        setInitialSettings(JSON.parse(JSON.stringify(data.settings)));
        showToast('success', data.message || `Saved ${sectionToSave.replace('_', ' ')} settings`);
        // Refresh audit logs
        const auditRes = await fetch(`/api/admin/settings?auditModule=${auditModuleFilter}&auditSearch=${encodeURIComponent(auditSearch)}`);
        const auditJson = await auditRes.json();
        if (auditJson.success) {
          setAuditLogs(auditJson.auditLogs || []);
        }
      } else {
        showToast('error', data.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Save settings error:', err);
      showToast('error', err.message || 'Error executing save request');
    } finally {
      setSaving(false);
    }
  };

  // Reset section back to initial/recommended defaults
  const handleResetSection = (sectionName = activeSubTab) => {
    setShowConfirmModal({
      title: `Reset ${sectionName.replace('_', ' ').toUpperCase()} to Defaults?`,
      message: `Are you sure you want to revert ${sectionName} back to recommended factory settings? Any unsaved changes in this section will be overwritten.`,
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'RESET_SETTINGS',
              section: sectionName,
              confirm: true,
              caller: { name: currentUser.name, role: currentUser.role },
            }),
          });
          const data = await res.json();
          if (data.success) {
            setSettings(data.settings);
            setInitialSettings(JSON.parse(JSON.stringify(data.settings)));
            showToast('success', data.message);
          } else {
            showToast('error', data.error || 'Reset failed');
          }
        } catch (e) {
          showToast('error', e.message);
        }
      },
    });
  };

  // Real Integration Verification Trigger
  const handleTestIntegration = async (integrationName) => {
    setTestingIntegration(integrationName);
    try {
      const config = settings.integrations?.[integrationName] || {};
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_INTEGRATION',
          integrationName,
          config,
          caller: { name: currentUser.name, role: currentUser.role },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
      } else {
        showToast('error', data.message || 'Verification failed');
      }
      if (data.integrations) {
        setSettings((prev) => ({ ...prev, integrations: data.integrations }));
        setInitialSettings((prev) => ({ ...prev, integrations: data.integrations }));
      }
    } catch (e) {
      showToast('error', 'Network failure during integration test');
    } finally {
      setTestingIntegration('');
    }
  };

  // Staff Account Management
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaffForm.fullName || !newStaffForm.email) {
      showToast('error', 'Full name and email are mandatory');
      return;
    }
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_STAFF',
          userPayload: newStaffForm,
          caller: { name: currentUser.name, role: currentUser.role },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        setShowAddStaffModal(false);
        setNewStaffForm({ fullName: '', email: '', phone: '', role: 'WAITER' });
        fetchSettings();
      } else {
        showToast('error', data.error || 'Failed to create staff');
      }
    } catch (e) {
      showToast('error', e.message);
    }
  };

  const handleToggleStaffActive = async (user) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STAFF',
          userId: user.id,
          userPayload: { isActive: !user.isActive },
          caller: { name: currentUser.name, role: currentUser.role },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        fetchSettings();
      } else {
        showToast('error', data.error || 'Failed to update staff status');
      }
    } catch (e) {
      showToast('error', e.message);
    }
  };

  const handleDeleteStaff = (user) => {
    if (user.isProtected || user.role === 'DEVELOPER_ADMIN') {
      showToast('error', 'Developer Admin accounts are permanently protected and cannot be deleted.');
      return;
    }
    setShowConfirmModal({
      title: `Delete Staff Account?`,
      message: `Are you sure you want to permanently delete the staff account for ${user.fullName} (${user.email})? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'DELETE_STAFF',
              userId: user.id,
              caller: { name: currentUser.name, role: currentUser.role },
            }),
          });
          const data = await res.json();
          if (data.success) {
            showToast('success', data.message);
            fetchSettings();
          } else {
            showToast('error', data.error || 'Failed to delete staff account');
          }
        } catch (e) {
          showToast('error', e.message);
        }
      },
    });
  };

  // Quick Dish Availability Toggle (Menu Settings)
  const handleToggleDishAvailability = async (dishId, currentAvailable) => {
    try {
      // Optimistic update
      setMenuDishes((prev) =>
        prev.map((d) => (d.id === dishId ? { ...d, available: !currentAvailable, status: !currentAvailable ? 'AVAILABLE' : 'SOLD_OUT' } : d))
      );
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_AVAILABILITY',
          dishId,
          available: !currentAvailable,
          caller: { name: currentUser.name, role: currentUser.role },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Item status updated to ${!currentAvailable ? 'AVAILABLE' : 'SOLD OUT'}`);
      } else {
        fetchSettings();
        showToast('error', data.error || 'Failed to update dish');
      }
    } catch (e) {
      fetchSettings();
      showToast('error', 'Error updating menu item');
    }
  };

  // Snapshot Backup Creation
  const handleCreateSnapshot = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_BACKUP',
          caller: { name: currentUser.name, role: currentUser.role },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        setBackups(data.backups || []);
      } else {
        showToast('error', data.error || 'Backup creation failed');
      }
    } catch (e) {
      showToast('error', e.message);
    }
  };

  // Restore Snapshot
  const handleRestoreSnapshot = (filename) => {
    setShowConfirmModal({
      title: `Restore Snapshot: ${filename}?`,
      message: `WARNING: Restoring this snapshot will replace current orders, bills, and settings with the exact state from this backup. All active sessions will refresh.`,
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'RESTORE_BACKUP',
              filename,
              confirmRestore: true,
              caller: { name: currentUser.name, role: currentUser.role },
            }),
          });
          const data = await res.json();
          if (data.success) {
            showToast('success', data.message);
            fetchSettings();
          } else {
            showToast('error', data.error || 'Restore failed');
          }
        } catch (e) {
          showToast('error', e.message);
        }
      },
    });
  };

  // Terminate All Other Sessions
  const handleTerminateOtherSessions = () => {
    setShowConfirmModal({
      title: 'Terminate All Other Active Sessions?',
      message: 'This will log out all other POS terminals, tablet apps, and staff accounts immediately.',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'TERMINATE_SESSIONS',
              caller: { name: currentUser.name, role: currentUser.role },
            }),
          });
          const data = await res.json();
          if (data.success) {
            showToast('success', data.message);
            fetchSettings();
          } else {
            showToast('error', data.error || 'Failed to terminate sessions');
          }
        } catch (e) {
          showToast('error', e.message);
        }
      },
    });
  };

  // Developer Factory Master Reset
  const handleDeveloperReset = () => {
    setShowConfirmModal({
      title: 'Master System Settings Reset',
      message: 'Restricted Technical Action: This will reset all 18 configuration modules back to original Sri Gokulam factory state. Enter confirmation phrase below:',
      requiresPhrase: true,
      phrase: 'RESET-SRI-GOKULAM-2026',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'DEVELOPER_RESET_DB',
              confirmPhrase: confirmPhraseInput,
              caller: { name: currentUser.name, role: currentUser.role },
            }),
          });
          const data = await res.json();
          if (data.success) {
            showToast('success', data.message);
            fetchSettings();
          } else {
            showToast('error', data.error || 'Reset failed');
          }
        } catch (e) {
          showToast('error', e.message);
        }
      },
    });
  };

  // Print Standee Tent Card
  const handlePrintStandee = (tableNum) => {
    const tableObj = tables.find((t) => t.tableNumber === tableNum) || { tableNumber: tableNum, section: 'GROUND_FLOOR', capacity: 4 };
    const html = generateStandeeCardHtml({
      tableNumber: tableObj.tableNumber,
      section: tableObj.section,
      capacity: tableObj.capacity,
      baseUrl: typeof window !== 'undefined' ? window.location.origin : 'https://srigokulam.com',
    });

    const printWin = window.open('', '_blank', 'width=700,height=900');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 350);
    }
  };

  // SVG QR Download
  const handleDownloadQrSvg = (tableNum) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://srigokulam.com';
    const qrUrl = `${origin}/?table=${tableNum}`;
    const svgString = generateQrSvg(qrUrl, 400);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sri_gokulam_table_${tableNum}_qr.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', `Downloaded Table #${tableNum} vector QR code`);
  };

  // Filtered Lists
  const filteredStaff = useMemo(() => {
    return staffUsers.filter((u) => {
      const matchRole = staffRoleFilter === 'ALL' || u.role === staffRoleFilter;
      const matchSearch =
        !staffSearch ||
        (u.fullName || '').toLowerCase().includes(staffSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(staffSearch.toLowerCase()) ||
        (u.phone || '').includes(staffSearch);
      return matchRole && matchSearch;
    });
  }, [staffUsers, staffRoleFilter, staffSearch]);

  const filteredDishes = useMemo(() => {
    return menuDishes.filter((d) => {
      const matchStation = dishStationFilter === 'ALL' || d.station === dishStationFilter;
      const matchSearch =
        !dishSearch ||
        (d.title || '').toLowerCase().includes(dishSearch.toLowerCase()) ||
        (d.tamilTitle || '').includes(dishSearch);
      return matchStation && matchSearch;
    });
  }, [menuDishes, dishStationFilter, dishSearch]);

  // Loading skeleton
  if (loading && Object.keys(settings).length === 0) {
    return (
      <div className={styles.settingsContainer}>
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'spin 1.5s linear infinite' }}>⚙️</div>
          <h2 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>Loading Restaurant Configuration...</h2>
          <p>Retrieving database state, staff access, security rules &amp; hardware settings</p>
        </div>
      </div>
    );
  }

  const p = settings.profile || {};
  const g = settings.general || {};
  const ord = settings.orders || {};
  const tq = settings.tables_qr || {};
  const ms = settings.menu_settings || {};
  const bp = settings.billing_payments || {};
  const pk = settings.printers_kot || {};
  const notif = settings.notifications || {};
  const inv = settings.inventory_config || {};
  const loy = settings.loyalty_customer || {};
  const web = settings.website_config || {};
  const integ = settings.integrations || {};
  const sec = settings.security || {};
  const dev = settings.developer || {};
  const perms = settings.roles_permissions || {};

  return (
    <div className={styles.settingsContainer}>
      {/* Toast Notice */}
      {toast && (
        <div className={`${styles.toastNotice} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className={styles.headerBanner}>
        <div className={styles.headerTitleGroup}>
          <div className={styles.headerIcon}>⚙️</div>
          <div>
            <h1 className={styles.headerTitle}>
              Settings &amp; Configuration Suite
              <span className={styles.headerBadge}>Enterprise Engine</span>
            </h1>
            <p className={styles.headerSubtitle}>
              Centralized operational controls for Sri Gokulam Veg Restaurant • Shared DB Synchronized
            </p>
          </div>
        </div>

        <div className={styles.headerMetaActions}>
          <div className={styles.metaPill}>
            <span>👤 Active Role:</span>
            <strong style={{ color: currentUser.role === 'DEVELOPER_ADMIN' ? '#c084fc' : '#38bdf8' }}>
              {currentUser.role}
            </strong>
          </div>
          <div className={styles.metaPill}>
            <span>🕒 Timezone:</span>
            <strong>{g.timezone || 'Asia/Kolkata'}</strong>
          </div>
          <button
            type="button"
            className={`${styles.btnSecondary} ${styles.btnSm}`}
            onClick={fetchSettings}
            title="Reload settings from database"
          >
            🔄 Sync Data
          </button>
        </div>
      </div>

      {/* Main Settings Layout (Sidebar + Content Panes) */}
      <div className={styles.settingsLayout}>
        {/* ─── Left Sub-navigation Bar ─── */}
        <aside className={styles.subnavSidebar}>
          <div className={styles.navCategoryTitle}>Operations &amp; Core</div>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'profile' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('profile')}
          >
            <span className={styles.subnavIcon}>🏛️</span>
            <span>Restaurant Profile</span>
          </button>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'general' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('general')}
          >
            <span className={styles.subnavIcon}>🌐</span>
            <span>General &amp; Regional</span>
          </button>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'orders' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('orders')}
          >
            <span className={styles.subnavIcon}>📋</span>
            <span>Order Rules &amp; SLA</span>
          </button>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'tables_qr' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('tables_qr')}
          >
            <span className={styles.subnavIcon}>🪑</span>
            <span>Tables &amp; QR Standees</span>
          </button>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'menu' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('menu')}
          >
            <span className={styles.subnavIcon}>🍽️</span>
            <span>Menu &amp; Availability</span>
          </button>

          <div className={styles.navCategoryTitle}>Access &amp; Security</div>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'users' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('users')}
          >
            <span className={styles.subnavIcon}>👥</span>
            <span>Staff Accounts</span>
          </button>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'permissions' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('permissions')}
          >
            <span className={styles.subnavIcon}>🛡️</span>
            <span>Role Permissions (RBAC)</span>
          </button>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'security' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('security')}
          >
            <span className={styles.subnavIcon}>🔒</span>
            <span>Security &amp; Sessions</span>
          </button>

          <div className={styles.navCategoryTitle}>Finance &amp; Hardware</div>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'billing' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('billing')}
          >
            <span className={styles.subnavIcon}>💳</span>
            <span>Billing, Taxes &amp; Invoices</span>
          </button>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'bill_slip' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('bill_slip')}
          >
            <span className={styles.subnavIcon}>🧾</span>
            <span>Bill Slip Format Designer</span>
          </button>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'printers' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('printers')}
          >
            <span className={styles.subnavIcon}>🖨️</span>
            <span>Printers &amp; KOT Kitchen</span>
          </button>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'notifications' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('notifications')}
          >
            <span className={styles.subnavIcon}>🔔</span>
            <span>Alerts &amp; Audio Chimes</span>
          </button>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'inventory' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('inventory')}
          >
            <span className={styles.subnavIcon}>📦</span>
            <span>Inventory &amp; Wastage</span>
          </button>

          <div className={styles.navCategoryTitle}>Growth &amp; Platform</div>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'loyalty' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('loyalty')}
          >
            <span className={styles.subnavIcon}>🎁</span>
            <span>Loyalty, VIP &amp; Privacy</span>
          </button>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'website' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('website')}
          >
            <span className={styles.subnavIcon}>🖥️</span>
            <span>Customer Website</span>
          </button>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'integrations' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('integrations')}
          >
            <span className={styles.subnavIcon}>🔌</span>
            <span>API Integrations</span>
          </button>
          <button
            type="button"
            className={`${styles.subnavItem} ${activeSubTab === 'audit_backup' ? styles.subnavActive : ''}`}
            onClick={() => setActiveSubTab('audit_backup')}
          >
            <span className={styles.subnavIcon}>💾</span>
            <span>Audit Logs &amp; Backups</span>
          </button>

          {currentUser.role === 'DEVELOPER_ADMIN' && (
            <>
              <div className={styles.navCategoryTitle} style={{ color: '#c084fc' }}>Technical Core</div>
              <button
                type="button"
                className={`${styles.subnavItem} ${activeSubTab === 'developer' ? styles.subnavActive : ''}`}
                onClick={() => setActiveSubTab('developer')}
                style={{ color: '#c084fc' }}
              >
                <span className={styles.subnavIcon}>⚡</span>
                <span>Developer Console</span>
              </button>
            </>
          )}
        </aside>

        {/* ─── Right Content Panes ─── */}
        <div className={styles.contentPane}>
          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 1: RESTAURANT PROFILE
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'profile' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>🏛️</span>
                  <div>
                    <h2 className={styles.cardTitle}>Restaurant Business Profile</h2>
                    <p className={styles.cardSubtitle}>
                      Official legal identity, branding assets, contact information, and business hours
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className={styles.btnSecondary} onClick={() => handleResetSection('profile')}>
                    Revert Defaults
                  </button>
                  <button type="button" className={styles.btnPrimary} onClick={() => handleSaveSection('profile')} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>

              <div className={styles.formGrid2}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Restaurant Name (English) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    value={p.restaurantName || ''}
                    onChange={(e) => handleUpdateField('profile', 'restaurantName', e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Tamil Heritage Title (தமிழ் பெயர்) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    value={p.restaurantNameTamil || ''}
                    onChange={(e) => handleUpdateField('profile', 'restaurantNameTamil', e.target.value)}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Culinary Heritage Tagline</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={p.tagline || ''}
                    onChange={(e) => handleUpdateField('profile', 'tagline', e.target.value)}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Restaurant Logo URL</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      className={styles.input}
                      value={p.logoUrl || ''}
                      onChange={(e) => handleUpdateField('profile', 'logoUrl', e.target.value)}
                    />
                    {p.logoUrl && (
                      <img
                        src={p.logoUrl}
                        alt="Logo Preview"
                        style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid #3f3f46' }}
                      />
                    )}
                  </div>
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Physical Address (Printed on Invoices &amp; KOT)</label>
                  <textarea
                    className={styles.textarea}
                    rows={2}
                    value={p.address || ''}
                    onChange={(e) => handleUpdateField('profile', 'address', e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>City</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={p.city || ''}
                    onChange={(e) => handleUpdateField('profile', 'city', e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Pincode</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={p.pincode || ''}
                    onChange={(e) => handleUpdateField('profile', 'pincode', e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Primary Order Hotline Phone</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={p.primaryPhone || ''}
                    onChange={(e) => handleUpdateField('profile', 'primaryPhone', e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Customer WhatsApp Support Number</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={p.whatsappPhone || ''}
                    onChange={(e) => handleUpdateField('profile', 'whatsappPhone', e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Business Email Address</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={p.email || ''}
                    onChange={(e) => handleUpdateField('profile', 'email', e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Support / Inquiries Email</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={p.supportEmail || ''}
                    onChange={(e) => handleUpdateField('profile', 'supportEmail', e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>GSTIN Registration No (15 Digits)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={p.gstin || ''}
                    maxLength={15}
                    onChange={(e) => handleUpdateField('profile', 'gstin', e.target.value.toUpperCase())}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>FSSAI Food Safety Licence (14 Digits)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={p.fssai || ''}
                    maxLength={14}
                    onChange={(e) => handleUpdateField('profile', 'fssai', e.target.value)}
                  />
                </div>
              </div>

              {/* Operating Hours Grid */}
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle, #27272a)', paddingTop: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 1rem' }}>
                  ⏰ Daily Sattvic Dining Slots
                </h3>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>🌅 Morning Breakfast (Tiffin)</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={p.openingHours?.breakfast || ''}
                      onChange={(e) => handleUpdateField('profile', 'openingHours.breakfast', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>🍱 Afternoon Raja Meals</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={p.openingHours?.lunch || ''}
                      onChange={(e) => handleUpdateField('profile', 'openingHours.lunch', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>☕ Evening Snacks &amp; Filter Coffee</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={p.openingHours?.snacks || ''}
                      onChange={(e) => handleUpdateField('profile', 'openingHours.snacks', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>🌙 Night Dinner (Dosa &amp; Tiffin)</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={p.openingHours?.dinner || ''}
                      onChange={(e) => handleUpdateField('profile', 'openingHours.dinner', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 2: GENERAL SETTINGS
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'general' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>🌐</span>
                  <div>
                    <h2 className={styles.cardTitle}>General &amp; Regional Configuration</h2>
                    <p className={styles.cardSubtitle}>
                      Currency format, standard timezone, date-time formats, and default system language
                    </p>
                  </div>
                </div>
                <button type="button" className={styles.btnPrimary} onClick={() => handleSaveSection('general')} disabled={saving}>
                  {saving ? 'Saving...' : 'Save General Settings'}
                </button>
              </div>

              <div className={styles.formGrid2}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Currency Code</label>
                  <select
                    className={styles.select}
                    value={g.currency || 'INR'}
                    onChange={(e) => {
                      handleUpdateField('general', 'currency', e.target.value);
                      handleUpdateField('general', 'currencySymbol', e.target.value === 'INR' ? '₹' : '$');
                    }}
                  >
                    <option value="INR">Indian Rupee (INR ₹)</option>
                    <option value="USD">US Dollar (USD $)</option>
                    <option value="SGD">Singapore Dollar (SGD S$)</option>
                    <option value="MYR">Malaysian Ringgit (MYR RM)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Timezone</label>
                  <select
                    className={styles.select}
                    value={g.timezone || 'Asia/Kolkata'}
                    onChange={(e) => handleUpdateField('general', 'timezone', e.target.value)}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                    <option value="UTC">UTC (+00:00)</option>
                    <option value="Asia/Singapore">Asia/Singapore (+08:00)</option>
                    <option value="Asia/Dubai">Asia/Dubai (+04:00)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Date Format</label>
                  <select
                    className={styles.select}
                    value={g.dateFormat || 'DD/MM/YYYY'}
                    onChange={(e) => handleUpdateField('general', 'dateFormat', e.target.value)}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard: 18/10/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Standard: 2026-10-18)</option>
                    <option value="DD MMM YYYY">DD MMM YYYY (18 Oct 2026)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Time Display Format</label>
                  <select
                    className={styles.select}
                    value={g.timeFormat || '12_HOUR'}
                    onChange={(e) => handleUpdateField('general', 'timeFormat', e.target.value)}
                  >
                    <option value="12_HOUR">12-Hour AM/PM (e.g., 01:30 PM)</option>
                    <option value="24_HOUR">24-Hour Military (e.g., 13:30)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Default Display Language</label>
                  <select
                    className={styles.select}
                    value={g.defaultLanguage || 'ta_en'}
                    onChange={(e) => handleUpdateField('general', 'defaultLanguage', e.target.value)}
                  >
                    <option value="ta_en">Bilingual: Tamil + English (தமிழ் &amp; English)</option>
                    <option value="en">English Primary</option>
                    <option value="ta">Tamil Pure (தமிழ் மட்டும்)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>POS &amp; KDS Live Auto-Refresh (Seconds)</label>
                  <select
                    className={styles.select}
                    value={g.autoRefreshIntervalSeconds || 15}
                    onChange={(e) => handleUpdateField('general', 'autoRefreshIntervalSeconds', parseInt(e.target.value, 10))}
                  >
                    <option value={5}>Every 5 Seconds (Ultra-Fast Touch POS)</option>
                    <option value={15}>Every 15 Seconds (Balanced Recommended)</option>
                    <option value={30}>Every 30 Seconds</option>
                  </select>
                </div>
              </div>

              <div className={styles.switchGroup}>
                <div className={styles.switchInfo}>
                  <div className={styles.switchTitle}>Tax Inclusive Menu Pricing</div>
                  <div className={styles.switchDesc}>
                    When active, prices displayed on customer QR menu and POS already include 5% GST. When off, GST is added at checkout.
                  </div>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={!!g.taxInclusivePricing}
                    onChange={(e) => handleUpdateField('general', 'taxInclusivePricing', e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 3: USER & ROLE MANAGEMENT
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'users' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>👥</span>
                  <div>
                    <h2 className={styles.cardTitle}>Staff Account &amp; Access Directory</h2>
                    <p className={styles.cardSubtitle}>
                      Manage personnel logins, active statuses, roles (Super Admin, Manager, Cashier, Kitchen, Waiter, Inventory)
                    </p>
                  </div>
                </div>
                <button type="button" className={styles.btnPrimary} onClick={() => setShowAddStaffModal(true)}>
                  ➕ Create New Staff
                </button>
              </div>

              {/* Role Hierarchy & Developer Protection Explainer Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(217, 119, 6, 0.08))',
                  border: '1px solid rgba(124, 58, 237, 0.35)',
                  borderRadius: 10,
                  padding: '1rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: '1.6rem' }}>🛡️</span>
                <div style={{ fontSize: '0.82rem', lineHeight: 1.55 }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.3rem', letterSpacing: '0.02em' }}>
                    Strict Role Hierarchy &amp; Permanent Developer Admin Protection
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    • <strong style={{ color: '#c084fc' }}>Developer Admin (info.ajnanjiltechsolutions@gmail.com, info.ajtechsolutions@gmail.com):</strong> The two default developer accounts are permanently protected. Nobody can delete, modify, demote, or remove their privileges. Only Developer Admins can create Owner Admin accounts.<br />
                    • <strong style={{ color: '#f87171' }}>Owner Admin (Super Admin):</strong> Can create, manage, and remove other Admin accounts, but cannot modify, delete, or change privileges of Developer Admins.<br />
                    • <strong style={{ color: '#38bdf8' }}>Admin (Manager / Cashier / Staff):</strong> Can access the admin panel strictly according to their assigned permissions.
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 Search staff by name, email, phone..."
                  className={styles.input}
                  style={{ maxWidth: 320 }}
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                />
                <select
                  className={styles.select}
                  style={{ maxWidth: 220 }}
                  value={staffRoleFilter}
                  onChange={(e) => setStaffRoleFilter(e.target.value)}
                >
                  <option value="ALL">All Roles ({staffUsers.length})</option>
                  <option value="DEVELOPER_ADMIN">Developer Admin</option>
                  <option value="SUPER_ADMIN">Super Admin (Owner)</option>
                  <option value="STORE_MANAGER">Store Manager</option>
                  <option value="CASHIER">POS Cashier</option>
                  <option value="WAITER">Floor Captain / Waiter</option>
                  <option value="KITCHEN">Kitchen Staff</option>
                  <option value="INVENTORY_STAFF">Inventory Storekeeper</option>
                </select>
              </div>

              {/* Staff Table */}
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Assigned Role</th>
                      <th>Contact Details</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((u) => {
                      const roleConfig = perms[u.role] || {};
                      const isDevProtected = u.isProtected || u.role === 'DEVELOPER_ADMIN';
                      return (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.fullName}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {u.id}</div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  background: `${roleConfig.badgeColor || '#2563eb'}22`,
                                  color: roleConfig.badgeColor || '#38bdf8',
                                  border: `1px solid ${roleConfig.badgeColor || '#2563eb'}44`,
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: 6,
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                }}
                              >
                                {roleConfig.label || u.role}
                              </span>
                              {isDevProtected && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    color: '#c084fc',
                                    fontWeight: 700,
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  🔒 ROOT PROTECTED
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div>📧 {u.email}</div>
                            {u.phone && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>📞 {u.phone}</div>}
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${u.isActive ? styles.statusVerified : styles.statusFailed}`}>
                              {u.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                            </span>
                          </td>
                          <td>
                            {isDevProtected ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  fontSize: '0.72rem',
                                  color: '#a855f7',
                                  background: 'rgba(168, 85, 247, 0.1)',
                                  border: '1px solid rgba(168, 85, 247, 0.3)',
                                  padding: '0.3rem 0.6rem',
                                  borderRadius: 4,
                                  fontWeight: 700,
                                }}
                                title="Default Developer Admin accounts are permanently protected against modification, demotion, deactivation, or deletion."
                              >
                                🛡️ PERMANENTLY PROTECTED
                              </span>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button
                                  type="button"
                                  className={`${styles.btnSecondary} ${styles.btnSm}`}
                                  onClick={() => handleToggleStaffActive(u)}
                                >
                                  {u.isActive ? 'Deactivate' : 'Reactivate'}
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.btnDanger} ${styles.btnSm}`}
                                  onClick={() => handleDeleteStaff(u)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 4: ROLE PERMISSIONS MATRIX (RBAC)
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'permissions' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>🛡️</span>
                  <div>
                    <h2 className={styles.cardTitle}>Role-Based Access Control (RBAC) Permissions</h2>
                    <p className={styles.cardSubtitle}>
                      Control who can access orders, POS, KOT, billing, CRM, inventory, reports, and settings suite
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const res = await fetch('/api/admin/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'UPDATE_ROLE_PERMISSIONS',
                          permissions: perms,
                          caller: { name: currentUser.name, role: currentUser.role },
                        }),
                      });
                      const d = await res.json();
                      if (d.success) showToast('success', d.message);
                      else showToast('error', d.error);
                    } catch (e) {
                      showToast('error', e.message);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving || (currentUser.role !== 'DEVELOPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN')}
                >
                  {saving ? 'Saving...' : 'Save Permissions Matrix'}
                </button>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Module / Permission</th>
                      {Object.keys(perms).map((r) => (
                        <th key={r} style={{ textAlign: 'center' }}>
                          <div style={{ color: perms[r].badgeColor || '#fff', fontSize: '0.8rem' }}>{perms[r].label || r}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'canViewDashboard', label: '📊 View Overview Dashboard' },
                      { key: 'canManageOrders', label: '📋 View & Accept Orders' },
                      { key: 'canPosBilling', label: '🧾 POS High-Speed Billing' },
                      { key: 'canKds', label: '🍳 Kitchen KDS Station' },
                      { key: 'canFloorPlan', label: '🗺️ Live Table Floor Plan' },
                      { key: 'canMenuCrud', label: '🍽️ Manage Menu & Availability' },
                      { key: 'canInventory', label: '📦 Inventory & Recipe BOM' },
                      { key: 'canCrm', label: '👥 Customer CRM & Loyalty' },
                      { key: 'canReports', label: '📈 Financial & Sales Reports' },
                      { key: 'canSettings', label: '⚙️ Access Settings Suite' },
                      { key: 'canDevSettings', label: '⚡ Developer Technical Controls' },
                      { key: 'canDiscounts', label: '🏷️ Authorize Bill Discounts' },
                      { key: 'canRefunds', label: '💸 Issue Refunds & Voids' },
                      { key: 'canVoidKot', label: '🚫 Void Kitchen Prep Items' },
                    ].map((perm) => (
                      <tr key={perm.key}>
                        <td>
                          <strong>{perm.label}</strong>
                        </td>
                        {Object.keys(perms).map((r) => (
                          <td key={r} style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              style={{ width: 18, height: 18, cursor: 'pointer' }}
                              checked={!!perms[r][perm.key]}
                              disabled={r === 'DEVELOPER_ADMIN' && perm.key === 'canDevSettings'}
                              onChange={(e) => {
                                handleUpdateField('roles_permissions', `${r}.${perm.key}`, e.target.checked);
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 5: ORDER SETTINGS & SLA WORKFLOW
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'orders' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>📋</span>
                  <div>
                    <h2 className={styles.cardTitle}>Order Policies, Numbering &amp; Prep Workflow</h2>
                    <p className={styles.cardSubtitle}>
                      Configure order types, OTP verification rules, cancellation policies, and kitchen preparation stages
                    </p>
                  </div>
                </div>
                <button type="button" className={styles.btnPrimary} onClick={() => handleSaveSection('orders')} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Order Settings'}
                </button>
              </div>

              {/* Order Types */}
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.75rem' }}>
                  Enabled Order Types
                </h3>
                <div className={styles.formGrid}>
                  <label className={styles.switchGroup}>
                    <div className={styles.switchInfo}>
                      <span className={styles.switchTitle}>🍽️ Dine-In Table Service</span>
                      <span className={styles.switchDesc}>Traditional plantain leaf &amp; hall service</span>
                    </div>
                    <input
                      type="checkbox"
                      style={{ width: 20, height: 20 }}
                      checked={!!ord.enabledOrderTypes?.dineIn}
                      onChange={(e) => handleUpdateField('orders', 'enabledOrderTypes.dineIn', e.target.checked)}
                    />
                  </label>

                  <label className={styles.switchGroup}>
                    <div className={styles.switchInfo}>
                      <span className={styles.switchTitle}>🛍️ Takeaway / Parcel Counter</span>
                      <span className={styles.switchDesc}>Packed with banana leaf wrap &amp; chutney cups</span>
                    </div>
                    <input
                      type="checkbox"
                      style={{ width: 20, height: 20 }}
                      checked={!!ord.enabledOrderTypes?.takeaway}
                      onChange={(e) => handleUpdateField('orders', 'enabledOrderTypes.takeaway', e.target.checked)}
                    />
                  </label>

                  <label className={styles.switchGroup}>
                    <div className={styles.switchInfo}>
                      <span className={styles.switchTitle}>📲 QR Code Instant Ordering</span>
                      <span className={styles.switchDesc}>Diners scan table QR standee to self-order</span>
                    </div>
                    <input
                      type="checkbox"
                      style={{ width: 20, height: 20 }}
                      checked={!!ord.enabledOrderTypes?.qrDineIn}
                      onChange={(e) => handleUpdateField('orders', 'enabledOrderTypes.qrDineIn', e.target.checked)}
                    />
                  </label>
                </div>
              </div>

              {/* Numbering & OTP */}
              <div className={styles.formGrid2} style={{ marginTop: '0.75rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Bill &amp; Order Prefix</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={ord.orderPrefix || 'SGR-'}
                    onChange={(e) => handleUpdateField('orders', 'orderPrefix', e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Kitchen KOT Prefix</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={ord.kotPrefix || 'KOT-'}
                    onChange={(e) => handleUpdateField('orders', 'kotPrefix', e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Customer OTP Expiration (Minutes)</label>
                  <select
                    className={styles.select}
                    value={ord.otpExpiryMinutes || 5}
                    onChange={(e) => handleUpdateField('orders', 'otpExpiryMinutes', parseInt(e.target.value, 10))}
                  >
                    <option value={3}>3 Minutes (High-turnover rush)</option>
                    <option value={5}>5 Minutes (Standard)</option>
                    <option value={10}>10 Minutes (Relaxed dining)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>OTP Length</label>
                  <select
                    className={styles.select}
                    value={ord.otpLength || 4}
                    onChange={(e) => handleUpdateField('orders', 'otpLength', parseInt(e.target.value, 10))}
                  >
                    <option value={4}>4 Digits (e.g. 7087 - Fast for Waiter Verification)</option>
                    <option value={6}>6 Digits (e.g. 482910 - High Security)</option>
                  </select>
                </div>
              </div>

              {/* Cancellation Rules */}
              <div style={{ borderTop: '1px solid var(--border-subtle, #27272a)', paddingTop: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 1rem' }}>
                  🚫 Order Cancellation &amp; Void Rules
                </h3>
                <div className={styles.formGrid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Diner Self-Cancellation Window</label>
                    <select
                      className={styles.select}
                      value={ord.cancellationTimeLimitMinutes || 2}
                      onChange={(e) => handleUpdateField('orders', 'cancellationTimeLimitMinutes', parseInt(e.target.value, 10))}
                    >
                      <option value={1}>1 Minute After Placing</option>
                      <option value={2}>2 Minutes (Standard)</option>
                      <option value={5}>5 Minutes</option>
                      <option value={0}>Disabled (Only Floor Captain Can Cancel)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Manager Authorization PIN for Voids</label>
                    <input
                      type="password"
                      placeholder="••••"
                      className={styles.input}
                      value={ord.managerPin || ''}
                      onChange={(e) => handleUpdateField('orders', 'managerPin', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Station SLA */}
              <div style={{ borderTop: '1px solid var(--border-subtle, #27272a)', paddingTop: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 1rem' }}>
                  ⏱️ Kitchen Station Preparation Target SLA (KDS Urgent Alert)
                </h3>
                <div className={styles.formGrid3}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>🥞 Tiffin &amp; Dosa Target (Mins)</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={ord.slaTiffinMinutes || 10}
                      onChange={(e) => handleUpdateField('orders', 'slaTiffinMinutes', parseInt(e.target.value, 10))}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>🍱 Raja Meals &amp; Gravies (Mins)</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={ord.slaMealsMinutes || 15}
                      onChange={(e) => handleUpdateField('orders', 'slaMealsMinutes', parseInt(e.target.value, 10))}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>☕ Degree Coffee &amp; Drinks (Mins)</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={ord.slaBeveragesMinutes || 5}
                      onChange={(e) => handleUpdateField('orders', 'slaBeveragesMinutes', parseInt(e.target.value, 10))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 6: TABLE & QR SETTINGS
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'tables_qr' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>🪑</span>
                  <div>
                    <h2 className={styles.cardTitle}>Tables, QR Standees &amp; Session Engine</h2>
                    <p className={styles.cardSubtitle}>
                      Manage dining tables, generate &amp; download authentic QR standee tent cards, configure auto-close session rules
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className={styles.btnPrimary} onClick={() => handleSaveSection('tables_qr')} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Table Rules'}
                  </button>
                </div>
              </div>

              {/* Session Rules */}
              <div className={styles.formGrid2}>
                <div className={styles.switchGroup}>
                  <div className={styles.switchInfo}>
                    <div className={styles.switchTitle}>Auto-Close Table Session on Bill Payment</div>
                    <div className={styles.switchDesc}>
                      Automatically frees the table after cashier prints settlement receipt
                    </div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!tq.autoCloseSessionOnBillPaid}
                      onChange={(e) => handleUpdateField('tables_qr', 'autoCloseSessionOnBillPaid', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.switchGroup}>
                  <div className={styles.switchInfo}>
                    <div className={styles.switchTitle}>Allow Table Merging on Floor</div>
                    <div className={styles.switchDesc}>
                      Enables captains to combine tables for large family dining parties
                    </div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!tq.allowTableMerge}
                      onChange={(e) => handleUpdateField('tables_qr', 'allowTableMerge', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Max Session Duration Alert (Minutes)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={tq.sessionAlertThresholdMinutes || 90}
                    onChange={(e) => handleUpdateField('tables_qr', 'sessionAlertThresholdMinutes', parseInt(e.target.value, 10))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Auto-Close Session Delay (Minutes)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={tq.autoCloseDelayMinutes || 5}
                    onChange={(e) => handleUpdateField('tables_qr', 'autoCloseDelayMinutes', parseInt(e.target.value, 10))}
                  />
                </div>
              </div>

              {/* Live QR Standee Generator Section */}
              <div style={{ borderTop: '1px solid var(--border-subtle, #27272a)', paddingTop: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 1rem' }}>
                  📱 Unique Table QR Code Generator &amp; Standee Card Studio
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '1.5rem', alignItems: 'center' }}>
                  {/* Standee Preview */}
                  <div className={styles.qrPreviewBox}>
                    <div className={styles.qrStandeeHeader}>SRI GOKULAM</div>
                    <div className={styles.qrStandeeSub}>AUTHENTIC VEG RESTAURANT</div>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: generateQrSvg(
                          `${typeof window !== 'undefined' ? window.location.origin : 'https://srigokulam.com'}/?table=${qrSelectedTable}`,
                          200
                        ),
                      }}
                    />
                    <div className={styles.qrTableBadge}>TABLE #{qrSelectedTable}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                      Scan camera to order online
                    </div>
                  </div>

                  {/* Actions & Table Picker */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Select Table to Generate QR &amp; Standee Card</label>
                      <select
                        className={styles.select}
                        value={qrSelectedTable}
                        onChange={(e) => setQrSelectedTable(e.target.value)}
                      >
                        {tables.map((t) => (
                          <option key={t.id} value={t.tableNumber}>
                            Table #{t.tableNumber} - {t.section} (Capacity: {t.capacity} pax)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={styles.btnPrimary}
                        onClick={() => handlePrintStandee(qrSelectedTable)}
                      >
                        🖨️ Print 4&quot;x6&quot; Tent Card Standee
                      </button>
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={() => handleDownloadQrSvg(qrSelectedTable)}
                      >
                        📥 Download Vector SVG QR
                      </button>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      💡 <strong>Standee Card Tip:</strong> TVSE thermal slip or glossy 4x6 acrylic card can be placed directly on brass dining tables. When scanned by guests, it automatically locks the active dining tab to Table #{qrSelectedTable}.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 7: MENU SETTINGS & AVAILABILITY
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'menu' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>🍽️</span>
                  <div>
                    <h2 className={styles.cardTitle}>Menu Configuration &amp; Real-Time Availability</h2>
                    <p className={styles.cardSubtitle}>
                      Manage categories, kitchen station assignments, pricing, GST slabs, and instant sold-out statuses
                    </p>
                  </div>
                </div>
                <button type="button" className={styles.btnPrimary} onClick={() => handleSaveSection('menu_settings')} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Menu Preferences'}
                </button>
              </div>

              {/* Menu Preferences */}
              <div className={styles.formGrid2}>
                <div className={styles.switchGroup}>
                  <div className={styles.switchInfo}>
                    <div className={styles.switchTitle}>Auto Mark Sold Out on Zero Stock</div>
                    <div className={styles.switchDesc}>
                      Deducts Recipe BOM ingredients; auto 86&apos;s items when batter/rice/ghee depletes
                    </div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!ms.autoMarkSoldOutOnZeroInventory}
                      onChange={(e) => handleUpdateField('menu_settings', 'autoMarkSoldOutOnZeroInventory', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.switchGroup}>
                  <div className={styles.switchInfo}>
                    <div className={styles.switchTitle}>Display Traditional Tamil Dish Titles</div>
                    <div className={styles.switchDesc}>
                      Shows &ldquo;நெய் பொடி ரோஸ்ட்&rdquo;, &ldquo;இளநீர் பாயாசம்&rdquo; alongside English titles
                    </div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!ms.displayTamilLabels}
                      onChange={(e) => handleUpdateField('menu_settings', 'displayTamilLabels', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>

              {/* Real-time Dish Availability Controller */}
              <div style={{ borderTop: '1px solid var(--border-subtle, #27272a)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
                    ⚡ Instant Item Availability (1-Click Sold Out / Available)
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="🔍 Search delicacy..."
                      className={styles.input}
                      style={{ maxWidth: 220 }}
                      value={dishSearch}
                      onChange={(e) => setDishSearch(e.target.value)}
                    />
                    <select
                      className={styles.select}
                      style={{ maxWidth: 160 }}
                      value={dishStationFilter}
                      onChange={(e) => setDishStationFilter(e.target.value)}
                    >
                      <option value="ALL">All Stations</option>
                      <option value="TIFFIN">Tiffin</option>
                      <option value="DOSA">Dosa</option>
                      <option value="MEALS">Meals</option>
                      <option value="BEVERAGES">Beverages</option>
                    </select>
                  </div>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Delicacy</th>
                        <th>Category &amp; Station</th>
                        <th>Price (₹)</th>
                        <th>Status</th>
                        <th>1-Click Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDishes.map((dish) => {
                        const isAvail = dish.available !== false && dish.status !== 'SOLD_OUT';
                        return (
                          <tr key={dish.id}>
                            <td>
                              <strong>{dish.title}</strong>
                              {dish.tamilTitle && (
                                <div style={{ fontSize: '0.78rem', color: '#f59e0b' }}>{dish.tamilTitle}</div>
                              )}
                            </td>
                            <td>
                              <div>{dish.category}</div>
                              <span style={{ fontSize: '0.72rem', background: '#27272a', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                                {dish.station || 'TIFFIN'}
                              </span>
                            </td>
                            <td>
                              <strong>₹{dish.price}</strong>
                            </td>
                            <td>
                              <span className={`${styles.statusBadge} ${isAvail ? styles.statusVerified : styles.statusFailed}`}>
                                {isAvail ? 'AVAILABLE' : 'SOLD OUT'}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`${isAvail ? styles.btnDanger : styles.btnSuccess} ${styles.btnSm}`}
                                onClick={() => handleToggleDishAvailability(dish.id, isAvail)}
                              >
                                {isAvail ? 'Mark as Sold Out' : 'Restore Available'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 8: BILLING, TAXES & INVOICES
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'billing' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>💳</span>
                  <div>
                    <h2 className={styles.cardTitle}>Billing, GST Rates, Service Charges &amp; Invoices</h2>
                    <p className={styles.cardSubtitle}>
                      Configure GST slabs, service charges, max discounts without PIN, invoice layout, and payment options
                    </p>
                  </div>
                </div>
                <button type="button" className={styles.btnPrimary} onClick={() => handleSaveSection('billing_payments')} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Billing Settings'}
                </button>
              </div>

              {/* GST Configuration */}
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.75rem' }}>
                  GST Tax Configuration (Restaurant Service)
                </h3>
                <div className={styles.formGrid3}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>CGST Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className={styles.input}
                      value={bp.taxRateCgst ?? 2.5}
                      onChange={(e) => handleUpdateField('billing_payments', 'taxRateCgst', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>SGST Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className={styles.input}
                      value={bp.taxRateSgst ?? 2.5}
                      onChange={(e) => handleUpdateField('billing_payments', 'taxRateSgst', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Total GST Rate</label>
                    <input
                      type="text"
                      className={styles.input}
                      readOnly
                      value={`${((bp.taxRateCgst || 2.5) + (bp.taxRateSgst || 2.5)).toFixed(1)}%`}
                      style={{ background: '#27272a', fontWeight: 800, color: '#38bdf8' }}
                    />
                  </div>
                </div>
              </div>

              {/* Service Charge & Discounts */}
              <div style={{ borderTop: '1px solid var(--border-subtle, #27272a)', paddingTop: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.75rem' }}>
                  Service Charge &amp; Cashier Discount Policies
                </h3>
                <div className={styles.formGrid2}>
                  <div className={styles.switchGroup}>
                    <div className={styles.switchInfo}>
                      <div className={styles.switchTitle}>Enable Service Charge</div>
                      <div className={styles.switchDesc}>Apply optional dining service charge on restaurant bills</div>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={!!bp.serviceChargeEnabled}
                        onChange={(e) => handleUpdateField('billing_payments', 'serviceChargeEnabled', e.target.checked)}
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Service Charge (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      className={styles.input}
                      value={bp.serviceChargePercent || 5.0}
                      onChange={(e) => handleUpdateField('billing_payments', 'serviceChargePercent', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Max Discount Allowed Without Manager PIN (%)</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={bp.maxDiscountWithoutPin || 10}
                      onChange={(e) => handleUpdateField('billing_payments', 'maxDiscountWithoutPin', parseInt(e.target.value, 10) || 0)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Invoice Paper Format</label>
                    <select
                      className={styles.select}
                      value={bp.invoicePaperWidth || '80MM'}
                      onChange={(e) => handleUpdateField('billing_payments', 'invoicePaperWidth', e.target.value)}
                    >
                      <option value="80MM">3-Inch Thermal (80mm TVSE RP3200 Plus)</option>
                      <option value="58MM">2-Inch Thermal (58mm Mobile EDC)</option>
                      <option value="A4">A4 / A5 Standard Laser Slip</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Invoice Footer Note */}
              <div className={styles.formGroupFull} style={{ marginTop: '0.75rem' }}>
                <label className={styles.label}>Customer Invoice Footer Greeting</label>
                <textarea
                  className={styles.textarea}
                  rows={2}
                  value={bp.invoiceFooter || ''}
                  onChange={(e) => handleUpdateField('billing_payments', 'invoiceFooter', e.target.value)}
                />
              </div>

              {/* Shortcut to Bill Slip Format Designer */}
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed #10b981', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <strong style={{ color: '#10b981', fontSize: '0.92rem' }}>🧾 Bill Slip &amp; Thermal Receipt Format Designer</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Visual live editor for TVSE RP3200 Plus 80mm/58mm slips, store branding, statutory details, and disclaimers
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => setActiveSubTab('bill_slip')}
                  style={{ background: '#10b981', borderColor: '#059669' }}
                >
                  ⚙️ Open Slip Designer &amp; Preview
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 8B: BILL SLIP FORMAT DESIGNER
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'bill_slip' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>🧾</span>
                  <div>
                    <h2 className={styles.cardTitle}>Bill Slip &amp; Thermal Receipt Designer</h2>
                    <p className={styles.cardSubtitle}>
                      Live visual designer for TVSE RP3200 Plus 80mm &amp; 58mm thermal receipts, store branding, and statutory details
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <BillSlipFormatDesigner
                  currentSettings={settings}
                  onSaveSuccess={(fmt) => {
                    setSettings(prev => ({ ...prev, bill_slip_format: fmt }));
                    showToast('success', 'Bill slip format template saved successfully!');
                  }}
                  currentUser={currentUser}
                />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 9: PRINTERS & KOT SETTINGS
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'printers' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>🖨️</span>
                  <div>
                    <h2 className={styles.cardTitle}>Receipt &amp; Kitchen KOT Printers</h2>
                    <p className={styles.cardSubtitle}>
                      Configure TVSE RP3200 Plus thermal printers, kitchen station endpoints, and KOT format rules
                    </p>
                  </div>
                </div>
                <button type="button" className={styles.btnPrimary} onClick={() => handleSaveSection('printers_kot')} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Printer Rules'}
                </button>
              </div>

              {/* Receipt Printer */}
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.75rem' }}>
                  🧾 Cash Counter Receipt Printer
                </h3>
                <div className={styles.formGrid3}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Hardware Model</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={pk.receiptPrinter?.model || 'TVSE RP3200 Plus (3-Inch Thermal)'}
                      onChange={(e) => handleUpdateField('printers_kot', 'receiptPrinter.model', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Connection Interface</label>
                    <select
                      className={styles.select}
                      value={pk.receiptPrinter?.interface || 'USB_SERIAL'}
                      onChange={(e) => handleUpdateField('printers_kot', 'receiptPrinter.interface', e.target.value)}
                    >
                      <option value="USB_SERIAL">USB / Serial COM Port</option>
                      <option value="NETWORK">LAN / Ethernet IP</option>
                      <option value="BLUETOOTH">Bluetooth Wireless</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>IP Address / COM Port</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={pk.receiptPrinter?.ipAddress || '192.168.1.100'}
                      onChange={(e) => handleUpdateField('printers_kot', 'receiptPrinter.ipAddress', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Kitchen Station Printers */}
              <div style={{ borderTop: '1px solid var(--border-subtle, #27272a)', paddingTop: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.75rem' }}>
                  🍳 Kitchen Station Dedicated KOT Printers
                </h3>
                <div className={styles.tableWrap}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Station Name</th>
                        <th>Network Endpoint</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(pk.kitchenPrinters || []).map((kp, idx) => (
                        <tr key={kp.id}>
                          <td>
                            <strong>{kp.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Station: {kp.station}</div>
                          </td>
                          <td>
                            <code>{kp.ip}:{kp.port || 9100}</code>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${kp.status === 'ONLINE' ? styles.statusVerified : styles.statusFailed}`}>
                              {kp.status || 'ONLINE'}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`${styles.btnSecondary} ${styles.btnSm}`}
                              onClick={() => {
                                playTone('urgent', 80);
                                showToast('success', `Test slip printed to ${kp.name} (${kp.station})`);
                              }}
                            >
                              🖨️ Test Print Slip
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* KOT Formatting Switches */}
              <div className={styles.formGrid2} style={{ marginTop: '0.75rem' }}>
                <div className={styles.switchGroup}>
                  <div className={styles.switchInfo}>
                    <div className={styles.switchTitle}>Split KOT Slip by Kitchen Station</div>
                    <div className={styles.switchDesc}>
                      Dosa items route to Dosa counter; meals route to meals kitchen
                    </div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!pk.kotSplitByStation}
                      onChange={(e) => handleUpdateField('printers_kot', 'kotSplitByStation', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.switchGroup}>
                  <div className={styles.switchInfo}>
                    <div className={styles.switchTitle}>Large Font for Cooking Cooks</div>
                    <div className={styles.switchDesc}>Double-height font for high visibility across kitchen counters</div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!pk.kotLargeFont}
                      onChange={(e) => handleUpdateField('printers_kot', 'kotLargeFont', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 10: NOTIFICATION SETTINGS & SOUND CHIMES
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'notifications' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>🔔</span>
                  <div>
                    <h2 className={styles.cardTitle}>Audio Chimes, Alerts &amp; Notifications</h2>
                    <p className={styles.cardSubtitle}>
                      Configure POS sound alerts, low-stock notifications, UPI payment voice announcements
                    </p>
                  </div>
                </div>
                <button type="button" className={styles.btnPrimary} onClick={() => handleSaveSection('notifications')} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Notification Settings'}
                </button>
              </div>

              <div className={styles.formGrid2}>
                <div className={styles.switchGroup}>
                  <div className={styles.switchInfo}>
                    <div className={styles.switchTitle}>New Order Sound Alerts</div>
                    <div className={styles.switchDesc}>Plays instant chime when new customer QR or waiter order arrives</div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!notif.newOrderSoundAlert}
                      onChange={(e) => handleUpdateField('notifications', 'newOrderSoundAlert', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.switchGroup}>
                  <div className={styles.switchInfo}>
                    <div className={styles.switchTitle}>Low-Stock Inventory Alerts</div>
                    <div className={styles.switchDesc}>Sounds alert when batter, ghee, or milk drops below safety threshold</div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!notif.lowStockAlerts}
                      onChange={(e) => handleUpdateField('notifications', 'lowStockAlerts', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Sound Chime Tone</label>
                  <select
                    className={styles.select}
                    value={notif.soundTone || 'urgent'}
                    onChange={(e) => handleUpdateField('notifications', 'soundTone', e.target.value)}
                  >
                    <option value="urgent">Urgent Two-Tone Kitchen Bell</option>
                    <option value="chime">Subtle Dining Chime (D5 - A5)</option>
                    <option value="bell">Clear High Bell Ding (C6)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Audio Volume ({notif.soundVolume || 80}%)</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={notif.soundVolume || 80}
                      onChange={(e) => handleUpdateField('notifications', 'soundVolume', parseInt(e.target.value, 10))}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => playTone(notif.soundTone || 'urgent', notif.soundVolume || 80)}
                    >
                      🔊 Test Chime
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.formGrid2} style={{ marginTop: '0.75rem' }}>
                <div className={styles.switchGroup}>
                  <div className={styles.switchInfo}>
                    <div className={styles.switchTitle}>UPI Payment Voice Announcement</div>
                    <div className={styles.switchDesc}>Announces &ldquo;₹240 Received via PhonePe UPI&rdquo; through POS speakers</div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!notif.paymentSuccessSpeech}
                      onChange={(e) => handleUpdateField('notifications', 'paymentSuccessSpeech', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.switchGroup}>
                  <div className={styles.switchInfo}>
                    <div className={styles.switchTitle}>WhatsApp Digital E-Bill to Customer</div>
                    <div className={styles.switchDesc}>Automatically dispatches tax invoice link to guest phone number</div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!notif.whatsappOrderUpdates}
                      onChange={(e) => handleUpdateField('notifications', 'whatsappOrderUpdates', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 11: INVENTORY & WASTAGE SETTINGS
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'inventory' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>📦</span>
                  <div>
                    <h2 className={styles.cardTitle}>Inventory Units, Thresholds &amp; Wastage Rules</h2>
                    <p className={styles.cardSubtitle}>
                      Configure measurement units, perishable expiry warnings, and kitchen wastage tracking thresholds
                    </p>
                  </div>
                </div>
                <button type="button" className={styles.btnPrimary} onClick={() => handleSaveSection('inventory_config')} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Inventory Rules'}
                </button>
              </div>

              <div className={styles.formGrid2}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Global Low Stock Threshold (%)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={inv.globalLowStockThreshold || 15}
                    onChange={(e) => handleUpdateField('inventory_config', 'globalLowStockThreshold', parseInt(e.target.value, 10))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Perishable Items Expiry Warning (Days)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={inv.perishableExpiryWarningDays || 2}
                    onChange={(e) => handleUpdateField('inventory_config', 'perishableExpiryWarningDays', parseInt(e.target.value, 10))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Manager Wastage Approval Threshold (₹)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={inv.wastageApprovalThreshold || 500}
                    onChange={(e) => handleUpdateField('inventory_config', 'wastageApprovalThreshold', parseInt(e.target.value, 10))}
                  />
                </div>

                <div className={styles.switchGroup}>
                  <div className={styles.switchInfo}>
                    <div className={styles.switchTitle}>Mandatory Wastage Reason</div>
                    <div className={styles.switchDesc}>Cooks must enter reason (Spillage, Burnt, Batter sour)</div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!inv.mandatoryWastageReason}
                      onChange={(e) => handleUpdateField('inventory_config', 'mandatoryWastageReason', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 12: CUSTOMER LOYALTY & PRIVACY
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'loyalty' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>🎁</span>
                  <div>
                    <h2 className={styles.cardTitle}>Customer Loyalty, VIP Tiers &amp; Privacy</h2>
                    <p className={styles.cardSubtitle}>
                      Manage customer phone masking, loyalty points earn &amp; redeem engine, and promotional promo codes
                    </p>
                  </div>
                </div>
                <button type="button" className={styles.btnPrimary} onClick={() => handleSaveSection('loyalty_customer')} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Loyalty Rules'}
                </button>
              </div>

              <div className={styles.formGrid2}>
                <div className={styles.switchGroup}>
                  <div className={styles.switchInfo}>
                    <div className={styles.switchTitle}>Customer Phone Masking for Waiters</div>
                    <div className={styles.switchDesc}>Hides phone numbers (98*** *3210) to protect diner privacy</div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!loy.customerPrivacyMasking}
                      onChange={(e) => handleUpdateField('loyalty_customer', 'customerPrivacyMasking', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.switchGroup}>
                  <div className={styles.switchInfo}>
                    <div className={styles.switchTitle}>Enable Gokulam Loyalty Points</div>
                    <div className={styles.switchDesc}>Diners earn points on every bill to redeem for future visits</div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!loy.loyaltyEnabled}
                      onChange={(e) => handleUpdateField('loyalty_customer', 'loyaltyEnabled', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Points Earn Rate (Per ₹100 Spent)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={loy.pointsPerHundredRupees || 1}
                    onChange={(e) => handleUpdateField('loyalty_customer', 'pointsPerHundredRupees', parseInt(e.target.value, 10))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Point Value in INR (1 Point = ₹?)</label>
                  <input
                    type="number"
                    step="0.1"
                    className={styles.input}
                    value={loy.pointValueInInr || 1.0}
                    onChange={(e) => handleUpdateField('loyalty_customer', 'pointValueInInr', parseFloat(e.target.value))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>VIP Dining Spend Threshold (₹)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={loy.vipSpendThreshold || 5000}
                    onChange={(e) => handleUpdateField('loyalty_customer', 'vipSpendThreshold', parseInt(e.target.value, 10))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Birthday Special Discount (%)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={loy.birthdayDiscountPercent || 15}
                    onChange={(e) => handleUpdateField('loyalty_customer', 'birthdayDiscountPercent', parseInt(e.target.value, 10))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 13: WEBSITE SETTINGS
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'website' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>🖥️</span>
                  <div>
                    <h2 className={styles.cardTitle}>Public Customer Website Configuration</h2>
                    <p className={styles.cardSubtitle}>
                      Hero headlines, top announcement strip, heritage story text, and social links
                    </p>
                  </div>
                </div>
                <button type="button" className={styles.btnPrimary} onClick={() => handleSaveSection('website_config')} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Website Content'}
                </button>
              </div>

              <div className={styles.formGrid2}>
                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Hero Headline</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={web.heroHeadline || ''}
                    onChange={(e) => handleUpdateField('website_config', 'heroHeadline', e.target.value)}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Hero Subheadline</label>
                  <textarea
                    className={styles.textarea}
                    rows={2}
                    value={web.heroSubheadline || ''}
                    onChange={(e) => handleUpdateField('website_config', 'heroSubheadline', e.target.value)}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <div className={styles.switchGroup}>
                    <div className={styles.switchInfo}>
                      <div className={styles.switchTitle}>Enable Top Announcement Banner</div>
                      <div className={styles.switchDesc}>Displays alert strip above website header</div>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={!!web.announcementStrip?.enabled}
                        onChange={(e) => handleUpdateField('website_config', 'announcementStrip.enabled', e.target.checked)}
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Announcement Banner Text</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={web.announcementStrip?.text || ''}
                    onChange={(e) => handleUpdateField('website_config', 'announcementStrip.text', e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Instagram Link</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={web.socialLinks?.instagram || ''}
                    onChange={(e) => handleUpdateField('website_config', 'socialLinks.instagram', e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Google Maps Location URL</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={web.socialLinks?.googleMaps || ''}
                    onChange={(e) => handleUpdateField('website_config', 'socialLinks.googleMaps', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 14: INTEGRATION SETTINGS (HONEST REAL-TIME STATUS!)
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'integrations' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>🔌</span>
                  <div>
                    <h2 className={styles.cardTitle}>Third-Party API Integrations</h2>
                    <p className={styles.cardSubtitle}>
                      Manage Payment Gateway, WhatsApp Cloud API, Email, and GitHub CDN (Status reflects verified credentials only)
                    </p>
                  </div>
                </div>
                <button type="button" className={styles.btnPrimary} onClick={() => handleSaveSection('integrations')} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Credentials'}
                </button>
              </div>

              {/* 1. Payment Gateway */}
              <div style={{ border: '1px solid var(--border-subtle, #27272a)', borderRadius: 10, padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.4rem' }}>💳</span>
                    <div>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Razorpay Payment Gateway</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>UPI, Credit/Debit cards &amp; QR checkout</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      className={`${styles.statusBadge} ${
                        integ.paymentGateway?.status === 'VERIFIED'
                          ? styles.statusVerified
                          : integ.paymentGateway?.status === 'CONFIGURED'
                          ? styles.statusConfigured
                          : styles.statusNotConfigured
                      }`}
                    >
                      {integ.paymentGateway?.status || 'NOT_CONFIGURED'}
                    </span>
                    <button
                      type="button"
                      className={`${styles.btnSecondary} ${styles.btnSm}`}
                      onClick={() => handleTestIntegration('paymentGateway')}
                      disabled={testingIntegration === 'paymentGateway'}
                    >
                      {testingIntegration === 'paymentGateway' ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                </div>

                <div className={styles.formGrid3}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Razorpay Key ID</label>
                    <input
                      type="text"
                      placeholder="rzp_test_... or rzp_live_..."
                      className={styles.input}
                      value={integ.paymentGateway?.keyId || ''}
                      onChange={(e) => handleUpdateField('integrations', 'paymentGateway.keyId', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Razorpay Key Secret</label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      className={styles.input}
                      value={integ.paymentGateway?.keySecret || ''}
                      onChange={(e) => handleUpdateField('integrations', 'paymentGateway.keySecret', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Gateway Mode</label>
                    <select
                      className={styles.select}
                      value={integ.paymentGateway?.isLive ? 'LIVE' : 'TEST'}
                      onChange={(e) => handleUpdateField('integrations', 'paymentGateway.isLive', e.target.value === 'LIVE')}
                    >
                      <option value="TEST">Test Sandbox Mode</option>
                      <option value="LIVE">Live Production Mode</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. WhatsApp Business API */}
              <div style={{ border: '1px solid var(--border-subtle, #27272a)', borderRadius: 10, padding: '1.25rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.4rem' }}>💬</span>
                    <div>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>WhatsApp Business Cloud API</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Automated digital receipts &amp; order tracking</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      className={`${styles.statusBadge} ${
                        integ.whatsapp?.status === 'VERIFIED'
                          ? styles.statusVerified
                          : styles.statusNotConfigured
                      }`}
                    >
                      {integ.whatsapp?.status || 'NOT_CONFIGURED'}
                    </span>
                    <button
                      type="button"
                      className={`${styles.btnSecondary} ${styles.btnSm}`}
                      onClick={() => handleTestIntegration('whatsapp')}
                      disabled={testingIntegration === 'whatsapp'}
                    >
                      {testingIntegration === 'whatsapp' ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                </div>

                <div className={styles.formGrid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>WhatsApp Cloud API Key</label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      className={styles.input}
                      value={integ.whatsapp?.apiKey || ''}
                      onChange={(e) => handleUpdateField('integrations', 'whatsapp.apiKey', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Phone Number ID</label>
                    <input
                      type="text"
                      placeholder="1092837465019"
                      className={styles.input}
                      value={integ.whatsapp?.phoneNumberId || ''}
                      onChange={(e) => handleUpdateField('integrations', 'whatsapp.phoneNumberId', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Transactional Email */}
              <div style={{ border: '1px solid var(--border-subtle, #27272a)', borderRadius: 10, padding: '1.25rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.4rem' }}>📧</span>
                    <div>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Transactional Email (Resend / SendGrid)</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Daily settlement reports &amp; staff OTP delivery</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      className={`${styles.statusBadge} ${
                        integ.email?.status === 'VERIFIED'
                          ? styles.statusVerified
                          : styles.statusNotConfigured
                      }`}
                    >
                      {integ.email?.status || 'NOT_CONFIGURED'}
                    </span>
                    <button
                      type="button"
                      className={`${styles.btnSecondary} ${styles.btnSm}`}
                      onClick={() => handleTestIntegration('email')}
                      disabled={testingIntegration === 'email'}
                    >
                      {testingIntegration === 'email' ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                </div>

                <div className={styles.formGrid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email API Key</label>
                    <input
                      type="password"
                      placeholder="re_••••••••••••"
                      className={styles.input}
                      value={integ.email?.apiKey || ''}
                      onChange={(e) => handleUpdateField('integrations', 'email.apiKey', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Verified Sender Email</label>
                    <input
                      type="email"
                      placeholder="orders@srigokulam.com"
                      className={styles.input}
                      value={integ.email?.senderEmail || ''}
                      onChange={(e) => handleUpdateField('integrations', 'email.senderEmail', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 4. GitHub Image CDN */}
              <div style={{ border: '1px solid var(--border-subtle, #27272a)', borderRadius: 10, padding: '1.25rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.4rem' }}>🐙</span>
                    <div>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>GitHub Image CDN Publishing</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Automated commit of dish images to repository</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      className={`${styles.statusBadge} ${
                        integ.githubCdn?.status === 'VERIFIED'
                          ? styles.statusVerified
                          : styles.statusNotConfigured
                      }`}
                    >
                      {integ.githubCdn?.status || 'NOT_CONFIGURED'}
                    </span>
                    <button
                      type="button"
                      className={`${styles.btnSecondary} ${styles.btnSm}`}
                      onClick={() => handleTestIntegration('githubCdn')}
                      disabled={testingIntegration === 'githubCdn'}
                    >
                      {testingIntegration === 'githubCdn' ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                </div>

                <div className={styles.formGrid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>GitHub Repository (owner/repo)</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={integ.githubCdn?.repo || ''}
                      onChange={(e) => handleUpdateField('integrations', 'githubCdn.repo', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Personal Access Token</label>
                    <input
                      type="password"
                      placeholder="ghp_••••••••••••"
                      className={styles.input}
                      value={integ.githubCdn?.token || ''}
                      onChange={(e) => handleUpdateField('integrations', 'githubCdn.token', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 15: SECURITY & SESSIONS
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'security' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>🔒</span>
                  <div>
                    <h2 className={styles.cardTitle}>Security, Authentication &amp; Sessions</h2>
                    <p className={styles.cardSubtitle}>
                      Manage active terminal logins, two-factor authentication, failed login lockouts, and session timeouts
                    </p>
                  </div>
                </div>
                <button type="button" className={styles.btnPrimary} onClick={() => handleSaveSection('security')} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Security Rules'}
                </button>
              </div>

              {/* Active Sessions */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
                    🖥️ Active Terminal Sessions ({(sec.activeSessions || []).length})
                  </h3>
                  <button type="button" className={styles.btnDanger} onClick={handleTerminateOtherSessions}>
                    ⚠️ Terminate All Other Sessions
                  </button>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>User &amp; Role</th>
                        <th>Device &amp; IP</th>
                        <th>Login Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sec.activeSessions || []).map((session) => (
                        <tr key={session.id}>
                          <td>
                            <strong>{session.userName}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role: {session.role}</div>
                          </td>
                          <td>
                            <div>{session.device}</div>
                            <code style={{ fontSize: '0.75rem' }}>{session.ip}</code>
                          </td>
                          <td>
                            {new Date(session.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>
                            {session.isCurrent ? (
                              <span className={`${styles.statusBadge} ${styles.statusVerified}`}>Current Terminal</span>
                            ) : (
                              <span className={`${styles.statusBadge} ${styles.statusConfigured}`}>Remote Active</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2FA & Lockout Rules */}
              <div className={styles.formGrid2} style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle, #27272a)', paddingTop: '1.25rem' }}>
                <div className={styles.switchGroup}>
                  <div className={styles.switchInfo}>
                    <div className={styles.switchTitle}>Two-Factor Authentication for Super Admin</div>
                    <div className={styles.switchDesc}>Requires 6-digit email OTP on login</div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!sec.twoFactorAuthSuperAdmin}
                      onChange={(e) => handleUpdateField('security', 'twoFactorAuthSuperAdmin', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.switchGroup}>
                  <div className={styles.switchInfo}>
                    <div className={styles.switchTitle}>Two-Factor Authentication for Developer Admin</div>
                    <div className={styles.switchDesc}>Enforces cryptographic verification for root admin</div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!sec.twoFactorAuthDevAdmin}
                      onChange={(e) => handleUpdateField('security', 'twoFactorAuthDevAdmin', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Max Failed Login Attempts Before Lockout</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={sec.maxFailedLoginAttempts || 5}
                    onChange={(e) => handleUpdateField('security', 'maxFailedLoginAttempts', parseInt(e.target.value, 10))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Lockout Duration (Minutes)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={sec.lockoutDurationMinutes || 15}
                    onChange={(e) => handleUpdateField('security', 'lockoutDurationMinutes', parseInt(e.target.value, 10))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 16: BACKUP & AUDIT LOGS
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'audit_backup' && (
            <div className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>💾</span>
                  <div>
                    <h2 className={styles.cardTitle}>System Audit Trail &amp; Database Backups</h2>
                    <p className={styles.cardSubtitle}>
                      Track all staff actions, settings alterations, price changes, and snapshot backups
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button type="button" className={styles.btnSuccess} onClick={handleCreateSnapshot}>
                    📸 Take Instant Snapshot
                  </button>
                  <a
                    href="/.data/restaurant_state.json"
                    download="sri_gokulam_database_backup.json"
                    className={styles.btnSecondary}
                    style={{ textDecoration: 'none' }}
                  >
                    📥 Download JSON
                  </a>
                </div>
              </div>

              {/* Snapshots Table */}
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.75rem' }}>
                  📦 Database Snapshots ({backups.length})
                </h3>
                {backups.length === 0 ? (
                  <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No snapshots taken yet. Click &quot;Take Instant Snapshot&quot; to save a restore point.
                  </div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Backup File</th>
                          <th>Size</th>
                          <th>Created At</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backups.map((b) => (
                          <tr key={b.filename}>
                            <td>
                              <code>{b.filename}</code>
                            </td>
                            <td>{Math.round(b.sizeBytes / 1024)} KB</td>
                            <td>{new Date(b.createdAt).toLocaleString()}</td>
                            <td>
                              <button
                                type="button"
                                className={`${styles.btnDanger} ${styles.btnSm}`}
                                onClick={() => handleRestoreSnapshot(b.filename)}
                              >
                                ⏪ Restore State
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Real-time Searchable Audit Logs */}
              <div style={{ borderTop: '1px solid var(--border-subtle, #27272a)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
                    📜 System Audit Trail ({auditLogs.length} Events)
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="🔍 Search audit events..."
                      className={styles.input}
                      style={{ maxWidth: 220 }}
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                    />
                    <select
                      className={styles.select}
                      style={{ maxWidth: 160 }}
                      value={auditModuleFilter}
                      onChange={(e) => setAuditModuleFilter(e.target.value)}
                    >
                      <option value="ALL">All Modules</option>
                      <option value="BILLING">Billing</option>
                      <option value="PRINTER">Printer</option>
                      <option value="USERS">Users</option>
                      <option value="SECURITY">Security</option>
                      <option value="BACKUP">Backup</option>
                      <option value="INTEGRATIONS">Integrations</option>
                      <option value="SYSTEM">System</option>
                    </select>
                  </div>
                </div>

                <div className={styles.tableWrap} style={{ maxHeight: 380, overflowY: 'auto' }}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>User &amp; Role</th>
                        <th>Module</th>
                        <th>Action</th>
                        <th>Detail &amp; Diff</th>
                        <th>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td>
                            <strong>{log.user}</strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{log.role}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.72rem', background: '#27272a', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                              {log.module}
                            </span>
                          </td>
                          <td>
                            <code style={{ fontSize: '0.78rem', color: '#38bdf8' }}>{log.action}</code>
                          </td>
                          <td style={{ fontSize: '0.8rem', maxWidth: 320 }}>{log.detail}</td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.ip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODULE 17: DEVELOPER TECHNICAL CONSOLE (RESTRICTED TO DEVELOPER_ADMIN)
             ══════════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'developer' && currentUser.role === 'DEVELOPER_ADMIN' && (
            <div className={styles.settingsCard} style={{ border: '1px solid rgba(192, 132, 252, 0.35)' }}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitleGroup}>
                  <span className={styles.cardIcon}>⚡</span>
                  <div>
                    <h2 className={styles.cardTitle} style={{ color: '#c084fc' }}>
                      Developer Admin Technical Controls
                    </h2>
                    <p className={styles.cardSubtitle}>
                      AJ Tech Solutions Architecture Console • Maintenance mode, system vitals, cache management &amp; factory resets
                    </p>
                  </div>
                </div>
                <button type="button" className={styles.btnPrimary} onClick={() => handleSaveSection('developer')} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Developer Flags'}
                </button>
              </div>

              {/* Maintenance Mode */}
              <div className={styles.switchGroup} style={{ border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}>
                <div className={styles.switchInfo}>
                  <div className={styles.switchTitle} style={{ color: '#ef4444' }}>
                    🚨 Restaurant Maintenance Mode
                  </div>
                  <div className={styles.switchDesc}>
                    When activated, customer website and QR Dine-In orders are suspended with a graceful maintenance announcement.
                  </div>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={!!dev.maintenanceMode}
                    onChange={(e) => handleUpdateField('developer', 'maintenanceMode', e.target.checked)}
                  />
                  <span className={styles.slider} style={{ backgroundColor: dev.maintenanceMode ? '#ef4444' : '#3f3f46' }}></span>
                </label>
              </div>

              <div className={styles.formGroupFull} style={{ marginTop: '0.75rem' }}>
                <label className={styles.label}>Custom Maintenance Message Shown to Customers</label>
                <textarea
                  className={styles.textarea}
                  rows={2}
                  value={dev.maintenanceMessage || ''}
                  onChange={(e) => handleUpdateField('developer', 'maintenanceMessage', e.target.value)}
                />
              </div>

              {/* System Vitals */}
              {systemHealth && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle, #27272a)', paddingTop: '1.25rem' }}>
                  <h3 style={{ fontSize: '1rem', color: '#c084fc', margin: '0 0 1rem' }}>
                    💻 Real-Time System Vitals &amp; Runtime Metrics
                  </h3>
                  <div className={styles.formGrid3}>
                    <div className={styles.formGroup}>
                      <span className={styles.label}>Node.js Runtime</span>
                      <strong style={{ fontSize: '1.1rem' }}>{systemHealth.nodeVersion}</strong>
                    </div>
                    <div className={styles.formGroup}>
                      <span className={styles.label}>Process Memory (Heap Used / Total)</span>
                      <strong style={{ fontSize: '1.1rem' }}>
                        {systemHealth.memoryUsage?.heapUsedMb} MB / {systemHealth.memoryUsage?.heapTotalMb} MB
                      </strong>
                    </div>
                    <div className={styles.formGroup}>
                      <span className={styles.label}>System Uptime</span>
                      <strong style={{ fontSize: '1.1rem' }}>
                        {Math.floor(systemHealth.uptimeSeconds / 60)} mins ({systemHealth.uptimeSeconds}s)
                      </strong>
                    </div>
                  </div>

                  <div className={styles.formGrid} style={{ marginTop: '0.75rem' }}>
                    <div className={styles.metaPill}>📦 Inventory Items: <strong>{systemHealth.counts?.inventory}</strong></div>
                    <div className={styles.metaPill}>📜 Total Bills Issued: <strong>{systemHealth.counts?.bills}</strong></div>
                    <div className={styles.metaPill}>👥 Active Staff Accounts: <strong>{systemHealth.counts?.staff}</strong></div>
                    <div className={styles.metaPill}>🪑 Dining Tables: <strong>{systemHealth.counts?.tables}</strong></div>
                  </div>
                </div>
              )}

              {/* Master Factory Reset */}
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle, #27272a)', paddingTop: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', color: '#ef4444', margin: '0 0 0.5rem' }}>
                  ⚠️ Master Factory Settings Reset (Strict Confirmation Required)
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
                  Restores all operational configurations, pricing rules, and settings back to original factory configuration.
                </p>
                <button type="button" className={styles.btnDanger} onClick={handleDeveloperReset}>
                  💥 Execute Factory Settings Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Floating Sticky Action Bar for Unsaved Changes ─── */}
      {isDirty && (
        <div className={styles.floatingBar}>
          <div className={styles.floatingBarText}>
            <span className={styles.dirtyDot}></span>
            <span>You have unsaved changes in {activeSubTab.replace('_', ' ')}</span>
          </div>
          <button type="button" className={styles.btnSecondary} onClick={() => handleResetSection(activeSubTab)}>
            Discard
          </button>
          <button type="button" className={styles.btnPrimary} onClick={() => handleSaveSection(activeSubTab)} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Changes Now'}
          </button>
        </div>
      )}

      {/* ─── Add Staff Modal ─── */}
      {showAddStaffModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create New Staff Account</h3>
              <button type="button" className={styles.modalCloseBtn} onClick={() => setShowAddStaffModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateStaff}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Staff Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    className={styles.input}
                    value={newStaffForm.fullName}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, fullName: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email Address <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh@srigokulam.com"
                    className={styles.input}
                    value={newStaffForm.email}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Phone Number</label>
                  <input
                    type="text"
                    placeholder="9876500010"
                    className={styles.input}
                    value={newStaffForm.phone}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Assigned Role <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    className={styles.select}
                    value={newStaffForm.role}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value })}
                  >
                    {currentUser.role === 'DEVELOPER_ADMIN' && (
                      <option value="SUPER_ADMIN">👑 Super Admin (Owner Admin)</option>
                    )}
                    <option value="STORE_MANAGER">Store Manager</option>
                    <option value="CASHIER">POS Cashier</option>
                    <option value="WAITER">Floor Captain / Waiter</option>
                    <option value="KITCHEN">Kitchen Staff</option>
                    <option value="INVENTORY_STAFF">Inventory Storekeeper</option>
                  </select>
                  {currentUser.role !== 'DEVELOPER_ADMIN' && (
                    <div style={{ fontSize: '0.76rem', color: '#f59e0b', marginTop: '0.4rem', lineHeight: 1.4 }}>
                      🔒 Restricted: Only Developer Admins can create Owner Admin (Super Admin) accounts.
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowAddStaffModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Confirmation Modal ─── */}
      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{showConfirmModal.title}</h3>
              <button type="button" className={styles.modalCloseBtn} onClick={() => setShowConfirmModal(null)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {showConfirmModal.message}
              </p>
              {showConfirmModal.requiresPhrase && (
                <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                  <label className={styles.label}>
                    Type <code>{showConfirmModal.phrase}</code> to proceed:
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    value={confirmPhraseInput}
                    onChange={(e) => setConfirmPhraseInput(e.target.value)}
                    placeholder={showConfirmModal.phrase}
                  />
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  setShowConfirmModal(null);
                  setConfirmPhraseInput('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                disabled={showConfirmModal.requiresPhrase && confirmPhraseInput !== showConfirmModal.phrase}
                onClick={() => {
                  const cb = showConfirmModal.onConfirm;
                  setShowConfirmModal(null);
                  setConfirmPhraseInput('');
                  if (cb) cb();
                }}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
