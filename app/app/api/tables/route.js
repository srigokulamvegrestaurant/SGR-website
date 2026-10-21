// app/api/tables/route.js - Table Management & Status Endpoint
import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    return NextResponse.json({
      success: true,
      tables: db.tables,
      summary: {
        total: db.tables.length,
        available: db.tables.filter((t) => t.status === 'AVAILABLE').length,
        occupied: db.tables.filter((t) => t.status === 'OCCUPIED').length,
        cleaning: db.tables.filter((t) => t.status === 'CLEANING').length,
      },
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
    const { tableNumber, status } = body;

    if (!tableNumber) {
      return NextResponse.json(
        { success: false, error: 'Table number is required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const tableIndex = db.tables.findIndex((t) => t.tableNumber === String(tableNumber).padStart(2, '0'));

    if (tableIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Table #${tableNumber} not found` },
        { status: 404 }
      );
    }

    if (status) {
      db.tables[tableIndex].status = status;
    }

    saveDb(db);

    return NextResponse.json({
      success: true,
      table: db.tables[tableIndex],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
