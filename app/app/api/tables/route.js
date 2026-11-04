// app/api/tables/route.js - Table Management & Status Endpoint
import { NextResponse } from 'next/server';
import { getDbAsync, saveDbAsync } from '@/lib/db';
import { broadcast } from '@/app/api/events/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const db = await getDbAsync();
    const tables = Array.isArray(db.tables) ? db.tables : [];
    const floorPlans = Array.isArray(db.floor_plans) ? db.floor_plans : [];
    const menu = (Array.isArray(db.menu) ? db.menu : []).filter(d => d.status !== 'ARCHIVED');
    const orders = (Array.isArray(db.orders) ? db.orders : []).filter(
      (o) => o.status !== 'CANCELLED' && o.status !== 'PAID_SETTLED' && o.status !== 'completed'
    );

    return NextResponse.json(
      {
        success: true,
        tables,
        floorPlans,
        menu,
        orders,
        summary: {
          total: tables.length,
          available: tables.filter((t) => t.status === 'AVAILABLE').length,
          occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
          billRequested: tables.filter((t) => t.status === 'BILL_REQUESTED').length,
          cleaning: tables.filter((t) => t.status === 'CLEANING').length,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
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
    const { tableNumber, status } = body;

    if (!tableNumber) {
      return NextResponse.json(
        { success: false, error: 'Table number is required' },
        { status: 400 }
      );
    }

    const db = await getDbAsync();
    const tables = Array.isArray(db.tables) ? db.tables : [];
    const targetPadded = String(tableNumber).padStart(2, '0');
    const targetRaw = String(tableNumber);
    const tableIndex = tables.findIndex(
      (t) => t.tableNumber === targetPadded || t.tableNumber === targetRaw
    );

    if (tableIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Table #${tableNumber} not found` },
        { status: 404 }
      );
    }

    if (status) {
      tables[tableIndex].status = status;
      tables[tableIndex].updatedAt = new Date().toISOString();
      if (status === 'AVAILABLE') {
        tables[tableIndex].activeOrderId = null;
      }
    }

    db.tables = tables;
    await saveDbAsync(db);

    try {
      broadcast({
        type: 'TABLE_STATUS_UPDATED',
        tableNumber: tables[tableIndex].tableNumber,
        status: tables[tableIndex].status,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      table: tables[tableIndex],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

