'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import FloatingParticles from './FloatingParticles';
import styles from './HeroBanner.module.css';

const BANNER_SLIDES = [];
const DEFAULT_BANNER_DURATION = 5500; // 5.5s fallback

export default function HeroBanner({
  onOpenOrderDrawer,
  onOpenQrModal,
  onOpenReservationModal,
  slides,
  settings,
}) {
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

  // Settings & Configuration
  const autoSlideDuration =
    typeof settings?.autoSlideDuration === 'number'
      ? settings.autoSlideDuration
      : DEFAULT_BANNER_DURATION;
  const isAutoSlideEnabled =
    settings?.autoSlideEnabled !== false && autoSlideDuration > 0;
  const desktopFit = settings?.desktopFit || 'fit';

  // Has multiple slides -> show navigation arrows, dots, and allow autoplay
  const hasMultipleSlides = activeSlides.length > 1;

  // Check if dedicated mobile portrait banners exist
  const hasDedicatedMobileBanners = activeSlides.some(
    (s) => Boolean(s.mobileImage && s.mobileImage.trim() !== '' && s.mobileImage !== s.desktopImage)
  );

  const goTo = useCallback((index) => {
    let newIdx = index;
    if (newIdx >= activeSlides.length) newIdx = 0;
    else if (newIdx < 0) newIdx = activeSlides.length - 1;
    setCurrentIdx(newIdx);
    setProgressKey((k) => k + 1);
  }, [activeSlides.length]);

  const next = useCallback(() => {
    if (!hasMultipleSlides) return;
    setCurrentIdx((prevIdx) => (prevIdx + 1) % activeSlides.length);
    setProgressKey((k) => k + 1);
  }, [activeSlides.length, hasMultipleSlides]);

  const prev = useCallback(() => {
    if (!hasMultipleSlides) return;
    setCurrentIdx((prevIdx) => (prevIdx - 1 + activeSlides.length) % activeSlides.length);
    setProgressKey((k) => k + 1);
  }, [activeSlides.length, hasMultipleSlides]);

  // Autoplay handler — Only runs when 2+ slides exist and duration > 0
  const resetAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isHovered || !hasMultipleSlides || !isAutoSlideEnabled) return;
    intervalRef.current = setInterval(() => {
      setCurrentIdx((prevIdx) => (prevIdx + 1) % activeSlides.length);
      setProgressKey((k) => k + 1);
    }, autoSlideDuration);
  }, [activeSlides.length, isHovered, hasMultipleSlides, isAutoSlideEnabled, autoSlideDuration]);

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
    if (!hasMultipleSlides) return;
    if (e && e.touches && e.touches[0]) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e) => {
    if (!hasMultipleSlides) return;
    if (e && e.changedTouches && e.changedTouches[0]) {
      const diffX = touchStartX.current - e.changedTouches[0].clientX;
      const diffY = touchStartY.current - e.changedTouches[0].clientY;

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
  const handleBtnClick = (action, fallbackHref, target, e) => {
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

    if (act === 'drawer' || act.includes('drawer') || act === 'cart' || act.includes('order')) {
      if (onOpenOrderDrawer) onOpenOrderDrawer();
      return;
    }

    if (act === 'menu' || href.includes('#menu')) {
      const el = document.querySelector('#menu');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (act === 'tel' || (fallbackHref && fallbackHref.startsWith('tel:'))) {
      window.location.href = fallbackHref || 'tel:+917358325113';
      return;
    }

    if (act === 'whatsapp' || (fallbackHref && fallbackHref.includes('wa.me'))) {
      window.open(fallbackHref || 'https://wa.me/917358325113', '_blank', 'noopener,noreferrer');
      return;
    }

    if (fallbackHref && fallbackHref.startsWith('http')) {
      window.open(fallbackHref, target === '_self' ? '_self' : '_blank', 'noopener,noreferrer');
      return;
    }

    if (fallbackHref && fallbackHref.startsWith('#')) {
      const el = document.querySelector(fallbackHref);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (fallbackHref) {
      window.location.href = fallbackHref;
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
      {/* Auto-Slide Progress Bar at top of banner — Only when multiple slides & autoplay enabled */}
      {hasMultipleSlides && isAutoSlideEnabled && (
        <div className={styles.progressBarWrap}>
          <div
            key={progressKey}
            className={styles.progressBarFill}
            style={{ animationDuration: `${autoSlideDuration}ms` }}
          ></div>
        </div>
      )}

      {/* Sliding Viewport */}
      <div className={`${styles.sliderViewport} ${hasDedicatedMobileBanners ? styles.viewportHasMobilePortrait : ''}`}>
        {/* Floating Ambient Golden Ghee Particles */}
        <FloatingParticles count={14} />

        {/* Physical Horizontal Moving Track with GPU acceleration */}
        <div
          className={styles.slidesTrack}
          style={{ transform: `translate3d(-${currentIdx * 100}%, 0, 0)` }}
        >
          {activeSlides.map((slide, idx) => {
            const hasTextContent = Boolean(
              (slide.tagText && slide.tagText.trim()) ||
              (slide.titleLine1 && slide.titleLine1.trim()) ||
              (slide.titleAccent && slide.titleAccent.trim()) ||
              (slide.description && slide.description.trim())
            );

            const isButtonsAllowed = slide.showButtons !== false;
            const hasPrimaryBtn = Boolean(
              isButtonsAllowed && slide.primaryBtn && slide.primaryBtn.isVisible !== false && slide.primaryBtn.text
            );
            const hasSecondaryBtn = Boolean(
              isButtonsAllowed && slide.secondaryBtn && slide.secondaryBtn.isVisible !== false && slide.secondaryBtn.text
            );
            const hasButtons = hasPrimaryBtn || hasSecondaryBtn;
            const hasPrice = Boolean(slide.priceText && slide.priceText.trim());

            // Helper to render a customized button
            const renderButton = (btn, isPrimary = true) => {
              if (!btn || btn.isVisible === false || !btn.text) return null;

              const shapeClass =
                slide.btnShape === 'squared'
                  ? styles.btnSquared
                  : slide.btnShape === 'rounded'
                  ? styles.btnRounded
                  : styles.btnPill;

              const sizeClass =
                slide.btnSize === 'small'
                  ? styles.btnSmall
                  : slide.btnSize === 'large'
                  ? styles.btnLarge
                  : styles.btnMedium;

              const styleType = btn.style || (isPrimary ? 'solid' : 'glass');
              const customStyles = {
                backgroundColor:
                  styleType === 'outline'
                    ? 'transparent'
                    : btn.bgColor || (isPrimary ? '#f59e0b' : 'rgba(255, 255, 255, 0.15)'),
                color: btn.textColor || (isPrimary ? '#051B41' : '#ffffff'),
                border:
                  styleType === 'outline'
                    ? `2px solid ${btn.bgColor || (isPrimary ? '#f59e0b' : '#ffffff')}`
                    : undefined,
              };

              return (
                <button
                  key={isPrimary ? 'p-btn' : 's-btn'}
                  type="button"
                  className={`${styles.ctaBtnBase} ${shapeClass} ${sizeClass} ${
                    styleType === 'glass' ? styles.btnGlass : ''
                  }`}
                  style={customStyles}
                  onClick={(e) => handleBtnClick(btn.action, btn.link, btn.target, e)}
                >
                  {btn.icon && <span className={styles.btnIcon}>{btn.icon}</span>}
                  <span className={styles.btnText}>{btn.text}</span>
                </button>
              );
            };

            const positionClass =
              slide.btnPosition === 'bottom-center'
                ? styles.posBottomCenter
                : slide.btnPosition === 'bottom-right'
                ? styles.posBottomRight
                : slide.btnPosition === 'center-left'
                ? styles.posCenterLeft
                : slide.btnPosition === 'center'
                ? styles.posCenter
                : styles.posBottomLeft;

            return (
              <div
                className={`${styles.slide} ${idx === currentIdx ? styles.slideActive : ''} ${!hasTextContent ? styles.slideGraphicOnly : ''}`}
                key={slide.id || idx}
              >
                {/* Ambient Blurred Backdrop for widescreen displays */}
                <div
                  className={styles.ambientBackdrop}
                  style={{
                    backgroundImage: `url(${slide.desktopImage || slide.image || ''})`,
                  }}
                  aria-hidden="true"
                />

                {/* Picture element containing desktop and mobile source */}
                <picture className={styles.pictureWrapper}>
                  {slide.mobileImage && <source media="(max-width: 640px)" srcSet={slide.mobileImage} />}
                  <img
                    className={`${styles.slidePhoto} ${desktopFit === 'cover' ? styles.slidePhotoCover : ''}`}
                    src={slide.desktopImage || slide.image}
                    alt={slide.alt || 'Sri Gokulam Chettinad Feast'}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                  />
                </picture>

                {/* Only render dark gradient mask if slide has HTML text overlay to contrast against */}
                {hasTextContent && <div className={styles.gradientMask}></div>}

                {/* Standard Content Overlay (when slide has HTML text) */}
                {hasTextContent && (
                  <div className={styles.innerContainer}>
                    <div className={styles.contentBox}>
                      {Boolean(slide.tagText && slide.tagText.trim()) && (
                        <div className={styles.tagPill}>
                          <span>{slide.tagIcon}</span> {slide.tagText}
                        </div>
                      )}

                      {Boolean((slide.titleLine1 && slide.titleLine1.trim()) || (slide.titleAccent && slide.titleAccent.trim())) && (
                        <h1 className={styles.titleText}>
                          {slide.titleLine1}{' '}
                          <span className={styles.goldAccent}>{slide.titleAccent}</span>
                        </h1>
                      )}

                      {Boolean(slide.description && slide.description.trim()) && (
                        <p className={styles.descText}>{slide.description}</p>
                      )}

                      {hasButtons && (
                        <div className={styles.btnGroup}>
                          {hasPrimaryBtn && renderButton(slide.primaryBtn, true)}
                          {hasSecondaryBtn && renderButton(slide.secondaryBtn, false)}
                        </div>
                      )}
                    </div>

                    {hasPrice && (
                      <div className={styles.priceFloat}>
                        {slide.priceText}
                      </div>
                    )}
                  </div>
                )}

                {/* Graphic-Only Banner Overlay: Positioned action buttons without obscuring banner graphics */}
                {!hasTextContent && hasButtons && (
                  <div className={`${styles.btnGroupPositioned} ${positionClass}`}>
                    {hasPrimaryBtn && renderButton(slide.primaryBtn, true)}
                    {hasSecondaryBtn && renderButton(slide.secondaryBtn, false)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Manual Navigation Arrows — ONLY rendered when 2 or more banners exist */}
        {hasMultipleSlides && (
          <>
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
          </>
        )}
      </div>

      {/* Pagination Dots with Glowing Active State — ONLY rendered when 2 or more banners exist */}
      {hasMultipleSlides && (
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
      )}
    </section>
  );
}
