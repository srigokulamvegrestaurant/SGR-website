'use client';

/**
 * ClientProviders.js — Client-only providers mounted in the root layout
 * Sri Gokulam Veg Restaurant
 *
 * Groups all "use client" providers that need to run in the root layout
 * but cannot live in the Server Component layout.js directly.
 * CursorGlow is loaded lazily (ssr: false) to avoid window access during SSR.
 */

import dynamic from 'next/dynamic';
import SmoothScroll from './motion/SmoothScroll';

// CursorGlow accesses window/pointer APIs — must be client-only
const CursorGlow = dynamic(() => import('./motion/CursorGlow'), {
  ssr: false,
  loading: () => null,
});

export default function ClientProviders({ children }) {
  return (
    <>
      {/* Warm cursor glow — desktop/fine-pointer only */}
      <CursorGlow />
      {/* Lenis smooth scroll — disables on touch & reduced-motion */}
      <SmoothScroll>
        {children}
      </SmoothScroll>
    </>
  );
}
