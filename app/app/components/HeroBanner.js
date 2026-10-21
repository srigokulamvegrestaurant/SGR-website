'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import FloatingParticles from './FloatingParticles';
import styles from './HeroBanner.module.css';

const BANNER_SLIDES = [
  {
    id: 1,
    tagIcon: '🦚',
    tagText: 'Lord Krishna Pure Ghee Special',
    titleLine1: 'The Food Tradition',
    titleAccent: 'of Chettinad & Tamil Nadu',
    description: 'Experience authentic vegetarian flavors in Karaikudi — crisp golden dosas roasted in pure cow ghee, served with shallot sambar and trio homestyle chutneys.',
    primaryBtn: { icon: '📅', text: 'Table Reservation →', action: 'reservation' },
    secondaryBtn: { icon: '📲', text: 'QR Table Order', action: 'qr' },
    priceText: 'Special: ₹120 • Pure Cow Ghee',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=1920&q=85',
    alt: 'Crispy Golden Ghee Roast Dosa',
  },
  {
    id: 2,
    tagIcon: '👑',
    tagText: 'Unlimited Karaikudi Heritage Feast',
    titleLine1: 'Authentic Chettinad',
    titleAccent: 'Raja Banana Leaf Feast',
    description: 'A grand symphony of 14 sattvic delicacies: fragrant Ponni rice, Ennai Kathirikai, Poondu Kuzhambu, Medhu Vadai, Appalam, Mor Kuzhambu, and Elaneer Payasam.',
    primaryBtn: { icon: '🍱', text: 'Reserve Meal Plate →', action: 'drawer' },
    secondaryBtn: { icon: '📲', text: 'QR Table Order', action: 'qr' },
    priceText: 'Unlimited ₹180',
    image: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=1920&q=85',
    alt: 'Chettinad Raja Meals on Banana Leaf',
  },
  {
    id: 3,
    tagIcon: '☕',
    tagText: '100% First Decoction Brass Brew',
    titleLine1: 'Kumbakonam Degree',
    titleAccent: 'Brass Filter Coffee',
    description: 'Freshly brewed Robusta & Peaberry blend with thick frothed cow milk, served piping hot in an authentic South Indian brass dabarah-tumbler set.',
    primaryBtn: { icon: '☕', text: 'View Beverages →', action: 'menu' },
    secondaryBtn: { icon: '📅', text: 'Table Reservation', action: 'reservation' },
    priceText: 'Fresh Brew ₹40',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1920&q=85',
    alt: 'Kumbakonam Degree Filter Coffee',
  },
  {
    id: 4,
    tagIcon: '🥟',
    tagText: 'Morning & Evening Specials',
    titleLine1: 'Karaikudi Tiffin &',
    titleAccent: 'Hot Sambar Idli Platter',
    description: 'Pillowy soft button idlis submerged in shallot sambar with pure ghee, served alongside crispy golden Medhu Vadai and fresh coconut chutneys.',
    primaryBtn: { icon: '🌿', text: 'View Tiffin Specials →', action: 'specials' },
    secondaryBtn: { icon: '📲', text: 'QR Table Order', action: 'qr' },
    priceText: 'Combo ₹110',
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1920&q=85',
    alt: 'Hot Sambar Idli and Vada',
  },
];

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
