// lib/emailDispatcher.js - Transactional Email & OTP Dispatcher for Sri Gokulam Veg Restaurant
import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Initialize or return cached Nodemailer transporter with Gmail SMTP
 */
function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, '').trim();

  if (!user || !pass) {
    return null;
  }

  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const isSecure = port === 465;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 5000, // 5s connection timeout (fails fast on blocked cloud ports)
    greetingTimeout: 5000,
    socketTimeout: 6000,
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transporter;
}

/**
 * Generate branded HTML email template for Sri Gokulam OTP
 */
function renderOtpHtml({ otp, recipientName = 'Valued Guest', type = 'LOGIN', role }) {
  const isStaff = type === 'ADMIN_LOGIN';
  const title = isStaff ? 'Staff Portal Login Verification' : 'Customer Account Verification';
  const roleBadge = role ? `<span style="background: #7c2d12; color: #fef08a; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${role}</span>` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0a09; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f5f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0c0a09; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background: #1c1917; border: 1px solid #78350f; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #451a03 0%, #78350f 50%, #451a03 100%); padding: 30px 24px; text-align: center; border-bottom: 2px solid #d97706;">
              <h1 style="margin: 0 0 6px 0; color: #fef3c7; font-size: 24px; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 800;">
                Sri Gokulam
              </h1>
              <p style="margin: 0; color: #fde68a; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;">
                Authentic Chettinad Sattvic Heritage • Karaikudi
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <h2 style="margin: 0; color: #fafaf9; font-size: 18px; font-weight: 700;">
                  ${title}
                </h2>
                ${roleBadge}
              </div>

              <p style="margin: 0 0 20px 0; color: #d6d3d1; font-size: 15px; line-height: 1.6;">
                Vanakkam <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; color: #a8a29e; font-size: 14px; line-height: 1.6;">
                Use the one-time verification code below to securely sign in. This code is confidential and valid for <strong>5 minutes</strong>.
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="background: #292524; border: 2px dashed #d97706; border-radius: 12px; padding: 22px 16px;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #fbbf24; display: inline-block; margin-left: 12px;">
                      ${otp}
                    </span>
                    <p style="margin: 10px 0 0 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
                      One-Time Password (OTP)
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security Tips -->
              <div style="background: #1c1917; border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
                <p style="margin: 0; color: #fef3c7; font-size: 12px; line-height: 1.5;">
                  🔒 <strong>Security Notice:</strong> Sri Gokulam staff will never ask for your verification code. Do not share this code with anyone.
                </p>
              </div>

              <p style="margin: 0; color: #78716c; font-size: 13px; line-height: 1.5;">
                If you did not request this code, you can safely ignore this email or reach out to our team at 
                <a href="mailto:support@srigokulam.com" style="color: #fbbf24; text-decoration: none;">support@srigokulam.com</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #141210; padding: 20px 24px; text-align: center; border-top: 1px solid #292524;">
              <p style="margin: 0 0 4px 0; color: #78716c; font-size: 12px;">
                Sri Gokulam Veg Restaurant — Mudiyarasan Salai, Karaikudi, Tamil Nadu - 630003
              </p>
              <p style="margin: 0; color: #57534e; font-size: 11px;">
                © ${new Date().getFullYear()} Sri Gokulam Veg Restaurant. Crafted by AJ Tech Solutions.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Dispatch email via Resend HTTPS REST API (Port 443 - Never blocked by Railway)
 */
async function sendViaResend({ to, subject, html, text, fromName }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    let rawFrom = (process.env.RESEND_FROM || '').trim();
    // Strip all quotes (single, double, backticks) that may come from environment variable configurations
    rawFrom = rawFrom.replace(/["'`]/g, '').trim();

    // If empty, or sandbox onboarding, or unverified gmail domain, default to verified custom domain:
    let fromAddress = rawFrom;
    if (!fromAddress || fromAddress.includes('onboarding@resend.dev') || fromAddress.includes('@gmail.com') || !fromAddress.includes('@')) {
      fromAddress = 'Sri Gokulam Veg Restaurant <admin@srigokulamvegrestaurant.com>';
    } else if (!fromAddress.includes('<') && fromAddress.includes('@')) {
      // Pure email address like admin@srigokulamvegrestaurant.com -> wrap with display name
      fromAddress = `${fromName || 'Sri Gokulam Veg Restaurant'} <${fromAddress}>`;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    const data = await res.json();
    if (res.ok && data.id) {
      console.log(`[EMAIL-RESEND-SUCCESS] Sent OTP to ${to} via Resend (ID: ${data.id}) from ${fromAddress}`);
      return { success: true, messageId: data.id };
    }
    console.warn('[EMAIL-RESEND-WARN] Resend response:', data);
  } catch (err) {
    console.error('[EMAIL-RESEND-ERROR] Failed to send via Resend:', err.message);
  }
  return null;
}

/**
 * Dispatch email via Brevo HTTPS REST API (Port 443 - Never blocked by Railway)
 */
async function sendViaBrevo({ to, subject, html, text, fromName, fromEmail }) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName || 'Sri Gokulam Veg Restaurant', email: fromEmail || 'srigokulamvegrestaurant@gmail.com' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    const data = await res.json();
    if (res.ok && (data.messageId || data.messageIds)) {
      console.log(`[EMAIL-BREVO-SUCCESS] Sent OTP to ${to} via Brevo (ID: ${data.messageId || data.messageIds[0]})`);
      return { success: true, messageId: data.messageId || data.messageIds[0] };
    }
    console.warn('[EMAIL-BREVO-WARN] Brevo response:', data);
  } catch (err) {
    console.error('[EMAIL-BREVO-ERROR] Failed to send via Brevo:', err.message);
  }
  return null;
}

/**
 * Dispatch OTP Email to Recipient
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.otp - 6-digit OTP string
 * @param {string} [options.recipientName] - Name of recipient
 * @param {'ADMIN_LOGIN'|'CUSTOMER_LOGIN'|'RESERVATION'} [options.type] - Verification context
 * @param {string} [options.role] - User role badge (optional)
 * @returns {Promise<{ success: boolean, simulated?: boolean, messageId?: string, error?: string }>}
 */
export async function sendOtpEmail({ to, otp, recipientName = 'Guest', type = 'LOGIN', role }) {
  if (!to) {
    return { success: false, error: 'Recipient email is required.' };
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Sri Gokulam Veg Restaurant';
  const fromAddress = process.env.SMTP_USER || 'srigokulamvegrestaurant@gmail.com';
  const subject = `${otp} is your Sri Gokulam verification code`;
  const text = `Vanakkam ${recipientName},\n\nYour Sri Gokulam verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nNever share this code with anyone.\n\nSri Gokulam Veg Restaurant, Karaikudi`;
  const html = renderOtpHtml({ otp, recipientName, type, role });

  // 1. Try Resend HTTPS REST API (Highest deliverability on cloud containers, port 443)
  const resendResult = await sendViaResend({ to, subject, html, text, fromName });
  if (resendResult && resendResult.success) {
    return resendResult;
  }

  // 2. Try Brevo HTTPS REST API (Port 443)
  const brevoResult = await sendViaBrevo({ to, subject, html, text, fromName, fromEmail: fromAddress });
  if (brevoResult && brevoResult.success) {
    return brevoResult;
  }

  // 3. Fallback to Nodemailer SMTP
  const mailer = getTransporter();

  // If SMTP is not configured, fall back to console logging
  if (!mailer) {
    console.log(
      `[EMAIL-SIMULATION] SMTP not configured. OTP for ${to} (${recipientName}): ${otp}`
    );
    return {
      success: true,
      simulated: true,
      message: 'Email simulated in server console (SMTP_USER or SMTP_PASS not set).',
    };
  }

  try {
    const info = await mailer.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`[EMAIL-DISPATCH-SUCCESS] Sent OTP to ${to} (Message ID: ${info.messageId})`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(`[EMAIL-DISPATCH-ERROR] Failed to send OTP to ${to}:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
