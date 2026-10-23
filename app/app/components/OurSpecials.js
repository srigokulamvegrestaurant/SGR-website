'use client';

import styles from './OurSpecials.module.css';
import AnimatedImage from './motion/AnimatedImage';
import motionStyles from './motion/motion.module.css';

const SPECIAL_CATEGORIES = [];

export default function OurSpecials({ onSelectCategory, categories }) {
  const activeCategories =
    Array.isArray(categories) && categories.length > 0
      ? categories
      : SPECIAL_CATEGORIES;

  if (activeCategories.length === 0) {
    return null;
  }

  return (
    <section className={styles.specialsSection} id="specials">
      {/* Decorative Heritage Kolam & Spice Motif Layer */}
      <div className={styles.bgMotifLayer} aria-hidden="true">
        <span className={`${styles.floatingMotif} ${styles.motifLeft}`}>✨ Traditional Tiffin</span>
        <span className={`${styles.floatingMotif} ${styles.motifRight}`}>🧈 100% Pure Cow Ghee</span>
      </div>

      {/* Ornate Pill Badge: Dark Navy Gradient with Peacock Wings */}
      <div className={styles.badgeRow} data-reveal="up">
        <svg className={styles.featherWing} viewBox="0 0 50 50" aria-hidden="true">
          <path d="M10 25C15 15 30 12 40 20C45 25 40 35 30 40C20 42 12 35 10 25Z" fill="#0059B3" />
          <circle cx="28" cy="26" r="6" fill="#f59e0b" />
          <circle cx="28" cy="26" r="3" fill="#051B41" />
        </svg>

        <div className={styles.pillEmblem}>Our Special</div>

        <svg
          className={styles.featherWing}
          viewBox="0 0 50 50"
          style={{ transform: 'scaleX(-1)' }}
          aria-hidden="true"
        >
          <path d="M10 25C15 15 30 12 40 20C45 25 40 35 30 40C20 42 12 35 10 25Z" fill="#0059B3" />
          <circle cx="28" cy="26" r="6" fill="#f59e0b" />
          <circle cx="28" cy="26" r="3" fill="#051B41" />
        </svg>
      </div>

      {/* 4 Special Category Cards — staggered entrance + AnimatedImage reveals */}
      <div className={`${styles.cardsContainer} reveal-stagger`}>
        {activeCategories.map((cat, idx) => (
          <div
            key={cat.id}
            className={`${styles.specialCard} ${motionStyles.cardHover}`}
            onClick={() => onSelectCategory && onSelectCategory(cat.id)}
            role="button"
            tabIndex={0}
            data-reveal="scale"
            onKeyDown={(e) =>
              e.key === 'Enter' && onSelectCategory && onSelectCategory(cat.id)
            }
          >
            <div className={styles.imgWrap}>
              {/* AnimatedImage: clip-path reveal on viewport entry + hover zoom */}
              <AnimatedImage
                src={cat.image}
                alt={cat.alt}
                style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
              />
              <div className={styles.cardSheen} aria-hidden="true" />
            </div>
            <div className={styles.namePill}>{cat.name}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
