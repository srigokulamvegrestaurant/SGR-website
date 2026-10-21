// app/api/admin/crm/route.js - Comprehensive Customer CRM & Loyalty Management Engine
import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { broadcast } from '@/app/api/events/route';

// Initial rich seed data for CRM if customers need enrichment
export const SEED_CUSTOMERS_CRM = [
  {
    id: 'cust_01',
    customerId: 'CUST-1001',
    name: 'Sundaram Chettiar',
    phone: '9443123456',
    email: 'sundaram.chettiar@heritage.in',
    address: 'Kalanivasal, Karaikudi',
    registeredAt: '2026-08-10T09:00:00.000Z',
    visits: 28,
    lastVisit: '2026-10-17T13:30:00.000Z',
    totalSpend: 16450,
    averageBillValue: 587.5,
    segment: 'VIP',
    loyaltyTier: 'PLATINUM',
    loyaltyPoints: 1645,
    pointsRedeemedTotal: 164,
    birthday: '1968-11-24',
    anniversary: '1992-05-18',
    favoriteDishes: [
      { title: 'Chettinad Special Meals', count: 18 },
      { title: 'Special Ghee Podi Roast', count: 12 },
      { title: 'Kumbakonam Degree Filter Coffee', count: 28 },
    ],
    orderHistory: [
      { orderId: 'KOT-08-9104', date: '2026-10-17T13:30:00.000Z', type: 'QR', total: 504, itemsSummary: 'Ghee Podi Roast (3x), Filter Coffee (3x)', billNumber: 'SGR-2026-7789' },
      { orderId: 'ord_101', date: '2026-10-14T12:45:00.000Z', type: 'POS', total: 680, itemsSummary: 'Raja Chettinad Full Meals (Leaf) (2x)', billNumber: 'SGR-2026-7120' },
      { orderId: 'ord_089', date: '2026-10-09T08:15:00.000Z', type: 'QR', total: 340, itemsSummary: 'Button Sambar Idli, Medhu Vadai, Coffee', billNumber: 'SGR-2026-6811' },
    ],
    feedback: [
      { id: 'fb_01', date: '2026-10-14T13:45:00.000Z', rating: 5, category: 'Food Taste', comments: 'The purest cow ghee flavor in Karaikudi. Sambar and poriyal taste like ancestral Chettinad home cooking.', status: 'RESOLVED' },
      { id: 'fb_02', date: '2026-09-28T09:00:00.000Z', rating: 5, category: 'Cleanliness', comments: 'Sparkling brass tumblers and immaculate banana leaf service.', status: 'RESOLVED' },
    ],
    notes: [
      { id: 'nt_01', date: '2026-08-10T10:00:00.000Z', author: 'Murugan (Floor Captain)', text: 'Prefers Table 08 in AC Hall. Always requests traditional banana leaf seating with extra pure cow ghee.', type: 'PREFERENCE' },
      { id: 'nt_02', date: '2026-09-12T13:00:00.000Z', author: 'Karthikeyan (Manager)', text: 'VIP patron from heritage Chettiar family. Extend complimentary betel leaf & nut (paan) after meals.', type: 'VIP' },
    ],
    promotions: [
      { id: 'prom_01', title: 'Royal Platinum Dining Privilege', promoCode: 'ROYAL-PLATINUM', discountPercent: 10, validTill: '2026-12-31', type: 'VIP', status: 'ACTIVE' },
      { id: 'prom_02', title: 'Diwali Special Sweet Box Gift', promoCode: 'DIWALI-FEAST', discountPercent: 15, validTill: '2026-11-15', type: 'FESTIVE', status: 'ACTIVE' },
    ],
  },
  {
    id: 'cust_02',
    customerId: 'CUST-1002',
    name: 'Dr. Ramanathan',
    phone: '9789012345',
    email: 'dr.ramanathan@apollohospital.org',
    address: 'Subramaniapuram Main Road, Karaikudi',
    registeredAt: '2026-08-22T11:00:00.000Z',
    visits: 16,
    lastVisit: '2026-10-17T12:45:00.000Z',
    totalSpend: 9840,
    averageBillValue: 615,
    segment: 'HIGH_SPENDING',
    loyaltyTier: 'GOLD',
    loyaltyPoints: 980,
    pointsRedeemedTotal: 90,
    birthday: '1975-04-12',
    anniversary: '2001-09-08',
    favoriteDishes: [
      { title: 'Special Ghee Podi Roast', count: 10 },
      { title: 'Gokulam Button Sambar Idli', count: 8 },
      { title: 'Madurai Jigarthanda', count: 6 },
    ],
    orderHistory: [
      { orderId: 'KOT-02-4419', date: '2026-10-17T12:45:00.000Z', type: 'QR', total: 554.4, itemsSummary: 'Raja Chettinad Full Meals (Leaf) (2x), Elaneer Payasam', billNumber: 'SGR-2026-7890' },
      { orderId: 'ord_105', date: '2026-10-12T19:30:00.000Z', type: 'POS', total: 480, itemsSummary: 'Ghee Podi Roast, Filter Coffee (2x)', billNumber: 'SGR-2026-7244' },
    ],
    feedback: [
      { id: 'fb_03', date: '2026-10-17T13:30:00.000Z', rating: 5, category: 'Service Speed', comments: 'Filter coffee with palm jaggery is unmatched. Highly attentive floor staff.', status: 'RESOLVED' },
    ],
    notes: [
      { id: 'nt_03', date: '2026-08-22T11:30:00.000Z', author: 'Rajan (Cashier)', text: 'Diabetic - strictly requests degree coffee with palm jaggery (karupatti) or zero sugar.', type: 'ALLERGY' },
    ],
    promotions: [
      { id: 'prom_03', title: 'Gold Tier Gourmet Pass', promoCode: 'GOLD-GOURMET', discountPercent: 10, validTill: '2026-12-31', type: 'VIP', status: 'ACTIVE' },
    ],
  },
  {
    id: 'cust_03',
    customerId: 'CUST-1003',
    name: 'Meenakshi Sundaram',
    phone: '9842155667',
    email: 'meenakshi.sundaram@gmail.com',
    address: 'Kallukatti, Karaikudi',
    registeredAt: '2026-09-01T15:00:00.000Z',
    visits: 9,
    lastVisit: '2026-10-17T17:10:00.000Z',
    totalSpend: 4320,
    averageBillValue: 480,
    segment: 'REGULAR',
    loyaltyTier: 'SILVER',
    loyaltyPoints: 430,
    pointsRedeemedTotal: 40,
    birthday: '1990-10-22', // In 5 days!
    anniversary: '2016-11-10',
    favoriteDishes: [
      { title: 'Chettinad Kuzhi Paniyaram', count: 8 },
      { title: 'Special Ghee Podi Roast', count: 6 },
      { title: 'Traditional Elaneer Payasam', count: 5 },
    ],
    orderHistory: [
      { orderId: 'KOT-03-8821', date: '2026-10-17T17:10:00.000Z', type: 'QR', total: 399, itemsSummary: 'Special Ghee Podi Roast (2x), Medhu Vadai, Coffee (2x)', billNumber: 'SGR-2026-8812' },
      { orderId: 'ord_108', date: '2026-10-11T17:30:00.000Z', type: 'QR', total: 420, itemsSummary: 'Kuzhi Paniyaram, Podi Roast, Elaneer Payasam', billNumber: 'SGR-2026-7299' },
    ],
    feedback: [
      { id: 'fb_04', date: '2026-10-11T18:15:00.000Z', rating: 4, category: 'Ambience', comments: 'Kids love the button idlis, very hygienic and family friendly dining.', status: 'RESOLVED' },
    ],
    notes: [
      { id: 'nt_04', date: '2026-09-01T15:30:00.000Z', author: 'Murugan (Floor Captain)', text: 'Visits with young child. Request mild sambar with low spice and extra coconut chutney.', type: 'PREFERENCE' },
    ],
    promotions: [
      { id: 'prom_04', title: 'Birthday Month Special Treat', promoCode: 'BDAY-TREAT', discountPercent: 15, validTill: '2026-10-31', type: 'BIRTHDAY', status: 'ACTIVE' },
    ],
  },
  {
    id: 'cust_04',
    customerId: 'CUST-1004',
    name: 'Karthik Raja',
    phone: '9876543210',
    email: 'karthik.raja@techmail.com',
    address: 'College Road, Karaikudi',
    registeredAt: '2026-09-15T18:00:00.000Z',
    visits: 7,
    lastVisit: '2026-10-17T17:06:00.000Z',
    totalSpend: 3150,
    averageBillValue: 450,
    segment: 'REGULAR',
    loyaltyTier: 'SILVER',
    loyaltyPoints: 315,
    pointsRedeemedTotal: 30,
    birthday: '1994-06-18',
    anniversary: null,
    favoriteDishes: [
      { title: 'Chettinad Kuzhi Paniyaram', count: 6 },
      { title: 'Kumbakonam Degree Filter Coffee', count: 7 },
    ],
    orderHistory: [
      { orderId: 'KOT-05-3312', date: '2026-10-17T17:06:00.000Z', type: 'QR', total: 273, itemsSummary: 'Chettinad Kuzhi Paniyaram (2x), Degree Filter Coffee (2x)', billNumber: 'SGR-2026-8805' },
    ],
    feedback: [
      { id: 'fb_05', date: '2026-10-08T18:30:00.000Z', rating: 5, category: 'Food Taste', comments: 'Best evening tiffin and crispy paniyaram in Karaikudi.', status: 'RESOLVED' },
    ],
    notes: [
      { id: 'nt_05', date: '2026-09-15T18:30:00.000Z', author: 'Murugan (Floor Captain)', text: 'Always asks for piping hot coffee with high froth in davarah-tumbler.', type: 'PREFERENCE' },
    ],
    promotions: [
      { id: 'prom_05', title: 'Regulars Coffee Club (10% Off Tiffin)', promoCode: 'TIFFIN-10', discountPercent: 10, validTill: '2026-11-30', type: 'PROMOTION', status: 'ACTIVE' },
    ],
  },
  {
    id: 'cust_05',
    customerId: 'CUST-1005',
    name: 'Aswin (Lead Architect)',
    phone: '9363665235',
    email: 'aswin@ajtechsolutions.com',
    address: 'AJ Tech Campus, Karaikudi',
    registeredAt: '2026-08-01T08:00:00.000Z',
    visits: 35,
    lastVisit: '2026-10-17T17:00:00.000Z',
    totalSpend: 22800,
    averageBillValue: 651.42,
    segment: 'VIP',
    loyaltyTier: 'PLATINUM',
    loyaltyPoints: 2280,
    pointsRedeemedTotal: 250,
    birthday: '1998-03-15',
    anniversary: null,
    favoriteDishes: [
      { title: 'Special Ghee Podi Roast', count: 22 },
      { title: 'Gokulam Button Sambar Idli', count: 18 },
      { title: 'Kumbakonam Degree Filter Coffee', count: 35 },
    ],
    orderHistory: [
      { orderId: 'KOT-07-1781', date: '2026-10-17T17:00:00.000Z', type: 'QR', total: 215.26, itemsSummary: 'Ghee Podi Roast, Button Sambar Idli (14 pcs)', billNumber: 'SGR-2026-8791' },
      { orderId: 'ord_110', date: '2026-10-15T12:30:00.000Z', type: 'QR', total: 640, itemsSummary: 'Chettinad Meals (2x), Payasam (2x)', billNumber: 'SGR-2026-7512' },
    ],
    feedback: [
      { id: 'fb_06', date: '2026-10-15T13:30:00.000Z', rating: 5, category: 'Cleanliness', comments: 'Ultra clean kitchen, digital ordering experience is state of the art.', status: 'RESOLVED' },
    ],
    notes: [
      { id: 'nt_06', date: '2026-08-01T08:30:00.000Z', author: 'Owner - Sri Gokulam', text: 'VIP Tech Partner. Needs high speed WiFi and power socket table in AC Hall.', type: 'VIP' },
    ],
    promotions: [
      { id: 'prom_06', title: 'Tech Partner Platinum Dining Pass', promoCode: 'TECH-PLATINUM', discountPercent: 20, validTill: '2026-12-31', type: 'VIP', status: 'ACTIVE' },
    ],
  },
  {
    id: 'cust_06',
    customerId: 'CUST-1006',
    name: 'Venkatesh S.',
    phone: '9786112233',
    email: 'venkat.s@chennaibiz.in',
    address: 'New Bus Stand Road, Devakottai',
    registeredAt: '2026-09-10T12:00:00.000Z',
    visits: 6,
    lastVisit: '2026-10-17T16:46:00.000Z',
    totalSpend: 2840,
    averageBillValue: 473.33,
    segment: 'REGULAR',
    loyaltyTier: 'BRONZE',
    loyaltyPoints: 280,
    pointsRedeemedTotal: 0,
    birthday: '1986-08-30',
    anniversary: '2012-06-15',
    favoriteDishes: [
      { title: 'Chettinad Kuzhi Paniyaram', count: 5 },
      { title: 'Ennai Kathirikai Kuzhambu', count: 4 },
    ],
    orderHistory: [
      { orderId: 'ord_pos_179221491', date: '2026-10-17T16:46:00.000Z', type: 'POS', total: 420, itemsSummary: 'Kuzhi Paniyaram (2x), Ennai Kathirikai, Coffee (2x)', billNumber: 'SGR-2026-9214' },
    ],
    feedback: [
      { id: 'fb_07', date: '2026-10-02T19:00:00.000Z', rating: 4, category: 'Food Taste', comments: 'The brinjal kuzhambu is cooked to perfection with authentic woodpressed gingelly oil.', status: 'RESOLVED' },
    ],
    notes: [
      { id: 'nt_07', date: '2026-09-10T12:30:00.000Z', author: 'Rajan (Cashier)', text: 'Loves spicy Chettinad kuzhambu with steaming hot idlis.', type: 'PREFERENCE' },
    ],
    promotions: [
      { id: 'prom_07', title: 'Chettinad Spices Club (5% Off)', promoCode: 'CHETTI-5', discountPercent: 5, validTill: '2026-11-30', type: 'PROMOTION', status: 'ACTIVE' },
    ],
  },
  {
    id: 'cust_07',
    customerId: 'CUST-1007',
    name: 'Anandhi & Family',
    phone: '9840122334',
    email: 'anandhi.family@gmail.com',
    address: 'Thillai Nagar, Tiruchirappalli',
    registeredAt: '2026-10-16T10:00:00.000Z', // Registered yesterday
    visits: 1,
    lastVisit: '2026-10-17T16:56:00.000Z',
    totalSpend: 780,
    averageBillValue: 780,
    segment: 'NEW',
    loyaltyTier: 'BRONZE',
    loyaltyPoints: 78,
    pointsRedeemedTotal: 0,
    birthday: '1992-12-05',
    anniversary: '2018-02-21',
    favoriteDishes: [
      { title: 'Karaikudi Special Poori Masala', count: 2 },
      { title: 'Kumbakonam Degree Filter Coffee', count: 2 },
    ],
    orderHistory: [
      { orderId: 'ord_1792213803318', date: '2026-10-17T16:56:00.000Z', type: 'POS', total: 252, itemsSummary: 'Poori Masala, Degree Filter Coffee', billNumber: 'SGR-2026-8815' },
    ],
    feedback: [
      { id: 'fb_08', date: '2026-10-17T17:15:00.000Z', rating: 5, category: 'Service Speed', comments: 'Very warm hospitality by captain Murugan, prompt service and piping hot pooris.', status: 'RESOLVED' },
    ],
    notes: [
      { id: 'nt_08', date: '2026-10-16T10:30:00.000Z', author: 'Murugan (Floor Captain)', text: 'First time traveling family visiting Kundrakudi Murugan Temple. Highly appreciated traditional hospitality.', type: 'SERVICE' },
    ],
    promotions: [
      { id: 'prom_08', title: 'Welcome to Sri Gokulam (10% Off Next Visit)', promoCode: 'WELCOME-10', discountPercent: 10, validTill: '2026-11-15', type: 'WELCOME', status: 'ACTIVE' },
    ],
  },
  {
    id: 'cust_08',
    customerId: 'CUST-1008',
    name: 'Muthukumar Alagappan',
    phone: '9442099887',
    email: 'muthu.alaga@chettinadtradition.com',
    address: 'Senjai, Karaikudi',
    registeredAt: '2026-08-05T09:00:00.000Z',
    visits: 5,
    lastVisit: '2026-08-28T14:00:00.000Z', // 50 days ago! Inactive
    totalSpend: 2600,
    averageBillValue: 520,
    segment: 'INACTIVE',
    loyaltyTier: 'BRONZE',
    loyaltyPoints: 260,
    pointsRedeemedTotal: 0,
    birthday: '1972-02-14',
    anniversary: '1998-09-12',
    favoriteDishes: [
      { title: 'Raja Chettinad Full Meals (Leaf)', count: 4 },
      { title: 'Kumbakonam Degree Filter Coffee', count: 5 },
    ],
    orderHistory: [
      { orderId: 'ord_044', date: '2026-08-28T14:00:00.000Z', type: 'POS', total: 540, itemsSummary: 'Chettinad Meals (2x), Filter Coffee', billNumber: 'SGR-2026-5120' },
    ],
    feedback: [
      { id: 'fb_09', date: '2026-08-28T14:30:00.000Z', rating: 4, category: 'Food Taste', comments: 'Authentic meal spread, need quicker table turnaround on Sunday lunch peak hours.', status: 'RESOLVED' },
    ],
    notes: [
      { id: 'nt_09', date: '2026-09-15T10:00:00.000Z', author: 'Karthikeyan (Manager)', text: 'Previously visited every weekend. Eligible for 20% win-back dining voucher.', type: 'SERVICE' },
    ],
    promotions: [
      { id: 'prom_09', title: 'We Miss You! (20% Win-back Feast Voucher)', promoCode: 'WINBACK-20', discountPercent: 20, validTill: '2026-11-10', type: 'WIN_BACK', status: 'ACTIVE' },
    ],
  },
];

// Helper to calculate segment based on behavior
export function evaluateCustomerSegment(cust) {
  const now = Date.now();
  const lastVisitMs = cust.lastVisit ? new Date(cust.lastVisit).getTime() : 0;
  const daysSinceLastVisit = lastVisitMs > 0 ? (now - lastVisitMs) / (1000 * 60 * 60 * 24) : 999;

  if (daysSinceLastVisit > 35) return 'INACTIVE';
  if ((cust.visits || 0) <= 2) return 'NEW';
  if ((cust.totalSpend || 0) >= 12000 || (cust.visits || 0) >= 15) return 'VIP';
  if ((cust.totalSpend || 0) >= 7000 || (cust.averageBillValue || 0) >= 600) return 'HIGH_SPENDING';
  return 'REGULAR';
}

// Helper to determine loyalty tier
export function evaluateLoyaltyTier(points) {
  if (points >= 1500) return 'PLATINUM';
  if (points >= 800) return 'GOLD';
  if (points >= 300) return 'SILVER';
  return 'BRONZE';
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const segmentFilter = (searchParams.get('segment') || 'ALL').toUpperCase();
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const sortBy = searchParams.get('sort') || 'recent'; // 'recent', 'visits', 'spend', 'points'

    const db = getDb();

    // Auto-enrich existing basic customers or seed full CRM profiles if needed
    if (!db.customers || db.customers.length === 0 || !db.customers[0].customerId) {
      db.customers = SEED_CUSTOMERS_CRM;
      saveDb(db);
    }

    let customers = db.customers || [];

    // Ensure all customers have normalized fields
    customers = customers.map(c => {
      const segment = c.segment || evaluateCustomerSegment(c);
      const points = c.loyaltyPoints !== undefined ? c.loyaltyPoints : Math.round((c.totalSpend || 0) * 0.1);
      const tier = c.loyaltyTier || evaluateLoyaltyTier(points);
      const abv = c.visits > 0 ? Math.round(((c.totalSpend || 0) / c.visits) * 100) / 100 : c.totalSpend || 0;

      return {
        ...c,
        segment,
        loyaltyPoints: points,
        loyaltyTier: tier,
        averageBillValue: abv,
        favoriteDishes: c.favoriteDishes || [],
        orderHistory: c.orderHistory || [],
        feedback: c.feedback || [],
        notes: c.notes || [],
        promotions: c.promotions || [],
      };
    });

    // Compute Summary & Analytics
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const newThisMonth = customers.filter(c => new Date(c.registeredAt || 0).getTime() >= thirtyDaysAgo).length;
    const returningCustomers = customers.filter(c => (c.visits || 0) > 1).length;
    const retentionRate = customers.length > 0 ? Math.round((returningCustomers / customers.length) * 100) : 0;
    const totalLoyaltyPoints = customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);
    const totalSpendAll = customers.reduce((sum, c) => sum + (c.totalSpend || 0), 0);
    const averageSpendPerCustomer = customers.length > 0 ? Math.round(totalSpendAll / customers.length) : 0;

    const segmentDistribution = {
      ALL: customers.length,
      NEW: customers.filter(c => c.segment === 'NEW').length,
      REGULAR: customers.filter(c => c.segment === 'REGULAR').length,
      VIP: customers.filter(c => c.segment === 'VIP').length,
      HIGH_SPENDING: customers.filter(c => c.segment === 'HIGH_SPENDING').length,
      INACTIVE: customers.filter(c => c.segment === 'INACTIVE').length,
    };

    // Top 5 VIP Leaderboard
    const topCustomers = [...customers]
      .sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0))
      .slice(0, 5);

    // Apply Segment Filter
    let filtered = customers;
    if (segmentFilter !== 'ALL') {
      filtered = filtered.filter(c => c.segment === segmentFilter);
    }

    // Apply Search (name, phone, email, customerId)
    if (search) {
      filtered = filtered.filter(c => {
        const nameMatch = String(c.name || '').toLowerCase().includes(search);
        const phoneMatch = String(c.phone || '').toLowerCase().includes(search);
        const emailMatch = String(c.email || '').toLowerCase().includes(search);
        const idMatch = String(c.id || '').toLowerCase().includes(search) || String(c.customerId || '').toLowerCase().includes(search);
        const addressMatch = String(c.address || '').toLowerCase().includes(search);
        return nameMatch || phoneMatch || emailMatch || idMatch || addressMatch;
      });
    }

    // Apply Sort
    if (sortBy === 'visits') {
      filtered.sort((a, b) => (b.visits || 0) - (a.visits || 0));
    } else if (sortBy === 'spend') {
      filtered.sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0));
    } else if (sortBy === 'points') {
      filtered.sort((a, b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0));
    } else {
      // 'recent' by last visit date
      filtered.sort((a, b) => new Date(b.lastVisit || 0).getTime() - new Date(a.lastVisit || 0).getTime());
    }

    return NextResponse.json({
      success: true,
      customers: filtered,
      allCustomers: customers,
      summary: {
        totalCustomers: customers.length,
        newThisMonth,
        returningCustomers,
        retentionRate,
        totalLoyaltyPoints,
        totalSpendAll,
        averageSpendPerCustomer,
        vipCount: segmentDistribution.VIP,
      },
      segmentDistribution,
      topCustomers,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, staffName = 'Floor Captain', role = 'STORE_MANAGER' } = body;
    const db = getDb();
    db.customers = db.customers || [];

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ACTION: ADD NEW CUSTOMER
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'ADD_CUSTOMER') {
      const {
        name,
        phone,
        email = '',
        address = 'Karaikudi',
        birthday = null,
        anniversary = null,
        initialSpend = 0,
        initialVisits = 1,
        notesText = '',
        segment = 'NEW',
      } = body;

      if (!name || !phone) {
        return NextResponse.json({ success: false, error: 'Customer name and phone number are required' }, { status: 400 });
      }

      // Check phone uniqueness
      const existing = db.customers.find(c => c.phone === phone.trim());
      if (existing) {
        return NextResponse.json({ success: false, error: `Customer with phone ${phone} already exists (${existing.name})` }, { status: 400 });
      }

      const nextIdNum = db.customers.length + 1001;
      const newCust = {
        id: `cust_${Date.now()}`,
        customerId: `CUST-${nextIdNum}`,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        registeredAt: new Date().toISOString(),
        visits: Number(initialVisits) || 1,
        lastVisit: new Date().toISOString(),
        totalSpend: Number(initialSpend) || 0,
        averageBillValue: Number(initialSpend) || 0,
        segment: segment || 'NEW',
        loyaltyTier: 'BRONZE',
        loyaltyPoints: Math.round((Number(initialSpend) || 0) * 0.1),
        pointsRedeemedTotal: 0,
        birthday: birthday || null,
        anniversary: anniversary || null,
        favoriteDishes: [],
        orderHistory: [],
        feedback: [],
        notes: notesText ? [{
          id: `nt_${Date.now()}`,
          date: new Date().toISOString(),
          author: staffName,
          text: notesText.trim(),
          type: 'PREFERENCE',
        }] : [],
        promotions: [
          {
            id: `prom_${Date.now()}`,
            title: 'Welcome to Sri Gokulam (10% Off Next Visit)',
            promoCode: 'WELCOME-10',
            discountPercent: 10,
            validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            type: 'WELCOME',
            status: 'ACTIVE',
          }
        ],
      };

      db.customers.unshift(newCust);
      saveDb(db);

      try {
        broadcast({
          type: 'CUSTOMER_REGISTERED',
          customerId: newCust.customerId,
          name: newCust.name,
          message: `👤 New Customer Registered: ${newCust.name} (${newCust.phone})`,
        });
      } catch (e) { /* silent */ }

      return NextResponse.json({ success: true, message: 'Customer registered successfully', customer: newCust });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. ACTION: UPDATE CUSTOMER PROFILE
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'UPDATE_CUSTOMER') {
      const { id, name, phone, email, address, birthday, anniversary, segment } = body;
      const cust = db.customers.find(c => c.id === id || c.customerId === id);
      if (!cust) {
        return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
      }

      if (name) cust.name = name.trim();
      if (phone) cust.phone = phone.trim();
      if (email !== undefined) cust.email = email.trim();
      if (address !== undefined) cust.address = address.trim();
      if (birthday !== undefined) cust.birthday = birthday;
      if (anniversary !== undefined) cust.anniversary = anniversary;
      if (segment) cust.segment = segment;

      saveDb(db);
      return NextResponse.json({ success: true, message: 'Profile updated successfully', customer: cust });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. ACTION: ADD INTERNAL NOTE OR DIETARY PREFERENCE
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'ADD_NOTE') {
      const { customerId, text, type = 'PREFERENCE' } = body;
      const cust = db.customers.find(c => c.id === customerId || c.customerId === customerId);
      if (!cust) {
        return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
      }

      if (!text || text.trim().length < 2) {
        return NextResponse.json({ success: false, error: 'Note text is required' }, { status: 400 });
      }

      cust.notes = cust.notes || [];
      const newNote = {
        id: `nt_${Date.now()}`,
        date: new Date().toISOString(),
        author: staffName,
        text: text.trim(),
        type,
      };
      cust.notes.unshift(newNote);
      saveDb(db);

      return NextResponse.json({ success: true, message: 'Note added to customer profile', note: newNote, customer: cust });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. ACTION: ADJUST LOYALTY POINTS (Earn or Redeem)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'ADJUST_LOYALTY') {
      const { customerId, deltaPoints, reason = 'Staff manual adjustment', mode = 'ADD' } = body;
      const cust = db.customers.find(c => c.id === customerId || c.customerId === customerId);
      if (!cust) {
        return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
      }

      const delta = Math.abs(Number(deltaPoints) || 0);
      if (delta === 0) {
        return NextResponse.json({ success: false, error: 'Valid points delta required' }, { status: 400 });
      }

      cust.loyaltyPoints = cust.loyaltyPoints || 0;
      cust.pointsRedeemedTotal = cust.pointsRedeemedTotal || 0;
      cust.pointsHistory = cust.pointsHistory || [];

      if (mode === 'REDEEM') {
        if (cust.loyaltyPoints < delta) {
          return NextResponse.json({ success: false, error: `Insufficient loyalty points balance (${cust.loyaltyPoints} available)` }, { status: 400 });
        }
        cust.loyaltyPoints -= delta;
        cust.pointsRedeemedTotal += delta;
        cust.pointsHistory.unshift({
          id: `ph_${Date.now()}`,
          date: new Date().toISOString(),
          action: 'REDEEMED',
          points: -delta,
          reason,
          staff: staffName,
        });
      } else {
        cust.loyaltyPoints += delta;
        cust.pointsHistory.unshift({
          id: `ph_${Date.now()}`,
          date: new Date().toISOString(),
          action: 'EARNED',
          points: delta,
          reason,
          staff: staffName,
        });
      }

      cust.loyaltyTier = evaluateLoyaltyTier(cust.loyaltyPoints);
      saveDb(db);

      return NextResponse.json({
        success: true,
        message: mode === 'REDEEM' ? `Redeemed ${delta} points for ${cust.name}` : `Added ${delta} points to ${cust.name}`,
        loyaltyPoints: cust.loyaltyPoints,
        loyaltyTier: cust.loyaltyTier,
        customer: cust,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. ACTION: LOG CUSTOMER FEEDBACK & RATINGS
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'ADD_FEEDBACK') {
      const { customerId, rating = 5, category = 'Food Taste', comments = '', isComplaint = false } = body;
      const cust = db.customers.find(c => c.id === customerId || c.customerId === customerId);
      if (!cust) {
        return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
      }

      cust.feedback = cust.feedback || [];
      const newFb = {
        id: `fb_${Date.now()}`,
        date: new Date().toISOString(),
        rating: Number(rating) || 5,
        category,
        comments: comments.trim() || 'Guest dined happily and expressed compliments to the kitchen.',
        status: isComplaint ? 'INVESTIGATING' : 'RESOLVED',
        loggedBy: staffName,
      };

      cust.feedback.unshift(newFb);
      saveDb(db);

      return NextResponse.json({ success: true, message: 'Customer feedback recorded successfully', feedback: newFb, customer: cust });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. ACTION: CREATE / ASSIGN PROMOTIONAL OFFER
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'CREATE_OFFER') {
      const { customerId, title, discountPercent = 10, promoCode, validDays = 30, type = 'PROMOTION' } = body;
      const cust = db.customers.find(c => c.id === customerId || c.customerId === customerId);
      if (!cust) {
        return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
      }

      if (!title) {
        return NextResponse.json({ success: false, error: 'Offer title is required' }, { status: 400 });
      }

      cust.promotions = cust.promotions || [];
      const code = promoCode || `SGR-${title.slice(0, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const validTill = new Date(Date.now() + (Number(validDays) || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const newOffer = {
        id: `prom_${Date.now()}`,
        title: title.trim(),
        promoCode: code,
        discountPercent: Number(discountPercent) || 10,
        validTill,
        type,
        status: 'ACTIVE',
        issuedBy: staffName,
      };

      cust.promotions.unshift(newOffer);
      saveDb(db);

      return NextResponse.json({ success: true, message: `Promo code ${code} issued to ${cust.name}`, offer: newOffer, customer: cust });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. ACTION: UPDATE CUSTOMER SEGMENT
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'UPDATE_SEGMENT') {
      const { customerId, newSegment } = body;
      const cust = db.customers.find(c => c.id === customerId || c.customerId === customerId);
      if (!cust) {
        return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
      }

      cust.segment = newSegment;
      saveDb(db);
      return NextResponse.json({ success: true, message: `Segment updated to ${newSegment}`, customer: cust });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 8. ACTION: DELETE / ARCHIVE CUSTOMER (Admin only)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'DELETE_CUSTOMER') {
      const { customerId } = body;
      const index = db.customers.findIndex(c => c.id === customerId || c.customerId === customerId);
      if (index === -1) {
        return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
      }

      const deleted = db.customers.splice(index, 1)[0];
      saveDb(db);
      return NextResponse.json({ success: true, message: `Customer ${deleted.name} removed from CRM directory` });
    }

    return NextResponse.json({ success: false, error: 'Unknown CRM action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
