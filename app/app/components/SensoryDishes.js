'use client';

import styles from './SensoryDishes.module.css';
import AnimatedImage from './motion/AnimatedImage';
import AnimatedButton from './motion/AnimatedButton';
import motionStyles from './motion/motion.module.css';

const SENSORY_ITEMS = [];

export default function SensoryDishes({ onAddToCart, items }) {
  const activeItems = Array.isArray(items) && items.length > 0 ? items : SENSORY_ITEMS;

  if (activeItems.length === 0) {
    return null;
  }

  return (
    <section className={styles.sensorySection} id="signature">
      <div className={styles.headerBox} data-reveal="up">
        <div className={styles.pillEmblem}>Sensory Experience</div>
        <h2 className={styles.title}>Made Fresh with Pure Cow Ghee</h2>
        <p className={styles.subtitle}>Savor the aroma, sizzle, and traditional Chettinad flavors.</p>
      </div>

      <div className={`${styles.motionGrid} reveal-stagger`}>
        {activeItems.map((item) => (
          <div
            key={item.id}
            className={`${styles.sensoryCard} ${motionStyles.cardHover}`}
            data-reveal="scale"
          >
            {/* Food image with clip-path reveal + optional floating bob for featured dish */}
            <div className={styles.imgBox}>
              <AnimatedImage
                src={item.image}
                alt={item.title}
                featured={item.featured}
                style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
              />
              <div className={styles.steamEffect} aria-hidden="true">
                <span className={styles.steamCurl}>♨️</span>
                <span className={styles.steamWisp}>~</span>
              </div>
              <div className={`${styles.badge} ${styles[item.badgeStyle]}`}>
                {item.badge}
              </div>
            </div>

            <div className={styles.cardBody}>
              <h3 className={styles.dishTitle}>{item.title}</h3>
              <p className={styles.dishDesc}>{item.desc}</p>
              <div className={styles.footerRow}>
                <span className={styles.priceTag}>₹{item.price}</span>
                {/* AnimatedButton: press feedback + shine sweep + icon nudge */}
                <AnimatedButton
                  variant="gold"
                  icon="+"
                  onClick={() => onAddToCart && onAddToCart(item.title, item.price)}
                  className={styles.btnAdd}
                >
                  Add to Tab
                </AnimatedButton>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
