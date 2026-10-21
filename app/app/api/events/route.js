// app/api/events/route.js - Server-Sent Events (SSE) Real-Time Push Endpoint
// Broadcasts live order events to subscribed clients (waiter tablets, guest phones)
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// In-memory event bus (works within a single Node.js process)
// In production, swap for Redis Pub/Sub or Supabase Realtime
let subscribers = new Map(); // subscriberId -> { controller, role }
let eventQueue = []; // Persisted brief event log for catch-up

export function broadcast(event) {
  const payload = JSON.stringify({
    ...event,
    timestamp: new Date().toISOString(),
  });
  eventQueue.push(payload);
  if (eventQueue.length > 50) eventQueue = eventQueue.slice(-50); // Keep last 50 events

  subscribers.forEach((sub) => {
    try {
      sub.controller.enqueue(`data: ${payload}\n\n`);
    } catch (e) {
      subscribers.delete(sub.id);
    }
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role') || 'guest'; // 'waiter' | 'guest' | 'kitchen'
  const since = parseInt(searchParams.get('since') || '0', 10);

  const subscriberId = `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Register subscriber
      subscribers.set(subscriberId, { controller, id: subscriberId, role });

      // Send initial welcome ping
      const welcome = `data: ${JSON.stringify({
        type: 'CONNECTED',
        subscriberId,
        role,
        message: 'Sri Gokulam Real-Time Event Stream Connected',
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(welcome));

      // Flush pending orders on connect for waiter role
      if (role === 'waiter') {
        const db = getDb();
        const pending = (db.orders || []).filter((o) => o.status === 'otp_pending');
        if (pending.length > 0) {
          const catchup = `data: ${JSON.stringify({
            type: 'CATCH_UP',
            pendingCount: pending.length,
            orders: pending.map((o) => ({
              orderId: o.orderId,
              table: o.tables[0],
              guestName: o.guestName,
              itemCount: o.items.length,
              total: o.totalAmount,
            })),
            message: `${pending.length} order(s) awaiting OTP authorization`,
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(catchup));
        }
      }

      // Heartbeat every 20 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'PING', ts: Date.now() })}\n\n`)
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, 20000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        subscribers.delete(subscriberId);
        clearInterval(heartbeat);
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      subscribers.delete(subscriberId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
