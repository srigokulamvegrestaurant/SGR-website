'use client';

// app/admin/components/ReportsDashboard.js - Enterprise Reports & Analytics Suite
import { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './ReportsDashboard.module.css';

export default function ReportsDashboard({ initialPeriod = 'today' }) {
  const [period, setPeriod] = useState(initialPeriod);
  const [customStart, setCustomStart] = useState('2026-10-01');
  const [customEnd, setCustomEnd] = useState('2026-10-18');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('all'); // 'all', 'sales', 'orders', 'menu', 'payments', 'profit', 'inventory', 'customers', 'staff', 'peak', 'tables', 'export'
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');

  // Fetch report data
  const fetchReport = useCallback(async (selectedPeriod, sDate, eDate) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/reports?period=${selectedPeriod}`;
      if (selectedPeriod === 'custom' && sDate && eDate) {
        url += `&startDate=${sDate}&endDate=${eDate}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || 'Failed to load report data');
      }
    } catch (err) {
      console.error('Fetch report error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(period, customStart, customEnd);
  }, [fetchReport, period, customStart, customEnd]);

  // Client-side instant CSV export
  const handleExportCsv = (exportType = 'sales') => {
    let url = `/api/admin/reports?period=${period}&export=csv&exportType=${exportType}`;
    if (period === 'custom') {
      url += `&startDate=${customStart}&endDate=${customEnd}`;
    }
    window.open(url, '_blank');
    setExportOpen(false);
  };

  // Client-side Excel export (Formatted CSV with BOM for Excel compatibility)
  const handleExportExcel = (exportType = 'sales') => {
    let url = `/api/admin/reports?period=${period}&export=csv&exportType=${exportType}`;
    if (period === 'custom') {
      url += `&startDate=${customStart}&endDate=${customEnd}`;
    }
    window.open(url, '_blank');
    setExportOpen(false);
  };

  const overview = data?.businessOverview;
  const salesReports = data?.salesReports;
  const orderReports = data?.orderReports;
  const menuData = data?.popularMenuItems;
  const payments = data?.paymentReports;
  const profitAnalysis = data?.profitExpenseAnalysis;
  const inventoryData = data?.inventoryReports;
  const customerData = data?.customerAnalytics;
  const staffData = data?.staffPerformance || [];
  const peakData = data?.peakHoursAnalysis;
  const tableData = data?.tablePerformance;
  const insights = data?.automatedInsights || [];

  // Filtered menu dishes for search
  const filteredDishes = useMemo(() => {
    if (!menuData?.allItems) return [];
    if (!menuSearch) return menuData.allItems;
    const q = menuSearch.toLowerCase();
    return menuData.allItems.filter(d => 
      (d.title && d.title.toLowerCase().includes(q)) ||
      (d.tamilTitle && d.tamilTitle.includes(q)) ||
      (d.category && d.category.toLowerCase().includes(q))
    );
  }, [menuData, menuSearch]);

  return (
    <div className={styles.reportsContainer}>
      {/* ─── Top Command Bar ─── */}
      <div className={styles.topCommandBar}>
        <div className={styles.titleArea}>
          <div className={styles.brandBadge}>📈</div>
          <div>
            <h1 className={styles.mainHeading}>Reports &amp; Analytics Suite</h1>
            <p className={styles.subHeading}>
              Sri Gokulam Veg Restaurant • Period: <strong>{data?.periodInfo?.label || period}</strong> ({data?.periodInfo?.comparisonLabel})
            </p>
          </div>
        </div>

        <div className={styles.actionsArea}>
          {/* Period Selector Pills */}
          <div className={styles.periodSelector}>
            {[
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'this_week', label: 'This Week' },
              { key: 'last_week', label: 'Last Week' },
              { key: 'this_month', label: 'This Month' },
              { key: 'last_month', label: 'Last Month' },
              { key: 'this_year', label: 'Yearly' },
              { key: 'custom', label: '📅 Custom' },
            ].map(p => (
              <button
                key={p.key}
                type="button"
                className={`${styles.periodBtn} ${period === p.key ? styles.periodBtnActive : ''}`}
                onClick={() => {
                  if (p.key === 'custom') {
                    setShowCustomModal(true);
                  } else {
                    setPeriod(p.key);
                  }
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Quick Refresh */}
          <button
            type="button"
            className={styles.btnAction}
            onClick={() => fetchReport(period, customStart, customEnd)}
            title="Refresh Live Analytics"
          >
            🔄 Refresh
          </button>

          {/* Export Dropdown */}
          <div className={styles.exportDropdownWrapper}>
            <button
              type="button"
              className={`${styles.btnAction} ${styles.btnPrimary}`}
              onClick={() => setExportOpen(!exportOpen)}
            >
              📥 Export Reports ▾
            </button>
            {exportOpen && (
              <div className={styles.exportDropdownMenu}>
                <button
                  type="button"
                  className={styles.exportItem}
                  onClick={() => handleExportCsv('sales')}
                >
                  📄 Sales Report (CSV)
                </button>
                <button
                  type="button"
                  className={styles.exportItem}
                  onClick={() => handleExportExcel('sales')}
                >
                  📊 Sales Report (Excel)
                </button>
                <button
                  type="button"
                  className={styles.exportItem}
                  onClick={() => handleExportCsv('menu')}
                >
                  🍽️ Menu Delicacies Report (CSV)
                </button>
                <button
                  type="button"
                  className={styles.exportItem}
                  onClick={() => handleExportCsv('expenses')}
                >
                  💰 Expenses &amp; COGS (CSV)
                </button>
                <button
                  type="button"
                  className={styles.exportItem}
                  onClick={() => handleExportCsv('staff')}
                >
                  👨‍🍳 Staff Productivity (CSV)
                </button>
                <button
                  type="button"
                  className={styles.exportItem}
                  onClick={() => handleExportCsv('tables')}
                >
                  🪑 Table Performance (CSV)
                </button>
                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                <button
                  type="button"
                  className={styles.exportItem}
                  onClick={() => {
                    setExportOpen(false);
                    setShowPrintModal(true);
                  }}
                  style={{ color: '#10b981' }}
                >
                  🖨️ Print / Save as PDF
                </button>
              </div>
            )}
          </div>

          {/* Print Report */}
          <button
            type="button"
            className={`${styles.btnAction} ${styles.btnSuccess}`}
            onClick={() => setShowPrintModal(true)}
            title="Open Print & Thermal Slip Preview"
          >
            🖨️ Print Report
          </button>
        </div>
      </div>

      {/* ─── Sub-Navigation Tabs ─── */}
      <nav className={styles.subNavBar}>
        {[
          { key: 'all', icon: '📊', label: 'All Modules' },
          { key: 'sales', icon: '📈', label: 'Sales & Trends' },
          { key: 'orders', icon: '🧾', label: 'Orders & Channels' },
          { key: 'menu', icon: '🍽️', label: 'Popular Delicacies' },
          { key: 'payments', icon: '💳', label: 'Payment Reports' },
          { key: 'profit', icon: '💰', label: 'Profit & Expenses' },
          { key: 'inventory', icon: '📦', label: 'Inventory & Wastage' },
          { key: 'customers', icon: '👥', label: 'Customer Analytics' },
          { key: 'staff', icon: '👨‍🍳', label: 'Staff Performance' },
          { key: 'peak', icon: '⏰', label: 'Peak Hours' },
          { key: 'tables', icon: '🪑', label: 'Table Performance' },
          { key: 'export', icon: '📥', label: 'Export Center' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.subNavBtn} ${activeSubTab === tab.key ? styles.subNavActive : ''}`}
            onClick={() => setActiveSubTab(tab.key)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Error Notice */}
      {error && (
        <div style={{ background: '#7f1d1d', color: '#fecaca', padding: '0.85rem 1.25rem', borderRadius: 8 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
          <p>Compiling live analytics and financial ledger for Sri Gokulam...</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 1: BUSINESS OVERVIEW (6 Summary KPI Cards)
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSubTab === 'all' || activeSubTab === 'sales' || activeSubTab === 'profit') && overview && (
        <div className={styles.kpiGrid}>
          {/* Card 1: Total Sales */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Total Sales</span>
              <div className={styles.kpiIconWrap} style={{ color: '#10b981' }}>💰</div>
            </div>
            <div className={styles.kpiValue} style={{ color: '#10b981' }}>
              ₹{(overview.totalSales || 0).toLocaleString('en-IN')}
            </div>
            <div className={styles.kpiFooter}>
              <span className={overview.growth?.sales >= 0 ? styles.growthUp : styles.growthDown}>
                {overview.growth?.sales >= 0 ? `↑ +${overview.growth?.sales}%` : `↓ ${overview.growth?.sales}%`}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                Prev: ₹{(overview.prevTotalSales || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Card 2: Total Revenue (Net) */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Total Revenue (Net)</span>
              <div className={styles.kpiIconWrap} style={{ color: '#3b82f6' }}>🏦</div>
            </div>
            <div className={styles.kpiValue} style={{ color: '#3b82f6' }}>
              ₹{(overview.totalSales - (overview.discountsGiven || 0)).toLocaleString('en-IN')}
            </div>
            <div className={styles.kpiFooter}>
              <span style={{ color: 'var(--text-muted)' }}>
                Discounts: ₹{(overview.discountsGiven || 0).toLocaleString('en-IN')}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                GST: ₹{(overview.cgstTotal + overview.sgstTotal || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Card 3: Total Orders */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Total Orders</span>
              <div className={styles.kpiIconWrap} style={{ color: '#8b5cf6' }}>🧾</div>
            </div>
            <div className={styles.kpiValue}>
              {(overview.totalOrders || 0).toLocaleString('en-IN')}
            </div>
            <div className={styles.kpiFooter}>
              <span className={overview.growth?.orders >= 0 ? styles.growthUp : styles.growthDown}>
                {overview.growth?.orders >= 0 ? `↑ +${overview.growth?.orders}%` : `↓ ${overview.growth?.orders}%`}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                Prev: {overview.prevTotalOrders || 0} bills
              </span>
            </div>
          </div>

          {/* Card 4: Average Bill Value */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Average Bill Value (ABV)</span>
              <div className={styles.kpiIconWrap} style={{ color: '#f59e0b' }}>📈</div>
            </div>
            <div className={styles.kpiValue} style={{ color: '#f59e0b' }}>
              ₹{(overview.averageBillValue || 0).toLocaleString('en-IN')}
            </div>
            <div className={styles.kpiFooter}>
              <span style={{ color: 'var(--text-muted)' }}>
                Target: ₹380 / guest bill
              </span>
              <span className={overview.averageBillValue >= 380 ? styles.growthUp : styles.growthNeutral}>
                {overview.averageBillValue >= 380 ? '✓ On Target' : 'Below Target'}
              </span>
            </div>
          </div>

          {/* Card 5: Total Expenses */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Expenses (COGS + OpEx)</span>
              <div className={styles.kpiIconWrap} style={{ color: '#ef4444' }}>📉</div>
            </div>
            <div className={styles.kpiValue} style={{ color: '#ef4444' }}>
              ₹{(overview.totalExpenses || 0).toLocaleString('en-IN')}
            </div>
            <div className={styles.kpiFooter}>
              <span style={{ color: 'var(--text-muted)' }}>
                Food Cost: {overview.cogsPercent || 32}%
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                COGS: ₹{(overview.cogsExpenses || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Card 6: Estimated Profit */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Estimated Net Profit</span>
              <div className={styles.kpiIconWrap} style={{ color: '#10b981' }}>💎</div>
            </div>
            <div className={styles.kpiValue} style={{ color: '#10b981' }}>
              ₹{(overview.estimatedProfit || 0).toLocaleString('en-IN')}
            </div>
            <div className={styles.kpiFooter}>
              <span className={styles.growthUp}>
                Margin: {overview.profitMarginPercent || 38}%
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                Gross: ₹{(overview.grossProfit || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 14: AUTOMATED BUSINESS INSIGHTS
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSubTab === 'all' || activeSubTab === 'sales') && insights.length > 0 && (
        <section className={styles.insightsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span>🤖 Automated Executive Insights</span>
              <span className={styles.badgePill}>{insights.length} Actionable Signals</span>
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Real-time pattern recognition across sales, food costing, kitchen &amp; tables
            </span>
          </div>

          <div className={styles.insightsGrid}>
            {insights.map(ins => {
              let borderClass = styles.insightInfo;
              if (ins.severity === 'success') borderClass = styles.insightSuccess;
              else if (ins.severity === 'warning') borderClass = styles.insightWarning;
              else if (ins.severity === 'caution') borderClass = styles.insightCaution;

              return (
                <div key={ins.id} className={`${styles.insightCard} ${borderClass}`}>
                  <div className={styles.insightTop}>
                    <div>
                      <h3 className={styles.insightTitle}>
                        {ins.icon} {ins.title}
                      </h3>
                      <p className={ins.insightDesc}>{ins.desc}</p>
                    </div>
                    <span className={styles.badgePill} style={{ whiteSpace: 'nowrap' }}>
                      {ins.metric}
                    </span>
                  </div>
                  <div className={styles.insightAction}>
                    <span>💡 Recommended:</span>
                    <button
                      type="button"
                      className={styles.insightActionBtn}
                      onClick={() => alert(`Applied insight action:\n${ins.actionLabel}`)}
                    >
                      {ins.actionLabel} →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 2: SALES REPORTS (Timeline Chart & Dine-In vs Takeaway)
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSubTab === 'all' || activeSubTab === 'sales') && salesReports && (
        <div className={styles.twoColGrid}>
          {/* Main Sales Trend Chart */}
          <div className={styles.panelBox}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.sectionTitle}>
                  📈 Sales Timeline &amp; Performance
                </h3>
                <p className={styles.subHeading}>
                  {salesReports.isSingleDay ? 'Hourly sales volume (INR)' : 'Period breakdown with revenue & order count'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-green)' }}>
                  ₹{(overview?.totalSales || 0).toLocaleString('en-IN')}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                  Avg: ₹{(salesReports.summary?.dailyAverage || 0).toLocaleString('en-IN')} / slot
                </span>
              </div>
            </div>

            {/* Interactive Pure SVG/CSS Bar Chart */}
            <div className={styles.chartContainer}>
              {salesReports.timeline && salesReports.timeline.map((point, idx) => {
                const maxSales = Math.max(...salesReports.timeline.map(p => p.sales || 0), 1);
                const heightPercent = Math.max(12, Math.round(((point.sales || 0) / maxSales) * 100));

                return (
                  <div key={idx} className={styles.chartBarCol}>
                    <div className={styles.barPillWrap}>
                      <div className={styles.barTooltip}>
                        {point.label}: ₹{(point.sales || 0).toLocaleString('en-IN')} ({point.orders || 0} bills)
                      </div>
                      <div
                        className={styles.barPillFill}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className={styles.barLabel}>{point.label}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>Busiest Peak: <strong>{salesReports.summary?.peakSlot?.label || '1:00 PM'}</strong> (₹{(salesReports.summary?.peakSlot?.sales || 0).toLocaleString('en-IN')})</span>
              <span>Total Bills Settled: <strong>{overview?.totalOrders || 0}</strong></span>
            </div>
          </div>

          {/* Sales Channels Breakdown (Dine-in vs Takeaway) */}
          <div className={styles.panelBox}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.sectionTitle}>🍽️ Sales Channels</h3>
                <p className={styles.subHeading}>Dine-in table orders vs Takeaway / Parcel</p>
              </div>
            </div>

            <div className={styles.progressList}>
              {/* Dine In */}
              <div className={styles.progressItem}>
                <div className={styles.progressMeta}>
                  <span className={styles.progressLabel}>🪑 Dine-In Service</span>
                  <span className={styles.progressValue}>
                    ₹{(salesReports.channelBreakdown?.dineIn?.sales || 0).toLocaleString('en-IN')} ({salesReports.channelBreakdown?.dineIn?.percent || 85}%)
                  </span>
                </div>
                <div className={styles.progressBarBg}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${salesReports.channelBreakdown?.dineIn?.percent || 85}%`, background: '#2563eb' }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {salesReports.channelBreakdown?.dineIn?.count || 0} dine-in guests seated
                </span>
              </div>

              {/* Takeaway */}
              <div className={styles.progressItem}>
                <div className={styles.progressMeta}>
                  <span className={styles.progressLabel}>🥡 Takeaway / Parcel</span>
                  <span className={styles.progressValue}>
                    ₹{(salesReports.channelBreakdown?.takeaway?.sales || 0).toLocaleString('en-IN')} ({salesReports.channelBreakdown?.takeaway?.percent || 15}%)
                  </span>
                </div>
                <div className={styles.progressBarBg}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${salesReports.channelBreakdown?.takeaway?.percent || 15}%`, background: '#10b981' }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {salesReports.channelBreakdown?.takeaway?.count || 0} takeaway packages fulfilled
                </span>
              </div>
            </div>

            {/* Quick KPI Highlights */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: 8 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Avg Dine-in Bill</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  ₹{Math.round((salesReports.channelBreakdown?.dineIn?.sales || 0) / (salesReports.channelBreakdown?.dineIn?.count || 1))}
                </span>
              </div>
              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: 8 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Avg Parcel Bill</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  ₹{Math.round((salesReports.channelBreakdown?.takeaway?.sales || 0) / (salesReports.channelBreakdown?.takeaway?.count || 1))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 3: ORDER REPORTS (QR vs POS, Completed, Cancelled, Pending)
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSubTab === 'all' || activeSubTab === 'orders') && orderReports && (
        <div className={styles.twoColGrid}>
          {/* Order Channels & Statuses */}
          <div className={styles.panelBox}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.sectionTitle}>🧾 Order Channels &amp; Verification</h3>
                <p className={styles.subHeading}>Self-service Table QR Orders vs POS Punched Orders</p>
              </div>
              <span className={styles.badgePill}>{orderReports.total} Total Orders</span>
            </div>

            <div className={styles.progressList}>
              <div className={styles.progressItem}>
                <div className={styles.progressMeta}>
                  <span className={styles.progressLabel}>📱 Table QR Orders (Digital Self-Ordering)</span>
                  <span className={styles.progressValue}>
                    {orderReports.qr?.count} orders ({orderReports.qr?.percent}%)
                  </span>
                </div>
                <div className={styles.progressBarBg}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${orderReports.qr?.percent}%`, background: '#8b5cf6' }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Revenue: ₹{(orderReports.qr?.sales || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className={styles.progressItem}>
                <div className={styles.progressMeta}>
                  <span className={styles.progressLabel}>💻 POS Cashier / Captain Orders</span>
                  <span className={styles.progressValue}>
                    {orderReports.pos?.count} orders ({orderReports.pos?.percent}%)
                  </span>
                </div>
                <div className={styles.progressBarBg}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${orderReports.pos?.percent}%`, background: '#0284c7' }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Revenue: ₹{(orderReports.pos?.sales || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Status Grid */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, padding: '0.8rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>COMPLETED</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981', margin: '0.2rem 0' }}>
                  {orderReports.status?.completed?.count}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{orderReports.status?.completed?.percent}% success</span>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: '0.8rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>CANCELLED / VOID</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ef4444', margin: '0.2rem 0' }}>
                  {orderReports.status?.cancelled?.count}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Loss: ₹{(orderReports.status?.cancelled?.lossAmount || 0).toLocaleString('en-IN')}</span>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, padding: '0.8rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>PENDING / ACTIVE</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f59e0b', margin: '0.2rem 0' }}>
                  {orderReports.status?.pending?.count}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>In kitchen / billing</span>
              </div>
            </div>
          </div>

          {/* Fulfillment Speed & Turnaround */}
          <div className={styles.panelBox}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.sectionTitle}>⚡ Service &amp; Kitchen Speed</h3>
                <p className={styles.subHeading}>Turnaround times from KOT punch to serving</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-card-subtle)', padding: '1rem', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>🍳 Avg Kitchen Prep Time</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>KOT firing to KDS 'Ready' chime</span>
                </div>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb' }}>
                  {orderReports.fulfillment?.avgKitchenPrepMinutes} mins
                </span>
              </div>

              <div style={{ background: 'var(--bg-card-subtle)', padding: '1rem', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>🪑 Avg Dining Duration</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Guest seated to bill payment</span>
                </div>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
                  {orderReports.fulfillment?.avgDiningTurnMinutes} mins
                </span>
              </div>

              <div style={{ background: 'var(--bg-card-subtle)', padding: '1rem', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>🎯 On-Time Delivery Rate</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Orders delivered within target SLA</span>
                </div>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6' }}>
                  {orderReports.fulfillment?.onTimeRatePercent}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 4: POPULAR MENU ITEMS (Best & Least Sellers, Margins)
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSubTab === 'all' || activeSubTab === 'menu') && menuData && (
        <div className={styles.panelBox}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.sectionTitle}>🍽️ Menu Delicacies &amp; Item Profitability</h3>
              <p className={styles.subHeading}>Best-sellers, slow-moving dishes, quantities sold, and margin contribution</p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <input
                type="text"
                placeholder="Search dish name / category..."
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
                style={{
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                }}
              />
              <button
                type="button"
                className={styles.btnAction}
                onClick={() => handleExportCsv('menu')}
              >
                📥 Export Menu CSV
              </button>
            </div>
          </div>

          <div className={styles.twoColGrid} style={{ marginBottom: '1.5rem' }}>
            {/* Top 5 Best Sellers Card */}
            <div style={{ background: 'var(--bg-card-subtle)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.92rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🔥 Best-Selling Dishes (Top Grossing)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {menuData.topSelling?.slice(0, 5).map((dish, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>#{i + 1} {dish.title}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>{dish.category} • ₹{dish.unitPrice}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: '#10b981' }}>{dish.quantity} sold</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>₹{dish.revenue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Least 5 Selling Dishes Card */}
            <div style={{ background: 'var(--bg-card-subtle)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.92rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                ⚠️ Slow-Moving Dishes (Needs Attention)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {menuData.leastSelling?.slice(0, 5).map((dish, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{dish.title}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>{dish.category} • ₹{dish.unitPrice}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={styles.badgeWarning}>{dish.quantity} sold</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>₹{dish.revenue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Granular Menu Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Dish Delicacy</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Quantity Sold</th>
                  <th>Total Revenue</th>
                  <th>Cost of Goods</th>
                  <th>Gross Margin</th>
                  <th>Performance Badge</th>
                </tr>
              </thead>
              <tbody>
                {filteredDishes.map((dish, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className={styles.dishCell}>
                        <div className={styles.dishThumb}>
                          {dish.category === 'Tiffin' ? '🥞' : dish.category === 'Meals' ? '🍛' : dish.category === 'Beverages' ? '☕' : '🧆'}
                        </div>
                        <div>
                          <div className={styles.dishName}>{dish.title}</div>
                          <div className={styles.dishTamil}>{dish.tamilTitle}</div>
                        </div>
                      </div>
                    </td>
                    <td>{dish.category}</td>
                    <td>₹{dish.unitPrice}</td>
                    <td style={{ fontWeight: 700 }}>{dish.quantity} units</td>
                    <td style={{ fontWeight: 800, color: 'var(--accent-green)' }}>
                      ₹{dish.revenue.toLocaleString('en-IN')}
                    </td>
                    <td>₹{(dish.costPrice * dish.quantity).toLocaleString('en-IN')}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#3b82f6' }}>
                        ₹{dish.margin.toLocaleString('en-IN')} ({dish.marginPercent}%)
                      </span>
                    </td>
                    <td>
                      {dish.quantity > 50 ? (
                        <span className={styles.badgeSuccess}>🔥 Bestseller</span>
                      ) : dish.quantity > 20 ? (
                        <span className={styles.badgeInfo}>⭐ Regular</span>
                      ) : (
                        <span className={styles.badgeWarning}>⚡ Low Volume</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 5: PAYMENT REPORTS (UPI, Cash, Card, Online, Settlements)
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSubTab === 'all' || activeSubTab === 'payments') && payments && (
        <div className={styles.twoColGrid}>
          {/* Payment Methods */}
          <div className={styles.panelBox}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.sectionTitle}>💳 Payment Methods Breakdown</h3>
                <p className={styles.subHeading}>Settlement channels across UPI, Cash, Cards &amp; QR</p>
              </div>
            </div>

            <div className={styles.progressList}>
              {payments.breakdown?.map((pay, i) => (
                <div key={i} className={styles.progressItem}>
                  <div className={styles.progressMeta}>
                    <span className={styles.progressLabel}>
                      {pay.mode === 'UPI' ? '📱' : pay.mode === 'CASH' ? '💵' : pay.mode === 'CARD' ? '💳' : '🌐'} {pay.label}
                    </span>
                    <span className={styles.progressValue}>
                      ₹{pay.amount.toLocaleString('en-IN')} ({pay.percent}%)
                    </span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{
                        width: `${pay.percent}%`,
                        background: pay.mode === 'UPI' ? '#10b981' : pay.mode === 'CASH' ? '#3b82f6' : pay.mode === 'CARD' ? '#8b5cf6' : '#06b6d4'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>{pay.count} successful transactions</span>
                    <span>Avg Ticket: ₹{pay.avgBill}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settlement Reconciliation */}
          <div className={styles.panelBox}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.sectionTitle}>⚖️ Daily Settlement Audit</h3>
                <p className={styles.subHeading}>Cashier drawer reconciliation &amp; pending payments</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 8, padding: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>✓ Total Settled Revenue</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', margin: '0.25rem 0' }}>
                  ₹{(payments.settlementStatus?.settled?.amount || 0).toLocaleString('en-IN')}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {payments.settlementStatus?.settled?.count} bills closed and accounted
                </span>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 8, padding: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b' }}>⏳ Pending / Table Orders</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', margin: '0.25rem 0' }}>
                  ₹{(payments.settlementStatus?.pending?.amount || 0).toLocaleString('en-IN')}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {payments.settlementStatus?.pending?.count} active orders currently on tables
                </span>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 8, padding: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444' }}>✕ Void / Cancelled Value</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444', margin: '0.25rem 0' }}>
                  ₹{(payments.settlementStatus?.failed?.amount || 0).toLocaleString('en-IN')}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {payments.settlementStatus?.failed?.count} voided order items
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 6: PROFIT & EXPENSE ANALYSIS (COGS, OpEx, Net Margins)
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSubTab === 'all' || activeSubTab === 'profit') && profitAnalysis && (
        <div className={styles.panelBox}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.sectionTitle}>💰 Profit &amp; Expense Composition (P&amp;L)</h3>
              <p className={styles.subHeading}>Direct ingredient costs (COGS), operating expenses, and net profit margins</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={styles.badgeSuccess} style={{ fontSize: '0.85rem' }}>
                Net Margin: {profitAnalysis.netMarginPercent}%
              </span>
            </div>
          </div>

          {/* Visual Waterfall Composition Bar */}
          <div className={styles.waterfallBar}>
            <div
              className={styles.waterfallSegment}
              style={{
                width: `${Math.round(((profitAnalysis.cogs || 1) / (profitAnalysis.revenue || 1)) * 100)}%`,
                background: '#ef4444'
              }}
              title="COGS / Ingredients"
            >
              COGS ({Math.round(((profitAnalysis.cogs || 1) / (profitAnalysis.revenue || 1)) * 100)}%)
            </div>
            <div
              className={styles.waterfallSegment}
              style={{
                width: `${Math.round(((profitAnalysis.operatingExpenses || 1) / (profitAnalysis.revenue || 1)) * 100)}%`,
                background: '#f59e0b'
              }}
              title="Operating Expenses"
            >
              OpEx ({Math.round(((profitAnalysis.operatingExpenses || 1) / (profitAnalysis.revenue || 1)) * 100)}%)
            </div>
            <div
              className={styles.waterfallSegment}
              style={{
                width: `${Math.max(10, profitAnalysis.netMarginPercent)}%`,
                background: '#10b981'
              }}
              title="Net Profit"
            >
              Net Profit ({profitAnalysis.netMarginPercent}%)
            </div>
          </div>

          <div className={styles.waterfallLegend}>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ background: '#ef4444' }} />
              <span>Direct Ingredients / COGS: <strong>₹{(profitAnalysis.cogs || 0).toLocaleString('en-IN')}</strong></span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ background: '#f59e0b' }} />
              <span>Operating Expenses (Labor, LPG, Electricity, Rent): <strong>₹{(profitAnalysis.operatingExpenses || 0).toLocaleString('en-IN')}</strong></span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ background: '#10b981' }} />
              <span>Net Profit: <strong>₹{(profitAnalysis.netProfit || 0).toLocaleString('en-IN')}</strong></span>
            </div>
          </div>

          {/* Detailed Expense Category Breakdown */}
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
            {profitAnalysis.expenseCategories?.map((cat, i) => (
              <div key={i} style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                  ₹{(cat.amount || 0).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Expense Ledger Entries */}
          {profitAnalysis.recentExpenses && profitAnalysis.recentExpenses.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>📋 Recent Operating Expense Entries</h4>
                <button type="button" className={styles.btnAction} onClick={() => handleExportCsv('expenses')}>
                  📥 Export Expense Ledger
                </button>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Expense Item</th>
                      <th>Category</th>
                      <th>Payee / Vendor</th>
                      <th>Amount</th>
                      <th>Payment Mode</th>
                      <th>Invoice Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitAnalysis.recentExpenses.map((exp, idx) => (
                      <tr key={idx}>
                        <td>{exp.date}</td>
                        <td style={{ fontWeight: 600 }}>{exp.title}</td>
                        <td><span className={styles.badgeInfo}>{exp.category}</span></td>
                        <td>{exp.payee}</td>
                        <td style={{ fontWeight: 800, color: '#ef4444' }}>₹{exp.amount.toLocaleString('en-IN')}</td>
                        <td>{exp.paymentMode}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{exp.invoiceRef}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 7: INVENTORY REPORTS (Usage, Wastage, Low Stock)
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSubTab === 'all' || activeSubTab === 'inventory') && inventoryData && (
        <div className={styles.twoColGrid}>
          {/* Stock Consumption & Valuation */}
          <div className={styles.panelBox}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.sectionTitle}>📦 Stock Consumption &amp; Usage</h3>
                <p className={styles.subHeading}>Recipe BOM ingredient draw rates and valuation</p>
              </div>
              <span className={styles.badgeSuccess}>
                Total Stock Valuation: ₹{(inventoryData.valuation || 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Used Today</th>
                    <th>Current Stock</th>
                    <th>Rate / Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryData.stockUsage?.map((stk, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{stk.name}</td>
                      <td style={{ color: '#ef4444', fontWeight: 700 }}>{stk.used} {stk.unit}</td>
                      <td style={{ color: '#10b981', fontWeight: 700 }}>{stk.current} {stk.unit}</td>
                      <td>₹{stk.costPerUnit} / {stk.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Wastage & Spoilage Logs */}
          <div className={styles.panelBox}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.sectionTitle}>🗑️ Wastage &amp; Spoilage Loss</h3>
                <p className={styles.subHeading}>Kitchen prep trim, spillage, and discarded batches</p>
              </div>
              <span className={styles.badgeDanger}>
                Total Loss: ₹{(inventoryData.totalWastageCost || 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Qty Wasted</th>
                    <th>Cost Loss</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryData.wastage?.map((w, i) => (
                    <tr key={i}>
                      <td>{w.date}</td>
                      <td style={{ fontWeight: 600 }}>{w.ingredientName}</td>
                      <td>{w.quantity} {w.unit}</td>
                      <td style={{ color: '#ef4444', fontWeight: 700 }}>₹{w.costLoss}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{w.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 8: CUSTOMER ANALYTICS (Retention, Frequency, Ratings)
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSubTab === 'all' || activeSubTab === 'customers') && customerData && (
        <div className={styles.twoColGrid}>
          {/* Customer Retention & Metrics */}
          <div className={styles.panelBox}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.sectionTitle}>👥 Customer Demographics &amp; Loyalty</h3>
                <p className={styles.subHeading}>New vs repeat diners and lifetime guest value</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.85rem', borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>TOTAL DINERS</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {customerData.totalCustomers}
                </div>
              </div>
              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.85rem', borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>RETURNING RATE</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
                  {customerData.returningRate}%
                </div>
              </div>
              <div style={{ background: 'var(--bg-card-subtle)', padding: '0.85rem', borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>AVG SPEND / DINER</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>
                  ₹{customerData.averageCustomerSpend}
                </div>
              </div>
            </div>

            <div className={styles.progressList}>
              <div className={styles.progressItem}>
                <div className={styles.progressMeta}>
                  <span className={styles.progressLabel}>🔁 Repeat Guests (Loyalty Regulars)</span>
                  <span className={styles.progressValue}>
                    {customerData.returningCustomersCount} guests ({customerData.returningRate}%)
                  </span>
                </div>
                <div className={styles.progressBarBg}>
                  <div className={styles.progressBarFill} style={{ width: `${customerData.returningRate}%`, background: '#10b981' }} />
                </div>
              </div>
              <div className={styles.progressItem}>
                <div className={styles.progressMeta}>
                  <span className={styles.progressLabel}>✨ New Diners (First Visit)</span>
                  <span className={styles.progressValue}>
                    {customerData.newCustomersCount} guests (32%)
                  </span>
                </div>
                <div className={styles.progressBarBg}>
                  <div className={styles.progressBarFill} style={{ width: '32%', background: '#3b82f6' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Customer Ratings & Feedback */}
          <div className={styles.panelBox}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.sectionTitle}>⭐ Guest Satisfaction &amp; Ratings</h3>
                <p className={styles.subHeading}>Average rating across 342 verified guest reviews</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
                  ★ {customerData.ratings?.average}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>out of 5.0</span>
              </div>
            </div>

            {/* Rating Stars Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem' }}>
              {customerData.ratings?.distribution?.map(r => (
                <div key={r.star} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem' }}>
                  <span style={{ width: '45px', color: 'var(--text-secondary)' }}>{r.star} ★</span>
                  <div className={styles.progressBarBg} style={{ flex: 1, height: 6 }}>
                    <div className={styles.progressBarFill} style={{ width: `${r.percent}%`, background: '#f59e0b' }} />
                  </div>
                  <span style={{ width: '35px', textAlign: 'right', color: 'var(--text-muted)' }}>{r.percent}%</span>
                </div>
              ))}
            </div>

            {/* Recent Guest Reviews Snippet */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {customerData.recentReviews?.slice(0, 2).map((rev, i) => (
                <div key={i} style={{ background: 'var(--bg-card-subtle)', padding: '0.65rem 0.85rem', borderRadius: 8, fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <span>{rev.customerName}</span>
                    <span style={{ color: '#f59e0b' }}>{'★'.repeat(rev.rating)}</span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)' }}>"{rev.comment}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 9: STAFF PERFORMANCE
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSubTab === 'all' || activeSubTab === 'staff') && (
        <div className={styles.panelBox}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.sectionTitle}>👨‍🍳 Staff Productivity &amp; Service Metrics</h3>
              <p className={styles.subHeading}>Orders handled, turnaround speed, and sales performance by role</p>
            </div>
            <button type="button" className={styles.btnAction} onClick={() => handleExportCsv('staff')}>
              📥 Export Staff CSV
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Orders Handled</th>
                  <th>Total Sales Handled</th>
                  <th>Avg Service Time</th>
                  <th>Guest Rating</th>
                  <th>On-Time Compliance</th>
                </tr>
              </thead>
              <tbody>
                {staffData.map((staff, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700 }}>{staff.name}</td>
                    <td><span className={styles.badgeInfo}>{staff.role}</span></td>
                    <td style={{ fontWeight: 700 }}>{staff.ordersHandled} orders</td>
                    <td style={{ fontWeight: 800, color: 'var(--accent-green)' }}>
                      ₹{staff.salesHandled.toLocaleString('en-IN')}
                    </td>
                    <td>{staff.avgServiceTimeMins} mins</td>
                    <td style={{ color: '#f59e0b', fontWeight: 700 }}>★ {staff.rating}</td>
                    <td><span className={styles.badgeSuccess}>{staff.onTimeRate}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 10: PEAK HOURS ANALYSIS
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSubTab === 'all' || activeSubTab === 'peak') && peakData && (
        <div className={styles.panelBox}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.sectionTitle}>⏰ Peak Hours &amp; Rush Period Analysis</h3>
              <p className={styles.subHeading}>Identify high-demand hourly windows and busiest days of the week</p>
            </div>
          </div>

          <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            24-HOUR HOURLY RUSH HEATMAP (7:00 AM - 11:00 PM)
          </h4>
          <div className={styles.heatmapGrid}>
            {peakData.hourlyHeatmap?.map((slot, idx) => {
              const isSuper = slot.rushType === 'SUPER_PEAK';
              const isPeak = slot.rushType === 'PEAK';

              return (
                <div
                  key={idx}
                  className={styles.heatSlotCard}
                  style={{
                    borderColor: isSuper ? '#ef4444' : isPeak ? '#f59e0b' : 'var(--border-subtle)',
                    background: isSuper ? 'rgba(239, 68, 68, 0.08)' : isPeak ? 'rgba(245, 158, 11, 0.06)' : 'var(--bg-card-subtle)'
                  }}
                >
                  <div className={styles.heatSlotHour}>{slot.hour}</div>
                  <div className={styles.heatSlotSales}>₹{slot.sales.toLocaleString('en-IN')}</div>
                  <div className={styles.heatSlotOrders}>{slot.orders} orders</div>
                  <span
                    className={styles.heatPeakBadge}
                    style={{
                      background: isSuper ? 'rgba(239, 68, 68, 0.2)' : isPeak ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: isSuper ? '#ef4444' : isPeak ? '#f59e0b' : 'var(--text-muted)'
                    }}
                  >
                    {slot.rushBadge}
                  </span>
                </div>
              );
            })}
          </div>

          <h4 style={{ margin: '1.5rem 0 0.8rem 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            DAY-OF-WEEK REVENUE &amp; TABLE DEMAND (MONDAY - SUNDAY)
          </h4>
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Day of Week</th>
                  <th>Average Sales</th>
                  <th>Average Occupancy</th>
                  <th>Rush Intensity Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {peakData.dayOfWeekDistribution?.map((d, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700 }}>{d.day}</td>
                    <td style={{ fontWeight: 800, color: 'var(--accent-green)' }}>
                      ₹{d.avgSales.toLocaleString('en-IN')}
                    </td>
                    <td>{d.occupancy}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className={styles.progressBarBg} style={{ width: 100, height: 6 }}>
                          <div
                            className={styles.progressBarFill}
                            style={{ width: `${d.rushScore * 10}%`, background: d.isBusiest ? '#ef4444' : '#3b82f6' }}
                          />
                        </div>
                        <span>{d.rushScore} / 10</span>
                      </div>
                    </td>
                    <td>
                      {d.isBusiest ? (
                        <span className={styles.badgeDanger}>👑 Weekend Raja Feast Peak</span>
                      ) : (
                        <span className={styles.badgeInfo}>Weekday Steady</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 11: TABLE PERFORMANCE
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSubTab === 'all' || activeSubTab === 'tables') && tableData && (
        <div className={styles.panelBox}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.sectionTitle}>🪑 Table Occupancy, Turnover &amp; RevPASH</h3>
              <p className={styles.subHeading}>Table turns, average dining time, and sales per seating arrangement</p>
            </div>
            <button type="button" className={styles.btnAction} onClick={() => handleExportCsv('tables')}>
              📥 Export Tables CSV
            </button>
          </div>

          {/* Section Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {tableData.sectionStats?.map((sec, idx) => (
              <div key={idx} style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '1rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{sec.name}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-green)' }}>
                    ₹{sec.sales.toLocaleString('en-IN')}
                  </span>
                  <span className={styles.badgeSuccess}>{sec.occupancy}% Occupancy</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  <span>{sec.tableCount} Tables ({sec.capacity} Seats)</span>
                  <span>Avg {sec.avgTurn} turns / day</span>
                </div>
              </div>
            ))}
          </div>

          {/* Individual Table Leaderboard */}
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Table #</th>
                  <th>Floor Section</th>
                  <th>Capacity</th>
                  <th>Turns Today</th>
                  <th>Total Sales</th>
                  <th>Avg Dining Time</th>
                  <th>Occupancy Rate</th>
                </tr>
              </thead>
              <tbody>
                {tableData.tableLeaderboard?.map((t, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 800, color: 'var(--accent-blue)' }}>TABLE #{t.tableNumber}</td>
                    <td>{t.section}</td>
                    <td>{t.capacity} guests</td>
                    <td style={{ fontWeight: 700 }}>{t.turns} turns</td>
                    <td style={{ fontWeight: 800, color: 'var(--accent-green)' }}>
                      ₹{t.sales.toLocaleString('en-IN')}
                    </td>
                    <td>{t.avgDurationMinutes} mins</td>
                    <td>
                      <span className={t.occupancyRate >= 80 ? styles.badgeSuccess : styles.badgeInfo}>
                        {t.occupancyRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 13: EXPORT & REPORTS DOWNLOAD CENTER
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSubTab === 'all' || activeSubTab === 'export') && (
        <div className={styles.panelBox}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.sectionTitle}>📥 Export &amp; Download Center</h3>
              <p className={styles.subHeading}>One-click downloads formatted for Accounting, Tally, Excel &amp; Audits</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.4rem' }}>📄</span>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Sales &amp; Settlement Report</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.3rem 0 1rem 0' }}>
                  Detailed bill-by-bill breakdown with CGST, SGST, discounts, and settlement modes.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className={`${styles.btnAction} ${styles.btnPrimary}`} onClick={() => handleExportCsv('sales')}>
                  Download CSV
                </button>
                <button type="button" className={styles.btnAction} onClick={() => handleExportExcel('sales')}>
                  Excel
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.4rem' }}>🍽️</span>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Menu Delicacies &amp; Margins</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.3rem 0 1rem 0' }}>
                  Quantities sold, food cost per dish, profit margins, and category contribution.
                </p>
              </div>
              <button type="button" className={`${styles.btnAction} ${styles.btnPrimary}`} onClick={() => handleExportCsv('menu')}>
                Download Menu CSV
              </button>
            </div>

            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.4rem' }}>💰</span>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Operating Expense Ledger</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.3rem 0 1rem 0' }}>
                  Ingredients, dairy, LPG, payroll, rent, utilities, and tax deductible costs.
                </p>
              </div>
              <button type="button" className={`${styles.btnAction} ${styles.btnPrimary}`} onClick={() => handleExportCsv('expenses')}>
                Download Expense CSV
              </button>
            </div>

            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.4rem' }}>🖨️</span>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Executive PDF Report</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.3rem 0 1rem 0' }}>
                  Branded Sri Gokulam executive summary formatted for A4 or thermal printer roll.
                </p>
              </div>
              <button type="button" className={`${styles.btnAction} ${styles.btnSuccess}`} onClick={() => setShowPrintModal(true)}>
                Generate Printable PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Custom Date Modal ─── */}
      {showCustomModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>📅 Select Custom Date Range</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowCustomModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Start Date</label>
              <input
                type="date"
                className={styles.dateInput}
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>End Date</label>
              <input
                type="date"
                className={styles.dateInput}
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
              />
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnAction}
                onClick={() => setShowCustomModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btnAction} ${styles.btnPrimary}`}
                onClick={() => {
                  setPeriod('custom');
                  setShowCustomModal(false);
                  fetchReport('custom', customStart, customEnd);
                }}
              >
                Apply Date Range
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Printable Executive Report Preview Modal ─── */}
      {showPrintModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalBox} style={{ maxWidth: '800px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>🖨️ Sri Gokulam Executive Report Preview</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowPrintModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.printPreviewArea} id="executive-print-slip">
              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>SRI GOKULAM VEG RESTAURANT</h2>
                <p style={{ margin: '0.2rem 0', fontSize: '0.85rem' }}>Authentic Chettinad Delicacies &amp; Pure Vegetarian Dining</p>
                <p style={{ margin: '0.1rem 0', fontSize: '0.8rem' }}>Mudiyarasan Rd, near Bharat Petroleum Bunk and Thevar Silai, Sekkalai, Karaikudi - 630003 | Ph: +91 73583 25113</p>
                <p style={{ margin: '0.1rem 0', fontSize: '0.8rem' }}>GSTIN: 33AABCS1234F1Z8 | FSSAI: 12423018000456</p>
                <div style={{ marginTop: '0.5rem', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                  EXECUTIVE PERFORMANCE &amp; SALES AUDIT REPORT
                </div>
                <div style={{ fontSize: '0.8rem', color: '#555' }}>
                  Period: {data?.periodInfo?.label} • Sri Gokulam Audit Engine
                </div>
              </div>

              {/* Financial Summary */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', borderBottom: '1px solid #ccc', paddingBottom: '0.2rem' }}>1. FINANCIAL REVENUE SUMMARY</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div>Gross Restaurant Sales:</div>
                  <div style={{ textAlign: 'right', fontWeight: 700 }}>₹{(overview?.totalSales || 0).toLocaleString('en-IN')}</div>
                  <div>Customer Discounts Given:</div>
                  <div style={{ textAlign: 'right' }}>(-) ₹{(overview?.discountsGiven || 0).toLocaleString('en-IN')}</div>
                  <div>GST Collected (CGST 2.5% + SGST 2.5%):</div>
                  <div style={{ textAlign: 'right' }}>₹{((overview?.cgstTotal || 0) + (overview?.sgstTotal || 0)).toLocaleString('en-IN')}</div>
                  <div>Total Settled Orders:</div>
                  <div style={{ textAlign: 'right', fontWeight: 700 }}>{overview?.totalOrders || 0} bills</div>
                  <div>Average Bill Value (ABV):</div>
                  <div style={{ textAlign: 'right', fontWeight: 700 }}>₹{overview?.averageBillValue || 0}</div>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '0.3rem', fontWeight: 800 }}>ESTIMATED NET PROFIT:</div>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '0.3rem', textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                    ₹{(overview?.estimatedProfit || 0).toLocaleString('en-IN')} ({overview?.profitMarginPercent || 38}%)
                  </div>
                </div>
              </div>

              {/* Top 5 Delicacies */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', borderBottom: '1px solid #ccc', paddingBottom: '0.2rem' }}>2. TOP SELLING DELICACIES</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #999', textAlign: 'left' }}>
                      <th style={{ padding: '0.3rem 0' }}>Item Name</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Qty Sold</th>
                      <th style={{ textAlign: 'right' }}>Revenue (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuData?.topSelling?.slice(0, 5).map((dish, i) => (
                      <tr key={i} style={{ borderBottom: '1px dashed #ddd' }}>
                        <td style={{ padding: '0.3rem 0', fontWeight: 600 }}>{dish.title}</td>
                        <td>{dish.category}</td>
                        <td style={{ textAlign: 'right' }}>{dish.quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{dish.revenue.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Operating Expenses */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', borderBottom: '1px solid #ccc', paddingBottom: '0.2rem' }}>3. EXPENSE &amp; COST BREAKDOWN</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.82rem' }}>
                  <div>Raw Ingredients &amp; Dairy Procurement:</div>
                  <div style={{ textAlign: 'right' }}>₹{(profitAnalysis?.cogs || 0).toLocaleString('en-IN')}</div>
                  <div>Operating Expenses (Payroll, LPG, Electricity, Rent):</div>
                  <div style={{ textAlign: 'right' }}>₹{(profitAnalysis?.operatingExpenses || 0).toLocaleString('en-IN')}</div>
                  <div style={{ fontWeight: 700 }}>Total Expenditures:</div>
                  <div style={{ textAlign: 'right', fontWeight: 700 }}>₹{(overview?.totalExpenses || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #000', fontSize: '0.8rem' }}>
                <div>Prepared By: Rajan (POS Cashier)</div>
                <div>Verified By: Karthikeyan (Manager)</div>
                <div>Authorized: Super Admin / Owner</div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnAction}
                onClick={() => setShowPrintModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className={`${styles.btnAction} ${styles.btnPrimary}`}
                onClick={() => {
                  window.print();
                }}
              >
                🖨️ Print Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
