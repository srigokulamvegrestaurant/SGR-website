/* eslint-disable @next/next/no-img-element */
'use client';

// app/admin/components/WebsiteCmsDashboard.js
// Client Website Content Management Dashboard for Sri Gokulam Veg Restaurant
// Allows authorized administrators to update, modify, add, hide, show, and delete website content without editing code.

import { useState, useEffect, useCallback } from 'react';
import styles from './WebsiteCmsDashboard.module.css';

export default function WebsiteCmsDashboard({ currentUser = { name: 'Admin', role: 'SUPER_ADMIN' } }) {
  // Navigation Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState('homepage'); // 'homepage' | 'banners' | 'buttons' | 'menu' | 'pages' | 'media' | 'design' | 'content' | 'versions' | 'audit'

  // CMS State
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [published, setPublished] = useState(null);
  const [versions, setVersions] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);

  // Unsaved changes tracking
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('DESKTOP'); // 'DESKTOP' | 'MOBILE'
  const [previewSource, setPreviewSource] = useState('DRAFT'); // 'DRAFT' | 'PUBLISHED'

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishSummary, setPublishSummary] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null); // { type, id, title, action }
  const [rollbackModal, setRollbackModal] = useState(null); // version object

  // Form Editing Modals / States
  const [editingSlide, setEditingSlide] = useState(null);
  const [editingButton, setEditingButton] = useState(null);
  const [editingPage, setEditingPage] = useState(null);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [editingVideo, setEditingVideo] = useState(null);
  const [editingNavLink, setEditingNavLink] = useState(null);
  const [editingQuickLink, setEditingQuickLink] = useState(null);
  const [videoFilter, setVideoFilter] = useState('ALL'); // 'ALL' | 'REEL' | 'YOUTUBE'
  const [showMediaUploadModal, setShowMediaUploadModal] = useState(false);
  const [newMediaData, setNewMediaData] = useState({
    title: '',
    category: 'Dishes',
    desktopUrl: '',
    mobileUrl: '',
    aspectRatio: '16:9',
    tags: '',
  });

  // Show Toast
  const showNotice = useCallback((msg, type = 'success') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Fetch CMS Data
  const loadCmsData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cms');
      const data = await res.json();
      if (data.success) {
        setDraft(data.draft);
        setPublished(data.published);
        setVersions(data.versions || []);
        setAuditLog(data.auditLog || []);
        setMediaLibrary(data.mediaLibrary || []);
        setMenuItems(data.menu || []);
        setCategories(data.categories || []);
        setIsDirty(false);
      } else {
        showNotice(data.error || 'Failed to load CMS data', 'error');
      }
    } catch (err) {
      console.error('Error loading CMS data:', err);
      showNotice('Error connecting to CMS backend', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotice]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch('/api/admin/cms');
        const data = await res.json();
        if (!ignore && data.success) {
          setDraft(data.draft);
          setPublished(data.published);
          setVersions(data.versions || []);
          setAuditLog(data.auditLog || []);
          setMediaLibrary(data.mediaLibrary || []);
          setMenuItems(data.menu || []);
          setCategories(data.categories || []);
          setIsDirty(false);
        }
      } catch (err) {
        console.error('Error initializing CMS:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  // ─── 1. SAVE DRAFT ───
  const handleSaveDraft = async () => {
    if (!draft) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_DRAFT',
          payload: { draftData: draft },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft(data.draft);
        setIsDirty(false);
        showNotice('Draft changes saved successfully to database');
        loadCmsData();
      } else {
        showNotice(data.error || 'Failed to save draft', 'error');
      }
    } catch (err) {
      showNotice('Network error saving draft', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── 2. PUBLISH DRAFT TO LIVE SITE ───
  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PUBLISH',
          payload: { summary: publishSummary || 'Published website update' },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPublishModal(false);
        setPublishSummary('');
        showNotice(`🎉 Website Published! Live Version ${data.publishedVersion}`);
        loadCmsData();
      } else {
        showNotice(data.error || 'Failed to publish changes', 'error');
      }
    } catch (err) {
      showNotice('Network error during publishing', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  // ─── 3. ROLLBACK VERSION ───
  const handleRollback = async (versionId) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ROLLBACK',
          payload: { versionId },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRollbackModal(null);
        showNotice(`⏪ Restored live website to Version ${data.restoredVersion}`);
        loadCmsData();
      } else {
        showNotice(data.error || 'Failed to rollback version', 'error');
      }
    } catch (err) {
      showNotice('Network error during rollback', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── SECTION MANAGEMENT (REORDER & VISIBILITY) ───
  const handleMoveSection = (index, direction) => {
    if (!draft || !draft.sections) return;
    const newSections = [...draft.sections];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newSections.length) return;

    const temp = newSections[index];
    newSections[index] = newSections[targetIdx];
    newSections[targetIdx] = temp;

    // Re-index display order
    newSections.forEach((sec, idx) => {
      sec.order = idx + 1;
    });

    setDraft({ ...draft, sections: newSections });
    setIsDirty(true);
  };

  const handleToggleSectionVisibility = (sectionId) => {
    if (!draft || !draft.sections) return;
    const newSections = draft.sections.map((sec) =>
      sec.id === sectionId ? { ...sec, isVisible: !sec.isVisible } : sec
    );
    setDraft({ ...draft, sections: newSections });
    setIsDirty(true);
  };

  // ─── HERO SLIDES ACTIONS ───
  const handleSaveSlide = (slideData) => {
    if (!draft || !draft.heroSlides) return;
    let newSlides = [...draft.heroSlides];
    if (slideData.id) {
      newSlides = newSlides.map((s) => (s.id === slideData.id ? slideData : s));
    } else {
      const newId = Date.now();
      newSlides.push({ ...slideData, id: newId, displayOrder: newSlides.length + 1, isActive: true });
    }
    setDraft({ ...draft, heroSlides: newSlides });
    setIsDirty(true);
    setEditingSlide(null);
    showNotice(`Hero slide ${slideData.id ? 'updated' : 'added'} in draft`);
  };

  const handleDeleteSlide = (slideId) => {
    if (!draft || !draft.heroSlides) return;
    const newSlides = draft.heroSlides.filter((s) => s.id !== slideId);
    setDraft({ ...draft, heroSlides: newSlides });
    setIsDirty(true);
    setDeleteConfirmModal(null);
    showNotice('Hero banner deleted from draft');
  };

  // ─── 0. ATOMIC INSTANT LIVE PUBLISH ───
  const handleSaveAndPublishLive = async () => {
    if (!draft) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_AND_PUBLISH_LIVE',
          payload: { data: draft, summary: 'Updated website configuration via CMS' },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft(data.draft);
        setPublished(data.published);
        setVersions(data.versions || []);
        setIsDirty(false);
        showNotice(`🎉 Live Website Updated! Version ${data.publishedVersion}`);
      } else {
        showNotice(data.error || 'Failed to update live website', 'error');
      }
    } catch (err) {
      showNotice('Network error updating live website', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── BUTTON MANAGER ACTIONS (ADD / EDIT / DELETE) ───
  const handleSaveButton = async (btnData, publishLive = true) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BUTTON_SAVE',
          payload: { button: btnData, publishLive },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft((prev) => ({ ...prev, buttons: data.buttons }));
        setEditingButton(null);
        showNotice(`🎉 Button '${btnData.name}' saved and synced live!`);
        loadCmsData();
      } else {
        showNotice(data.error || 'Failed to save button', 'error');
      }
    } catch (err) {
      showNotice('Network error saving button', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteButton = async (buttonId) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BUTTON_DELETE',
          payload: { buttonId, publishLive: true },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft((prev) => ({ ...prev, buttons: data.buttons }));
        setDeleteConfirmModal(null);
        showNotice('🗑️ Button deleted and removed from live website');
        loadCmsData();
      } else {
        showNotice(data.error || 'Failed to delete button', 'error');
      }
    } catch (err) {
      showNotice('Network error deleting button', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── FEEDBACK / CUSTOMER REVIEW ACTIONS ───
  const handleSaveReview = async (reviewData, publishLive = true) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FEEDBACK_SAVE',
          payload: { review: reviewData, publishLive },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft((prev) => ({ ...prev, customerReviews: data.customerReviews }));
        setEditingReview(null);
        showNotice(`⭐ Review by '${reviewData.name}' saved and updated live!`);
        loadCmsData();
      } else {
        showNotice(data.error || 'Failed to save review', 'error');
      }
    } catch (err) {
      showNotice('Network error saving review', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FEEDBACK_DELETE',
          payload: { reviewId, publishLive: true },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft((prev) => ({ ...prev, customerReviews: data.customerReviews }));
        setDeleteConfirmModal(null);
        showNotice('🗑️ Customer review deleted from live website');
        loadCmsData();
      } else {
        showNotice(data.error || 'Failed to delete review', 'error');
      }
    } catch (err) {
      showNotice('Network error deleting review', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── VIDEO FEEDBACK / REELS ACTIONS ───
  const handleSaveVideo = async (videoData, publishLive = true) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VIDEO_FEEDBACK_SAVE',
          payload: { video: videoData, publishLive },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft((prev) => ({ ...prev, videoReviews: data.videoReviews }));
        setEditingVideo(null);
        showNotice('🎬 Video feedback saved and synced to live website!');
        loadCmsData();
      } else {
        showNotice(data.error || 'Failed to save video', 'error');
      }
    } catch (err) {
      showNotice('Network error saving video', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VIDEO_FEEDBACK_DELETE',
          payload: { videoId, publishLive: true },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft((prev) => ({ ...prev, videoReviews: data.videoReviews }));
        setDeleteConfirmModal(null);
        showNotice('🗑️ Video reel deleted from live website');
        loadCmsData();
      } else {
        showNotice(data.error || 'Failed to delete video', 'error');
      }
    } catch (err) {
      showNotice('Network error deleting video', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── HEADER CONFIG ACTIONS ───
  const handleSaveHeaderConfig = async (headerData, publishLive = true) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'HEADER_SAVE',
          payload: { header: headerData, publishLive },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft((prev) => ({ ...prev, header: data.header }));
        setIsDirty(false);
        showNotice('📌 Header configuration saved and updated on live website!');
        loadCmsData();
      } else {
        showNotice(data.error || 'Failed to save header', 'error');
      }
    } catch (err) {
      showNotice('Network error saving header', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── FOOTER CONFIG ACTIONS ───
  const handleSaveFooterConfig = async (footerData, publishLive = true) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FOOTER_SAVE',
          payload: { footer: footerData, publishLive },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft((prev) => ({ ...prev, footer: data.footer }));
        setIsDirty(false);
        showNotice('🏛️ Footer configuration saved and updated on live website!');
        loadCmsData();
      } else {
        showNotice(data.error || 'Failed to save footer', 'error');
      }
    } catch (err) {
      showNotice('Network error saving footer', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── NAV LINK ACTIONS (HEADER) ───
  const handleSaveNavLink = async (navLinkData) => {
    if (!draft?.header) return;
    let links = [...(draft.header.navLinks || [])];
    if (navLinkData.id) {
      links = links.map((l) => (l.id === navLinkData.id ? navLinkData : l));
    } else {
      const newId = `nav_${Date.now()}`;
      links.push({ ...navLinkData, id: newId });
    }
    const updatedHeader = { ...draft.header, navLinks: links };
    await handleSaveHeaderConfig(updatedHeader, true);
    setEditingNavLink(null);
  };

  const handleDeleteNavLink = async (linkId) => {
    if (!draft?.header) return;
    const links = (draft.header.navLinks || []).filter((l) => l.id !== linkId);
    const updatedHeader = { ...draft.header, navLinks: links };
    await handleSaveHeaderConfig(updatedHeader, true);
    setDeleteConfirmModal(null);
  };

  const handleMoveNavLink = async (idx, direction) => {
    if (!draft?.header?.navLinks) return;
    const links = [...draft.header.navLinks];
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= links.length) return;
    const temp = links[idx];
    links[idx] = links[targetIdx];
    links[targetIdx] = temp;
    const updatedHeader = { ...draft.header, navLinks: links };
    await handleSaveHeaderConfig(updatedHeader, true);
  };

  // ─── QUICK LINK ACTIONS (FOOTER) ───
  const handleSaveQuickLink = async (quickLinkData) => {
    if (!draft?.footer) return;
    let links = [...(draft.footer.quickLinks || [])];
    if (quickLinkData.id) {
      links = links.map((l) => (l.id === quickLinkData.id ? quickLinkData : l));
    } else {
      const newId = `ql_${Date.now()}`;
      links.push({ ...quickLinkData, id: newId });
    }
    const updatedFooter = { ...draft.footer, quickLinks: links };
    await handleSaveFooterConfig(updatedFooter, true);
    setEditingQuickLink(null);
  };

  const handleDeleteQuickLink = async (linkId) => {
    if (!draft?.footer) return;
    const links = (draft.footer.quickLinks || []).filter((l) => l.id !== linkId);
    const updatedFooter = { ...draft.footer, quickLinks: links };
    await handleSaveFooterConfig(updatedFooter, true);
    setDeleteConfirmModal(null);
  };

  // ─── PAGE MANAGER ACTIONS ───
  const handleSavePage = async (pageData) => {
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PAGE_SAVE',
          payload: { page: pageData },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft((prev) => ({ ...prev, pages: data.pages }));
        setEditingPage(null);
        showNotice(`Page '${pageData.title}' saved`);
        loadCmsData();
      } else {
        showNotice(data.error || 'Failed to save page', 'error');
      }
    } catch (err) {
      showNotice('Network error saving page', 'error');
    }
  };

  const handleDeletePage = async (pageId) => {
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PAGE_DELETE',
          payload: { pageId },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft((prev) => ({ ...prev, pages: data.pages }));
        setDeleteConfirmModal(null);
        showNotice('Page deleted successfully');
        loadCmsData();
      } else {
        showNotice(data.error || 'Failed to delete page', 'error');
      }
    } catch (err) {
      showNotice('Network error deleting page', 'error');
    }
  };

  // ─── MEDIA LIBRARY ACTIONS ───
  const handleUploadMedia = async () => {
    if (!newMediaData.desktopUrl) {
      showNotice('Please enter an image URL or choose a file', 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MEDIA_UPLOAD',
          payload: {
            mediaItem: {
              ...newMediaData,
              tags: newMediaData.tags ? newMediaData.tags.split(',').map((t) => t.trim()) : [],
            },
          },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMediaLibrary(data.mediaLibrary);
        setShowMediaUploadModal(false);
        setNewMediaData({ title: '', category: 'Dishes', desktopUrl: '', mobileUrl: '', aspectRatio: '16:9', tags: '' });
        showNotice('Image added to Media Library');
      } else {
        showNotice(data.error || 'Failed to upload media', 'error');
      }
    } catch (err) {
      showNotice('Network error uploading media', 'error');
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MEDIA_DELETE',
          payload: { mediaId },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMediaLibrary(data.mediaLibrary);
        setDeleteConfirmModal(null);
        showNotice('Image removed from library');
      } else {
        showNotice(data.error || 'Failed to delete media', 'error');
      }
    } catch (err) {
      showNotice('Network error deleting media', 'error');
    }
  };

  // ─── MENU ITEM ACTIONS (CRUD FROM CMS) ───
  const handleSaveMenuItem = async (dishData) => {
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MENU_ITEM_SAVE',
          payload: { dish: dishData },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMenuItems(data.menu);
        setEditingMenuItem(null);
        showNotice(`Dish '${dishData.title}' updated on menu`);
      } else {
        showNotice(data.error || 'Failed to save menu item', 'error');
      }
    } catch (err) {
      showNotice('Network error saving menu item', 'error');
    }
  };

  const handleDeleteMenuItem = async (dishId) => {
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MENU_ITEM_DELETE',
          payload: { dishId },
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMenuItems(data.menu);
        setDeleteConfirmModal(null);
        showNotice('Dish deleted from restaurant menu');
      } else {
        showNotice(data.error || 'Failed to delete menu item', 'error');
      }
    } catch (err) {
      showNotice('Network error deleting dish', 'error');
    }
  };

  // ─── RESET DRAFT TO FACTORY DEFAULTS ───
  const handleResetToDefaults = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_TO_DEFAULTS',
          payload: {},
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft(data.draft);
        setIsDirty(false);
        showNotice('Website draft reset to original Chettinad Sattvic defaults');
        loadCmsData();
      } else {
        showNotice(data.error || 'Failed to reset draft', 'error');
      }
    } catch (err) {
      showNotice('Network error resetting draft', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !draft) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
        <strong>Loading Sri Gokulam Website CMS...</strong>
      </div>
    );
  }

  const liveVersionNumber = versions?.[0]?.versionNumber || '1.0.0';

  return (
    <div className={styles.cmsContainer}>
      {/* ─── Top Command & Publish Bar ─── */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h2 className={styles.cmsTitle}>
            <span>🌐</span> Website Management Dashboard
          </h2>
          <span className={styles.versionBadge}>
            🟢 Live Version: v{liveVersionNumber}
          </span>
          {isDirty ? (
            <span className={styles.draftIndicator}>
              ⚠️ Unsaved Draft Changes
            </span>
          ) : (
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              ✓ Draft is in sync
            </span>
          )}
        </div>

        <div className={styles.topBarActions}>
          <button
            type="button"
            className={styles.btnLiveSync}
            onClick={handleSaveAndPublishLive}
            title="Instantly save all CMS changes and publish live to customer website"
          >
            <span className={styles.pulseDot}></span>
            <span>⚡ Save &amp; Publish Live</span>
          </button>

          <button
            type="button"
            className={`${styles.btnActionSec} ${styles.btnPreview}`}
            onClick={() => setShowPreviewModal(true)}
            title="Preview changes before publishing"
          >
            👁️ Live Preview
          </button>

          <button
            type="button"
            className={`${styles.btnActionSec} ${styles.btnSaveDraft}`}
            onClick={handleSaveDraft}
            disabled={!isDirty}
            style={{ opacity: isDirty ? 1 : 0.6 }}
          >
            💾 Save Draft
          </button>

          <button
            type="button"
            className={`${styles.btnActionSec} ${styles.btnPublish}`}
            onClick={() => setShowPublishModal(true)}
          >
            🚀 Publish Changelog
          </button>

          <button
            type="button"
            className={styles.btnActionSec}
            onClick={() => setActiveSubTab('versions')}
            title="View snapshots and restore previous version"
          >
            ⏪ Versions ({versions.length})
          </button>
        </div>
      </div>

      {/* ─── Sub-Tab Navigation Strip ─── */}
      <nav className={styles.subTabsNav}>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'homepage' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('homepage')}
        >
          🏠 Homepage &amp; Sections
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'banners' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('banners')}
        >
          🎠 Hero Banners ({draft?.heroSlides?.length || 0})
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'buttons' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('buttons')}
        >
          🔘 Button Manager ({draft?.buttons?.length || 0})
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'feedback' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('feedback')}
        >
          ⭐ Feedback &amp; Reviews ({draft?.customerReviews?.length || 0})
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'video_feedback' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('video_feedback')}
        >
          🎬 Video Feedback &amp; Reels ({draft?.videoReviews?.length || 0})
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'header_editor' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('header_editor')}
        >
          📌 Header Editor
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'footer_editor' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('footer_editor')}
        >
          🏛️ Footer Editor
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'menu' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('menu')}
        >
          🍛 Menu Delicacies ({menuItems.length})
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'pages' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('pages')}
        >
          📄 Pages Manager ({draft?.pages?.length || 0})
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'media' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('media')}
        >
          🖼️ Media Library ({mediaLibrary.length})
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'design' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('design')}
        >
          🎨 Design &amp; Styles
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'content' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('content')}
        >
          📝 Content &amp; Announcements
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'versions' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('versions')}
        >
          ⏪ Version Rollback
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'audit' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('audit')}
        >
          📜 Audit Log ({auditLog.length})
        </button>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 1: HOMEPAGE & SECTION MANAGEMENT
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'homepage' && (
        <div className={styles.tabContentCard}>
          <div className={styles.contentHeader}>
            <div>
              <h3 className={styles.contentTitle}>🏠 Homepage Section Layout &amp; Reordering</h3>
              <p className={styles.contentDesc}>
                Add, hide, show, or reorder sections on the customer homepage. Use the Move Up / Move Down buttons to change order.
              </p>
            </div>
            <button
              type="button"
              className={styles.btnActionSec}
              onClick={handleResetToDefaults}
              style={{ fontSize: '0.78rem' }}
            >
              🔄 Reset to Factory Defaults
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {draft?.sections?.map((section, idx) => (
              <div key={section.id} className={styles.sectionRow}>
                <div className={styles.sectionRowLeft}>
                  <div className={styles.orderControls}>
                    <button
                      type="button"
                      className={styles.btnOrder}
                      disabled={idx === 0}
                      onClick={() => handleMoveSection(idx, 'UP')}
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className={styles.btnOrder}
                      disabled={idx === draft.sections.length - 1}
                      onClick={() => handleMoveSection(idx, 'DOWN')}
                      title="Move Down"
                    >
                      ▼
                    </button>
                  </div>
                  <span style={{ fontSize: '1.25rem' }}>{section.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      #{idx + 1}. {section.name}
                    </div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      Anchor ID: #{section.id}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: section.isVisible ? '#10b981' : '#94a3b8',
                  }}>
                    {section.isVisible ? '● VISIBLE ON SITE' : '○ HIDDEN'}
                  </span>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={section.isVisible}
                      onChange={() => handleToggleSectionVisibility(section.id)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 2: HERO BANNERS & SLIDES (DESKTOP & MOBILE SEPARATELY)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'banners' && (
        <div className={styles.tabContentCard}>
          <div className={styles.contentHeader}>
            <div>
              <h3 className={styles.contentTitle}>🎠 Hero Carousel Banners &amp; Visual Slides</h3>
              <p className={styles.contentDesc}>
                Manage auto-playing banners. Desktop and mobile banners can use distinct optimized images for maximum clarity.
              </p>
            </div>
            <button
              type="button"
              className={styles.btnActionSec}
              style={{ background: '#0284c7', color: '#ffffff', border: 'none' }}
              onClick={() => setEditingSlide({
                id: null,
                tagIcon: '✨',
                tagText: 'Special Festival Showcase',
                titleLine1: 'Pure Ghee Delicacies',
                titleAccent: 'of Karaikudi Chettinad',
                description: 'Authentic pure vegetarian culinary treasures prepared fresh with generational mastery.',
                priceText: 'From ₹90',
                desktopImage: '',
                mobileImage: '',
                primaryBtn: { icon: '📅', text: 'Table Reservation →', action: 'reservation', bgColor: '#f59e0b', textColor: '#051B41', isVisible: true },
                secondaryBtn: { icon: '📲', text: 'QR Table Order', action: 'qr', bgColor: 'transparent', textColor: '#ffffff', isVisible: true },
                alt: 'Sri Gokulam Signature Feast',
                isActive: true,
              })}
            >
              + Add New Hero Banner
            </button>
          </div>

          <div className={styles.grid2}>
            {draft?.heroSlides?.map((slide, idx) => (
              <div key={slide.id || idx} className={styles.slideCard}>
                <img
                  src={slide.desktopImage}
                  alt={slide.alt || 'Banner'}
                  className={styles.slidePreviewImg}
                />
                <div className={styles.slideBody}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f59e0b' }}>
                      {slide.tagIcon} {slide.tagText}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Slide #{idx + 1}
                    </span>
                  </div>

                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                    {slide.titleLine1} <span style={{ color: '#0284c7' }}>{slide.titleAccent}</span>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    {slide.description}
                  </p>

                  <div style={{ background: 'var(--bg-card-subtle)', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                    🏷️ <strong>Price Badge:</strong> {slide.priceText}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    🖥️ Desktop: <code style={{ fontSize: '0.68rem' }}>{slide.desktopImage?.slice(0, 42)}...</code>
                    <br />
                    📱 Mobile: <code style={{ fontSize: '0.68rem' }}>{slide.mobileImage?.slice(0, 42)}...</code>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className={styles.btnActionSec}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                      onClick={() => setEditingSlide(slide)}
                    >
                      ✏️ Edit Slide
                    </button>
                    <button
                      type="button"
                      className={styles.btnActionSec}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem', color: '#ef4444' }}
                      onClick={() => setDeleteConfirmModal({
                        type: 'SLIDE',
                        id: slide.id,
                        title: `${slide.titleLine1} ${slide.titleAccent}`,
                        action: () => handleDeleteSlide(slide.id),
                      })}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 3: BUTTON MANAGER (TEXT, WEB URLS, REMOVE, ADD, STYLES, ACTIONS)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'buttons' && (
        <div className={styles.tabContentCard}>
          <div className={styles.contentHeader}>
            <div>
              <h3 className={styles.contentTitle}>🔘 Call-To-Action Button Manager</h3>
              <p className={styles.contentDesc}>
                Add custom buttons with any external Web URL, edit button text (English &amp; Tamil), styles, and remove unwanted buttons.
              </p>
            </div>
            <button
              type="button"
              className={styles.btnActionSec}
              style={{ background: '#0284c7', color: '#ffffff', border: 'none', fontWeight: 800 }}
              onClick={() => setEditingButton({
                id: null,
                name: 'Custom Web Action',
                text: 'Visit Website →',
                tamilText: 'வலைத்தளம் பார்க்க',
                icon: '🔗',
                action: 'url',
                link: 'https://',
                target: '_blank',
                position: 'HERO_PRIMARY',
                bgColor: '#0284c7',
                textColor: '#ffffff',
                shape: 'pill',
                isVisible: true,
              })}
            >
              + Add New Button (Web URL)
            </button>
          </div>

          <div className={styles.grid2}>
            {draft?.buttons?.map((btn) => (
              <div key={btn.id} className={styles.itemCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {btn.icon} {btn.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      background: btn.isVisible ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.2)',
                      color: btn.isVisible ? '#10b981' : '#64748b',
                    }}>
                      {btn.isVisible ? 'VISIBLE' : 'HIDDEN'}
                    </span>
                    <label className={styles.toggleSwitch} title="Toggle Visibility on Site">
                      <input
                        type="checkbox"
                        checked={btn.isVisible !== false}
                        onChange={() => handleSaveButton({ ...btn, isVisible: !btn.isVisible }, true)}
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.35rem' }}>
                  <div style={{
                    padding: '0.5rem 1rem',
                    borderRadius: btn.shape === 'pill' ? '9999px' : btn.shape === 'squared' ? '2px' : '8px',
                    background: btn.bgColor,
                    color: btn.textColor,
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    border: '1px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  }}>
                    {btn.icon} {btn.text}
                  </div>
                  {btn.tamilText && (
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      ({btn.tamilText})
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-card-subtle)', padding: '0.5rem', borderRadius: '6px' }}>
                  <div>
                    🎯 <strong>Action Type:</strong> <code>{btn.action}</code>
                    {btn.action === 'url' && ' (Opens External Web URL)'}
                  </div>
                  {btn.link && (
                    <div style={{ marginTop: '0.2rem', wordBreak: 'break-all' }}>
                      🔗 <strong>Target Link:</strong> <a href={btn.link} target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>{btn.link}</a>
                    </div>
                  )}
                  <div style={{ marginTop: '0.2rem' }}>
                    📍 <strong>Placement:</strong> {btn.position || 'DEFAULT'} • Shape: {btn.shape || 'pill'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className={styles.btnActionSec}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                    onClick={() => setEditingButton(btn)}
                  >
                    ✏️ Edit Button
                  </button>
                  <button
                    type="button"
                    className={styles.btnActionSec}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem', color: '#ef4444' }}
                    onClick={() => setDeleteConfirmModal({
                      type: 'BUTTON',
                      id: btn.id,
                      title: btn.name || btn.text,
                      action: () => handleDeleteButton(btn.id),
                    })}
                  >
                    🗑️ Remove Button
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB: FEEDBACK & CUSTOMER REVIEWS (ADD, EDIT, DELETE, STARS, TESTIMONIALS)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'feedback' && (
        <div className={styles.tabContentCard}>
          <div className={styles.contentHeader}>
            <div>
              <h3 className={styles.contentTitle}>⭐ Customer Feedback &amp; Testimonials</h3>
              <p className={styles.contentDesc}>
                Manage written diner reviews, star ratings, quotes, and favorite dishes displayed on the customer website.
              </p>
            </div>
            <button
              type="button"
              className={styles.btnActionSec}
              style={{ background: '#f59e0b', color: '#051b41', border: 'none', fontWeight: 800 }}
              onClick={() => setEditingReview({
                id: null,
                name: '',
                location: 'Food Enthusiast',
                rating: 5,
                date: 'Recent Visit',
                quote: '',
                dish: 'Pure Ghee Roast Dosa',
                avatar: '',
                isVisible: true,
                isVerified: true,
              })}
            >
              + Add Customer Review
            </button>
          </div>

          <div className={styles.grid3}>
            {draft?.customerReviews?.map((rev) => (
              <div key={rev.id} className={styles.feedbackCard}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <img
                        src={rev.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23374151'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='18'%3E👤%3C/text%3E%3C/svg%3E"}
                        alt={rev.name}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {rev.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {rev.location} {rev.isVerified && <span style={{ color: '#10b981', fontWeight: 700 }}>• ✓ Verified</span>}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      background: rev.isVisible !== false ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.2)',
                      color: rev.isVisible !== false ? '#10b981' : '#64748b',
                    }}>
                      {rev.isVisible !== false ? 'LIVE' : 'HIDDEN'}
                    </span>
                  </div>

                  <div style={{ color: '#f59e0b', fontSize: '1rem', marginTop: '0.5rem', letterSpacing: '1px' }}>
                    {'★'.repeat(rev.rating || 5)}{'☆'.repeat(Math.max(0, 5 - (rev.rating || 5)))}
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>({rev.rating}/5)</span>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontStyle: 'italic', margin: '0.5rem 0', lineHeight: 1.45 }}>
                    &ldquo;{rev.quote}&rdquo;
                  </p>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                    🍽️ <strong>Favorite:</strong> {rev.dish || 'Chettinad Special'} • 📅 {rev.date}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.6rem' }}>
                    <button
                      type="button"
                      className={styles.btnActionSec}
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem' }}
                      onClick={() => setEditingReview(rev)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      className={styles.btnActionSec}
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem', color: '#ef4444' }}
                      onClick={() => setDeleteConfirmModal({
                        type: 'REVIEW',
                        id: rev.id,
                        title: `Review by ${rev.name}`,
                        action: () => handleDeleteReview(rev.id),
                      })}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB: VIDEO FEEDBACK & REELS (INSTAGRAM & YOUTUBE VLOGS)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'video_feedback' && (
        <div className={styles.tabContentCard}>
          <div className={styles.contentHeader}>
            <div>
              <h3 className={styles.contentTitle}>🎬 Video Feedback &amp; Food Vlogs</h3>
              <p className={styles.contentDesc}>
                Manage Instagram Reels and YouTube food vlog video reviews. Add video URLs, thumbnails, creators, and play links.
              </p>
            </div>
            <button
              type="button"
              className={styles.btnActionSec}
              style={{ background: '#0284c7', color: '#ffffff', border: 'none', fontWeight: 800 }}
              onClick={() => setEditingVideo({
                id: null,
                type: 'REEL',
                creator: 'Food Blogger',
                handle: '@karaikudifoodie',
                title: 'Sri Gokulam Crispy Roast & Vadai Platter Review',
                videoUrl: 'https://www.instagram.com/reel/',
                embedUrl: '',
                thumbnailUrl: '',
                views: '15.4K views',
                likes: '1.2K likes',
                duration: '0:45',
                dish: 'Chettinad Ghee Roast Dosa',
                isVisible: true,
              })}
            >
              + Add Video Reel / Vlog
            </button>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              type="button"
              className={`${styles.deviceBtn} ${videoFilter === 'ALL' ? styles.deviceBtnActive : ''}`}
              onClick={() => setVideoFilter('ALL')}
            >
              All Videos ({draft?.videoReviews?.length || 0})
            </button>
            <button
              type="button"
              className={`${styles.deviceBtn} ${videoFilter === 'REEL' ? styles.deviceBtnActive : ''}`}
              onClick={() => setVideoFilter('REEL')}
            >
              📱 Instagram Reels ({(draft?.videoReviews || []).filter((v) => v.type === 'REEL').length})
            </button>
            <button
              type="button"
              className={`${styles.deviceBtn} ${videoFilter === 'YOUTUBE' ? styles.deviceBtnActive : ''}`}
              onClick={() => setVideoFilter('YOUTUBE')}
            >
              🔴 YouTube Food Vlogs ({(draft?.videoReviews || []).filter((v) => v.type === 'YOUTUBE').length})
            </button>
          </div>

          <div className={styles.grid3}>
            {(draft?.videoReviews || [])
              .filter((v) => videoFilter === 'ALL' || v.type === videoFilter)
              .map((vid) => (
                <div key={vid.id} className={styles.videoCard}>
                  <div className={styles.videoThumbWrap}>
                    <img
                      src={vid.thumbnailUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%231f2937'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='32'%3E🎬%3C/text%3E%3C/svg%3E"}
                      alt={vid.title}
                      className={styles.videoThumbImg}
                    />
                    <div className={styles.videoTypeBadge}>
                      {vid.type === 'REEL' ? '📱 Instagram Reel' : '🔴 YouTube Vlog'}
                    </div>
                    <div className={styles.videoViewsBadge}>
                      👁️ {vid.views || '10K'} {vid.duration && `• ⏱️ ${vid.duration}`}
                    </div>
                    <div className={styles.playPillOverlay}>▶</div>
                  </div>

                  <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f59e0b' }}>
                          {vid.creator}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {vid.handle}
                        </span>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)', marginTop: '0.2rem', lineHeight: 1.3 }}>
                        {vid.title}
                      </div>

                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                        🍛 <strong>Dish:</strong> {vid.dish}
                      </div>
                    </div>

                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.45rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        🔗 <a href={vid.videoUrl} target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>{vid.videoUrl}</a>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className={styles.btnActionSec}
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem' }}
                          onClick={() => setEditingVideo(vid)}
                        >
                          ✏️ Edit Video
                        </button>
                        <button
                          type="button"
                          className={styles.btnActionSec}
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem', color: '#ef4444' }}
                          onClick={() => setDeleteConfirmModal({
                            type: 'VIDEO',
                            id: vid.id,
                            title: vid.title,
                            action: () => handleDeleteVideo(vid.id),
                          })}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB: HEADER EDITOR (ANNOUNCEMENT BAR, BRAND TITLES, NAV LINKS, ACTIONS)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'header_editor' && (
        <div className={styles.tabContentCard}>
          <div className={styles.contentHeader}>
            <div>
              <h3 className={styles.contentTitle}>📌 Website Header &amp; Navigation Editor</h3>
              <p className={styles.contentDesc}>
                Customize the top announcement strip, brand logos, titles, and manage/reorder header navigation menu links.
              </p>
            </div>
            <button
              type="button"
              className={styles.btnLiveSync}
              onClick={() => handleSaveHeaderConfig(draft.header, true)}
            >
              <span className={styles.pulseDot}></span>
              ⚡ Save &amp; Publish Live Header
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* 1. Top Announcement Bar */}
            <div className={styles.editorSectionGroup}>
              <h4 className={styles.editorGroupTitle}>📢 Top Announcement Bar</h4>
              <div className={styles.grid2}>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.formLabel}>Announcement Notice Text</label>
                  <input
                    type="text"
                    value={draft?.header?.topAnnouncement?.text || ''}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        header: {
                          ...draft.header,
                          topAnnouncement: { ...draft.header?.topAnnouncement, text: e.target.value },
                        },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Quick Phone Display Text</label>
                  <input
                    type="text"
                    value={draft?.header?.topAnnouncement?.phone || ''}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        header: {
                          ...draft.header,
                          topAnnouncement: { ...draft.header?.topAnnouncement, phone: e.target.value },
                        },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Announcement Bar Status</label>
                  <div className={styles.switchRow} style={{ marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Show on Live Website
                    </span>
                    <label className={styles.toggleSwitch}>
                      <input
                        type="checkbox"
                        checked={draft?.header?.topAnnouncement?.isActive !== false}
                        onChange={(e) => {
                          setDraft({
                            ...draft,
                            header: {
                              ...draft.header,
                              topAnnouncement: { ...draft.header?.topAnnouncement, isActive: e.target.checked },
                            },
                          });
                          setIsDirty(true);
                        }}
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Brand Identity & Logos */}
            <div className={styles.editorSectionGroup}>
              <h4 className={styles.editorGroupTitle}>👑 Brand Logo &amp; Header Titles</h4>
              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Restaurant English Name</label>
                  <input
                    type="text"
                    value={draft?.header?.brandEn || 'SRI GOKULAM'}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        header: { ...draft.header, brandEn: e.target.value },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Restaurant Tamil Name</label>
                  <input
                    type="text"
                    value={draft?.header?.brandTa || 'ஸ்ரீ கோகுலம்'}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        header: { ...draft.header, brandTa: e.target.value },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Heritage Tagline</label>
                  <input
                    type="text"
                    value={draft?.header?.tagline || 'CHETTINAD HERITAGE PURE VEG'}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        header: { ...draft.header, tagline: e.target.value },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Header Logo URL</label>
                  <input
                    type="text"
                    value={draft?.header?.logoUrl || '/restaurant_logo.jpg'}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        header: { ...draft.header, logoUrl: e.target.value },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>
              </div>
            </div>

            {/* 3. Header Navigation Links Manager */}
            <div className={styles.editorSectionGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 className={styles.editorGroupTitle} style={{ border: 'none', padding: 0 }}>
                  🧭 Header Navigation Links ({draft?.header?.navLinks?.length || 0})
                </h4>
                <button
                  type="button"
                  className={styles.btnActionSec}
                  style={{ background: '#0284c7', color: '#ffffff', border: 'none', fontSize: '0.78rem' }}
                  onClick={() => setEditingNavLink({
                    id: null,
                    label: '',
                    labelTa: '',
                    href: '/',
                    showInHeader: true,
                    isSpecial: false,
                  })}
                >
                  + Add Navigation Link
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(draft?.header?.navLinks || []).map((link, idx) => (
                  <div key={link.id || idx} className={styles.navLinkRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div className={styles.orderControls}>
                        <button
                          type="button"
                          className={styles.btnOrder}
                          disabled={idx === 0}
                          onClick={() => handleMoveNavLink(idx, 'UP')}
                          title="Move Left/Up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className={styles.btnOrder}
                          disabled={idx === (draft?.header?.navLinks?.length || 1) - 1}
                          onClick={() => handleMoveNavLink(idx, 'DOWN')}
                          title="Move Right/Down"
                        >
                          ▼
                        </button>
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                          {link.label} {link.labelTa && <span style={{ color: '#0284c7', fontWeight: 600 }}>({link.labelTa})</span>}
                          {link.isSpecial && <span style={{ fontSize: '0.65rem', background: '#f59e0b', color: '#051b41', padding: '0.1rem 0.35rem', borderRadius: '4px', marginLeft: '0.4rem', fontWeight: 800 }}>★ SPECIAL</span>}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Target Web URL / Anchor: <code>{link.href}</code>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className={styles.btnActionSec}
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem' }}
                        onClick={() => setEditingNavLink(link)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className={styles.btnActionSec}
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem', color: '#ef4444' }}
                        onClick={() => setDeleteConfirmModal({
                          type: 'NAV_LINK',
                          id: link.id,
                          title: `Navigation Link '${link.label}'`,
                          action: () => handleDeleteNavLink(link.id),
                        })}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Header CTA Action Button */}
            <div className={styles.editorSectionGroup}>
              <h4 className={styles.editorGroupTitle}>🎯 Header Action Button</h4>
              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Button Text (English)</label>
                  <input
                    type="text"
                    value={draft?.header?.primaryButton?.text || 'Table Reservation'}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        header: {
                          ...draft.header,
                          primaryButton: { ...draft.header?.primaryButton, text: e.target.value },
                        },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Button Action / URL Target</label>
                  <input
                    type="text"
                    value={draft?.header?.primaryButton?.link || 'reservation'}
                    placeholder="drawer, qr, #menu, or https://..."
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        header: {
                          ...draft.header,
                          primaryButton: { ...draft.header?.primaryButton, link: e.target.value },
                        },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB: FOOTER EDITOR (HERITAGE STORY, HOURS, CONTACT, SOCIAL, QUICK LINKS)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'footer_editor' && (
        <div className={styles.tabContentCard}>
          <div className={styles.contentHeader}>
            <div>
              <h3 className={styles.contentTitle}>🏛️ Website Footer &amp; Heritage Story Editor</h3>
              <p className={styles.contentDesc}>
                Edit the heritage story, operating hours, contact phone/WhatsApp, social media URLs, and footer quick links.
              </p>
            </div>
            <button
              type="button"
              className={styles.btnLiveSync}
              onClick={() => handleSaveFooterConfig(draft.footer, true)}
            >
              <span className={styles.pulseDot}></span>
              ⚡ Save &amp; Publish Live Footer
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* 1. Heritage Story */}
            <div className={styles.editorSectionGroup}>
              <h4 className={styles.editorGroupTitle}>📖 Heritage Story &amp; Brand Philosophy</h4>
              <div className={styles.grid2}>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.formLabel}>English Brand Description</label>
                  <textarea
                    rows="3"
                    value={draft?.footer?.storyEn || ''}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: { ...draft.footer, storyEn: e.target.value },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formTextarea}
                  />
                </div>

                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.formLabel}>Tamil Brand Description</label>
                  <textarea
                    rows="3"
                    value={draft?.footer?.storyTa || ''}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: { ...draft.footer, storyTa: e.target.value },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formTextarea}
                  />
                </div>
              </div>
            </div>

            {/* 2. Operating Hours */}
            <div className={styles.editorSectionGroup}>
              <h4 className={styles.editorGroupTitle}>⏰ Operating Hours &amp; Meal Services</h4>
              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Breakfast Tiffin Hours</label>
                  <input
                    type="text"
                    value={draft?.footer?.hours?.breakfast || '06:30 AM – 11:30 AM'}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: {
                          ...draft.footer,
                          hours: { ...draft.footer?.hours, breakfast: e.target.value },
                        },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Traditional Raja Lunch Meals</label>
                  <input
                    type="text"
                    value={draft?.footer?.hours?.lunch || '11:45 AM – 03:45 PM'}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: {
                          ...draft.footer,
                          hours: { ...draft.footer?.hours, lunch: e.target.value },
                        },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Evening Delicacies &amp; Dinner</label>
                  <input
                    type="text"
                    value={draft?.footer?.hours?.dinner || '06:00 PM – 11:00 PM'}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: {
                          ...draft.footer,
                          hours: { ...draft.footer?.hours, dinner: e.target.value },
                        },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Sunday All-Day Feast</label>
                  <input
                    type="text"
                    value={draft?.footer?.hours?.sunday || '06:30 AM – 11:00 PM Non-stop'}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: {
                          ...draft.footer,
                          hours: { ...draft.footer?.hours, sunday: e.target.value },
                        },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>
              </div>
            </div>

            {/* 3. Contact & Location */}
            <div className={styles.editorSectionGroup}>
              <h4 className={styles.editorGroupTitle}>📍 Contact &amp; Physical Location</h4>
              <div className={styles.grid2}>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.formLabel}>Address Line</label>
                  <input
                    type="text"
                    value={draft?.footer?.address || ''}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: { ...draft.footer, address: e.target.value },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Primary Phone</label>
                  <input
                    type="text"
                    value={draft?.footer?.phone || ''}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: { ...draft.footer, phone: e.target.value },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>WhatsApp Order Number</label>
                  <input
                    type="text"
                    value={draft?.footer?.whatsapp || ''}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: { ...draft.footer, whatsapp: e.target.value },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Contact Email</label>
                  <input
                    type="text"
                    value={draft?.footer?.email || ''}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: { ...draft.footer, email: e.target.value },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Google Maps Directions URL</label>
                  <input
                    type="text"
                    value={draft?.footer?.googleMapsUrl || ''}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: { ...draft.footer, googleMapsUrl: e.target.value },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>
              </div>
            </div>

            {/* 4. Social Media Links */}
            <div className={styles.editorSectionGroup}>
              <h4 className={styles.editorGroupTitle}>🌐 Social Media URLs</h4>
              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Instagram URL</label>
                  <input
                    type="text"
                    value={draft?.footer?.socialLinks?.instagram || ''}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: {
                          ...draft.footer,
                          socialLinks: { ...draft.footer?.socialLinks, instagram: e.target.value },
                        },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Facebook URL</label>
                  <input
                    type="text"
                    value={draft?.footer?.socialLinks?.facebook || ''}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: {
                          ...draft.footer,
                          socialLinks: { ...draft.footer?.socialLinks, facebook: e.target.value },
                        },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>YouTube Channel URL</label>
                  <input
                    type="text"
                    value={draft?.footer?.socialLinks?.youtube || ''}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: {
                          ...draft.footer,
                          socialLinks: { ...draft.footer?.socialLinks, youtube: e.target.value },
                        },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>WhatsApp Direct Link</label>
                  <input
                    type="text"
                    value={draft?.footer?.socialLinks?.whatsapp || ''}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: {
                          ...draft.footer,
                          socialLinks: { ...draft.footer?.socialLinks, whatsapp: e.target.value },
                        },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>
              </div>
            </div>

            {/* 5. Footer Quick Links */}
            <div className={styles.editorSectionGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 className={styles.editorGroupTitle} style={{ border: 'none', padding: 0 }}>
                  🔗 Footer Quick Links ({draft?.footer?.quickLinks?.length || 0})
                </h4>
                <button
                  type="button"
                  className={styles.btnActionSec}
                  style={{ background: '#0284c7', color: '#ffffff', border: 'none', fontSize: '0.78rem' }}
                  onClick={() => setEditingQuickLink({
                    id: null,
                    label: '',
                    labelTa: '',
                    href: '/',
                    openInNewTab: false,
                  })}
                >
                  + Add Quick Link
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(draft?.footer?.quickLinks || []).map((link, idx) => (
                  <div key={link.id || idx} className={styles.navLinkRow}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                        {link.label} {link.labelTa && <span style={{ color: '#0284c7', fontWeight: 600 }}>({link.labelTa})</span>}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        URL Target: <code>{link.href}</code> {link.openInNewTab && '• ↗ Opens in New Tab'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className={styles.btnActionSec}
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem' }}
                        onClick={() => setEditingQuickLink(link)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className={styles.btnActionSec}
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem', color: '#ef4444' }}
                        onClick={() => setDeleteConfirmModal({
                          type: 'QUICK_LINK',
                          id: link.id,
                          title: `Quick Link '${link.label}'`,
                          action: () => handleDeleteQuickLink(link.id),
                        })}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Legal & Compliance */}
            <div className={styles.editorSectionGroup}>
              <h4 className={styles.editorGroupTitle}>⚖️ Compliance &amp; Legal Notices</h4>
              <div className={styles.formRow3}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Copyright Line</label>
                  <input
                    type="text"
                    value={draft?.footer?.compliance?.copyright || '© 2026 Sri Gokulam Veg Restaurant.'}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: {
                          ...draft.footer,
                          compliance: { ...draft.footer?.compliance, copyright: e.target.value },
                        },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>FSSAI License Number</label>
                  <input
                    type="text"
                    value={draft?.footer?.compliance?.fssaiNumber || '12423018000452'}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: {
                          ...draft.footer,
                          compliance: { ...draft.footer?.compliance, fssaiNumber: e.target.value },
                        },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>GSTIN Tax Number</label>
                  <input
                    type="text"
                    value={draft?.footer?.compliance?.gstin || '33AAAAA0000A1Z5'}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        footer: {
                          ...draft.footer,
                          compliance: { ...draft.footer?.compliance, gstin: e.target.value },
                        },
                      });
                      setIsDirty(true);
                    }}
                    className={styles.formInput}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 4: MENU MANAGEMENT (DISHES, AVAILABILITY, PRICES, OFFERS)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'menu' && (
        <div className={styles.tabContentCard}>
          <div className={styles.contentHeader}>
            <div>
              <h3 className={styles.contentTitle}>🍛 Menu Delicacies &amp; Live Availability</h3>
              <p className={styles.contentDesc}>
                Add, edit, delete, or hide food items. Updates reflect in real time on both the customer website and TVSE POS.
              </p>
            </div>
            <button
              type="button"
              className={styles.btnActionSec}
              style={{ background: '#0284c7', color: '#ffffff', border: 'none' }}
              onClick={() => setEditingMenuItem({
                id: null,
                title: '',
                tamilTitle: '',
                category: 'Tiffin',
                price: 100,
                image: '',
                description: '',
                available: true,
                station: 'TIFFIN',
              })}
            >
              + Add Menu Dish
            </button>
          </div>

          <div className={styles.grid3}>
            {menuItems.map((dish) => (
              <div key={dish.id} className={styles.itemCard}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <img
                    src={dish.image || '/restaurant_logo.jpg'}
                    alt={dish.title}
                    style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                      {dish.title}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#0284c7' }}>
                      {dish.tamilTitle}
                    </div>
                    <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                      ₹{dish.price}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
                  {dish.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    background: dish.available !== false ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: dish.available !== false ? '#10b981' : '#ef4444',
                  }}>
                    {dish.available !== false ? 'AVAILABLE' : 'SOLD OUT (86)'}
                  </span>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className={styles.btnActionSec}
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                      onClick={() => setEditingMenuItem(dish)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      className={styles.btnActionSec}
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', color: '#ef4444' }}
                      onClick={() => setDeleteConfirmModal({
                        type: 'DISH',
                        id: dish.id,
                        title: dish.title,
                        action: () => handleDeleteMenuItem(dish.id),
                      })}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 5: PAGES MANAGER (CREATE, EDIT, PUBLISH/UNPUBLISH, DELETE)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'pages' && (
        <div className={styles.tabContentCard}>
          <div className={styles.contentHeader}>
            <div>
              <h3 className={styles.contentTitle}>📄 Website Pages Manager</h3>
              <p className={styles.contentDesc}>
                Create, edit, publish, or delete customer website pages (Home, Menu, About Us, Gallery, Contact, Catering).
              </p>
            </div>
            <button
              type="button"
              className={styles.btnActionSec}
              style={{ background: '#0284c7', color: '#ffffff', border: 'none' }}
              onClick={() => setEditingPage({
                id: null,
                title: '',
                slug: '/new-page',
                status: 'PUBLISHED',
                isSystem: false,
                inNav: true,
                inFooter: true,
                seoTitle: '',
                metaDesc: '',
                content: '',
              })}
            >
              + Create New Page
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {draft?.pages?.map((page) => (
              <div key={page.id} className={styles.sectionRow}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {page.title} {page.isSystem && <span style={{ fontSize: '0.68rem', color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>CORE SYSTEM</span>}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    Slug: <code>{page.slug}</code> • SEO: {page.seoTitle || 'Default Title'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: page.status === 'PUBLISHED' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                    color: page.status === 'PUBLISHED' ? '#10b981' : '#d97706',
                  }}>
                    {page.status}
                  </span>

                  <button
                    type="button"
                    className={styles.btnActionSec}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                    onClick={() => setEditingPage(page)}
                  >
                    ✏️ Edit Page
                  </button>

                  {!page.isSystem && (
                    <button
                      type="button"
                      className={styles.btnActionSec}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem', color: '#ef4444' }}
                      onClick={() => setDeleteConfirmModal({
                        type: 'PAGE',
                        id: page.id,
                        title: page.title,
                        action: () => handleDeletePage(page.id),
                      })}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 6: MEDIA LIBRARY (UPLOAD, REPLACE, CROP/ASPECT RATIO, TAGS)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'media' && (
        <div className={styles.tabContentCard}>
          <div className={styles.contentHeader}>
            <div>
              <h3 className={styles.contentTitle}>🖼️ Image &amp; Banner Media Library</h3>
              <p className={styles.contentDesc}>
                Upload, organize, and replace images. Supports desktop 16:9, mobile portrait 9:16, and square dish photos.
              </p>
            </div>
            <button
              type="button"
              className={styles.btnActionSec}
              style={{ background: '#0284c7', color: '#ffffff', border: 'none' }}
              onClick={() => setShowMediaUploadModal(true)}
            >
              + Upload Image
            </button>
          </div>

          <div className={styles.mediaGrid}>
            {mediaLibrary.map((item) => (
              <div key={item.id} className={styles.mediaCard}>
                <img src={item.desktopUrl} alt={item.title} className={styles.mediaThumb} />
                <div className={styles.mediaMeta}>
                  <strong style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                  </strong>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.category} • {item.aspectRatio}</span>
                  <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.35rem' }}>
                    <button
                      type="button"
                      className={styles.btnActionSec}
                      style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', flex: 1 }}
                      onClick={() => {
                        navigator.clipboard?.writeText(item.desktopUrl);
                        showNotice('Desktop Image URL copied to clipboard');
                      }}
                    >
                      📋 Copy URL
                    </button>
                    <button
                      type="button"
                      className={styles.btnActionSec}
                      style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', color: '#ef4444' }}
                      onClick={() => setDeleteConfirmModal({
                        type: 'MEDIA',
                        id: item.id,
                        title: item.title,
                        action: () => handleDeleteMedia(item.id),
                      })}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 7: WEBSITE DESIGN SETTINGS (COLORS, FONTS, LOGOS, SPACING)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'design' && (
        <div className={styles.tabContentCard}>
          <div className={styles.contentHeader}>
            <div>
              <h3 className={styles.contentTitle}>🎨 Website Design Settings &amp; Visual Styles</h3>
              <p className={styles.contentDesc}>
                Customize brand color tokens, typography fonts, logos, and border styling while preserving Chettinad heritage identity.
              </p>
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Primary Brand Navy Color</label>
              <div className={styles.colorPickerRow}>
                <input
                  type="color"
                  value={draft?.design?.primaryColor || '#051B41'}
                  onChange={(e) => {
                    setDraft({ ...draft, design: { ...draft.design, primaryColor: e.target.value } });
                    setIsDirty(true);
                  }}
                  className={styles.colorThumb}
                />
                <input
                  type="text"
                  value={draft?.design?.primaryColor || '#051B41'}
                  onChange={(e) => {
                    setDraft({ ...draft, design: { ...draft.design, primaryColor: e.target.value } });
                    setIsDirty(true);
                  }}
                  className={styles.formInput}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Accent Gold Color</label>
              <div className={styles.colorPickerRow}>
                <input
                  type="color"
                  value={draft?.design?.accentGold || '#D4AF37'}
                  onChange={(e) => {
                    setDraft({ ...draft, design: { ...draft.design, accentGold: e.target.value } });
                    setIsDirty(true);
                  }}
                  className={styles.colorThumb}
                />
                <input
                  type="text"
                  value={draft?.design?.accentGold || '#D4AF37'}
                  onChange={(e) => {
                    setDraft({ ...draft, design: { ...draft.design, accentGold: e.target.value } });
                    setIsDirty(true);
                  }}
                  className={styles.formInput}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Vibrant CTA Amber Color</label>
              <div className={styles.colorPickerRow}>
                <input
                  type="color"
                  value={draft?.design?.ctaColor || '#f59e0b'}
                  onChange={(e) => {
                    setDraft({ ...draft, design: { ...draft.design, ctaColor: e.target.value } });
                    setIsDirty(true);
                  }}
                  className={styles.colorThumb}
                />
                <input
                  type="text"
                  value={draft?.design?.ctaColor || '#f59e0b'}
                  onChange={(e) => {
                    setDraft({ ...draft, design: { ...draft.design, ctaColor: e.target.value } });
                    setIsDirty(true);
                  }}
                  className={styles.formInput}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Typography Font Family</label>
              <select
                value={draft?.design?.fontFamily || 'Inter, system-ui, sans-serif'}
                onChange={(e) => {
                  setDraft({ ...draft, design: { ...draft.design, fontFamily: e.target.value } });
                  setIsDirty(true);
                }}
                className={styles.formSelect}
              >
                <option value="Inter, system-ui, sans-serif">Modern Sans (Inter)</option>
                <option value="'Playfair Display', Georgia, serif">Heritage Serif (Playfair Display)</option>
                <option value="'Outfit', sans-serif">Geometric Sans (Outfit)</option>
                <option value="'Cinzel', serif">Royal Classical (Cinzel)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Brand Logo URL</label>
              <input
                type="text"
                value={draft?.design?.logoUrl || '/restaurant_logo.jpg'}
                onChange={(e) => {
                  setDraft({ ...draft, design: { ...draft.design, logoUrl: e.target.value } });
                  setIsDirty(true);
                }}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Card Border Radius</label>
              <select
                value={draft?.design?.borderRadius || '12px'}
                onChange={(e) => {
                  setDraft({ ...draft, design: { ...draft.design, borderRadius: e.target.value } });
                  setIsDirty(true);
                }}
                className={styles.formSelect}
              >
                <option value="4px">Sharp (4px)</option>
                <option value="8px">Gentle (8px)</option>
                <option value="12px">Standard Modern (12px)</option>
                <option value="20px">Rounded (20px)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 8: CONTENT & ANNOUNCEMENTS (TEXTS, CONTACT, HOURS, MARQUEE)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'content' && (
        <div className={styles.tabContentCard}>
          <div className={styles.contentHeader}>
            <div>
              <h3 className={styles.contentTitle}>📝 Content, Contact Details &amp; Announcements</h3>
              <p className={styles.contentDesc}>
                Edit restaurant contact numbers, operating hours, postal address, social links, and top announcement banner.
              </p>
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Restaurant Tamil Name</label>
              <input
                type="text"
                value={draft?.content?.brandTa || ''}
                onChange={(e) => {
                  setDraft({ ...draft, content: { ...draft.content, brandTa: e.target.value } });
                  setIsDirty(true);
                }}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Restaurant English Name</label>
              <input
                type="text"
                value={draft?.content?.brandEn || ''}
                onChange={(e) => {
                  setDraft({ ...draft, content: { ...draft.content, brandEn: e.target.value } });
                  setIsDirty(true);
                }}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Top Bar Announcement Text</label>
              <input
                type="text"
                value={draft?.content?.announcementText || ''}
                onChange={(e) => {
                  setDraft({ ...draft, content: { ...draft.content, announcementText: e.target.value } });
                  setIsDirty(true);
                }}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Primary Contact Phone</label>
              <input
                type="text"
                value={draft?.content?.primaryPhone || ''}
                onChange={(e) => {
                  setDraft({ ...draft, content: { ...draft.content, primaryPhone: e.target.value } });
                  setIsDirty(true);
                }}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>WhatsApp Order Phone</label>
              <input
                type="text"
                value={draft?.content?.whatsappPhone || ''}
                onChange={(e) => {
                  setDraft({ ...draft, content: { ...draft.content, whatsappPhone: e.target.value } });
                  setIsDirty(true);
                }}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Restaurant Address</label>
              <input
                type="text"
                value={draft?.content?.addressLine1 || ''}
                onChange={(e) => {
                  setDraft({ ...draft, content: { ...draft.content, addressLine1: e.target.value } });
                  setIsDirty(true);
                }}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.formLabel}>Heritage Story / Tagline Description</label>
              <textarea
                rows="3"
                value={draft?.content?.storyDescription || ''}
                onChange={(e) => {
                  setDraft({ ...draft, content: { ...draft.content, storyDescription: e.target.value } });
                  setIsDirty(true);
                }}
                className={styles.formTextarea}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 9: VERSION HISTORY & 1-CLICK ROLLBACK
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'versions' && (
        <div className={styles.tabContentCard}>
          <div className={styles.contentHeader}>
            <div>
              <h3 className={styles.contentTitle}>⏪ Version History &amp; Instant Rollback</h3>
              <p className={styles.contentDesc}>
                Every published update creates an immutable snapshot. Select any prior version to preview and restore it.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {versions.map((ver, idx) => (
              <div key={ver.id} className={styles.sectionRow}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                      Version {ver.versionNumber}
                    </span>
                    {idx === 0 && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                        ACTIVE LIVE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    &ldquo;{ver.summary}&rdquo;
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Published by {ver.publishedBy} ({ver.role}) • {new Date(ver.timestamp).toLocaleString()}
                  </div>
                </div>

                <div>
                  {idx !== 0 && (
                    <button
                      type="button"
                      className={styles.btnActionSec}
                      style={{ background: '#f59e0b', color: '#051B41', border: 'none', fontWeight: 800 }}
                      onClick={() => setRollbackModal(ver)}
                    >
                      ⏪ Restore This Version
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 10: AUDIT LOG (WHO CHANGED WHAT AND WHEN)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'audit' && (
        <div className={styles.tabContentCard}>
          <div className={styles.contentHeader}>
            <div>
              <h3 className={styles.contentTitle}>📜 Website CMS Audit History</h3>
              <p className={styles.contentDesc}>
                Immutable record tracking all administrative modifications, draft updates, and live publishing events.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {auditLog.map((log) => (
              <div key={log.id} style={{
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem',
              }}>
                <div>
                  <strong style={{ color: 'var(--accent-blue)', marginRight: '0.5rem' }}>
                    [{log.action}]
                  </strong>
                  <span style={{ color: 'var(--text-primary)' }}>{log.details}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {log.user} ({log.role}) • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1: LIVE PREVIEW (DESKTOP & MOBILE TOGGLE)
         ══════════════════════════════════════════════════════════════════════ */}
      {showPreviewModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowPreviewModal(false)}>
          <div className={`${styles.modalBox} ${styles.previewModalBox}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.previewToolbar}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <strong>👁️ Live Customer Website Preview</strong>
                <select
                  value={previewSource}
                  onChange={(e) => setPreviewSource(e.target.value)}
                  style={{ background: '#334155', color: '#ffffff', border: '1px solid #475569', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                >
                  <option value="DRAFT">Previewing Draft Changes</option>
                  <option value="PUBLISHED">Previewing Live Published</option>
                </select>
              </div>

              <div className={styles.deviceSelector}>
                <button
                  type="button"
                  className={`${styles.deviceBtn} ${previewDevice === 'DESKTOP' ? styles.deviceBtnActive : ''}`}
                  onClick={() => setPreviewDevice('DESKTOP')}
                >
                  🖥️ Desktop (1536px)
                </button>
                <button
                  type="button"
                  className={`${styles.deviceBtn} ${previewDevice === 'MOBILE' ? styles.deviceBtnActive : ''}`}
                  onClick={() => setPreviewDevice('MOBILE')}
                >
                  📱 Mobile (375px)
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', marginLeft: '0.5rem' }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className={styles.previewFrameContainer}>
              <iframe
                title="Customer Website Preview"
                src="/"
                className={previewDevice === 'DESKTOP' ? styles.frameDesktop : styles.frameMobile}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: PUBLISH CONFIRMATION & CHANGELOG SUMMARY
         ══════════════════════════════════════════════════════════════════════ */}
      {showPublishModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowPublishModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>🚀 Publish Changes to Live Customer Website</h3>
              <button type="button" className={styles.modalClose} onClick={() => setShowPublishModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.82rem' }}>
                <strong>Publishing will immediately update the live customer website without requiring any code deployment.</strong>
                <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)' }}>
                  A full version snapshot will be saved so you can rollback at any time.
                </p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Change Summary / Note for Version History *</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Updated breakfast special prices, replaced Chettinad feast hero banner, reordered homepage sections."
                  value={publishSummary}
                  onChange={(e) => setPublishSummary(e.target.value)}
                  className={styles.formTextarea}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnActionSec} onClick={() => setShowPublishModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btnActionSec} ${styles.btnPublish}`}
                onClick={handlePublish}
                disabled={isPublishing}
              >
                {isPublishing ? 'Publishing...' : '✓ Confirm & Publish Live'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 3: DELETE CONFIRMATION SAFEGUARD
         ══════════════════════════════════════════════════════════════════════ */}
      {deleteConfirmModal && (
        <div className={styles.modalBackdrop} onClick={() => setDeleteConfirmModal(null)}>
          <div className={styles.modalBox} style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>⚠️ Confirm Deletion</h3>
              <button type="button" className={styles.modalClose} onClick={() => setDeleteConfirmModal(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                Are you sure you want to delete <strong>{deleteConfirmModal.title}</strong>?
              </p>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.78rem', color: '#ef4444' }}>
                This action cannot be undone once published.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnActionSec} onClick={() => setDeleteConfirmModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnActionSec}
                style={{ background: '#ef4444', color: '#ffffff', border: 'none' }}
                onClick={() => deleteConfirmModal.action()}
              >
                🗑️ Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 4: VERSION ROLLBACK CONFIRMATION
         ══════════════════════════════════════════════════════════════════════ */}
      {rollbackModal && (
        <div className={styles.modalBackdrop} onClick={() => setRollbackModal(null)}>
          <div className={styles.modalBox} style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>⏪ Restore Previous Version</h3>
              <button type="button" className={styles.modalClose} onClick={() => setRollbackModal(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.82rem' }}>
                <strong>Restoring Version {rollbackModal.versionNumber}</strong>
                <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)' }}>
                  Published on: {new Date(rollbackModal.timestamp).toLocaleString()} by {rollbackModal.publishedBy}
                  <br />
                  Note: &ldquo;{rollbackModal.summary}&rdquo;
                </p>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                This will overwrite the current live website and draft with this snapshot.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnActionSec} onClick={() => setRollbackModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnActionSec}
                style={{ background: '#f59e0b', color: '#051B41', border: 'none', fontWeight: 800 }}
                onClick={() => handleRollback(rollbackModal.id)}
              >
                ⏪ Confirm &amp; Restore Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 5: EDIT HERO SLIDE
         ══════════════════════════════════════════════════════════════════════ */}
      {editingSlide && (
        <div className={styles.modalBackdrop} onClick={() => setEditingSlide(null)}>
          <div className={styles.modalBox} style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingSlide.id ? 'Edit Hero Banner Slide' : 'Add New Hero Banner Slide'}</h3>
              <button type="button" className={styles.modalClose} onClick={() => setEditingSlide(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tag Icon &amp; Text</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={editingSlide.tagIcon || '🦚'}
                    onChange={(e) => setEditingSlide({ ...editingSlide, tagIcon: e.target.value })}
                    style={{ width: '60px' }}
                    className={styles.formInput}
                  />
                  <input
                    type="text"
                    value={editingSlide.tagText || ''}
                    onChange={(e) => setEditingSlide({ ...editingSlide, tagText: e.target.value })}
                    placeholder="e.g. Lord Krishna Pure Ghee Special"
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Title Line 1</label>
                <input
                  type="text"
                  value={editingSlide.titleLine1 || ''}
                  onChange={(e) => setEditingSlide({ ...editingSlide, titleLine1: e.target.value })}
                  placeholder="e.g. The Food Tradition"
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Title Accent (Colored Highlight)</label>
                <input
                  type="text"
                  value={editingSlide.titleAccent || ''}
                  onChange={(e) => setEditingSlide({ ...editingSlide, titleAccent: e.target.value })}
                  placeholder="e.g. of Chettinad & Tamil Nadu"
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <textarea
                  rows="2"
                  value={editingSlide.description || ''}
                  onChange={(e) => setEditingSlide({ ...editingSlide, description: e.target.value })}
                  className={styles.formTextarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Price Badge Text</label>
                <input
                  type="text"
                  value={editingSlide.priceText || ''}
                  onChange={(e) => setEditingSlide({ ...editingSlide, priceText: e.target.value })}
                  placeholder="e.g. Special: ₹120 • Pure Cow Ghee"
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Desktop Image URL (16:9)</label>
                <input
                  type="text"
                  value={editingSlide.desktopImage || ''}
                  onChange={(e) => setEditingSlide({ ...editingSlide, desktopImage: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mobile Image URL (Optimized for Mobile)</label>
                <input
                  type="text"
                  value={editingSlide.mobileImage || ''}
                  onChange={(e) => setEditingSlide({ ...editingSlide, mobileImage: e.target.value })}
                  className={styles.formInput}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnActionSec} onClick={() => setEditingSlide(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btnActionSec} ${styles.btnSaveDraft}`}
                onClick={() => handleSaveSlide(editingSlide)}
              >
                Save Slide to Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 6: EDIT / ADD BUTTON (WEB URLS, ACTIONS, SHAPES, COLORS, PLACEMENTS)
         ══════════════════════════════════════════════════════════════════════ */}
      {editingButton && (
        <div className={styles.modalBackdrop} onClick={() => setEditingButton(null)}>
          <div className={styles.modalBox} style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingButton.id ? `Edit Button: ${editingButton.name || editingButton.text}` : 'Add New Call-To-Action Button'}
              </h3>
              <button type="button" className={styles.modalClose} onClick={() => setEditingButton(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Button Identifier / Internal Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Hero Swiggy Order / Instagram Follow"
                  value={editingButton.name || ''}
                  onChange={(e) => setEditingButton({ ...editingButton, name: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Button Text (English) *</label>
                  <input
                    type="text"
                    placeholder="e.g. Order on Swiggy →"
                    value={editingButton.text || ''}
                    onChange={(e) => setEditingButton({ ...editingButton, text: e.target.value })}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Button Text (Tamil)</label>
                  <input
                    type="text"
                    placeholder="e.g. சுவிக்கியில் ஆர்டர் செய்"
                    value={editingButton.tamilText || ''}
                    onChange={(e) => setEditingButton({ ...editingButton, tamilText: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Icon (Emoji or Short Text)</label>
                  <input
                    type="text"
                    placeholder="e.g. 🔗, 🛒, 📲, 📞, 💬, 🍛, ⭐"
                    value={editingButton.icon || ''}
                    onChange={(e) => setEditingButton({ ...editingButton, icon: e.target.value })}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Action Type *</label>
                  <select
                    value={editingButton.action || 'url'}
                    onChange={(e) => setEditingButton({ ...editingButton, action: e.target.value })}
                    className={styles.formSelect}
                  >
                    <option value="url">🔗 Open Web URL (External or Internal)</option>
                    <option value="drawer">🛒 Open Cart Drawer</option>
                    <option value="qr">📲 Open QR Table Order Modal</option>
                    <option value="menu">🍛 Scroll to Menu Delicacies (#menu)</option>
                    <option value="tel">📞 Call Phone Number</option>
                    <option value="whatsapp">💬 WhatsApp Direct Chat</option>
                  </select>
                </div>
              </div>

              {/* Target Web URL Input */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  {editingButton.action === 'url' ? 'Target Web URL *' : 'Target Link / Value'}
                </label>
                <input
                  type="text"
                  placeholder={
                    editingButton.action === 'url'
                      ? 'https://example.com, https://zomato.com, or /catering'
                      : editingButton.action === 'tel'
                      ? 'tel:+919842400000'
                      : editingButton.action === 'whatsapp'
                      ? 'https://wa.me/919842400000'
                      : '#menu'
                  }
                  value={editingButton.link || ''}
                  onChange={(e) => setEditingButton({ ...editingButton, link: e.target.value })}
                  className={styles.formInput}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Enter any full web link starting with <code>https://</code> or anchor like <code>/#menu</code>.
                </span>
              </div>

              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Placement on Website</label>
                  <select
                    value={editingButton.position || 'HERO_PRIMARY'}
                    onChange={(e) => setEditingButton({ ...editingButton, position: e.target.value })}
                    className={styles.formSelect}
                  >
                    <option value="HERO_PRIMARY">Hero Banner Primary</option>
                    <option value="HERO_SECONDARY">Hero Banner Secondary</option>
                    <option value="HEADER_CTA">Header Top Navigation CTA</option>
                    <option value="FLOATING_BOTTOM">Floating Bottom Bar</option>
                    <option value="MENU_BANNER">Menu Section Action</option>
                    <option value="FOOTER_CTA">Footer Showcase CTA</option>
                    <option value="CUSTOM">Custom Position</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Button Shape</label>
                  <select
                    value={editingButton.shape || 'pill'}
                    onChange={(e) => setEditingButton({ ...editingButton, shape: e.target.value })}
                    className={styles.formSelect}
                  >
                    <option value="pill">Pill Shaped (Fully Rounded)</option>
                    <option value="rounded">Rounded Corners (8px)</option>
                    <option value="squared">Square Corners (2px)</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Background Color</label>
                  <div className={styles.colorPickerRow}>
                    <input
                      type="color"
                      value={editingButton.bgColor || '#0284c7'}
                      onChange={(e) => setEditingButton({ ...editingButton, bgColor: e.target.value })}
                      className={styles.colorThumb}
                    />
                    <input
                      type="text"
                      value={editingButton.bgColor || '#0284c7'}
                      onChange={(e) => setEditingButton({ ...editingButton, bgColor: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Text Color</label>
                  <div className={styles.colorPickerRow}>
                    <input
                      type="color"
                      value={editingButton.textColor || '#ffffff'}
                      onChange={(e) => setEditingButton({ ...editingButton, textColor: e.target.value })}
                      className={styles.colorThumb}
                    />
                    <input
                      type="text"
                      value={editingButton.textColor || '#ffffff'}
                      onChange={(e) => setEditingButton({ ...editingButton, textColor: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formRow2}>
                <div className={styles.switchRow}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Open in New Tab
                  </span>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={editingButton.target === '_blank'}
                      onChange={(e) => setEditingButton({ ...editingButton, target: e.target.checked ? '_blank' : '_self' })}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.switchRow}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Visible on Site
                  </span>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={editingButton.isVisible !== false}
                      onChange={(e) => setEditingButton({ ...editingButton, isVisible: e.target.checked })}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnActionSec} onClick={() => setEditingButton(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnLiveSync}
                onClick={() => handleSaveButton(editingButton, true)}
              >
                <span className={styles.pulseDot}></span>
                ⚡ Save &amp; Publish Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: EDIT / ADD CUSTOMER REVIEW
         ══════════════════════════════════════════════════════════════════════ */}
      {editingReview && (
        <div className={styles.modalBackdrop} onClick={() => setEditingReview(null)}>
          <div className={styles.modalBox} style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingReview.id ? `Edit Review: ${editingReview.name}` : 'Add New Customer Review'}
              </h3>
              <button type="button" className={styles.modalClose} onClick={() => setEditingReview(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Reviewer Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Senthil Kumar"
                    value={editingReview.name || ''}
                    onChange={(e) => setEditingReview({ ...editingReview, name: e.target.value })}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Location / Tagline</label>
                  <input
                    type="text"
                    placeholder="e.g. Karaikudi Heritage Blogger"
                    value={editingReview.location || ''}
                    onChange={(e) => setEditingReview({ ...editingReview, location: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Star Rating (1 to 5 Stars)</label>
                  <div className={styles.starRatingSelector}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={(editingReview.rating || 5) >= star ? styles.starSelected : styles.starEmpty}
                        onClick={() => setEditingReview({ ...editingReview, rating: star })}
                        title={`${star} Star`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Review Date</label>
                  <input
                    type="text"
                    placeholder="e.g. Yesterday, Last Week, Oct 2026"
                    value={editingReview.date || ''}
                    onChange={(e) => setEditingReview({ ...editingReview, date: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Favorite Dish Recommended</label>
                <input
                  type="text"
                  placeholder="e.g. Karaikudi Medhu Vadai &amp; Filter Coffee"
                  value={editingReview.dish || ''}
                  onChange={(e) => setEditingReview({ ...editingReview, dish: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Review Testimonial / Quote *</label>
                <textarea
                  rows="3"
                  placeholder="The authentic Karaikudi taste reminded me of my grandmother's cooking in Kanadukathan..."
                  value={editingReview.quote || ''}
                  onChange={(e) => setEditingReview({ ...editingReview, quote: e.target.value })}
                  className={styles.formTextarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Avatar / Profile Photo URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/avatar.jpg"
                  value={editingReview.avatar || ''}
                  onChange={(e) => setEditingReview({ ...editingReview, avatar: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formRow2}>
                <div className={styles.switchRow}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Verified Diner Badge
                  </span>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={editingReview.isVerified !== false}
                      onChange={(e) => setEditingReview({ ...editingReview, isVerified: e.target.checked })}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.switchRow}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Show on Live Site
                  </span>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={editingReview.isVisible !== false}
                      onChange={(e) => setEditingReview({ ...editingReview, isVisible: e.target.checked })}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnActionSec} onClick={() => setEditingReview(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnLiveSync}
                onClick={() => handleSaveReview(editingReview, true)}
              >
                <span className={styles.pulseDot}></span>
                ⚡ Save &amp; Publish Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: EDIT / ADD VIDEO FEEDBACK / REEL / VLOG
         ══════════════════════════════════════════════════════════════════════ */}
      {editingVideo && (
        <div className={styles.modalBackdrop} onClick={() => setEditingVideo(null)}>
          <div className={styles.modalBox} style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingVideo.id ? `Edit Video: ${editingVideo.title}` : 'Add Video Reel or YouTube Vlog'}
              </h3>
              <button type="button" className={styles.modalClose} onClick={() => setEditingVideo(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Video Platform Type *</label>
                  <select
                    value={editingVideo.type || 'REEL'}
                    onChange={(e) => setEditingVideo({ ...editingVideo, type: e.target.value })}
                    className={styles.formSelect}
                  >
                    <option value="REEL">📱 Instagram Reel</option>
                    <option value="YOUTUBE">🔴 YouTube Food Vlog</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Featured Dish</label>
                  <input
                    type="text"
                    placeholder="e.g. Karaikudi Ghee Roast Dosa"
                    value={editingVideo.dish || ''}
                    onChange={(e) => setEditingVideo({ ...editingVideo, dish: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Creator Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Chennai Food Explorer"
                    value={editingVideo.creator || ''}
                    onChange={(e) => setEditingVideo({ ...editingVideo, creator: e.target.value })}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Channel Handle</label>
                  <input
                    type="text"
                    placeholder="e.g. @chennaifoodie"
                    value={editingVideo.handle || ''}
                    onChange={(e) => setEditingVideo({ ...editingVideo, handle: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Video Title / Caption *</label>
                <input
                  type="text"
                  placeholder="e.g. Sri Gokulam Crispy Roast &amp; Vadai Platter Review"
                  value={editingVideo.title || ''}
                  onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Video Web URL (Instagram Reel / YouTube URL) *</label>
                <input
                  type="text"
                  placeholder="https://www.instagram.com/reel/... or https://www.youtube.com/watch?v=..."
                  value={editingVideo.videoUrl || ''}
                  onChange={(e) => setEditingVideo({ ...editingVideo, videoUrl: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Thumbnail Poster Image URL *</label>
                <input
                  type="text"
                  placeholder="https://example.com/thumbnail.jpg or /dishes/dosa.jpg"
                  value={editingVideo.thumbnailUrl || ''}
                  onChange={(e) => setEditingVideo({ ...editingVideo, thumbnailUrl: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formRow3}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>View Count</label>
                  <input
                    type="text"
                    placeholder="e.g. 48K views"
                    value={editingVideo.views || ''}
                    onChange={(e) => setEditingVideo({ ...editingVideo, views: e.target.value })}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Likes Count</label>
                  <input
                    type="text"
                    placeholder="e.g. 3.2K likes"
                    value={editingVideo.likes || ''}
                    onChange={(e) => setEditingVideo({ ...editingVideo, likes: e.target.value })}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 0:45 or 8:30"
                    value={editingVideo.duration || ''}
                    onChange={(e) => setEditingVideo({ ...editingVideo, duration: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.switchRow}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Show Video on Live Site
                </span>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={editingVideo.isVisible !== false}
                    onChange={(e) => setEditingVideo({ ...editingVideo, isVisible: e.target.checked })}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnActionSec} onClick={() => setEditingVideo(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnLiveSync}
                onClick={() => handleSaveVideo(editingVideo, true)}
              >
                <span className={styles.pulseDot}></span>
                ⚡ Save &amp; Publish Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: EDIT / ADD HEADER NAVIGATION LINK
         ══════════════════════════════════════════════════════════════════════ */}
      {editingNavLink && (
        <div className={styles.modalBackdrop} onClick={() => setEditingNavLink(null)}>
          <div className={styles.modalBox} style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingNavLink.id ? `Edit Nav Link: ${editingNavLink.label}` : 'Add Header Navigation Link'}
              </h3>
              <button type="button" className={styles.modalClose} onClick={() => setEditingNavLink(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Link Label (English) *</label>
                <input
                  type="text"
                  placeholder="e.g. Traditional Feast"
                  value={editingNavLink.label || ''}
                  onChange={(e) => setEditingNavLink({ ...editingNavLink, label: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Link Label (Tamil)</label>
                <input
                  type="text"
                  placeholder="e.g. பாரம்பரிய விருந்து"
                  value={editingNavLink.labelTa || ''}
                  onChange={(e) => setEditingNavLink({ ...editingNavLink, labelTa: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Target Web URL or Page Anchor *</label>
                <input
                  type="text"
                  placeholder="/#menu, /#reviews, /catering, or https://..."
                  value={editingNavLink.href || ''}
                  onChange={(e) => setEditingNavLink({ ...editingNavLink, href: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formRow2}>
                <div className={styles.switchRow}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Special Badge Highlight
                  </span>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={!!editingNavLink.isSpecial}
                      onChange={(e) => setEditingNavLink({ ...editingNavLink, isSpecial: e.target.checked })}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.switchRow}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Show in Header
                  </span>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={editingNavLink.showInHeader !== false}
                      onChange={(e) => setEditingNavLink({ ...editingNavLink, showInHeader: e.target.checked })}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnActionSec} onClick={() => setEditingNavLink(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnLiveSync}
                onClick={() => handleSaveNavLink(editingNavLink)}
              >
                <span className={styles.pulseDot}></span>
                ⚡ Save &amp; Publish Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: EDIT / ADD FOOTER QUICK LINK
         ══════════════════════════════════════════════════════════════════════ */}
      {editingQuickLink && (
        <div className={styles.modalBackdrop} onClick={() => setEditingQuickLink(null)}>
          <div className={styles.modalBox} style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingQuickLink.id ? `Edit Quick Link: ${editingQuickLink.label}` : 'Add Footer Quick Link'}
              </h3>
              <button type="button" className={styles.modalClose} onClick={() => setEditingQuickLink(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Link Label (English) *</label>
                <input
                  type="text"
                  placeholder="e.g. Wedding Catering"
                  value={editingQuickLink.label || ''}
                  onChange={(e) => setEditingQuickLink({ ...editingQuickLink, label: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Link Label (Tamil)</label>
                <input
                  type="text"
                  placeholder="e.g. திருமண கேட்டரிங்"
                  value={editingQuickLink.labelTa || ''}
                  onChange={(e) => setEditingQuickLink({ ...editingQuickLink, labelTa: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Target Web URL / Path *</label>
                <input
                  type="text"
                  placeholder="/catering, /#menu, or https://..."
                  value={editingQuickLink.href || ''}
                  onChange={(e) => setEditingQuickLink({ ...editingQuickLink, href: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.switchRow}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Open in New Browser Tab
                </span>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={!!editingQuickLink.openInNewTab}
                    onChange={(e) => setEditingQuickLink({ ...editingQuickLink, openInNewTab: e.target.checked })}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnActionSec} onClick={() => setEditingQuickLink(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnLiveSync}
                onClick={() => handleSaveQuickLink(editingQuickLink)}
              >
                <span className={styles.pulseDot}></span>
                ⚡ Save &amp; Publish Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 7: EDIT / CREATE PAGE
         ══════════════════════════════════════════════════════════════════════ */}
      {editingPage && (
        <div className={styles.modalBackdrop} onClick={() => setEditingPage(null)}>
          <div className={styles.modalBox} style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingPage.id ? 'Edit Page' : 'Create New Page'}</h3>
              <button type="button" className={styles.modalClose} onClick={() => setEditingPage(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Page Title *</label>
                <input
                  type="text"
                  value={editingPage.title || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>URL Slug *</label>
                <input
                  type="text"
                  value={editingPage.slug || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })}
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>SEO Meta Title</label>
                <input
                  type="text"
                  value={editingPage.seoTitle || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, seoTitle: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>SEO Meta Description</label>
                <textarea
                  rows="2"
                  value={editingPage.metaDesc || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, metaDesc: e.target.value })}
                  className={styles.formTextarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Page Content / Body</label>
                <textarea
                  rows="4"
                  value={editingPage.content || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                  className={styles.formTextarea}
                />
              </div>

              <div className={styles.switchRow}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Show in Navigation Header
                </span>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={editingPage.inNav !== false}
                    onChange={(e) => setEditingPage({ ...editingPage, inNav: e.target.checked })}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.switchRow}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Show in Website Footer
                </span>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={editingPage.inFooter !== false}
                    onChange={(e) => setEditingPage({ ...editingPage, inFooter: e.target.checked })}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnActionSec} onClick={() => setEditingPage(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btnActionSec} ${styles.btnSaveDraft}`}
                onClick={() => handleSavePage(editingPage)}
              >
                Save Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 8: EDIT / ADD MENU DISH
         ══════════════════════════════════════════════════════════════════════ */}
      {editingMenuItem && (
        <div className={styles.modalBackdrop} onClick={() => setEditingMenuItem(null)}>
          <div className={styles.modalBox} style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingMenuItem.id ? 'Edit Menu Dish' : 'Add New Menu Dish'}</h3>
              <button type="button" className={styles.modalClose} onClick={() => setEditingMenuItem(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Dish Name (English) *</label>
                <input
                  type="text"
                  value={editingMenuItem.title || ''}
                  onChange={(e) => setEditingMenuItem({ ...editingMenuItem, title: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Dish Name (Tamil)</label>
                <input
                  type="text"
                  value={editingMenuItem.tamilTitle || ''}
                  onChange={(e) => setEditingMenuItem({ ...editingMenuItem, tamilTitle: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category</label>
                <select
                  value={editingMenuItem.category || 'Tiffin'}
                  onChange={(e) => setEditingMenuItem({ ...editingMenuItem, category: e.target.value })}
                  className={styles.formSelect}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name} ({c.tamilName})</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Price (₹ INR) *</label>
                <input
                  type="number"
                  value={editingMenuItem.price || ''}
                  onChange={(e) => setEditingMenuItem({ ...editingMenuItem, price: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Image URL</label>
                <input
                  type="text"
                  value={editingMenuItem.image || ''}
                  onChange={(e) => setEditingMenuItem({ ...editingMenuItem, image: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <textarea
                  rows="2"
                  value={editingMenuItem.description || ''}
                  onChange={(e) => setEditingMenuItem({ ...editingMenuItem, description: e.target.value })}
                  className={styles.formTextarea}
                />
              </div>

              <div className={styles.switchRow}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Availability (In Stock)
                </span>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={editingMenuItem.available !== false}
                    onChange={(e) => setEditingMenuItem({ ...editingMenuItem, available: e.target.checked })}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnActionSec} onClick={() => setEditingMenuItem(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btnActionSec} ${styles.btnSaveDraft}`}
                onClick={() => handleSaveMenuItem(editingMenuItem)}
              >
                Save Dish to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 9: UPLOAD NEW MEDIA
         ══════════════════════════════════════════════════════════════════════ */}
      {showMediaUploadModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowMediaUploadModal(false)}>
          <div className={styles.modalBox} style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Upload Image to Media Library</h3>
              <button type="button" className={styles.modalClose} onClick={() => setShowMediaUploadModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Image Title</label>
                <input
                  type="text"
                  value={newMediaData.title}
                  onChange={(e) => setNewMediaData({ ...newMediaData, title: e.target.value })}
                  placeholder="e.g. Karaikudi Medhu Vadai Platter"
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category</label>
                <select
                  value={newMediaData.category}
                  onChange={(e) => setNewMediaData({ ...newMediaData, category: e.target.value })}
                  className={styles.formSelect}
                >
                  <option value="Dishes">Dishes &amp; Tiffin</option>
                  <option value="Meals">Raja Meals &amp; Rice</option>
                  <option value="Beverages">Filter Coffee &amp; Beverages</option>
                  <option value="Chettinad">Chettinad Heritage</option>
                  <option value="Logos">Logos &amp; Branding</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Desktop Image URL *</label>
                <input
                  type="text"
                  value={newMediaData.desktopUrl}
                  onChange={(e) => setNewMediaData({ ...newMediaData, desktopUrl: e.target.value })}
                  placeholder="https://example.com/banner.jpg"
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mobile Image URL (Optional - defaults to Desktop)</label>
                <input
                  type="text"
                  value={newMediaData.mobileUrl}
                  onChange={(e) => setNewMediaData({ ...newMediaData, mobileUrl: e.target.value })}
                  placeholder="Optional mobile cropped variant"
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Aspect Ratio</label>
                <select
                  value={newMediaData.aspectRatio}
                  onChange={(e) => setNewMediaData({ ...newMediaData, aspectRatio: e.target.value })}
                  className={styles.formSelect}
                >
                  <option value="16:9">16:9 (Desktop Banners &amp; Wide)</option>
                  <option value="9:16">9:16 (Mobile Portrait Banners)</option>
                  <option value="4:3">4:3 (Category Cards)</option>
                  <option value="1:1">1:1 (Square Dish Photos)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tags (comma separated)</label>
                <input
                  type="text"
                  value={newMediaData.tags}
                  onChange={(e) => setNewMediaData({ ...newMediaData, tags: e.target.value })}
                  placeholder="hero, tiffin, ghee, vadai"
                  className={styles.formInput}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnActionSec} onClick={() => setShowMediaUploadModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btnActionSec} ${styles.btnSaveDraft}`}
                onClick={handleUploadMedia}
              >
                + Add Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast Notice ─── */}
      {toast && (
        <div className={styles.toastNotice}>
          <span>{toast.type === 'error' ? '❌' : '✅'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
