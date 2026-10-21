'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import styles from './Preloader.module.css';

// Ambient floating golden dust particles
const PARTICLES = [
  { id: 1, left: '16%', delay: '0.4s', dur: '5.8s', size: 4 },
  { id: 2, left: '26%', delay: '1.2s', dur: '6.4s', size: 3 },
  { id: 3, left: '38%', delay: '0.8s', dur: '5.2s', size: 5 },
  { id: 4, left: '50%', delay: '2.0s', dur: '6.0s', size: 4 },
  { id: 5, left: '64%', delay: '1.5s', dur: '5.6s', size: 3 },
  { id: 6, left: '76%', delay: '0.6s', dur: '6.2s', size: 4 },
  { id: 7, left: '86%', delay: '1.8s', dur: '5.4s', size: 5 },
];

export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [paused, setPaused] = useState(false);
  const dismissedRef = useRef(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setProgress(100);
    setLoaded(true);
    setTimeout(() => setHidden(true), 600);
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('sgr_cinematic_preloader_seen');
        sessionStorage.removeItem('gokulam_preloader_seen');
      }
    } catch {
      // storage restricted
    }

    const isPaused =
      typeof window !== 'undefined' &&
      (window.location.search.includes('pause') || window.location.search.includes('inspect'));

    if (isPaused) {
      setPaused(true);
      setProgress(68);
      return;
    }

    const startProgress = () => {
      dismissedRef.current = false;
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      const TOTAL_DURATION = isMobile ? 3200 : 4200;
      const startTime = Date.now();

      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      intervalRef.current = setInterval(() => {
        if (dismissedRef.current) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return;
        }
        const elapsed = Date.now() - startTime;
        const pct = Math.min(100, Math.floor((elapsed / TOTAL_DURATION) * 100));
        setProgress(pct);

        if (elapsed >= TOTAL_DURATION) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setProgress(100);
          setTimeout(() => {
            dismiss();
          }, 220);
        }
      }, 25);

      timeoutRef.current = setTimeout(() => {
        dismiss();
      }, TOTAL_DURATION + 500);
    };

    // Connect to global instant dismiss hook so inline script can trigger React state update
    if (typeof window !== 'undefined') {
      window.__sgrDismissPreloader = dismiss;
    }

    startProgress();

    // Global replay hook for testing & inspection
    if (typeof window !== 'undefined') {
      window.__replayPreloader = () => {
        setLoaded(false);
        setHidden(false);
        setProgress(0);
        startProgress();
      };
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [dismiss]);

  if (hidden) return null;

  return (
    <div
      id="cinematicPreloader"
      className={`${styles.preloader} ${loaded ? styles.loaded : ''} ${paused ? styles.paused : ''}`}
      onClick={dismiss}
      onTouchEnd={dismiss}
      onPointerDown={dismiss}
      title="Click or tap anywhere to enter Sri Gokulam"
      role="button"
      tabIndex={0}
    >
      {/* ─── 0–1s: Background Architecture & Atmospheric Lighting ─── */}
      <div className={styles.backdropLayer}>
        <picture className={styles.backdropPicture}>
          <source media="(max-width: 768px)" srcSet="/chettinad_cinematic_bg_mobile.jpg" />
          <img
            src="/chettinad_cinematic_bg.jpg"
            alt="Sri Gokulam Chettinad Heritage"
            className={styles.backdropImg}
          />
        </picture>
      </div>

      {/* Warm Golden Glow Flares over Hanging Brass Lamps */}
      <div className={`${styles.lampGlow} ${styles.lampGlowLeft}`}></div>
      <div className={`${styles.lampGlow} ${styles.lampGlowRight}`}></div>

      {/* ─── 3.5–5.5s: Dynamic Animated Steam Wisps over South Indian Food Vessel ─── */}
      <div className={styles.steamContainer}>
        <div className={`${styles.steamWisp} ${styles.wisp1}`}></div>
        <div className={`${styles.steamWisp} ${styles.wisp2}`}></div>
        <div className={`${styles.steamWisp} ${styles.wisp3}`}></div>
      </div>

      {/* Floating Golden Particles */}
      <div className={styles.particlesContainer}>
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className={styles.particle}
            style={{
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: p.delay,
              animationDuration: p.dur,
            }}
          />
        ))}
      </div>

      {/* Skip Pill Button */}
      <button
        id="skipPreloaderBtn"
        className={styles.skipButton}
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        aria-label="Skip preloader"
      >
        <span>SKIP</span> ✕
      </button>

      {/* ─── Center Stage Showcase ─── */}
      <div className={styles.centerStage}>
        {/* 1–2s: Exact Restaurant Logo with Drawing Gold Circle */}
        <div className={styles.logoWrapper}>
          {/* Animated Gold Ring SVG */}
          <svg className={styles.ringSvg} viewBox="0 0 160 160">
            <circle
              className={styles.ringBackground}
              cx="80"
              cy="80"
              r="74"
            />
            <circle
              className={styles.ringAnimated}
              cx="80"
              cy="80"
              r="74"
            />
          </svg>

          {/* Golden Ring Radial Accents */}
          <div className={styles.ringAccents}>
            <span className={`${styles.accentDot} ${styles.dotTop}`} />
            <span className={`${styles.accentDot} ${styles.dotBottom}`} />
            <span className={`${styles.accentDot} ${styles.dotLeft}`} />
            <span className={`${styles.accentDot} ${styles.dotRight}`} />
          </div>

          {/* Original Sri Gokulam Logo - Untouched & Crisp */}
          <div className={styles.logoInnerFrame}>
            <img
              src="/restaurant_logo.jpg"
              alt="Sri Gokulam Veg Restaurant Logo"
              className={styles.restaurantLogo}
            />
          </div>
        </div>

        {/* 2–3.5s: Brand Reveal — Tamil & English Typography */}
        <div className={styles.brandReveal}>
          {/* Tamil Brand Title Flanked by Twin Peacock Feathers */}
          <div className={styles.tamilRow}>
            {/* Left Peacock Feather */}
            <svg
              className={`${styles.featherSvg} ${styles.featherLeft}`}
              width="36"
              height="36"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M5 27 C11 21 17 13 26 4" stroke="#D4A33D" strokeWidth="1.8" strokeLinecap="round" />
              <ellipse cx="20" cy="10" rx="7" ry="9" transform="rotate(30 20 10)" fill="#16852B" />
              <ellipse cx="20" cy="10" rx="5" ry="6.8" transform="rotate(30 20 10)" fill="#0284c7" />
              <ellipse cx="20" cy="10" rx="3" ry="4" transform="rotate(30 20 10)" fill="#073763" />
              <circle cx="21" cy="9" r="1" fill="#FFF9ED" />
            </svg>

            <h1 className={styles.tamilName}>ஸ்ரீ கோகுலம்</h1>

            {/* Right Peacock Feather (Mirrored) */}
            <svg
              className={`${styles.featherSvg} ${styles.featherRight}`}
              width="36"
              height="36"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M5 27 C11 21 17 13 26 4" stroke="#D4A33D" strokeWidth="1.8" strokeLinecap="round" />
              <ellipse cx="20" cy="10" rx="7" ry="9" transform="rotate(30 20 10)" fill="#16852B" />
              <ellipse cx="20" cy="10" rx="5" ry="6.8" transform="rotate(30 20 10)" fill="#0284c7" />
              <ellipse cx="20" cy="10" rx="3" ry="4" transform="rotate(30 20 10)" fill="#073763" />
              <circle cx="21" cy="9" r="1" fill="#FFF9ED" />
            </svg>
          </div>

          {/* English Brand Typography */}
          <h2 className={styles.englishName}>SRI GOKULAM</h2>
          <div className={styles.vegRestRow}>
            <span className={styles.goldLine} />
            <span className={styles.vegRestText}>VEG RESTAURANT</span>
            <span className={styles.goldLine} />
          </div>
        </div>

        {/* 5.5–6.7s: Status & Animated Loading Bar */}
        <div className={styles.progressSection}>
          <p className={styles.statusText}>PREPARING A DELICIOUS EXPERIENCE...</p>

          <div className={styles.progressTrackWrapper}>
            <div className={styles.progressBarTrack}>
              <div
                id="preloaderFill"
                className={styles.progressBarFill}
                style={{ width: `${progress}%` }}
              >
                {/* Glowing Leading Edge Highlight with Chef Hat Icon */}
                <div className={styles.chefHatThumb}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={styles.chefHatSvg}
                  >
                    <path
                      d="M6 16H18V18.5C18 19.3 17.3 20 16.5 20H7.5C6.7 20 6 19.3 6 18.5V16Z"
                      fill="#D4A33D"
                      stroke="#073763"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M6 16C4.2 16 3.2 14.2 3.8 12.5C3 11.2 3.4 9.2 4.8 8.4C4.6 7.8 4.8 7 5.4 6.5C6.8 5.2 9.2 5.8 10 7.2C11 5 14 5 15 7.2C15.8 5.8 18.2 5.2 19.6 6.5C20.2 7 20.4 7.8 20.2 8.4C21.6 9.2 22 11.2 21.2 12.5C21.8 14.2 20.8 16 19 16H6Z"
                      fill="#FFF9ED"
                      stroke="#D4A33D"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Percentage Display */}
            <span id="preloaderPct" className={styles.percentageText} suppressHydrationWarning />
          </div>
        </div>

        {/* 4 Cultural Heritage Badges */}
        <div className={styles.badgesGrid}>
          {/* Badge 1: Fresh Ingredients */}
          <div className={styles.badgeItem}>
            <div className={styles.badgeIconWrap}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 18C10 18 18 14 18 6C10 6 6 14 6 18Z"
                  stroke="#16852B"
                  strokeWidth="1.8"
                  fill="#16852B"
                  fillOpacity="0.15"
                />
                <path d="M6 18L13 11" stroke="#16852B" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <span className={styles.badgeLabel}>FRESH<br />INGREDIENTS</span>
          </div>

          <div className={styles.badgeDivider} />

          {/* Badge 2: Traditional Recipes */}
          <div className={styles.badgeItem}>
            <div className={styles.badgeIconWrap}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 11C5 8.5 7.5 7 12 7C16.5 7 19 8.5 19 11L18 18C18 19.5 15.5 20.5 12 20.5C8.5 20.5 6 19.5 6 18L5 11Z"
                  stroke="#D4A33D"
                  strokeWidth="1.8"
                  fill="#D4A33D"
                  fillOpacity="0.15"
                />
                <path d="M4 11H20" stroke="#D4A33D" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M9 4C9 5.5 11 6.5 12 7" stroke="#D4A33D" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className={styles.badgeLabel}>TRADITIONAL<br />RECIPES</span>
          </div>

          <div className={styles.badgeDivider} />

          {/* Badge 3: Pure Veg Delights */}
          <div className={styles.badgeItem}>
            <div className={styles.badgeIconWrap}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 20.5S4 14.5 4 8.5C4 5.5 6.5 3.5 9.5 3.5C11 3.5 12 4.5 12 4.5S13 3.5 14.5 3.5C17.5 3.5 20 5.5 20 8.5C20 14.5 12 20.5 12 20.5Z"
                  stroke="#16852B"
                  strokeWidth="1.8"
                  fill="#16852B"
                  fillOpacity="0.15"
                />
              </svg>
            </div>
            <span className={styles.badgeLabel}>PURE VEG<br />DELIGHTS</span>
          </div>

          <div className={styles.badgeDivider} />

          {/* Badge 4: Authentic Chettinad Taste */}
          <div className={styles.badgeItem}>
            <div className={styles.badgeIconWrap}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3V21M3 12H21M6 6L18 18M6 18L18 6"
                  stroke="#D4A33D"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="12" r="3" fill="#D4A33D" />
              </svg>
            </div>
            <span className={styles.badgeLabel}>AUTHENTIC<br />CHETTINAD TASTE</span>
          </div>
        </div>

        {/* Discreet Tap Hint */}
        <span className={styles.tapNotice}>Tap anywhere to enter • தொட்டு தொடரவும்</span>
      </div>
    </div>
  );
}
