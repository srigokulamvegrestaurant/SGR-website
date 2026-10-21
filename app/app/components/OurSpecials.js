'use client';

import styles from './OurSpecials.module.css';
import AnimatedImage from './motion/AnimatedImage';
import motionStyles from './motion/motion.module.css';

const SPECIAL_CATEGORIES = [
  {
    id: 'tiffin',
    name: 'Tiffin',
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=700&q=80',
    alt: 'South Indian Tiffin Steamed Idli and Sambar',
  },
  {
    id: 'south-indian',
    name: 'South Indian',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=700&q=80',
    alt: 'Crispy Dosa with Chutneys',
  },
  {
    id: 'north-indian',
    name: 'North Indian',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=700&q=80',
    alt: 'North Indian Vegetarian Curries and Roti',
  },
  {
    id: 'chettinad',
    name: 'Chettinad Special',
    image: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=700&q=80',
    alt: 'Authentic Chettinad Banana Leaf Feast',
  },
];

export default function OurSpecials({ onSelectCategory, categories }) {
  const activeCategories =
    Array.isArray(categories) && categories.length > 0
      ? categories
      : SPECIAL_CATEGORIES;

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
