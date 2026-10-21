'use client';

/**
 * motion/AnimatedImage.js — Animated food image wrapper
 * Sri Gokulam Veg Restaurant
 *
 * Features:
 *   - Image fades in and scales in when it loads (on-load, not just on-scroll)
 *   - Gentle hover zoom + lift shadow
 *   - Slow floating bob for featured dishes
 *   - Fallback: shows image immediately if JS doesn't hydrate
 *
 * Props:
 *   src       — image URL
 *   alt       — alt text (required for accessibility)
 *   className — extra class on container div
 *   imgClass  — extra class on <img>
 *   style     — container inline style
 *   imgStyle  — img inline style
 *   featured  — enables floating bob animation (default false)
 *   priority  — skips lazy loading (for hero images)
 *   onLoad    — img onLoad callback
 *
 * To REMOVE: replace with a plain <img> — all src/alt/loading attrs preserved.
 */

import { useRef, useState, useEffect } from 'react';
import styles from './AnimatedImage.module.css';

const FALLBACK_FOOD_IMG = 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80';

export default function AnimatedImage({
  src,
  alt,
  className = '',
  imgClass = '',
  style = {},
  imgStyle = {},
  featured = false,
  priority = false,
  onLoad,
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [loaded, setLoaded] = useState(true);
  const imgRef = useRef(null);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  useEffect(() => {
    if (imgRef.current && (imgRef.current.complete || imgRef.current.naturalWidth > 0)) {
      setLoaded(true);
    }
  }, [imgSrc]);

  const handleLoad = (e) => {
    setLoaded(true);
    onLoad && onLoad(e);
  };

  const handleError = () => {
    if (imgSrc !== FALLBACK_FOOD_IMG) {
      setImgSrc(FALLBACK_FOOD_IMG);
    }
    setLoaded(true);
  };

  return (
    <div
      className={[
        styles.imgContainer,
        featured ? styles.featured : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <img
        ref={imgRef}
        src={imgSrc || FALLBACK_FOOD_IMG}
        alt={alt}
        loading="eager"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={[
          styles.img,
          styles.imgLoaded,
          imgClass,
        ]
          .filter(Boolean)
          .join(' ')}
        style={imgStyle}
      />
    </div>
  );
}
