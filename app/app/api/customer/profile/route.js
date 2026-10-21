// app/api/customer/profile/route.js - Customer Profile Management
import { NextResponse } from 'next/server';
import {
  getDb,
  saveDb,
  validateCustomerSession,
} from '@/lib/db';

export async function PUT(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const auth = validateCustomerSession(token);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Session expired. Please sign in again.' }, { status: 401 });
    }

    const { customer } = auth;
    const db = getDb();
    const body = await request.json();
    const { name, email, dietaryPreferences, savedAddresses } = body;

    const target = (db.customers || []).find(c => c.id === customer.id);
    if (!target) {
      return NextResponse.json({ success: false, error: 'Customer not found.' }, { status: 404 });
    }

    if (name && name.trim()) target.name = name.trim();
    if (email && email.trim()) target.email = email.trim().toLowerCase();
    if (dietaryPreferences && typeof dietaryPreferences === 'object') {
      target.dietaryPreferences = {
        ...target.dietaryPreferences,
        ...dietaryPreferences,
      };
    }
    if (Array.isArray(savedAddresses)) {
      target.savedAddresses = savedAddresses;
    }

    target.updatedAt = new Date().toISOString();
    saveDb(db);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      customer: {
        id: target.id,
        name: target.name,
        phone: target.phone,
        email: target.email,
        loyaltyPoints: target.loyaltyPoints || 0,
        totalOrders: target.totalOrders || 0,
        totalSpent: target.totalSpent || 0,
        dietaryPreferences: target.dietaryPreferences || {},
        savedAddresses: target.savedAddresses || [],
      },
    });
  } catch (error) {
    console.error('Customer profile update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
