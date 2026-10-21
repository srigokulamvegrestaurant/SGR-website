// app/api/customer/auth/route.js - Customer Mobile + Email OTP Authentication
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getDb,
  saveDb,
  normalizePhoneNumber,
  maskEmailAddress,
  findCustomerByPhone,
  createCustomerSession,
  validateCustomerSession,
  destroyCustomerSession,
} from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, phone, email, name, otp, token } = body;
    const db = getDb();

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 1: REQUEST OTP VIA REGISTERED MOBILE NUMBER (SENT TO REGISTERED EMAIL)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'REQUEST_OTP') {
      if (!phone || !phone.trim()) {
        return NextResponse.json(
          { success: false, error: 'Mobile number is required to sign in.' },
          { status: 400 }
        );
      }

      const normPhone = normalizePhoneNumber(phone);
      if (normPhone.length < 10) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid 10-digit mobile number.' },
          { status: 400 }
        );
      }

      let customer = findCustomerByPhone(normPhone);

      // If customer provided an email during this step (e.g. initial setup for account without email)
      if (customer && !customer.email && email && email.trim()) {
        customer.email = email.trim().toLowerCase();
        saveDb(db);
      }

      // If customer doesn't exist yet
      if (!customer) {
        // If email and name provided, allow quick instant registration
        if (email && email.trim() && name && name.trim()) {
          customer = {
            id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: name.trim(),
            phone: normPhone,
            email: email.trim().toLowerCase(),
            role: 'CUSTOMER',
            status: 'ACTIVE',
            totalOrders: 0,
            totalSpent: 0,
            loyaltyPoints: 0,
            dietaryPreferences: { isVeg: true, isJain: false, isVegan: false, isGlutenFree: false },
            savedAddresses: [],
            createdAt: new Date().toISOString(),
            lastOrderDate: new Date().toISOString(),
            orderIds: [],
            billNumbers: [],
            otpHash: null,
            otpExpiresAt: null,
          };
          if (!Array.isArray(db.customers)) db.customers = [];
          db.customers.unshift(customer);
          saveDb(db);
        } else {
          return NextResponse.json({
            success: false,
            notFound: true,
            phone: normPhone,
            message: 'No existing customer record found with this mobile number. Accounts are automatically created when placing an order, or you can register now.',
          });
        }
      }

      // If customer exists but has NO registered email
      if (!customer.email) {
        return NextResponse.json({
          success: true,
          needsEmail: true,
          customerName: customer.name,
          phone: normPhone,
          message: 'Welcome! Please link your email address to receive your 6-digit login verification OTP.',
        });
      }

      // Generate Cryptographically Secure 6-digit OTP
      const generatedOtp = crypto.randomInt(100000, 1000000).toString();
      customer.otpHash = generatedOtp;
      customer.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry
      customer.otpLastRequestedAt = new Date().toISOString();

      saveDb(db);

      console.log(
        `[CUSTOMER-EMAIL-DISPATCH] Sent OTP ${generatedOtp} to registered email ${customer.email} for mobile ${normPhone} (${customer.name})`
      );

      return NextResponse.json({
        success: true,
        otpSent: true,
        phone: normPhone,
        customerName: customer.name,
        maskedEmail: maskEmailAddress(customer.email),
        expiresInSeconds: 600,
        message: `A 6-digit verification code has been dispatched to your registered email (${maskEmailAddress(customer.email)}).`,
        devOtp: generatedOtp, // Development test convenience
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 2: VERIFY OTP & ESTABLISH SECURE CUSTOMER SESSION
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'VERIFY_OTP') {
      if (!phone || !otp) {
        return NextResponse.json(
          { success: false, error: 'Mobile number and 6-digit OTP are required.' },
          { status: 400 }
        );
      }

      const normPhone = normalizePhoneNumber(phone);
      const customer = findCustomerByPhone(normPhone);

      if (!customer) {
        return NextResponse.json(
          { success: false, error: 'Customer account not found.' },
          { status: 404 }
        );
      }

      if (!customer.otpHash || !customer.otpExpiresAt) {
        return NextResponse.json(
          { success: false, error: 'No active verification code found. Please request a new OTP.' },
          { status: 400 }
        );
      }

      if (new Date() > new Date(customer.otpExpiresAt)) {
        customer.otpHash = null;
        customer.otpExpiresAt = null;
        saveDb(db);
        return NextResponse.json(
          { success: false, error: 'Verification code has expired. Please request a new OTP.' },
          { status: 400 }
        );
      }

      if (customer.otpHash !== otp.trim()) {
        return NextResponse.json(
          { success: false, error: 'Invalid verification code. Please check your email and try again.' },
          { status: 400 }
        );
      }

      // OTP Verified successfully! Clear code & create session
      customer.otpHash = null;
      customer.otpExpiresAt = null;
      saveDb(db);

      const { token: sessionToken } = createCustomerSession(customer, {
        device: request.headers.get('user-agent') || 'Customer Web Browser',
        ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      return NextResponse.json({
        success: true,
        token: sessionToken,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          loyaltyPoints: customer.loyaltyPoints || 0,
          totalOrders: customer.totalOrders || 0,
          totalSpent: customer.totalSpent || 0,
          dietaryPreferences: customer.dietaryPreferences || {},
          savedAddresses: customer.savedAddresses || [],
        },
        message: `Welcome back, ${customer.name}!`,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 3: VALIDATE ACTIVE CUSTOMER SESSION
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'GET_SESSION') {
      const authHeader = request.headers.get('authorization') || '';
      const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim() || token;

      if (!bearerToken) {
        return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
      }

      const auth = validateCustomerSession(bearerToken);
      if (!auth) {
        return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
      }

      const { customer } = auth;
      return NextResponse.json({
        success: true,
        authenticated: true,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          loyaltyPoints: customer.loyaltyPoints || 0,
          totalOrders: customer.totalOrders || 0,
          totalSpent: customer.totalSpent || 0,
          dietaryPreferences: customer.dietaryPreferences || {},
          savedAddresses: customer.savedAddresses || [],
        },
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 4: LOGOUT & TERMINATE SESSION
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'LOGOUT') {
      const authHeader = request.headers.get('authorization') || '';
      const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim() || token;

      if (bearerToken) {
        destroyCustomerSession(bearerToken);
      }

      return NextResponse.json({
        success: true,
        message: 'Signed out successfully.',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Customer auth error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
