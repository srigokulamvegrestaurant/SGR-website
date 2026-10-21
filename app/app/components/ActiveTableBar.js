'use client';

import styles from './ActiveTableBar.module.css';

export default function ActiveTableBar({
  selectedTables,
  onOpenQrScanner,
  activeOrder,
  onOpenKotTracker,
}) {
  return (
    <>
      {/* Top Banner: Connected Dining Tables - Only rendered when diner is at a table */}
      {selectedTables && selectedTables.length > 0 && (
        <div className={styles.tableBanner}>
          <div className={styles.bannerInner}>
            <div className={styles.tableInfo}>
              <span className={styles.statusDot}></span>
              <div>
                <strong>
                  Active Dine-In:{' '}
                  {`Table #${selectedTables.join(' & #')}`}
                  {selectedTables.length > 1 && (
                    <span className={styles.joinedTag}> (Joined Family Group)</span>
                  )}
                </strong>
                <small>Dishes added to cart will fire to this table's kitchen ticket</small>
              </div>
            </div>

            <button className={styles.btnChangeTable} onClick={onOpenQrScanner}>
              <span>📸</span> Scan Standee / Join Tables
            </button>
          </div>
        </div>
      )}

      {/* Floating KOT Status Pill (Shown when order is active) */}
      {activeOrder && (
        <div
          className={styles.floatingKotPill}
          onClick={onOpenKotTracker}
          role="button"
          tabIndex={0}
          aria-label="View Active Kitchen Order Ticket"
        >
          <div className={styles.kotPillLeft}>
            <span className={styles.flameIcon}>🔥</span>
            <div>
              <div className={styles.kotPillTitle}>
                {activeOrder.orderId} • Table #{activeOrder.tables.join(' & #')}
              </div>
              <div className={styles.kotPillSub}>
                OTP: <strong>{activeOrder.otp}</strong> •{' '}
                {activeOrder.status === 'otp_pending' ? 'Tell Waiter' : 'Cooking in Kitchen'}
              </div>
            </div>
          </div>

          <button className={styles.btnViewTicket}>
            View KOT ➔
          </button>
        </div>
      )}
    </>
  );
}
