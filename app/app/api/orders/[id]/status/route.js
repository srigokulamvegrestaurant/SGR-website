// app/api/orders/[id]/status/route.js - KDS Kitchen Status Advancement
// Lets kitchen staff or captain push order through: cooking → plating → ready → served
import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { broadcast } from '@/app/api/events/route';

const STATUS_FLOW = ['otp_pending', 'cooking', 'plating', 'ready', 'served', 'completed'];

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, staffName = 'Kitchen Staff' } = body;

    if (!STATUS_FLOW.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status: ${status}. Must be one of: ${STATUS_FLOW.join(', ')}` },
        { status: 400 }
      );
    }

    const db = getDb();
    const order = (db.orders || []).find((o) => o.orderId === id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order ${id} not found` },
        { status: 404 }
      );
    }

    const prevStatus = order.status;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    order.lastUpdatedBy = staffName;

    // Update KOT statuses if advancing to served
    if (status === 'served' || status === 'ready') {
      (db.kots || []).forEach((kot) => {
        if (kot.orderId === id) {
          kot.status = status === 'ready' ? 'READY' : 'SERVED';
        }
      });
    }

    saveDb(db);

    // Broadcast status change to guest phone tracker and waiter devices
    const statusEmojis = {
      cooking: '🔥',
      plating: '🍽️',
      ready: '✅',
      served: '🥞',
      completed: '🎉',
    };

    const statusMessages = {
      cooking: `Your food is now cooking on the iron tawa at Sri Gokulam! (~10 mins)`,
      plating: `Your dish is being plated beautifully — arriving soon!`,
      ready: `✅ Food READY! Your waiter is bringing your dishes to Table #${order.tables[0]}.`,
      served: `Your food has been served. Enjoy your authentic Chettinad meal! 🙏`,
      completed: `Thank you for dining with Sri Gokulam, ${order.guestName}. Come again!`,
    };

    try {
      broadcast({
        type: 'ORDER_STATUS_UPDATE',
        orderId: id,
        table: order.tables[0],
        guestName: order.guestName,
        prevStatus,
        newStatus: status,
        emoji: statusEmojis[status] || '🍽️',
        message: statusMessages[status] || `Order status updated to ${status}`,
        updatedBy: staffName,
      });
    } catch (e) { /* silent */ }

    return NextResponse.json({
      success: true,
      message: `Order ${id} advanced from '${prevStatus}' to '${status}'`,
      order,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
