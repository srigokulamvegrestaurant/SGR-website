'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './MenuSection.module.css';
import AnimatedImage from './motion/AnimatedImage';
import AnimatedButton from './motion/AnimatedButton';
import motionStyles from './motion/motion.module.css';

const MENU_DATA = [];

const CATEGORIES = [
  { id: 'all', label: 'All Items' },
];

export default function MenuSection({ onAddToCart, activeCategoryFilter, liveMenu, liveCategories }) {
  const [activeCategory, setActiveCategory] = useState(activeCategoryFilter || 'all');
  const [sortBy, setSortBy] = useState('popular');

  useEffect(() => {
    if (activeCategoryFilter) {
      setActiveCategory(activeCategoryFilter);
    }
  }, [activeCategoryFilter]);

  const categoriesList = useMemo(() => {
    if (Array.isArray(liveCategories) && liveCategories.length > 0) {
      const mapped = liveCategories.map((c) => ({
        id: (c.name || '').toLowerCase(),
        label: `${c.icon ? c.icon + ' ' : ''}${c.name}`,
      }));
      return [{ id: 'all', label: 'All Items' }, ...mapped];
    }
    return CATEGORIES;
  }, [liveCategories]);

  const itemsList = useMemo(() => {
    if (Array.isArray(liveMenu) && liveMenu.length > 0) {
      return liveMenu.map((item) => ({
        id: item.id,
        title: item.title,
        taTitle: item.tamilTitle || item.taTitle || '',
        category: (item.category || '').toLowerCase(),
        price: Number(item.price) || 0,
        popularity: item.displayOrder ? 10 - item.displayOrder : item.isBestseller ? 10 : 7,
        desc: item.description || item.desc || '',
        image: item.image || '',
        available: item.available !== false && item.status !== '86' && item.status !== 'OUT_OF_STOCK',
      }));
    }
    return MENU_DATA;
  }, [liveMenu]);

  const filteredAndSortedItems = useMemo(() => {
    let list = itemsList;
    if (activeCategory !== 'all') {
      list = list.filter((item) => (item.category || '').toLowerCase() === activeCategory.toLowerCase());
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      return b.popularity - a.popularity;
    });
  }, [itemsList, activeCategory, sortBy]);

  return (
    <section className={styles.menuSection} id="menu">
      <div className={styles.headerBox}>
        <div className={styles.pillEmblem}>Gokulam Menu</div>
        <h2 className={styles.title}>Curated Traditional Delicacies</h2>
        <p className={styles.subtitle}>Select your favorite category or sort by price and popularity.</p>
      </div>

      {/* Filter and Sort Bar */}
      {categoriesList.length > 1 && (
        <div className={styles.filterBar} data-reveal="up">
          <div className={styles.categoryButtons}>
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                className={`${styles.catBtn} ${activeCategory.toLowerCase() === cat.id.toLowerCase() ? styles.catBtnActive : ''}`}
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
      )}

      {/* Product Grid or Empty State */}
      {filteredAndSortedItems.length > 0 ? (
        <div className={`${styles.menuGrid} reveal-stagger`}>
          {filteredAndSortedItems.map((item) => (
            <div
              key={item.id}
              className={`${styles.productCard} ${motionStyles.cardHover}`}
              data-reveal="scale"
            >
              <div className={styles.imgWrap}>
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
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px 24px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '16px',
          border: '1px dashed rgba(212, 160, 23, 0.25)',
          margin: '32px auto',
          maxWidth: '580px',
        }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🍽️</div>
          <h3 style={{ fontSize: '20px', color: '#111827', fontWeight: '700', marginBottom: '8px' }}>
            Menu Being Updated
          </h3>
          <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
            Our chefs are preparing today&apos;s fresh South Indian menu. Please check back shortly or visit us to explore today&apos;s live kitchen specials!
          </p>
        </div>
      )}
    </section>
  );
}
