// app/api/customer/orders/route.js - Customer Orders, Live Tracking & Receipts Query
import { NextResponse } from 'next/server';
import {
  getDb,
  saveDb,
  validateCustomerSession,
  normalizePhoneNumber,
} from '@/lib/db';
import { generateThermalReceiptText } from '@/lib/thermalSlipFormatter';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const auth = validateCustomerSession(token);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Session expired. Please sign in again.' }, { status: 401 });
    }

    const { customer } = auth;
    const normPhone = normalizePhoneNumber(customer.phone);
    const custEmail = (customer.email || '').trim().toLowerCase();
    const custName = (customer.name || '').trim().toLowerCase();
    const db = getDb();

    // Check if there is a linked CRM customer record (e.g. cust_05 with historical data/loyalty)
    const matchingCrmCust = (db.customers || []).find(c =>
      c.id !== customer.id && (
        (c.phone && normPhone && normalizePhoneNumber(c.phone) === normPhone) ||
        (c.email && custEmail && c.email.toLowerCase() === custEmail) ||
        (custName && custName.length >= 3 && c.name && c.name.toLowerCase().includes(custName))
      )
    );

    const altPhones = [
      matchingCrmCust ? normalizePhoneNumber(matchingCrmCust.phone) : '',
      customer.alternatePhone ? normalizePhoneNumber(customer.alternatePhone) : '',
    ].filter(Boolean);

    const altEmails = [
      matchingCrmCust?.email ? matchingCrmCust.email.toLowerCase() : '',
      customer.alternateEmail ? customer.alternateEmail.toLowerCase() : '',
    ].filter(Boolean);

    // Collect all order IDs explicitly linked to this customer or CRM profile
    const linkedOrderIds = new Set([
      ...(Array.isArray(customer.orderIds) ? customer.orderIds : []),
      ...(Array.isArray(customer.orderHistory) ? customer.orderHistory.map(h => h.orderId).filter(Boolean) : []),
      ...(matchingCrmCust && Array.isArray(matchingCrmCust.orderIds) ? matchingCrmCust.orderIds : []),
      ...(matchingCrmCust && Array.isArray(matchingCrmCust.orderHistory) ? matchingCrmCust.orderHistory.map(h => h.orderId).filter(Boolean) : []),
    ]);

    // Collect all bill numbers explicitly linked
    const linkedBillNumbers = new Set([
      ...(Array.isArray(customer.billNumbers) ? customer.billNumbers : []),
      ...(Array.isArray(customer.orderHistory) ? customer.orderHistory.map(h => h.billNumber).filter(Boolean) : []),
      ...(matchingCrmCust && Array.isArray(matchingCrmCust.billNumbers) ? matchingCrmCust.billNumbers : []),
      ...(matchingCrmCust && Array.isArray(matchingCrmCust.orderHistory) ? matchingCrmCust.orderHistory.map(h => h.billNumber).filter(Boolean) : []),
    ]);

    // 1. Find all orders belonging to this customer
    const allOrders = (db.orders || []).filter(o => {
      // Direct ID match
      const ordId = o.id || o.orderId || o.orderNumber;
      if (ordId && linkedOrderIds.has(ordId)) return true;

      // Phone match
      const oPhones = [
        o.guestPhone,
        o.customerPhone,
        o.phone,
        o.customer?.phone,
      ].map(p => normalizePhoneNumber(p)).filter(Boolean);

      if (normPhone && oPhones.includes(normPhone)) return true;
      if (altPhones.some(p => oPhones.includes(p))) return true;

      // Email match
      const oEmails = [
        o.guestEmail,
        o.customerEmail,
        o.email,
        o.customer?.email,
      ].map(e => (e || '').toLowerCase().trim()).filter(Boolean);

      if (custEmail && oEmails.includes(custEmail)) return true;
      if (altEmails.some(e => oEmails.includes(e))) return true;

      // Name match (for distinctive customer names >= 3 chars, e.g. "Aswin")
      if (custName && custName.length >= 3) {
        const oNames = [
          o.guestName,
          o.customerName,
          o.customer?.name,
        ].map(n => (n || '').toLowerCase().trim()).filter(Boolean);

        if (oNames.some(n => n === custName || n.includes(custName) || custName.includes(n))) {
          return true;
        }
      }

      return false;
    });

    // Also include archival orders from customer.orderHistory / matchingCrmCust.orderHistory if not already in allOrders
    const existingOrderIds = new Set(allOrders.map(o => o.id || o.orderId));
    const archivalOrders = [
      ...(Array.isArray(customer.orderHistory) ? customer.orderHistory : []),
      ...(matchingCrmCust && Array.isArray(matchingCrmCust.orderHistory) ? matchingCrmCust.orderHistory : []),
    ];

    archivalOrders.forEach(arch => {
      if (arch && arch.orderId && !existingOrderIds.has(arch.orderId)) {
        existingOrderIds.add(arch.orderId);
        allOrders.push({
          id: arch.orderId,
          orderId: arch.orderId,
          orderType: arch.type || 'DINE_IN',
          guestName: customer.name,
          customerName: customer.name,
          guestPhone: customer.phone,
          customerPhone: customer.phone,
          tables: arch.tableNumber ? [String(arch.tableNumber).padStart(2, '0')] : ['07'],
          tableNumber: arch.tableNumber || '07',
          status: 'PAID',
          totalAmount: arch.total || 0,
          createdAt: arch.date || new Date().toISOString(),
          placedAt: arch.date ? new Date(arch.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          billNumber: arch.billNumber || null,
          items: (arch.itemsSummary || 'Authentic Chettinad Special Feast').split(', ').map(title => ({
            title,
            price: Math.round((arch.total || 200) / 2),
            quantity: 1,
          })),
        });
      }
    });

    // Also map any order's billNumber to linkedBillNumbers
    allOrders.forEach(o => {
      if (o.billNumber) linkedBillNumbers.add(o.billNumber);
    });

    // Separate active live orders from past order history
    const activeOrders = [];
    const pastOrders = [];

    allOrders.forEach(ord => {
      const st = (ord.status || '').toUpperCase();
      const isPaid = ord.paymentStatus === 'PAID' || (ord.billNumber && (db.bills || []).some(b => b.billNumber === ord.billNumber && b.paymentStatus === 'PAID'));
      const isFinished = st === 'PAID' || st === 'PAID_SETTLED' || st === 'COMPLETED' || st === 'CANCELLED' || (st === 'SERVED' && isPaid);
      if (!isFinished) {
        activeOrders.push(ord);
      } else {
        pastOrders.push(ord);
      }
    });

    // 2. Find all bills / tax receipts belonging to this customer
    const customerBills = (db.bills || []).filter(b => {
      // Direct bill number match
      if (b.billNumber && linkedBillNumbers.has(b.billNumber)) return true;

      // Phone match
      const bPhones = [
        b.guestPhone,
        b.customerPhone,
        b.phone,
        b.customer?.phone,
      ].map(p => normalizePhoneNumber(p)).filter(Boolean);

      if (normPhone && bPhones.includes(normPhone)) return true;
      if (altPhones.some(p => bPhones.includes(p))) return true;

      // Email match
      const bEmails = [
        b.guestEmail,
        b.customerEmail,
        b.email,
        b.customer?.email,
      ].map(e => (e || '').toLowerCase().trim()).filter(Boolean);

      if (custEmail && bEmails.includes(custEmail)) return true;
      if (altEmails.some(e => bEmails.includes(e))) return true;

      // Name match
      if (custName && custName.length >= 3) {
        const bNames = [
          b.guestName,
          b.customerName,
          b.customer?.name,
        ].map(n => (n || '').toLowerCase().trim()).filter(Boolean);

        if (bNames.some(n => n === custName || n.includes(custName) || custName.includes(n))) {
          return true;
        }
      }

      return false;
    }).map(bill => {
      // Ensure thermalSlip exists or generate on the fly
      const thermalSlip = bill.thermalSlip || generateThermalReceiptText({
        billNumber: bill.billNumber,
        tableNumber: bill.tableNumber,
        orderType: bill.orderType || 'DINE_IN',
        customer: { name: bill.guestName || customer.name, phone: bill.guestPhone || customer.phone },
        cashierName: bill.cashierName || 'Sri Gokulam Billing Counter',
        items: bill.items || [],
        subtotal: bill.subtotal || 0,
        discountAmount: bill.discountAmount || 0,
        serviceChargeAmount: bill.serviceChargeAmount || 0,
        cgst: bill.cgst || 0,
        sgst: bill.sgst || 0,
        roundOff: bill.roundOff || 0,
        totalAmount: bill.totalAmount || 0,
        paymentMode: bill.paymentMode || bill.settlementMode || 'UPI',
        settledAt: bill.settledAt || bill.createdAt,
        settings: db.settings,
      });

      return {
        ...bill,
        thermalSlip,
      };
    });

    // Accurate stats calculation
    const totalSpentCalculated = allOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const finalTotalSpent = Math.max(Number(customer.totalSpent) || 0, Number(matchingCrmCust?.totalSpend) || 0, totalSpentCalculated);
    const finalTotalOrders = Math.max(Number(customer.totalOrders) || 0, Number(matchingCrmCust?.visits) || 0, allOrders.length);
    const finalLoyaltyPoints = Math.max(
      Number(customer.loyaltyPoints) || 0,
      Number(matchingCrmCust?.loyaltyPoints) || 0,
      Math.floor(finalTotalSpent / 50)
    );

    // Sync updated aggregated numbers to customer record so it stays persisted
    if (customer.totalSpent !== finalTotalSpent || customer.loyaltyPoints !== finalLoyaltyPoints || customer.totalOrders !== finalTotalOrders) {
      customer.totalSpent = finalTotalSpent;
      customer.loyaltyPoints = finalLoyaltyPoints;
      customer.totalOrders = finalTotalOrders;
      saveDb(db);
    }

    // Filter Customer Reservations
    const allReservations = db.reservations || [];
    const validPhones = [normPhone, ...altPhones].filter(Boolean);
    const customerReservations = allReservations.filter((r) => {
      const rPhone = normalizePhoneNumber(r.phone);
      if (rPhone && validPhones.includes(rPhone)) return true;
      if (custName && custName.length >= 3 && r.guestName && r.guestName.toLowerCase().includes(custName)) return true;
      return false;
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        loyaltyPoints: finalLoyaltyPoints,
        totalOrders: finalTotalOrders,
        totalSpent: finalTotalSpent,
        dietaryPreferences: customer.dietaryPreferences || matchingCrmCust?.dietaryPreferences || {},
        savedAddresses: customer.savedAddresses || matchingCrmCust?.savedAddresses || [],
      },
      activeOrders,
      pastOrders,
      bills: customerBills,
      reservations: customerReservations,
    });
  } catch (error) {
    console.error('Customer orders error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
