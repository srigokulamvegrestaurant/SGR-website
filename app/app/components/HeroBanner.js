'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import FloatingParticles from './FloatingParticles';
import styles from './HeroBanner.module.css';

const BANNER_SLIDES = [];

const BANNER_DURATION = 5500; // 5.5s smooth, readable autoplay

export default function HeroBanner({ onOpenOrderDrawer, onOpenQrModal, onOpenReservationModal, slides }) {
  const rawSlides = (Array.isArray(slides) && slides.length > 0) ? slides : BANNER_SLIDES;
  const activeSlides = rawSlides.map((slide) => {
    let pBtn = slide.primaryBtn;
    let sBtn = slide.secondaryBtn;
    if (pBtn && pBtn.text && pBtn.text.toLowerCase().includes('order online')) {
      pBtn = { ...pBtn, icon: '📅', text: 'Table Reservation →', action: 'reservation' };
    }
    if (sBtn && sBtn.text && sBtn.text.toLowerCase().includes('order online')) {
      sBtn = { ...sBtn, icon: '📅', text: 'Table Reservation', action: 'reservation' };
    }
    return { ...slide, primaryBtn: pBtn, secondaryBtn: sBtn };
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const goTo = useCallback((index) => {
    let newIdx = index;
    if (newIdx >= activeSlides.length) newIdx = 0;
    else if (newIdx < 0) newIdx = activeSlides.length - 1;
    setCurrentIdx(newIdx);
    setProgressKey((k) => k + 1);
  }, [activeSlides.length]);

  const next = useCallback(() => {
    setCurrentIdx((prevIdx) => (prevIdx + 1) % activeSlides.length);
    setProgressKey((k) => k + 1);
  }, [activeSlides.length]);

  const prev = useCallback(() => {
    setCurrentIdx((prevIdx) => (prevIdx - 1 + activeSlides.length) % activeSlides.length);
    setProgressKey((k) => k + 1);
  }, [activeSlides.length]);

  // Autoplay handler — Pauses during user hover so manual navigation is never interrupted
  const resetAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isHovered) return;
    intervalRef.current = setInterval(() => {
      setCurrentIdx((prevIdx) => (prevIdx + 1) % activeSlides.length);
      setProgressKey((k) => k + 1);
    }, BANNER_DURATION);
  }, [activeSlides.length, isHovered]);

  useEffect(() => {
    resetAutoplay();

    const handleVisibilityChange = () => {
      if (!document.hidden && !isHovered) {
        resetAutoplay();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resetAutoplay, isHovered]);

  // Mobile Touch Swipe support
  const handleTouchStart = (e) => {
    if (e && e.touches && e.touches[0]) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e) => {
    if (e && e.changedTouches && e.changedTouches[0]) {
      const diffX = touchStartX.current - e.changedTouches[0].clientX;
      const diffY = touchStartY.current - e.changedTouches[0].clientY;

      // Trigger horizontal slide if horizontal motion > 24px and > vertical motion
      if (Math.abs(diffX) > 24 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) next();
        else prev();
      }
      resetAutoplay();
    }
  };

  const handleTouchCancel = () => {
    resetAutoplay();
  };

  // Button Action Click Handler
  const handleBtnClick = (action, fallbackHref, e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    const act = (action || '').toLowerCase();
    const href = (fallbackHref || '').toLowerCase();

    if (act === 'qr' || act.includes('qr') || href.includes('table-qr')) {
      if (onOpenQrModal) onOpenQrModal();
      return;
    }

    if (act === 'reservation' || act.includes('reservation') || href.includes('reservation')) {
      if (onOpenReservationModal) onOpenReservationModal();
      return;
    }

    if (act === 'drawer' || act.includes('drawer') || act.includes('order')) {
      if (onOpenOrderDrawer) onOpenOrderDrawer();
      return;
    }

    if (fallbackHref) {
      const el = document.querySelector(fallbackHref);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (activeSlides.length === 0) {
    return (
      <section className={styles.heroBanner} id="heroBanner">
        <div className={styles.sliderViewport} style={{ minHeight: '520px', display: 'flex', alignItems: 'center' }}>
          <FloatingParticles count={16} />
          <div className={styles.innerContainer} style={{ position: 'relative', zIndex: 10, width: '100%' }}>
            <div className={styles.contentBox} style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
              <div className={styles.tagPill} style={{ margin: '0 auto 1.25rem' }}>
                <span>🦚</span> SRI GOKULAM VEG RESTAURANT
              </div>
              <h1 className={styles.titleText} style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.2 }}>
                Authentic Chettinad <span className={styles.goldAccent}>Sattvic Culinary Heritage</span>
              </h1>
              <p className={styles.descText} style={{ margin: '1rem auto 2rem', maxWidth: '640px', fontSize: '1.05rem', lineHeight: 1.6 }}>
                Handcrafted with pure cow ghee, freshly stone-ground Karaikudi spices &amp; timeless heritage recipes in every bite. 100% Pure Vegetarian dining on Mudiyarasan Salai, Karaikudi.
              </p>
              <div className={styles.btnGroup} style={{ justifyContent: 'center' }}>
                <button
                  type="button"
                  className={styles.ctaPrimary}
                  onClick={() => onOpenReservationModal && onOpenReservationModal()}
                >
                  <span>📅</span> Table Reservation →
                </button>
                <button
                  type="button"
                  className={styles.ctaSecondary}
                  onClick={() => onOpenQrModal && onOpenQrModal()}
                >
                  <span>📲</span> QR Table Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={styles.heroBanner}
      id="heroBanner"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Auto-Slide Progress Bar at top of banner */}
      <div className={styles.progressBarWrap}>
        <div key={progressKey} className={styles.progressBarFill}></div>
      </div>

      {/* Sliding Viewport */}
      <div className={styles.sliderViewport}>
        {/* Floating Ambient Golden Ghee Particles */}
        <FloatingParticles count={14} />

        {/* Physical Horizontal Moving Track (Translates 0%, -100%, -200%, -300%) with GPU acceleration */}
        <div
          className={styles.slidesTrack}
          style={{ transform: `translate3d(-${currentIdx * 100}%, 0, 0)` }}
        >
          {activeSlides.map((slide, idx) => (
            <div className={`${styles.slide} ${idx === currentIdx ? styles.slideActive : ''}`} key={slide.id || idx}>
              <picture>
                {slide.mobileImage && <source media="(max-width: 640px)" srcSet={slide.mobileImage} />}
                <img
                  className={styles.slidePhoto}
                  src={slide.desktopImage || slide.image}
                  alt={slide.alt || 'Sri Gokulam Chettinad Feast'}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              </picture>
              <div className={styles.gradientMask}></div>

              <div className={styles.innerContainer}>
                <div className={styles.contentBox}>
                  <div className={styles.tagPill}>
                    <span>{slide.tagIcon}</span> {slide.tagText}
                  </div>
                  <h1 className={styles.titleText}>
                    {slide.titleLine1}{' '}
                    <span className={styles.goldAccent}>{slide.titleAccent}</span>
                  </h1>
                  <p className={styles.descText}>{slide.description}</p>

                  <div className={styles.btnGroup}>
                    {slide.primaryBtn && slide.primaryBtn.isVisible !== false && (
                      <button
                        type="button"
                        className={styles.ctaPrimary}
                        onClick={(e) => handleBtnClick(slide.primaryBtn.action, slide.primaryBtn.href || '#menu', e)}
                      >
                        <span>{slide.primaryBtn.icon || '🛒'}</span> {slide.primaryBtn.text}
                      </button>
                    )}
                    {slide.secondaryBtn && slide.secondaryBtn.isVisible !== false && (
                      <button
                        type="button"
                        className={styles.ctaSecondary}
                        onClick={(e) => handleBtnClick(slide.secondaryBtn.action, slide.secondaryBtn.href || '#table-qr', e)}
                      >
                        <span>{slide.secondaryBtn.icon || '📲'}</span> {slide.secondaryBtn.text}
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.priceFloat}>
                  {slide.priceText}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Manual Navigation Arrows — Placed AFTER slidesTrack with explicit stopPropagation */}
        <button
          type="button"
          className={`${styles.navArrow} ${styles.arrowLeft}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            prev();
            resetAutoplay();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          aria-label="Previous Slide"
        >
          &#10094;
        </button>
        <button
          type="button"
          className={`${styles.navArrow} ${styles.arrowRight}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            next();
            resetAutoplay();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          aria-label="Next Slide"
        >
          &#10095;
        </button>
      </div>

      {/* Pagination Dots with Glowing Active State */}
      <div className={styles.paginationDots}>
        {activeSlides.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.dot} ${i === currentIdx ? styles.dotActive : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goTo(i);
              resetAutoplay();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
