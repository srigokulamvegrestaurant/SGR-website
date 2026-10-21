/**
 * motion/SmoothScroll.js — Lenis smooth scroll provider (client component)
 * Sri Gokulam Veg Restaurant
 *
 * Wraps the page in Lenis smooth scrolling with:
 *   - Anchor-link support (href="#section")
 *   - Sticky-header offset awareness
 *   - Clean destroy on unmount
 *   - Disabled on prefers-reduced-motion
 *   - Disabled on touch devices (native scroll is better)
 *
 * Mounted once in root layout.js. Content is rendered as-is (no visual wrapper).
 *
 * To DISABLE: remove <SmoothScroll> from layout.js.
 * To ADJUST scroll speed: change the `lerp` value (0.1 = very smooth, 0.5 = snappy).
 */
'use client';

import { useEffect } from 'react';

export default function SmoothScroll({ children }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Disable on touch devices and reduced motion
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || prefersReduced) return;

    let lenis;

    async function initLenis() {
      try {
        const { default: Lenis } = await import('lenis');

        lenis = new Lenis({
          lerp: 0.12,          // Smoothing factor (lower = smoother)
          smoothWheel: true,
          wheelMultiplier: 0.9,
          syncTouch: false,    // Don't override native touch scroll
          infinite: false,
        });

        // rAF loop
        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        // Anchor link support with header offset
        const HEADER_OFFSET = 90; // px — adjust to match sticky header height

        document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
          anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (!href || href === '#') return;
            const target = document.querySelector(href);
            if (target) {
              e.preventDefault();
              lenis.scrollTo(target, { offset: -HEADER_OFFSET });
            }
          });
        });
      } catch (err) {
        // Lenis failed to load — graceful degradation to native scroll
        console.warn('[SmoothScroll] Lenis could not be initialised:', err);
      }
    }

    initLenis();

    return () => {
      lenis?.destroy();
    };
  }, []);

  return <>{children}</>;
}
