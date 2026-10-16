import nodemailer from "nodemailer"

interface SendOtpParams {
  to: string
  otp: string
  name?: string
}

/**
 * Creates Nodemailer Gmail transporter if SMTP credentials are configured.
 */
function getMailTransporter() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "") // Remove spaces from app password

  if (!user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    service: "gmail",
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== "false",
    auth: {
      user,
      pass,
    },
  })
}

/**
 * Helper to determine whether OTP should be printed to console for local development.
 * Strictly forbidden in production or when real SMTP credentials are provided.
 */
function shouldLogOtpDev(): boolean {
  const isProduction = process.env.NODE_ENV === "production"
  const isSmtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
  return !isProduction && !isSmtpConfigured
}

/**
 * Masks an email address for safe logging without exposing PII (e.g. j***e@example.com).
 */
function maskEmail(email: string): string {
  const atIndex = email.indexOf("@")
  if (atIndex <= 1) return "***"
  const local = email.slice(0, atIndex)
  const domain = email.slice(atIndex)
  const visible = local.length > 3 ? `${local.slice(0, 2)}***` : `${local.slice(0, 1)}***`
  return `${visible}${domain}`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Sends a registration OTP email via Gmail SMTP (Nodemailer).
 */
export async function sendRegisterOtpEmail({ to, otp, name }: SendOtpParams): Promise<{ success: boolean; error?: string }> {
  // Only log OTP in non-production environment when SMTP is not configured
  if (shouldLogOtpDev()) {
    console.log(`\n======================================================`)
    console.log(`🔑 [DEV ONLY - SMTP Unconfigured] Registration OTP for: ${to}`)
    console.log(`👉 OTP CODE: ${otp} (Valid for 5 minutes)`)
    console.log(`======================================================\n`)
  }

  const recipientName = escapeHtml(name ? name : "Sahabat Sekkha")
  const fromEmail = process.env.EMAIL_FROM || `Sekkha Apps <${process.env.SMTP_USER || "noreply@sekkha.com"}>`

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kode OTP Pendaftaran Sekkha</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fffaf0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fffaf0; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="520" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 24px; padding: 36px 32px; box-shadow: 0 4px 20px rgba(10, 10, 10, 0.04);">
          
          <!-- Logo & Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; background-color: #0a0a0a; color: #ffffff; padding: 12px 20px; border-radius: 16px; font-weight: 800; font-size: 18px; letter-spacing: 1px;">
                ✨ SEKHA APPS
              </div>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding-bottom: 12px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0a0a0a; letter-spacing: -0.5px;">
                Verifikasi Pendaftaran Akun
              </h1>
            </td>
          </tr>

          <!-- Greeting & Description -->
          <tr>
            <td style="padding-bottom: 24px; font-size: 14px; line-height: 1.6; color: #4a4a4a; text-align: center;">
              Halo <strong>${recipientName}</strong>,<br>
              Terima kasih telah bergabung di <strong>Sekkha Apps</strong>. Masukkan kode One-Time Password (OTP) berikut untuk menyelesaikan pendaftaran akun Anda:
            </td>
          </tr>

          <!-- OTP Code Box -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="background-color: #faf5e8; border: 1.5px dashed #e8b94a; border-radius: 16px; padding: 18px 24px; display: inline-block;">
                <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #0a0a0a; padding-left: 8px;">
                  ${otp}
                </span>
              </div>
            </td>
          </tr>

          <!-- Expiry Notice -->
          <tr>
            <td style="padding-bottom: 28px; font-size: 12px; line-height: 1.5; color: #6a6a6a; text-align: center;">
              ⏳ Kode OTP ini hanya berlaku selama <strong>5 menit</strong>.<br>
              Jangan berikan kode ini kepada siapa pun demi keamanan akun Anda.
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="border-top: 1px solid #f0ece1; padding-top: 20px;">
              <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #9a9a9a; text-align: center;">
                Jika Anda tidak merasa mendaftar di Sekkha Apps, silakan abaikan email ini.<br>
                © 2026 Komunitas Pemuda Vihara Sekkha.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  // Send via Gmail SMTP (Nodemailer) if configured
  const transporter = getMailTransporter()
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromEmail,
        to,
        subject: "Kode Verifikasi Pendaftaran Akun Sekkha",
        html: htmlContent,
      })
      const recipientLog = process.env.NODE_ENV === "production" ? maskEmail(to) : to
      console.log(`✅ [Gmail SMTP Success] Email sent to ${recipientLog}. Message ID:`, info.messageId)
      return { success: true }
    } catch (err: any) {
      console.warn(`⚠️ [Gmail SMTP Error]:`, err?.message || err)
    }
  } else if (shouldLogOtpDev()) {
    console.log(`ℹ️ [Gmail SMTP Info] SMTP credentials not set in .env. OTP logged above for development.`)
  } else if (process.env.NODE_ENV === "production") {
    console.warn(`⚠️ [Mail Warning] SMTP credentials not configured in production.`)
  }

  return { success: true }
}

/**
 * Sends a password reset OTP email via Gmail SMTP (Nodemailer).
 */
export async function sendForgotPasswordOtpEmail({ to, otp, name }: SendOtpParams): Promise<{ success: boolean; error?: string }> {
  // Only log OTP in non-production environment when SMTP is not configured
  if (shouldLogOtpDev()) {
    console.log(`\n======================================================`)
    console.log(`🔑 [DEV ONLY - SMTP Unconfigured] Password Reset OTP for: ${to}`)
    console.log(`👉 OTP CODE: ${otp} (Valid for 5 minutes)`)
    console.log(`======================================================\n`)
  }

  const recipientName = escapeHtml(name ? name : "Sahabat Sekkha")
  const fromEmail = process.env.EMAIL_FROM || `Sekkha Apps <${process.env.SMTP_USER || "noreply@sekkha.com"}>`

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Kata Sandi Sekkha Apps</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fffaf0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fffaf0; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="520" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 24px; padding: 36px 32px; box-shadow: 0 4px 20px rgba(10, 10, 10, 0.04);">
          
          <!-- Logo & Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; background-color: #0a0a0a; color: #ffffff; padding: 12px 20px; border-radius: 16px; font-weight: 800; font-size: 18px; letter-spacing: 1px;">
                ✨ SEKHA APPS
              </div>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding-bottom: 12px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0a0a0a; letter-spacing: -0.5px;">
                Pemulihan Kata Sandi
              </h1>
            </td>
          </tr>

          <!-- Greeting & Description -->
          <tr>
            <td style="padding-bottom: 24px; font-size: 14px; line-height: 1.6; color: #4a4a4a; text-align: center;">
              Halo <strong>${recipientName}</strong>,<br>
              Kami menerima permintaan untuk mereset kata sandi akun <strong>Sekkha Apps</strong> Anda. Gunakan kode One-Time Password (OTP) berikut untuk mengatur kata sandi baru:
            </td>
          </tr>

          <!-- OTP Code Box -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="background-color: #faf5e8; border: 1.5px dashed #e8b94a; border-radius: 16px; padding: 18px 24px; display: inline-block;">
                <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #0a0a0a; padding-left: 8px;">
                  ${otp}
                </span>
              </div>
            </td>
          </tr>

          <!-- Expiry Notice -->
          <tr>
            <td style="padding-bottom: 28px; font-size: 12px; line-height: 1.5; color: #6a6a6a; text-align: center;">
              ⏳ Kode OTP ini hanya berlaku selama <strong>5 menit</strong>.<br>
              Jika Anda tidak meminta reset kata sandi, amankan akun Anda atau abaikan email ini.
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="border-top: 1px solid #f0ece1; padding-top: 20px;">
              <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #9a9a9a; text-align: center;">
                © 2026 Komunitas Pemuda Vihara Sekkha.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const transporter = getMailTransporter()
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromEmail,
        to,
        subject: "Kode Pemulihan Kata Sandi Sekkha",
        html: htmlContent,
      })
      const recipientLog = process.env.NODE_ENV === "production" ? maskEmail(to) : to
      console.log(`✅ [Gmail SMTP Success] Forgot password OTP sent to ${recipientLog}. Message ID:`, info.messageId)
      return { success: true }
    } catch (err: any) {
      console.warn(`⚠️ [Gmail SMTP Error]:`, err?.message || err)
    }
  } else if (shouldLogOtpDev()) {
    console.log(`ℹ️ [Gmail SMTP Info] SMTP credentials not set in .env. OTP logged above for development.`)
  } else if (process.env.NODE_ENV === "production") {
    console.warn(`⚠️ [Mail Warning] SMTP credentials not configured in production.`)
  }

  return { success: true }
}

interface SendTempPasswordParams {
  to: string
  tempPassword: string
  name?: string
}

/**
 * Sends temporary credentials to member email after administrative reset.
 */
export async function sendTemporaryPasswordEmail({ to, tempPassword, name }: SendTempPasswordParams): Promise<{ success: boolean; error?: string }> {
  const recipientName = escapeHtml(name || "Sahabat Sekkha")
  const safePassword = escapeHtml(tempPassword)
  const fromEmail = process.env.EMAIL_FROM || `Sekkha Apps <${process.env.SMTP_USER || "noreply@sekkha.com"}>`
  const transporter = getMailTransporter()

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromEmail,
        to,
        subject: "Kata Sandi Sementara Akun Sekkha Apps Anda",
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #111;">
            <h2>Halo, ${recipientName}</h2>
            <p>Pengurus/Admin telah mengatur ulang kata sandi akun Sekkha Apps Anda.</p>
            <p>Kata sandi sementara akun Anda adalah: <strong style="font-size: 18px; color: #0b57d0;">${safePassword}</strong></p>
            <p>Demi keamanan, silakan segera masuk dan ubah kata sandi Anda melalui menu Profil & Pengaturan Akun.</p>
            <p>© 2026 Komunitas Pemuda Vihara Sekkha.</p>
          </div>
        `,
      })
      const recipientLog = process.env.NODE_ENV === "production" ? maskEmail(to) : to
      console.log(`✅ [Gmail SMTP Success] Temporary password sent to ${recipientLog}. Message ID:`, info.messageId)
      return { success: true }
    } catch (err: any) {
      console.warn(`⚠️ [Gmail SMTP Error]:`, err?.message || err)
    }
  } else if (shouldLogOtpDev()) {
    console.log(`🔑 [DEV ONLY - SMTP Unconfigured] Temporary password for ${to}: ${tempPassword}`)
  }

  return { success: true }
}

