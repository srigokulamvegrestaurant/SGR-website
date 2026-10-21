'use client';

import { useEffect } from 'react';

/**
 * ScrollRevealInit — Universal Scroll-Triggered Reveal & Parallax Engine
 * Sri Gokulam Veg Restaurant
 *
 * Uses IntersectionObserver to drive the CSS data-reveal / .reveal-on-scroll
 * system defined in globals.css and motion.module.css.
 *
 * Responsibilities:
 *   1. Observe all [data-reveal], .reveal-on-scroll, and .reveal-stagger elements
 *   2. Add .is-revealed when they enter the viewport
 *   3. Unobserve after first reveal (once: true behaviour)
 *   4. Re-observe dynamically injected content via MutationObserver
 *   5. Immediately reveal all targets if prefers-reduced-motion is active
 *   6. Respond to live changes in prefers-reduced-motion media query
 *
 * Works alongside the motion/Reveal.js and motion/Stagger.js components —
 * this handles the global CSS class system; those handle React component trees.
 */
export default function ScrollRevealInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reducedMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

    const SELECTORS = '.reveal-on-scroll, [data-reveal], .reveal-stagger > *';

    // Reveal immediately — used in reduced-motion mode
    const revealAll = () => {
      document.querySelectorAll(SELECTORS).forEach((el) => {
        el.classList.add('is-revealed');
      });
    };

    // Set up IntersectionObserver
    let observer;
    const createObserver = () => {
      if (observer) observer.disconnect();

      observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              obs.unobserve(entry.target); // Once revealed, stop watching
            }
          });
        },
        {
          root: null,
          rootMargin: '0px 0px -40px 0px',
          threshold: 0.08,
        }
      );
    };

    const observeAll = () => {
      if (reducedMotionMQ.matches) {
        revealAll();
        return;
      }

      document.querySelectorAll(SELECTORS).forEach((el) => {
        if (!el.classList.contains('is-revealed')) {
          observer.observe(el);
        }
      });
    };

    createObserver();
    observeAll();

    // Re-observe when new DOM content is added (e.g. CMS-driven sections)
    const mutationObserver = new MutationObserver(() => {
      observeAll();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Live response to prefers-reduced-motion changes
    const onReducedMotionChange = (e) => {
      if (e.matches) {
        revealAll();
        if (observer) observer.disconnect();
      } else {
        createObserver();
        observeAll();
      }
    };

    reducedMotionMQ.addEventListener('change', onReducedMotionChange);

    return () => {
      if (observer) observer.disconnect();
      mutationObserver.disconnect();
      reducedMotionMQ.removeEventListener('change', onReducedMotionChange);
    };
  }, []);

  return null;
}
