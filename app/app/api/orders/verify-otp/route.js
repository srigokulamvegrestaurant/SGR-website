// app/api/orders/verify-otp/route.js - Waiter OTP Authorization Endpoint
import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { broadcast } from '@/app/api/events/route';

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, tableNumber, table, otp, staffName = 'Captain Murugan' } = body;

    if (!otp || (!orderId && !tableNumber && !table)) {
      return NextResponse.json(
        { success: false, error: 'Order ID or Table Number and 4-Digit OTP are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const tNum = String(tableNumber || table || '').padStart(2, '0');
    const order = (db.orders || []).find((o) => 
      (orderId && (o.orderId === orderId || o.id === orderId)) ||
      (tNum && (o.tableNumber === tNum || o.tables?.includes(tNum)))
    );

    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order not found for specified table or order ID` },
        { status: 404 }
      );
    }

    // Verify OTP code match
    if (String(order.otp).trim() !== String(otp).trim()) {
      return NextResponse.json(
        { success: false, error: 'Incorrect OTP! Please check the 4 digits displayed on the guest phone.' },
        { status: 400 }
      );
    }

    // Transition state from otp_pending to cooking
    order.status = 'cooking';
    order.verifiedBy = staffName;
    order.verifiedAt = new Date().toISOString();

    // Generate KOT tickets for kitchen stations
    const stations = ['TIFFIN', 'MEALS_GRAVY', 'BEVERAGES'];
    stations.forEach((st) => {
      const stationItems = order.stationRouting ? order.stationRouting[st] : [];
      if (stationItems && stationItems.length > 0) {
        const kotTicket = {
          id: `KOT-${order.orderId}-${st}`,
          orderId: order.orderId,
          table: order.tables[0],
          station: st,
          items: stationItems,
          guestName: order.guestName,
          status: 'PREPARING',
          cookingNotes: order.cookingNotes,
          timestamp: new Date().toISOString(),
        };
        if (!db.kots) db.kots = [];
        db.kots.push(kotTicket);
      }
    });

    saveDb(db);

    // Broadcast verified event to guest phone tracker and kitchen display
    try {
      broadcast({
        type: 'ORDER_OTP_VERIFIED',
        orderId: order.orderId,
        table: order.tables[0],
        guestName: order.guestName,
        verifiedBy: staffName,
        message: `✅ Order ${order.orderId} at Table #${order.tables[0]} authorized by ${staffName}. KOT fired to kitchen!`,
      });
      broadcast({
        type: 'KITCHEN_KOT_FIRED',
        orderId: order.orderId,
        table: order.tables[0],
        stations: db.kots.filter((k) => k.orderId === order.orderId).map((k) => k.station),
        message: `🔥 KOT dispatched for Table #${order.tables[0]} to kitchen stations`,
      });
    } catch (e) { /* silent */ }

    return NextResponse.json({
      success: true,
      message: 'OTP Verified successfully! Order sent to kitchen stations.',
      order,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
