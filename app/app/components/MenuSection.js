'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './MenuSection.module.css';
import AnimatedImage from './motion/AnimatedImage';
import AnimatedButton from './motion/AnimatedButton';
import motionStyles from './motion/motion.module.css';
import { DEFAULT_MEAL_SECTIONS, getEvaluatedMealSections } from '@/lib/meal_sections';

function getFallbackIconForDish(title = '', category = '', mealSection = '') {
  const t = (title || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (t.includes('coffee') || t.includes('tea') || t.includes('milk')) return '☕';
  if (t.includes('dosa') || t.includes('roast') || t.includes('rava')) return '🥞';
  if (t.includes('idli') || t.includes('idiyappam')) return '🥣';
  if (t.includes('vada') || t.includes('paniyaram') || t.includes('kozhukattai') || t.includes('kandharappam')) return '🥟';
  if (t.includes('biryani') || t.includes('rice') || t.includes('pulao') || t.includes('meals')) return '🍛';
  if (t.includes('parotta') || t.includes('kothu') || t.includes('roti') || t.includes('naan') || t.includes('chapathi')) return '🫓';
  if (t.includes('masala') || t.includes('fry') || t.includes('paneer') || t.includes('mushroom') || t.includes('channa') || t.includes('gobi')) return '🥘';
  if (t.includes('noodle') || t.includes('manchurian') || t.includes('chilli')) return '🥢';
  if (mealSection === 'BREAKFAST') return '🥞';
  if (mealSection === 'LUNCH') return '🍛';
  if (mealSection === 'EVENING_SNACKS') return '🥟';
  if (mealSection === 'DINNER') return '🌙';
  return '🍽️';
}

export default function MenuSection({
  onAddToCart,
  activeCategoryFilter,
  liveMenu,
  liveCategories,
  liveMealSections,
}) {
  // 1. Evaluated Meal Sections with live IST status & admin overrides
  const sectionsList = useMemo(() => {
    if (Array.isArray(liveMealSections) && liveMealSections.length > 0) {
      return getEvaluatedMealSections(liveMealSections);
    }
    return getEvaluatedMealSections(DEFAULT_MEAL_SECTIONS);
  }, [liveMealSections]);

  // 2. Determine default active meal section (currently active in IST or first enabled)
  const defaultSectionId = useMemo(() => {
    const active = sectionsList.find(s => s.isActive && s.isEnabled !== false);
    if (active) return active.id;
    const firstEnabled = sectionsList.find(s => s.isEnabled !== false);
    return firstEnabled ? firstEnabled.id : 'BREAKFAST';
  }, [sectionsList]);

  const [activeMealSection, setActiveMealSection] = useState(defaultSectionId);
  const [userSelectedSection, setUserSelectedSection] = useState(false);
  const [activeCategory, setActiveCategory] = useState(activeCategoryFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('displayOrder');

  // Auto-switch to current serving section if user hasn't explicitly clicked a tab
  useEffect(() => {
    if (!userSelectedSection && defaultSectionId) {
      setActiveMealSection(defaultSectionId);
    }
  }, [defaultSectionId, userSelectedSection]);

  // Reset category filter when meal section changes
  const handleSelectMealSection = (secId) => {
    setUserSelectedSection(true);
    setActiveMealSection(secId);
    setActiveCategory('all');
    setSearchQuery('');
  };

  // 3. Normalise dishes from liveMenu
  const allItems = useMemo(() => {
    if (Array.isArray(liveMenu) && liveMenu.length > 0) {
      return liveMenu.map((item) => ({
        id: item.id,
        title: item.title,
        tamilTitle: item.tamilTitle || item.taTitle || '',
        category: item.category || 'Tiffin',
        mealSection: String(item.mealSection || 'BREAKFAST').toUpperCase(),
        price: Number(item.price) || 0,
        displayOrder: item.displayOrder || 999,
        popularity: item.displayOrder ? 100 - item.displayOrder : item.isBestseller ? 50 : 10,
        desc: item.description || item.desc || '',
        image: item.image || '',
        station: item.station || 'TIFFIN',
        available: item.available !== false && item.status !== 'SOLD_OUT' && item.status !== 'UNAVAILABLE' && item.status !== '86',
      }));
    }
    return [];
  }, [liveMenu]);

  // 4. Current Meal Section Object
  const currentSection = useMemo(() => {
    return sectionsList.find(s => s.id === activeMealSection) || sectionsList[0] || DEFAULT_MEAL_SECTIONS[0];
  }, [sectionsList, activeMealSection]);

  // 5. Filter items belonging to the active meal section
  const sectionItems = useMemo(() => {
    return allItems.filter(item => item.mealSection === activeMealSection);
  }, [allItems, activeMealSection]);

  // 6. Categories for this section
  const sectionCategories = useMemo(() => {
    const cats = new Set();
    sectionItems.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return ['all', ...Array.from(cats)];
  }, [sectionItems]);

  // 7. Filtered and Sorted list for display
  const displayedItems = useMemo(() => {
    let list = sectionItems;

    // Category filter
    if (activeCategory !== 'all') {
      list = list.filter(item => (item.category || '').toLowerCase() === activeCategory.toLowerCase());
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => {
        const tEn = (item.title || '').toLowerCase();
        const tTa = (item.tamilTitle || '').toLowerCase();
        const desc = (item.desc || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        return tEn.includes(q) || tTa.includes(q) || desc.includes(q) || cat.includes(q);
      });
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'name') return (a.title || '').localeCompare(b.title || '');
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
  }, [sectionItems, activeCategory, searchQuery, sortBy]);

  const isSectionDisabled = currentSection.isEnabled === false || currentSection.overrideStatus === 'FORCE_INACTIVE';

  return (
    <section className={styles.menuSection} id="menu">
      {/* Header Emblem */}
      <div className={styles.headerBox}>
        <div className={styles.pillEmblem}>Sri Gokulam Menu</div>
        <h2 className={styles.title}>Traditional Karaikudi Delicacies</h2>
        <p className={styles.subtitle}>
          Prepared according to ancient Chettinad culinary traditions with pure cow ghee and stone-ground spices.
        </p>
      </div>

      {/* ─── 4 Scheduled Meal Section Tabs ─── */}
      <div className={styles.mealTabsNav} role="tablist" aria-label="Meal Sections">
        {sectionsList.map((sec) => {
          const isSelected = sec.id === activeMealSection;
          const count = allItems.filter(d => d.mealSection === sec.id).length;
          const isServing = sec.isActive && sec.isEnabled !== false;
          const isDisabled = sec.isEnabled === false || sec.overrideStatus === 'FORCE_INACTIVE';

          return (
            <button
              key={sec.id}
              role="tab"
              aria-selected={isSelected}
              className={`${styles.mealTab} ${isSelected ? styles.mealTabActive : ''}`}
              onClick={() => handleSelectMealSection(sec.id)}
            >
              <div className={styles.mealTabTop}>
                <div className={styles.mealTabName}>
                  <span>{sec.icon}</span>
                  <span>{sec.name}</span>
                </div>
                {isServing && (
                  <span className={styles.liveBadge} title="Currently Serving Live">
                    <span className={styles.livePulseDot} /> Serving
                  </span>
                )}
                {isDisabled && (
                  <span className={styles.closedBadge}>
                    Closed
                  </span>
                )}
                {!isServing && !isDisabled && (
                  <span className={styles.closedBadge}>
                    {sec.startTime}
                  </span>
                )}
              </div>

              <div className={styles.mealTabTamil}>{sec.tamilName}</div>

              <div className={styles.mealTabTiming}>
                <span>⏰</span>
                <span>{sec.timeLabel || `${sec.startTime} – ${sec.endTime}`}</span>
                <span style={{ marginLeft: 'auto', opacity: 0.85 }}>({count})</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── Selected Meal Section Banner ─── */}
      <div className={styles.mealBanner}>
        <div className={styles.mealBannerInfo}>
          <div className={styles.mealBannerIcon}>{currentSection.icon}</div>
          <div>
            <h3 className={styles.mealBannerTitle}>
              <span>{currentSection.name}</span>
              <span className={styles.mealBannerTamil}>• {currentSection.tamilName}</span>
            </h3>
            <p className={styles.mealBannerDesc}>
              {currentSection.description || `Authentic dishes served daily from ${currentSection.timeLabel || `${currentSection.startTime} to ${currentSection.endTime}`}.`}
            </p>
          </div>
        </div>

        {/* Live Serving Notice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {currentSection.isActive && currentSection.isEnabled !== false ? (
            <span style={{
              background: '#10b981',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
            }}>
              <span className={styles.livePulseDot} /> 🟢 Serving Now in Restaurant
            </span>
          ) : isSectionDisabled ? (
            <span style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 800,
            }}>
              🔴 Section Currently Closed
            </span>
          ) : (
            <span style={{
              background: '#fef3c7',
              color: '#b45309',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 800,
            }}>
              ⏰ Scheduled: {currentSection.timeLabel || `${currentSection.startTime} – ${currentSection.endTime}`}
            </span>
          )}
        </div>
      </div>

      {/* ─── Category Filter & Search Bar ─── */}
      <div className={styles.filterBar} data-reveal="up">
        {/* Category Pills */}
        <div className={styles.categoryButtons}>
          {sectionCategories.map((cat) => {
            const isCatActive = activeCategory.toLowerCase() === cat.toLowerCase();
            const count = cat === 'all'
              ? sectionItems.length
              : sectionItems.filter(i => (i.category || '').toLowerCase() === cat.toLowerCase()).length;

            return (
              <button
                key={cat}
                type="button"
                className={`${styles.catBtn} ${isCatActive ? styles.catBtnActive : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat === 'all' ? 'All Delicacies' : cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Search & Sort Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Instant Search */}
          <div className={styles.searchBox}>
            <span style={{ marginRight: '6px', fontSize: '0.85rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Search in English or தமிழ்..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.8rem' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Select */}
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="displayOrder">Default Menu Order</option>
            <option value="name">Alphabetical (A-Z)</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* ─── Delicacies Grid ─── */}
      {isSectionDisabled ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 24px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '16px',
          border: '1px dashed rgba(226, 168, 41, 0.35)',
          margin: '32px auto',
          maxWidth: '580px',
        }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔒</div>
          <h3 style={{ fontSize: '20px', color: '#051B41', fontWeight: '800', marginBottom: '8px' }}>
            {currentSection.name} Section Unavailable
          </h3>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
            This meal section is currently turned off by our kitchen administration. Please explore our other meal sections above or check back shortly.
          </p>
        </div>
      ) : displayedItems.length > 0 ? (
        <div className={styles.menuGrid}>
          {displayedItems.map((item) => {
            const hasCustomImage = Boolean(item.image);
            const fallbackIcon = getFallbackIconForDish(item.title, item.category, item.mealSection);

            return (
              <div
                key={item.id}
                className={`${styles.productCard} ${motionStyles.cardHover}`}
              >
                {/* Visual Header */}
                <div className={styles.imgWrap}>
                  {hasCustomImage ? (
                    <AnimatedImage
                      src={item.image}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
                    />
                  ) : (
                    <div className={styles.cardFallbackArt}>
                      <span className={styles.cardFallbackIcon}>{fallbackIcon}</span>
                      <span className={styles.cardFallbackTitle}>{item.category}</span>
                    </div>
                  )}
                  <div className={styles.cardSheen} aria-hidden="true" />
                  <span className={styles.vegBadge}>🌿 100% PURE VEG</span>
                </div>

                {/* Info Box */}
                <div className={styles.infoBox}>
                  <h4 className={styles.itemTitle}>{item.title}</h4>
                  {item.tamilTitle && (
                    <div className={styles.taTitle}>{item.tamilTitle}</div>
                  )}
                  <p className={styles.itemDesc}>
                    {item.desc || 'Authentic traditional Chettinad delicacy cooked fresh on order.'}
                  </p>

                  {/* Price & Action Row */}
                  <div className={styles.bottomRow}>
                    {item.price > 0 ? (
                      <span className={styles.priceTag}>₹{item.price}</span>
                    ) : (
                      <span className={styles.unpricedBadge}>
                        ✨ Heritage Recipe
                      </span>
                    )}
                    <AnimatedButton
                      variant="gold"
                      icon="+"
                      onClick={() => onAddToCart && onAddToCart(item.title, item.price || 0)}
                      className={styles.btnAdd}
                      ariaLabel={`Add ${item.title} to cart`}
                    >
                      Add
                    </AnimatedButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px 24px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '16px',
          border: '1px dashed rgba(226, 168, 41, 0.35)',
          margin: '32px auto',
          maxWidth: '580px',
        }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🍽️</div>
          <h3 style={{ fontSize: '20px', color: '#051B41', fontWeight: '800', marginBottom: '8px' }}>
            No Delicacies Found
          </h3>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
            {searchQuery
              ? `No items matching "${searchQuery}" in ${currentSection.name}. Try a different keyword.`
              : `No dishes currently listed under this category for ${currentSection.name}.`}
          </p>
        </div>
      )}
    </section>
  );
}
