// app/api/admin/floor/route.js - Comprehensive Table Management, Digital Floor Plan & Session API
import { NextResponse } from 'next/server';
import {
  getDb,
  getDbAsync,
  saveDb,
  saveDbAsync,
  categorizeStation,
  generateKotReceiptText,
  DEFAULT_FLOOR_PLANS,
  DEFAULT_TABLES,
} from '@/lib/db';
import { broadcast } from '@/app/api/events/route';
import { generateQrSvg, generateStandeeCardHtml } from '@/lib/qrGenerator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Resolve production base URL so QR codes work across mobile devices on any network
export function getBaseUrl(request) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  if (request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      return `${proto}://${host}`;
    }
  }
  return 'https://srigokulamvegrestaurant.com';
}

export async function GET(request) {
  try {
    const db = await getDbAsync();
    const tables = (Array.isArray(db.tables) && db.tables.length > 0) ? db.tables : DEFAULT_TABLES;
    const floorPlans = (Array.isArray(db.floor_plans) && db.floor_plans.length > 0) ? db.floor_plans : DEFAULT_FLOOR_PLANS;
    const orders = db.orders || [];
    const kots = db.kots || [];
    const reservations = db.reservations || [];
    const waitlist = db.waitlist || [];
    const sessionLogs = db.session_logs || [];

    const now = Date.now();
    const baseUrl = getBaseUrl(request);

    // Augment tables with active orders, multi-customer sessions, and live cooking states
    const augmented = tables.map(tbl => {
      const activeOrders = orders.filter(o => 
        (String(o.tableNumber) === String(tbl.tableNumber) || (o.tables && o.tables.includes(String(tbl.tableNumber)))) &&
        o.status !== 'CANCELLED' && o.status !== 'PAID_SETTLED'
      );

      const tableKots = kots.filter(k => 
        (String(k.tableNumber) === String(tbl.tableNumber) || String(k.table) === String(tbl.tableNumber)) &&
        k.status !== 'CANCELLED' && k.status !== 'SERVED'
      );

      let totalAmount = 0;
      let oldestOrderTime = null;
      activeOrders.forEach(o => {
        (o.items || []).forEach(it => {
          totalAmount += (it.price || 0) * (it.quantity || 1);
        });
        if (!oldestOrderTime || new Date(o.createdAt) < new Date(oldestOrderTime)) {
          oldestOrderTime = o.createdAt;
        }
      });

      const diningDurationMinutes = oldestOrderTime
        ? Math.floor((now - new Date(oldestOrderTime).getTime()) / 60000)
        : (tbl.occupiedAt ? Math.floor((now - new Date(tbl.occupiedAt).getTime()) / 60000) : 0);

      // Multiple customer breakdown at this table
      const guests = [];
      activeOrders.forEach(o => {
        const gName = o.guestName || o.customerName || 'Walk-in Guest';
        if (!guests.some(g => g.name === gName)) {
          guests.push({
            name: gName,
            orderId: o.id || o.orderId,
            itemsCount: (o.items || []).length,
            subtotal: (o.items || []).reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0),
            otpCode: o.otpCode || o.otp,
            otpStatus: o.otpStatus || (o.status === 'PENDING_OTP' ? 'PENDING' : 'VERIFIED'),
          });
        }
      });

      const unverifiedQrCount = activeOrders.filter(o => o.status === 'PENDING_OTP' || o.otpStatus === 'PENDING').length;
      const preparingCount = tableKots.filter(k => k.status === 'PREPARING' || k.status === 'ACCEPTED').length;
      const readyCount = tableKots.filter(k => k.status === 'READY').length;

      return {
        ...tbl,
        shape: tbl.shape || (tbl.capacity >= 6 ? 'RECTANGLE' : (tbl.capacity === 2 ? 'ROUND' : 'SQUARE')),
        assignedWaiter: tbl.assignedWaiter || (tbl.section === 'AC_HALL' ? 'Rajan (POS Cashier)' : 'Murugan (Floor Captain)'),
        activeOrdersCount: activeOrders.length,
        currentBillSubtotal: totalAmount,
        diningDurationMinutes,
        guestNames: guests.map(g => g.name).join(', ') || (tbl.status === 'OCCUPIED' ? 'Dine-In Guests' : ''),
        guests,
        activeOrders,
        tableKots,
        orderRounds: tableKots.length || (activeOrders.length ? 1 : 0),
        unverifiedQrCount,
        preparingCount,
        readyCount,
        billRequested: tbl.status === 'BILL_REQUESTED' || tbl.billRequested === true,
        qrUrl: `${baseUrl}/?table=${tbl.tableNumber}&section=${tbl.section || 'GROUND_FLOOR'}`,
      };
    });

    const sections = {};
    floorPlans.forEach(fp => {
      sections[fp.id] = augmented.filter(t => t.section === fp.id);
    });
    // Ensure legacy fallback sections are populated if tables exist
    augmented.forEach(t => {
      if (t.section && !sections[t.section]) {
        sections[t.section] = augmented.filter(tbl => tbl.section === t.section);
      }
    });

    const stats = {
      totalTables: tables.length,
      available: augmented.filter(t => t.status === 'AVAILABLE').length,
      reserved: augmented.filter(t => t.status === 'RESERVED').length,
      occupied: augmented.filter(t => t.status === 'OCCUPIED').length,
      billRequested: augmented.filter(t => t.status === 'BILL_REQUESTED').length,
      billGenerated: augmented.filter(t => t.status === 'BILL_GENERATED').length,
      paymentPending: augmented.filter(t => t.status === 'PAYMENT_PENDING').length,
      paid: augmented.filter(t => t.status === 'PAID').length,
      cleaning: augmented.filter(t => t.status === 'CLEANING').length,
    };

    const staffWaiters = (db.users || [])
      .filter(u => u.role === 'WAITER' || u.role === 'CASHIER' || u.role === 'STORE_MANAGER')
      .map(u => u.fullName || u.name);
    const waiters = staffWaiters.length > 0 ? staffWaiters : ['Murugan (Floor Captain)', 'Rajan (POS Cashier)', 'Karthikeyan (Manager)'];

    return NextResponse.json(
      {
        success: true,
        stats,
        sections,
        floorPlans,
        tables: augmented,
        reservations,
        waitlist,
        sessionLogs,
        waiters,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Floor GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;
    const db = await getDbAsync();
    db.floor_plans = (Array.isArray(db.floor_plans) && db.floor_plans.length > 0) ? db.floor_plans : JSON.parse(JSON.stringify(DEFAULT_FLOOR_PLANS));
    db.tables = (Array.isArray(db.tables) && db.tables.length > 0) ? db.tables : JSON.parse(JSON.stringify(DEFAULT_TABLES));
    db.reservations = db.reservations || [];
    db.waitlist = db.waitlist || [];
    db.session_logs = db.session_logs || [];
    db.kots = db.kots || [];

    // ─── 0A. Create New Floor Plan (Zone / Section) ───
    if (action === 'ADD_FLOOR_PLAN') {
      const { id, name, tamilName, icon, description, floorLevel } = body;
      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, error: 'Floor plan name is required' }, { status: 400 });
      }
      const cleanName = name.trim();
      const planId = (id || cleanName.toUpperCase().replace(/[^A-Z0-9]/g, '_')).trim();

      if (db.floor_plans.some(fp => fp.id === planId)) {
        return NextResponse.json({ success: false, error: `Floor plan '${cleanName}' already exists` }, { status: 400 });
      }

      const newPlan = {
        id: planId,
        name: cleanName,
        tamilName: tamilName || '',
        icon: icon || '🏢',
        description: description || '',
        floorLevel: Number(floorLevel) || 0,
        createdAt: new Date().toISOString(),
      };

      db.floor_plans.push(newPlan);
      await saveDbAsync(db);

      try {
        broadcast('FLOOR_PLAN_CREATED', { floorPlan: newPlan });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Floor plan '${cleanName}' created and saved permanently!`,
        floorPlan: newPlan,
        floorPlans: db.floor_plans,
      });
    }

    // ─── 0B. Delete Floor Plan with Confirmation ───
    if (action === 'DELETE_FLOOR_PLAN') {
      const { floorPlanId, managerPin } = body;
      if (!floorPlanId) {
        return NextResponse.json({ success: false, error: 'Floor plan ID is required' }, { status: 400 });
      }

      if (managerPin && managerPin !== '1234' && managerPin !== '4321') {
        return NextResponse.json({ success: false, error: 'Invalid Manager PIN' }, { status: 403 });
      }

      const planIndex = db.floor_plans.findIndex(fp => fp.id === floorPlanId);
      if (planIndex === -1) {
        return NextResponse.json({ success: false, error: 'Floor plan not found' }, { status: 404 });
      }

      const deletedPlan = db.floor_plans.splice(planIndex, 1)[0];
      const removedTables = (db.tables || []).filter(t => t.section === floorPlanId);
      db.tables = (db.tables || []).filter(t => t.section !== floorPlanId);

      await saveDbAsync(db);

      try {
        broadcast('FLOOR_PLAN_DELETED', {
          floorPlanId,
          deletedPlan,
          removedTablesCount: removedTables.length,
        });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Floor plan '${deletedPlan.name}' and ${removedTables.length} table(s) deleted successfully`,
        deletedPlan,
        floorPlans: db.floor_plans,
        tables: db.tables,
      });
    }

    // ─── 1. Update Table Status (Operational Lifecycle) ───
    if (action === 'UPDATE_STATUS') {
      const { tableNumber, newStatus } = body;
      const table = db.tables.find(t => String(t.tableNumber) === String(tableNumber));
      if (!table) return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });

      const prevStatus = table.status;
      table.status = newStatus;

      if (newStatus === 'OCCUPIED') {
        if (!table.activeSessionId) {
          table.activeSessionId = `ses_tbl${table.tableNumber}_${Date.now()}`;
        }
        table.occupiedAt = new Date().toISOString();
        table.billRequested = false;
      } else if (newStatus === 'AVAILABLE') {
        table.activeSessionId = null;
        table.activeOrderId = null;
        table.billRequested = false;
        table.occupiedAt = null;
        table.billNumber = null;
        if (table.isMerged) {
          table.isMerged = false;
          table.mergedWith = [];
        }
      } else if (newStatus === 'BILL_REQUESTED') {
        table.billRequested = true;
        table.billRequestedAt = new Date().toISOString();
      } else if (newStatus === 'BILL_GENERATED') {
        table.billNumber = table.billNumber || `SGR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      await saveDbAsync(db);

      try {
        broadcast('TABLE_STATUS_CHANGED', {
          tableNumber: table.tableNumber,
          prevStatus,
          newStatus,
          section: table.section,
        });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Table #${table.tableNumber} status changed to ${newStatus}`,
        table,
      });
    }

    // ─── 2. Assign / Reassign Waiter (Requirement 9) ───
    if (action === 'ASSIGN_WAITER') {
      const { tableNumber, waiterName } = body;
      const table = db.tables.find(t => String(t.tableNumber) === String(tableNumber));
      if (!table) return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });

      table.assignedWaiter = waiterName;
      await saveDbAsync(db);

      return NextResponse.json({
        success: true,
        message: `Assigned ${waiterName} to Table #${table.tableNumber}`,
        table,
      });
    }

    // ─── 3. Add Table (Requirement 3) ───
    if (action === 'ADD_TABLE') {
      const { tableNumber, capacity, section, shape, assignedWaiter } = body;
      if (!tableNumber || !capacity) {
        return NextResponse.json({ success: false, error: 'Table number and seating capacity are required' }, { status: 400 });
      }

      const existing = db.tables.find(t => String(t.tableNumber) === String(tableNumber));
      if (existing) {
        return NextResponse.json({ success: false, error: `Table #${tableNumber} already exists` }, { status: 400 });
      }

      const newTable = {
        id: `tbl_${Date.now()}`,
        tableNumber: String(tableNumber).padStart(2, '0'),
        capacity: Number(capacity) || 4,
        section: section || 'GROUND_FLOOR',
        shape: shape || (Number(capacity) >= 6 ? 'RECTANGLE' : (Number(capacity) === 2 ? 'ROUND' : 'SQUARE')),
        status: 'AVAILABLE',
        assignedWaiter: assignedWaiter || 'Murugan (Floor Captain)',
        activeOrderId: null,
        activeSessionId: null,
      };

      db.tables.push(newTable);
      await saveDbAsync(db);

      return NextResponse.json({
        success: true,
        message: `Table #${newTable.tableNumber} created successfully`,
        table: newTable,
      });
    }

    // ─── 4. Edit Table Config (Requirement 3) ───
    if (action === 'EDIT_TABLE') {
      const { tableId, tableNumber, capacity, section, shape, assignedWaiter } = body;
      const table = db.tables.find(t => t.id === tableId || String(t.tableNumber) === String(tableNumber));
      if (!table) return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });

      if (capacity) table.capacity = Number(capacity);
      if (section) table.section = section;
      if (shape) table.shape = shape;
      if (assignedWaiter) table.assignedWaiter = assignedWaiter;

      await saveDbAsync(db);

      return NextResponse.json({
        success: true,
        message: `Table #${table.tableNumber} updated`,
        table,
      });
    }

    // ─── 5. Delete / Deactivate Table (Requirement 3 & 20) ───
    if (action === 'DELETE_TABLE') {
      const { tableNumber, managerPin } = body;
      if (managerPin !== '1234') {
        return NextResponse.json({ success: false, error: 'Invalid Manager PIN for table deletion' }, { status: 403 });
      }

      const index = db.tables.findIndex(t => String(t.tableNumber) === String(tableNumber));
      if (index === -1) return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });

      const deleted = db.tables.splice(index, 1)[0];
      await saveDbAsync(db);

      return NextResponse.json({
        success: true,
        message: `Table #${deleted.tableNumber} removed from floor plan`,
      });
    }

    // ─── 6. Table Merge and Split (Requirement 15) ───
    if (action === 'MERGE_TABLES') {
      const { primaryTableNumber, joinTableNumbers } = body; // e.g. '03', ['04']
      const primary = db.tables.find(t => String(t.tableNumber) === String(primaryTableNumber));
      if (!primary) return NextResponse.json({ success: false, error: 'Primary table not found' }, { status: 404 });

      primary.isMerged = true;
      primary.mergedWith = joinTableNumbers;
      primary.status = 'OCCUPIED';
      primary.activeSessionId = primary.activeSessionId || `ses_merge_${primary.tableNumber}_${Date.now()}`;

      // Mark joined tables
      joinTableNumbers.forEach(tNum => {
        const secondary = db.tables.find(t => String(t.tableNumber) === String(tNum));
        if (secondary) {
          secondary.isMerged = true;
          secondary.mergedInto = primary.tableNumber;
          secondary.status = 'OCCUPIED';
          secondary.activeSessionId = primary.activeSessionId;
        }
      });

      await saveDbAsync(db);

      return NextResponse.json({
        success: true,
        message: `Tables #${primaryTableNumber} and #${joinTableNumbers.join(', #')} merged successfully`,
      });
    }

    if (action === 'SPLIT_TABLES') {
      const { tableNumber } = body;
      const primary = db.tables.find(t => String(t.tableNumber) === String(tableNumber));
      if (!primary) return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });

      const joined = primary.mergedWith || [];
      primary.isMerged = false;
      primary.mergedWith = [];

      joined.forEach(tNum => {
        const sec = db.tables.find(t => String(t.tableNumber) === String(tNum));
        if (sec) {
          sec.isMerged = false;
          sec.mergedInto = null;
          sec.status = 'AVAILABLE';
          sec.activeSessionId = null;
        }
      });

      await saveDbAsync(db);

      return NextResponse.json({
        success: true,
        message: `Tables split successfully`,
      });
    }

    // ─── 7. Bill Management & Payment Settlement (Requirements 11, 12, 16) ───
    if (action === 'REQUEST_BILL') {
      const { tableNumber } = body;
      const table = db.tables.find(t => String(t.tableNumber) === String(tableNumber));
      if (!table) return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });

      table.status = 'BILL_REQUESTED';
      table.billRequested = true;
      table.billRequestedAt = new Date().toISOString();
      await saveDbAsync(db);

      try {
        broadcast('BILL_REQUESTED', { tableNumber: table.tableNumber });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Bill requested for Table #${table.tableNumber}`,
      });
    }

    if (action === 'GENERATE_BILL') {
      const { tableNumber, subtotal, discount = 0 } = body;
      const table = db.tables.find(t => String(t.tableNumber) === String(tableNumber));
      if (!table) return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });

      const billNo = `SGR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const cgst = Number(((subtotal - discount) * 0.025).toFixed(2));
      const sgst = Number(((subtotal - discount) * 0.025).toFixed(2));
      const grandTotal = Math.round(subtotal - discount + cgst + sgst);

      table.status = 'BILL_GENERATED';
      table.billNumber = billNo;
      table.billDetails = {
        billNumber: billNo,
        subtotal,
        discount,
        cgst,
        sgst,
        grandTotal,
        generatedAt: new Date().toISOString(),
      };

      await saveDbAsync(db);

      return NextResponse.json({
        success: true,
        message: `Bill #${billNo} generated for Table #${table.tableNumber}`,
        bill: table.billDetails,
      });
    }

    if (action === 'SETTLE_PAYMENT') {
      const { tableNumber, paymentMethod = 'UPI', transactionRef = '', amountPaid, guestName = 'Dine-In Guest' } = body;
      const table = db.tables.find(t => String(t.tableNumber) === String(tableNumber));
      if (!table) return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });

      // Archive to session logs (Requirement 17)
      const sessionLog = {
        id: `ses_log_${Date.now()}`,
        tableNumber: table.tableNumber,
        guestName,
        startedAt: table.occupiedAt || new Date(Date.now() - 2400000).toISOString(),
        endedAt: new Date().toISOString(),
        durationMinutes: table.occupiedAt ? Math.floor((Date.now() - new Date(table.occupiedAt).getTime()) / 60000) : 40,
        totalAmount: Number(amountPaid) || table.billDetails?.grandTotal || 0,
        billNumber: table.billNumber || `SGR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        paymentMode: paymentMethod,
        transactionRef: transactionRef || `UPI-${Math.floor(10000000 + Math.random() * 90000000)}`,
        waiterName: table.assignedWaiter || 'Murugan (Floor Captain)',
      };
      db.session_logs.unshift(sessionLog);

      // Auto-transition to CLEANING (Requirement 16)
      table.status = 'CLEANING';
      table.activeSessionId = null;
      table.billRequested = false;
      table.billNumber = null;
      table.billDetails = null;

      await saveDbAsync(db);

      return NextResponse.json({
        success: true,
        message: `Payment of ₹${sessionLog.totalAmount} recorded. Table #${table.tableNumber} marked for cleaning.`,
        sessionLog,
      });
    }

    // ─── 8. Table Reservations (Requirement 13) ───
    if (action === 'RESERVATION_ACTION') {
      const { subAction, reservationData, reservationId } = body;

      if (subAction === 'CREATE') {
        const newRes = {
          id: `res_${Date.now()}`,
          guestName: reservationData.guestName,
          phone: reservationData.phone,
          partySize: Number(reservationData.partySize) || 2,
          tableNumber: reservationData.tableNumber || '01',
          date: reservationData.date || new Date().toISOString().split('T')[0],
          timeSlot: reservationData.timeSlot || '01:00 PM',
          status: 'CONFIRMED',
          specialRequests: reservationData.specialRequests || '',
          createdAt: new Date().toISOString(),
        };
        db.reservations.unshift(newRes);

        // Mark target table as RESERVED
        const targetTable = db.tables.find(t => String(t.tableNumber) === String(newRes.tableNumber));
        if (targetTable && targetTable.status === 'AVAILABLE') {
          targetTable.status = 'RESERVED';
        }

        await saveDbAsync(db);
        return NextResponse.json({ success: true, message: `Reservation confirmed for ${newRes.guestName}`, reservation: newRes });
      }

      if (subAction === 'SEAT') {
        const res = db.reservations.find(r => r.id === reservationId);
        if (!res) return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 });

        res.status = 'SEATED';
        const targetTable = db.tables.find(t => String(t.tableNumber) === String(res.tableNumber));
        if (targetTable) {
          targetTable.status = 'OCCUPIED';
          targetTable.occupiedAt = new Date().toISOString();
          targetTable.activeSessionId = `ses_tbl${targetTable.tableNumber}_${Date.now()}`;
        }
        await saveDbAsync(db);
        return NextResponse.json({ success: true, message: `Seated reservation for ${res.guestName} at Table #${res.tableNumber}` });
      }

      if (subAction === 'CANCEL') {
        const res = db.reservations.find(r => r.id === reservationId);
        if (res) {
          res.status = 'CANCELLED';
          const targetTable = db.tables.find(t => String(t.tableNumber) === String(res.tableNumber));
          if (targetTable && targetTable.status === 'RESERVED') {
            targetTable.status = 'AVAILABLE';
          }
          await saveDbAsync(db);
        }
        return NextResponse.json({ success: true, message: 'Reservation cancelled' });
      }
    }

    // ─── 9. Walk-in Waitlist Management (Requirement 14) ───
    if (action === 'WAITLIST_ACTION') {
      const { subAction, waitlistData, waitlistId, targetTableNumber } = body;

      if (subAction === 'ADD') {
        const newEntry = {
          id: `wait_${Date.now()}`,
          guestName: waitlistData.guestName,
          phone: waitlistData.phone,
          partySize: Number(waitlistData.partySize) || 2,
          preferredSection: waitlistData.preferredSection || 'GROUND_FLOOR',
          notes: waitlistData.notes || '',
          arrivalTime: new Date().toISOString(),
          status: 'WAITING',
        };
        db.waitlist.push(newEntry);
        await saveDbAsync(db);
        return NextResponse.json({ success: true, message: `Added ${newEntry.guestName} to waitlist`, entry: newEntry });
      }

      if (subAction === 'SEAT') {
        const entry = db.waitlist.find(w => w.id === waitlistId);
        if (!entry) return NextResponse.json({ success: false, error: 'Waitlist entry not found' }, { status: 404 });

        entry.status = 'SEATED';
        const targetTable = db.tables.find(t => String(t.tableNumber) === String(targetTableNumber));
        if (targetTable) {
          targetTable.status = 'OCCUPIED';
          targetTable.occupiedAt = new Date().toISOString();
          targetTable.activeSessionId = `ses_tbl${targetTable.tableNumber}_${Date.now()}`;
        }
        await saveDbAsync(db);
        return NextResponse.json({ success: true, message: `Seated waitlist guest ${entry.guestName} at Table #${targetTableNumber}` });
      }

      if (subAction === 'REMOVE') {
        db.waitlist = db.waitlist.filter(w => w.id !== waitlistId);
        await saveDbAsync(db);
        return NextResponse.json({ success: true, message: 'Removed from waitlist' });
      }
    }

    // ─── 10. Add Extra Items to Active Table Session (Requirement 10) ───
    if (action === 'ADD_ITEMS') {
      const { tableNumber, items, guestName = 'Dine-In Guest', waiterName = 'Murugan (Floor Captain)' } = body;
      const table = db.tables.find(t => String(t.tableNumber) === String(tableNumber));
      if (!table) return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });

      // Generate supplementary KOT ticket
      const roundCount = (db.kots || []).filter(k => String(k.tableNumber) === String(tableNumber)).length + 1;
      const kotNumber = `KOT-${tableNumber}-R${roundCount}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newKot = {
        id: `kot_${Date.now()}`,
        kotNumber,
        orderId: `ord_supp_${Date.now()}`,
        tableNumber: String(tableNumber),
        orderType: 'DINE_IN',
        customerName: guestName,
        waiterName,
        station: items[0]?.station || categorizeStation(items[0]?.title || ''),
        status: 'NEW',
        createdAt: new Date().toISOString(),
        isSupplementary: roundCount > 1,
        roundNumber: roundCount,
        items,
        notes: `Supplementary round ${roundCount} order`,
        printCount: 1,
      };

      db.kots.push(newKot);

      // Also add to orders list
      db.orders = db.orders || [];
      db.orders.push({
        id: newKot.orderId,
        tableNumber: String(tableNumber),
        guestName,
        items,
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
      });

      table.status = 'OCCUPIED';
      await saveDbAsync(db);

      try {
        broadcast('NEW_KOT_ORDER', { kot: newKot });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Supplementary KOT #${kotNumber} sent to kitchen!`,
        kot: newKot,
      });
    }

    // ─── 11. QR Code Standee Renderer (Requirement 4) ───
    if (action === 'GET_QR_STANDEE') {
      const { tableNumber, section, capacity, baseUrl: customBaseUrl } = body;
      const baseUrl = customBaseUrl || getBaseUrl(request);
      const qrUrl = `${baseUrl}/?table=${tableNumber}&section=${section || 'GROUND_FLOOR'}`;
      const qrSvg = generateQrSvg(qrUrl, 260);
      const standeeHtml = generateStandeeCardHtml({
        tableNumber,
        section,
        capacity,
        baseUrl,
      });

      return NextResponse.json({
        success: true,
        qrSvg,
        qrUrl,
        standeeHtml,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid floor action' }, { status: 400 });
  } catch (error) {
    console.error('Floor POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
