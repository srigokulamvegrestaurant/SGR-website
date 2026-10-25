import { NextResponse } from 'next/server';
import { getDb, getDbAsync, saveDb, saveDbAsync, categorizeStation, generateKotReceiptText, deductRecipeBom } from '@/lib/db';
import { broadcast } from '@/app/api/events/route';
import { generateThermalReceiptText } from '@/app/api/admin/pos/route';

// Normalize order status to one of the 8 canonical statuses + CANCELLED
export function normalizeOrderStatus(rawStatus, order = {}) {
  const s = String(rawStatus || '').toUpperCase();
  if (s === 'CANCELLED' || s === 'VOIDED') return 'CANCELLED';
  if (s === 'PAID' || s === 'PAID_SETTLED' || s === 'COMPLETED' || order.paymentStatus === 'PAID') return 'PAID';
  if (s === 'BILLED' || s === 'BILL_GENERATED' || s === 'BILL_REQUESTED' || (order.billNumber && !order.settledAt)) return 'BILLED';
  if (s === 'SERVED') return 'SERVED';
  if (s === 'READY' || s === 'READY_TO_SERVE') return 'READY_TO_SERVE';
  if (s === 'PREPARING' || s === 'COOKING' || s === 'PLATING' || s === 'IN_KITCHEN') return 'PREPARING';
  if (s === 'KOT_SENT' || s === 'ACCEPTED' || s === 'NEW') return 'KOT_SENT';
  if (s === 'OTP_VERIFIED') return 'OTP_VERIFIED';
  if (s === 'OTP_PENDING' || s === 'PENDING_OTP') return 'OTP_PENDING';
  return 'KOT_SENT';
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'ALL'; // 'ALL', 'QR', 'POS', 'PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const db = await getDbAsync();
    const rawOrders = db.orders || [];

    const now = Date.now();

    // Map and enrich all orders
    const enrichedOrders = rawOrders.map(ord => {
      const canonicalStatus = normalizeOrderStatus(ord.status, ord);
      const createdAtMs = ord.createdAt ? new Date(ord.createdAt).getTime() : now;
      const elapsedMinutes = Math.max(0, Math.floor((now - createdAtMs) / (1000 * 60)));

      // Delayed check: active and > 15 minutes
      const isActive = !['SERVED', 'BILLED', 'PAID', 'CANCELLED'].includes(canonicalStatus);
      const isDelayed = isActive && elapsedMinutes >= 15;

      // Determine order source
      const isQr = Boolean(ord.otp || ord.verificationOtp || String(ord.id || '').includes('KOT-') || String(ord.orderType || '').toUpperCase() === 'QR');
      const orderSource = isQr ? 'QR' : 'POS';

      // Table formatting
      const tableNum = ord.tableNumber || (ord.tables && ord.tables[0]) || '01';

      // Subtotal & Total
      const items = ord.items || [];
      const subtotal = ord.subtotal || items.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
      const cgst = ord.cgst !== undefined ? ord.cgst : Math.round(subtotal * 0.025 * 100) / 100;
      const sgst = ord.sgst !== undefined ? ord.sgst : Math.round(subtotal * 0.025 * 100) / 100;
      const totalAmount = ord.totalAmount || Math.round((subtotal + cgst + sgst) * 100) / 100;

      // KOT details
      const primaryStation = items[0] ? (items[0].station || categorizeStation(items[0].title)) : 'TIFFIN';
      const kotNumber = ord.orderNumber || (ord.id && ord.id.startsWith('KOT-') ? ord.id : `KOT-${tableNum}-${String(ord.id || '').slice(-4)}`);

      return {
        ...ord,
        id: ord.id || ord.orderId || `ord_${createdAtMs}`,
        orderId: ord.orderId || ord.id || `ord_${createdAtMs}`,
        tableNumber: tableNum,
        customerName: ord.customerName || ord.guestName || 'Walk-in Guest',
        customerPhone: ord.customerPhone || ord.guestPhone || '',
        orderSource,
        canonicalStatus,
        elapsedMinutes,
        isDelayed,
        subtotal,
        cgst,
        sgst,
        totalAmount,
        kotNumber,
        primaryStation,
        priority: ord.priority || (isDelayed ? 'HIGH' : 'NORMAL'),
        prepTimeMinutes: ord.prepTimeMinutes || 12,
        otpCode: ord.otp || ord.verificationOtp || ord.otpCode || null,
        otpStatus: ord.otpStatus || (['OTP_VERIFIED', 'KOT_SENT', 'PREPARING', 'READY_TO_SERVE', 'SERVED', 'BILLED', 'PAID'].includes(canonicalStatus) ? 'VERIFIED' : 'PENDING'),
      };
    });

    // Summary calculations
    const summary = {
      totalToday: enrichedOrders.length,
      otpPending: enrichedOrders.filter(o => o.canonicalStatus === 'OTP_PENDING').length,
      otpVerified: enrichedOrders.filter(o => o.canonicalStatus === 'OTP_VERIFIED').length,
      kotSent: enrichedOrders.filter(o => o.canonicalStatus === 'KOT_SENT').length,
      preparing: enrichedOrders.filter(o => o.canonicalStatus === 'PREPARING').length,
      readyToServe: enrichedOrders.filter(o => o.canonicalStatus === 'READY_TO_SERVE').length,
      served: enrichedOrders.filter(o => o.canonicalStatus === 'SERVED').length,
      billed: enrichedOrders.filter(o => o.canonicalStatus === 'BILLED').length,
      paid: enrichedOrders.filter(o => o.canonicalStatus === 'PAID').length,
      cancelled: enrichedOrders.filter(o => o.canonicalStatus === 'CANCELLED').length,
      delayedCount: enrichedOrders.filter(o => o.isDelayed).length,
      activeCount: enrichedOrders.filter(o => !['PAID', 'CANCELLED'].includes(o.canonicalStatus)).length,
      qrCount: enrichedOrders.filter(o => o.orderSource === 'QR').length,
      posCount: enrichedOrders.filter(o => o.orderSource === 'POS').length,
    };

    // Apply Filter
    let filtered = enrichedOrders;
    if (filter === 'QR') {
      filtered = filtered.filter(o => o.orderSource === 'QR');
    } else if (filter === 'POS') {
      filtered = filtered.filter(o => o.orderSource === 'POS');
    } else if (filter === 'PENDING') {
      filtered = filtered.filter(o => ['OTP_PENDING', 'OTP_VERIFIED'].includes(o.canonicalStatus));
    } else if (filter === 'PREPARING') {
      filtered = filtered.filter(o => ['KOT_SENT', 'PREPARING'].includes(o.canonicalStatus));
    } else if (filter === 'READY') {
      filtered = filtered.filter(o => o.canonicalStatus === 'READY_TO_SERVE');
    } else if (filter === 'COMPLETED') {
      filtered = filtered.filter(o => ['SERVED', 'BILLED', 'PAID'].includes(o.canonicalStatus));
    } else if (filter === 'CANCELLED') {
      filtered = filtered.filter(o => o.canonicalStatus === 'CANCELLED');
    }

    // Apply Search
    if (search) {
      filtered = filtered.filter(o => {
        const idMatch = String(o.id || '').toLowerCase().includes(search) || String(o.orderId || '').toLowerCase().includes(search) || String(o.kotNumber || '').toLowerCase().includes(search);
        const tableMatch = String(o.tableNumber || '').toLowerCase().includes(search);
        const nameMatch = String(o.customerName || '').toLowerCase().includes(search);
        const phoneMatch = String(o.customerPhone || '').toLowerCase().includes(search);
        const itemMatch = (o.items || []).some(it => String(it.title || '').toLowerCase().includes(search));
        return idMatch || tableMatch || nameMatch || phoneMatch || itemMatch;
      });
    }

    return NextResponse.json({
      success: true,
      orders: filtered,
      allOrders: enrichedOrders,
      summary,
      tables: db.tables || [],
      menu: db.menu || [],
      settings: db.settings || {},
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, authorizedBy = 'Cashier/Admin', role = 'CASHIER' } = body;
    const db = await getDbAsync();

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ACTION: VERIFY OTP (Waitstaff / Cashier verification)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'VERIFY_OTP') {
      const { orderId, otp, staffName = 'Captain Murugan', isManagerOverride = false } = body;
      const order = (db.orders || []).find(o => o.id === orderId || o.orderId === orderId);

      if (!order) {
        return NextResponse.json({ success: false, error: `Order ${orderId} not found` }, { status: 404 });
      }

      const expectedOtp = String(order.otp || order.verificationOtp || order.otpCode || '').trim();
      const enteredOtp = String(otp || '').trim();

      if (!isManagerOverride && enteredOtp !== expectedOtp) {
        return NextResponse.json({ success: false, error: 'Incorrect OTP. Please check the 4 digits displayed on the customer mobile screen.' }, { status: 400 });
      }

      order.status = 'KOT_SENT';
      order.otpStatus = 'VERIFIED';
      order.verifiedBy = staffName;
      order.verifiedAt = new Date().toISOString();

      // Dispatch KOT tickets to kitchen display
      const stations = ['TIFFIN', 'DOSA', 'MEALS', 'BEVERAGES'];
      stations.forEach(st => {
        const stationItems = (order.items || []).filter(it => (it.station || categorizeStation(it.title)) === st);
        if (stationItems.length > 0) {
          const newKot = {
            id: `kot_${order.orderId || order.id}_${st}`,
            kotNumber: `KOT-${order.tableNumber || '01'}-${Math.floor(1000 + Math.random() * 9000)}`,
            orderId: order.orderId || order.id,
            tableNumber: order.tableNumber || (order.tables && order.tables[0]) || '01',
            orderType: order.orderType || 'DINE_IN',
            customerName: order.customerName || order.guestName || 'Guest',
            station: st,
            items: stationItems,
            status: 'NEW',
            cookingNotes: order.cookingNotes || '',
            createdAt: new Date().toISOString(),
          };
          db.kots = db.kots || [];
          db.kots.push(newKot);
        }
      });

      await saveDbAsync(db);

      try {
        broadcast({
          type: 'ORDER_OTP_VERIFIED',
          orderId: order.orderId || order.id,
          table: order.tableNumber,
          guestName: order.customerName || order.guestName,
          verifiedBy: staffName,
          message: `✅ Order verified by ${staffName}. KOT sent to kitchen display!`,
        });
        broadcast({ type: 'ORDERS_UPDATED' });
        broadcast({ type: 'KITCHEN_KOT_FIRED', orderId: order.orderId || order.id });
      } catch (e) { /* silent */ }

      return NextResponse.json({ success: true, message: 'OTP verified successfully and KOT dispatched to kitchen', order });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. ACTION: UPDATE ORDER STATUS (KOT_SENT -> PREPARING -> READY -> SERVED)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'UPDATE_STATUS') {
      const { orderId, newStatus, staffName = 'Floor Captain' } = body;
      const order = (db.orders || []).find(o => o.id === orderId || o.orderId === orderId);

      if (!order) {
        return NextResponse.json({ success: false, error: `Order ${orderId} not found` }, { status: 404 });
      }

      const prevStatus = order.status;
      order.status = newStatus;
      order.updatedAt = new Date().toISOString();
      order.lastUpdatedBy = staffName;

      if (newStatus === 'READY_TO_SERVE') {
        order.readyAt = new Date().toISOString();
      } else if (newStatus === 'SERVED') {
        order.servedAt = new Date().toISOString();
        order.servedBy = staffName;
      }

      // Synchronize with KOT tickets
      if (db.kots) {
        db.kots.forEach(kot => {
          if (kot.orderId === (order.orderId || order.id)) {
            if (newStatus === 'PREPARING') kot.status = 'PREPARING';
            else if (newStatus === 'READY_TO_SERVE') kot.status = 'READY';
            else if (newStatus === 'SERVED') kot.status = 'SERVED';
          }
        });
      }

      await saveDbAsync(db);

      try {
        broadcast({
          type: 'ORDER_STATUS_UPDATE',
          orderId: order.orderId || order.id,
          table: order.tableNumber,
          newStatus,
          prevStatus,
          message: `Order ${order.orderId || order.id} updated to ${newStatus}`,
          updatedBy: staffName,
        });
        broadcast({ type: 'ORDERS_UPDATED' });
      } catch (e) { /* silent */ }

      return NextResponse.json({ success: true, message: `Status updated to ${newStatus}`, order });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. ACTION: EDIT PERMITTED ITEMS (Before served)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'EDIT_ITEMS') {
      const { orderId, items, cookingNotes, staffName = 'Captain Murugan' } = body;
      const order = (db.orders || []).find(o => o.id === orderId || o.orderId === orderId);

      if (!order) {
        return NextResponse.json({ success: false, error: `Order ${orderId} not found` }, { status: 404 });
      }

      const canonical = normalizeOrderStatus(order.status, order);
      if (['SERVED', 'BILLED', 'PAID', 'CANCELLED'].includes(canonical)) {
        return NextResponse.json({ success: false, error: `Cannot edit items for order in status: ${canonical}` }, { status: 400 });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ success: false, error: 'Order must contain at least one delicacy' }, { status: 400 });
      }

      order.items = items;
      if (cookingNotes !== undefined) order.cookingNotes = cookingNotes;

      // Recalculate financial breakdown
      const subtotal = items.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
      order.subtotal = subtotal;
      order.cgst = Math.round(subtotal * 0.025 * 100) / 100;
      order.sgst = Math.round(subtotal * 0.025 * 100) / 100;
      order.totalAmount = Math.round((subtotal + order.cgst + order.sgst) * 100) / 100;
      order.lastEditedBy = staffName;
      order.lastEditedAt = new Date().toISOString();

      await saveDbAsync(db);

      try {
        broadcast({
          type: 'ORDER_STATUS_UPDATE',
          orderId: order.orderId || order.id,
          message: `Items edited for Table #${order.tableNumber} by ${staffName}`,
        });
        broadcast({ type: 'ORDERS_UPDATED' });
      } catch (e) { /* silent */ }

      return NextResponse.json({ success: true, message: 'Order items updated successfully', order });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. ACTION: CANCEL ORDER (Mandatory Reason Required)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'CANCEL_ORDER') {
      const { orderId, reason, staffName = 'Floor Captain', managerPin = '' } = body;
      const order = (db.orders || []).find(o => o.id === orderId || o.orderId === orderId);

      if (!order) {
        return NextResponse.json({ success: false, error: `Order ${orderId} not found` }, { status: 404 });
      }

      if (!reason || reason.trim().length < 3) {
        return NextResponse.json({ success: false, error: 'A valid cancellation reason (min 3 characters) is required' }, { status: 400 });
      }

      order.status = 'CANCELLED';
      order.cancellationReason = reason.trim();
      order.cancelledBy = staffName;
      order.cancelledAt = new Date().toISOString();

      // Cancel associated KOTs
      if (db.kots) {
        db.kots.forEach(k => {
          if (k.orderId === (order.orderId || order.id)) {
            k.status = 'CANCELLED';
            k.cancellationReason = reason.trim();
          }
        });
      }

      // Check if table can be released
      const tableNum = order.tableNumber || (order.tables && order.tables[0]);
      if (tableNum && db.tables) {
        const tbl = db.tables.find(t => t.tableNumber === String(tableNum).padStart(2, '0'));
        if (tbl) {
          const otherActive = (db.orders || []).some(o => 
            (o.id !== order.id) && 
            (o.tableNumber === tbl.tableNumber || (o.tables && o.tables.includes(tbl.tableNumber))) &&
            !['CANCELLED', 'PAID'].includes(normalizeOrderStatus(o.status, o))
          );
          if (!otherActive) {
            tbl.status = 'AVAILABLE';
            tbl.activeOrderId = null;
          }
        }
      }

      await saveDbAsync(db);

      try {
        broadcast({
          type: 'ORDER_CANCELLED',
          orderId: order.orderId || order.id,
          reason: reason.trim(),
          message: `❌ Order ${order.orderId || order.id} cancelled: ${reason.trim()}`,
        });
        broadcast({ type: 'ORDERS_UPDATED' });
      } catch (e) { /* silent */ }

      return NextResponse.json({ success: true, message: 'Order cancelled successfully', order });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. ACTION: GENERATE BILL (Tax Invoice)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'GENERATE_BILL') {
      const { orderId, staffName = 'Rajan (Cashier)', discountPercent = 0, discountReason = '' } = body;
      const order = (db.orders || []).find(o => o.id === orderId || o.orderId === orderId);

      if (!order) {
        return NextResponse.json({ success: false, error: `Order ${orderId} not found` }, { status: 404 });
      }

      const billNumber = `SGR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const subtotal = order.subtotal || (order.items || []).reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
      const discountAmount = Math.round((subtotal * (Number(discountPercent) / 100)) * 100) / 100;
      const taxableSubtotal = Math.max(0, subtotal - discountAmount);
      const cgst = Math.round(taxableSubtotal * 0.025 * 100) / 100;
      const sgst = Math.round(taxableSubtotal * 0.025 * 100) / 100;
      const grossTotal = taxableSubtotal + cgst + sgst;
      const totalAmount = Math.round(grossTotal);
      const roundOff = Math.round((totalAmount - grossTotal) * 100) / 100;

      const newBill = {
        id: `bill_${Date.now()}`,
        billNumber,
        orderId: order.orderId || order.id,
        tableNumber: order.tableNumber,
        customerName: order.customerName || order.guestName || 'Guest',
        customerPhone: order.customerPhone || order.guestPhone || '',
        items: order.items || [],
        subtotal,
        discountAmount,
        discountReason,
        cgst,
        sgst,
        roundOff,
        totalAmount,
        status: 'UNPAID',
        cashierName: staffName,
        createdAt: new Date().toISOString(),
      };

      db.bills = db.bills || [];
      db.bills.push(newBill);

      order.status = 'BILLED';
      order.billNumber = billNumber;
      order.billedAt = new Date().toISOString();
      order.billedBy = staffName;

      // Update table status to BILL_GENERATED
      const tableNum = order.tableNumber || (order.tables && order.tables[0]);
      if (tableNum && db.tables) {
        const tbl = db.tables.find(t => t.tableNumber === String(tableNum).padStart(2, '0'));
        if (tbl) tbl.status = 'BILL_GENERATED';
      }

      await saveDbAsync(db);

      try {
        broadcast({
          type: 'BILL_GENERATED',
          billNumber,
          table: order.tableNumber,
          totalAmount,
          message: `🧾 Bill #${billNumber} generated for Table #${order.tableNumber} (₹${totalAmount})`,
        });
        broadcast({ type: 'ORDERS_UPDATED' });
      } catch (e) { /* silent */ }

      return NextResponse.json({ success: true, message: 'Bill generated successfully', bill: newBill, order });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. ACTION: SETTLE PAYMENT (Cash / UPI / Card)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'SETTLE_PAYMENT') {
      const {
        orderId,
        billNumber,
        paymentMode = 'CASH',
        transactionRef = '',
        amountReceived,
        staffName = 'Rajan (Cashier)',
      } = body;

      const order = (db.orders || []).find(o => o.id === orderId || o.orderId === orderId);
      if (!order) {
        return NextResponse.json({ success: false, error: `Order ${orderId} not found` }, { status: 404 });
      }

      const bill = (db.bills || []).find(b => b.billNumber === billNumber || b.orderId === order.id);
      if (bill) {
        bill.status = 'PAID';
        bill.paymentMode = paymentMode;
        bill.transactionRef = transactionRef;
        bill.settledAt = new Date().toISOString();
        bill.settledBy = staffName;
      }

      order.status = 'PAID';
      order.paymentStatus = 'PAID';
      order.paymentMode = paymentMode;
      order.settledAt = new Date().toISOString();
      order.settledBy = staffName;

      // Deduct recipe BOM inventory if not deducted
      if (!order.bomDeducted) {
        deductRecipeBom(order.items || [], db);
        order.bomDeducted = true;
      }

      // Mark table as CLEANING or AVAILABLE
      const tableNum = order.tableNumber || (order.tables && order.tables[0]);
      if (tableNum && db.tables) {
        const tbl = db.tables.find(t => t.tableNumber === String(tableNum).padStart(2, '0'));
        if (tbl) {
          tbl.status = 'CLEANING';
          tbl.activeOrderId = null;
        }
      }

      // Generate ESC/POS Thermal Receipt Text
      const receiptText = generateThermalReceiptText({
        billNumber: bill?.billNumber || order.billNumber || `SGR-${Date.now()}`,
        tableNumber: order.tableNumber,
        orderType: order.orderType || 'DINE_IN',
        customer: { name: order.customerName, phone: order.customerPhone },
        cashierName: staffName,
        items: order.items || [],
        subtotal: order.subtotal || 0,
        discountAmount: bill?.discountAmount || 0,
        discountReason: bill?.discountReason || '',
        cgst: order.cgst || 0,
        sgst: order.sgst || 0,
        roundOff: bill?.roundOff || 0,
        totalAmount: bill?.totalAmount || order.totalAmount || 0,
        paymentMode,
        transactionRef,
        settledAt: order.settledAt,
        settings: db.settings,
      });

      await saveDbAsync(db);

      try {
        broadcast({
          type: 'BILL_PAID',
          billNumber: bill?.billNumber || order.billNumber,
          table: order.tableNumber,
          paymentMode,
          totalAmount: bill?.totalAmount || order.totalAmount,
          message: `✅ Table #${order.tableNumber} bill settled via ${paymentMode}! Table ready for cleaning.`,
        });
        broadcast({ type: 'ORDERS_UPDATED' });
        broadcast({ type: 'TABLE_STATUS_CHANGED', tableNumber: order.tableNumber, status: 'CLEANING' });
      } catch (e) { /* silent */ }

      return NextResponse.json({
        success: true,
        message: 'Payment settled successfully! Receipt generated.',
        receiptText,
        order,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. ACTION: RE-FIRE / REPRINT KOT SLIP
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'RE_FIRE_KOT') {
      const { orderId, station = 'ALL', staffName = 'Floor Captain' } = body;
      const order = (db.orders || []).find(o => o.id === orderId || o.orderId === orderId);

      if (!order) {
        return NextResponse.json({ success: false, error: `Order ${orderId} not found` }, { status: 404 });
      }

      const kotSlip = generateKotReceiptText({
        kotNumber: order.kotNumber || `KOT-${order.tableNumber}-RE`,
        orderId: order.orderId || order.id,
        tableNumber: order.tableNumber,
        orderType: order.orderType || 'DINE_IN',
        customerName: order.customerName || order.guestName,
        waiterName: staffName,
        station,
        items: order.items || [],
        notes: order.cookingNotes || '',
        printCount: 2,
      });

      try {
        broadcast({
          type: 'KITCHEN_KOT_FIRED',
          orderId: order.orderId || order.id,
          message: `🔥 KOT Re-dispatched for Table #${order.tableNumber} to ${station}`,
        });
      } catch (e) { /* silent */ }

      return NextResponse.json({ success: true, message: 'KOT ticket re-dispatched to kitchen', kotSlip });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
