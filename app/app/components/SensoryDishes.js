'use client';

import styles from './SensoryDishes.module.css';
import AnimatedImage from './motion/AnimatedImage';
import AnimatedButton from './motion/AnimatedButton';
import motionStyles from './motion/motion.module.css';

const SENSORY_ITEMS = [
  {
    id: 'ghee-podi-roast',
    title: 'Gokulam Ghee Podi Roast',
    price: 120,
    desc: 'Roasted golden-crisp on iron tawa in pure cow ghee, seasoned with spicy Gunpowder Podi and trio stone-ground chutneys.',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=700&q=80',
    badge: '🔥 Freshly Sizzled in Pure Ghee',
    badgeStyle: 'fire',
    featured: true, // Enables floating bob animation
  },
  {
    id: 'sambar-idli',
    title: 'Thattu Vadai Sambar Idli',
    price: 85,
    desc: 'Fluffy steamed button idlis submerged under a generous cascade of piping-hot shallot and drumstick Chettinad sambar.',
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=700&q=80',
    badge: '🥣 Cascading Hot Sambar',
    badgeStyle: 'sambar',
    featured: false,
  },
  {
    id: 'degree-coffee',
    title: 'Kumbakonam Degree Coffee',
    price: 40,
    desc: 'First decoction brewed in traditional brass filters, combined with thick frothed milk in an antique brass dabarah set.',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=700&q=80',
    badge: '☕ Rich Golden Crema Froth',
    badgeStyle: 'coffee',
    featured: false,
  },
];

export default function SensoryDishes({ onAddToCart }) {
  return (
    <section className={styles.sensorySection} id="signature">
      <div className={styles.headerBox} data-reveal="up">
        <div className={styles.pillEmblem}>Sensory Experience</div>
        <h2 className={styles.title}>Made Fresh with Pure Cow Ghee</h2>
        <p className={styles.subtitle}>Savor the aroma, sizzle, and traditional Chettinad flavors.</p>
      </div>

      <div className={`${styles.motionGrid} reveal-stagger`}>
        {SENSORY_ITEMS.map((item) => (
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
