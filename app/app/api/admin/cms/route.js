// app/api/admin/cms/route.js - Enterprise Client Website CMS Management API
import { NextResponse } from 'next/server';
import {
  getDb,
  saveDb,
  getWebsiteCms,
  saveWebsiteDraft,
  saveAndPublishWebsiteCms,
  publishWebsiteCms,
  rollbackWebsiteVersion,
  recordCmsAuditLog,
} from '@/lib/db';
import { DEFAULT_WEBSITE_CMS, createInitialContentSnapshot } from '@/lib/cms_defaults';

// GET: Return entire CMS state (draft, published, versions, audit, media, plus active menu)
export async function GET(req) {
  try {
    const db = getDb();
    const cms = getWebsiteCms();

    // Check query params
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode'); // 'draft' | 'published' | 'all'

    if (mode === 'published') {
      return NextResponse.json({
        success: true,
        published: cms.published || DEFAULT_WEBSITE_CMS.published,
      });
    }

    return NextResponse.json({
      success: true,
      draft: cms.draft || DEFAULT_WEBSITE_CMS.draft,
      published: cms.published || DEFAULT_WEBSITE_CMS.published,
      versions: cms.versions || [],
      auditLog: cms.auditLog || [],
      mediaLibrary: cms.mediaLibrary || [],
      menu: db.menu || [],
      categories: db.categories || [],
    });
  } catch (error) {
    console.error('Error fetching CMS data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch CMS data' },
      { status: 500 }
    );
  }
}

// POST: Execute CMS Administrative Actions
export async function POST(req) {
  try {
    const body = await req.json();
    const { action, payload, user = { name: 'Admin', role: 'SUPER_ADMIN' } } = body;

    // RBAC check: only authorized staff can modify website content
    const allowedRoles = ['DEVELOPER_ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER'];
    if (user && user.role && !allowedRoles.includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          error: `Access Denied: Role '${user.role}' is not authorized to edit or publish website content. Only Admins and Store Managers have CMS permissions.`,
        },
        { status: 403 }
      );
    }

    const db = getDb();
    if (!db.website_cms) {
      db.website_cms = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CMS));
    }

    switch (action) {
      // 1. SAVE ENTIRE DRAFT OR INDIVIDUAL DRAFT SECTIONS
      case 'SAVE_DRAFT': {
        const { draftData } = payload;
        if (!draftData) {
          return NextResponse.json({ success: false, error: 'Draft data is required' }, { status: 400 });
        }
        const updatedCms = saveWebsiteDraft(draftData, user);
        return NextResponse.json({
          success: true,
          message: 'Website draft saved successfully',
          draft: updatedCms.draft,
        });
      }

      // 1B. ATOMIC SAVE & PUBLISH TO LIVE WEBSITE IMMEDIATELY
      case 'SAVE_AND_PUBLISH_LIVE': {
        const { data, summary } = payload || {};
        if (!data) {
          return NextResponse.json({ success: false, error: 'Data is required' }, { status: 400 });
        }
        const result = saveAndPublishWebsiteCms(data, user, summary || 'Live website update saved');
        return NextResponse.json({
          success: true,
          message: `Live website updated immediately (Version ${result.publishedVersion})`,
          publishedVersion: result.publishedVersion,
          draft: result.draft,
          published: result.published,
          versions: result.versions,
        });
      }

      // BUTTON SAVE (ADD OR EDIT)
      case 'BUTTON_SAVE': {
        const { button, publishLive = true } = payload || {};
        if (!button || !button.name) {
          return NextResponse.json({ success: false, error: 'Button name is required' }, { status: 400 });
        }
        if (!Array.isArray(db.website_cms.draft.buttons)) {
          db.website_cms.draft.buttons = [];
        }
        const initialButtons = db.website_cms.draft.buttons;
        const buttonRecord = {
          ...button,
          id: button.id || `btn_${Date.now()}`,
          isVisible: button.isVisible !== false,
          isCustom: button.isCustom !== undefined ? button.isCustom : true,
          updatedAt: new Date().toISOString(),
        };

        const existingIdx = initialButtons.findIndex(b => b.id === buttonRecord.id);
        let updatedButtons;
        if (existingIdx >= 0) {
          updatedButtons = [...initialButtons];
          updatedButtons[existingIdx] = buttonRecord;
          recordCmsAuditLog('BUTTON_UPDATE', `Updated button: ${buttonRecord.name}`, user.name, user.role);
        } else {
          updatedButtons = [...initialButtons, buttonRecord];
          recordCmsAuditLog('BUTTON_CREATE', `Created button: ${buttonRecord.name} (${buttonRecord.action || 'web'})`, user.name, user.role);
        }

        db.website_cms.draft.buttons = updatedButtons;
        if (publishLive) {
          if (!db.website_cms.published) db.website_cms.published = JSON.parse(JSON.stringify(db.website_cms.draft));
          db.website_cms.published.buttons = JSON.parse(JSON.stringify(updatedButtons));
        }
        saveDb(db);

        return NextResponse.json({
          success: true,
          message: `Button '${buttonRecord.name}' saved and synced live`,
          buttons: db.website_cms.draft.buttons,
          button: buttonRecord,
        });
      }

      // BUTTON DELETE
      case 'BUTTON_DELETE': {
        const { buttonId, publishLive = true } = payload || {};
        if (!buttonId) {
          return NextResponse.json({ success: false, error: 'Button ID is required' }, { status: 400 });
        }
        const target = db.website_cms.draft.buttons?.find(b => b.id === buttonId);
        db.website_cms.draft.buttons = (db.website_cms.draft.buttons || []).filter(b => b.id !== buttonId);
        if (publishLive && db.website_cms.published?.buttons) {
          db.website_cms.published.buttons = (db.website_cms.published.buttons || []).filter(b => b.id !== buttonId);
        }
        recordCmsAuditLog('BUTTON_DELETE', `Deleted button: ${target?.name || buttonId}`, user.name, user.role);
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: 'Button deleted successfully',
          buttons: db.website_cms.draft.buttons,
        });
      }

      // FEEDBACK / CUSTOMER REVIEW SAVE (ADD OR EDIT)
      case 'FEEDBACK_SAVE': {
        const { review, publishLive = true } = payload || {};
        if (!review || !review.name || (!review.review && !review.quote)) {
          return NextResponse.json({ success: false, error: 'Customer name and review text are required' }, { status: 400 });
        }
        if (!Array.isArray(db.website_cms.draft.customerReviews)) {
          db.website_cms.draft.customerReviews = [];
        }
        const reviews = db.website_cms.draft.customerReviews;
        const reviewText = review.quote || review.review || '';
        const reviewRecord = {
          ...review,
          quote: reviewText,
          review: reviewText,
          id: review.id || Date.now(),
          rating: Number(review.rating) || 5,
          isVisible: review.isVisible !== false,
          updatedAt: new Date().toISOString(),
        };

        const existingIdx = reviews.findIndex(r => r.id === reviewRecord.id);
        let updatedReviews;
        if (existingIdx >= 0) {
          updatedReviews = [...reviews];
          updatedReviews[existingIdx] = reviewRecord;
          recordCmsAuditLog('FEEDBACK_UPDATE', `Updated review by ${reviewRecord.name}`, user.name, user.role);
        } else {
          updatedReviews = [reviewRecord, ...reviews];
          recordCmsAuditLog('FEEDBACK_CREATE', `Added review by ${reviewRecord.name}`, user.name, user.role);
        }

        db.website_cms.draft.customerReviews = updatedReviews;
        if (publishLive) {
          if (!db.website_cms.published) db.website_cms.published = JSON.parse(JSON.stringify(db.website_cms.draft));
          db.website_cms.published.customerReviews = JSON.parse(JSON.stringify(updatedReviews));
        }
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: `Customer feedback saved and updated live`,
          customerReviews: db.website_cms.draft.customerReviews,
        });
      }

      // FEEDBACK DELETE
      case 'FEEDBACK_DELETE': {
        const { reviewId, publishLive = true } = payload || {};
        if (!reviewId) {
          return NextResponse.json({ success: false, error: 'Review ID is required' }, { status: 400 });
        }
        db.website_cms.draft.customerReviews = (db.website_cms.draft.customerReviews || []).filter(r => r.id !== reviewId);
        if (publishLive && db.website_cms.published?.customerReviews) {
          db.website_cms.published.customerReviews = (db.website_cms.published.customerReviews || []).filter(r => r.id !== reviewId);
        }
        recordCmsAuditLog('FEEDBACK_DELETE', `Deleted customer review ID: ${reviewId}`, user.name, user.role);
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: 'Review deleted successfully',
          customerReviews: db.website_cms.draft.customerReviews,
        });
      }

      // VIDEO FEEDBACK SAVE (REELS & YOUTUBE)
      case 'VIDEO_FEEDBACK_SAVE': {
        const { video, publishLive = true } = payload || {};
        if (!video || !video.title) {
          return NextResponse.json({ success: false, error: 'Video title is required' }, { status: 400 });
        }
        if (!Array.isArray(db.website_cms.draft.videoReviews)) {
          db.website_cms.draft.videoReviews = [];
        }
        const videos = db.website_cms.draft.videoReviews;
        const videoRecord = {
          ...video,
          id: video.id || `vid_${Date.now()}`,
          isVisible: video.isVisible !== false,
          updatedAt: new Date().toISOString(),
        };

        const existingIdx = videos.findIndex(v => v.id === videoRecord.id);
        let updatedVideos;
        if (existingIdx >= 0) {
          updatedVideos = [...videos];
          updatedVideos[existingIdx] = videoRecord;
          recordCmsAuditLog('VIDEO_FEEDBACK_UPDATE', `Updated video reel: ${videoRecord.title}`, user.name, user.role);
        } else {
          updatedVideos = [videoRecord, ...videos];
          recordCmsAuditLog('VIDEO_FEEDBACK_CREATE', `Added video reel: ${videoRecord.title}`, user.name, user.role);
        }

        db.website_cms.draft.videoReviews = updatedVideos;
        if (publishLive) {
          if (!db.website_cms.published) db.website_cms.published = JSON.parse(JSON.stringify(db.website_cms.draft));
          db.website_cms.published.videoReviews = JSON.parse(JSON.stringify(updatedVideos));
        }
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: `Video feedback saved and updated live`,
          videoReviews: db.website_cms.draft.videoReviews,
        });
      }

      // VIDEO FEEDBACK DELETE
      case 'VIDEO_FEEDBACK_DELETE': {
        const { videoId, publishLive = true } = payload || {};
        if (!videoId) {
          return NextResponse.json({ success: false, error: 'Video ID is required' }, { status: 400 });
        }
        db.website_cms.draft.videoReviews = (db.website_cms.draft.videoReviews || []).filter(v => v.id !== videoId);
        if (publishLive && db.website_cms.published?.videoReviews) {
          db.website_cms.published.videoReviews = (db.website_cms.published.videoReviews || []).filter(v => v.id !== videoId);
        }
        recordCmsAuditLog('VIDEO_FEEDBACK_DELETE', `Deleted video feedback ID: ${videoId}`, user.name, user.role);
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: 'Video feedback deleted successfully',
          videoReviews: db.website_cms.draft.videoReviews,
        });
      }

      // HEADER SAVE
      case 'HEADER_SAVE': {
        const { header, publishLive = true } = payload || {};
        if (!header) {
          return NextResponse.json({ success: false, error: 'Header configuration is required' }, { status: 400 });
        }
        db.website_cms.draft.header = {
          ...db.website_cms.draft.header,
          ...header,
          updatedAt: new Date().toISOString(),
        };
        if (header.logoUrl && db.website_cms.draft.design) {
          db.website_cms.draft.design.logoUrl = header.logoUrl;
        }
        if (publishLive) {
          if (!db.website_cms.published) db.website_cms.published = JSON.parse(JSON.stringify(db.website_cms.draft));
          db.website_cms.published.header = JSON.parse(JSON.stringify(db.website_cms.draft.header));
          if (header.logoUrl && db.website_cms.published.design) {
            db.website_cms.published.design.logoUrl = header.logoUrl;
          }
        }
        recordCmsAuditLog('HEADER_UPDATE', 'Updated website header, navigation links & announcement bar', user.name, user.role);
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: 'Website header configuration saved and updated live',
          header: db.website_cms.draft.header,
        });
      }

      // FOOTER SAVE
      case 'FOOTER_SAVE': {
        const { footer, publishLive = true } = payload || {};
        if (!footer) {
          return NextResponse.json({ success: false, error: 'Footer configuration is required' }, { status: 400 });
        }
        db.website_cms.draft.footer = {
          ...db.website_cms.draft.footer,
          ...footer,
          updatedAt: new Date().toISOString(),
        };
        if (publishLive) {
          if (!db.website_cms.published) db.website_cms.published = JSON.parse(JSON.stringify(db.website_cms.draft));
          db.website_cms.published.footer = JSON.parse(JSON.stringify(db.website_cms.draft.footer));
        }
        recordCmsAuditLog('FOOTER_UPDATE', 'Updated website footer, hours, address, and social links', user.name, user.role);
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: 'Website footer configuration saved and updated live',
          footer: db.website_cms.draft.footer,
        });
      }

      // 2. PUBLISH DRAFT TO LIVE WEBSITE WITH VERSION SNAPSHOT
      case 'PUBLISH': {
        const { summary } = payload || {};
        const result = publishWebsiteCms(user, summary || 'Published updates to live website');
        return NextResponse.json({
          success: true,
          message: `Live website updated successfully (Version ${result.publishedVersion})`,
          publishedVersion: result.publishedVersion,
          published: result.published,
          versions: result.versions,
        });
      }

      // 3. ROLLBACK TO A PREVIOUS VERSION SNAPSHOT
      case 'ROLLBACK': {
        const { versionId } = payload;
        if (!versionId) {
          return NextResponse.json({ success: false, error: 'Target Version ID is required' }, { status: 400 });
        }
        const result = rollbackWebsiteVersion(versionId, user);
        return NextResponse.json({
          success: true,
          message: result.message,
          cms: result.cms,
        });
      }

      // 4. SECTIONS MANAGEMENT: REORDER / TOGGLE VISIBILITY
      case 'UPDATE_SECTIONS': {
        const { sections } = payload;
        if (!Array.isArray(sections)) {
          return NextResponse.json({ success: false, error: 'Sections array is required' }, { status: 400 });
        }
        db.website_cms.draft.sections = sections;
        recordCmsAuditLog('UPDATE_SECTIONS', `Updated homepage section layout & order (${sections.length} sections)`, user.name, user.role);
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: 'Homepage section order and visibility updated in draft',
          sections: db.website_cms.draft.sections,
        });
      }

      // 5. HERO SLIDES MANAGEMENT
      case 'UPDATE_HERO_SLIDES': {
        const { slides } = payload;
        if (!Array.isArray(slides)) {
          return NextResponse.json({ success: false, error: 'Slides array is required' }, { status: 400 });
        }
        db.website_cms.draft.heroSlides = slides;
        recordCmsAuditLog('UPDATE_HERO_SLIDES', `Updated hero banners (${slides.length} slides configured)`, user.name, user.role);
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: 'Hero banners updated in draft',
          heroSlides: db.website_cms.draft.heroSlides,
        });
      }

      // 6. BUTTON MANAGEMENT: UPDATE CALL-TO-ACTION BUTTONS
      case 'UPDATE_BUTTONS': {
        const { buttons } = payload;
        if (!Array.isArray(buttons)) {
          return NextResponse.json({ success: false, error: 'Buttons array is required' }, { status: 400 });
        }
        db.website_cms.draft.buttons = buttons;
        recordCmsAuditLog('UPDATE_BUTTONS', `Updated website action buttons (${buttons.length} buttons)`, user.name, user.role);
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: 'Action buttons updated in draft',
          buttons: db.website_cms.draft.buttons,
        });
      }

      // 7. PAGES MANAGEMENT: ADD, EDIT, DELETE PAGES
      case 'PAGE_SAVE': {
        const { page } = payload;
        if (!page || !page.title || !page.slug) {
          return NextResponse.json({ success: false, error: 'Page title and slug are required' }, { status: 400 });
        }
        if (!Array.isArray(db.website_cms.draft.pages)) {
          db.website_cms.draft.pages = [];
        }

        const existingIdx = db.website_cms.draft.pages.findIndex(p => p.id === page.id || p.slug === page.slug);
        const pageRecord = {
          ...page,
          id: page.id || `page_${Date.now()}`,
          updatedAt: new Date().toISOString(),
          updatedBy: user.name || 'Admin',
        };

        if (existingIdx >= 0) {
          db.website_cms.draft.pages[existingIdx] = pageRecord;
          recordCmsAuditLog('PAGE_UPDATE', `Updated page: ${page.title} (${page.slug})`, user.name, user.role);
        } else {
          db.website_cms.draft.pages.push(pageRecord);
          recordCmsAuditLog('PAGE_CREATE', `Created new page: ${page.title} (${page.slug})`, user.name, user.role);
        }

        saveDb(db);
        return NextResponse.json({
          success: true,
          message: `Page '${page.title}' saved successfully`,
          pages: db.website_cms.draft.pages,
        });
      }

      case 'PAGE_DELETE': {
        const { pageId } = payload;
        if (!pageId) {
          return NextResponse.json({ success: false, error: 'Page ID is required' }, { status: 400 });
        }
        const target = db.website_cms.draft.pages?.find(p => p.id === pageId);
        if (target?.isSystem) {
          return NextResponse.json({ success: false, error: 'System core pages (like Home) cannot be deleted' }, { status: 400 });
        }
        db.website_cms.draft.pages = (db.website_cms.draft.pages || []).filter(p => p.id !== pageId);
        recordCmsAuditLog('PAGE_DELETE', `Deleted page: ${target?.title || pageId}`, user.name, user.role);
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: 'Page deleted successfully',
          pages: db.website_cms.draft.pages,
        });
      }

      // 8. MEDIA LIBRARY: UPLOAD, REPLACE, DELETE
      case 'MEDIA_UPLOAD': {
        const { mediaItem } = payload;
        if (!mediaItem || !mediaItem.desktopUrl) {
          return NextResponse.json({ success: false, error: 'Image URL or file data is required' }, { status: 400 });
        }
        const newMedia = {
          id: mediaItem.id || `med_${Date.now()}`,
          title: mediaItem.title || 'Uploaded Media',
          category: mediaItem.category || 'Dishes',
          desktopUrl: mediaItem.desktopUrl,
          mobileUrl: mediaItem.mobileUrl || mediaItem.desktopUrl,
          aspectRatio: mediaItem.aspectRatio || '16:9',
          tags: Array.isArray(mediaItem.tags) ? mediaItem.tags : ['custom'],
          createdAt: new Date().toISOString(),
        };

        if (!Array.isArray(db.website_cms.mediaLibrary)) {
          db.website_cms.mediaLibrary = [];
        }
        db.website_cms.mediaLibrary.unshift(newMedia);
        recordCmsAuditLog('MEDIA_UPLOAD', `Uploaded image: ${newMedia.title} (${newMedia.category})`, user.name, user.role);
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: 'Image uploaded to Media Library',
          mediaLibrary: db.website_cms.mediaLibrary,
          item: newMedia,
        });
      }

      case 'MEDIA_DELETE': {
        const { mediaId } = payload;
        if (!mediaId) {
          return NextResponse.json({ success: false, error: 'Media ID is required' }, { status: 400 });
        }
        const target = db.website_cms.mediaLibrary?.find(m => m.id === mediaId);
        db.website_cms.mediaLibrary = (db.website_cms.mediaLibrary || []).filter(m => m.id !== mediaId);
        recordCmsAuditLog('MEDIA_DELETE', `Deleted media: ${target?.title || mediaId}`, user.name, user.role);
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: 'Media deleted from library',
          mediaLibrary: db.website_cms.mediaLibrary,
        });
      }

      // 9. WEBSITE DESIGN & BRANDING SETTINGS
      case 'UPDATE_DESIGN': {
        const { design } = payload;
        if (!design) {
          return NextResponse.json({ success: false, error: 'Design settings are required' }, { status: 400 });
        }
        db.website_cms.draft.design = {
          ...db.website_cms.draft.design,
          ...design,
        };
        recordCmsAuditLog('UPDATE_DESIGN', 'Updated website design styles, colors, and typography', user.name, user.role);
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: 'Website design settings updated in draft',
          design: db.website_cms.draft.design,
        });
      }

      // 10. CONTENT EDITOR (Texts, Contact, Hours, Marquee, Announcements)
      case 'UPDATE_CONTENT': {
        const { content } = payload;
        if (!content) {
          return NextResponse.json({ success: false, error: 'Content data is required' }, { status: 400 });
        }
        db.website_cms.draft.content = {
          ...db.website_cms.draft.content,
          ...content,
        };
        recordCmsAuditLog('UPDATE_CONTENT', 'Updated website content, contact info, operating hours, and announcements', user.name, user.role);
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: 'Website content updated in draft',
          content: db.website_cms.draft.content,
        });
      }

      // 11. MENU DISH MANAGEMENT FROM CMS (Add/Edit/Delete/Availability/Price)
      case 'MENU_ITEM_SAVE': {
        const { dish } = payload;
        if (!dish || !dish.title || dish.price === undefined) {
          return NextResponse.json({ success: false, error: 'Dish title and price are required' }, { status: 400 });
        }
        if (!Array.isArray(db.menu)) {
          db.menu = [];
        }
        const idx = db.menu.findIndex(d => d.id === dish.id);
        const itemRecord = {
          ...dish,
          id: dish.id || `dish_${Date.now()}`,
          price: Number(dish.price),
          available: dish.available !== false,
          status: dish.available === false ? 'SOLD_OUT' : (dish.status || 'AVAILABLE'),
        };

        if (idx >= 0) {
          db.menu[idx] = { ...db.menu[idx], ...itemRecord };
          recordCmsAuditLog('MENU_ITEM_UPDATE', `Updated dish: ${itemRecord.title} (₹${itemRecord.price})`, user.name, user.role);
        } else {
          db.menu.push(itemRecord);
          recordCmsAuditLog('MENU_ITEM_CREATE', `Added new menu dish: ${itemRecord.title} (₹${itemRecord.price})`, user.name, user.role);
        }

        saveDb(db);
        return NextResponse.json({
          success: true,
          message: `Dish '${itemRecord.title}' saved to restaurant menu`,
          menu: db.menu,
        });
      }

      case 'MENU_ITEM_DELETE': {
        const { dishId } = payload;
        if (!dishId) {
          return NextResponse.json({ success: false, error: 'Dish ID is required' }, { status: 400 });
        }
        const targetDish = db.menu?.find(d => d.id === dishId);
        db.menu = (db.menu || []).filter(d => d.id !== dishId);
        recordCmsAuditLog('MENU_ITEM_DELETE', `Deleted menu item: ${targetDish?.title || dishId}`, user.name, user.role);
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: 'Dish removed from restaurant menu',
          menu: db.menu,
        });
      }

      // 12. RESET DRAFT TO FACTORY CHETTINAD DEFAULTS
      case 'RESET_TO_DEFAULTS': {
        db.website_cms.draft = createInitialContentSnapshot();
        recordCmsAuditLog('RESET_DEFAULTS', 'Reset website draft to factory Chettinad Sattvic defaults', user.name, user.role);
        saveDb(db);
        return NextResponse.json({
          success: true,
          message: 'Website draft restored to original factory defaults',
          draft: db.website_cms.draft,
        });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action '${action}'` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error executing CMS action:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'CMS operation failed' },
      { status: 500 }
    );
  }
}
