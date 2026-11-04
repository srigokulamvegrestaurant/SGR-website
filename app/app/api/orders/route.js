// app/api/orders/route.js - Order Creation & Query API
import { NextResponse } from 'next/server';
import { getDb, getDbAsync, saveDb, saveDbAsync, categorizeStation, recordCustomerTransaction } from '@/lib/db';
import { broadcast } from '@/app/api/events/route';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const status = searchParams.get('status');

    const db = await getDbAsync();
    let orders = [...(db.orders || [])];

    if (table) {
      const formatted = String(table).padStart(2, '0');
      orders = orders.filter((o) =>
        Array.isArray(o.tables) ? o.tables.includes(formatted) : String(o.tableNumber || '').padStart(2, '0') === formatted
      );
    }

    if (status) {
      orders = orders.filter((o) => o.status === status);
    }

    return NextResponse.json({
      success: true,
      orders,
      count: orders.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      tables = [],
      orderType = 'DINE_IN',
      guestName,
      guestPhone,
      guestEmail = '',
      guestCount = 2,
      cookingNotes = '',
      items = [],
    } = body;

    if (!guestName || !guestName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Guest name is required' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order must contain at least one item' },
        { status: 400 }
      );
    }

    const db = await getDbAsync();

    // Generate random 4-digit OTP
    const generatedOtp = String(Math.floor(1000 + Math.random() * 9000));
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const primaryTable = tables[0] || '07';
    const kotId = `KOT-${primaryTable}-${randomSuffix}`;

    // Item pricing calculation
    const subtotal = items.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0);
    const cgst = Math.round(subtotal * 0.025 * 100) / 100; // 2.5% CGST
    const sgst = Math.round(subtotal * 0.025 * 100) / 100; // 2.5% SGST
    const totalAmount = Math.round((subtotal + cgst + sgst) * 100) / 100;

    // Station item routing
    const stationItems = {};
    items.forEach((item) => {
      const station = categorizeStation(item.title) || 'TIFFIN';
      if (!stationItems[station]) {
        stationItems[station] = [];
      }
      stationItems[station].push(item);
    });

    const isStaffPunch = Boolean(body.isStaffPunch || body.verifiedBy);
    const initialStatus = isStaffPunch ? 'cooking' : (body.status || 'otp_pending');
    const staffName = body.verifiedBy || (isStaffPunch ? 'Captain Murugan (Floor Lead)' : null);

    const newOrder = {
      id: kotId,
      orderId: kotId,
      orderType: orderType || (tables && tables.length > 0 ? 'DINE_IN' : 'TAKEAWAY'),
      tableNumber: primaryTable,
      tables: tables.map((t) => String(t).padStart(2, '0')),
      otp: generatedOtp,
      verificationOtp: generatedOtp,
      guestName: guestName.trim(),
      guestPhone: guestPhone ? guestPhone.trim() : '',
      guestEmail: guestEmail ? guestEmail.trim() : '',
      guestCount: parseInt(guestCount, 10) || 2,
      cookingNotes: cookingNotes.trim() || 'Standard Karaikudi Authentic Sattvic Prep',
      items,
      subtotal,
      cgst,
      sgst,
      totalAmount,
      stationRouting: stationItems,
      status: initialStatus, // 'otp_pending' | 'cooking' | 'plating' | 'served' | 'completed'
      prepTimeMinutes: 12,
      createdAt: new Date().toISOString(),
      placedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      verifiedBy: staffName,
      verifiedAt: isStaffPunch ? new Date().toISOString() : null,
    };

    // Store in orders list
    if (!db.orders) db.orders = [];
    db.orders.unshift(newOrder);

    // If add-on order, merge items into active parent order for unified billing
    if (body.isAddon && body.parentOrderId) {
      const parentOrder = (db.orders || []).find(
        (o) => o.orderId === body.parentOrderId || o.id === body.parentOrderId
      );
      if (parentOrder) {
        parentOrder.items = [...(parentOrder.items || []), ...items];
        parentOrder.subtotal = Math.round(((parentOrder.subtotal || 0) + subtotal) * 100) / 100;
        parentOrder.cgst = Math.round(((parentOrder.cgst || 0) + cgst) * 100) / 100;
        parentOrder.sgst = Math.round(((parentOrder.sgst || 0) + sgst) * 100) / 100;
        parentOrder.totalAmount = Math.round(((parentOrder.totalAmount || 0) + totalAmount) * 100) / 100;
        parentOrder.updatedAt = new Date().toISOString();
      }
    }

    // Update table statuses to OCCUPIED if dining in
    if (tables && tables.length > 0) {
      tables.forEach((tNum) => {
        const formatted = String(tNum).padStart(2, '0');
        const tbl = (db.tables || []).find((t) => t.tableNumber === formatted);
        if (tbl) {
          tbl.status = 'OCCUPIED';
          tbl.activeOrderId = kotId;
        }
      });
    }

    // Automatically create or update customer account when name and mobile appear in genuine order
    let customerAccount = null;
    if (guestPhone && guestPhone.trim()) {
      customerAccount = recordCustomerTransaction({
        name: guestName.trim(),
        phone: guestPhone.trim(),
        email: guestEmail ? guestEmail.trim() : '',
        order: newOrder,
        amount: totalAmount,
      });
    }

    await saveDbAsync(db);

    // Broadcast real-time event to all connected waiter & KDS devices
    try {
      if (initialStatus === 'cooking') {
        broadcast({
          type: 'ORDER_STATUS_UPDATE',
          orderId: newOrder.orderId,
          table: newOrder.tables[0] || 'Takeaway',
          newStatus: 'cooking',
          verifiedBy: newOrder.verifiedBy,
          itemCount: newOrder.items.length,
          totalAmount: newOrder.totalAmount,
          message: `🔥 Direct KOT fired for Table #${newOrder.tables[0]} by ${newOrder.verifiedBy} (${newOrder.items.length} items)!`,
        });
      } else {
        broadcast({
          type: 'NEW_ORDER_OTP_PENDING',
          orderId: newOrder.orderId,
          table: newOrder.tables[0] || 'Takeaway',
          guestName: newOrder.guestName,
          guestCount: newOrder.guestCount,
          itemCount: newOrder.items.length,
          totalAmount: newOrder.totalAmount,
          message: `🔔 New order ${newOrder.tables[0] ? `at Table #${newOrder.tables[0]}` : '(Takeaway)'} — ${newOrder.guestName} (${newOrder.items.length} items). OTP pending!`,
        });
      }
    } catch (e) { /* SSE not yet initialized, silent */ }

    return NextResponse.json({
      success: true,
      message: 'Order created successfully. Please provide the OTP to your waiter.',
      order: newOrder,
      customer: customerAccount,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
