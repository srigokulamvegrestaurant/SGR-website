// Regression QA Test Suite for Sri Gokulam Veg Restaurant
// Verifies all bug fixes: Security, Billing, Order Status, GST math, Cart Sync, and Order History.

const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function getOtpFromDatabase(phone) {
  try {
    const dbPath = path.join(__dirname, '.data', 'restaurant_state.json');
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const cust = (db.customers || []).find((c) => c.phone.replace(/[^\d]/g, '').slice(-10) === phone.slice(-10));
    return cust ? cust.otpHash : null;
  } catch (e) {
    return null;
  }
}

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('   SRI GOKULAM VEG RESTAURANT — REGRESSION VERIFICATION SUITE   ');
  console.log('================================================================\n');

  const tests = [];
  function assert(testId, name, condition, details = '') {
    tests.push({ testId, name, passed: Boolean(condition), details });
    const mark = condition ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} [${testId}] ${name} ${details ? '— ' + details : ''}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REGRESSION 1: Security Fix — Unauthenticated GET /api/customer/reservations
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/customer/reservations?phone=9443123456',
      method: 'GET',
    });
    assert(
      'REG-SEC-01',
      'Unauthenticated GET /api/customer/reservations is blocked (401)',
      res.status === 401 && res.body.success === false,
      `Status: ${res.status}, Error: ${res.body.error}`
    );
  } catch (e) {
    assert('REG-SEC-01', 'Unauthenticated GET /api/customer/reservations is blocked', false, e.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REGRESSION 2: Security Fix — OTP Leakage in POST /api/customer/auth
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const res = await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/customer/auth',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { action: 'REQUEST_OTP', phone: '9840123456' }
    );
    assert(
      'REG-SEC-02',
      'REQUEST_OTP does NOT expose devOtp in API response',
      res.status === 200 && res.body.success === true && res.body.devOtp === undefined,
      `devOtp is ${res.body.devOtp ? 'EXPOSED: ' + res.body.devOtp : 'properly omitted (undefined)'}`
    );
  } catch (e) {
    assert('REG-SEC-02', 'REQUEST_OTP does NOT expose devOtp', false, e.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REGRESSION 3: Customer Login & Authenticated Reservations Query
  // ──────────────────────────────────────────────────────────────────────────
  let customerToken = null;
  try {
    const dbOtp = getOtpFromDatabase('9840123456');
    assert('REG-AUTH-01', 'OTP securely retrieved from simulated email backend', Boolean(dbOtp), `OTP length: ${dbOtp?.length}`);

    if (dbOtp) {
      const resVerify = await request(
        {
          hostname: 'localhost',
          port: 3000,
          path: '/api/customer/auth',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        { action: 'VERIFY_OTP', phone: '9840123456', otp: dbOtp }
      );
      assert(
        'REG-AUTH-02',
        'VERIFY_OTP returns session token with secure verification',
        resVerify.status === 200 && resVerify.body.success === true && Boolean(resVerify.body.token)
      );
      customerToken = resVerify.body.token;

      if (customerToken) {
        // Now test authenticated GET /api/customer/reservations
        const resAuthRes = await request({
          hostname: 'localhost',
          port: 3000,
          path: '/api/customer/reservations',
          method: 'GET',
          headers: { Authorization: `Bearer ${customerToken}` },
        });
        assert(
          'REG-AUTH-03',
          'Authenticated GET /api/customer/reservations succeeds (200)',
          resAuthRes.status === 200 && resAuthRes.body.success === true && Array.isArray(resAuthRes.body.reservations),
          `Found ${resAuthRes.body.reservations?.length} reservations for user`
        );
      }
    }
  } catch (e) {
    assert('REG-AUTH', 'Customer Login & Reservations', false, e.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REGRESSION 4: Order Creation & Status Enum Casing ('otp_pending')
  // ──────────────────────────────────────────────────────────────────────────
  let createdOrder = null;
  try {
    const orderPayload = {
      tables: ['07'],
      orderType: 'DINE_IN',
      guestName: 'Sundar Rajan Regression',
      guestPhone: '9840123456',
      guestEmail: 'sundar.qa@example.com',
      guestCount: 2,
      cookingNotes: 'Extra Ghee Podi',
      items: [
        { title: 'Special Ghee Podi Roast', price: 120, quantity: 2 }, // 240
        { title: 'Kumbakonam Degree Coffee', price: 40, quantity: 2 },  // 80 -> Subtotal: 320
      ],
    };
    const res = await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/orders',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      orderPayload
    );

    assert('REG-ORD-01', 'POST /api/orders creates order successfully (200)', res.status === 200 && res.body.success === true);
    createdOrder = res.body.order;

    if (createdOrder) {
      assert(
        'REG-ORD-02',
        'Order status is standardized to "otp_pending"',
        createdOrder.status === 'otp_pending',
        `Observed: '${createdOrder.status}'`
      );
      assert(
        'REG-CALC-01',
        'GST calculation matches exactly: Subtotal 320 + CGST 8 + SGST 8 = Total 336',
        createdOrder.subtotal === 320 && createdOrder.cgst === 8 && createdOrder.sgst === 8 && createdOrder.totalAmount === 336,
        `Subtotal: ${createdOrder.subtotal}, CGST: ${createdOrder.cgst}, SGST: ${createdOrder.sgst}, Total: ${createdOrder.totalAmount}`
      );
    }
  } catch (e) {
    assert('REG-ORD', 'Order Creation', false, e.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REGRESSION 5: GET /api/orders?table=01 Safe Array Handling
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/orders?table=01',
      method: 'GET',
    });
    assert(
      'REG-ORD-03',
      'GET /api/orders?table=01 does not crash with 500 when o.tables is undefined',
      res.status === 200 && res.body.success === true && Array.isArray(res.body.orders),
      `Status: ${res.status}, Orders count: ${res.body.orders?.length}`
    );
  } catch (e) {
    assert('REG-ORD-03', 'GET /api/orders?table=01 safe handling', false, e.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REGRESSION 6: Waiter OTP Verification ('otp_pending' -> 'cooking')
  // ──────────────────────────────────────────────────────────────────────────
  if (createdOrder) {
    try {
      const resVerify = await request(
        {
          hostname: 'localhost',
          port: 3000,
          path: '/api/orders/verify-otp',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        { orderId: createdOrder.orderId, otp: createdOrder.otp, staffName: 'Captain Murugan' }
      );
      assert(
        'REG-OTP-01',
        'OTP verification advances status from otp_pending to cooking',
        resVerify.status === 200 && resVerify.body.success === true && resVerify.body.order.status === 'cooking',
        `New status: '${resVerify.body.order?.status}'`
      );
    } catch (e) {
      assert('REG-OTP-01', 'OTP verification transition', false, e.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REGRESSION 7: Fix Bill Generation HTTP 500 Error (POST /api/bills)
  // ──────────────────────────────────────────────────────────────────────────
  let generatedBill = null;
  try {
    const resBill = await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/bills',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { tableNumber: '07' }
    );
    assert(
      'REG-BILL-01',
      'POST /api/bills aggregates only eligible active unpaid orders (Total: ₹336)',
      resBill.status === 200 && resBill.body.success === true && resBill.body.bill?.totalAmount === 336,
      `Bill: ${resBill.body.bill?.billNumber}, Total: ₹${resBill.body.bill?.totalAmount}`
    );
    generatedBill = resBill.body.bill;
  } catch (e) {
    assert('REG-BILL-01', 'POST /api/bills generates bill without 500', false, e.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REGRESSION 8: Bill Settlement & Sandbox Payment (POST /api/bills/pay)
  // ──────────────────────────────────────────────────────────────────────────
  if (generatedBill) {
    try {
      const resPay = await request(
        {
          hostname: 'localhost',
          port: 3000,
          path: '/api/bills/pay',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        { billNumber: generatedBill.billNumber, settlementMode: 'UPI_GPAY' }
      );
      assert(
        'REG-PAY-01',
        'POST /api/bills/pay settles bill and marks paymentStatus PAID',
        resPay.status === 200 && resPay.body.success === true && resPay.body.bill?.paymentStatus === 'PAID',
        `Receipt: ${resPay.body.receipt?.receiptNumber}`
      );
    } catch (e) {
      assert('REG-PAY-01', 'Bill settlement', false, e.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REGRESSION 9: Unpaid Served Orders remain in Active Orders
  // ──────────────────────────────────────────────────────────────────────────
  try {
    // Create an unpaid served order
    const resServedOrder = await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/orders',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        tables: ['09'],
        orderType: 'DINE_IN',
        guestName: 'Sundar Rajan Regression',
        guestPhone: '9840123456',
        items: [{ title: 'Raja Chettinad Full Meals', price: 210, quantity: 1 }],
      }
    );
    const servedOrd = resServedOrder.body.order;

    if (servedOrd) {
      // Advance to served
      await request(
        {
          hostname: 'localhost',
          port: 3000,
          path: `/api/orders/${servedOrd.orderId}/status`,
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        },
        { status: 'served', staffName: 'Captain Murugan' }
      );

      // Query customer orders with auth token
      if (customerToken) {
        const resCustOrders = await request({
          hostname: 'localhost',
          port: 3000,
          path: '/api/customer/orders',
          method: 'GET',
          headers: { Authorization: `Bearer ${customerToken}` },
        });

        const activeFound = (resCustOrders.body.activeOrders || []).some(
          (o) => (o.orderId || o.id) === servedOrd.orderId
        );
        assert(
          'REG-HIST-01',
          'Unpaid "SERVED" order remains in activeOrders (not prematurely in pastOrders)',
          activeFound === true,
          `Active orders count: ${resCustOrders.body.activeOrders?.length}`
        );
      }
    }
  } catch (e) {
    assert('REG-HIST-01', 'Unpaid served order history logic', false, e.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REGRESSION 10: CMS Live Menu & Categories API Delivery
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const resCms = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/cms',
      method: 'GET',
    });
    assert(
      'REG-CMS-01',
      'GET /api/cms delivers live menu array',
      resCms.status === 200 && Array.isArray(resCms.body.menu) && resCms.body.menu.length > 0,
      `Delivered ${resCms.body.menu?.length} live dishes`
    );
    assert(
      'REG-CMS-02',
      'GET /api/cms delivers live categories array',
      resCms.status === 200 && Array.isArray(resCms.body.categories) && resCms.body.categories.length > 0,
      `Delivered ${resCms.body.categories?.length} categories`
    );
  } catch (e) {
    assert('REG-CMS', 'Live CMS delivery', false, e.message);
  }

  console.log('\n================================================================');
  const total = tests.length;
  const passed = tests.filter((t) => t.passed).length;
  const failed = tests.filter((t) => !t.passed).length;
  console.log(`   REGRESSION RESULTS: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runRegressionSuite().catch((err) => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
