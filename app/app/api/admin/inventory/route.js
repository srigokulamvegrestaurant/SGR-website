import { NextResponse } from 'next/server';
import { getDb, getDbAsync, saveDb, saveDbAsync } from '@/lib/db';
import { broadcast } from '@/app/api/events/route';

// Clean initial inventory seeds
export const SEED_SUPPLIERS = [];
export const SEED_INVENTORY_ENRICHED = [];
export const SEED_PURCHASE_ORDERS = [];
export const SEED_STOCK_MOVEMENTS = [];

// Helper to compute recipe food cost & profit margin
function enrichRecipe(recipe, inventoryList, menuList) {
  let totalCost = 0;
  const ingredientDetails = (recipe.ingredients || []).map(ing => {
    const inv = inventoryList.find(i => i.id === ing.invId);
    const unitCost = inv ? (inv.costPerUnit || 0) : 0;
    const lineCost = Math.round((Number(ing.qty || 0) * unitCost) * 100) / 100;
    totalCost += lineCost;
    return {
      invId: ing.invId,
      name: inv ? inv.name : ing.invId,
      qty: ing.qty,
      unit: ing.unit,
      costPerUnit: unitCost,
      lineCost,
    };
  });

  const matchingDish = menuList.find(d => d.title.toLowerCase().includes(recipe.menuItemName.toLowerCase()) || recipe.menuItemName.toLowerCase().includes(d.title.toLowerCase()));
  const menuPrice = matchingDish ? matchingDish.price : (recipe.sellingPrice || 100);
  const costPerDish = Math.round(totalCost * 100) / 100;
  const grossProfit = Math.max(0, Math.round((menuPrice - costPerDish) * 100) / 100);
  const profitMarginPercent = menuPrice > 0 ? Math.round((grossProfit / menuPrice) * 100) : 0;
  const foodCostPercent = menuPrice > 0 ? Math.round((costPerDish / menuPrice) * 100) : 0;

  return {
    ...recipe,
    menuPrice,
    costPerDish,
    grossProfit,
    profitMarginPercent,
    foodCostPercent,
    ingredientDetails,
  };
}

export async function GET(request) {
  try {
    const db = await getDbAsync();

    // Ensure inventory collections exist as arrays
    if (!Array.isArray(db.suppliers)) db.suppliers = [];
    if (!Array.isArray(db.inventory)) db.inventory = [];
    if (!Array.isArray(db.purchase_orders)) db.purchase_orders = [];
    if (!Array.isArray(db.stock_movements)) db.stock_movements = [];
    if (!Array.isArray(db.recipes)) db.recipes = [];

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const category = searchParams.get('category') || 'ALL';
    const supplier = searchParams.get('supplier') || 'ALL';
    const stockStatus = searchParams.get('stockStatus') || 'ALL';

    const rawInventory = db.inventory || [];
    const suppliers = db.suppliers || [];
    const purchaseOrders = db.purchase_orders || [];
    const stockMovements = db.stock_movements || [];
    const wastageLogs = db.wastage_logs || [];
    const menuList = db.menu || [];
    const rawRecipes = db.recipes || [];

    const now = Date.now();

    // Enrich inventory with real-time status and days to expiry
    const enrichedInventory = rawInventory.map(item => {
      let daysToExpiry = null;
      let isExpired = false;
      let isExpiringSoon = false;

      if (item.expiryDate) {
        const expTime = new Date(item.expiryDate).getTime();
        daysToExpiry = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
        if (daysToExpiry < 0) isExpired = true;
        else if (daysToExpiry <= 7) isExpiringSoon = true;
      }

      let computedStatus = 'IN_STOCK';
      if (item.currentStock <= 0) computedStatus = 'OUT_OF_STOCK';
      else if (item.currentStock <= item.lowStockThreshold) computedStatus = 'LOW_STOCK';

      const itemValuation = Math.round(Number(item.currentStock || 0) * Number(item.costPerUnit || 0));

      return {
        ...item,
        daysToExpiry,
        isExpired,
        isExpiringSoon,
        computedStatus,
        itemValuation,
      };
    });

    // Apply Filters
    let filteredInventory = enrichedInventory;

    if (search) {
      filteredInventory = filteredInventory.filter(it =>
        it.name.toLowerCase().includes(search) ||
        (it.tamilName && it.tamilName.toLowerCase().includes(search)) ||
        (it.supplierName && it.supplierName.toLowerCase().includes(search)) ||
        (it.category && it.category.toLowerCase().includes(search)) ||
        (it.storageLocation && it.storageLocation.toLowerCase().includes(search))
      );
    }

    if (category !== 'ALL') {
      filteredInventory = filteredInventory.filter(it => it.category === category);
    }

    if (supplier !== 'ALL') {
      filteredInventory = filteredInventory.filter(it => it.supplierId === supplier || it.supplierName === supplier);
    }

    if (stockStatus === 'LOW_STOCK') {
      filteredInventory = filteredInventory.filter(it => it.computedStatus === 'LOW_STOCK');
    } else if (stockStatus === 'OUT_OF_STOCK') {
      filteredInventory = filteredInventory.filter(it => it.computedStatus === 'OUT_OF_STOCK');
    } else if (stockStatus === 'IN_STOCK') {
      filteredInventory = filteredInventory.filter(it => it.computedStatus === 'IN_STOCK');
    } else if (stockStatus === 'EXPIRING_SOON') {
      filteredInventory = filteredInventory.filter(it => it.isExpiringSoon && !it.isExpired);
    } else if (stockStatus === 'EXPIRED') {
      filteredInventory = filteredInventory.filter(it => it.isExpired);
    }

    // Enrich Recipes with live BOM Food Costing
    const enrichedRecipes = rawRecipes.map(rec => enrichRecipe(rec, enrichedInventory, menuList));

    // Summary Analytics
    const totalIngredients = enrichedInventory.length;
    const lowStockAlerts = enrichedInventory.filter(i => i.computedStatus === 'LOW_STOCK');
    const outOfStockAlerts = enrichedInventory.filter(i => i.computedStatus === 'OUT_OF_STOCK');
    const availableStockCount = enrichedInventory.filter(i => i.computedStatus === 'IN_STOCK').length;
    const expiringSoonList = enrichedInventory.filter(i => i.isExpiringSoon && !i.isExpired);
    const expiredList = enrichedInventory.filter(i => i.isExpired);
    const totalValuation = enrichedInventory.reduce((acc, it) => acc + (it.itemValuation || 0), 0);

    const monthlyPurchasesTotal = purchaseOrders.reduce((acc, po) => acc + (po.status === 'RECEIVED' ? Number(po.totalAmount || 0) : 0), 0);
    const monthlyWastageTotal = wastageLogs.reduce((acc, wst) => acc + Number(wst.estimatedLoss || 0), 0);

    const avgFoodCostPercent = enrichedRecipes.length > 0
      ? Math.round(enrichedRecipes.reduce((acc, r) => acc + (r.foodCostPercent || 0), 0) / enrichedRecipes.length)
      : 0;

    return NextResponse.json({
      success: true,
      inventory: filteredInventory,
      allInventory: enrichedInventory,
      suppliers,
      purchaseOrders: purchaseOrders.slice().reverse(),
      stockMovements: stockMovements.slice().reverse(),
      wastageLogs: wastageLogs.slice().reverse(),
      recipes: enrichedRecipes,
      summary: {
        totalIngredients,
        availableStockCount,
        lowStockCount: lowStockAlerts.length,
        outOfStockCount: outOfStockAlerts.length,
        expiringSoonCount: expiringSoonList.length,
        expiredCount: expiredList.length,
        totalValuation,
        monthlyPurchasesTotal,
        monthlyWastageTotal,
        avgFoodCostPercent,
        lowStockAlerts: lowStockAlerts.concat(outOfStockAlerts),
        expiringAlerts: expiringSoonList.concat(expiredList),
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Inventory GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;
    const db = await getDbAsync();
    db.inventory = db.inventory || [];
    db.suppliers = db.suppliers || [];
    db.purchase_orders = db.purchase_orders || [];
    db.stock_movements = db.stock_movements || [];
    db.wastage_logs = db.wastage_logs || [];
    db.recipes = db.recipes || [];

    // ─── ACTION 1: ADD INGREDIENT ──────────────────────────────────────────
    if (action === 'ADD_INGREDIENT') {
      const { name, tamilName, category, currentStock, lowStockThreshold, costPerUnit, unit, supplierId, expiryDate, storageLocation } = body;
      if (!name || !unit) {
        return NextResponse.json({ success: false, error: 'Name and Unit are required' }, { status: 400 });
      }

      const supplierObj = db.suppliers.find(s => s.id === supplierId);
      const newId = `inv_${Date.now()}`;
      const newIngredient = {
        id: newId,
        name: name.trim(),
        tamilName: tamilName ? tamilName.trim() : '',
        category: category || 'BASE',
        unit: (unit || 'KG').toUpperCase(),
        currentStock: Number(currentStock) || 0,
        lowStockThreshold: Number(lowStockThreshold) || 1,
        costPerUnit: Number(costPerUnit) || 0,
        supplierId: supplierId || '',
        supplierName: supplierObj ? supplierObj.name : 'Direct Market Purchase',
        expiryDate: expiryDate || '',
        storageLocation: storageLocation || 'Dry Provisions Store',
        lastPurchasedDate: new Date().toISOString().split('T')[0],
        reorderQty: Math.max(5, (Number(lowStockThreshold) || 1) * 2),
      };

      db.inventory.push(newIngredient);

      // Log movement
      db.stock_movements.push({
        id: `mov_${Date.now()}`,
        date: new Date().toISOString(),
        type: 'MANUAL_CORRECTION',
        itemId: newId,
        itemName: newIngredient.name,
        qtyChange: newIngredient.currentStock,
        unit: newIngredient.unit,
        reason: 'Initial stock entry upon adding ingredient',
        staff: body.staffName || 'Store Manager',
        balanceAfter: newIngredient.currentStock,
      });

      await saveDbAsync(db);
      broadcast({ type: 'INVENTORY_UPDATED', itemId: newId, action: 'ADD_INGREDIENT' });

      return NextResponse.json({
        success: true,
        message: `Added new ingredient: ${newIngredient.name}`,
        ingredient: newIngredient,
        item: newIngredient,
      });
    }

    // ─── ACTION 2: UPDATE INGREDIENT ───────────────────────────────────────
    if (action === 'UPDATE_INGREDIENT') {
      const { itemId, name, tamilName, category, currentStock, lowStockThreshold, costPerUnit, unit, supplierId, expiryDate, storageLocation } = body;
      const item = db.inventory.find(i => i.id === itemId);
      if (!item) {
        return NextResponse.json({ success: false, error: 'Ingredient not found' }, { status: 404 });
      }

      if (name) item.name = name.trim();
      if (tamilName !== undefined) item.tamilName = tamilName.trim();
      if (category) item.category = category;
      if (unit) item.unit = unit.toUpperCase();
      if (lowStockThreshold !== undefined) item.lowStockThreshold = Number(lowStockThreshold);
      if (costPerUnit !== undefined) item.costPerUnit = Number(costPerUnit);
      if (expiryDate !== undefined) item.expiryDate = expiryDate;
      if (storageLocation !== undefined) item.storageLocation = storageLocation;

      if (supplierId) {
        item.supplierId = supplierId;
        const supp = db.suppliers.find(s => s.id === supplierId);
        if (supp) item.supplierName = supp.name;
      }

      // Check if stock changed manually
      if (currentStock !== undefined && Number(currentStock) !== item.currentStock) {
        const delta = Number(currentStock) - item.currentStock;
        item.currentStock = Number(currentStock);
        db.stock_movements.push({
          id: `mov_${Date.now()}`,
          date: new Date().toISOString(),
          type: 'MANUAL_CORRECTION',
          itemId: item.id,
          itemName: item.name,
          qtyChange: Math.round(delta * 1000) / 1000,
          unit: item.unit,
          reason: body.notes || 'Manual stock level adjustment by manager',
          staff: body.staffName || 'Store Manager',
          balanceAfter: item.currentStock,
        });
      }

      await saveDbAsync(db);
      broadcast({ type: 'INVENTORY_UPDATED', itemId: item.id, action: 'UPDATE_INGREDIENT' });

      return NextResponse.json({
        success: true,
        message: `Updated ingredient: ${item.name}`,
        ingredient: item,
      });
    }

    // ─── ACTION 3: DELETE INGREDIENT ───────────────────────────────────────
    if (action === 'DELETE_INGREDIENT') {
      const targetId = body.itemId || body.id;
      const idx = db.inventory.findIndex(i => i.id === targetId);
      if (idx === -1) {
        return NextResponse.json({ success: false, error: 'Ingredient not found' }, { status: 404 });
      }

      const deletedName = db.inventory[idx].name;
      db.inventory.splice(idx, 1);
      await saveDbAsync(db);

      broadcast({ type: 'INVENTORY_UPDATED', itemId, action: 'DELETE_INGREDIENT' });

      return NextResponse.json({
        success: true,
        message: `Deleted ingredient: ${deletedName}`,
      });
    }

    // ─── ACTION 4: STOCK ADJUSTMENT (WASTAGE, SPOILAGE, RETURNS, CORRECTION) ──
    if (action === 'STOCK_ADJUSTMENT' || action === 'LOG_WASTAGE') {
      const { itemId, adjustmentType = 'SPOILED', quantity, reason, notes, staffName = 'Store Manager' } = body;
      const item = db.inventory.find(i => i.id === itemId);
      if (!item) {
        return NextResponse.json({ success: false, error: 'Ingredient not found' }, { status: 404 });
      }

      const qtyNum = Number(quantity);
      if (isNaN(qtyNum) || qtyNum === 0) {
        return NextResponse.json({ success: false, error: 'Invalid quantity' }, { status: 400 });
      }

      // If it's a negative adjustment (spoilage, damage, expired, return)
      const isDeduction = ['SPOILED', 'DAMAGED', 'EXPIRED', 'PREP_ERROR', 'RETURNED'].includes(adjustmentType) || qtyNum < 0;
      const absQty = Math.abs(qtyNum);

      if (isDeduction) {
        item.currentStock = Math.max(0, Math.round((item.currentStock - absQty) * 1000) / 1000);
      } else {
        item.currentStock = Math.round((item.currentStock + absQty) * 1000) / 1000;
      }

      const estimatedLoss = isDeduction ? Math.round(absQty * (item.costPerUnit || 0)) : 0;

      // Log to wastage logs if it represents a loss
      if (isDeduction) {
        db.wastage_logs.push({
          id: `wst_${Date.now()}`,
          itemId: item.id,
          itemName: item.name,
          quantity: absQty,
          unit: item.unit,
          estimatedLoss,
          reason: reason || adjustmentType,
          reportedBy: staffName,
          notes: notes || '',
          createdAt: new Date().toISOString(),
        });
      }

      // Log movement to audit ledger
      db.stock_movements.push({
        id: `mov_${Date.now()}`,
        date: new Date().toISOString(),
        type: adjustmentType === 'SPOILED' || adjustmentType === 'DAMAGED' || adjustmentType === 'EXPIRED' ? 'WASTAGE_DAMAGED' : 'MANUAL_CORRECTION',
        itemId: item.id,
        itemName: item.name,
        qtyChange: isDeduction ? -absQty : absQty,
        unit: item.unit,
        reason: `${adjustmentType}: ${reason || notes || 'Stock adjustment recorded'}`,
        staff: staffName,
        balanceAfter: item.currentStock,
      });

      await saveDbAsync(db);
      broadcast({ type: 'INVENTORY_UPDATED', itemId: item.id, action: 'STOCK_ADJUSTMENT' });

      return NextResponse.json({
        success: true,
        message: `Recorded ${adjustmentType} adjustment for ${item.name} (${isDeduction ? '-' : '+'}${absQty} ${item.unit})`,
        item,
      });
    }

    // ─── ACTION 5: CREATE PURCHASE ORDER ───────────────────────────────────
    if (action === 'CREATE_PURCHASE_ORDER') {
      const { supplierId, items = [], invoiceNumber, paymentTerms, notes, staffName = 'Store Manager' } = body;
      const supplier = db.suppliers.find(s => s.id === supplierId);
      if (!supplier) {
        return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
      }

      if (!items || items.length === 0) {
        return NextResponse.json({ success: false, error: 'Purchase Order must have at least 1 item' }, { status: 400 });
      }

      let totalAmount = 0;
      const poItems = items.map(it => {
        const inv = db.inventory.find(i => i.id === it.invId);
        const unitPrice = Number(it.unitPrice || (inv ? inv.costPerUnit : 0));
        const qty = Number(it.qty || 1);
        const lineTotal = Math.round(unitPrice * qty);
        totalAmount += lineTotal;
        return {
          invId: it.invId,
          name: inv ? inv.name : 'Custom Item',
          qty,
          unit: it.unit || (inv ? inv.unit : 'KG'),
          unitPrice,
          lineTotal,
        };
      });

      const poCount = (db.purchase_orders || []).length + 101;
      const newPO = {
        id: `po_${Date.now()}`,
        poNumber: `PO-2026-${poCount}`,
        supplierId: supplier.id,
        supplierName: supplier.name,
        invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
        status: 'PENDING',
        orderDate: new Date().toISOString(),
        receivedDate: null,
        paymentStatus: 'PENDING',
        totalAmount,
        items: poItems,
        notes: notes || '',
        createdBy: staffName,
      };

      db.purchase_orders.push(newPO);
      await saveDbAsync(db);
      broadcast({ type: 'PURCHASE_ORDER_CREATED', poId: newPO.id });

      return NextResponse.json({
        success: true,
        message: `Created Purchase Order ${newPO.poNumber} for ₹${totalAmount}`,
        purchaseOrder: newPO,
      });
    }

    // ─── ACTION 6: RECEIVE PURCHASE ORDER (AUTO STOCK UPDATE) ─────────────
    if (action === 'RECEIVE_PURCHASE_ORDER') {
      const { poId, staffName = 'Store Manager' } = body;
      const po = db.purchase_orders.find(p => p.id === poId);
      if (!po) {
        return NextResponse.json({ success: false, error: 'Purchase Order not found' }, { status: 404 });
      }

      if (po.status === 'RECEIVED') {
        return NextResponse.json({ success: false, error: 'Purchase Order already received' }, { status: 400 });
      }

      po.status = 'RECEIVED';
      po.receivedDate = new Date().toISOString();
      po.receivedBy = staffName;

      // Auto update ingredients in inventory!
      (po.items || []).forEach(it => {
        const inv = db.inventory.find(i => i.id === it.invId);
        if (inv) {
          const addedQty = Number(it.qty || 0);
          inv.currentStock = Math.round((inv.currentStock + addedQty) * 1000) / 1000;
          if (it.unitPrice && Number(it.unitPrice) > 0) {
            inv.costPerUnit = Number(it.unitPrice);
          }
          inv.lastPurchasedDate = new Date().toISOString().split('T')[0];

          // Record movement
          db.stock_movements.push({
            id: `mov_${Date.now()}_${inv.id}`,
            date: new Date().toISOString(),
            type: 'PURCHASE_RECEIPT',
            itemId: inv.id,
            itemName: inv.name,
            qtyChange: addedQty,
            unit: inv.unit,
            reason: `Received stock from PO #${po.poNumber} (${po.supplierName})`,
            staff: staffName,
            balanceAfter: inv.currentStock,
          });
        }
      });

      // Update supplier balance if not already paid
      if (po.paymentStatus !== 'PAID') {
        const supp = db.suppliers.find(s => s.id === po.supplierId);
        if (supp) {
          supp.balanceDue = (supp.balanceDue || 0) + Number(po.totalAmount || 0);
          supp.paymentStatus = 'PENDING_INVOICE';
        }
      }

      await saveDbAsync(db);
      broadcast({ type: 'PURCHASE_ORDER_RECEIVED', poId: po.id });

      return NextResponse.json({
        success: true,
        message: `Successfully received PO #${po.poNumber}. Stock automatically updated for ${po.items.length} items.`,
        purchaseOrder: po,
      });
    }

    // ─── ACTION 7: ADD / UPDATE SUPPLIER ──────────────────────────────────
    if (action === 'ADD_SUPPLIER') {
      const { name, contactPerson, phone, email, address, categories = ['DAIRY'], paymentTerms, paymentStatus, balanceDue } = body;
      if (!name || !phone) {
        return NextResponse.json({ success: false, error: 'Supplier Name and Phone are required' }, { status: 400 });
      }

      const newSupplier = {
        id: `sup_${Date.now()}`,
        name: name.trim(),
        contactPerson: contactPerson || '',
        phone: phone.trim(),
        email: email || '',
        address: address || 'Karaikudi, Tamil Nadu',
        categories: Array.isArray(categories) ? categories : [categories || 'BASE'],
        paymentTerms: paymentTerms || 'Net 30 Days',
        paymentStatus: paymentStatus || 'PAID',
        balanceDue: Number(balanceDue) || 0,
        rating: 4.8,
        suppliedItemIds: [],
        createdAt: new Date().toISOString(),
      };

      db.suppliers.push(newSupplier);
      await saveDbAsync(db);

      return NextResponse.json({
        success: true,
        message: `Added supplier: ${newSupplier.name}`,
        supplier: newSupplier,
      });
    }

    if (action === 'UPDATE_SUPPLIER') {
      const { supplierId, name, contactPerson, phone, email, address, paymentStatus, balanceDue } = body;
      const supp = db.suppliers.find(s => s.id === supplierId);
      if (!supp) {
        return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
      }

      if (name) supp.name = name.trim();
      if (contactPerson !== undefined) supp.contactPerson = contactPerson.trim();
      if (phone) supp.phone = phone.trim();
      if (email !== undefined) supp.email = email.trim();
      if (address !== undefined) supp.address = address.trim();
      if (paymentStatus) supp.paymentStatus = paymentStatus;
      if (balanceDue !== undefined) supp.balanceDue = Number(balanceDue);

      await saveDbAsync(db);

      return NextResponse.json({
        success: true,
        message: `Updated supplier: ${supp.name}`,
        supplier: supp,
      });
    }

    // ─── ACTION 8: SAVE / UPDATE RECIPE BOM ────────────────────────────────
    if (action === 'SAVE_RECIPE') {
      const { recipeId, menuItemName, ingredients = [], sellingPrice } = body;
      if (!menuItemName || ingredients.length === 0) {
        return NextResponse.json({ success: false, error: 'Menu item name and ingredients list are required' }, { status: 400 });
      }

      let existing = db.recipes.find(r => r.id === recipeId || r.menuItemName.toLowerCase() === menuItemName.toLowerCase());
      if (existing) {
        existing.ingredients = ingredients;
        if (sellingPrice) existing.sellingPrice = Number(sellingPrice);
      } else {
        existing = {
          id: `rec_${Date.now()}`,
          menuItemName: menuItemName.trim(),
          ingredients,
          sellingPrice: Number(sellingPrice) || 100,
        };
        db.recipes.push(existing);
      }

      await saveDbAsync(db);
      broadcast({ type: 'RECIPES_UPDATED' });

      return NextResponse.json({
        success: true,
        message: `Saved recipe BOM for ${existing.menuItemName}`,
        recipe: existing,
      });
    }

    // Legacy RESTOCK support
    if (action === 'RESTOCK') {
      const { itemId, quantity, purchasePrice } = body;
      const item = db.inventory.find(i => i.id === itemId);
      if (!item) return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
      const addedQty = Number(quantity);
      if (isNaN(addedQty) || addedQty <= 0) return NextResponse.json({ success: false, error: 'Invalid quantity' }, { status: 400 });

      item.currentStock = Math.round((item.currentStock + addedQty) * 1000) / 1000;
      if (purchasePrice && Number(purchasePrice) > 0) item.costPerUnit = Number(purchasePrice);

      db.stock_movements.push({
        id: `mov_${Date.now()}`,
        date: new Date().toISOString(),
        type: 'PURCHASE_RECEIPT',
        itemId: item.id,
        itemName: item.name,
        qtyChange: addedQty,
        unit: item.unit,
        reason: 'Direct quick restock',
        staff: body.staffName || 'Store Manager',
        balanceAfter: item.currentStock,
      });

      await saveDbAsync(db);
      broadcast({ type: 'INVENTORY_UPDATED', itemId: item.id, action: 'RESTOCK' });

      return NextResponse.json({
        success: true,
        message: `Restocked ${addedQty} ${item.unit} of ${item.name}`,
        item,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Inventory POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
