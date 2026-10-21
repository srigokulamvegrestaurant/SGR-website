/**
 * motion/Stagger.js — Stagger Container for Card Grids (client component)
 * Sri Gokulam Veg Restaurant
 *
 * Wraps a grid of cards so each child reveals with a staggered delay.
 * Uses only CSS classes — no Framer Motion dependency.
 *
 * Props:
 *   children   — direct children that will be staggered
 *   className  — additional class for the container (e.g., your grid CSS)
 *   style      — forwarded inline styles
 *   step       — delay increment in seconds between children (default 0.08)
 *   variant    — reveal variant per child: 'up'|'scale'|'left'|'right' (default 'up')
 *
 * To DISABLE: replace with a plain <div className={...}>{children}</div>
 */
'use client';

import { useRef, useEffect, useState, Children, cloneElement, isValidElement } from 'react';
import styles from './motion.module.css';

const VARIANT_CLASSES = {
  up: styles.revealUp,
  scale: styles.revealScale,
  left: styles.revealLeft,
  right: styles.revealRight,
};

export default function Stagger({
  children,
  className = '',
  style = {},
  step = 0.08,
  variant = 'up',
}) {
  const containerRef = useRef(null);
  const [triggered, setTriggered] = useState(false);
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.up;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setTriggered(true);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          observer.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -30px 0px', threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const staggeredChildren = Children.map(children, (child, i) => {
    if (!isValidElement(child)) return child;
    return cloneElement(child, {
      className: [
        child.props.className || '',
        styles.revealBase,
        variantClass,
        triggered ? styles.revealVisible : '',
      ]
        .filter(Boolean)
        .join(' '),
      style: {
        ...(child.props.style || {}),
        transitionDelay: triggered ? `${i * step}s` : '0s',
      },
    });
  });

  return (
    <div ref={containerRef} className={className} style={style}>
      {staggeredChildren}
    </div>
  );
}
