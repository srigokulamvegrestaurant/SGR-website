import { NextResponse } from 'next/server';
import { getDb, getDbAsync, saveDb, saveDbAsync, categorizeStation, deductRecipeBom, recordAuditLog, recordCustomerTransaction } from '@/lib/db';
import { broadcast } from '@/app/api/events/route';
import { generateThermalReceiptText, generateThermalSlipHtml, sanitizeEnglishTitle, formatBillTitle, DEFAULT_BILL_SLIP_FORMAT } from '@/lib/thermalSlipFormatter';

export { generateThermalReceiptText, generateThermalSlipHtml, sanitizeEnglishTitle };

export async function GET(request) {
  try {
    const db = await getDbAsync();
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get('tableId');

    // Return detailed POS state: active dining tables, unbilled orders, recent bills
    const activeTables = (db.tables || []).map(tbl => {
      const tPad = String(tbl.tableNumber).padStart(2, '0');
      const activeOrders = (db.orders || []).filter(o => 
        (String(o.tableNumber) === String(tbl.tableNumber) || String(o.tableNumber) === tPad || o.tables?.includes(tPad) || o.tables?.includes(String(tbl.tableNumber)) || o.tableId === tbl.id) &&
        o.status !== 'CANCELLED' && o.status !== 'PAID_SETTLED'
      );

      const items = [];
      let subtotal = 0;
      activeOrders.forEach(ord => {
        (ord.items || []).forEach(it => {
          items.push({
            ...it,
            orderId: ord.orderId || ord.id,
            guestName: ord.guestName || 'Guest',
            orderedAt: ord.createdAt,
          });
          subtotal += (it.price || 0) * (it.quantity || 1);
        });
      });

      return {
        ...tbl,
        activeOrdersCount: activeOrders.length,
        itemCount: items.length,
        items,
        subtotal,
        activeOrders,
      };
    });

    // Flat list of all currently active/unbilled orders (Dine-In, Manual Dine-In, Counter, Takeaway)
    const allActiveOrders = (db.orders || [])
      .filter(o => o.status !== 'CANCELLED' && o.status !== 'PAID_SETTLED' && o.paymentStatus !== 'PAID')
      .map(o => {
        const subtotal = o.subtotal || (o.items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
        const tNum = o.tableNumber || (o.tables && o.tables[0]) || '01';
        return {
          id: o.id || o.orderId,
          orderId: o.orderId || o.id,
          orderNumber: o.orderNumber || o.kotNumber || o.id,
          kotNumber: o.kotNumber || o.orderNumber || o.id,
          tableNumber: tNum,
          tokenNumber: o.tokenNumber || (o.orderType === 'COUNTER' ? (tNum.startsWith('CTR') ? tNum : `CTR-${tNum}`) : (o.orderType === 'TAKEAWAY' ? (tNum.startsWith('TK') ? tNum : `TK-${tNum}`) : null)),
          orderType: o.orderType || (tNum === 'TK' || tNum.startsWith('TK') ? 'TAKEAWAY' : (tNum.startsWith('CTR') ? 'COUNTER' : 'DINE_IN')),
          customerName: o.customerName || o.guestName || 'Guest',
          customerPhone: o.customerPhone || o.guestPhone || '',
          items: o.items || [],
          itemCount: (o.items || []).length,
          subtotal,
          totalAmount: o.totalAmount || Math.round(subtotal * 1.05),
          status: o.status || 'NEW',
          paymentStatus: o.paymentStatus || 'UNPAID',
          createdAt: o.createdAt || new Date().toISOString(),
          waiterName: o.waiterName || o.verifiedBy || '',
        };
      });

    const recentBills = (db.bills || []).slice(-150).reverse().map(b => {
      if (!b.thermalSlipHtml || !b.thermalSlip) {
        b.thermalSlip = generateThermalReceiptText({
          billNumber: b.billNumber,
          tableNumber: b.tableNumber,
          orderType: b.orderType,
          customer: b.customer,
          cashierName: b.cashierName,
          items: b.items || [],
          subtotal: b.subtotal || 0,
          discountAmount: b.discountAmount || 0,
          discountReason: b.discountReason,
          packagingCharge: b.packagingCharge || 0,
          deliveryCharge: b.deliveryCharge || 0,
          serviceChargeAmount: b.serviceChargeAmount || 0,
          cgst: b.cgst || 0,
          sgst: b.sgst || 0,
          roundOff: b.roundOff || 0,
          totalAmount: b.totalAmount || 0,
          paymentMode: b.paymentMode,
          splitDetails: b.splitDetails,
          transactionRef: b.transactionRef,
          settledAt: b.settledAt || b.createdAt,
          isDuplicate: !!b.isDuplicate,
          reprintCount: b.reprintCount || 0,
          settings: db.settings,
        });
        b.thermalSlipHtml = generateThermalSlipHtml({
          billNumber: b.billNumber,
          tableNumber: b.tableNumber,
          orderType: b.orderType,
          persons: b.persons || 1,
          customer: b.customer,
          cashierName: b.cashierName,
          waiterName: b.waiterName || '',
          items: b.items || [],
          subtotal: b.subtotal || 0,
          discountAmount: b.discountAmount || 0,
          discountReason: b.discountReason,
          packagingCharge: b.packagingCharge || 0,
          deliveryCharge: b.deliveryCharge || 0,
          serviceChargeAmount: b.serviceChargeAmount || 0,
          cgst: b.cgst || 0,
          sgst: b.sgst || 0,
          roundOff: b.roundOff || 0,
          totalAmount: b.totalAmount || 0,
          paymentMode: b.paymentMode,
          paymentStatus: b.paymentStatus || 'Paid',
          splitDetails: b.splitDetails,
          transactionRef: b.transactionRef,
          settledAt: b.settledAt || b.createdAt,
          isDuplicate: !!b.isDuplicate,
          reprintCount: b.reprintCount || 0,
          settings: db.settings,
        });
      }
      return b;
    });
    const currentShift = (db.shifts || [])[0] || {
      id: 'shift_default',
      cashierName: 'Rajan (POS Cashier)',
      startedAt: new Date().toISOString(),
      openingFloat: 2000,
      cashSales: 0,
      upiSales: 0,
      cardSales: 0,
      payouts: [],
      status: 'OPEN',
    };

    if (tableId) {
      const found = activeTables.find(t => t.id === tableId || String(t.tableNumber) === String(tableId));
      return NextResponse.json({ success: true, table: found, settings: db.settings });
    }

    return NextResponse.json({
      success: true,
      tables: activeTables,
      activeOrders: allActiveOrders,
      menu: db.menu || [],
      customers: db.customers || [],
      recentBills,
      currentShift,
      heldOrders: db.held_orders || [],
      qrOrders: db.qr_orders || [],
      refundLogs: db.refund_logs || [],
      settings: db.settings,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('POS GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;
    const db = await getDbAsync();

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 0: CHECK FOR EXISTING ACTIVE ORDER (DUPLICATE PREVENTION)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'CHECK_DUPLICATE_ORDER') {
      const { tableNumber, customerPhone, customerName, orderType } = body;
      const cleanPhone = String(customerPhone || '').replace(/\D/g, '');
      const cleanTable = String(tableNumber || '').replace(/^[Tt\-#\s]+/, '').padStart(2, '0');

      const matchedOrders = (db.orders || []).filter(o => {
        if (o.status === 'CANCELLED' || o.status === 'PAID_SETTLED' || o.paymentStatus === 'PAID') return false;
        if (cleanTable && (String(o.tableNumber) === cleanTable || o.tables?.includes(cleanTable))) return true;
        if (cleanPhone && cleanPhone.length >= 7) {
          const oPhone = String(o.customerPhone || o.guestPhone || '').replace(/\D/g, '');
          if (oPhone && (oPhone.includes(cleanPhone) || cleanPhone.includes(oPhone))) return true;
        }
        if (customerName && customerName.trim().length >= 3 && customerName.trim() !== 'Walk-in Guest') {
          const cNameLower = customerName.toLowerCase().trim();
          if (o.customerName?.toLowerCase().includes(cNameLower) || o.guestName?.toLowerCase().includes(cNameLower)) return true;
        }
        return false;
      });

      return NextResponse.json({
        success: true,
        hasActiveOrder: matchedOrders.length > 0,
        activeOrders: matchedOrders,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 1: PUNCH KOT & SEND TO KITCHEN STATIONS (4 REAL-WORLD METHODS)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'PUNCH_KOT') {
      const {
        orderType = 'DINE_IN',
        tableNumber = '01',
        customer = { name: 'Walk-in', phone: '' },
        items = [],
        cashierName = 'Rajan (POS 01)',
        paymentMode = 'CASH',
        splitDetails = null,
        transactionRef = '',
        payImmediate = false,
        markPending = false,
      } = body;

      if (!items || items.length === 0) {
        return NextResponse.json({ success: false, error: 'Shopping cart is empty' }, { status: 400 });
      }

      const tPad = String(tableNumber || '01').replace(/^[Tt\-#\s]+/, '').padStart(2, '0');
      let effectiveTable = tPad;
      let tokenNumber = body.tokenNumber || null;

      if (orderType === 'COUNTER') {
        const counterSeq = 100 + (((db.orders || []).filter(o => o.orderType === 'COUNTER').length) % 900) + 1;
        tokenNumber = tokenNumber || `CTR-${counterSeq}`;
        effectiveTable = tokenNumber;
      } else if (orderType === 'TAKEAWAY') {
        const tkSeq = 100 + (((db.orders || []).filter(o => o.orderType === 'TAKEAWAY').length) % 900) + 1;
        tokenNumber = tokenNumber || `TK-${tkSeq}`;
        effectiveTable = tokenNumber;
      } else {
        effectiveTable = tPad;
      }

      const kotNumber = `KOT-${effectiveTable}-${Math.floor(1000 + Math.random() * 9000)}`;
      const orderId = `ord_${Date.now()}`;
      const createdAt = new Date().toISOString();

      // Categorize items by kitchen stations
      const enrichedItems = items.map((it, idx) => ({
        id: it.id || `it_${Date.now()}_${idx}`,
        title: it.title,
        price: Number(it.price),
        quantity: Number(it.quantity || 1),
        variant: it.variant || null,
        addOns: it.addOns || [],
        specialNotes: it.specialNotes || '',
        station: it.station || categorizeStation(it.title),
      }));

      // Calculate subtotal
      const subtotal = enrichedItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);

      // Deduct ingredients from BOM inventory
      const bomAlerts = deductRecipeBom(enrichedItems, db);

      const isPaid = payImmediate === true || body.paymentStatus === 'PAID';
      const isPending = markPending === true || body.paymentStatus === 'PENDING_PAYMENT';
      const initialPaymentStatus = isPaid ? 'PAID' : (isPending ? 'PENDING_PAYMENT' : 'UNPAID');
      const initialStatus = isPaid ? 'COMPLETED' : 'NEW';

      // Create Order
      const newOrder = {
        id: orderId,
        orderId,
        orderNumber: kotNumber,
        tableNumber: effectiveTable,
        tokenNumber,
        orderType,
        customerName: customer.name || 'Walk-in Guest',
        customerPhone: customer.phone || '',
        guestName: customer.name || 'Guest',
        items: enrichedItems,
        subtotal,
        status: initialStatus,
        paymentStatus: initialPaymentStatus,
        paymentMethod: isPaid ? paymentMode : null,
        cashierName,
        createdAt,
      };

      db.orders = db.orders || [];
      db.orders.push(newOrder);

      // Create KOT Ticket
      const newKot = {
        id: `kot_${Date.now()}`,
        kotNumber,
        orderId,
        tableNumber: effectiveTable,
        tokenNumber,
        orderType,
        customerName: customer.name || 'Walk-in',
        items: enrichedItems,
        station: enrichedItems[0]?.station || 'TIFFIN',
        status: initialStatus,
        createdAt,
      };

      db.kots = db.kots || [];
      db.kots.push(newKot);

      // If Dine-in or Manual Dine-In, mark table as OCCUPIED
      if (orderType === 'DINE_IN' || orderType === 'MANUAL_DINE_IN') {
        const table = (db.tables || []).find(t => String(t.tableNumber) === String(tableNumber) || String(t.tableNumber) === tPad);
        if (table) {
          table.status = 'OCCUPIED';
          table.activeOrderId = orderId;
        }
      }

      // Add to customer directory if phone provided
      if (customer.phone && customer.name) {
        db.customers = db.customers || [];
        const existingCust = db.customers.find(c => c.phone === customer.phone);
        if (existingCust) {
          existingCust.visits = (existingCust.visits || 0) + 1;
          existingCust.totalSpend = (existingCust.totalSpend || 0) + subtotal;
        } else {
          db.customers.push({
            id: `cust_${Date.now()}`,
            name: customer.name,
            phone: customer.phone,
            visits: 1,
            totalSpend: subtotal,
            tag: 'New',
          });
        }
      }

      // If immediate payment (Method 3 Counter Instant Pay or Method 4 Takeaway Pay Now)
      let generatedBill = null;
      let thermalSlip = null;
      let thermalSlipHtml = null;

      if (isPaid) {
        const cgstRate = db.settings?.taxRateCgst ?? 2.5;
        const sgstRate = db.settings?.taxRateSgst ?? 2.5;
        const cgst = (subtotal * cgstRate) / 100;
        const sgst = (subtotal * sgstRate) / 100;
        const rawTotal = subtotal + cgst + sgst;
        const totalAmount = Math.round(rawTotal);
        const roundOff = Number((totalAmount - rawTotal).toFixed(2));
        const billNumber = body.billNumber || `SGK${Math.floor(100000 + Math.random() * 900000)}`;

        generatedBill = {
          id: `bill_${Date.now()}`,
          billNumber,
          tableNumber: effectiveTable,
          tokenNumber,
          orderType,
          persons: Math.max(1, Number(body.persons) || 1),
          cashierName,
          customer: {
            name: customer.name || 'Walk-in Guest',
            phone: customer.phone || '',
          },
          items: enrichedItems.map(it => ({
            ...it,
            title: sanitizeEnglishTitle(it.title || 'Item'),
          })),
          subtotal,
          discountAmount: 0,
          serviceChargeAmount: 0,
          cgst,
          sgst,
          roundOff,
          totalAmount,
          paymentStatus: 'PAID',
          paymentMode,
          splitDetails: paymentMode === 'SPLIT' ? splitDetails : null,
          transactionRef,
          createdAt,
          settledAt: createdAt,
        };

        thermalSlip = generateThermalReceiptText({
          ...generatedBill,
          settings: db.settings,
        });

        thermalSlipHtml = generateThermalSlipHtml({
          ...generatedBill,
          paperWidth: body.paperWidth || '80MM',
          settings: db.settings,
        });

        generatedBill.thermalSlip = thermalSlip;
        generatedBill.thermalSlipHtml = thermalSlipHtml;

        db.bills = db.bills || [];
        db.bills.push(generatedBill);

        newOrder.settledBillNumber = billNumber;

        // Shift sales tracking
        if (db.shifts && db.shifts.length > 0) {
          const shift = db.shifts[0];
          if (paymentMode === 'CASH') shift.cashSales = (shift.cashSales || 0) + totalAmount;
          else if (paymentMode === 'ONLINE_UPI' || paymentMode === 'ONLINE' || paymentMode === 'UPI') shift.upiSales = (shift.upiSales || 0) + totalAmount;
          else if (paymentMode === 'CARD') shift.cardSales = (shift.cardSales || 0) + totalAmount;
        }

        recordAuditLog({
          user: cashierName,
          role: 'CASHIER',
          module: 'POS_BILLING',
          action: 'INSTANT_COUNTER_SETTLEMENT',
          detail: `Instant Bill #${billNumber} (${orderType}) for ${effectiveTable} settled by ${cashierName} (₹${totalAmount} via ${paymentMode}).`,
        });
      }

      await saveDbAsync(db);

      // Broadcast real-time SSE event for KDS & Table displays
      try {
        broadcast('KOT_CREATED', {
          kotNumber,
          tableNumber: effectiveTable,
          tokenNumber,
          orderType,
          itemsCount: enrichedItems.length,
          subtotal,
          station: newKot.station,
          status: initialStatus,
          paymentStatus: initialPaymentStatus,
        });
      } catch (e) {
        console.error('SSE broadcast error:', e);
      }

      return NextResponse.json({
        success: true,
        message: isPaid ? `Bill #${generatedBill?.billNumber} settled immediately` : `KOT ${kotNumber} created & routed to Kitchen successfully`,
        kot: newKot,
        order: newOrder,
        tokenNumber,
        isPaid,
        isPending,
        bill: generatedBill,
        thermalReceipt: thermalSlip,
        thermalSlipHtml,
        bomAlerts,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 2: SETTLE BILL (FULL, PARTIAL, SPLIT & THERMAL RECEIPT - 4 METHODS)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'SETTLE_BILL') {
      const {
        tableNumber,
        orderType = 'DINE_IN',
        customer,
        paymentMode = 'CASH', // CASH, ONLINE_UPI, CARD, ONLINE, SPLIT
        splitDetails = null,
        transactionRef = '',
        discountPercent = 0,
        discountFlat = 0,
        discountReason = '',
        serviceChargePercent = 0,
        cashierName = 'Rajan (POS 01)',
        tokenNumber,
        orderId,
        kotNumber,
        markPending = false,
        paperWidth = '80MM',
      } = body;

      const tPad = String(tableNumber || '').replace(/^[Tt\-#\s]+/, '').padStart(2, '0');
      const targetOrderId = orderId || body.orderNumber || kotNumber;
      const targetToken = tokenNumber || (orderType === 'COUNTER' ? tableNumber : (orderType === 'TAKEAWAY' ? tableNumber : null));

      // Find active orders for this specific target, token, table, or order type
      let activeOrders = (db.orders || []).filter(o => {
        if (o.status === 'CANCELLED' || o.status === 'PAID_SETTLED') return false;
        if (targetOrderId && (o.id === targetOrderId || o.orderId === targetOrderId || o.orderNumber === targetOrderId || o.kotNumber === targetOrderId)) {
          return true;
        }
        if (targetToken && (o.tokenNumber === targetToken || o.tableNumber === targetToken)) {
          return true;
        }
        if (orderType === 'COUNTER' && (o.orderType === 'COUNTER' || String(o.tableNumber).startsWith('CTR'))) {
          if (tableNumber && (String(o.tableNumber) === String(tableNumber) || o.tokenNumber === String(tableNumber))) return true;
          return !targetOrderId && !targetToken; // Match all if unspecified
        }
        if (orderType === 'TAKEAWAY' && (o.orderType === 'TAKEAWAY' || o.tableNumber === 'TK' || String(o.tableNumber).startsWith('TK'))) {
          if (tableNumber && (String(o.tableNumber) === String(tableNumber) || o.tokenNumber === String(tableNumber))) return true;
          return !targetOrderId && !targetToken;
        }
        // Dine-In / Manual Dine-In match by table
        if (tableNumber) {
          return (String(o.tableNumber) === String(tableNumber) || String(o.tableNumber) === tPad || o.tables?.includes(tPad) || o.tables?.includes(String(tableNumber)));
        }
        return false;
      });

      // Direct items fallback if punching and settling in one fast step without a prior KOT
      if (activeOrders.length === 0 && Array.isArray(body.items) && body.items.length > 0) {
        const fallbackOrderId = `ord_${Date.now()}`;
        const newOrder = {
          id: fallbackOrderId,
          orderId: fallbackOrderId,
          orderNumber: `ORD-${Date.now().toString().slice(-4)}`,
          tableNumber: String(tableNumber || (orderType === 'COUNTER' ? 'CTR-01' : (orderType === 'TAKEAWAY' ? 'TK-01' : tPad))),
          tokenNumber: targetToken || null,
          orderType,
          customerName: customer?.name || 'Walk-in Guest',
          customerPhone: customer?.phone || '',
          items: body.items,
          status: markPending ? 'PREPARING' : 'COMPLETED',
          paymentStatus: markPending ? 'PENDING_PAYMENT' : 'PAID',
          createdAt: new Date().toISOString(),
        };
        db.orders = db.orders || [];
        db.orders.push(newOrder);
        activeOrders = [newOrder];
      }

      if (activeOrders.length === 0) {
        return NextResponse.json({ success: false, error: 'No active unbilled orders found for this selection' }, { status: 404 });
      }

      // Aggregate items across active orders
      const items = [];
      let subtotal = 0;
      activeOrders.forEach(ord => {
        (ord.items || []).forEach(it => {
          items.push({
            id: it.id,
            title: it.title,
            price: Number(it.price),
            quantity: Number(it.quantity || 1),
            variant: it.variant || null,
            addOns: it.addOns || [],
            specialNotes: it.specialNotes || '',
            subtotal: (Number(it.price) || 0) * (Number(it.quantity) || 1),
          });
          subtotal += (Number(it.price) || 0) * (Number(it.quantity) || 1);
        });
      });

      // Calculate discount
      let discountAmount = 0;
      if (discountFlat > 0) {
        discountAmount = Math.min(subtotal, Number(discountFlat));
      } else if (discountPercent > 0) {
        discountAmount = Math.min(subtotal, (subtotal * Number(discountPercent)) / 100);
      }

      const discountedSubtotal = Math.max(0, subtotal - discountAmount);

      // Service charge
      const scPercent = Number(serviceChargePercent) || 0;
      const serviceChargeAmount = (discountedSubtotal * scPercent) / 100;

      // Taxes (CGST 2.5% + SGST 2.5% = 5%)
      const cgstRate = db.settings?.taxRateCgst ?? 2.5;
      const sgstRate = db.settings?.taxRateSgst ?? 2.5;
      const taxableAmount = discountedSubtotal + serviceChargeAmount;
      const cgst = (taxableAmount * cgstRate) / 100;
      const sgst = (taxableAmount * sgstRate) / 100;

      const rawTotal = taxableAmount + cgst + sgst;
      const totalAmount = Math.round(rawTotal);
      const roundOff = Number((totalAmount - rawTotal).toFixed(2));

      const billNumber = body.billNumber || `SGK${Math.floor(100000 + Math.random() * 900000)}`;
      const settledAt = new Date().toISOString();
      const isPending = markPending === true || body.paymentStatus === 'PENDING_PAYMENT';
      const effectivePaymentStatus = isPending ? 'PENDING_PAYMENT' : 'PAID';

      const finalTableDisplay = targetToken || (orderType === 'TAKEAWAY' ? (tableNumber || 'TK-01') : (orderType === 'COUNTER' ? (tableNumber || 'CTR-01') : String(tableNumber || tPad)));

      const newBill = {
        id: `bill_${Date.now()}`,
        billNumber,
        tableNumber: finalTableDisplay,
        tokenNumber: targetToken || null,
        orderType,
        persons: Math.max(1, Number(body.persons) || 1),
        waiterName: body.waiterName || '',
        customer: customer || { name: activeOrders[0]?.customerName || 'Guest', phone: activeOrders[0]?.customerPhone || '' },
        items: items.map(it => ({
          ...it,
          title: sanitizeEnglishTitle(it.title || 'Item'),
        })),
        subtotal,
        discountAmount,
        discountReason,
        serviceChargeAmount,
        cgst,
        sgst,
        roundOff,
        totalAmount,
        paymentStatus: effectivePaymentStatus,
        paymentMode,
        splitDetails: paymentMode === 'SPLIT' ? splitDetails : null,
        transactionRef,
        cashierName,
        createdAt: settledAt,
        settledAt: isPending ? null : settledAt,
      };

      db.bills = db.bills || [];
      db.bills.push(newBill);

      // Update status of matched active orders
      activeOrders.forEach(ord => {
        if (isPending) {
          ord.paymentStatus = 'PENDING_PAYMENT';
          ord.status = 'PREPARING';
          ord.billNumber = billNumber;
        } else {
          ord.status = 'PAID_SETTLED';
          ord.paymentStatus = 'PAID';
          ord.settledBillNumber = billNumber;
        }
      });

      // Automatically record customer transaction in CRM
      if (newBill.customer?.phone) {
        recordCustomerTransaction({
          name: newBill.customer.name,
          phone: newBill.customer.phone,
          email: newBill.customer.email || '',
          bill: newBill,
          amount: totalAmount,
        });
      }

      // Update Table Status to CLEANING for Dine-In & Manual Dine-In
      if (orderType === 'DINE_IN' || orderType === 'MANUAL_DINE_IN') {
        const table = (db.tables || []).find(t => String(t.tableNumber) === String(tableNumber) || String(t.tableNumber) === tPad);
        if (table) {
          table.status = 'CLEANING';
          table.activeOrderId = null;
          table.billRequested = false;
        }
      }

      // Update active Cashier Shift totals
      if (db.shifts && db.shifts.length > 0) {
        const shift = db.shifts[0];
        if (paymentMode === 'CASH') {
          shift.cashSales = (shift.cashSales || 0) + totalAmount;
        } else if (paymentMode === 'ONLINE_UPI' || paymentMode === 'ONLINE') {
          shift.upiSales = (shift.upiSales || 0) + totalAmount;
        } else if (paymentMode === 'CARD') {
          shift.cardSales = (shift.cardSales || 0) + totalAmount;
        } else if (paymentMode === 'SPLIT' && Array.isArray(splitDetails)) {
          splitDetails.forEach(sp => {
            if (sp.mode === 'CASH') shift.cashSales = (shift.cashSales || 0) + Number(sp.amount || 0);
            else if (sp.mode === 'UPI') shift.upiSales = (shift.upiSales || 0) + Number(sp.amount || 0);
            else if (sp.mode === 'CARD') shift.cardSales = (shift.cardSales || 0) + Number(sp.amount || 0);
          });
        }
      }

      // Generate ESC/POS receipt & Visual HTML Slip
      const thermalReceipt = generateThermalReceiptText({
        billNumber,
        tableNumber: orderType === 'TAKEAWAY' ? 'TK' : String(tableNumber),
        orderType,
        customer: newBill.customer,
        cashierName,
        items: newBill.items,
        subtotal,
        discountAmount,
        discountReason,
        serviceChargeAmount,
        cgst,
        sgst,
        roundOff,
        totalAmount,
        paymentMode,
        splitDetails,
        transactionRef,
        settledAt,
        settings: db.settings,
      });

      const thermalSlipHtml = generateThermalSlipHtml({
        billNumber,
        tableNumber: newBill.tableNumber,
        orderType,
        persons: newBill.persons,
        customer: newBill.customer,
        cashierName,
        waiterName: newBill.waiterName,
        items: newBill.items,
        subtotal,
        discountAmount,
        discountReason,
        serviceChargeAmount,
        cgst,
        sgst,
        roundOff,
        totalAmount,
        paymentMode,
        paymentStatus: 'PAID',
        splitDetails,
        transactionRef,
        settledAt,
        settings: db.settings,
      });

      newBill.thermalSlip = thermalReceipt;
      newBill.thermalSlipHtml = thermalSlipHtml;
      await saveDbAsync(db);

      // Broadcast SSE
      try {
        broadcast('BILL_SETTLED', {
          tableNumber: orderType === 'TAKEAWAY' ? 'TK' : String(tableNumber),
          billNumber,
          totalAmount,
          settledAt,
          paymentMode,
        });
      } catch (e) {
        console.error('SSE broadcast error:', e);
      }

      return NextResponse.json({
        success: true,
        message: `Bill ${billNumber} settled successfully (₹${totalAmount})`,
        bill: newBill,
        thermalReceipt,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION: CREATE MANUAL CUSTOMER BILL / COUNTER SALE
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'CREATE_MANUAL_BILL') {
      const {
        customer = { name: 'Walk-in Guest', phone: '', tag: 'Walk-in' },
        orderType = 'DINE_IN',
        tableNumber = 'TK',
        items = [],
        discountPercent = 0,
        discountFlat = 0,
        discountReason = '',
        packagingCharge = 0,
        deliveryCharge = 0,
        serviceChargeEnabled = false,
        taxRateCgst = null,
        taxRateSgst = null,
        paymentMode = 'CASH',
        splitDetails = null,
        transactionRef = '',
        cashierName = 'Rajan (POS 01)',
        customNotes = '',
        formatOverrides = {},
      } = body;

      if (!items || items.length === 0) {
        return NextResponse.json({ success: false, error: 'Please add at least one item to generate manual bill.' }, { status: 400 });
      }

      // Format items
      const billItems = items.map(it => ({
        id: it.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: it.title || 'Custom Item',
        tamilTitle: it.tamilTitle || '',
        price: Number(it.price) || 0,
        quantity: Math.max(1, Number(it.quantity) || 1),
        variant: it.variant || null,
        addOns: it.addOns || [],
        specialNotes: it.specialNotes || '',
        isCustom: !!it.isCustom,
        subtotal: (Number(it.price) || 0) * (Math.max(1, Number(it.quantity) || 1)),
      }));

      const subtotal = billItems.reduce((acc, it) => acc + it.subtotal, 0);

      // Discount
      let discountAmount = 0;
      if (Number(discountFlat) > 0) {
        discountAmount = Math.min(subtotal, Number(discountFlat));
      } else if (Number(discountPercent) > 0) {
        discountAmount = Math.min(subtotal, (subtotal * Number(discountPercent)) / 100);
      }

      const discountedSubtotal = Math.max(0, subtotal - discountAmount);

      // Service charge
      const scPercent = serviceChargeEnabled ? (db.settings?.billing_payments?.serviceChargePercent || 5) : 0;
      const serviceChargeAmount = (discountedSubtotal * scPercent) / 100;

      // Extra charges
      const packCharge = Math.max(0, Number(packagingCharge) || 0);
      const delCharge = Math.max(0, Number(deliveryCharge) || 0);

      // Taxes (CGST & SGST)
      const cgstRate = taxRateCgst !== null && !isNaN(taxRateCgst) ? Number(taxRateCgst) : (db.settings?.taxRateCgst ?? 2.5);
      const sgstRate = taxRateSgst !== null && !isNaN(taxRateSgst) ? Number(taxRateSgst) : (db.settings?.taxRateSgst ?? 2.5);

      const taxableAmount = discountedSubtotal + serviceChargeAmount;
      const cgst = (taxableAmount * cgstRate) / 100;
      const sgst = (taxableAmount * sgstRate) / 100;

      const rawTotal = taxableAmount + cgst + sgst + packCharge + delCharge;
      const totalAmount = Math.round(rawTotal);
      const roundOff = Number((totalAmount - rawTotal).toFixed(2));

      const billNumber = body.billNumber || `SGK${Math.floor(100000 + Math.random() * 900000)}`;
      const settledAt = new Date().toISOString();

      const newBill = {
        id: `bill_${Date.now()}`,
        billNumber,
        tableNumber: orderType === 'TAKEAWAY' ? 'TK' : orderType === 'DELIVERY' ? 'DEL' : orderType === 'PARCEL' ? 'P-01' : orderType === 'COUNTER' ? 'C-01' : String(tableNumber || '01'),
        orderType,
        persons: Math.max(1, Number(body.persons) || 1),
        waiterName: body.waiterName || '',
        customer: {
          name: customer.name || 'Walk-in Guest',
          phone: customer.phone || '',
          email: customer.email || '',
          address: customer.address || '',
          gstin: customer.gstin || '',
          tag: customer.tag || 'Walk-in',
        },
        items: billItems.map(it => ({
          ...it,
          title: sanitizeEnglishTitle(it.title || 'Custom Item'),
        })),
        subtotal,
        discountAmount,
        discountReason,
        packagingCharge: packCharge,
        deliveryCharge: delCharge,
        serviceChargeAmount,
        cgst,
        sgst,
        roundOff,
        totalAmount,
        paymentStatus: 'PAID',
        paymentMode,
        splitDetails: paymentMode === 'SPLIT' ? splitDetails : null,
        transactionRef,
        cashierName,
        customNotes,
        isManualBill: true,
        createdAt: settledAt,
        settledAt,
      };

      // Generate ESC/POS receipt & Exact Visual HTML Slip
      const thermalReceipt = generateThermalReceiptText({
        billNumber,
        tableNumber: newBill.tableNumber,
        orderType,
        customer: newBill.customer,
        cashierName,
        items: newBill.items,
        subtotal,
        discountAmount,
        discountReason,
        packagingCharge: packCharge,
        deliveryCharge: delCharge,
        serviceChargeAmount,
        cgst,
        sgst,
        roundOff,
        totalAmount,
        paymentMode,
        splitDetails,
        transactionRef,
        settledAt,
        settings: db.settings,
        formatOverrides,
      });

      const thermalSlipHtml = generateThermalSlipHtml({
        billNumber,
        tableNumber: newBill.tableNumber,
        orderType,
        persons: newBill.persons,
        customer: newBill.customer,
        cashierName,
        waiterName: newBill.waiterName,
        items: newBill.items,
        subtotal,
        discountAmount,
        discountReason,
        packagingCharge: packCharge,
        deliveryCharge: delCharge,
        serviceChargeAmount,
        cgst,
        sgst,
        roundOff,
        totalAmount,
        paymentMode,
        paymentStatus: 'PAID',
        splitDetails,
        transactionRef,
        settledAt,
        settings: db.settings,
        formatOverrides,
      });

      newBill.thermalSlip = thermalReceipt;
      newBill.thermalSlipHtml = thermalSlipHtml;

      db.bills = db.bills || [];
      db.bills.push(newBill);

      // Clear active orders for this table or customer to prevent duplicate billing
      const tPad = String(tableNumber || '').replace(/^[Tt\-#\s]+/, '').padStart(2, '0');
      (db.orders || []).forEach(o => {
        if (o.status !== 'CANCELLED' && o.status !== 'PAID_SETTLED') {
          if (tableNumber && (String(o.tableNumber) === String(tableNumber) || String(o.tableNumber) === tPad || o.tables?.includes(tPad) || o.tables?.includes(String(tableNumber)))) {
            o.status = 'PAID_SETTLED';
            o.paymentStatus = 'PAID';
            o.settledBillNumber = billNumber;
          } else if (customer.phone && customer.phone.trim().length >= 8) {
            const cleanPh = customer.phone.trim().replace(/\D/g, '');
            const ordPh = String(o.customerPhone || o.guestPhone || '').replace(/\D/g, '');
            if (ordPh && (ordPh === cleanPh || cleanPh.includes(ordPh))) {
              o.status = 'PAID_SETTLED';
              o.paymentStatus = 'PAID';
              o.settledBillNumber = billNumber;
            }
          }
        }
      });

      // Free table if dine-in
      if (orderType === 'DINE_IN' || orderType === 'MANUAL_DINE_IN') {
        const tbl = (db.tables || []).find(t => String(t.tableNumber) === String(tableNumber) || String(t.tableNumber) === tPad);
        if (tbl) {
          tbl.status = 'CLEANING';
          tbl.activeOrderId = null;
          tbl.billRequested = false;
        }
      }

      // Update shifts sales totals
      if (db.shifts && db.shifts.length > 0) {
        const shift = db.shifts[0];
        if (paymentMode === 'CASH') shift.cashSales = (shift.cashSales || 0) + totalAmount;
        else if (paymentMode === 'ONLINE_UPI' || paymentMode === 'ONLINE' || paymentMode === 'UPI') shift.upiSales = (shift.upiSales || 0) + totalAmount;
        else if (paymentMode === 'CARD') shift.cardSales = (shift.cardSales || 0) + totalAmount;
      }

      // Update or create CRM customer
      if (customer.phone && customer.phone.trim().length >= 8) {
        db.customers = db.customers || [];
        const normPhone = customer.phone.trim();
        const existingCust = db.customers.find(c => c.phone === normPhone);
        if (existingCust) {
          existingCust.totalOrders = (existingCust.totalOrders || 0) + 1;
          existingCust.totalSpent = (existingCust.totalSpent || 0) + totalAmount;
          existingCust.lastOrderDate = settledAt;
          existingCust.loyaltyPoints = (existingCust.loyaltyPoints || 0) + Math.floor(totalAmount / 100);
          if (customer.name && (!existingCust.name || existingCust.name === 'Walk-in Guest')) existingCust.name = customer.name;
          if (customer.gstin) existingCust.gstin = customer.gstin;
          if (customer.address) existingCust.address = customer.address;
        } else {
          db.customers.push({
            id: `cust_${Date.now()}`,
            name: customer.name || 'Walk-in Guest',
            phone: normPhone,
            email: customer.email || '',
            gstin: customer.gstin || '',
            address: customer.address || '',
            tag: customer.tag || 'Manual Counter Customer',
            totalOrders: 1,
            totalSpent: totalAmount,
            loyaltyPoints: Math.floor(totalAmount / 100),
            createdAt: settledAt,
            lastOrderDate: settledAt,
          });
        }
      }

      // Deduct Recipe BOM if items match menu dishes
      billItems.forEach(it => {
        if (!it.isCustom && it.id) {
          try {
            deductRecipeBom(it.id, it.quantity, db);
          } catch (e) {
            console.warn('Recipe BOM deduction skipped for item:', it.title);
          }
        }
      });

      // Record Audit Log
      recordAuditLog({
        user: cashierName,
        role: 'CASHIER',
        module: 'POS_MANUAL_BILL',
        action: 'MANUAL_BILL_CREATED',
        detail: `Manual bill #${billNumber} generated for ${customer.name || 'Walk-in'} (Total: ₹${totalAmount}).`,
      });

      await saveDbAsync(db);

      // SSE broadcast
      try {
        broadcast('BILL_SETTLED', {
          tableNumber: newBill.tableNumber,
          billNumber,
          totalAmount,
          settledAt,
          paymentMode,
          isManual: true,
        });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Manual bill #${billNumber} settled successfully (₹${totalAmount})`,
        bill: newBill,
        thermalReceipt,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION: UPDATE BILL (Edit bill before print or update settled bill)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'UPDATE_BILL') {
      const {
        billNumber,
        billId,
        updatedFields = {},
        callerName = 'Admin',
      } = body;

      db.bills = db.bills || [];
      const bill = db.bills.find(b => b.billNumber === billNumber || b.id === billId || (updatedFields.id && b.id === updatedFields.id));

      if (!bill) {
        return NextResponse.json({ success: false, error: `Bill not found: ${billNumber || billId}` }, { status: 404 });
      }

      // If user directly customized the raw thermal slip text
      if (updatedFields.thermalSlip && typeof updatedFields.thermalSlip === 'string') {
        bill.thermalSlip = updatedFields.thermalSlip;
      }

      // Update customer details if provided
      if (updatedFields.customer) {
        bill.customer = {
          ...bill.customer,
          ...updatedFields.customer,
        };
      }

      // Update items & recalculate if provided
      if (Array.isArray(updatedFields.items) && updatedFields.items.length > 0) {
        bill.items = updatedFields.items.map(it => ({
          ...it,
          title: sanitizeEnglishTitle(it.title || 'Item'),
          price: Number(it.price) || 0,
          quantity: Math.max(1, Number(it.quantity) || 1),
          subtotal: (Number(it.price) || 0) * (Math.max(1, Number(it.quantity) || 1)),
        }));
        bill.subtotal = bill.items.reduce((acc, it) => acc + it.subtotal, 0);

        const discountFlat = updatedFields.discountFlat !== undefined ? Number(updatedFields.discountFlat) : (bill.discountFlat || 0);
        const discountPercent = updatedFields.discountPercent !== undefined ? Number(updatedFields.discountPercent) : (bill.discountPercent || 0);
        if (discountFlat > 0) {
          bill.discountAmount = Math.min(bill.subtotal, discountFlat);
        } else if (discountPercent > 0) {
          bill.discountAmount = Math.min(bill.subtotal, (bill.subtotal * discountPercent) / 100);
        } else if (updatedFields.discountAmount !== undefined) {
          bill.discountAmount = Number(updatedFields.discountAmount);
        }

        if (updatedFields.discountReason !== undefined) bill.discountReason = updatedFields.discountReason;
        if (updatedFields.packagingCharge !== undefined) bill.packagingCharge = Number(updatedFields.packagingCharge);
        if (updatedFields.deliveryCharge !== undefined) bill.deliveryCharge = Number(updatedFields.deliveryCharge);
        if (updatedFields.serviceChargeAmount !== undefined) bill.serviceChargeAmount = Number(updatedFields.serviceChargeAmount);

        const cgstRate = db.settings?.taxRateCgst ?? 2.5;
        const sgstRate = db.settings?.taxRateSgst ?? 2.5;
        const taxable = Math.max(0, bill.subtotal - (bill.discountAmount || 0)) + (bill.serviceChargeAmount || 0);
        bill.cgst = (taxable * cgstRate) / 100;
        bill.sgst = (taxable * sgstRate) / 100;

        const rawTot = taxable + bill.cgst + bill.sgst + (bill.packagingCharge || 0) + (bill.deliveryCharge || 0);
        bill.totalAmount = Math.round(rawTot);
        bill.roundOff = Number((bill.totalAmount - rawTot).toFixed(2));
      }

      if (updatedFields.paymentMode) bill.paymentMode = updatedFields.paymentMode;
      if (updatedFields.transactionRef !== undefined) bill.transactionRef = updatedFields.transactionRef;
      if (updatedFields.tableNumber) bill.tableNumber = updatedFields.tableNumber;
      if (updatedFields.orderType) bill.orderType = updatedFields.orderType;
      if (updatedFields.persons) bill.persons = Number(updatedFields.persons);
      if (updatedFields.waiterName !== undefined) bill.waiterName = updatedFields.waiterName;
      if (updatedFields.customNotes !== undefined) bill.customNotes = updatedFields.customNotes;

      // Regenerate both raw ESC/POS text & visual HTML slip
      bill.thermalSlip = generateThermalReceiptText({
        billNumber: bill.billNumber,
        tableNumber: bill.tableNumber,
        orderType: bill.orderType,
        customer: bill.customer,
        cashierName: bill.cashierName,
        items: bill.items,
        subtotal: bill.subtotal,
        discountAmount: bill.discountAmount || 0,
        discountReason: bill.discountReason,
        packagingCharge: bill.packagingCharge || 0,
        deliveryCharge: bill.deliveryCharge || 0,
        serviceChargeAmount: bill.serviceChargeAmount || 0,
        cgst: bill.cgst || 0,
        sgst: bill.sgst || 0,
        roundOff: bill.roundOff || 0,
        totalAmount: bill.totalAmount,
        paymentMode: bill.paymentMode,
        splitDetails: bill.splitDetails,
        transactionRef: bill.transactionRef,
        settledAt: bill.settledAt || bill.createdAt,
        isDuplicate: !!bill.isDuplicate,
        reprintCount: bill.reprintCount || 0,
        settings: db.settings,
        formatOverrides: updatedFields.formatOverrides || {},
      });

      bill.thermalSlipHtml = generateThermalSlipHtml({
        billNumber: bill.billNumber,
        tableNumber: bill.tableNumber,
        orderType: bill.orderType,
        persons: bill.persons || 1,
        customer: bill.customer,
        cashierName: bill.cashierName,
        waiterName: bill.waiterName || '',
        items: bill.items,
        subtotal: bill.subtotal,
        discountAmount: bill.discountAmount || 0,
        discountReason: bill.discountReason,
        packagingCharge: bill.packagingCharge || 0,
        deliveryCharge: bill.deliveryCharge || 0,
        serviceChargeAmount: bill.serviceChargeAmount || 0,
        cgst: bill.cgst || 0,
        sgst: bill.sgst || 0,
        roundOff: bill.roundOff || 0,
        totalAmount: bill.totalAmount,
        paymentMode: bill.paymentMode,
        paymentStatus: bill.paymentStatus || 'PAID',
        splitDetails: bill.splitDetails,
        transactionRef: bill.transactionRef,
        settledAt: bill.settledAt || bill.createdAt,
        isDuplicate: !!bill.isDuplicate,
        reprintCount: bill.reprintCount || 0,
        settings: db.settings,
        formatOverrides: updatedFields.formatOverrides || {},
      });

      bill.updatedAt = new Date().toISOString();
      bill.lastAmendedBy = callerName;

      recordAuditLog({
        user: callerName,
        role: 'CASHIER',
        module: 'POS_BILL_EDIT',
        action: 'BILL_AMENDED',
        detail: `Bill #${bill.billNumber} amended before print by ${callerName} (Net: ₹${bill.totalAmount}).`,
      });

      await saveDbAsync(db);

      return NextResponse.json({
        success: true,
        message: `Bill #${bill.billNumber} successfully updated`,
        bill,
        thermalReceipt: bill.thermalSlip,
        thermalSlipHtml: bill.thermalSlipHtml,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION: REPRINT BILL WITH DUPLICATE WATERMARK & AUDIT TRACKING
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'REPRINT_BILL') {
      const { billNumber, callerName = 'Admin', formatOverrides = {} } = body;
      db.bills = db.bills || [];
      const bill = db.bills.find(b => b.billNumber === billNumber || b.id === billNumber);
      if (!bill) {
        return NextResponse.json({ success: false, error: `Bill ${billNumber} not found` }, { status: 404 });
      }

      bill.reprintCount = (bill.reprintCount || 0) + 1;
      bill.isDuplicate = true;
      bill.lastReprintedAt = new Date().toISOString();
      bill.lastReprintedBy = callerName;

      // Regenerate thermal slip text & visual HTML with duplicate watermark
      const thermalSlip = generateThermalReceiptText({
        billNumber: bill.billNumber,
        tableNumber: bill.tableNumber,
        orderType: bill.orderType,
        customer: bill.customer,
        cashierName: bill.cashierName,
        items: bill.items || [],
        subtotal: bill.subtotal || 0,
        discountAmount: bill.discountAmount || 0,
        discountReason: bill.discountReason,
        packagingCharge: bill.packagingCharge || 0,
        deliveryCharge: bill.deliveryCharge || 0,
        serviceChargeAmount: bill.serviceChargeAmount || 0,
        cgst: bill.cgst || 0,
        sgst: bill.sgst || 0,
        roundOff: bill.roundOff || 0,
        totalAmount: bill.totalAmount || 0,
        paymentMode: bill.paymentMode,
        splitDetails: bill.splitDetails,
        transactionRef: bill.transactionRef,
        settledAt: bill.settledAt || bill.createdAt,
        isDuplicate: true,
        reprintCount: bill.reprintCount,
        settings: db.settings,
        formatOverrides,
      });

      const thermalSlipHtml = generateThermalSlipHtml({
        billNumber: bill.billNumber,
        tableNumber: bill.tableNumber,
        orderType: bill.orderType,
        persons: bill.persons || 1,
        customer: bill.customer,
        cashierName: bill.cashierName,
        waiterName: bill.waiterName || '',
        items: bill.items || [],
        subtotal: bill.subtotal || 0,
        discountAmount: bill.discountAmount || 0,
        discountReason: bill.discountReason,
        packagingCharge: bill.packagingCharge || 0,
        deliveryCharge: bill.deliveryCharge || 0,
        serviceChargeAmount: bill.serviceChargeAmount || 0,
        cgst: bill.cgst || 0,
        sgst: bill.sgst || 0,
        roundOff: bill.roundOff || 0,
        totalAmount: bill.totalAmount || 0,
        paymentMode: bill.paymentMode,
        paymentStatus: bill.paymentStatus || 'PAID',
        splitDetails: bill.splitDetails,
        transactionRef: bill.transactionRef,
        settledAt: bill.settledAt || bill.createdAt,
        isDuplicate: true,
        reprintCount: bill.reprintCount,
        settings: db.settings,
        formatOverrides,
      });

      bill.thermalSlip = thermalSlip;
      bill.thermalSlipHtml = thermalSlipHtml;

      recordAuditLog({
        user: callerName,
        role: 'CASHIER',
        module: 'POS_BILLING',
        action: 'DUPLICATE_REPRINT',
        detail: `Duplicate reprint #${bill.reprintCount} generated for Bill #${bill.billNumber} by ${callerName}.`,
      });

      await saveDbAsync(db);

      return NextResponse.json({
        success: true,
        message: `Duplicate reprint #${bill.reprintCount} logged for Bill #${bill.billNumber}`,
        bill,
        thermalReceipt: thermalSlip,
        thermalSlipHtml,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION: PREVIEW THERMAL SLIP
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'PREVIEW_THERMAL_SLIP') {
      const receipt = generateThermalReceiptText({
        ...body,
        settings: db.settings,
      });
      return NextResponse.json({ success: true, thermalReceipt: receipt });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 3: VOID / CANCEL BILL OR ORDER WITH MANDATORY AUDIT LOG
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'VOID_BILL') {
      const { billNumber, tableNumber, reason, authorizedBy, managerPin } = body;

      if (!reason || reason.trim().length < 4) {
        return NextResponse.json({ success: false, error: 'A mandatory reason is required to void or cancel a bill' }, { status: 400 });
      }

      if (managerPin !== '1234' && authorizedBy !== 'Aswin (Lead Architect)' && authorizedBy !== 'Owner - Sri Gokulam') {
        return NextResponse.json({ success: false, error: 'Invalid Manager PIN. Operation requires manager authorization.' }, { status: 403 });
      }

      const bill = (db.bills || []).find(b => b.billNumber === billNumber);
      if (bill) {
        bill.paymentStatus = 'VOIDED';
        bill.voidReason = reason;
        bill.voidedBy = authorizedBy;
        bill.voidedAt = new Date().toISOString();

        // Adjust shift totals if cash
        if (bill.paymentMode === 'CASH' && db.shifts && db.shifts[0]) {
          db.shifts[0].cashSales = Math.max(0, (db.shifts[0].cashSales || 0) - bill.totalAmount);
        }
      }

      // Restore table status if table provided
      if (tableNumber) {
        const table = (db.tables || []).find(t => String(t.tableNumber) === String(tableNumber));
        if (table) table.status = 'AVAILABLE';
      }

      // Log into refund_logs & audit_logs
      db.refund_logs = db.refund_logs || [];
      const logEntry = {
        id: `void_${Date.now()}`,
        type: 'VOID',
        billNumber: billNumber || 'N/A',
        tableNumber: tableNumber || 'N/A',
        amount: bill?.totalAmount || 0,
        reason,
        authorizedBy,
        timestamp: new Date().toISOString(),
      };
      db.refund_logs.unshift(logEntry);

      recordAuditLog({
        user: authorizedBy,
        role: 'MANAGER',
        module: 'POS_BILLING',
        action: 'BILL_VOIDED',
        detail: `Bill #${billNumber || 'N/A'} (₹${bill?.totalAmount || 0}) voided/cancelled by ${authorizedBy}. Reason: ${reason}.`,
      });

      await saveDbAsync(db);

      try {
        broadcast('BILL_VOIDED', { billNumber, tableNumber, reason });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Bill ${billNumber} voided and recorded in audit log`,
        log: logEntry,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 4: PROCESS REFUND WITH REASON & AUDIT
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'PROCESS_REFUND') {
      const { billNumber, amount, reason, authorizedBy, managerPin } = body;

      if (!reason || !amount || Number(amount) <= 0) {
        return NextResponse.json({ success: false, error: 'Valid amount and mandatory refund reason are required' }, { status: 400 });
      }

      if (managerPin !== '1234' && authorizedBy !== 'Aswin (Lead Architect)' && authorizedBy !== 'Owner - Sri Gokulam') {
        return NextResponse.json({ success: false, error: 'Invalid Manager PIN. Refund requires manager authorization.' }, { status: 403 });
      }

      const bill = (db.bills || []).find(b => b.billNumber === billNumber || b.id === billNumber);
      if (bill) {
        bill.refundAmount = (bill.refundAmount || 0) + Number(amount);
        bill.refundReason = reason;
        bill.refundedBy = authorizedBy;
        bill.refundedAt = new Date().toISOString();
        if (bill.refundAmount >= bill.totalAmount) {
          bill.paymentStatus = 'REFUNDED';
        } else {
          bill.paymentStatus = 'PARTIALLY_REFUNDED';
        }
      }

      db.refund_logs = db.refund_logs || [];
      const refundLog = {
        id: `ref_${Date.now()}`,
        type: 'REFUND',
        billNumber,
        amount: Number(amount),
        reason,
        authorizedBy,
        timestamp: new Date().toISOString(),
      };
      db.refund_logs.unshift(refundLog);

      recordAuditLog({
        user: authorizedBy,
        role: 'MANAGER',
        module: 'POS_BILLING',
        action: 'BILL_REFUNDED',
        detail: `Refund of ₹${amount} processed for Bill #${billNumber} by ${authorizedBy}. Reason: ${reason}.`,
      });

      await saveDbAsync(db);

      return NextResponse.json({
        success: true,
        message: `Refund of ₹${amount} processed for Bill ${billNumber}`,
        refund: refundLog,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 5: HOLD & RESUME ORDER
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'HOLD_ORDER') {
      const { orderData } = body;
      if (!orderData || !orderData.items || orderData.items.length === 0) {
        return NextResponse.json({ success: false, error: 'Cannot hold empty cart' }, { status: 400 });
      }

      db.held_orders = db.held_orders || [];
      const held = {
        id: `held_${Date.now()}`,
        ...orderData,
        heldAt: new Date().toISOString(),
      };
      db.held_orders.unshift(held);
      await saveDbAsync(db);

      return NextResponse.json({ success: true, message: 'Order placed on hold', heldOrder: held });
    }

    if (action === 'RESUME_ORDER') {
      const { orderId } = body;
      db.held_orders = db.held_orders || [];
      const index = db.held_orders.findIndex(h => h.id === orderId);
      if (index === -1) {
        return NextResponse.json({ success: false, error: 'Held order not found' }, { status: 404 });
      }

      const resumed = db.held_orders.splice(index, 1)[0];
      await saveDbAsync(db);

      return NextResponse.json({ success: true, message: 'Order resumed successfully', resumedOrder: resumed });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 6: ACCEPT & MERGE QR ORDER INTO TABLE SESSION
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'MERGE_QR_ORDER') {
      const { qrOrderId } = body;
      db.qr_orders = db.qr_orders || [];
      const qrOrder = db.qr_orders.find(q => q.id === qrOrderId);
      if (!qrOrder) {
        return NextResponse.json({ success: false, error: 'QR Order not found' }, { status: 404 });
      }

      // Convert QR order into active order
      const tPad = String(qrOrder.tableNumber).padStart(2, '0');
      const orderId = `ord_qr_${Date.now()}`;
      const kotNumber = `KOT-${tPad}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newOrder = {
        id: orderId,
        orderId,
        orderNumber: kotNumber,
        tableNumber: tPad,
        orderType: 'DINE_IN',
        customerName: qrOrder.customerName || 'QR Guest',
        customerPhone: qrOrder.phone || '',
        guestName: qrOrder.customerName || 'QR Guest',
        items: qrOrder.items,
        subtotal: qrOrder.subtotal,
        status: 'NEW',
        paymentStatus: 'UNPAID',
        paymentMethod: null,
        createdAt: new Date().toISOString(),
      };

      db.orders = db.orders || [];
      db.orders.push(newOrder);

      // Mark QR order as ACCEPTED
      qrOrder.status = 'ACCEPTED';

      // Set table to OCCUPIED
      const table = (db.tables || []).find(t => String(t.tableNumber) === String(qrOrder.tableNumber));
      if (table) {
        table.status = 'OCCUPIED';
        table.activeOrderId = orderId;
      }

      await saveDbAsync(db);

      try {
        broadcast('QR_ORDER_ACCEPTED', { qrOrderId, tableNumber: tPad });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `QR Order at Table #${tPad} accepted and merged into POS`,
        order: newOrder,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 7: CASHIER SHIFT MANAGEMENT
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'SHIFT_ACTION') {
      const { shiftAction, openingFloat, payoutAmount, payoutReason, closingCash, cashierName } = body;
      db.shifts = db.shifts || [];
      let shift = db.shifts[0];

      if (shiftAction === 'START_SHIFT') {
        shift = {
          id: `shift_${Date.now()}`,
          cashierName: cashierName || 'Rajan (POS Cashier)',
          startedAt: new Date().toISOString(),
          openingFloat: Number(openingFloat) || 0,
          cashSales: 0,
          upiSales: 0,
          cardSales: 0,
          payouts: [],
          status: 'OPEN',
        };
        db.shifts.unshift(shift);
      } else if (shiftAction === 'CASH_PAYOUT') {
        if (!shift) return NextResponse.json({ success: false, error: 'No active shift' }, { status: 400 });
        shift.payouts = shift.payouts || [];
        shift.payouts.push({
          id: `pay_${Date.now()}`,
          amount: Number(payoutAmount) || 0,
          reason: payoutReason || 'Petty Cash Expense',
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        });
      } else if (shiftAction === 'CLOSE_SHIFT') {
        if (!shift) return NextResponse.json({ success: false, error: 'No active shift' }, { status: 400 });
        const totalPayouts = (shift.payouts || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const expectedCash = (shift.openingFloat || 0) + (shift.cashSales || 0) - totalPayouts;
        const actualCash = Number(closingCash) || 0;
        const difference = actualCash - expectedCash;

        shift.closedAt = new Date().toISOString();
        shift.closingCash = actualCash;
        shift.expectedCash = expectedCash;
        shift.difference = difference;
        shift.status = 'CLOSED';
      }

      await saveDbAsync(db);
      return NextResponse.json({ success: true, message: `Shift operation '${shiftAction}' updated`, shift });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('POS POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
