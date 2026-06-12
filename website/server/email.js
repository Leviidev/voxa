import { Resend } from 'resend'

let resend = null
function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY)
  return resend
}
const FROM = 'Voxa <noreply@voxa.lol>'

function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`
  return 'https://voxa.lol'
}

function baseTemplate(title, content) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #E3E5E8;overflow:hidden">
        <tr>
          <td style="padding:32px 40px 0;text-align:center">
            <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:8px">
              <div style="width:36px;height:36px;background:#E53935;border-radius:10px;display:inline-flex;align-items:center;justify-content:center">
                <span style="color:white;font-weight:900;font-size:18px;line-height:1">v</span>
              </div>
              <span style="font-weight:900;font-size:18px;color:#1A1B1E;letter-spacing:-0.5px">voxa</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 40px">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1A1B1E;letter-spacing:-0.3px">${title}</h1>
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #F2F3F5;text-align:center">
            <p style="margin:0;color:#96989D;font-size:12px">
              This email was sent by Voxa &middot;
              <a href="https://voxa.lol" style="color:#96989D">voxa.lol</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendPasswordResetEmail(toEmail, token) {
  const link = `${getAppUrl()}/reset-password?token=${token}`
  const content = `
    <p style="margin:0 0 24px;color:#5C6068;font-size:15px;line-height:1.6">
      We received a request to reset your Voxa password. Click the button below to choose a new one.
      This link expires in <strong>1 hour</strong>.
    </p>
    <a href="${link}" style="display:block;width:100%;box-sizing:border-box;background:#E53935;color:white;text-align:center;padding:14px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:-0.1px">
      Reset password
    </a>
    <p style="margin:24px 0 0;color:#96989D;font-size:13px;line-height:1.5">
      If you didn't request this, you can safely ignore this email. Your password won't change.
    </p>
    <p style="margin:12px 0 0;color:#C0C2C7;font-size:12px;word-break:break-all">
      Or copy this link: ${link}
    </p>`
  const client = getResend()
  if (!client) { console.warn('RESEND_API_KEY not set — skipping password reset email'); return }
  return client.emails.send({
    from: FROM,
    to: [toEmail],
    subject: 'Reset your Voxa password',
    html: baseTemplate('Reset your password', content),
  })
}

export async function sendVerificationEmail(toEmail, token) {
  const link = `${getAppUrl()}/verify-email?token=${token}`
  const content = `
    <p style="margin:0 0 24px;color:#5C6068;font-size:15px;line-height:1.6">
      Thanks for signing up! Click below to verify your email address and unlock all Voxa features.
      This link expires in <strong>24 hours</strong>.
    </p>
    <a href="${link}" style="display:block;width:100%;box-sizing:border-box;background:#E53935;color:white;text-align:center;padding:14px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:-0.1px">
      Verify email address
    </a>
    <p style="margin:24px 0 0;color:#96989D;font-size:13px;line-height:1.5">
      If you didn't create a Voxa account, you can safely ignore this email.
    </p>
    <p style="margin:12px 0 0;color:#C0C2C7;font-size:12px;word-break:break-all">
      Or copy this link: ${link}
    </p>`
  const client = getResend()
  if (!client) { console.warn('RESEND_API_KEY not set — skipping verification email'); return }
  return client.emails.send({
    from: FROM,
    to: [toEmail],
    subject: 'Verify your Voxa email address',
    html: baseTemplate('Verify your email', content),
  })
}
