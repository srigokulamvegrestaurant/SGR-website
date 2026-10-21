'use client';

import styles from './MarqueeTicker.module.css';

const MARQUEE_ITEMS = [
  { icon: '🦚', text: 'ஸ்ரீ கோகுலம் சைவ உணவகம்' },
  { icon: '✨', text: '100% PURE COW GHEE PREPARATIONS' },
  { icon: '🍱', text: 'UNLIMITED CHETTINAD RAJA MEALS AT ₹180' },
  { icon: '🥞', text: 'CRISPY GHEE ROAST DOSA WITH TRIO CHUTNEYS' },
  { icon: '☕', text: 'AUTHENTIC KUMBAKONAM BRASS FILTER COFFEE' },
  { icon: '📲', text: 'CONTACTLESS QR TABLE ORDERING WITH OTP VERIFICATION' },
  { icon: '🍃', text: 'TRADITIONAL SATTVIC CULINARY HERITAGE' },
  { icon: '⭐', text: "KARAIKUDI'S TOP RATED VEGETARIAN DINING DESTINATION" },
];

export default function MarqueeTicker({ items }) {
  const activeItems = (Array.isArray(items) && items.length > 0) ? items : MARQUEE_ITEMS;
  return (
    <div className={styles.marqueeBar}>
      <div className={styles.marqueeTrack}>
        {/* First set of items */}
        {activeItems.map((item, idx) => (
          <span key={`m1-${idx}`} className={styles.marqueeItem}>
            <span className={styles.itemIcon}>{item.icon}</span>
            {item.text}
            <span className={styles.itemSep}>•</span>
          </span>
        ))}
        {/* Duplicate set for seamless continuous loop */}
        {activeItems.map((item, idx) => (
          <span key={`m2-${idx}`} className={styles.marqueeItem}>
            <span className={styles.itemIcon}>{item.icon}</span>
            {item.text}
            <span className={styles.itemSep}>•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
