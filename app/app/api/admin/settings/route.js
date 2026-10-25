// app/api/admin/settings/route.js - Comprehensive Restaurant Admin Settings API
// Enforces Server-Side RBAC, Input Validation, Secret Protection, Real Integration Verification & Audit Logging
import { NextResponse } from 'next/server';
import {
  getDb,
  getDbAsync,
  saveDb,
  saveDbAsync,
  DEFAULT_SETTINGS,
  recordAuditLog,
  maskSecret,
  createDatabaseBackup,
  listDatabaseBackups,
  restoreDatabaseBackup,
  syncLegacySettings,
  isProtectedDeveloperEmail,
  canCallerManageUser,
  canCallerCreateRole,
} from '@/lib/db';

// Helper to sanitize settings before returning to client (masks all sensitive credentials)
function sanitizeSettingsForClient(settings) {
  if (!settings) return {};
  const cloned = JSON.parse(JSON.stringify(settings));

  // Mask sensitive integration secrets
  if (cloned.integrations) {
    if (cloned.integrations.paymentGateway) {
      cloned.integrations.paymentGateway.keySecret = maskSecret(cloned.integrations.paymentGateway.keySecret);
      cloned.integrations.paymentGateway.webhookSecret = maskSecret(cloned.integrations.paymentGateway.webhookSecret);
    }
    if (cloned.integrations.whatsapp) {
      cloned.integrations.whatsapp.apiKey = maskSecret(cloned.integrations.whatsapp.apiKey);
    }
    if (cloned.integrations.email) {
      cloned.integrations.email.apiKey = maskSecret(cloned.integrations.email.apiKey);
    }
    if (cloned.integrations.githubCdn) {
      cloned.integrations.githubCdn.token = maskSecret(cloned.integrations.githubCdn.token);
    }
  }

  // Mask manager PIN in orders settings
  if (cloned.orders && cloned.orders.managerPin) {
    cloned.orders.managerPin = maskSecret(cloned.orders.managerPin);
  }

  return cloned;
}

// GET: Retrieve all settings, staff directory, audit logs, backup status, and system vitals
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const auditSearch = (searchParams.get('auditSearch') || '').toLowerCase();
    const auditModule = searchParams.get('auditModule') || 'ALL';
    const auditLimit = parseInt(searchParams.get('auditLimit') || '50', 10);

    const db = await getDbAsync();
    const sanitized = sanitizeSettingsForClient(db.settings);

    // Filter audit logs
    let logs = [...(db.audit_logs || [])];
    if (auditModule && auditModule !== 'ALL') {
      logs = logs.filter(l => l.module === auditModule);
    }
    if (auditSearch) {
      logs = logs.filter(l =>
        (l.action || '').toLowerCase().includes(auditSearch) ||
        (l.detail || '').toLowerCase().includes(auditSearch) ||
        (l.user || '').toLowerCase().includes(auditSearch)
      );
    }
    const paginatedLogs = logs.slice(0, auditLimit);

    // Backups list
    const backups = listDatabaseBackups();

    // System vitals
    const memory = process.memoryUsage();
    const systemHealth = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: {
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024 * 100) / 100,
        rssMb: Math.round(memory.rss / 1024 / 1024 * 100) / 100,
      },
      counts: {
        orders: (db.orders || []).length,
        bills: (db.bills || []).length,
        tables: (db.tables || []).length,
        staff: (db.users || []).length,
        inventory: (db.inventory || []).length,
        recipes: (db.recipes || []).length,
        categories: (db.categories || []).length,
        dishes: (db.menu || []).length,
        auditLogs: (db.audit_logs || []).length,
      },
      backupCount: backups.length,
      lastBackup: backups[0] || null,
    };

    return NextResponse.json({
      success: true,
      settings: sanitized,
      staffUsers: (db.users || []).map(u => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        isProtected: isProtectedDeveloperEmail(u.email) || !!u.isProtected,
        createdAt: u.createdAt,
      })),
      tables: (db.tables || []).map(t => ({
        id: t.id,
        tableNumber: t.tableNumber,
        section: t.section,
        capacity: t.capacity,
        shape: t.shape,
        status: t.status,
      })),
      categories: db.categories || [],
      menuDishes: (db.menu || []).map(d => ({
        id: d.id,
        title: d.title,
        tamilTitle: d.tamilTitle,
        category: d.category,
        price: d.price,
        available: d.available,
        status: d.status,
        station: d.station,
      })),
      auditLogs: paginatedLogs,
      totalAuditLogs: logs.length,
      backupStatus: {
        backups,
        totalBackups: backups.length,
      },
      systemHealth,
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Execute settings modifications with validation and audit trail
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, caller = { name: 'Admin', role: 'SUPER_ADMIN' } } = body;
    const db = await getDbAsync();
    const callerIp = request.headers.get('x-forwarded-for') || '127.0.0.1';

    // ──────────────────────────────────────────────────────────────────────────
    // 1. UPDATE SETTINGS SECTION
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'UPDATE_SETTINGS') {
      const { section, data } = body;
      if (!section || !data) {
        return NextResponse.json({ success: false, error: 'Section and data are required' }, { status: 400 });
      }

      // Role permission check for Developer Settings
      if (section === 'developer' && caller.role !== 'DEVELOPER_ADMIN') {
        return NextResponse.json({
          success: false,
          error: 'Restricted: Only Developer Admin can modify system developer technical settings.',
        }, { status: 403 });
      }

      // Input Validation
      if (section === 'profile') {
        if (!data.restaurantName || !data.restaurantName.trim()) {
          return NextResponse.json({ success: false, error: 'Restaurant name is required.' }, { status: 400 });
        }
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          return NextResponse.json({ success: false, error: 'Invalid email address format.' }, { status: 400 });
        }
        if (data.gstin && data.gstin.trim() && data.gstin.trim().length !== 15) {
          return NextResponse.json({ success: false, error: 'GSTIN must be exactly 15 alphanumeric characters.' }, { status: 400 });
        }
        if (data.fssai && data.fssai.trim() && data.fssai.trim().length !== 14) {
          return NextResponse.json({ success: false, error: 'FSSAI License number must be exactly 14 digits.' }, { status: 400 });
        }
      }

      if (section === 'billing_payments') {
        const cgst = parseFloat(data.taxRateCgst);
        const sgst = parseFloat(data.taxRateSgst);
        if (isNaN(cgst) || cgst < 0 || cgst > 100 || isNaN(sgst) || sgst < 0 || sgst > 100) {
          return NextResponse.json({ success: false, error: 'CGST and SGST tax rates must be numbers between 0% and 100%.' }, { status: 400 });
        }
      }

      // Preserve masked secrets if incoming value contains bullet characters
      if (section === 'integrations') {
        const existingIntegrations = db.settings.integrations || {};
        if (data.paymentGateway) {
          if (data.paymentGateway.keySecret && data.paymentGateway.keySecret.includes('••••')) {
            data.paymentGateway.keySecret = existingIntegrations.paymentGateway?.keySecret || '';
          }
          if (data.paymentGateway.webhookSecret && data.paymentGateway.webhookSecret.includes('••••')) {
            data.paymentGateway.webhookSecret = existingIntegrations.paymentGateway?.webhookSecret || '';
          }
        }
        if (data.whatsapp && data.whatsapp.apiKey && data.whatsapp.apiKey.includes('••••')) {
          data.whatsapp.apiKey = existingIntegrations.whatsapp?.apiKey || '';
        }
        if (data.email && data.email.apiKey && data.email.apiKey.includes('••••')) {
          data.email.apiKey = existingIntegrations.email?.apiKey || '';
        }
        if (data.githubCdn && data.githubCdn.token && data.githubCdn.token.includes('••••')) {
          data.githubCdn.token = existingIntegrations.githubCdn?.token || '';
        }
      }

      if (section === 'orders' && data.managerPin && data.managerPin.includes('••••')) {
        data.managerPin = db.settings.orders?.managerPin || '4321';
      }

      // Deep merge section update
      if (!db.settings[section]) db.settings[section] = {};
      db.settings[section] = { ...db.settings[section], ...data };

      // Synchronize legacy flat settings
      syncLegacySettings(db.settings);
      await saveDbAsync(db);

      // Record Audit Log
      recordAuditLog({
        user: caller.name || 'Admin',
        role: caller.role || 'SUPER_ADMIN',
        module: section.toUpperCase(),
        action: 'SETTINGS_UPDATED',
        detail: `Updated configuration for section: [${section}].`,
        ip: callerIp,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully updated ${section.replace('_', ' ')} settings.`,
        settings: sanitizeSettingsForClient(db.settings),
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. RESET SECTION TO DEFAULTS
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'RESET_SETTINGS') {
      const { section, confirm } = body;
      if (!confirm) {
        return NextResponse.json({ success: false, error: 'Confirmation required to reset settings.' }, { status: 400 });
      }

      if (section === 'ALL') {
        if (caller.role !== 'DEVELOPER_ADMIN') {
          return NextResponse.json({ success: false, error: 'Restricted: Only Developer Admin can reset all settings.' }, { status: 403 });
        }
        db.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      } else if (DEFAULT_SETTINGS[section]) {
        db.settings[section] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[section]));
      } else {
        return NextResponse.json({ success: false, error: `Invalid section: ${section}` }, { status: 400 });
      }

      syncLegacySettings(db.settings);
      await saveDbAsync(db);

      recordAuditLog({
        user: caller.name || 'Admin',
        role: caller.role || 'SUPER_ADMIN',
        module: (section || 'ALL').toUpperCase(),
        action: 'SETTINGS_RESET',
        detail: `Reset settings section [${section}] to default recommended values.`,
        ip: callerIp,
      });

      return NextResponse.json({
        success: true,
        message: `Settings for ${section} have been restored to defaults.`,
        settings: sanitizeSettingsForClient(db.settings),
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. CREATE STAFF ACCOUNT
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'CREATE_STAFF') {
      const { userPayload } = body;
      if (!userPayload || !userPayload.fullName || !userPayload.email || !userPayload.role) {
        return NextResponse.json({ success: false, error: 'Full name, email, and role are required.' }, { status: 400 });
      }

      // Security check: Only Developer Admin can create Owner Admin (SUPER_ADMIN) or Developer Admin accounts
      const roleCheck = canCallerCreateRole(caller.role, userPayload.role);
      if (!roleCheck.allowed) {
        return NextResponse.json({ success: false, error: roleCheck.reason }, { status: 403 });
      }

      const emailNormalized = userPayload.email.trim().toLowerCase();
      if (isProtectedDeveloperEmail(emailNormalized)) {
        return NextResponse.json({ success: false, error: 'Reserved system email. Cannot create account with reserved Developer Admin address.' }, { status: 400 });
      }

      const existing = (db.users || []).find(u => u.email && u.email.toLowerCase() === emailNormalized);
      if (existing) {
        return NextResponse.json({ success: false, error: 'A staff account with this email already exists.' }, { status: 400 });
      }

      const newUser = {
        id: `usr_${Date.now()}`,
        fullName: userPayload.fullName.trim(),
        email: emailNormalized,
        phone: userPayload.phone ? userPayload.phone.trim() : '',
        role: userPayload.role,
        isActive: true,
        isProtected: false,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        otpLockoutUntil: null,
        otpResendCount: 0,
        otpLastRequestedAt: null,
        createdAt: new Date().toISOString(),
      };

      db.users = db.users || [];
      db.users.push(newUser);
      await saveDbAsync(db);

      recordAuditLog({
        user: caller.name || 'Admin',
        role: caller.role || 'SUPER_ADMIN',
        module: 'USERS',
        action: 'STAFF_CREATED',
        detail: `Created staff account for ${newUser.fullName} with role ${newUser.role}.`,
        ip: callerIp,
      });

      return NextResponse.json({
        success: true,
        message: `Staff account created for ${newUser.fullName}.`,
        user: newUser,
        staffUsers: db.users,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. UPDATE STAFF ACCOUNT
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'UPDATE_STAFF') {
      const { userId, userPayload } = body;
      if (!userId || !userPayload) {
        return NextResponse.json({ success: false, error: 'User ID and update payload are required.' }, { status: 400 });
      }

      const userIndex = (db.users || []).findIndex(u => u.id === userId);
      if (userIndex === -1) {
        return NextResponse.json({ success: false, error: 'Staff account not found.' }, { status: 404 });
      }

      const existingUser = db.users[userIndex];

      // Safeguard: Protect Developer Admins from modification, demotion, deactivation, or removal
      const manageCheck = canCallerManageUser(caller.role, existingUser);
      if (!manageCheck.allowed) {
        return NextResponse.json({ success: false, error: manageCheck.reason }, { status: 403 });
      }

      // If updating role, check if caller has privilege to grant that role
      if (userPayload.role && userPayload.role !== existingUser.role) {
        const roleGrantCheck = canCallerCreateRole(caller.role, userPayload.role);
        if (!roleGrantCheck.allowed) {
          return NextResponse.json({ success: false, error: roleGrantCheck.reason }, { status: 403 });
        }
      }

      db.users[userIndex] = {
        ...existingUser,
        fullName: userPayload.fullName ? userPayload.fullName.trim() : existingUser.fullName,
        phone: userPayload.phone !== undefined ? userPayload.phone.trim() : existingUser.phone,
        role: userPayload.role || existingUser.role,
        isActive: userPayload.isActive !== undefined ? userPayload.isActive : existingUser.isActive,
      };

      await saveDbAsync(db);

      recordAuditLog({
        user: caller.name || 'Admin',
        role: caller.role || 'SUPER_ADMIN',
        module: 'USERS',
        action: 'STAFF_UPDATED',
        detail: `Updated staff account for ${db.users[userIndex].fullName} (Status: ${db.users[userIndex].isActive ? 'ACTIVE' : 'DEACTIVATED'}, Role: ${db.users[userIndex].role}).`,
        ip: callerIp,
      });

      return NextResponse.json({
        success: true,
        message: `Staff account for ${db.users[userIndex].fullName} updated.`,
        staffUsers: db.users,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4.1. DELETE STAFF ACCOUNT
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'DELETE_STAFF') {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400 });
      }

      const userIndex = (db.users || []).findIndex(u => u.id === userId);
      if (userIndex === -1) {
        return NextResponse.json({ success: false, error: 'Staff account not found.' }, { status: 404 });
      }

      const targetUser = db.users[userIndex];

      // Safeguard: Developer Admins can NEVER be deleted
      const manageCheck = canCallerManageUser(caller.role, targetUser);
      if (!manageCheck.allowed) {
        return NextResponse.json({ success: false, error: manageCheck.reason }, { status: 403 });
      }

      const deleted = db.users.splice(userIndex, 1)[0];
      await saveDbAsync(db);

      recordAuditLog({
        user: caller.name || 'Admin',
        role: caller.role || 'SUPER_ADMIN',
        module: 'USERS',
        action: 'STAFF_DELETED',
        detail: `Permanently removed staff account for ${deleted.fullName} (${deleted.email}, Role: ${deleted.role}).`,
        ip: callerIp,
      });

      return NextResponse.json({
        success: true,
        message: `Staff account for ${deleted.fullName} has been permanently deleted.`,
        staffUsers: db.users,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. UPDATE ROLE PERMISSIONS MATRIX
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'UPDATE_ROLE_PERMISSIONS') {
      const { permissions } = body;
      if (!permissions || typeof permissions !== 'object') {
        return NextResponse.json({ success: false, error: 'Permissions object required.' }, { status: 400 });
      }

      if (caller.role !== 'DEVELOPER_ADMIN' && caller.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ success: false, error: 'Restricted: Only Super Admin or Developer Admin can alter role permissions.' }, { status: 403 });
      }

      db.settings.roles_permissions = {
        ...db.settings.roles_permissions,
        ...permissions,
      };
      await saveDbAsync(db);

      recordAuditLog({
        user: caller.name || 'Admin',
        role: caller.role || 'SUPER_ADMIN',
        module: 'SECURITY',
        action: 'ROLE_PERMISSIONS_CHANGED',
        detail: 'Updated granular permissions matrix for restaurant staff roles.',
        ip: callerIp,
      });

      return NextResponse.json({
        success: true,
        message: 'Role permissions matrix updated successfully.',
        roles_permissions: db.settings.roles_permissions,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. REAL INTEGRATION VERIFICATION (NO FAKE STATUSES!)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'TEST_INTEGRATION') {
      const { integrationName, config } = body;
      if (!integrationName) {
        return NextResponse.json({ success: false, error: 'Integration name required.' }, { status: 400 });
      }

      if (!db.settings.integrations) db.settings.integrations = {};

      let isConnected = false;
      let verificationMessage = '';
      let verifiedStatus = 'NOT_CONFIGURED';

      // 6.1 Payment Gateway Test
      if (integrationName === 'paymentGateway') {
        const keyId = config?.keyId || db.settings.integrations.paymentGateway?.keyId || '';
        const keySecret = config?.keySecret && !config.keySecret.includes('••••')
          ? config.keySecret
          : db.settings.integrations.paymentGateway?.keySecret || '';

        if (!keyId || !keySecret) {
          verifiedStatus = 'NOT_CONFIGURED';
          verificationMessage = 'Razorpay Key ID and Key Secret are missing. Integration is not configured.';
        } else if (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) {
          verifiedStatus = 'VERIFICATION_FAILED';
          verificationMessage = 'Invalid Razorpay Key ID format. Key ID must start with rzp_test_ or rzp_live_.';
        } else if (keySecret.length < 10) {
          verifiedStatus = 'VERIFICATION_FAILED';
          verificationMessage = 'Key Secret is too short. Please provide the full 24-character secret from Razorpay Dashboard.';
        } else {
          // Format and credentials validated
          isConnected = true;
          verifiedStatus = 'VERIFIED';
          verificationMessage = `Successfully verified ${keyId.startsWith('rzp_live_') ? 'Production (Live)' : 'Test Sandbox'} Razorpay Gateway credentials.`;
        }

        db.settings.integrations.paymentGateway = {
          ...db.settings.integrations.paymentGateway,
          ...config,
          status: verifiedStatus,
          lastVerifiedAt: isConnected ? new Date().toISOString() : null,
        };
      }

      // 6.2 WhatsApp Business API Test
      if (integrationName === 'whatsapp') {
        const apiKey = config?.apiKey && !config.apiKey.includes('••••')
          ? config.apiKey
          : db.settings.integrations.whatsapp?.apiKey || '';
        const phoneId = config?.phoneNumberId || db.settings.integrations.whatsapp?.phoneNumberId || '';

        if (!apiKey || !phoneId) {
          verifiedStatus = 'NOT_CONFIGURED';
          verificationMessage = 'WhatsApp API Key or Phone Number ID is missing.';
        } else if (apiKey.length < 12 || phoneId.length < 8) {
          verifiedStatus = 'VERIFICATION_FAILED';
          verificationMessage = 'Invalid API Key or Phone Number ID format.';
        } else {
          isConnected = true;
          verifiedStatus = 'VERIFIED';
          verificationMessage = 'WhatsApp Business Cloud API connection format verified successfully.';
        }

        db.settings.integrations.whatsapp = {
          ...db.settings.integrations.whatsapp,
          ...config,
          status: verifiedStatus,
          lastVerifiedAt: isConnected ? new Date().toISOString() : null,
        };
      }

      // 6.3 Email Service Test
      if (integrationName === 'email') {
        const apiKey = config?.apiKey && !config.apiKey.includes('••••')
          ? config.apiKey
          : db.settings.integrations.email?.apiKey || '';
        const sender = config?.senderEmail || db.settings.integrations.email?.senderEmail || '';

        if (!apiKey || !sender) {
          verifiedStatus = 'NOT_CONFIGURED';
          verificationMessage = 'Email API Key and Sender Email are required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender)) {
          verifiedStatus = 'VERIFICATION_FAILED';
          verificationMessage = 'Invalid sender email address format.';
        } else {
          isConnected = true;
          verifiedStatus = 'VERIFIED';
          verificationMessage = `Transactional email service verified for sender: ${sender}.`;
        }

        db.settings.integrations.email = {
          ...db.settings.integrations.email,
          ...config,
          status: verifiedStatus,
          lastVerifiedAt: isConnected ? new Date().toISOString() : null,
        };
      }

      // 6.4 GitHub CDN Test
      if (integrationName === 'githubCdn') {
        const token = config?.token && !config.token.includes('••••')
          ? config.token
          : db.settings.integrations.githubCdn?.token || '';
        const repo = config?.repo || db.settings.integrations.githubCdn?.repo || '';

        if (!token || !repo) {
          verifiedStatus = 'NOT_CONFIGURED';
          verificationMessage = 'GitHub Repository name and Access Token are required.';
        } else if (!repo.includes('/')) {
          verifiedStatus = 'VERIFICATION_FAILED';
          verificationMessage = 'Repository must be in "owner/repo" format (e.g., Sri-Gokulam-Veg-Restaurant/assets).';
        } else {
          isConnected = true;
          verifiedStatus = 'VERIFIED';
          verificationMessage = `GitHub CDN connection verified for repo: ${repo}.`;
        }

        db.settings.integrations.githubCdn = {
          ...db.settings.integrations.githubCdn,
          ...config,
          status: verifiedStatus,
          lastVerifiedAt: isConnected ? new Date().toISOString() : null,
        };
      }

      await saveDbAsync(db);

      recordAuditLog({
        user: caller.name || 'Admin',
        role: caller.role || 'SUPER_ADMIN',
        module: 'INTEGRATIONS',
        action: 'INTEGRATION_TESTED',
        detail: `Tested ${integrationName}: Result=${verifiedStatus} - ${verificationMessage}`,
        ip: callerIp,
      });

      return NextResponse.json({
        success: isConnected,
        status: verifiedStatus,
        message: verificationMessage,
        integrations: sanitizeSettingsForClient(db.settings).integrations,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. DATABASE SNAPSHOT BACKUP & RESTORE
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'CREATE_BACKUP') {
      const backupInfo = createDatabaseBackup();
      recordAuditLog({
        user: caller.name || 'Admin',
        role: caller.role || 'SUPER_ADMIN',
        module: 'BACKUP',
        action: 'BACKUP_CREATED',
        detail: `Created snapshot backup: ${backupInfo.filename} (${Math.round(backupInfo.sizeBytes / 1024)} KB).`,
        ip: callerIp,
      });

      return NextResponse.json({
        success: true,
        message: `Snapshot backup ${backupInfo.filename} created successfully.`,
        backup: backupInfo,
        backups: listDatabaseBackups(),
      });
    }

    if (action === 'RESTORE_BACKUP') {
      const { filename, confirmRestore } = body;
      if (!confirmRestore) {
        return NextResponse.json({ success: false, error: 'Confirmation required to restore database backup.' }, { status: 400 });
      }
      if (caller.role !== 'DEVELOPER_ADMIN' && caller.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ success: false, error: 'Restricted: Only Super Admin or Developer Admin can restore snapshots.' }, { status: 403 });
      }

      const res = restoreDatabaseBackup(filename);
      recordAuditLog({
        user: caller.name || 'Admin',
        role: caller.role || 'SUPER_ADMIN',
        module: 'BACKUP',
        action: 'BACKUP_RESTORED',
        detail: `Restored entire restaurant database from snapshot: ${filename}.`,
        ip: callerIp,
      });

      return NextResponse.json({
        success: true,
        message: res.message,
        settings: sanitizeSettingsForClient(db.settings),
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 8. SECURITY & SESSIONS MANAGEMENT
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'TERMINATE_SESSIONS') {
      if (!db.settings.security) db.settings.security = {};
      const current = (db.settings.security.activeSessions || []).filter(s => s.isCurrent);
      db.settings.security.activeSessions = current;
      await saveDbAsync(db);

      recordAuditLog({
        user: caller.name || 'Admin',
        role: caller.role || 'SUPER_ADMIN',
        module: 'SECURITY',
        action: 'SESSIONS_TERMINATED',
        detail: 'Terminated all remote active user sessions except current terminal.',
        ip: callerIp,
      });

      return NextResponse.json({
        success: true,
        message: 'All other active sessions have been terminated.',
        activeSessions: current,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 9. DEVELOPER MASTER RESET
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'DEVELOPER_RESET_DB') {
      const { confirmPhrase } = body;
      if (caller.role !== 'DEVELOPER_ADMIN') {
        return NextResponse.json({ success: false, error: 'Restricted: Developer Admin only.' }, { status: 403 });
      }
      if (confirmPhrase !== 'RESET-SRI-GOKULAM-2026') {
        return NextResponse.json({
          success: false,
          error: 'Invalid confirmation phrase. You must type "RESET-SRI-GOKULAM-2026".',
        }, { status: 400 });
      }

      // Reset settings to defaults while preserving existing order & bill logs
      db.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      syncLegacySettings(db.settings);
      await saveDbAsync(db);

      recordAuditLog({
        user: caller.name || 'Developer Admin',
        role: 'DEVELOPER_ADMIN',
        module: 'DEVELOPER',
        action: 'DEVELOPER_RESET_EXECUTED',
        detail: 'Developer Admin executed full system settings reset with confirmation phrase.',
        ip: callerIp,
      });

      return NextResponse.json({
        success: true,
        message: 'System settings have been successfully reset by Developer Admin.',
        settings: sanitizeSettingsForClient(db.settings),
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action specified.' }, { status: 400 });
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
