import { NextResponse } from 'next/server';
import { getDb, getDbAsync, saveDb, saveDbAsync } from '@/lib/db';
import { broadcast } from '@/app/api/events/route';

// Initial clean state for CRM
export const SEED_CUSTOMERS_CRM = [];

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

    const db = await getDbAsync();

    // Ensure customers collection is initialized as an array
    if (!Array.isArray(db.customers)) {
      db.customers = [];
      await saveDbAsync(db);
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
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, staffName = 'Floor Captain', role = 'STORE_MANAGER' } = body;
    const db = await getDbAsync();
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
      await saveDbAsync(db);

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

      await saveDbAsync(db);
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
      await saveDbAsync(db);

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
      await saveDbAsync(db);

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
      await saveDbAsync(db);

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
      await saveDbAsync(db);

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
      await saveDbAsync(db);
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
      await saveDbAsync(db);
      return NextResponse.json({ success: true, message: `Customer ${deleted.name} removed from CRM directory` });
    }

    return NextResponse.json({ success: false, error: 'Unknown CRM action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
