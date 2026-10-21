'use client';

import { useMemo, useEffect, useRef } from 'react';
import styles from './FloatingParticles.module.css';

/**
 * FloatingParticles — Lightweight, GPU-accelerated ambient golden particles
 * Generates delicate floating ghee sparkles and golden dust that add luxury depth
 * to Sri Gokulam's hero and heritage sections without impacting CPU performance.
 *
 * Enhancements:
 *   - Pauses animation when the browser tab is hidden (visibilitychange)
 *   - Caps count at 8 on narrow screens (< 640px) for mobile performance
 *   - Respects prefers-reduced-motion via CSS
 */
export default function FloatingParticles({ count = 16, className = '' }) {
  const containerRef = useRef(null);

  // Keep particle count consistent between server and client during SSR hydration.
  // Mobile performance optimization (capping to 8 particles) is handled via CSS in FloatingParticles.module.css.
  const effectiveCount = count;

  const particles = useMemo(() => {
    return Array.from({ length: effectiveCount }, (_, i) => {
      const size = Math.floor(4 + (i % 5) * 2.5); // 4px to 14px
      const left = ((i * 100) / effectiveCount + (i % 3) * 4) % 100; // Spread across 0–100%
      const duration = 8 + (i % 6) * 2.5; // 8s to 20s
      const delay = (i % 7) * 1.2; // Staggered: 0s to 7.2s
      const opacity = 0.25 + (i % 4) * 0.15; // Subtle 0.25 to 0.7
      const drift = (i % 2 === 0 ? 1 : -1) * (15 + (i % 4) * 8); // Horizontal drift

      return {
        id: i,
        style: {
          width: `${size}px`,
          height: `${size}px`,
          left: `${left}%`,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          opacity,
          '--drift': `${drift}px`,
        },
      };
    });
  }, [effectiveCount]);

  // Pause all particle animations when the browser tab is hidden to save CPU
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleVisibility = () => {
      const state = document.hidden ? 'paused' : '';
      container.style.animationPlayState = state;
      container.querySelectorAll('span').forEach((el) => {
        el.style.animationPlayState = state;
      });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`${styles.particlesContainer} ${className}`}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <span key={p.id} className={styles.particle} style={p.style} />
      ))}
    </div>
  );
}
