/**
 * motion/CursorGlow.js — Cursor-follow warm glow (client component, desktop only)
 * Sri Gokulam Veg Restaurant
 *
 * Renders a soft warm-gold aura that follows the cursor on desktop pointer
 * devices. Automatically disabled on:
 *   - Touch devices (pointer: coarse)
 *   - Mobile screens (< 768px)
 *   - prefers-reduced-motion
 *
 * Mounted once in the root layout. No DOM nodes during SSR (ssr:false).
 *
 * To DISABLE: remove <CursorGlow /> from layout.js.
 */
'use client';

import { useEffect, useRef } from 'react';
import styles from './CursorGlow.module.css';

export default function CursorGlow() {
  const glowRef = useRef(null);
  const posRef = useRef({ x: -200, y: -200 });
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only run on true pointer (mouse) devices and wide screens
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const isSmallScreen = window.innerWidth < 768;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isCoarsePointer || isSmallScreen || prefersReduced) return;

    const el = glowRef.current;
    if (!el) return;

    const onMove = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };

    // Smooth follow using rAF
    const loop = () => {
      if (el) {
        el.style.transform = `translate(${posRef.current.x - 150}px, ${posRef.current.y - 150}px)`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    rafRef.current = requestAnimationFrame(loop);

    // Hide when pointer leaves the window
    const onLeave = () => {
      posRef.current = { x: -200, y: -200 };
    };
    document.addEventListener('pointerleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className={styles.cursorGlow}
      aria-hidden="true"
      role="presentation"
    />
  );
}
