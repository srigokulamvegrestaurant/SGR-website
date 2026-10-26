'use client';

import { useState } from 'react';
import styles from './ChooseUsSection.module.css';

const PILLARS = [
  {
    id: 'sattvic',
    icon: '🌱',
    badge: '100% Pure Veg',
    titleEn: '100% Pure Vegetarian & Sattvic Purity',
    titleTa: 'தூய சைவ பாரம்பரியம்',
    description:
      'Prepared in a strictly dedicated, holy vegetarian kitchen. Zero animal products, no artificial food colorings, zero MSG or chemical tenderizers, and no artificial essence. Pure, wholesome nourishment honoring timeless traditions.',
    highlight: 'Strictly Consecrated Kitchen',
  },
  {
    id: 'ghee',
    icon: '🧈',
    badge: 'Pure Cow Ghee',
    titleEn: '100% Churned Cow Ghee & Cold-Pressed Wood Oils',
    titleTa: 'சுத்தமான பசு நெய் & மரச்செக்கு எண்ணெய்',
    description:
      'Every crispy golden roast dosa, melt-in-the-mouth kesari, and traditional sweet is bathed in pure aromatic cow ghee. Our authentic curries and sambars are tempered in traditional cold-pressed (Marachekku) sesame and groundnut oils.',
    highlight: 'Zero Reused Oils • Pure Cow Ghee',
  },
  {
    id: 'masalas',
    icon: '🌶️',
    badge: 'Stone-Ground',
    titleEn: 'Hand-Pounded Stone-Ground Chettinad Spices',
    titleTa: 'அம்மி அரைத்த பாரம்பரிய மசாலா',
    description:
      'Whole black pepper, Ceylon cinnamon, star anise, and Kalpasi (black stone flower) are sourced directly from Chettinad farms and ground fresh every dawn using traditional granite wet-grinders to preserve fragrant essential oils.',
    highlight: 'Freshly Ground Daily at 5:00 AM',
  },
  {
    id: 'produce',
    icon: '🌾',
    badge: 'Daily Farm Fresh',
    titleEn: '4:30 AM Farm-to-Plate Fresh Produce',
    titleTa: 'பண்ணை புதிய நாட்டு காய்கறிகள்',
    description:
      'We never use frozen or canned produce. Country shallots (chinna vengayam), native drumsticks, fresh vine tomatoes, and fragrant coriander arrive at our kitchen every morning before sunrise from surrounding Tamil Nadu farms.',
    highlight: 'Farm-to-Table Every Single Dawn',
  },
  {
    id: 'feast',
    icon: '🍃',
    badge: 'Royal Dining',
    titleEn: 'Traditional Plantain Leaf Royal Feast',
    titleTa: 'அரச வாழை இலை விருந்து',
    description:
      'Experience the legendary hospitality of Karaikudi. Savor unlimited fragrant Ponni rice, podi, ghee, shallot sambar, rasam, vatha kuzhambu, kootu, poriyal, appalam, and jaggery payasam served piping hot on fresh cut banana leaves.',
    highlight: 'Unlimited Authentic Chettinad Raja Meals',
  },
  {
    id: 'coffee',
    icon: '☕',
    badge: 'First Decoction',
    titleEn: 'Kumbakonam Degree Filter Brass Brew',
    titleTa: 'கும்பகோணம் பித்தளை டிகிரி காபி',
    description:
      'First-decoction plantation Peaberry and Arabica beans slow-dripped in traditional brass percolation filters. Hand-frothed with thick country cow milk and served piping hot in gleaming brass davarah-tumbler sets.',
    highlight: 'Aromatic 1st-Decoction Brass Filter Brew',
  },
];

const PROMISE_TABS = [
  {
    id: 'purity',
    label: 'Purity & Kitchen Standards',
    tamilLabel: 'தூய்மை நெறிமுறைகள்',
    icon: '✨',
    points: [
      'Multi-stage RO purified water used for all boiling, steaming, and drinking.',
      'Daily morning kitchen inspection and spotless stainless steel prep stations.',
      'Zero reuse of cooking oils — tested and audited daily for food safety.',
      'Daily fresh curd and ghee churned to ensure peak probiotic goodness.',
    ],
  },
  {
    id: 'heritage',
    label: 'Chettinad Heritage & Recipes',
    tamilLabel: 'பாரம்பரிய சமையல் கலை',
    icon: '🏛️',
    points: [
      'Authentic generational recipes preserved from Karaikudi culinary matriarchs (Aachi Samayal).',
      'Traditional slow-simmering in unglazed clay pots and heavy-bottomed brass cauldrons.',
      'Signature secret podis and spice blends prepared without commercial preservatives.',
      'True to our roots: balanced sattvic recipes gentle on the stomach and rich in authentic taste.',
    ],
  },
  {
    id: 'hospitality',
    label: 'Guest Comfort & Warm Service',
    tamilLabel: 'அன்பான விருந்தோம்பல்',
    icon: '🪷',
    points: [
      'Spacious Air-Conditioned Royal Family Dining Hall and breezy Heritage Veranda.',
      'Warm and attentive traditional South Indian hospitality where guests are welcomed like family.',
      'Swift contactless QR table ordering or attentive table captain service.',
      'Hassle-free parking with dedicated assistance on Mudiyarasan Salai (near Bharat Petroleum Bunk).',
    ],
  },
];

const STATS = [
  { num: '25+', label: 'Years Culinary Legacy', sub: 'காரைக்குடி பாரம்பரியம்' },
  { num: '100%', label: 'Pure Veg & Cow Ghee', sub: 'தூய நெய் & சைவ சமையல்' },
  { num: '4.9 ★', label: 'Top Rated in Karaikudi', sub: '50,000+ திருப்திகரமான வாடிக்கையாளர்கள்' },
  { num: '40+', label: 'Chettinad Heritage Recipes', sub: 'பாரம்பரிய கைமண உணவுகள்' },
];

export default function ChooseUsSection({ onOpenReservationModal }) {
  const [activeTab, setActiveTab] = useState('purity');

  const currentTab = PROMISE_TABS.find((t) => t.id === activeTab) || PROMISE_TABS[0];

  return (
    <section className={styles.chooseUsSection} id="choose-us">
      {/* Anchors for smooth hash scrolling */}
      <span id="why-choose-us" className={styles.invisibleAnchor} />
      <span id="about-us" className={styles.invisibleAnchor} />
      <span id="table-qr" className={styles.invisibleAnchor} />

      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.header}>
          <div className={styles.pillBadge}>
            <span className={styles.sparkle}>✨</span>
            <span>WHY CHOOSE SRI GOKULAM • எங்களை ஏன் தேர்ந்தெடுக்க வேண்டும்?</span>
          </div>

          <h2 className={styles.title}>
            Pure Tradition, Sacred Taste &amp;{' '}
            <span className={styles.titleHighlight}>Royal Chettinad Hospitality</span>
          </h2>

          <p className={styles.tamilSubtitle}>
            காரைக்குடியின் பாரம்பரிய சுத்த சைவ சுவை, தூய பசு நெய் &amp; அன்பான விருந்தோம்பல்
          </p>

          <p className={styles.description}>
            For over two decades in Karaikudi, Sri Gokulam has stood as the gold standard of authentic
            Chettinad vegetarian dining. We preserve the holy culinary wisdom of Tamil Nadu: slow-cooked
            tempering, whole stone-ground spices, pure churned cow ghee, and heartfelt hospitality.
          </p>
        </div>

        {/* 6 Value Pillars Grid */}
        <div className={styles.pillarsGrid}>
          {PILLARS.map((pillar, idx) => (
            <div
              key={pillar.id}
              className={styles.pillarCard}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className={styles.cardTopRow}>
                <div className={styles.iconCircle}>
                  <span className={styles.pillarIcon}>{pillar.icon}</span>
                </div>
                <span className={styles.cardBadge}>{pillar.badge}</span>
              </div>

              <h3 className={styles.pillarTitleEn}>{pillar.titleEn}</h3>
              <div className={styles.pillarTitleTa}>{pillar.titleTa}</div>

              <p className={styles.pillarDesc}>{pillar.description}</p>

              <div className={styles.cardHighlight}>
                <span className={styles.checkIcon}>✓</span>
                <span>{pillar.highlight}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Stats Ribbon */}
        <div className={styles.statsRibbon}>
          {STATS.map((stat, i) => (
            <div key={i} className={styles.statBox}>
              <div className={styles.statNum}>{stat.num}</div>
              <div className={styles.statLabel}>{stat.label}</div>
              <div className={styles.statSub}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Interactive "The Sri Gokulam Promise" Tab Showcase */}
        <div className={styles.promiseShowcase}>
          <div className={styles.showcaseHeader}>
            <h3 className={styles.showcaseTitle}>
              The Sri Gokulam Quality Promise <span className={styles.goldDot}>•</span> ஸ்ரீ கோகுலம் உறுதிமொழி
            </h3>
            <p className={styles.showcaseSubtitle}>
              Click each pillar below to explore how we guarantee perfection in every meal.
            </p>
          </div>

          {/* Tab Buttons */}
          <div className={styles.tabsNav} role="tablist">
            {PROMISE_TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className={styles.tabIcon}>{tab.icon}</span>
                <div className={styles.tabTextWrap}>
                  <span className={styles.tabLabel}>{tab.label}</span>
                  <span className={styles.tabSub}>{tab.tamilLabel}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Active Tab Panel */}
          <div className={styles.tabPanel} role="tabpanel">
            <div className={styles.panelGrid}>
              {currentTab.points.map((pt, idx) => (
                <div key={idx} className={styles.pointItem}>
                  <div className={styles.pointNumber}>{idx + 1}</div>
                  <p className={styles.pointText}>{pt}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions inside Promise */}
            <div className={styles.promiseCtaRow}>
              <button
                className={styles.btnReserve}
                onClick={() => onOpenReservationModal && onOpenReservationModal()}
              >
                <span>📅 Book a Table Reservation</span>
                <span className={styles.btnArrow}>→</span>
              </button>

              <a href="#menu" className={styles.btnExploreMenu}>
                <span>📋 Explore Full Menu</span>
              </a>

              <a href="tel:+919876543210" className={styles.btnCall}>
                <span>📞 +91 98765 43210</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
