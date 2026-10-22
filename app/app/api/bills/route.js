// app/api/bills/route.js - Bill Generation & Aggregation Endpoint
import { NextResponse } from 'next/server';
import { getDb, saveDb, recordCustomerTransaction } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const db = getDb();

    let bills = [...(db.bills || [])];
    if (table) {
      bills = bills.filter((b) => b.tableNumber === String(table).padStart(2, '0'));
    }

    return NextResponse.json({
      success: true,
      bills,
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
    const { tableNumber = '07' } = body;
    const formattedTable = String(tableNumber).padStart(2, '0');

    const db = getDb();
    
    // Find all verified unpaid orders for this table
    const tableOrders = (db.orders || []).filter((o) => {
      const matchesTable = Array.isArray(o.tables)
        ? o.tables.includes(formattedTable)
        : String(o.tableNumber || '').padStart(2, '0') === formattedTable;
      if (!matchesTable) return false;

      const st = (o.status || '').toLowerCase();
      const paySt = (o.paymentStatus || '').toUpperCase();

      // Exclude cancelled orders
      if (st === 'cancelled') return false;

      // Exclude already paid or settled orders
      if (paySt === 'PAID' || st === 'paid' || st === 'paid_settled' || st === 'completed') return false;

      // Exclude orders that belong to an already settled/paid bill
      const ordId = o.orderId || o.id;
      const isAlreadyPaidInBill = (db.bills || []).some(
        (b) => b.paymentStatus === 'PAID' && Array.isArray(b.orderIds) && b.orderIds.includes(ordId)
      );
      if (isAlreadyPaidInBill) return false;

      // Exclude unverified orders if awaiting OTP
      if (st === 'otp_pending' || st === 'pending_otp') return false;

      return true;
    });

    if (tableOrders.length === 0) {
      // Check if orders are still pending OTP
      const pendingOtpOrders = (db.orders || []).filter((o) => {
        const matchesTable = Array.isArray(o.tables)
          ? o.tables.includes(formattedTable)
          : String(o.tableNumber || '').padStart(2, '0') === formattedTable;
        const st = (o.status || '').toLowerCase();
        return matchesTable && (st === 'otp_pending' || st === 'pending_otp');
      });

      if (pendingOtpOrders.length > 0) {
        return NextResponse.json(
          { success: false, error: `Orders for Table #${formattedTable} are awaiting Captain OTP verification before bill generation.` },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: `No active unpaid orders found for Table #${formattedTable}` },
        { status: 404 }
      );
    }

    // Aggregate all items from eligible unpaid orders
    const aggregatedItems = [];
    tableOrders.forEach((ord) => {
      (ord.items || []).forEach((item) => {
        const existing = aggregatedItems.find((it) => it.title === item.title);
        if (existing) {
          existing.quantity += item.quantity || 1;
        } else {
          aggregatedItems.push({
            title: item.title,
            price: item.price,
            quantity: item.quantity || 1,
          });
        }
      });
    });

    const subtotal = aggregatedItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
    const cgst = Math.round(subtotal * 0.025 * 100) / 100; // 2.5% CGST
    const sgst = Math.round(subtotal * 0.025 * 100) / 100; // 2.5% SGST
    const totalAmount = Math.round((subtotal + cgst + sgst) * 100) / 100;

    // Check if an active PENDING bill already exists for this table
    const existingPendingBill = (db.bills || []).find(
      (b) => b.tableNumber === formattedTable && b.paymentStatus === 'PENDING'
    );

    if (existingPendingBill) {
      existingPendingBill.orderIds = tableOrders.map((o) => o.orderId || o.id);
      existingPendingBill.guestName = tableOrders[0]?.guestName || existingPendingBill.guestName;
      existingPendingBill.guestPhone = tableOrders[0]?.guestPhone || existingPendingBill.guestPhone;
      existingPendingBill.items = aggregatedItems;
      existingPendingBill.subtotal = subtotal;
      existingPendingBill.cgst = cgst;
      existingPendingBill.sgst = sgst;
      existingPendingBill.totalAmount = totalAmount;
      existingPendingBill.updatedAt = new Date().toISOString();

      tableOrders.forEach((o) => {
        o.billNumber = existingPendingBill.billNumber;
      });

      saveDb(db);

      return NextResponse.json({
        success: true,
        message: `Active pending bill ${existingPendingBill.billNumber} updated for Table #${formattedTable}`,
        bill: existingPendingBill,
      });
    }

    const billNumber = `SGR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBill = {
      billNumber,
      tableNumber: formattedTable,
      orderIds: tableOrders.map((o) => o.orderId || o.id),
      guestName: tableOrders[0]?.guestName || 'Valued Diner',
      guestPhone: tableOrders[0]?.guestPhone || '',
      items: aggregatedItems,
      subtotal,
      cgst,
      sgst,
      totalAmount,
      paymentStatus: 'PENDING', // 'PENDING' | 'PAID'
      settlementMode: null, // 'UPI' | 'CASH' | 'CARD'
      createdAt: new Date().toISOString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    tableOrders.forEach((o) => {
      o.billNumber = billNumber;
    });

    if (!db.bills) db.bills = [];
    db.bills.unshift(newBill);

    // Update table state
    const table = (db.tables || []).find((t) => t.tableNumber === formattedTable);
    if (table) {
      table.status = 'BILL_GENERATED';
    }

    // Automatically create or link customer account
    if (newBill.guestPhone) {
      recordCustomerTransaction({
        name: newBill.guestName,
        phone: newBill.guestPhone,
        bill: newBill,
        amount: totalAmount,
      });
    }

    saveDb(db);

    return NextResponse.json({
      success: true,
      message: `Bill ${billNumber} generated for Table #${formattedTable}`,
      bill: newBill,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
