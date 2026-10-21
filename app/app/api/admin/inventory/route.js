// app/api/admin/inventory/route.js - Enterprise Inventory, Supplier & Food Costing Engine
import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { broadcast } from '@/app/api/events/route';

// ─── Default Suppliers Seed ──────────────────────────────────────────────────
export const SEED_SUPPLIERS = [
  {
    id: 'sup_01',
    name: 'Karaikudi Dairy Farm',
    contactPerson: 'S. Muthukrishnan',
    phone: '9443187654',
    email: 'karaikudi.dairy@gmail.com',
    address: 'Kalanivasal Road, Karaikudi',
    categories: ['DAIRY'],
    paymentTerms: 'Net 15 Days',
    paymentStatus: 'PAID',
    balanceDue: 0,
    rating: 4.9,
    suppliedItemIds: ['inv_02', 'inv_08'],
    createdAt: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 'sup_02',
    name: 'Chettinad Traditional Spice Mill',
    contactPerson: 'Alagappan Chettiar',
    phone: '9842199887',
    email: 'chettinad.spices@heritage.in',
    address: 'Bazaar Street, Kottaiyur, Karaikudi',
    categories: ['MASALA', 'PULSE'],
    paymentTerms: 'Net 30 Days',
    paymentStatus: 'PENDING_INVOICE',
    balanceDue: 4500,
    rating: 5.0,
    suppliedItemIds: ['inv_03', 'inv_09', 'inv_10'],
    createdAt: '2026-08-05T10:00:00.000Z',
  },
  {
    id: 'sup_03',
    name: 'Thanjavur Delta Rice Mandi',
    contactPerson: 'R. Swaminathan',
    phone: '9789045612',
    email: 'swami.ricemandi@delta.in',
    address: 'Grain Market, Devakottai Main Road',
    categories: ['BASE', 'PULSE'],
    paymentTerms: 'Net 30 Days',
    paymentStatus: 'CREDIT_30_DAYS',
    balanceDue: 12800,
    rating: 4.8,
    suppliedItemIds: ['inv_01', 'inv_06'],
    createdAt: '2026-08-10T11:00:00.000Z',
  },
  {
    id: 'sup_04',
    name: 'Sivagangai Organic Agro Farms',
    contactPerson: 'K. Meyyappan',
    phone: '9488234190',
    email: 'sivagangai.agro@greenfarms.org',
    address: 'Farm Route 4, Thirumayam',
    categories: ['VEGETABLE', 'SERVING', 'CONDIMENT'],
    paymentTerms: 'Cash on Delivery',
    paymentStatus: 'PAID',
    balanceDue: 0,
    rating: 4.7,
    suppliedItemIds: ['inv_04', 'inv_05', 'inv_14'],
    createdAt: '2026-08-15T08:30:00.000Z',
  },
  {
    id: 'sup_05',
    name: 'Kumbakonam Royal Coffee Works',
    contactPerson: 'T. Balasubramanian',
    phone: '9842111223',
    email: 'kumbakonam.coffee@royalblends.com',
    address: 'Temple Square, Kumbakonam & Karaikudi Branch',
    categories: ['BEVERAGE'],
    paymentTerms: 'Net 15 Days',
    paymentStatus: 'PAID',
    balanceDue: 0,
    rating: 5.0,
    suppliedItemIds: ['inv_07'],
    createdAt: '2026-08-18T14:00:00.000Z',
  },
  {
    id: 'sup_06',
    name: 'Madurai Traditional Jaggery & Oils',
    contactPerson: 'P. Veerappan',
    phone: '9944332211',
    email: 'madurai.jaggery@tradition.in',
    address: 'Oil Market Lane, Madurai Highway',
    categories: ['SWEETENER', 'OIL'],
    paymentTerms: 'Net 30 Days',
    paymentStatus: 'PENDING_INVOICE',
    balanceDue: 3200,
    rating: 4.8,
    suppliedItemIds: ['inv_11', 'inv_12', 'inv_13'],
    createdAt: '2026-08-20T16:00:00.000Z',
  },
];

// ─── Default Enriched Inventory Seed ─────────────────────────────────────────
export const SEED_INVENTORY_ENRICHED = [
  {
    id: 'inv_01',
    name: 'Dosa Batter (Urad Dal & Rice)',
    tamilName: 'தோசை மாவு',
    unit: 'KG',
    currentStock: 35.0,
    lowStockThreshold: 10.0,
    costPerUnit: 48,
    category: 'BASE',
    supplierId: 'sup_03',
    supplierName: 'Thanjavur Delta Rice Mandi',
    storageLocation: 'Cold Storage Room (2°C)',
    expiryDate: '2026-10-21', // 4 days remaining (Expiring soon)
    reorderQty: 25.0,
    lastPurchasedDate: '2026-10-15',
  },
  {
    id: 'inv_02',
    name: 'Pure Cow Ghee (Nattu Pasu)',
    tamilName: 'நாட்டு பசு நெய்',
    unit: 'LTR',
    currentStock: 8.5,
    lowStockThreshold: 5.0,
    costPerUnit: 680,
    category: 'DAIRY',
    supplierId: 'sup_01',
    supplierName: 'Karaikudi Dairy Farm',
    storageLocation: 'Dry Provisions Store',
    expiryDate: '2027-02-15',
    reorderQty: 10.0,
    lastPurchasedDate: '2026-10-10',
  },
  {
    id: 'inv_03',
    name: 'Idli Podi (Chettinad Gunpowder)',
    tamilName: 'செட்டிநாடு இட்லி பொடி',
    unit: 'KG',
    currentStock: 4.2,
    lowStockThreshold: 1.5,
    costPerUnit: 120,
    category: 'MASALA',
    supplierId: 'sup_02',
    supplierName: 'Chettinad Traditional Spice Mill',
    storageLocation: 'Spice Vault Shelf B',
    expiryDate: '2026-12-30',
    reorderQty: 5.0,
    lastPurchasedDate: '2026-10-05',
  },
  {
    id: 'inv_04',
    name: 'Coconut Chutney Mix (Fresh Grated)',
    tamilName: 'தேங்காய் சட்னி கலவை',
    unit: 'KG',
    currentStock: 1.8, // Below threshold (Low stock & Expiring soon!)
    lowStockThreshold: 3.0,
    costPerUnit: 60,
    category: 'CONDIMENT',
    supplierId: 'sup_04',
    supplierName: 'Sivagangai Organic Agro Farms',
    storageLocation: 'Cold Storage Room (2°C)',
    expiryDate: '2026-10-19', // 2 days remaining!
    reorderQty: 6.0,
    lastPurchasedDate: '2026-10-17',
  },
  {
    id: 'inv_05',
    name: 'Sambar (Toor Dal + Shallots)',
    tamilName: 'செட்டிநாடு சாம்பார்',
    unit: 'LTR',
    currentStock: 22.0,
    lowStockThreshold: 8.0,
    costPerUnit: 35,
    category: 'BASE',
    supplierId: 'sup_04',
    supplierName: 'Sivagangai Organic Agro Farms',
    storageLocation: 'Kitchen Line Heated Well',
    expiryDate: '2026-10-18', // 1 day remaining!
    reorderQty: 20.0,
    lastPurchasedDate: '2026-10-17',
  },
  {
    id: 'inv_06',
    name: 'Ponni Raw Rice (Deluxe 1st Crop)',
    tamilName: 'பொன்னி பச்சரிசி',
    unit: 'KG',
    currentStock: 80.0,
    lowStockThreshold: 20.0,
    costPerUnit: 55,
    category: 'BASE',
    supplierId: 'sup_03',
    supplierName: 'Thanjavur Delta Rice Mandi',
    storageLocation: 'Dry Provisions Store Bin 1',
    expiryDate: '2027-06-30',
    reorderQty: 100.0,
    lastPurchasedDate: '2026-10-11',
  },
  {
    id: 'inv_07',
    name: 'Kumbakonam Degree Coffee Powder (80:20)',
    tamilName: 'டிகிரி காபி தூள்',
    unit: 'KG',
    currentStock: 0.8, // Below threshold 1.0! (Low Stock)
    lowStockThreshold: 1.5,
    costPerUnit: 450,
    category: 'BEVERAGE',
    supplierId: 'sup_05',
    supplierName: 'Kumbakonam Royal Coffee Works',
    storageLocation: 'Beverage Counter Air-tight Caddy',
    expiryDate: '2027-01-20',
    reorderQty: 4.0,
    lastPurchasedDate: '2026-10-02',
  },
  {
    id: 'inv_08',
    name: 'Full Cream Milk (Aavin Green)',
    tamilName: 'பசும்பால்',
    unit: 'LTR',
    currentStock: 18.0,
    lowStockThreshold: 6.0,
    costPerUnit: 65,
    category: 'DAIRY',
    supplierId: 'sup_01',
    supplierName: 'Karaikudi Dairy Farm',
    storageLocation: 'Cold Storage Room (2°C)',
    expiryDate: '2026-10-20', // 3 days remaining
    reorderQty: 20.0,
    lastPurchasedDate: '2026-10-17',
  },
  {
    id: 'inv_09',
    name: 'Urad Dal (Split White)',
    tamilName: 'உளுந்தம் பருப்பு',
    unit: 'KG',
    currentStock: 12.0,
    lowStockThreshold: 4.0,
    costPerUnit: 95,
    category: 'PULSE',
    supplierId: 'sup_02',
    supplierName: 'Chettinad Traditional Spice Mill',
    storageLocation: 'Dry Provisions Store Bin 3',
    expiryDate: '2027-03-31',
    reorderQty: 15.0,
    lastPurchasedDate: '2026-10-08',
  },
  {
    id: 'inv_10',
    name: 'Mustard Seeds & Curry Leaves',
    tamilName: 'கடுகு & கருவேப்பிலை',
    unit: 'KG',
    currentStock: 0.4, // Below threshold 0.5! (Low Stock)
    lowStockThreshold: 0.5,
    costPerUnit: 180,
    category: 'MASALA',
    supplierId: 'sup_02',
    supplierName: 'Chettinad Traditional Spice Mill',
    storageLocation: 'Spice Vault Shelf A',
    expiryDate: '2026-11-30',
    reorderQty: 2.0,
    lastPurchasedDate: '2026-09-25',
  },
  {
    id: 'inv_11',
    name: 'Refined Sunflower Oil (Deep Fry)',
    tamilName: 'சூரியகாந்தி எண்ணெய்',
    unit: 'LTR',
    currentStock: 15.0,
    lowStockThreshold: 5.0,
    costPerUnit: 130,
    category: 'OIL',
    supplierId: 'sup_06',
    supplierName: 'Madurai Traditional Jaggery & Oils',
    storageLocation: 'Oil Storage Drum Bay',
    expiryDate: '2027-04-15',
    reorderQty: 30.0,
    lastPurchasedDate: '2026-10-01',
  },
  {
    id: 'inv_12',
    name: 'Sugar (Fine Granulated)',
    tamilName: 'சர்க்கரை',
    unit: 'KG',
    currentStock: 10.0,
    lowStockThreshold: 3.0,
    costPerUnit: 42,
    category: 'SWEETENER',
    supplierId: 'sup_06',
    supplierName: 'Madurai Traditional Jaggery & Oils',
    storageLocation: 'Dry Provisions Store Bin 2',
    expiryDate: '2027-05-30',
    reorderQty: 15.0,
    lastPurchasedDate: '2026-10-01',
  },
  {
    id: 'inv_13',
    name: 'Karupatti (Natural Palm Jaggery)',
    tamilName: 'உடன்குடி பனை கருப்பட்டி',
    unit: 'KG',
    currentStock: 0.0, // Out of Stock!
    lowStockThreshold: 1.0,
    costPerUnit: 220,
    category: 'SWEETENER',
    supplierId: 'sup_06',
    supplierName: 'Madurai Traditional Jaggery & Oils',
    storageLocation: 'Spice Vault Shelf C',
    expiryDate: '2026-12-15',
    reorderQty: 5.0,
    lastPurchasedDate: '2026-09-18',
  },
  {
    id: 'inv_14',
    name: 'Banana Leaves (Fresh Farm Bundle)',
    tamilName: 'வாழை இலை கட்டு',
    unit: 'BUNCH',
    currentStock: 8.0,
    lowStockThreshold: 3.0,
    costPerUnit: 40,
    category: 'SERVING',
    supplierId: 'sup_04',
    supplierName: 'Sivagangai Organic Agro Farms',
    storageLocation: 'Vegetable Cool Shed',
    expiryDate: '2026-10-21', // 4 days remaining
    reorderQty: 10.0,
    lastPurchasedDate: '2026-10-17',
  },
];

// ─── Default Purchase Orders Seed ─────────────────────────────────────────────
export const SEED_PURCHASE_ORDERS = [
  {
    id: 'po_01',
    poNumber: 'PO-2026-101',
    supplierId: 'sup_01',
    supplierName: 'Karaikudi Dairy Farm',
    invoiceNumber: 'INV-KD-8821',
    status: 'RECEIVED', // 'PENDING', 'RECEIVED', 'CANCELLED'
    orderDate: '2026-10-14T10:00:00.000Z',
    receivedDate: '2026-10-15T07:30:00.000Z',
    paymentStatus: 'PAID',
    totalAmount: 8500,
    items: [
      { invId: 'inv_02', name: 'Pure Cow Ghee (Nattu Pasu)', qty: 10, unit: 'LTR', unitPrice: 680, lineTotal: 6800 },
      { invId: 'inv_08', name: 'Full Cream Milk (Aavin)', qty: 26, unit: 'LTR', unitPrice: 65, lineTotal: 1700 },
    ],
    receivedBy: 'Karthikeyan (Manager)',
  },
  {
    id: 'po_02',
    poNumber: 'PO-2026-102',
    supplierId: 'sup_02',
    supplierName: 'Chettinad Traditional Spice Mill',
    invoiceNumber: 'INV-CS-4190',
    status: 'RECEIVED',
    orderDate: '2026-10-12T11:00:00.000Z',
    receivedDate: '2026-10-13T09:15:00.000Z',
    paymentStatus: 'PENDING_INVOICE',
    totalAmount: 4500,
    items: [
      { invId: 'inv_03', name: 'Idli Podi (Gunpowder)', qty: 15, unit: 'KG', unitPrice: 120, lineTotal: 1800 },
      { invId: 'inv_09', name: 'Urad Dal', qty: 20, unit: 'KG', unitPrice: 95, lineTotal: 1900 },
      { invId: 'inv_10', name: 'Mustard Seeds & Curry Leaves', qty: 4.44, unit: 'KG', unitPrice: 180, lineTotal: 800 },
    ],
    receivedBy: 'Selvam (Head Cook)',
  },
  {
    id: 'po_03',
    poNumber: 'PO-2026-103',
    supplierId: 'sup_03',
    supplierName: 'Thanjavur Delta Rice Mandi',
    invoiceNumber: 'INV-TM-9021',
    status: 'RECEIVED',
    orderDate: '2026-10-10T09:00:00.000Z',
    receivedDate: '2026-10-11T12:00:00.000Z',
    paymentStatus: 'CREDIT_30_DAYS',
    totalAmount: 12800,
    items: [
      { invId: 'inv_06', name: 'Ponni Raw Rice (Premium)', qty: 200, unit: 'KG', unitPrice: 55, lineTotal: 11000 },
      { invId: 'inv_01', name: 'Dosa Batter (Urad Dal & Rice)', qty: 37.5, unit: 'KG', unitPrice: 48, lineTotal: 1800 },
    ],
    receivedBy: 'Karthikeyan (Manager)',
  },
  {
    id: 'po_04',
    poNumber: 'PO-2026-104',
    supplierId: 'sup_05',
    supplierName: 'Kumbakonam Royal Coffee Works',
    invoiceNumber: 'INV-KC-3310',
    status: 'PENDING',
    orderDate: '2026-10-16T14:30:00.000Z',
    receivedDate: null,
    paymentStatus: 'PENDING',
    totalAmount: 3600,
    items: [
      { invId: 'inv_07', name: 'Kumbakonam Degree Coffee Powder', qty: 8, unit: 'KG', unitPrice: 450, lineTotal: 3600 },
    ],
    receivedBy: null,
  },
];

// ─── Default Stock Movements Audit Seed ───────────────────────────────────────
export const SEED_STOCK_MOVEMENTS = [
  {
    id: 'mov_01',
    date: '2026-10-17T18:00:00.000Z',
    type: 'RECIPE_CONSUMPTION',
    itemId: 'inv_01',
    itemName: 'Dosa Batter (Urad Dal & Rice)',
    qtyChange: -5.4,
    unit: 'KG',
    reason: 'Prepared 30x Ghee Podi Roast (Orders #KOT-08 to #KOT-14)',
    staff: 'Selvam (Head Cook)',
    balanceAfter: 35.0,
  },
  {
    id: 'mov_02',
    date: '2026-10-17T14:30:00.000Z',
    type: 'WASTAGE_DAMAGED',
    itemId: 'inv_08',
    itemName: 'Full Cream Milk (Aavin)',
    qtyChange: -1.5,
    unit: 'LTR',
    reason: 'Curdled during afternoon boiling (Boiler temperature fluctuation)',
    staff: 'Selvam (Head Cook)',
    balanceAfter: 18.0,
  },
  {
    id: 'mov_03',
    date: '2026-10-17T08:00:00.000Z',
    type: 'PURCHASE_RECEIPT',
    itemId: 'inv_14',
    itemName: 'Banana Leaves (Fresh Farm Bundle)',
    qtyChange: 10,
    unit: 'BUNCH',
    reason: 'Received morning farm delivery from Sivagangai Farms (PO #105)',
    staff: 'Karthikeyan (Manager)',
    balanceAfter: 8.0,
  },
  {
    id: 'mov_04',
    date: '2026-10-16T16:00:00.000Z',
    type: 'MANUAL_CORRECTION',
    itemId: 'inv_03',
    itemName: 'Idli Podi (Chettinad Gunpowder)',
    qtyChange: 0.5,
    unit: 'KG',
    reason: 'Monthly physical stock count reconciliation',
    staff: 'Aswin (Lead Architect)',
    balanceAfter: 4.2,
  },
  {
    id: 'mov_05',
    date: '2026-10-15T07:30:00.000Z',
    type: 'PURCHASE_RECEIPT',
    itemId: 'inv_02',
    itemName: 'Pure Cow Ghee (Nattu Pasu)',
    qtyChange: 10,
    unit: 'LTR',
    reason: 'Received PO-2026-101 delivery from Karaikudi Dairy Farm',
    staff: 'Karthikeyan (Manager)',
    balanceAfter: 8.5,
  },
];

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
    const db = getDb();

    // 1. Ensure Suppliers exist
    if (!db.suppliers || db.suppliers.length === 0) {
      db.suppliers = SEED_SUPPLIERS;
      saveDb(db);
    }

    // 2. Ensure Enriched Inventory exists
    if (!db.inventory || db.inventory.length === 0 || !db.inventory[0].supplierName) {
      db.inventory = SEED_INVENTORY_ENRICHED;
      saveDb(db);
    }

    // 3. Ensure Purchase Orders exist
    if (!db.purchase_orders || db.purchase_orders.length === 0) {
      db.purchase_orders = SEED_PURCHASE_ORDERS;
      saveDb(db);
    }

    // 4. Ensure Stock Movements exist
    if (!db.stock_movements || db.stock_movements.length === 0) {
      db.stock_movements = SEED_STOCK_MOVEMENTS;
      saveDb(db);
    }

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
      : 28;

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
    const db = getDb();
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

      saveDb(db);
      broadcast({ type: 'INVENTORY_UPDATED', itemId: newId, action: 'ADD_INGREDIENT' });

      return NextResponse.json({
        success: true,
        message: `Added new ingredient: ${newIngredient.name}`,
        ingredient: newIngredient,
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

      saveDb(db);
      broadcast({ type: 'INVENTORY_UPDATED', itemId: item.id, action: 'UPDATE_INGREDIENT' });

      return NextResponse.json({
        success: true,
        message: `Updated ingredient: ${item.name}`,
        ingredient: item,
      });
    }

    // ─── ACTION 3: DELETE INGREDIENT ───────────────────────────────────────
    if (action === 'DELETE_INGREDIENT') {
      const { itemId } = body;
      const idx = db.inventory.findIndex(i => i.id === itemId);
      if (idx === -1) {
        return NextResponse.json({ success: false, error: 'Ingredient not found' }, { status: 404 });
      }

      const deletedName = db.inventory[idx].name;
      db.inventory.splice(idx, 1);
      saveDb(db);

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

      saveDb(db);
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
      saveDb(db);
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

      saveDb(db);
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
      saveDb(db);

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

      saveDb(db);

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

      saveDb(db);
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

      saveDb(db);
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
