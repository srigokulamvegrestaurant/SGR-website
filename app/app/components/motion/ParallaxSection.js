/**
 * motion/ParallaxSection.js — Hero/section parallax wrapper (client component)
 * Sri Gokulam Veg Restaurant
 *
 * Creates a subtle parallax depth effect on a background image using
 * pure CSS transform (translate3d). Only uses transform — no layout shift.
 *
 * Props:
 *   children    — section content (renders on top of the parallax layer)
 *   bgUrl       — background image URL
 *   speed       — parallax speed factor 0–1 (default 0.35; 0 = no parallax)
 *   className   — additional class on the wrapper
 *   style       — additional styles on the wrapper
 *   minHeight   — min-height string (default '500px')
 *   id          — section id for anchor links
 *
 * Disabled on:
 *   - prefers-reduced-motion
 *   - touch devices (mobile)
 *   - screens narrower than 768px
 *
 * To DISABLE: set speed={0} or remove component.
 */
'use client';

import { useEffect, useRef } from 'react';
import styles from './ParallaxSection.module.css';

export default function ParallaxSection({
  children,
  bgUrl,
  speed = 0.35,
  className = '',
  style = {},
  minHeight = '500px',
  id,
}) {
  const bgRef = useRef(null);
  const sectionRef = useRef(null);
  const rafRef = useRef(null);
  const activeRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const isSmall = window.innerWidth < 768;

    if (reduced || isTouch || isSmall) return;

    const bg = bgRef.current;
    const section = sectionRef.current;
    if (!bg || !section) return;

    const clampedSpeed = Math.max(0, Math.min(1, speed));

    const updateParallax = () => {
      const rect = section.getBoundingClientRect();
      const viewH = window.innerHeight;

      // Only apply when section is in view
      if (rect.bottom < 0 || rect.top > viewH) {
        activeRef.current = false;
        return;
      }

      activeRef.current = true;
      // Progress: -1 (section below fold) → 0 (centred) → 1 (section above fold)
      const progress = (rect.top - viewH / 2) / viewH;
      const translate = progress * clampedSpeed * 80; // max ~80px shift
      bg.style.transform = `translate3d(0, ${translate}px, 0)`;
    };

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateParallax);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    updateParallax(); // Initial paint

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [speed]);

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`${styles.parallaxSection} ${className}`}
      style={{ minHeight, ...style }}
    >
      {/* Parallax background layer */}
      {bgUrl && (
        <div
          ref={bgRef}
          className={styles.parallaxBg}
          style={{
            backgroundImage: `url(${bgUrl})`,
          }}
          aria-hidden="true"
          role="presentation"
        />
      )}

      {/* Content on top */}
      <div className={styles.parallaxContent}>{children}</div>
    </section>
  );
}
