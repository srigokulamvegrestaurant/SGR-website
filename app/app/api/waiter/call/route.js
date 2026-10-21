// app/api/waiter/call/route.js - Guest-to-Waiter Alert System
// Allows guests to ring their floor captain from the table's QR screen
import { NextResponse } from 'next/server';
import { broadcast } from '@/app/api/events/route';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      tableNumber = '07',
      guestName = 'Guest',
      requestType = 'GENERAL', // 'GENERAL' | 'WATER' | 'EXTRA_NAPKINS' | 'HELP' | 'CHECK_OUT'
      note = '',
    } = body;

    const formattedTable = String(tableNumber).padStart(2, '0');

    const requestEmoji = {
      GENERAL: '🛎️',
      WATER: '💧',
      EXTRA_NAPKINS: '🧻',
      HELP: '🆘',
      CHECK_OUT: '🧾',
    }[requestType] || '🛎️';

    const alertPayload = {
      type: 'WAITER_CALL',
      tableNumber: formattedTable,
      guestName,
      requestType,
      note,
      message: `${requestEmoji} ${guestName} at Table #${formattedTable} needs attention: ${requestType.replace('_', ' ')}${note ? ` — "${note}"` : ''}`,
      timestamp: new Date().toISOString(),
    };

    // Push live alert to all waiter devices
    broadcast(alertPayload);

    return NextResponse.json({
      success: true,
      message: `Floor captain has been notified for Table #${formattedTable}. They will arrive shortly.`,
      alert: alertPayload,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
