/**
 * motion/Reveal.js — Scroll-Triggered Reveal Wrapper (client component)
 * Sri Gokulam Veg Restaurant
 *
 * A lightweight wrapper that applies fade/slide/scale entrance animations
 * when the wrapped element enters the viewport.
 *
 * Props:
 *   variant  — 'up' | 'scale' | 'left' | 'right'  (default 'up')
 *   delay    — extra delay in seconds before reveal   (default 0)
 *   once     — if true, animates only once           (default true)
 *   children — any React children
 *   className — forwarded to the wrapper div
 *   style    — forwarded to the wrapper div
 *
 * To DISABLE: just remove <Reveal> and render children directly.
 */
'use client';

import { useRef, useEffect, useState } from 'react';
import styles from './motion.module.css';

const VARIANT_CLASSES = {
  up: styles.revealUp,
  scale: styles.revealScale,
  left: styles.revealLeft,
  right: styles.revealRight,
};

export default function Reveal({
  children,
  variant = 'up',
  delay = 0,
  once = true,
  className = '',
  style = {},
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Honour prefers-reduced-motion — reveal immediately
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { rootMargin: '0px 0px -40px 0px', threshold: 0.08 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.up;

  return (
    <div
      ref={ref}
      className={`${styles.revealBase} ${variantClass} ${visible ? styles.revealVisible : ''} ${className}`}
      style={{ transitionDelay: delay ? `${delay}s` : undefined, ...style }}
    >
      {children}
    </div>
  );
}
