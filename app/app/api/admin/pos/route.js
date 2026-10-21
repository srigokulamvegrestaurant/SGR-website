// app/api/admin/pos/route.js - Comprehensive High-Speed Touch POS & ESC/POS Engine
import { NextResponse } from 'next/server';
import { getDb, saveDb, categorizeStation, deductRecipeBom, recordAuditLog, recordCustomerTransaction } from '@/lib/db';
import { broadcast } from '@/app/api/events/route';
import { generateThermalReceiptText, DEFAULT_BILL_SLIP_FORMAT } from '@/lib/thermalSlipFormatter';

export { generateThermalReceiptText };

export async function GET(request) {
  try {
    const db = getDb();
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

    const recentBills = (db.bills || []).slice(-50).reverse().map(b => {
      if (!b.thermalSlip) {
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
      menu: db.menu || [],
      customers: db.customers || [],
      recentBills,
      currentShift,
      heldOrders: db.held_orders || [],
      qrOrders: db.qr_orders || [],
      refundLogs: db.refund_logs || [],
      settings: db.settings,
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
    const db = getDb();

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 1: PUNCH KOT & SEND TO KITCHEN STATIONS
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'PUNCH_KOT') {
      const {
        orderType = 'DINE_IN',
        tableNumber = '01',
        customer = { name: 'Walk-in', phone: '' },
        items = [],
        cashierName = 'Rajan (POS 01)',
      } = body;

      if (!items || items.length === 0) {
        return NextResponse.json({ success: false, error: 'Shopping cart is empty' }, { status: 400 });
      }

      const tPad = String(tableNumber).padStart(2, '0');
      const kotNumber = `KOT-${orderType === 'TAKEAWAY' ? 'TK' : tPad}-${Math.floor(1000 + Math.random() * 9000)}`;
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

      // Create Order
      const newOrder = {
        id: orderId,
        orderId,
        orderNumber: kotNumber,
        tableNumber: orderType === 'TAKEAWAY' ? 'TK' : tPad,
        orderType,
        customerName: customer.name || 'Walk-in Guest',
        customerPhone: customer.phone || '',
        guestName: customer.name || 'Guest',
        items: enrichedItems,
        subtotal,
        status: 'NEW',
        paymentStatus: 'UNPAID',
        paymentMethod: null,
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
        tableNumber: orderType === 'TAKEAWAY' ? 'TK' : tPad,
        orderType,
        customerName: customer.name || 'Walk-in',
        items: enrichedItems,
        station: enrichedItems[0]?.station || 'TIFFIN',
        status: 'NEW',
        createdAt,
      };

      db.kots = db.kots || [];
      db.kots.push(newKot);

      // If Dine-in, mark table as OCCUPIED
      if (orderType === 'DINE_IN') {
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

      saveDb(db);

      // Broadcast real-time SSE event for KDS & Table displays
      try {
        broadcast('KOT_CREATED', {
          kotNumber,
          tableNumber: orderType === 'TAKEAWAY' ? 'TK' : tPad,
          orderType,
          itemsCount: enrichedItems.length,
          subtotal,
          station: newKot.station,
          status: 'NEW',
        });
      } catch (e) {
        console.error('SSE broadcast error:', e);
      }

      return NextResponse.json({
        success: true,
        message: `KOT ${kotNumber} created & routed to Kitchen successfully`,
        kot: newKot,
        order: newOrder,
        bomAlerts,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 2: SETTLE BILL (FULL, PARTIAL, SPLIT & THERMAL RECEIPT)
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
      } = body;

      if (!tableNumber && orderType === 'DINE_IN') {
        return NextResponse.json({ success: false, error: 'Table number is required for Dine-in' }, { status: 400 });
      }

      const tPad = String(tableNumber || '').padStart(2, '0');

      // Find active orders for this table or takeaway
      const activeOrders = (db.orders || []).filter(o => {
        if (orderType === 'TAKEAWAY') {
          return (o.orderType === 'TAKEAWAY' || o.tableNumber === 'TK') && o.status !== 'CANCELLED' && o.status !== 'PAID_SETTLED';
        }
        return (String(o.tableNumber) === String(tableNumber) || String(o.tableNumber) === tPad || o.tables?.includes(tPad) || o.tables?.includes(String(tableNumber))) &&
          o.status !== 'CANCELLED' && o.status !== 'PAID_SETTLED';
      });

      if (activeOrders.length === 0) {
        return NextResponse.json({ success: false, error: 'No active unbilled orders found' }, { status: 404 });
      }

      // Aggregate items
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

      const billNumber = `SGR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const settledAt = new Date().toISOString();

      const newBill = {
        id: `bill_${Date.now()}`,
        billNumber,
        tableNumber: orderType === 'TAKEAWAY' ? 'TK' : String(tableNumber),
        orderType,
        customer: customer || { name: activeOrders[0]?.customerName || 'Guest' },
        items,
        subtotal,
        discountAmount,
        discountReason,
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
        createdAt: settledAt,
        settledAt,
      };

      db.bills = db.bills || [];
      db.bills.push(newBill);

      // Mark all orders as PAID_SETTLED
      activeOrders.forEach(ord => {
        ord.status = 'PAID_SETTLED';
        ord.paymentStatus = 'PAID';
        ord.settledBillNumber = billNumber;
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

      // Update Table Status to CLEANING for Dine-In
      if (orderType === 'DINE_IN') {
        const table = (db.tables || []).find(t => String(t.tableNumber) === String(tableNumber) || String(t.tableNumber) === tPad);
        if (table) {
          table.status = 'CLEANING';
          table.activeOrderId = null;
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

      // Generate ESC/POS receipt
      const thermalReceipt = generateThermalReceiptText({
        billNumber,
        tableNumber: orderType === 'TAKEAWAY' ? 'TK' : String(tableNumber),
        orderType,
        customer: newBill.customer,
        cashierName,
        items,
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

      newBill.thermalSlip = thermalReceipt;
      saveDb(db);

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

      const billNumber = `SGR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const settledAt = new Date().toISOString();

      const newBill = {
        id: `bill_${Date.now()}`,
        billNumber,
        tableNumber: orderType === 'TAKEAWAY' ? 'TK' : orderType === 'DELIVERY' ? 'DEL' : String(tableNumber || '01'),
        orderType,
        customer: {
          name: customer.name || 'Walk-in Guest',
          phone: customer.phone || '',
          email: customer.email || '',
          address: customer.address || '',
          gstin: customer.gstin || '',
          tag: customer.tag || 'Walk-in',
        },
        items: billItems,
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

      // Generate ESC/POS receipt
      const thermalReceipt = generateThermalReceiptText({
        billNumber,
        tableNumber: newBill.tableNumber,
        orderType,
        customer: newBill.customer,
        cashierName,
        items: billItems,
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

      newBill.thermalSlip = thermalReceipt;

      db.bills = db.bills || [];
      db.bills.push(newBill);

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

      saveDb(db);

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
      if (updatedFields.customNotes !== undefined) bill.customNotes = updatedFields.customNotes;

      // If user did not provide a custom raw thermal slip text override, regenerate it with format options
      if (!updatedFields.thermalSlip) {
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
          settings: db.settings,
          formatOverrides: updatedFields.formatOverrides || {},
        });
      }

      bill.updatedAt = new Date().toISOString();
      bill.lastAmendedBy = callerName;

      recordAuditLog({
        user: callerName,
        role: 'CASHIER',
        module: 'POS_BILL_EDIT',
        action: 'BILL_AMENDED',
        detail: `Bill #${bill.billNumber} amended before print by ${callerName} (Net: ₹${bill.totalAmount}).`,
      });

      saveDb(db);

      return NextResponse.json({
        success: true,
        message: `Bill #${bill.billNumber} successfully updated`,
        bill,
        thermalReceipt: bill.thermalSlip,
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

      // Log into refund_logs
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

      saveDb(db);

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

      saveDb(db);

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
      saveDb(db);

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
      saveDb(db);

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

      saveDb(db);

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

      saveDb(db);
      return NextResponse.json({ success: true, message: `Shift operation '${shiftAction}' updated`, shift });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('POS POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
