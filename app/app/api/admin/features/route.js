// app/api/admin/features/route.js - Developer Admin Hub & Feature Flags (AJ Tech Solutions)
import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    return NextResponse.json({
      success: true,
      settings: db.settings,
      developerInfo: {
        developer: 'Aswin (Lead System Architect)',
        agency: 'AJ Tech Solutions',
        agencyUrl: 'https://ajtechsolutions.netlify.app/',
        environment: process.env.NODE_ENV || 'development',
        systemVersion: '2.4.0-enterprise',
      },
      stats: {
        totalStaff: (db.users || []).length,
        totalTables: (db.tables || []).length,
        totalInventoryItems: (db.inventory || []).length,
        totalRecipes: (db.recipes || []).length,
        totalOrders: (db.orders || []).length,
        totalBills: (db.bills || []).length,
      },
    });
  } catch (error) {
    console.error('Features GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, flagName, value, userPayload } = body;
    const db = getDb();

    if (action === 'TOGGLE_FLAG') {
      if (!db.settings) db.settings = {};
      db.settings[flagName] = value;
      saveDb(db);

      return NextResponse.json({
        success: true,
        message: `Setting ${flagName} set to ${value}`,
        settings: db.settings,
      });
    }

    if (action === 'UPDATE_SETTINGS') {
      db.settings = { ...db.settings, ...body.settings };
      saveDb(db);

      return NextResponse.json({
        success: true,
        message: 'System settings updated successfully',
        settings: db.settings,
      });
    }

    if (action === 'CREATE_STAFF') {
      if (!userPayload || !userPayload.email || !userPayload.fullName || !userPayload.role) {
        return NextResponse.json({ success: false, error: 'Incomplete staff information' }, { status: 400 });
      }

      const existing = (db.users || []).find(u => u.email.toLowerCase() === userPayload.email.toLowerCase());
      if (existing) {
        return NextResponse.json({ success: false, error: 'Staff with this email already exists' }, { status: 400 });
      }

      const newUser = {
        id: `usr_${Date.now()}`,
        fullName: userPayload.fullName,
        email: userPayload.email.toLowerCase(),
        phone: userPayload.phone || '',
        role: userPayload.role,
        isActive: true,
        otpHash: null,
        otpExpiresAt: null,
        createdAt: new Date().toISOString(),
      };

      db.users = db.users || [];
      db.users.push(newUser);
      saveDb(db);

      return NextResponse.json({
        success: true,
        message: `Staff account created for ${newUser.fullName} (${newUser.role})`,
        user: newUser,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Features POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
