// server/utils/mailer.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "AI Clinic <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// ── OTP email → user ko ──
export async function sendOTPEmail({ to, name, otp }) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Your AI Clinic Verification OTP",
    html: `
      <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:16px;">
        <div style="background:#0f172a;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <h1 style="color:white;font-size:22px;margin:0;">🏥 AI Clinic</h1>
        </div>
        <h2 style="color:#0f172a;font-size:20px;margin-bottom:8px;">Hello, ${name}!</h2>
        <p style="color:#64748b;font-size:15px;line-height:1.6;margin-bottom:24px;">
          Your account has been <strong style="color:#10b981;">approved</strong> by the admin.<br/>
          Use the OTP below to activate your account:
        </p>
        <div style="background:#0f172a;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;">
          <p style="color:#94a3b8;font-size:13px;margin:0 0 12px;">Your One-Time Password</p>
          <h1 style="color:white;font-size:40px;font-weight:800;letter-spacing:12px;margin:0;">${otp}</h1>
          <p style="color:#475569;font-size:12px;margin:12px 0 0;">Expires in <strong style="color:#f59e0b;">10 minutes</strong></p>
        </div>
        <p style="color:#94a3b8;font-size:13px;text-align:center;">
          If you didn't request this, please ignore this email.<br/>
          &copy; 2026 AI Clinic — Made by Saqib Aziz
        </p>
      </div>
    `,
  });
}

// ── Admin notification → new signup request ──
export async function sendAdminNotification({ applicantName, applicantEmail, role }) {
  const approveUrl = `${process.env.FRONTEND_URL}/dashboard/admin?tab=approvals`;

  return resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `New ${role} Signup Request — ${applicantName}`,
    html: `
      <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:16px;">
        <div style="background:#0f172a;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <h1 style="color:white;font-size:22px;margin:0;">🏥 AI Clinic — Admin Alert</h1>
        </div>
        <div style="background:white;border:1px solid #f1f5f9;border-radius:12px;padding:24px;margin-bottom:20px;">
          <p style="color:#64748b;font-size:14px;margin:0 0 16px;">A new <strong style="color:#0f172a;">${role}</strong> has requested an account:</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#94a3b8;font-size:13px;width:40%;">Name</td>
              <td style="padding:8px 0;color:#0f172a;font-weight:600;font-size:13px;">${applicantName}</td>
            </tr>
            <tr style="border-top:1px solid #f1f5f9;">
              <td style="padding:8px 0;color:#94a3b8;font-size:13px;">Email</td>
              <td style="padding:8px 0;color:#0f172a;font-weight:600;font-size:13px;">${applicantEmail}</td>
            </tr>
            <tr style="border-top:1px solid #f1f5f9;">
              <td style="padding:8px 0;color:#94a3b8;font-size:13px;">Role</td>
              <td style="padding:8px 0;font-size:13px;">
                <span style="background:#eff6ff;color:#1d4ed8;font-weight:700;padding:3px 10px;border-radius:6px;">${role}</span>
              </td>
            </tr>
          </table>
        </div>
        <a href="${approveUrl}" style="display:block;background:#3b82f6;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:11px;font-weight:700;font-size:15px;margin-bottom:16px;">
          Review Request in Dashboard →
        </a>
        <p style="color:#94a3b8;font-size:12px;text-align:center;">
          Login to your admin panel to approve or reject this request.<br/>
          &copy; 2026 AI Clinic
        </p>
      </div>
    `,
  });
}

// ── Rejection email → user ko ──
export async function sendRejectionEmail({ to, name, role }) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "AI Clinic — Account Request Update",
    html: `
      <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:16px;">
        <div style="background:#0f172a;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <h1 style="color:white;font-size:22px;margin:0;">🏥 AI Clinic</h1>
        </div>
        <h2 style="color:#0f172a;font-size:20px;margin-bottom:8px;">Hello, ${name}</h2>
        <p style="color:#64748b;font-size:15px;line-height:1.6;margin-bottom:20px;">
          Unfortunately, your <strong>${role}</strong> account request has not been approved at this time.
        </p>
        <p style="color:#64748b;font-size:14px;line-height:1.6;">
          If you believe this is a mistake, please contact our support team.
        </p>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px;">
          &copy; 2026 AI Clinic — Made by Saqib Aziz
        </p>
      </div>
    `,
  });
}