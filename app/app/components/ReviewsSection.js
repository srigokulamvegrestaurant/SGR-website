'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './ReviewsSection.module.css';

const INITIAL_REVIEWS = [
  {
    id: 1,
    name: 'Dr. Senthil Nathan',
    city: 'Karaikudi',
    tag: 'Verified Diner • Table #04',
    rating: 5,
    dish: 'Gokulam Ghee Podi Roast',
    review: 'The crispness of the ghee roast dosa on pure iron tawa is unbeatable in Karaikudi! The aroma of pure cow ghee with shallot sambar was pure heaven.',
    avatar: 'SN',
    avatarBg: '#0E2954',
    date: '2 hours ago',
  },
  {
    id: 2,
    name: 'Ananya Sundaram',
    city: 'Chennai',
    tag: 'Heritage Traveler',
    rating: 5,
    dish: '14-Item Chettinad Raja Meals',
    review: 'Best banana leaf feast in Tamil Nadu. The Ennai Kathirikai, Poondu Kuzhambu and warm Elaneer Payasam brought tears of joy. True sattvic cooking!',
    avatar: 'AS',
    avatarBg: '#0059B3',
    date: 'Yesterday',
  },
  {
    id: 3,
    name: 'Karthik Subramanian',
    city: 'Bangalore',
    tag: 'Verified Dine-In • Table #08',
    rating: 5,
    dish: 'Kumbakonam Brass Degree Coffee',
    review: 'Rich golden crema froth in traditional brass dabarah. Thick frothed cow milk and first decoction aroma. Don’t leave Karaikudi without trying this!',
    avatar: 'KS',
    avatarBg: '#c59b27',
    date: '2 days ago',
  },
  {
    id: 4,
    name: 'Priya Vijayakumar',
    city: 'Madurai',
    tag: 'Family Dine-In • Table #12',
    rating: 5,
    dish: 'Thattu Vadai Sambar Idli',
    review: 'Pillowy soft button idlis submerged in piping hot shallot sambar with a spoonful of pure ghee. Kids and elders in our family absolutely loved it.',
    avatar: 'PV',
    avatarBg: '#16a34a',
    date: '3 days ago',
  },
  {
    id: 5,
    name: 'Ramesh Balakrishnan',
    city: 'Coimbatore',
    tag: 'Frequent Traveler',
    rating: 5,
    dish: 'Crispy Medhu Vadai & Chutneys',
    review: 'The contactless QR ordering with 4-digit OTP is super fast. Food arrived piping hot within 5 minutes. The trio stone-ground chutneys are so fresh!',
    avatar: 'RB',
    avatarBg: '#b45309',
    date: '4 days ago',
  },
  {
    id: 6,
    name: 'Meenakshi Sundaram',
    city: 'Trichy',
    tag: 'Devotee & Food Connoisseur',
    rating: 5,
    dish: 'Lord Krishna Ghee Special',
    review: 'Authentic 100% pure vegetarian without onion-garlic overload on auspicious days. Divine taste and spotlessly clean AC heritage dining hall.',
    avatar: 'MS',
    avatarBg: '#0E2954',
    date: '5 days ago',
  },
];

const INSTAGRAM_REELS = [
  {
    id: 'reel-1',
    creator: '@karaikudi_foodie',
    creatorName: 'Karaikudi Food Trails',
    views: '48.2K',
    likes: '4.1K',
    title: 'That satisfying Ghee Podi Roast crunch! 🔥🥞',
    caption: 'Listen to that crunch! Sri Gokulam in Karaikudi makes the crispest pure cow ghee dosa with 3 varieties of homestyle chutneys. Must visit!',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80',
    audioTrack: 'Original Audio • Sri Gokulam Dosa Sizzle',
    dishTag: 'Ghee Podi Roast',
  },
  {
    id: 'reel-2',
    creator: '@tamilnadueats',
    creatorName: 'Tamil Nadu Eats',
    views: '85.4K',
    likes: '7.8K',
    title: '14-Course Chettinad Raja Banana Leaf Feast! 🍱👑',
    caption: 'Unlimited Ponni rice, Ennai Kathirikai, drumstick sambar, appalam, and Elaneer Payasam for just ₹180! Supreme sattvic pure veg.',
    image: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=600&q=80',
    audioTrack: 'Traditional Nadaswaram Beats',
    dishTag: 'Raja Meals Feast',
  },
  {
    id: 'reel-3',
    creator: '@filtercoffee_lovers',
    creatorName: 'Filter Coffee Diaries',
    views: '36.9K',
    likes: '3.2K',
    title: 'Meter Coffee froth in authentic Brass Dabarah ☕✨',
    caption: 'First decoction brass brew with thick frothed milk at Sri Gokulam. The golden crema froth is unreal!',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    audioTrack: 'Morning Suprabhatam Vibe',
    dishTag: 'Brass Filter Coffee',
  },
  {
    id: 'reel-4',
    creator: '@chettinad_bites',
    creatorName: 'Chettinad Bites',
    views: '52.1K',
    likes: '5.0K',
    title: 'Cascading Hot Sambar over Button Idlis 🥣🥟',
    caption: 'Dunking crispy hot Medhu Vadai and button idlis into shallot sambar. Morning breakfast bliss in Karaikudi!',
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
    audioTrack: 'Sattvic Kitchen Sounds',
    dishTag: 'Sambar Idli Platter',
  },
];

const YOUTUBE_REVIEWS = [
  {
    id: 'yt-1',
    channel: 'Chettinad Food Vlog',
    subscribers: '180K subscribers',
    duration: '11:45',
    views: '92K views',
    date: '2 weeks ago',
    title: 'Sri Gokulam Veg Restaurant Karaikudi Review | Best Pure Ghee Tiffin & Meals in Town',
    description: 'Full food tour exploring Karaikudi’s highest rated pure vegetarian spot. We try their signature Ghee Podi Roast, 14-item Raja Meals, and Kumbakonam Degree Coffee!',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=80',
    rating: '5/5 Stars Recommended',
  },
  {
    id: 'yt-2',
    channel: 'Tamil Nadu Heritage Travels',
    subscribers: '320K subscribers',
    duration: '14:20',
    views: '145K views',
    date: '1 month ago',
    title: 'Unbelievable ₹180 Unlimited Banana Leaf Feast! Karaikudi Sri Gokulam Pure Veg',
    description: 'Visiting the famous Sri Gokulam near Karaikudi heritage mansions. Witness the hygienic kitchen, pure cow ghee roasting, and contactless QR table ordering.',
    image: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=900&q=80',
    rating: 'Must-Visit Spot',
  },
  {
    id: 'yt-3',
    channel: 'South Indian Food Hunters',
    subscribers: '95K subscribers',
    duration: '08:35',
    views: '54K views',
    date: '3 weeks ago',
    title: 'World Famous Kumbakonam Brass Filter Coffee & Ghee Roast in Karaikudi',
    description: 'Early morning breakfast vlog at Sri Gokulam. Watch how they pull the meter coffee and roast crispy dosas in pure cow ghee.',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80',
    rating: 'Chef Verified',
  },
];

export default function ReviewsSection({ customerReviews, videoReviews }) {
  // Dynamic reviews from CMS with fallback to initial seed
  const initialData = (Array.isArray(customerReviews) && customerReviews.length > 0)
    ? customerReviews.filter((r) => r.isVisible !== false)
    : INITIAL_REVIEWS;

  const [reviews, setReviews] = useState(initialData);

  useEffect(() => {
    if (Array.isArray(customerReviews) && customerReviews.length > 0) {
      setReviews(customerReviews.filter((r) => r.isVisible !== false));
    }
  }, [customerReviews]);

  // Compute dynamic reels and youtube videos from CMS
  const allVideos = (Array.isArray(videoReviews) && videoReviews.length > 0)
    ? videoReviews.filter((v) => v.isVisible !== false)
    : [...INSTAGRAM_REELS.map(r => ({ ...r, type: 'reel' })), ...YOUTUBE_REVIEWS.map(y => ({ ...y, type: 'youtube' }))];

  const reelsList = allVideos.filter((v) => v.type === 'reel' || (v.id && String(v.id).startsWith('reel')));
  const youtubeList = allVideos.filter((v) => v.type === 'youtube' || (v.id && String(v.id).startsWith('yt')));

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'reels' | 'youtube'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMediaModal, setActiveMediaModal] = useState(null); // { type: 'reel' | 'youtube', item }

  // New Review Form State
  const [formName, setFormName] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formHoverRating, setFormHoverRating] = useState(0);
  const [formDish, setFormDish] = useState('Gokulam Ghee Podi Roast');
  const [formText, setFormText] = useState('');
  const [formSubmittedToast, setFormSubmittedToast] = useState(null);

  const movingTrackRef = useRef(null);

  const handleOpenAddReview = () => {
    setIsModalOpen(true);
  };

  const handleCloseAddReview = () => {
    setIsModalOpen(false);
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!formName.trim() || !formText.trim()) return;

    // Create initials
    const words = formName.trim().split(' ');
    const initials = words.length > 1
      ? (words[0][0] + words[1][0]).toUpperCase()
      : formName.trim().substring(0, 2).toUpperCase();

    const newReview = {
      id: Date.now(),
      name: formName.trim(),
      city: formCity.trim() || 'Karaikudi Diner',
      tag: 'Verified Diner • Just Now',
      rating: formRating,
      dish: formDish,
      review: formText.trim(),
      avatar: initials,
      avatarBg: '#0059B3',
      date: 'Just now',
    };

    setReviews([newReview, ...reviews]);
    setIsModalOpen(false);
    setFormSubmittedToast(`🎉 Thank you ${formName}! Your review is live in our moving customer wall.`);

    // Reset form
    setFormName('');
    setFormCity('');
    setFormRating(5);
    setFormText('');

    setTimeout(() => {
      setFormSubmittedToast(null);
    }, 5500);
  };

  return (
    <section className={styles.reviewsSection} id="reviews">
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.headerBox} data-reveal="up">
          <div className={styles.pillEmblem}>Guest Love &amp; Social Proof</div>
          <h2 className={styles.title}>Customer Feedback &amp; Video Reviews</h2>
          <p className={styles.subtitle}>
            Hear what authentic vegetarian food lovers, food vloggers, and travelers say about our pure ghee heritage dining in Karaikudi.
          </p>

          {/* Social Proof Stats Badges */}
          <div className={styles.statsRow}>
            <div className={styles.statBadge}>
              <span className={styles.statIcon}>⭐</span>
              <strong>4.9 / 5.0</strong>
              <span className={styles.statSub}>2,450+ Google Reviews</span>
            </div>
            <div className={styles.statBadge}>
              <span className={styles.statIcon}>📸</span>
              <strong>120K+</strong>
              <span className={styles.statSub}>Instagram Reels Views</span>
            </div>
            <div className={styles.statBadge}>
              <span className={styles.statIcon}>🎥</span>
              <strong>45K+</strong>
              <span className={styles.statSub}>YouTube Video Views</span>
            </div>
            <div className={styles.statBadge}>
              <span className={styles.statIcon}>🌱</span>
              <strong>100%</strong>
              <span className={styles.statSub}>Pure Cow Ghee Sattvic</span>
            </div>
          </div>
        </div>

        {/* Tab Filters & "Write a Review" Button */}
        <div className={styles.tabBar}>
          <div className={styles.tabButtons}>
            <button
              className={`${styles.tabBtn} ${activeTab === 'all' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <span>🌟</span>
              <span className={styles.tabFullText}>Moving Reviews ({reviews.length})</span>
              <span className={styles.tabShortText}>Reviews ({reviews.length})</span>
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'reels' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('reels')}
            >
              <span>📸</span>
              <span className={styles.tabFullText}>Instagram Reels ({reelsList.length})</span>
              <span className={styles.tabShortText}>Reels ({reelsList.length})</span>
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'youtube' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('youtube')}
            >
              <span>🎥</span>
              <span className={styles.tabFullText}>YouTube Reviews ({youtubeList.length})</span>
              <span className={styles.tabShortText}>YouTube ({youtubeList.length})</span>
            </button>
          </div>

          <button className={styles.btnWriteReview} onClick={handleOpenAddReview}>
            <span>✍️</span> Add Your Review
          </button>
        </div>

        {/* Live Submission Toast Alert */}
        {formSubmittedToast && (
          <div className={styles.toastSuccess}>
            {formSubmittedToast}
          </div>
        )}

        {/* TAB 1: MOVING CUSTOMER REVIEWS WALL (Infinite Scrolling Marquee) */}
        {(activeTab === 'all' || activeTab === 'reviews') && (
          <div className={styles.movingSectionWrap}>
            <div className={styles.subHeaderWrap}>
              <h3 className={styles.trackTitle}>
                <span>💬</span> Real Diners, Real Flavors (Live Moving Wall)
              </h3>
              <span className={styles.pauseHint}>Touch or hover to read cards</span>
            </div>

            {/* Moving Customer Review Marquee Bar */}
            <div className={styles.marqueeOuter}>
              <div className={styles.marqueeTrack} ref={movingTrackRef}>
                {/* Render reviews twice for seamless infinite moving loop */}
                {[...reviews, ...reviews].map((rev, idx) => (
                  <div key={`${rev.id}-${idx}`} className={styles.reviewCard}>
                    <div className={styles.cardTop}>
                      <div className={styles.avatarWrap} style={{ background: rev.avatarBg }}>
                        {rev.avatar}
                      </div>
                      <div className={styles.nameMeta}>
                        <h4 className={styles.reviewerName}>{rev.name}</h4>
                        <span className={styles.reviewerCity}>{rev.city} • <strong className={styles.greenVerified}>{rev.tag}</strong></span>
                      </div>
                      <div className={styles.cardDate}>{rev.date}</div>
                    </div>

                    <div className={styles.ratingRow}>
                      <div className={styles.stars}>
                        {'★'.repeat(rev.rating)}
                        {'☆'.repeat(5 - rev.rating)}
                      </div>
                      <span className={styles.dishPill}>{rev.dish}</span>
                    </div>

                    <p className={styles.reviewQuote}>“{rev.review}”</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INSTAGRAM REELS REVIEW SHOWCASE */}
        {(activeTab === 'all' || activeTab === 'reels') && (
          <div className={styles.socialMediaSection}>
            <div className={styles.subHeaderWrap}>
              <h3 className={styles.trackTitle}>
                <span className={styles.igSvgBadge}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={styles.igSvgIcon}>
                    <defs>
                      <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f09433" />
                        <stop offset="30%" stopColor="#e6683c" />
                        <stop offset="60%" stopColor="#dc2743" />
                        <stop offset="100%" stopColor="#bc1888" />
                      </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="6" stroke="url(#igGrad)" strokeWidth="2.2" />
                    <circle cx="12" cy="12" r="4.5" stroke="url(#igGrad)" strokeWidth="2.2" />
                    <circle cx="17.5" cy="6.5" r="1.3" fill="url(#igGrad)" />
                  </svg>
                </span>
                Trending Instagram Reels &amp; Food Pulls
              </h3>
              <span className={styles.pauseHint}>👆 Swipe &amp; tap to watch reels</span>
            </div>

            <div className={styles.reelsGrid}>
              {reelsList.map((reel) => (
                <div
                  key={reel.id}
                  className={styles.reelCard}
                  onClick={() => setActiveMediaModal({ type: 'reel', item: reel })}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.reelMediaBox}>
                    <img src={reel.image} alt={reel.title} className={reel.image ? styles.reelImg : ''} />
                    <div className={styles.reelOverlay}></div>

                    {/* Instagram Reel Top Badge */}
                    <div className={styles.reelHeaderBadge}>
                      <span className={styles.reelBadgeIcon}>⚡</span> REEL
                    </div>

                    {/* Pulsing Play Button */}
                    <div className={styles.playButtonPill}>
                      <span className={styles.playTriangle}>▶</span>
                    </div>

                    {/* Views & Likes Badges */}
                    <div className={styles.reelStats}>
                      <span>👁️ {reel.views}</span>
                      <span>❤️ {reel.likes}</span>
                    </div>

                    {/* Bottom Metadata */}
                    <div className={styles.reelBottomMeta}>
                      <div className={styles.creatorHandle}>{reel.creator}</div>
                      <div className={styles.reelCaptionTitle}>{reel.title}</div>
                      <div className={styles.audioBadge}>
                        <span className={styles.musicNote}>🎵</span> {reel.audioTrack}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: YOUTUBE VIDEO REVIEWS & FOOD VLOGS */}
        {(activeTab === 'all' || activeTab === 'youtube') && (
          <div className={styles.youtubeSection}>
            <div className={styles.subHeaderWrap}>
              <h3 className={styles.trackTitle}>
                <span className={styles.ytRedIcon}>🎥</span> Featured YouTube Food Vlogs &amp; Reviews
              </h3>
              <span className={styles.pauseHint}>Tap video to view coverage</span>
            </div>

            <div className={styles.youtubeGrid}>
              {youtubeList.map((yt) => (
                <div
                  key={yt.id}
                  className={styles.ytCard}
                  onClick={() => setActiveMediaModal({ type: 'youtube', item: yt })}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.ytThumbWrap}>
                    <img src={yt.image} alt={yt.title} className={styles.ytThumb} />
                    <div className={styles.ytThumbOverlay}></div>
                    
                    {/* YouTube Big Play Button */}
                    <div className={styles.ytPlayBadge}>
                      <svg viewBox="0 0 68 48" className={styles.ytSvgIcon}>
                        <path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#ff0000" />
                        <path d="M45 24L27 14v20" fill="#ffffff" />
                      </svg>
                    </div>

                    <span className={styles.ytDuration}>{yt.duration}</span>
                    <span className={styles.ytRatingBadge}>{yt.rating}</span>
                  </div>

                  <div className={styles.ytCardBody}>
                    <div className={styles.ytChannelRow}>
                      <div className={styles.ytChannelIcon}>🍛</div>
                      <div>
                        <strong className={styles.ytChannelName}>{yt.channel}</strong>
                        <div className={styles.ytSubscribers}>{yt.subscribers} • {yt.views}</div>
                      </div>
                    </div>
                    <h4 className={styles.ytTitle}>{yt.title}</h4>
                    <p className={styles.ytDesc}>{yt.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Google Maps Review CTA Banner */}
        <div className={styles.googleCtaBox}>
          <div className={styles.googleLeft}>
            <div className={styles.googleIcon}>🗺️</div>
            <div>
              <h4 className={styles.googleTitle}>Dine with us recently?</h4>
              <p className={styles.googleDesc}>Help Karaikudi travelers discover authentic pure ghee Sattvic food by sharing your review on Google Maps.</p>
            </div>
          </div>
          <button className={styles.btnGoogleMaps} onClick={handleOpenAddReview}>
            <span>⭐</span> Rate Us on Google Maps
          </button>
        </div>
      </div>

      {/* ======================================================================
          MODAL 1: "ADD YOUR REVIEW" POPUP FORM
          ====================================================================== */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseAddReview}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <span className={styles.modalHeaderIcon}>✍️</span>
                <div>
                  <h3>Share Your Dining Experience</h3>
                  <p>Sri Gokulam Pure Veg • Karaikudi Heritage</p>
                </div>
              </div>
              <button className={styles.modalCloseBtn} onClick={handleCloseAddReview} aria-label="Close review dialog">
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className={styles.reviewForm}>
              {/* Star Rating Selector */}
              <div className={styles.formGroupRating}>
                <label>Your Overall Rating:</label>
                <div className={styles.interactiveStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`${styles.starInput} ${(formHoverRating || formRating) >= star ? styles.starFilled : ''}`}
                      onMouseEnter={() => setFormHoverRating(star)}
                      onMouseLeave={() => setFormHoverRating(0)}
                      onClick={() => setFormRating(star)}
                      role="button"
                      tabIndex={0}
                    >
                      ★
                    </span>
                  ))}
                  <span className={styles.ratingLabelText}>
                    {formRating === 5 ? '🌟 Exceptional (5/5)' : `${formRating} Stars`}
                  </span>
                </div>
              </div>

              {/* Name & City Input */}
              <div className={styles.formRowTwo}>
                <div className={styles.formField}>
                  <label>Your Name *</label>
                  <input
                    type="text"
                    id="reviewAuthorName"
                    name="authorName"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className={styles.textInput}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="reviewAuthorCity">Your City / Table No.</label>
                  <input
                    type="text"
                    id="reviewAuthorCity"
                    name="authorCity"
                    placeholder="e.g. Madurai / Table #07"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className={styles.textInput}
                  />
                </div>
              </div>

              {/* Dish Selector */}
              <div className={styles.formField}>
                <label>What Did You Enjoy Most?</label>
                <select
                  value={formDish}
                  onChange={(e) => setFormDish(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="Gokulam Ghee Podi Roast">🥞 Gokulam Ghee Podi Roast</option>
                  <option value="14-Item Chettinad Raja Meals">🍱 14-Item Chettinad Raja Meals</option>
                  <option value="Kumbakonam Brass Degree Coffee">☕ Kumbakonam Brass Degree Coffee</option>
                  <option value="Thattu Vadai Sambar Idli">🥣 Thattu Vadai Sambar Idli Platter</option>
                  <option value="Medu Vadai & Chutney Trio">🥟 Crispy Medhu Vadai & Trio Chutneys</option>
                  <option value="General Ambiance & Service">✨ Overall Hospitality & Divine Ambiance</option>
                </select>
              </div>

              {/* Review Text */}
              <div className={styles.formField}>
                <label>Your Review / Feedback *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us about the crispness, pure ghee aroma, sambar taste, or service quality..."
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  className={styles.textareaInput}
                />
              </div>

              {/* Action Buttons */}
              <div className={styles.formActions}>
                <button type="button" className={styles.btnCancel} onClick={handleCloseAddReview}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPublish}>
                  <span>🚀</span> Publish Review to Live Wall
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL 2: VIDEO / REEL PREVIEW MODAL
          ====================================================================== */}
      {activeMediaModal && (
        <div className={styles.modalOverlay} onClick={() => setActiveMediaModal(null)}>
          <div className={styles.mediaModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.mediaModalHeader}>
              <div className={styles.mediaModalTitleWrap}>
                <span className={styles.mediaTypeIcon}>
                  {activeMediaModal.type === 'reel' ? '📸' : '🎥'}
                </span>
                <div>
                  <h4>
                    {activeMediaModal.type === 'reel'
                      ? activeMediaModal.item.creator
                      : activeMediaModal.item.channel}
                  </h4>
                  <span className={styles.mediaViewsPill}>
                    {activeMediaModal.item.views} • Verified Review
                  </span>
                </div>
              </div>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setActiveMediaModal(null)}
                aria-label="Close media player"
              >
                ✕
              </button>
            </div>

            <div className={styles.mediaPlayerStage}>
              <img
                src={activeMediaModal.item.image}
                alt={activeMediaModal.item.title}
                className={styles.mediaModalImg}
              />
              <div className={styles.simulatedPlayOverlay}>
                <div className={styles.pulseCenterPlay}>▶</div>
                <div className={styles.videoPlayingBadge}>
                  {activeMediaModal.type === 'reel'
                    ? 'Instagram Reel Preview'
                    : 'YouTube HD Food Vlog'}
                </div>
              </div>
            </div>

            <div className={styles.mediaModalFooter}>
              <h4>{activeMediaModal.item.title}</h4>
              <p>
                {activeMediaModal.type === 'reel'
                  ? activeMediaModal.item.caption
                  : activeMediaModal.item.description}
              </p>
              <div className={styles.mediaModalButtons}>
                <button
                  className={styles.btnOrderFromVideo}
                  onClick={() => {
                    setActiveMediaModal(null);
                    const el = document.getElementById('menu');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <span>🛒</span> Order This Dish from Menu
                </button>
                <button
                  className={styles.btnOpenExternal}
                  onClick={() => setActiveMediaModal(null)}
                >
                  ✓ Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
