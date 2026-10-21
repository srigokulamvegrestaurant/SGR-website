/**
 * app/template.js — App Router page transition template
 * Sri Gokulam Veg Restaurant
 *
 * template.js re-mounts on EVERY navigation (unlike layout.js which persists).
 * Uses OPACITY ONLY — no transform, to avoid:
 *   - Creating a new stacking context that breaks position:sticky headers
 *   - Clipping full-height hero sections
 *   - Transform-induced overflow on the page root
 *
 * To DISABLE: delete this file.
 */

import styles from './components/motion/motion.module.css';

export default function Template({ children }) {
  return (
    <div className={styles.pageFadeIn}>
      {children}
    </div>
  );
}
