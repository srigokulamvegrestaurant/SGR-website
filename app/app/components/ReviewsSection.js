'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './ReviewsSection.module.css';

const INITIAL_REVIEWS = [];
const INSTAGRAM_REELS = [];
const YOUTUBE_REVIEWS = [];

export default function ReviewsSection({ customerReviews, videoReviews }) {
  // Dynamic reviews from CMS with fallback to initial seed
  const initialData = (Array.isArray(customerReviews) && customerReviews.length > 0)
    ? customerReviews.filter((r) => r.isVisible !== false)
    : INITIAL_REVIEWS;

  const [reviews, setReviews] = useState(initialData);

  useEffect(() => {
    if (Array.isArray(customerReviews)) {
      setReviews(customerReviews.filter((r) => r.isVisible !== false));
    }
  }, [customerReviews]);

  // Compute dynamic reels and youtube videos from CMS
  const allVideos = Array.isArray(videoReviews)
    ? videoReviews.filter((v) => v.isVisible !== false)
    : [];

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
            {reelsList.length > 0 && (
              <button
                className={`${styles.tabBtn} ${activeTab === 'reels' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('reels')}
              >
                <span>📸</span>
                <span className={styles.tabFullText}>Instagram Reels ({reelsList.length})</span>
                <span className={styles.tabShortText}>Reels ({reelsList.length})</span>
              </button>
            )}
            {youtubeList.length > 0 && (
              <button
                className={`${styles.tabBtn} ${activeTab === 'youtube' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('youtube')}
              >
                <span>🎥</span>
                <span className={styles.tabFullText}>YouTube Reviews ({youtubeList.length})</span>
                <span className={styles.tabShortText}>YouTube ({youtubeList.length})</span>
              </button>
            )}
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
            {reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '1rem', border: '1px dashed rgba(212, 175, 55, 0.25)', maxWidth: '650px', margin: '1rem auto' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✨</div>
                <h4 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 700 }}>Be the First to Review Sri Gokulam</h4>
                <p style={{ maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Every dish is crafted with sacred culinary devotion in Karaikudi. Share your dining experience with us.
                </p>
                <button className={styles.btnWriteReview} onClick={handleOpenAddReview} style={{ margin: '0 auto' }}>
                  <span>✍️</span> Write a Review
                </button>
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* TAB 2: INSTAGRAM REELS REVIEW SHOWCASE */}
        {(activeTab === 'all' || activeTab === 'reels') && reelsList.length > 0 && (
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
