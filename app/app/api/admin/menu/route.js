// app/api/admin/menu/route.js - Comprehensive Menu Management Engine for Sri Gokulam Enterprise Suite
import { NextResponse } from 'next/server';
import { getDb, saveDb, categorizeStation } from '@/lib/db';
import { broadcast } from '@/app/api/events/route';

// Helper to log audit changes
function logMenuAudit(db, { dishId, dishName, action, details, changedBy = 'Admin', role = 'STORE_MANAGER' }) {
  if (!db.menu_audit_logs) db.menu_audit_logs = [];
  const logEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    dishId: dishId || 'SYSTEM',
    dishName: dishName || 'General Menu',
    action,
    details,
    changedBy,
    role,
  };
  db.menu_audit_logs.unshift(logEntry);
  if (db.menu_audit_logs.length > 200) {
    db.menu_audit_logs = db.menu_audit_logs.slice(0, 200);
  }
  return logEntry;
}

export async function GET(request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';

    let menu = db.menu || [];
    if (!includeArchived) {
      menu = menu.filter(it => it.status !== 'ARCHIVED');
    }

    const categories = (db.categories || []).slice().sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    const inventory = (db.inventory || []).map(inv => ({
      id: inv.id,
      name: inv.name,
      unit: inv.unit,
      currentStock: inv.currentStock,
      lowStockThreshold: inv.lowStockThreshold,
      category: inv.category,
    }));
    const recipes = db.recipes || [];
    const auditLogs = (db.menu_audit_logs || []).slice(0, 80);

    const summary = {
      totalItems: (db.menu || []).filter(it => it.status !== 'ARCHIVED').length,
      totalArchived: (db.menu || []).filter(it => it.status === 'ARCHIVED').length,
      totalCategories: categories.length,
      availableCount: (db.menu || []).filter(it => it.status === 'AVAILABLE' && it.available !== false).length,
      soldOutCount: (db.menu || []).filter(it => it.status === 'SOLD_OUT' || it.available === false).length,
      unavailableCount: (db.menu || []).filter(it => it.status === 'UNAVAILABLE').length,
      featuredCount: (db.menu || []).filter(it => it.isFeatured).length,
      bestsellerCount: (db.menu || []).filter(it => it.isBestseller).length,
      activeOffersCount: (db.menu || []).filter(it => it.discount?.active).length,
      recipeLinkedCount: (db.menu || []).filter(it => !!it.recipeId).length,
    };

    return NextResponse.json({
      success: true,
      menu,
      allMenu: db.menu || [],
      categories,
      inventory,
      recipes,
      auditLogs,
      summary,
    });
  } catch (err) {
    console.error('Menu GET Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      action = 'ADD_ITEM',
      item,
      dishId,
      status,
      discount,
      categoryData,
      subAction,
      dishIds,
      payload,
      items,
      authorizedBy = 'Staff',
      role = 'STORE_MANAGER',
      managerPin,
    } = body;

    const db = getDb();
    if (!db.menu) db.menu = [];
    if (!db.categories) db.categories = [];
    if (!db.menu_audit_logs) db.menu_audit_logs = [];

    // ─── 1. ADD MENU ITEM ───────────────────────────────────────────────────
    if (action === 'ADD_ITEM') {
      if (!item || !item.title || !item.price) {
        return NextResponse.json({ success: false, error: 'Dish title and price are required' }, { status: 400 });
      }

      const numPrice = Number(item.price);
      if (isNaN(numPrice) || numPrice <= 0) {
        return NextResponse.json({ success: false, error: 'Price must be a valid positive number' }, { status: 400 });
      }

      const defaultCategory = item.category || 'Tiffin';
      const newItem = {
        id: item.id || `dish_${Date.now()}`,
        title: item.title.trim(),
        tamilTitle: (item.tamilTitle || '').trim(),
        category: defaultCategory,
        price: numPrice,
        portionSize: item.portionSize || 'Standard (1 Person)',
        prepTime: Number(item.prepTime) || 10,
        image: item.image || '',
        description: (item.description || '').trim(),
        station: item.station || categorizeStation(item.title),
        available: true,
        status: 'AVAILABLE',
        isFeatured: Boolean(item.isFeatured),
        isBestseller: Boolean(item.isBestseller),
        isChefSpecial: Boolean(item.isChefSpecial),
        dietary: item.dietary || {
          isVeg: true,
          isJain: Boolean(item.isJain),
          isVegan: Boolean(item.isVegan),
          isGlutenFree: Boolean(item.isGlutenFree),
          spiceLevel: Number(item.spiceLevel) || 2,
        },
        allergens: Array.isArray(item.allergens) ? item.allergens : [],
        ingredients: Array.isArray(item.ingredients) ? item.ingredients : (item.description ? [item.description] : []),
        variants: Array.isArray(item.variants) && item.variants.length > 0 ? item.variants : [
          { name: 'Standard Portion', priceDiff: 0 }
        ],
        addOns: Array.isArray(item.addOns) ? item.addOns : [],
        recipeId: item.recipeId || null,
        discount: item.discount || {
          active: false,
          type: 'PERCENT',
          value: 0,
          discountedPrice: numPrice,
          label: '',
          startDate: '',
          endDate: '',
        },
        displayOrder: db.menu.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.menu.unshift(newItem);

      logMenuAudit(db, {
        dishId: newItem.id,
        dishName: newItem.title,
        action: 'ITEM_CREATED',
        details: `Published new delicacy ₹${newItem.price} under ${newItem.category} (Station: ${newItem.station})`,
        changedBy: authorizedBy,
        role,
      });

      saveDb(db);
      broadcast({ type: 'MENU_UPDATED', action: 'ADD_ITEM', item: newItem });

      return NextResponse.json({
        success: true,
        message: `Successfully created ${newItem.title}`,
        item: newItem,
      });
    }

    // ─── 2. UPDATE MENU ITEM ────────────────────────────────────────────────
    if (action === 'UPDATE_ITEM') {
      if (!item || !item.id) {
        return NextResponse.json({ success: false, error: 'Item ID is required for update' }, { status: 400 });
      }

      const index = db.menu.findIndex(d => d.id === item.id);
      if (index === -1) {
        return NextResponse.json({ success: false, error: 'Dish not found' }, { status: 404 });
      }

      const existing = db.menu[index];
      const changes = [];

      if (Number(item.price) !== existing.price) {
        changes.push(`Price: ₹${existing.price} → ₹${item.price}`);
      }
      if (item.category && item.category !== existing.category) {
        changes.push(`Category: ${existing.category} → ${item.category}`);
      }
      if (item.station && item.station !== existing.station) {
        changes.push(`Station: ${existing.station} → ${item.station}`);
      }
      if (item.status && item.status !== existing.status) {
        changes.push(`Status: ${existing.status} → ${item.status}`);
      }

      const updated = {
        ...existing,
        ...item,
        price: Number(item.price) || existing.price,
        prepTime: Number(item.prepTime) || existing.prepTime || 10,
        available: item.status === 'AVAILABLE' ? true : (item.status === 'SOLD_OUT' || item.status === 'UNAVAILABLE' ? false : (item.available !== undefined ? item.available : existing.available)),
        updatedAt: new Date().toISOString(),
      };

      db.menu[index] = updated;

      logMenuAudit(db, {
        dishId: updated.id,
        dishName: updated.title,
        action: 'ITEM_UPDATED',
        details: changes.length > 0 ? changes.join(', ') : 'Updated specifications, variants, and recipes',
        changedBy: authorizedBy,
        role,
      });

      saveDb(db);
      broadcast({ type: 'MENU_UPDATED', action: 'UPDATE_ITEM', item: updated });

      return NextResponse.json({
        success: true,
        message: `Updated ${updated.title}`,
        item: updated,
      });
    }

    // ─── 3. AVAILABILITY CONTROL (1-TOUCH TOGGLE) ───────────────────────────
    if (action === 'SET_AVAILABILITY') {
      const targetId = dishId || item?.id;
      const newStatus = status || 'AVAILABLE'; // 'AVAILABLE' | 'SOLD_OUT' | 'UNAVAILABLE'

      const target = db.menu.find(d => d.id === targetId);
      if (!target) {
        return NextResponse.json({ success: false, error: 'Dish not found' }, { status: 404 });
      }

      const oldStatus = target.status || (target.available ? 'AVAILABLE' : 'SOLD_OUT');
      target.status = newStatus;
      target.available = newStatus === 'AVAILABLE';
      target.updatedAt = new Date().toISOString();

      logMenuAudit(db, {
        dishId: target.id,
        dishName: target.title,
        action: 'AVAILABILITY_CHANGE',
        details: `Availability changed: ${oldStatus} → ${newStatus}`,
        changedBy: authorizedBy,
        role,
      });

      saveDb(db);
      broadcast({ type: 'MENU_UPDATED', action: 'SET_AVAILABILITY', dishId: target.id, status: newStatus });

      return NextResponse.json({
        success: true,
        message: `${target.title} marked as ${newStatus}`,
        dish: target,
      });
    }

    // ─── 4. TOGGLE FEATURED / BESTSELLER ────────────────────────────────────
    if (action === 'TOGGLE_FEATURED') {
      const target = db.menu.find(d => d.id === dishId);
      if (!target) return NextResponse.json({ success: false, error: 'Dish not found' }, { status: 404 });

      target.isFeatured = !target.isFeatured;
      target.updatedAt = new Date().toISOString();

      logMenuAudit(db, {
        dishId: target.id,
        dishName: target.title,
        action: 'FEATURED_TOGGLED',
        details: target.isFeatured ? 'Pinned to Featured homepage banner' : 'Removed from Featured banner',
        changedBy: authorizedBy,
        role,
      });

      saveDb(db);
      broadcast({ type: 'MENU_UPDATED', action: 'TOGGLE_FEATURED', dish: target });
      return NextResponse.json({ success: true, isFeatured: target.isFeatured });
    }

    if (action === 'TOGGLE_BESTSELLER') {
      const target = db.menu.find(d => d.id === dishId);
      if (!target) return NextResponse.json({ success: false, error: 'Dish not found' }, { status: 404 });

      target.isBestseller = !target.isBestseller;
      target.updatedAt = new Date().toISOString();

      logMenuAudit(db, {
        dishId: target.id,
        dishName: target.title,
        action: 'BESTSELLER_TOGGLED',
        details: target.isBestseller ? 'Awarded Bestseller Crown Badge' : 'Bestseller badge removed',
        changedBy: authorizedBy,
        role,
      });

      saveDb(db);
      broadcast({ type: 'MENU_UPDATED', action: 'TOGGLE_BESTSELLER', dish: target });
      return NextResponse.json({ success: true, isBestseller: target.isBestseller });
    }

    // ─── 5. SET OFFERS & PROMOTIONAL DISCOUNTS ──────────────────────────────
    if (action === 'SET_OFFER') {
      const target = db.menu.find(d => d.id === dishId);
      if (!target) return NextResponse.json({ success: false, error: 'Dish not found' }, { status: 404 });

      const discountObj = discount || {};
      const active = Boolean(discountObj.active);
      const type = discountObj.type === 'FLAT' ? 'FLAT' : 'PERCENT';
      const val = Number(discountObj.value) || 0;

      let discountedPrice = target.price;
      if (active && val > 0) {
        if (type === 'PERCENT') {
          discountedPrice = Math.max(1, Math.round(target.price * (1 - val / 100)));
        } else {
          discountedPrice = Math.max(1, target.price - val);
        }
      }

      target.discount = {
        active,
        type,
        value: val,
        discountedPrice,
        label: discountObj.label || 'Promotional Offer',
        startDate: discountObj.startDate || new Date().toISOString().split('T')[0],
        endDate: discountObj.endDate || '',
      };
      target.updatedAt = new Date().toISOString();

      logMenuAudit(db, {
        dishId: target.id,
        dishName: target.title,
        action: 'OFFER_CONFIGURED',
        details: active ? `Configured ${val}${type === 'PERCENT' ? '%' : '₹'} discount (New Price: ₹${discountedPrice}) - ${target.discount.label}` : 'Disabled promotional discount',
        changedBy: authorizedBy,
        role,
      });

      saveDb(db);
      broadcast({ type: 'MENU_UPDATED', action: 'SET_OFFER', dishId: target.id, discount: target.discount });

      return NextResponse.json({ success: true, discount: target.discount });
    }

    // ─── 6. DELETE OR ARCHIVE DELICACIES ────────────────────────────────────
    if (action === 'DELETE_ITEM') {
      if (role !== 'DEVELOPER_ADMIN' && role !== 'SUPER_ADMIN' && managerPin !== '1234') {
        return NextResponse.json({ success: false, error: 'Unauthorized: Manager PIN (1234) required to permanently delete menu items' }, { status: 403 });
      }

      const index = db.menu.findIndex(d => d.id === dishId);
      if (index === -1) return NextResponse.json({ success: false, error: 'Dish not found' }, { status: 404 });

      const removed = db.menu[index];
      db.menu.splice(index, 1);

      logMenuAudit(db, {
        dishId: removed.id,
        dishName: removed.title,
        action: 'ITEM_DELETED',
        details: `Permanently deleted delicacy ${removed.title} (₹${removed.price})`,
        changedBy: authorizedBy,
        role,
      });

      saveDb(db);
      broadcast({ type: 'MENU_UPDATED', action: 'DELETE_ITEM', dishId });
      return NextResponse.json({ success: true, message: `Permanently deleted ${removed.title}` });
    }

    if (action === 'ARCHIVE_ITEM') {
      const target = db.menu.find(d => d.id === dishId);
      if (!target) return NextResponse.json({ success: false, error: 'Dish not found' }, { status: 404 });

      target.status = 'ARCHIVED';
      target.available = false;
      target.updatedAt = new Date().toISOString();

      logMenuAudit(db, {
        dishId: target.id,
        dishName: target.title,
        action: 'ITEM_ARCHIVED',
        details: `Archived delicacy (Preserving all historical KOTs & billing records)`,
        changedBy: authorizedBy,
        role,
      });

      saveDb(db);
      broadcast({ type: 'MENU_UPDATED', action: 'ARCHIVE_ITEM', dishId });
      return NextResponse.json({ success: true, message: `Archived ${target.title}` });
    }

    if (action === 'UNARCHIVE_ITEM') {
      const target = db.menu.find(d => d.id === dishId);
      if (!target) return NextResponse.json({ success: false, error: 'Dish not found' }, { status: 404 });

      target.status = 'AVAILABLE';
      target.available = true;
      target.updatedAt = new Date().toISOString();

      logMenuAudit(db, {
        dishId: target.id,
        dishName: target.title,
        action: 'ITEM_UNARCHIVED',
        details: `Restored archived delicacy back to active menu`,
        changedBy: authorizedBy,
        role,
      });

      saveDb(db);
      broadcast({ type: 'MENU_UPDATED', action: 'UNARCHIVE_ITEM', dishId });
      return NextResponse.json({ success: true, message: `Restored ${target.title}` });
    }

    // ─── 7. CATEGORY MANAGEMENT ─────────────────────────────────────────────
    if (action === 'MANAGE_CATEGORY') {
      if (!subAction) return NextResponse.json({ success: false, error: 'subAction required' }, { status: 400 });

      if (subAction === 'ADD_CATEGORY') {
        const { name, tamilName, icon, description, station } = categoryData || {};
        if (!name) return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 });

        const newCat = {
          id: `cat_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`,
          name: name.trim(),
          tamilName: (tamilName || '').trim(),
          icon: icon || '🍽️',
          description: (description || '').trim(),
          station: station || 'TIFFIN',
          displayOrder: db.categories.length + 1,
          isActive: true,
        };

        db.categories.push(newCat);

        logMenuAudit(db, {
          dishId: newCat.id,
          dishName: `Category: ${newCat.name}`,
          action: 'CATEGORY_CREATED',
          details: `Created new category "${newCat.name}" with default station ${newCat.station}`,
          changedBy: authorizedBy,
          role,
        });

        saveDb(db);
        broadcast({ type: 'MENU_UPDATED', action: 'CATEGORY_CREATED', category: newCat });
        return NextResponse.json({ success: true, category: newCat });
      }

      if (subAction === 'UPDATE_CATEGORY') {
        const { id, name, tamilName, icon, description, station, isActive, displayOrder } = categoryData || {};
        const catIndex = db.categories.findIndex(c => c.id === id);
        if (catIndex === -1) return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });

        db.categories[catIndex] = {
          ...db.categories[catIndex],
          name: name || db.categories[catIndex].name,
          tamilName: tamilName !== undefined ? tamilName : db.categories[catIndex].tamilName,
          icon: icon || db.categories[catIndex].icon,
          description: description !== undefined ? description : db.categories[catIndex].description,
          station: station || db.categories[catIndex].station,
          isActive: isActive !== undefined ? isActive : db.categories[catIndex].isActive,
          displayOrder: displayOrder !== undefined ? displayOrder : db.categories[catIndex].displayOrder,
        };

        logMenuAudit(db, {
          dishId: id,
          dishName: `Category: ${db.categories[catIndex].name}`,
          action: 'CATEGORY_UPDATED',
          details: `Updated category details`,
          changedBy: authorizedBy,
          role,
        });

        saveDb(db);
        broadcast({ type: 'MENU_UPDATED', action: 'CATEGORY_UPDATED', category: db.categories[catIndex] });
        return NextResponse.json({ success: true, category: db.categories[catIndex] });
      }

      if (subAction === 'REORDER_CATEGORIES') {
        const { orderedIds } = payload || {};
        if (Array.isArray(orderedIds)) {
          orderedIds.forEach((catId, idx) => {
            const cat = db.categories.find(c => c.id === catId);
            if (cat) cat.displayOrder = idx + 1;
          });
          db.categories.sort((a, b) => a.displayOrder - b.displayOrder);

          logMenuAudit(db, {
            dishId: 'CATEGORIES',
            dishName: 'Menu Categories',
            action: 'CATEGORIES_REORDERED',
            details: `Updated category display sequence`,
            changedBy: authorizedBy,
            role,
          });

          saveDb(db);
          broadcast({ type: 'MENU_UPDATED', action: 'CATEGORIES_REORDERED' });
          return NextResponse.json({ success: true, categories: db.categories });
        }
      }

      if (subAction === 'DELETE_CATEGORY') {
        const { id } = payload || {};
        if (role !== 'DEVELOPER_ADMIN' && role !== 'SUPER_ADMIN' && managerPin !== '1234') {
          return NextResponse.json({ success: false, error: 'Manager PIN (1234) required to delete category' }, { status: 403 });
        }

        const idx = db.categories.findIndex(c => c.id === id);
        if (idx === -1) return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });

        const removedCat = db.categories[idx];
        db.categories.splice(idx, 1);

        logMenuAudit(db, {
          dishId: removedCat.id,
          dishName: `Category: ${removedCat.name}`,
          action: 'CATEGORY_DELETED',
          details: `Deleted category ${removedCat.name}`,
          changedBy: authorizedBy,
          role,
        });

        saveDb(db);
        broadcast({ type: 'MENU_UPDATED', action: 'CATEGORY_DELETED', categoryId: id });
        return NextResponse.json({ success: true, message: `Deleted ${removedCat.name}` });
      }
    }

    // ─── 8. BULK OPERATIONS (PRICE CHANGE, AVAILABILITY, CATEGORY) ──────────
    if (action === 'BULK_UPDATE') {
      if (!Array.isArray(dishIds) || dishIds.length === 0) {
        return NextResponse.json({ success: false, error: 'dishIds array is required' }, { status: 400 });
      }

      let affectedCount = 0;

      if (subAction === 'SET_AVAILABLE') {
        db.menu.forEach(d => {
          if (dishIds.includes(d.id)) {
            d.status = 'AVAILABLE';
            d.available = true;
            d.updatedAt = new Date().toISOString();
            affectedCount++;
          }
        });
        logMenuAudit(db, {
          dishId: 'BULK',
          dishName: `${affectedCount} Delicacies`,
          action: 'BULK_AVAILABILITY',
          details: `Bulk marked ${affectedCount} items as AVAILABLE in kitchen`,
          changedBy: authorizedBy,
          role,
        });
      } else if (subAction === 'SET_SOLDOUT') {
        db.menu.forEach(d => {
          if (dishIds.includes(d.id)) {
            d.status = 'SOLD_OUT';
            d.available = false;
            d.updatedAt = new Date().toISOString();
            affectedCount++;
          }
        });
        logMenuAudit(db, {
          dishId: 'BULK',
          dishName: `${affectedCount} Delicacies`,
          action: 'BULK_AVAILABILITY',
          details: `Bulk marked ${affectedCount} items as SOLD OUT (86'd)`,
          changedBy: authorizedBy,
          role,
        });
      } else if (subAction === 'CHANGE_CATEGORY') {
        const { newCategory } = payload || {};
        if (!newCategory) return NextResponse.json({ success: false, error: 'newCategory required' }, { status: 400 });
        db.menu.forEach(d => {
          if (dishIds.includes(d.id)) {
            d.category = newCategory;
            d.updatedAt = new Date().toISOString();
            affectedCount++;
          }
        });
        logMenuAudit(db, {
          dishId: 'BULK',
          dishName: `${affectedCount} Delicacies`,
          action: 'BULK_CATEGORY',
          details: `Reassigned ${affectedCount} items to category: ${newCategory}`,
          changedBy: authorizedBy,
          role,
        });
      } else if (subAction === 'ADJUST_PRICE') {
        if (role !== 'DEVELOPER_ADMIN' && role !== 'SUPER_ADMIN' && managerPin !== '1234') {
          return NextResponse.json({ success: false, error: 'Manager PIN required for bulk price changes' }, { status: 403 });
        }
        const { deltaType, deltaValue } = payload || {}; // deltaType: 'FLAT' | 'PERCENT'
        const val = Number(deltaValue);
        if (isNaN(val)) return NextResponse.json({ success: false, error: 'Valid deltaValue required' }, { status: 400 });

        db.menu.forEach(d => {
          if (dishIds.includes(d.id)) {
            if (deltaType === 'PERCENT') {
              d.price = Math.max(5, Math.round(d.price * (1 + val / 100)));
            } else {
              d.price = Math.max(5, d.price + val);
            }
            d.updatedAt = new Date().toISOString();
            affectedCount++;
          }
        });

        logMenuAudit(db, {
          dishId: 'BULK',
          dishName: `${affectedCount} Delicacies`,
          action: 'BULK_PRICE_CHANGE',
          details: `Adjusted price by ${val > 0 ? '+' : ''}${val}${deltaType === 'PERCENT' ? '%' : '₹'} across ${affectedCount} items`,
          changedBy: authorizedBy,
          role,
        });
      } else if (subAction === 'DELETE_SELECTED') {
        if (role !== 'DEVELOPER_ADMIN' && role !== 'SUPER_ADMIN' && managerPin !== '1234') {
          return NextResponse.json({ success: false, error: 'Manager PIN required for bulk deletion' }, { status: 403 });
        }
        const initialLen = db.menu.length;
        db.menu = db.menu.filter(d => !dishIds.includes(d.id));
        affectedCount = initialLen - db.menu.length;

        logMenuAudit(db, {
          dishId: 'BULK',
          dishName: `${affectedCount} Delicacies`,
          action: 'BULK_DELETE',
          details: `Permanently deleted ${affectedCount} delicacies`,
          changedBy: authorizedBy,
          role,
        });
      }

      saveDb(db);
      broadcast({ type: 'MENU_UPDATED', action: 'BULK_UPDATE', subAction, affectedCount });
      return NextResponse.json({ success: true, affectedCount, message: `Successfully updated ${affectedCount} items` });
    }

    // ─── 9. IMPORT MENU (CSV / JSON) ────────────────────────────────────────
    if (action === 'IMPORT_MENU') {
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ success: false, error: 'items array is required' }, { status: 400 });
      }

      let importedCount = 0;
      items.forEach(raw => {
        if (!raw.title || !raw.price) return;
        const numPrice = Number(raw.price);
        if (isNaN(numPrice) || numPrice <= 0) return;

        const imported = {
          id: raw.id || `dish_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          title: String(raw.title).trim(),
          tamilTitle: String(raw.tamilTitle || '').trim(),
          category: String(raw.category || 'Tiffin').trim(),
          price: numPrice,
          portionSize: String(raw.portionSize || 'Standard (1 Person)'),
          prepTime: Number(raw.prepTime) || 10,
          image: raw.image || '',
          description: String(raw.description || '').trim(),
          station: raw.station || categorizeStation(raw.title),
          available: raw.available !== false && raw.status !== 'SOLD_OUT',
          status: raw.status || 'AVAILABLE',
          isFeatured: Boolean(raw.isFeatured),
          isBestseller: Boolean(raw.isBestseller),
          isChefSpecial: Boolean(raw.isChefSpecial),
          dietary: raw.dietary || { isVeg: true, isJain: false, isVegan: false, isGlutenFree: false, spiceLevel: 2 },
          allergens: Array.isArray(raw.allergens) ? raw.allergens : [],
          ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
          variants: Array.isArray(raw.variants) ? raw.variants : [{ name: 'Standard', priceDiff: 0 }],
          addOns: Array.isArray(raw.addOns) ? raw.addOns : [],
          recipeId: raw.recipeId || null,
          discount: raw.discount || { active: false, type: 'PERCENT', value: 0, discountedPrice: numPrice },
          displayOrder: db.menu.length + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const existingIdx = db.menu.findIndex(d => d.id === imported.id || d.title.toLowerCase() === imported.title.toLowerCase());
        if (existingIdx !== -1) {
          db.menu[existingIdx] = { ...db.menu[existingIdx], ...imported };
        } else {
          db.menu.push(imported);
        }
        importedCount++;
      });

      logMenuAudit(db, {
        dishId: 'IMPORT',
        dishName: `Batch Import`,
        action: 'MENU_IMPORTED',
        details: `Imported / updated ${importedCount} delicacies from CSV/JSON catalog`,
        changedBy: authorizedBy,
        role,
      });

      saveDb(db);
      broadcast({ type: 'MENU_UPDATED', action: 'IMPORT_MENU', count: importedCount });
      return NextResponse.json({ success: true, count: importedCount, message: `Imported ${importedCount} items successfully` });
    }

    // ─── 10. LINK RECIPE BOM ────────────────────────────────────────────────
    if (action === 'LINK_RECIPE') {
      const { dishId: targetDishId, recipeId } = payload || {};
      const target = db.menu.find(d => d.id === (targetDishId || dishId));
      if (!target) return NextResponse.json({ success: false, error: 'Dish not found' }, { status: 404 });

      target.recipeId = recipeId || null;
      target.updatedAt = new Date().toISOString();

      logMenuAudit(db, {
        dishId: target.id,
        dishName: target.title,
        action: 'RECIPE_LINKED',
        details: recipeId ? `Linked recipe BOM #${recipeId}` : 'Unlinked recipe BOM',
        changedBy: authorizedBy,
        role,
      });

      saveDb(db);
      broadcast({ type: 'MENU_UPDATED', action: 'LINK_RECIPE', dishId: target.id, recipeId });
      return NextResponse.json({ success: true, dish: target });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Menu POST Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
