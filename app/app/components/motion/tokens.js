/**
 * motion/tokens.js — Central Animation Design Tokens
 * Sri Gokulam Veg Restaurant
 *
 * All animation timings, easings, distances, and glow colours live here.
 * Edit a single value to change the feel across the entire site.
 *
 * To DISABLE an animation: set its duration to 0 or use the
 * MOTION_ENABLED flag in each component.
 */

// ─── Durations (seconds) ───────────────────────────────────────────────────
export const DURATION = {
  /** Micro-interactions: button press, icon nudge */
  micro: 0.15,
  /** Fast reveals: hero tag pill, badge */
  fast: 0.35,
  /** Standard reveals: cards, images */
  standard: 0.6,
  /** Slow cinematic: hero parallax, featured image float */
  slow: 1.0,
  /** Page transition */
  page: 0.45,
  /** Preloader exit */
  preloader: 0.6,
};

// ─── Easings ──────────────────────────────────────────────────────────────
/** Spring-like pop used for reveals */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1];
/** Smooth decelerate for parallax */
export const EASE_OUT_CUBIC = [0.33, 1, 0.68, 1];
/** Linear for progress bars */
export const EASE_LINEAR = 'linear';
/** Soft spring */
export const EASE_SPRING = { type: 'spring', stiffness: 260, damping: 25 };

// ─── Distances (pixels) ───────────────────────────────────────────────────
export const DISTANCE = {
  /** Slide-up reveal offset */
  slideUp: 36,
  /** Slide-in from side */
  slideX: 40,
  /** Scale reveal starting size */
  scaleFrom: 0.92,
  /** Hover card lift */
  hoverLift: -6,
  /** Parallax depth (max translateY) */
  parallaxMax: 60,
};

// ─── Glow / Shadow values (CSS-compatible strings) ────────────────────────
export const GLOW = {
  gold: '0 0 18px rgba(226,168,41,0.55), 0 0 40px rgba(246,196,69,0.25)',
  goldHover: '0 8px 28px rgba(226,168,41,0.65), 0 0 50px rgba(246,196,69,0.3)',
  peacock: '0 0 18px rgba(0,89,179,0.5), 0 0 35px rgba(0,119,230,0.25)',
  peacockHover: '0 8px 28px rgba(0,89,179,0.7), 0 0 50px rgba(0,119,230,0.35)',
  card: '0 4px 22px rgba(5,27,65,0.12)',
  cardHover: '0 14px 40px rgba(5,27,65,0.2), 0 0 0 2px rgba(0,119,230,0.35)',
};

// ─── Stagger delays (seconds between child reveals) ───────────────────────
export const STAGGER = {
  /** Card grid stagger step */
  cards: 0.08,
  /** Navigation link stagger */
  nav: 0.05,
  /** Menu item stagger */
  menu: 0.06,
};

// ─── Framer Motion variant presets ────────────────────────────────────────
/**
 * Standard fade+slide-up reveal variant.
 * Usage: <motion.div variants={REVEAL_UP} initial="hidden" animate="visible" />
 */
export const REVEAL_UP = {
  hidden: { opacity: 0, y: DISTANCE.slideUp },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.standard, ease: EASE_OUT_EXPO },
  },
};

export const REVEAL_SCALE = {
  hidden: { opacity: 0, scale: DISTANCE.scaleFrom, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.standard, ease: EASE_OUT_EXPO },
  },
};

export const REVEAL_LEFT = {
  hidden: { opacity: 0, x: -DISTANCE.slideX },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.standard, ease: EASE_OUT_EXPO },
  },
};

export const REVEAL_RIGHT = {
  hidden: { opacity: 0, x: DISTANCE.slideX },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.standard, ease: EASE_OUT_EXPO },
  },
};

/** Stagger container variant — children stagger in sequence */
export const STAGGER_CONTAINER = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: STAGGER.cards,
      delayChildren: 0.05,
    },
  },
};

// ─── Particle colours (matching brand palette) ────────────────────────────
export const PARTICLE_COLORS = {
  goldCore: '#fff6d6',
  goldMid: '#fcd34d',
  goldEdge: '#d97706',
  sparkle: 'rgba(251,224,142,0.9)',
};
