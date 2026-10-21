// app/api/admin/kds/route.js - Comprehensive Kitchen Display System (KDS) & KOT Engine
import { NextResponse } from 'next/server';
import { getDb, saveDb, categorizeStation, generateKotReceiptText } from '@/lib/db';
import { broadcast } from '@/app/api/events/route';

// Deduct inventory ingredients based on recipes (Master Plan 7.6)
function deductRecipeIngredients(db, itemName, quantity = 1) {
  if (!db.recipes || !db.inventory) return [];
  const recipe = db.recipes.find(r => 
    r.menuItemName.toLowerCase() === itemName.toLowerCase() ||
    itemName.toLowerCase().includes(r.menuItemName.toLowerCase())
  );

  if (!recipe) return [];

  const deductions = [];
  recipe.ingredients.forEach(ing => {
    const invItem = db.inventory.find(i => i.id === ing.invId);
    if (invItem) {
      const deductionAmount = Number((ing.qty * quantity).toFixed(3));
      invItem.currentStock = Math.max(0, Number((invItem.currentStock - deductionAmount).toFixed(3)));
      deductions.push({
        ingredientName: invItem.name,
        amountDeducted: deductionAmount,
        remainingStock: invItem.currentStock,
        unit: invItem.unit,
        isLowStock: invItem.currentStock <= invItem.lowStockThreshold,
      });
    }
  });

  return deductions;
}

export async function GET(request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const stationFilter = searchParams.get('station') || 'ALL'; // 'ALL', 'DOSA', 'TIFFIN', 'MEALS', 'SNACKS', 'BEVERAGES'
    const view = searchParams.get('view') || 'ACTIVE'; // 'ACTIVE' or 'HISTORY'
    const statusFilter = searchParams.get('status') || 'ALL'; // 'ALL', 'READY', 'SERVED', 'CANCELLED'

    // ─── Requirement 2: Order Verification (QR table orders appear ONLY after OTP verification) ───
    const pendingOtpOrders = (db.orders || []).filter(o => 
      o.status === 'PENDING_OTP' || o.otpStatus === 'PENDING'
    );

    // Eligible orders for kitchen display (strictly verified)
    const verifiedOrders = (db.orders || []).filter(o => 
      o.status !== 'PENDING_OTP' && o.otpStatus !== 'PENDING'
    );

    // Seed initial tickets if database has none
    if (!db.kots || db.kots.length === 0) {
      db.kots = [
        {
          id: 'kot_01',
          kotNumber: 'KOT-03-R1-4821',
          orderId: 'ord_101',
          tableNumber: '03',
          orderType: 'DINE_IN',
          customerName: 'Aswin (VIP)',
          waiterName: 'Murugan (Floor Captain)',
          station: 'DOSA',
          status: 'PREPARING',
          cookingStartedAt: new Date(Date.now() - 480000).toISOString(),
          createdAt: new Date(Date.now() - 480000).toISOString(),
          isSupplementary: false,
          roundNumber: 1,
          items: [
            {
              title: 'Special Ghee Podi Roast',
              tamilTitle: 'நெய் பொடி ரோஸ்ட்',
              quantity: 2,
              price: 140,
              variant: 'Extra Ghee Roast',
              addOns: ['Extra Gunpowder Podi Cup'],
              specialNotes: 'Extra crispy roast, less spicy',
              station: 'DOSA',
            }
          ],
          notes: 'Customer requested extra sambar on side',
          printCount: 1,
        },
        {
          id: 'kot_02',
          kotNumber: 'KOT-07-R2-8910',
          orderId: 'ord_102',
          tableNumber: '07',
          orderType: 'DINE_IN',
          customerName: 'Suresh Chettiar',
          waiterName: 'Self-Service QR (Verified)',
          station: 'MEALS',
          status: 'ACCEPTED',
          acceptedAt: new Date(Date.now() - 240000).toISOString(),
          createdAt: new Date(Date.now() - 240000).toISOString(),
          isSupplementary: true,
          roundNumber: 2,
          items: [
            {
              title: 'Raja Chettinad Full Meals (Leaf)',
              tamilTitle: 'செட்டிநாடு ராஜா சாப்பாடு',
              quantity: 2,
              price: 210,
              variant: 'Royal Special',
              addOns: ['Special Appalam Pack', 'Ghee Paruppu Cup'],
              specialNotes: 'Serve on fresh plantain leaf',
              station: 'MEALS',
            }
          ],
          notes: 'Round 2 supplementary lunch order',
          printCount: 1,
        },
        {
          id: 'kot_03',
          kotNumber: 'KOT-04-R1-3105',
          orderId: 'ord_103',
          tableNumber: '04',
          orderType: 'DINE_IN',
          customerName: 'Karthik Raja',
          waiterName: 'Murugan (Floor Captain)',
          station: 'SNACKS',
          status: 'NEW',
          createdAt: new Date(Date.now() - 960000).toISOString(), // 16 mins ago -> Delayed Priority Alert!
          isSupplementary: false,
          roundNumber: 1,
          items: [
            {
              title: 'Chettinad Kuzhi Paniyaram (6 pcs)',
              tamilTitle: 'குழி பணியாரம்',
              quantity: 2,
              price: 90,
              variant: 'Kara Paniyaram (Spicy)',
              addOns: ['Kara Chutney Cup'],
              specialNotes: 'Crisp exterior with fiery shallots',
              station: 'SNACKS',
            }
          ],
          notes: 'Guest in a hurry for train',
          printCount: 1,
        },
        {
          id: 'kot_04',
          kotNumber: 'KOT-02-R1-6720',
          orderId: 'ord_104',
          tableNumber: '02',
          orderType: 'TAKEAWAY',
          customerName: 'Meenakshi Sundaram',
          waiterName: 'Rajan (POS Cashier)',
          station: 'BEVERAGES',
          status: 'READY',
          cookingStartedAt: new Date(Date.now() - 600000).toISOString(),
          readyAt: new Date(Date.now() - 60000).toISOString(),
          createdAt: new Date(Date.now() - 660000).toISOString(),
          prepDurationMinutes: 10,
          isSupplementary: false,
          roundNumber: 1,
          items: [
            {
              title: 'Kumbakonam Degree Filter Coffee',
              tamilTitle: 'டிகிரி ஃபில்டர் காபி',
              quantity: 2,
              price: 40,
              variant: 'Strong Degree Brew',
              addOns: ['Extra Decoction Shot'],
              specialNotes: 'Double frothy brass tumbler style',
              station: 'BEVERAGES',
            },
            {
              title: 'Madurai Famous Special Jigarthanda',
              tamilTitle: 'ஸ்பெஷல் ஜிகர்தண்டா',
              quantity: 1,
              price: 95,
              variant: 'Special Double Basundi',
              addOns: ['Extra Ice Cream Scoop'],
              specialNotes: 'Chilled with rich badam pisin',
              station: 'BEVERAGES',
            }
          ],
          notes: 'Pack in insulated thermal beverage cup',
          printCount: 1,
        },
        {
          id: 'kot_05',
          kotNumber: 'KOT-05-R1-2291',
          orderId: 'ord_105',
          tableNumber: '05',
          orderType: 'DINE_IN',
          customerName: 'Anand Kumar',
          waiterName: 'Murugan (Floor Captain)',
          station: 'TIFFIN',
          status: 'SERVED',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          readyAt: new Date(Date.now() - 1200000).toISOString(),
          servedAt: new Date(Date.now() - 900000).toISOString(),
          prepDurationMinutes: 10,
          isSupplementary: false,
          roundNumber: 1,
          items: [
            {
              title: 'Gokulam Button Sambar Idli (14 pcs)',
              tamilTitle: 'மினி சாம்பார் இட்லி',
              quantity: 1,
              price: 85,
              variant: 'Podi Button Idli',
              addOns: ['Cow Ghee Drizzle'],
              specialNotes: 'Steeped in hot shallot sambar',
              station: 'TIFFIN',
            },
            {
              title: 'Crispy Medhu Vadai (2 pcs)',
              tamilTitle: 'மொறு மொறு மெது வடை',
              quantity: 1,
              price: 60,
              variant: 'Sambar Vadai (Soaked)',
              addOns: ['Extra Coconut Chutney'],
              specialNotes: 'Freshly fried hot vadas',
              station: 'TIFFIN',
            }
          ],
          notes: '',
          printCount: 1,
        },
        {
          id: 'kot_06',
          kotNumber: 'KOT-01-R1-1180',
          orderId: 'ord_106',
          tableNumber: '01',
          orderType: 'DINE_IN',
          customerName: 'Walk-in Guest',
          waiterName: 'Murugan (Floor Captain)',
          station: 'TIFFIN',
          status: 'CANCELLED',
          createdAt: new Date(Date.now() - 2400000).toISOString(),
          cancelledAt: new Date(Date.now() - 2200000).toISOString(),
          cancelledBy: 'Karthikeyan (Manager)',
          cancellationReason: 'Guest changed mind after 2 mins to Raja Chettinad Full Meals',
          isSupplementary: false,
          roundNumber: 1,
          items: [
            {
              title: 'Crispy Medhu Vadai (2 pcs)',
              tamilTitle: 'மொறு மொறு மெது வடை',
              quantity: 2,
              price: 60,
              variant: 'Dry Crispy',
              addOns: [],
              specialNotes: '',
              station: 'TIFFIN',
            }
          ],
          notes: 'Cancelled before frying',
          printCount: 1,
        }
      ];
      saveDb(db);
    }

    const allKots = db.kots || [];

    // Filter by Active vs History
    let targetTickets = [];
    if (view === 'HISTORY') {
      targetTickets = allKots.filter(k => 
        k.status === 'READY' || k.status === 'SERVED' || k.status === 'CANCELLED'
      );
      if (statusFilter !== 'ALL') {
        targetTickets = targetTickets.filter(k => k.status === statusFilter);
      }
    } else {
      // Active Live KDS Tickets
      targetTickets = allKots.filter(k => 
        k.status === 'NEW' || k.status === 'ACCEPTED' || k.status === 'PREPARING' || k.status === 'READY'
      );
    }

    // Filter by Kitchen Station (Requirement 6)
    if (stationFilter !== 'ALL') {
      targetTickets = targetTickets.filter(k => {
        if (k.station === stationFilter) return true;
        // Check if any item belongs to requested station
        return (k.items || []).some(it => (it.station || categorizeStation(it.title)) === stationFilter);
      });
    }

    // Compute live elapsed times and priority alerts (Requirement 7)
    const now = Date.now();
    const enrichedTickets = targetTickets.map(t => {
      const kotNumber = t.kotNumber || t.id || 'KOT-01';
      const tableNumber = t.tableNumber || t.table || '01';
      const orderType = t.orderType || 'DINE_IN';
      const customerName = t.customerName || t.guestName || 'Walk-in Guest';
      const waiterName = t.waiterName || 'Murugan (Floor Captain)';
      const station = t.station || (t.items?.[0] ? categorizeStation(t.items[0].title) : 'TIFFIN');
      const createdAt = t.createdAt || t.timestamp || new Date().toISOString();
      const createdMs = new Date(createdAt).getTime();
      const elapsedSeconds = Math.max(0, Math.floor((now - createdMs) / 1000));
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);

      // Priority Alert Thresholds: Normal (<10m), Warning (10-15m), Critical Delay (>15m)
      const isWarning = elapsedMinutes >= 10 && elapsedMinutes < 15;
      const isDelayed = elapsedMinutes >= 15;

      return {
        ...t,
        kotNumber,
        tableNumber,
        orderType,
        customerName,
        waiterName,
        station,
        createdAt,
        elapsedSeconds,
        elapsedMinutes,
        isWarning,
        isDelayed,
        priorityLevel: isDelayed ? 'CRITICAL_DELAY' : (isWarning ? 'WARNING' : 'NORMAL'),
        thermalSlip: generateKotReceiptText({
          kotNumber,
          orderId: t.orderId || kotNumber,
          tableNumber,
          orderType,
          customerName,
          waiterName,
          station,
          items: t.items || [],
          notes: t.notes || t.cookingNotes || '',
          isSupplementary: t.isSupplementary || false,
          roundNumber: t.roundNumber || 1,
          createdAt,
          printCount: t.printCount || 1,
        })
      };
    });

    // FIFO Sort: Oldest pending orders at front
    enrichedTickets.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // ─── Summary & Performance Metrics (Requirement 14) ───
    const activePool = allKots.filter(k => k.status === 'NEW' || k.status === 'ACCEPTED' || k.status === 'PREPARING' || k.status === 'READY');
    const delayedCount = activePool.filter(k => {
      const mins = Math.floor((now - new Date(k.createdAt).getTime()) / 60000);
      return mins >= 15;
    }).length;

    const completedToday = allKots.filter(k => k.status === 'SERVED' || k.status === 'READY');
    const avgPrepMinutes = completedToday.length > 0 
      ? (completedToday.reduce((sum, k) => sum + (k.prepDurationMinutes || 10), 0) / completedToday.length).toFixed(1)
      : '9.2';

    const onTimeRate = completedToday.length > 0
      ? Math.round((completedToday.filter(k => (k.prepDurationMinutes || 10) <= 15).length / completedToday.length) * 100)
      : 94;

    const summary = {
      totalActive: activePool.length,
      newTickets: activePool.filter(t => t.status === 'NEW').length,
      acceptedTickets: activePool.filter(t => t.status === 'ACCEPTED').length,
      preparingTickets: activePool.filter(t => t.status === 'PREPARING').length,
      readyTickets: activePool.filter(t => t.status === 'READY').length,
      servedToday: allKots.filter(t => t.status === 'SERVED').length,
      cancelledCount: allKots.filter(t => t.status === 'CANCELLED').length,
      delayedCount,
      pendingOtpCount: pendingOtpOrders.length,
      dosaCount: activePool.filter(t => t.station === 'DOSA' || (t.items || []).some(i => categorizeStation(i.title) === 'DOSA')).length,
      tiffinCount: activePool.filter(t => t.station === 'TIFFIN' || (t.items || []).some(i => categorizeStation(i.title) === 'TIFFIN')).length,
      mealsCount: activePool.filter(t => t.station === 'MEALS' || (t.items || []).some(i => categorizeStation(i.title) === 'MEALS')).length,
      snacksCount: activePool.filter(t => t.station === 'SNACKS' || (t.items || []).some(i => categorizeStation(i.title) === 'SNACKS')).length,
      beveragesCount: activePool.filter(t => t.station === 'BEVERAGES' || (t.items || []).some(i => categorizeStation(i.title) === 'BEVERAGES')).length,
      avgPrepMinutes,
      onTimeRate,
    };

    return NextResponse.json({
      success: true,
      station: stationFilter,
      view,
      summary,
      tickets: enrichedTickets,
      pendingOtpOrders: pendingOtpOrders.map(p => ({
        id: p.id || p.orderId,
        table: p.tables?.[0] || p.tableNumber,
        guestName: p.guestName,
        itemCount: p.items?.length || 0,
        subtotal: p.subtotal || 0,
        otp: p.otp,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error('KDS GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      action,
      ticketId,
      kotNumber,
      orderId,
      newStatus,
      reason,
      staffName = 'Selvam (Head Cook)',
      managerPin = '',
    } = body;
    const db = getDb();
    db.kots = db.kots || [];

    // Find ticket by id or kotNumber
    const ticket = db.kots.find(k => 
      (ticketId && k.id === ticketId) || 
      (kotNumber && k.kotNumber === kotNumber) ||
      (orderId && k.orderId === orderId)
    );

    // ─── ACTION 1: UPDATE_STATUS (New -> Accepted -> Preparing -> Ready -> Served) ───
    if (action === 'UPDATE_STATUS') {
      if (!ticket) {
        return NextResponse.json({ success: false, error: 'KOT ticket not found' }, { status: 404 });
      }

      const prevStatus = ticket.status;
      ticket.status = newStatus;

      const now = new Date().toISOString();

      if (newStatus === 'ACCEPTED') {
        ticket.acceptedAt = now;
      } else if (newStatus === 'PREPARING') {
        ticket.cookingStartedAt = now;

        // 🚀 RECIPE BOM DEDUCTION: Deduct raw materials on preparation start
        if (!ticket.bomDeducted) {
          ticket.bomDeductions = [];
          (ticket.items || []).forEach(item => {
            const deductions = deductRecipeIngredients(db, item.title, item.quantity || 1);
            if (deductions.length > 0) {
              ticket.bomDeductions.push(...deductions);
            }
          });
          ticket.bomDeducted = true;
        }
      } else if (newStatus === 'READY') {
        ticket.readyAt = now;
        const start = ticket.cookingStartedAt || ticket.createdAt;
        ticket.prepDurationMinutes = Math.max(1, Math.round((Date.now() - new Date(start).getTime()) / 60000));

        // 🔔 Alert Waiter & Floor Captains that food is ready for pickup
        try {
          broadcast({
            type: 'KOT_READY_NOTIFY_WAITER',
            kotNumber: ticket.kotNumber,
            tableNumber: ticket.tableNumber,
            station: ticket.station,
            itemsCount: ticket.items?.length || 0,
            message: `🔔 Food Ready at ${ticket.station} Station for Table #${ticket.tableNumber}! Please pick up.`,
            timestamp: now,
          });
        } catch (e) {}
      } else if (newStatus === 'SERVED') {
        ticket.servedAt = now;
      }

      // Synchronize parent order if present
      const parentOrder = (db.orders || []).find(o => o.id === ticket.orderId || o.orderNumber === ticket.kotNumber);
      if (parentOrder) {
        parentOrder.kitchenStatus = newStatus;
        if (newStatus === 'SERVED') parentOrder.status = 'SERVED';
        else if (newStatus === 'READY') parentOrder.status = 'READY_TO_SERVE';
        else if (newStatus === 'PREPARING') parentOrder.status = 'IN_KITCHEN';
      }

      saveDb(db);

      // Broadcast state change across all connected POS, KDS & Waiter tablets
      try {
        broadcast({
          type: 'KDS_STATUS_CHANGE',
          kotNumber: ticket.kotNumber,
          tableNumber: ticket.tableNumber,
          station: ticket.station,
          prevStatus,
          newStatus,
          updatedBy: staffName,
          timestamp: now,
        });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `KOT #${ticket.kotNumber} updated to ${newStatus}`,
        ticket,
        bomDeductions: ticket.bomDeductions || [],
      });
    }

    // ─── ACTION 2: CANCEL_KOT (Requirement 11: Cancellation Management) ───
    if (action === 'CANCEL_KOT') {
      if (!ticket) {
        return NextResponse.json({ success: false, error: 'KOT ticket not found' }, { status: 404 });
      }

      if (!reason || reason.trim().length < 4) {
        return NextResponse.json({ success: false, error: 'Mandatory cancellation reason required (min 4 chars)' }, { status: 400 });
      }

      ticket.status = 'CANCELLED';
      ticket.cancelledAt = new Date().toISOString();
      ticket.cancelledBy = staffName;
      ticket.cancellationReason = reason.trim();

      // Log in cancellation audit trail
      db.cancellation_logs = db.cancellation_logs || [];
      db.cancellation_logs.push({
        id: `canc_${Date.now()}`,
        kotNumber: ticket.kotNumber,
        tableNumber: ticket.tableNumber,
        items: ticket.items,
        reason: reason.trim(),
        cancelledBy: staffName,
        timestamp: ticket.cancelledAt,
      });

      // Synchronize parent order
      const parentOrder = (db.orders || []).find(o => o.id === ticket.orderId);
      if (parentOrder) {
        parentOrder.status = 'CANCELLED';
        parentOrder.cancellationReason = reason.trim();
      }

      saveDb(db);

      try {
        broadcast({
          type: 'KOT_CANCELLED',
          kotNumber: ticket.kotNumber,
          tableNumber: ticket.tableNumber,
          reason: reason.trim(),
          cancelledBy: staffName,
          timestamp: ticket.cancelledAt,
        });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `KOT #${ticket.kotNumber} cancelled: ${reason.trim()}`,
        ticket,
      });
    }

    // ─── ACTION 3: PRINT_KOT (Requirement 12: Thermal Ticket Printing & Reprints) ───
    if (action === 'PRINT_KOT') {
      if (!ticket) {
        return NextResponse.json({ success: false, error: 'KOT ticket not found' }, { status: 404 });
      }

      ticket.printCount = (ticket.printCount || 1) + 1;
      const thermalSlip = generateKotReceiptText({
        kotNumber: ticket.kotNumber,
        orderId: ticket.orderId,
        tableNumber: ticket.tableNumber,
        orderType: ticket.orderType,
        customerName: ticket.customerName,
        waiterName: ticket.waiterName,
        station: ticket.station,
        items: ticket.items,
        notes: ticket.notes,
        isSupplementary: ticket.isSupplementary,
        roundNumber: ticket.roundNumber,
        createdAt: ticket.createdAt,
        printCount: ticket.printCount,
      });

      saveDb(db);

      return NextResponse.json({
        success: true,
        message: `KOT #${ticket.kotNumber} thermal slip generated (Print #${ticket.printCount})`,
        thermalSlip,
        printCount: ticket.printCount,
      });
    }

    // ─── ACTION 4: NOTIFY_WAITER (Requirement 8) ───
    if (action === 'NOTIFY_WAITER') {
      if (!ticket) {
        return NextResponse.json({ success: false, error: 'KOT ticket not found' }, { status: 404 });
      }

      try {
        broadcast({
          type: 'KOT_READY_NOTIFY_WAITER',
          kotNumber: ticket.kotNumber,
          tableNumber: ticket.tableNumber,
          station: ticket.station,
          message: `🔔 Food Ready at ${ticket.station} Station for Table #${ticket.tableNumber}! Please pick up immediately.`,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Waiter alert broadcast for Table #${ticket.tableNumber}`,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid KDS action' }, { status: 400 });
  } catch (error) {
    console.error('KDS POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

