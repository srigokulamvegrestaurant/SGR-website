'use client';

import { useEffect, useRef } from 'react';
import styles from './MobileToast.module.css';

export default function MobileToast({ toast, onOpenDrawer, onClose }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      if (onCloseRef.current) onCloseRef.current();
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <aside
      className={styles.toastWrap}
      onClick={() => {
        onOpenDrawer();
        onClose();
      }}
      role="status"
      aria-live="polite"
    >
      <div className={styles.toastContent}>
        <div className={styles.toastIcon}>✨</div>
        <div className={styles.toastTextWrap}>
          <div className={styles.toastTitle}>
            {toast.title}
          </div>
          <div className={styles.toastSubtitle}>
            {toast.price ? `₹${toast.price} • Added to Tab` : 'Added to Dining Tab'}
          </div>
        </div>
        <button
          type="button"
          className={styles.toastActionBtn}
          onClick={(e) => {
            e.stopPropagation();
            onOpenDrawer();
            onClose();
          }}
        >
          View Tab ➔
        </button>
      </div>
    </aside>
  );
}
