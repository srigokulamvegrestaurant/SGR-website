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

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
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

  const mailer = getTransporter();

  // If SMTP is not yet configured, fall back to console logging gracefully for dev
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
    const fromName = process.env.SMTP_FROM_NAME || 'Sri Gokulam Veg Restaurant';
    const fromAddress = process.env.SMTP_USER;

    const info = await mailer.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject: `${otp} is your Sri Gokulam verification code`,
      text: `Vanakkam ${recipientName},\n\nYour Sri Gokulam verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nNever share this code with anyone.\n\nSri Gokulam Veg Restaurant, Karaikudi`,
      html: renderOtpHtml({ otp, recipientName, type, role }),
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
