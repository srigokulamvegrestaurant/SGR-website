'use client';

import styles from './FloatingCart.module.css';

export default function FloatingCart({ cart, onOpenDrawer }) {
  const safeCart = Array.isArray(cart) ? cart : [];
  const totalCount = safeCart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalAmount = safeCart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

  if (totalCount === 0) return null;

  return (
    <div
      className={styles.floatingCart}
      onClick={onOpenDrawer}
      role="button"
      tabIndex={0}
      aria-label={`Active Tab with ${totalCount} items totaling ₹${totalAmount}`}
    >
      {/* Mobile-Only Circular Floating Badge */}
      <div className={styles.mobileCircleWrap}>
        <span className={styles.mobileCartIcon}>🛒</span>
        <span className={styles.mobilePrice}>₹{totalAmount}</span>
        <span className={styles.mobileBadge}>{totalCount}</span>
      </div>

      {/* Desktop Horizontal Pill */}
      <div className={styles.desktopPillWrap}>
        <span className={styles.cartIcon}>🛒</span>
        <span className={styles.cartLabel}>Active Tab:</span>
        <span className={styles.cartCount}>
          {totalCount} {totalCount === 1 ? 'item' : 'items'}
        </span>
        <span className={styles.cartDivider}>•</span>
        <span className={styles.cartTotal}>₹{totalAmount}</span>
      </div>
    </div>
  );
}
