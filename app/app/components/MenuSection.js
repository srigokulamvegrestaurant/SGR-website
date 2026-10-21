'use client';

import { useState, useMemo } from 'react';
import styles from './MenuSection.module.css';
import AnimatedImage from './motion/AnimatedImage';
import AnimatedButton from './motion/AnimatedButton';
import motionStyles from './motion/motion.module.css';

const MENU_DATA = [
  {
    id: 1,
    title: 'Special Ghee Podi Roast',
    taTitle: 'நெய் பொடி ரோஸ்ட்',
    category: 'tiffin',
    price: 120,
    popularity: 10,
    desc: 'Crispy dosa roasted in cow ghee with spicy garlic-free podi, served with 3 signature Karaikudi chutneys.',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 2,
    title: 'Gokulam Button Sambar Idli',
    taTitle: 'மினி சாம்பார் இட்லி',
    category: 'tiffin',
    price: 85,
    popularity: 9,
    desc: '14 mini button idlis soaked in authentic Karaikudi shallot sambar with a dollop of pure cow ghee.',
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 3,
    title: 'Raja Chettinad Full Meals',
    taTitle: 'செட்டிநாடு ராஜா சாப்பாடு',
    category: 'meals',
    price: 210,
    popularity: 10,
    desc: 'Unlimited Ponni rice, sambar, vatha kuzhambu, rasam, kootu, poriyal, vadai, appalam, curd, and payasam.',
    image: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 4,
    title: 'Ennai Kathirikai Kuzhambu',
    taTitle: 'எண்ணெய் கத்திரிக்காய் குழம்பு',
    category: 'chettinad',
    price: 140,
    popularity: 8,
    desc: 'Tender baby brinjals stuffed with freshly roasted Chettinad spices simmered in cold-pressed sesame oil.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 5,
    title: 'Chettinad Kuzhi Paniyaram',
    taTitle: 'குழி பணியாரம் (6 pcs)',
    category: 'chettinad',
    price: 90,
    popularity: 8,
    desc: 'Crisp golden dumplings with shallots, curry leaves, and mustard tempering, served with spicy tomato chutney.',
    image: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 6,
    title: 'Kumbakonam Degree Coffee',
    taTitle: 'டிகிரி ஃபில்டர் காபி',
    category: 'beverages',
    price: 40,
    popularity: 10,
    desc: 'Fresh first decoction brew with steaming golden milk froth in an authentic brass dabarah-tumbler set.',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 7,
    title: 'Crispy Medhu Vadai Platter',
    taTitle: 'மொறு மொறு மெது வடை (2 pcs)',
    category: 'tiffin',
    price: 60,
    popularity: 7,
    desc: 'Crisp golden-fried urad dal vadas studded with crushed black pepper, ginger, and curry leaves.',
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 8,
    title: 'Traditional Elaneer Payasam',
    taTitle: 'இளநீர் பாயாசம்',
    category: 'beverages',
    price: 75,
    popularity: 9,
    desc: 'Chilled tender coconut pulp infused with condensed coconut milk, cardamom, and toasted cashews.',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'tiffin', label: 'Tiffin & Breakfast' },
  { id: 'meals', label: 'Raja Meals & Rice' },
  { id: 'chettinad', label: 'Chettinad Curries' },
  { id: 'beverages', label: 'Beverages' },
];

export default function MenuSection({ onAddToCart, activeCategoryFilter }) {
  const [activeCategory, setActiveCategory] = useState(activeCategoryFilter || 'all');
  const [sortBy, setSortBy] = useState('popular');

  const filteredAndSortedItems = useMemo(() => {
    let list = MENU_DATA;
    if (activeCategory !== 'all') {
      list = list.filter((item) => item.category === activeCategory);
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      return b.popularity - a.popularity;
    });
  }, [activeCategory, sortBy]);

  return (
    <section className={styles.menuSection} id="menu">
      <div className={styles.headerBox}>
        <div className={styles.pillEmblem}>Gokulam Menu</div>
        <h2 className={styles.title}>Curated Traditional Delicacies</h2>
        <p className={styles.subtitle}>Select your favorite category or sort by price and popularity.</p>
      </div>

      {/* Filter and Sort Bar */}
      <div className={styles.filterBar} data-reveal="up">
        <div className={styles.categoryButtons}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.catBtn} ${activeCategory === cat.id ? styles.catBtnActive : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div>
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="popular">Sort: Popularity / Chef&apos;s Pick</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Product Grid */}
      <div className={`${styles.menuGrid} reveal-stagger`}>
        {filteredAndSortedItems.map((item) => (
          <div
            key={item.id}
            className={`${styles.productCard} ${motionStyles.cardHover}`}
            data-reveal="scale"
          >
            <div className={styles.imgWrap}>
              {/* AnimatedImage: clip-path reveal + hover zoom */}
              <AnimatedImage
                src={item.image}
                alt={item.title}
                style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
              />
              <div className={styles.cardSheen} aria-hidden="true" />
              <span className={styles.vegBadge}>🌿 100% PURE VEG</span>
            </div>
            <div className={styles.infoBox}>
              <h4 className={styles.itemTitle}>{item.title}</h4>
              <div className={styles.taTitle}>{item.taTitle}</div>
              <p className={styles.itemDesc}>{item.desc}</p>
              <div className={styles.bottomRow}>
                <span className={styles.priceTag}>₹{item.price}</span>
                {/* AnimatedButton: press feedback + shine sweep */}
                <AnimatedButton
                  variant="gold"
                  icon="+"
                  onClick={() => onAddToCart && onAddToCart(item.title, item.price)}
                  className={styles.btnAdd}
                >
                  Add
                </AnimatedButton>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
