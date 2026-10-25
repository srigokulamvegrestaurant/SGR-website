// app/api/customer/reservations/route.js - Customer Table Reservation API
import { NextResponse } from 'next/server';
import {
  getDb,
  getDbAsync,
  saveDb,
  saveDbAsync,
  validateCustomerSession,
  normalizePhoneNumber,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in to view your reservations.' },
        { status: 401 }
      );
    }

    const auth = validateCustomerSession(token);
    if (!auth || !auth.customer) {
      return NextResponse.json(
        { success: false, error: 'Session expired or invalid. Please sign in again.' },
        { status: 401 }
      );
    }

    const targetPhone = normalizePhoneNumber(auth.customer.phone);
    const targetName = (auth.customer.name || '').trim().toLowerCase();
    const db = await getDbAsync();
    const allReservations = db.reservations || [];

    const filtered = allReservations.filter((r) => {
      const rPhone = normalizePhoneNumber(r.phone);
      if (targetPhone && rPhone && rPhone === targetPhone) return true;
      if (targetName && targetName.length >= 3 && r.guestName && r.guestName.toLowerCase().includes(targetName)) return true;
      return false;
    });

    return NextResponse.json({
      success: true,
      reservations: filtered,
    });
  } catch (err) {
    console.error('Customer reservations GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch reservations' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      guestName,
      phone,
      partySize = 2,
      date,
      timeSlot = '01:00 PM',
      section = 'ANY',
      specialRequests = '',
    } = body;

    if (!guestName || !guestName.trim()) {
      return NextResponse.json({ success: false, error: 'Please enter guest name' }, { status: 400 });
    }

    const cleanPhone = (phone || '').replace(/[^\d]/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json({ success: false, error: 'Please enter a valid 10-digit mobile number' }, { status: 400 });
    }

    const db = await getDbAsync();
    db.reservations = db.reservations || [];
    db.tables = db.tables || [];

    const numGuests = Number(partySize) || 2;

    // Find best matching table
    let candidateTables = db.tables.filter((t) => t.status === 'AVAILABLE' && (t.capacity || 4) >= numGuests);
    if (section && section !== 'ANY') {
      const sectionFiltered = candidateTables.filter((t) => (t.section || '').toUpperCase() === section.toUpperCase());
      if (sectionFiltered.length > 0) {
        candidateTables = sectionFiltered;
      }
    }

    // Sort by smallest suitable capacity to optimize seating
    candidateTables.sort((a, b) => (a.capacity || 4) - (b.capacity || 4));

    let assignedTable = candidateTables[0] || db.tables.find(t => t.status === 'AVAILABLE') || db.tables[0];
    const tableNumber = assignedTable ? String(assignedTable.tableNumber) : '01';
    const assignedSection = assignedTable?.section || section || 'AC_MAIN';

    const newRes = {
      id: `res_${Date.now()}`,
      guestName: guestName.trim(),
      phone: cleanPhone,
      partySize: numGuests,
      tableNumber,
      section: assignedSection,
      date: date || new Date().toISOString().split('T')[0],
      timeSlot,
      status: 'CONFIRMED',
      specialRequests: (specialRequests || '').trim(),
      createdAt: new Date().toISOString(),
    };

    db.reservations.unshift(newRes);

    if (assignedTable && assignedTable.status === 'AVAILABLE') {
      assignedTable.status = 'RESERVED';
    }

    await saveDbAsync(db);

    return NextResponse.json({
      success: true,
      message: `Table #${tableNumber} successfully reserved for ${guestName.trim()}!`,
      reservation: newRes,
    });
  } catch (err) {
    console.error('Customer reservations POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to process table reservation' }, { status: 500 });
  }
}
