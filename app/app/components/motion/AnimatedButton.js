/**
 * motion/AnimatedButton.js — Reusable animated CTA button (client component)
 * Sri Gokulam Veg Restaurant
 *
 * Features:
 *   - Press/scale feedback (CSS transform)
 *   - Shine sweep on idle or hover
 *   - Icon nudge on hover
 *   - Loading state (spinner)
 *   - Success state (checkmark flash)
 *   - Warm gold glow matching brand palette
 *
 * Props:
 *   children    — button content
 *   onClick     — async or sync handler; if async, loading state is automatic
 *   className   — additional CSS classes
 *   style       — inline styles
 *   variant     — 'gold' | 'navy' | 'outline'  (default 'gold')
 *   icon        — emoji or ReactNode to show at left; nudges on hover
 *   disabled    — disables the button
 *   type        — 'button' | 'submit' | 'reset' (default 'button')
 *   successMsg  — short text shown on success (default '✓ Done')
 *   id          — forwarded for accessibility / analytics
 *
 * To DISABLE animations: add `data-no-anim` attr; the CSS guards it.
 */
'use client';

import { useState, useCallback } from 'react';
import styles from './AnimatedButton.module.css';

export default function AnimatedButton({
  children,
  onClick,
  className = '',
  style = {},
  variant = 'gold',
  icon,
  disabled = false,
  type = 'button',
  successMsg = '✓ Done',
  id,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleClick = useCallback(
    async (e) => {
      if (!onClick || disabled || isLoading || isSuccess) return;

      const result = onClick(e);

      // Auto loading/success only for async (Promise-returning) handlers
      if (result && typeof result.then === 'function') {
        setIsLoading(true);
        try {
          await result;
          setIsLoading(false);
          setIsSuccess(true);
          setTimeout(() => setIsSuccess(false), 1800);
        } catch {
          setIsLoading(false);
        }
      }
    },
    [onClick, disabled, isLoading, isSuccess]
  );

  const variantClass = {
    gold: styles.variantGold,
    navy: styles.variantNavy,
    outline: styles.variantOutline,
  }[variant] || styles.variantGold;

  return (
    <button
      id={id}
      type={type}
      disabled={disabled || isLoading}
      className={[
        styles.btn,
        variantClass,
        isLoading ? styles.loading : '',
        isSuccess ? styles.success : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onClick={handleClick}
      aria-busy={isLoading}
      aria-label={isLoading ? 'Loading…' : isSuccess ? successMsg : undefined}
    >
      {/* Shine sweep layer */}
      <span className={styles.shine} aria-hidden="true" />

      {/* Icon with nudge */}
      {icon && !isLoading && !isSuccess && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <span className={styles.spinner} aria-hidden="true" />
      )}

      {/* Success flash */}
      {isSuccess && (
        <span className={styles.successIcon} aria-hidden="true">✓</span>
      )}

      {/* Label */}
      <span className={styles.label}>
        {isLoading ? 'Loading…' : isSuccess ? successMsg : children}
      </span>
    </button>
  );
}
