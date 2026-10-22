// app/api/bills/pay/route.js - Bill Payment & Settlement API
import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      billNumber,
      settlementMode = 'UPI',
      transactionId = `TXN-${Date.now().toString().slice(-8)}`,
    } = body;

    if (!billNumber) {
      return NextResponse.json(
        { success: false, error: 'Bill Number is required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const bill = (db.bills || []).find((b) => b.billNumber === billNumber);

    if (!bill) {
      return NextResponse.json(
        { success: false, error: `Bill ${billNumber} not found` },
        { status: 404 }
      );
    }

    // Mark paid
    bill.paymentStatus = 'PAID';
    bill.settlementMode = settlementMode;
    bill.transactionId = transactionId;
    bill.paidAt = new Date().toISOString();

    // Mark table as CLEANING
    const table = (db.tables || []).find((t) => t.tableNumber === bill.tableNumber);
    if (table) {
      table.status = 'CLEANING';
      table.activeOrderId = null;
    }

    // Mark all linked orders as settled and paid
    (db.orders || []).forEach((ord) => {
      const ordId = ord.orderId || ord.id;
      if (Array.isArray(bill.orderIds) && bill.orderIds.includes(ordId)) {
        ord.status = 'PAID_SETTLED';
        ord.paymentStatus = 'PAID';
        ord.settledBillNumber = bill.billNumber;
      }
    });

    saveDb(db);

    return NextResponse.json({
      success: true,
      message: `Bill ${billNumber} settled successfully via ${settlementMode}.`,
      bill,
      receipt: {
        receiptNumber: `REC-${bill.billNumber.replace('SGR-', '')}`,
        table: bill.tableNumber,
        totalPaid: bill.totalAmount,
        mode: settlementMode,
        transactionId,
        paidAt: bill.paidAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
