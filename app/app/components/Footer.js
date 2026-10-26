'use client';

import styles from './Footer.module.css';

export default function Footer({ content, design, pages, footerConfig }) {
  const cfg = footerConfig || content || {};
  const brandTitle = cfg.brandTitle || ((cfg.brandTa && cfg.brandEn) ? `${cfg.brandTa} • ${cfg.brandEn}` : 'ஸ்ரீ கோகுலம் • SRI GOKULAM');
  const brandStory = cfg.brandStory || cfg.storyDescription || 'Preserving the sacred vegetarian culinary arts of Chettinad and Tamil Nadu. Every dish is seasoned with generationally perfected recipes, pure cow ghee, and sattvic love in the heart of Karaikudi.';
  const badgeText = cfg.badgeText || '🌿 100% PURE SATTVIC VEGETARIAN';
  const hours = cfg.hours || {
    breakfast: '7:00 AM – 11:00 AM',
    lunch: '12:00 PM – 3:30 PM',
    dinner: '6:30 PM – 10:30 PM',
    note: 'Open All 7 Days a Week',
  };
  const phone = cfg.primaryPhone || '+91 73583 25113';
  const email = cfg.email || 'srigokulamvegrestaurant@gmail.com';
  const address = cfg.addressLine1
    ? `${cfg.addressLine1}, ${cfg.addressLine2 || 'Sekkalai, Karaikudi, Tamil Nadu 630003'}`
    : 'Mudiyarasan Rd, near Bharat Petroleum Bunk and Thevar Silai, Sekkalai, Karaikudi, Tamil Nadu 630003';
  const social = cfg.social || {};
  const complianceText = cfg.complianceText || 'All Rights Reserved © 2026 Sri Gokulam Veg Restaurant';
  const rawDevCredit = cfg.developerCreditText || 'Designed & Developed with excellence by';
  const cleanDevCredit = rawDevCredit.replace(/\s*by\s+ajtechsolutions\s*/i, ' by').trim();
  const developerCreditText = cleanDevCredit.endsWith('by') ? cleanDevCredit : `${cleanDevCredit} by`;
  const developerName = cfg.developerName || 'AJ Nanjil Tech Solutions';
  const developerUrl = (cfg.developerUrl && !cfg.developerUrl.includes('ajtechsolutions.netlify.app'))
    ? cfg.developerUrl
    : 'https://ajnanjiltechsolutions.com/';

  const footerLinks = (Array.isArray(cfg.quickLinks) && cfg.quickLinks.length > 0)
    ? cfg.quickLinks.filter((l) => l.isVisible !== false)
    : (pages?.filter((p) => p.inFooter) || []);

  return (
    <footer className={styles.footer} id="contact">
      <div className={styles.innerLayout}>
        {/* Column 1: Heritage Identity */}
        <div className={styles.brandWrap}>
          <h4 className={styles.brandTitle}>{brandTitle}</h4>
          <p className={styles.brandText}>{brandStory}</p>
          <div className={styles.pureVegBadge}>
            <span>{badgeText}</span>
          </div>

          {/* Social Links Icons */}
          <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <a href={social.instagram || 'https://www.instagram.com/srigokulamvegrestaurant/'} target="_blank" rel="noopener noreferrer" title="Instagram" style={{ color: '#f59e0b', fontSize: '1.25rem', textDecoration: 'none' }}>
              📸
            </a>
            <a href={social.facebook || 'https://facebook.com/srigokulamveg'} target="_blank" rel="noopener noreferrer" title="Facebook" style={{ color: '#60a5fa', fontSize: '1.25rem', textDecoration: 'none' }}>
              📘
            </a>
            <a href={social.youtube || 'https://youtube.com/@srigokulamveg'} target="_blank" rel="noopener noreferrer" title="YouTube" style={{ color: '#ef4444', fontSize: '1.25rem', textDecoration: 'none' }}>
              ▶️
            </a>
            <a href={social.whatsapp || 'https://wa.me/917358325113'} target="_blank" rel="noopener noreferrer" title="WhatsApp Order" style={{ color: '#10b981', fontSize: '1.25rem', textDecoration: 'none' }}>
              💬
            </a>
            <a href={social.maps || 'https://maps.app.goo.gl/AhGsiW8B385tBdxx7'} target="_blank" rel="noopener noreferrer" title="Google Maps Location" style={{ color: '#38bdf8', fontSize: '1.25rem', textDecoration: 'none' }}>
              🗺️
            </a>
          </div>

          {footerLinks.length > 0 && (
            <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {footerLinks.map((p) => (
                <a
                  key={p.id || p.label || p.title}
                  href={p.href || p.slug}
                  style={{ color: '#93c5fd', fontSize: '0.74rem', textDecoration: 'none' }}
                >
                  • {p.label || p.title}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Hours */}
        <div className={styles.infoCol}>
          <h5 className={styles.colTitle}>Operating Hours</h5>
          <p className={styles.colText}>
            <strong>Morning Tiffin:</strong> {hours.breakfast}<br />
            <strong>Traditional Lunch:</strong> {hours.lunch}<br />
            <strong>Evening &amp; Dinner:</strong> {hours.dinner}<br />
            <span className={styles.openDaily}>{hours.note || 'Open All 7 Days a Week'}</span>
          </p>
        </div>

        {/* Column 3: Location */}
        <div className={styles.infoCol}>
          <h5 className={styles.colTitle}>Karaikudi Location</h5>
          <p className={styles.colText}>
            <strong>{cfg.locationTitle || cfg.branchName || 'Sri Gokulam Veg Restaurant'}</strong><br />
            {address}<br />
            📞 Phone: <strong><a href={`tel:${phone.replace(/\s+/g, '')}`} style={{ color: 'inherit', textDecoration: 'none' }}>{phone}</a></strong><br />
            ✉️ Email: <strong><a href={`mailto:${email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{email}</a></strong>
          </p>
        </div>
      </div>

      {/* Mandatory Technical Attribution Bar */}
      <div className={styles.complianceBar}>
        {developerCreditText}{' '}
        <a
          href={developerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.ajtechAnchor}
        >
          {developerName}
        </a>{' '}
        • {complianceText}
      </div>
    </footer>
  );
}
