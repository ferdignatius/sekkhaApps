import nodemailer from "nodemailer"

export const MAX_EMAIL_RETRIES = 2

const DEFAULT_RETRY_DELAYS_MS = [500, 1500]

export interface SendOtpParams {
  to: string
  otp: string
  name?: string
}

export interface MailOptions {
  from: string
  to: string
  subject: string
  html: string
}

export interface MailTransportLike {
  sendMail(mailOptions: MailOptions): Promise<{ messageId?: string }>
}

export interface SendMailRetryOptions {
  maxRetries?: number
  retryDelaysMs?: number[]
  sleep?: (ms: number) => Promise<void>
}

export interface EmailSendDeps {
  transporter?: MailTransportLike | null
  retryOptions?: SendMailRetryOptions
}

export interface SendMailResult {
  success: boolean
  messageId?: string
  attempts: number
  error?: string
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: {
      user,
      pass,
    },
  })
}

/**
 * Identifies SMTP errors that must fail fast without retrying:
 * - Permanent 5xx rejections (invalid address, policy block, auth failure)
 * - 452 / 4.2.2 recipient mailbox full (OverQuotaTemp) so we don't hammer full inboxes
 * - Authentication errors (EAUTH)
 */
export function isNonRetryableSmtpError(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return false
  }

  const record = err as {
    code?: string
    responseCode?: number
    statusCode?: number
    message?: string
    response?: string
  }

  const responseCode = record.responseCode ?? record.statusCode
  if (typeof responseCode === "number" && responseCode >= 500 && responseCode < 600) {
    return true
  }

  if (record.code === "EAUTH") {
    return true
  }

  const detailText = `${record.message ?? ""} ${record.response ?? ""}`
  if (
    responseCode === 452 ||
    /4\.2\.2|OverQuotaTemp|out of storage space|mailbox full|quota exceeded/i.test(detailText)
  ) {
    return true
  }

  return false
}

/**
 * Sends mail through a Nodemailer-compatible transporter with a strict cap of
 * MAX_EMAIL_RETRIES (2 retries = max 3 total attempts) on transient errors.
 */
export async function sendMailWithRetry(
  transporter: MailTransportLike,
  mailOptions: MailOptions,
  options?: SendMailRetryOptions
): Promise<SendMailResult> {
  const requestedRetries = options?.maxRetries ?? MAX_EMAIL_RETRIES
  const maxRetries = Math.min(Math.max(0, requestedRetries), MAX_EMAIL_RETRIES)
  const retryDelaysMs = options?.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS
  const sleep = options?.sleep ?? defaultSleep

  let lastErrorMessage = "Unknown SMTP error"

  for (let attempt = 1; attempt <= 1 + maxRetries; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions)
      return {
        success: true,
        messageId: info?.messageId,
        attempts: attempt,
      }
    } catch (err: unknown) {
      lastErrorMessage =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown SMTP error"

      const canRetry = attempt <= maxRetries && !isNonRetryableSmtpError(err)
      if (!canRetry) {
        return {
          success: false,
          attempts: attempt,
          error: lastErrorMessage,
        }
      }

      const delayMs = retryDelaysMs[attempt - 1] ?? retryDelaysMs[retryDelaysMs.length - 1] ?? 500
      if (delayMs > 0) {
        await sleep(delayMs)
      }
    }
  }

  return {
    success: false,
    attempts: 1 + maxRetries,
    error: lastErrorMessage,
  }
}

/**
 * Masks an email address for safe logging without exposing PII (e.g. j***@example.com).
 */
export function maskEmail(email: string): string {
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

  function getFromEmail(): string {
    return process.env.EMAIL_FROM || `Sekkha Apps <${process.env.SMTP_USER || "noreply@sekkha.com"}>`
  }

function renderOtpEmailLayout(params: { title: string; heading: string; bodyHtml: string }): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fffaf0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fffaf0; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 24px; padding: 36px 32px; box-shadow: 0 4px 20px rgba(10, 10, 10, 0.04);">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; background-color: #0a0a0a; color: #ffffff; padding: 12px 20px; border-radius: 16px; font-weight: 800; font-size: 18px; letter-spacing: 1px;">
                ✨ SEKKHA APPS
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 12px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0a0a0a; letter-spacing: -0.5px;">
                ${escapeHtml(params.heading)}
              </h1>
            </td>
          </tr>
          ${params.bodyHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function renderOtpCodeBox(otp: string): string {
  return `<div style="background-color: #faf5e8; border: 1px dashed #e8b94a; border-radius: 16px; padding: 24px 32px; text-align: center; display: inline-block; width: 80%; box-sizing: border-box;">
  <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0a0a0a; display: block;">
    ${escapeHtml(otp)}
  </span>
  <span style="display: inline-block; margin-top: 10px; font-size: 12px; font-weight: 600; color: #8a7a5a;">
    ⏱️ Berlaku selama 10 menit
  </span>
</div>`
}

async function dispatchOtpEmail(
  params: {
    to: string
    subject: string
    html: string
    label: string
    fallbackDevLog?: () => void
  },
  deps?: EmailSendDeps
): Promise<{ success: boolean; error?: string }> {
  const transporter = deps && "transporter" in deps ? deps.transporter : getMailTransporter()

  if (transporter) {
    const result = await sendMailWithRetry(
      transporter,
      {
        from: getFromEmail(),
        to: params.to,
        subject: params.subject,
        html: params.html,
      },
      deps?.retryOptions
    )

    const recipientLog = process.env.NODE_ENV === "production" ? maskEmail(params.to) : params.to
    if (result.success) {
      console.log(
        `✅ [Gmail SMTP Success] ${params.label} sent to ${recipientLog}. Message ID: `,
        result.messageId
      )
      return { success: true }
    }

    console.warn(
      `⚠️ [Gmail SMTP Error] (${params.label}, attempts = ${result.attempts}): `,
      result.error
    )
    return { success: false, error: result.error }
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(`⚠️ [Mail Warning] SMTP credentials not configured in production.`)
  } else {
    params.fallbackDevLog?.()
  }

  return { success: true }
}

/**
 * Sends a registration OTP email via Gmail SMTP (Nodemailer).
 */
export async function sendRegisterOtpEmail(
  { to, otp, name }: SendOtpParams,
  deps?: EmailSendDeps
): Promise<{ success: boolean; error?: string }> {
  const recipientName = escapeHtml(name ? name : "Sahabat Sekkha")
  const htmlContent = renderOtpEmailLayout({
    title: "Kode OTP Pendaftaran Sekkha",
    heading: "Verifikasi Pendaftaran Akun",
    bodyHtml: `
      <tr>
        <td style="padding-bottom: 24px; font-size: 14px; line-height: 1.6; color: #4a4a4a; text-align: center;">
          Halo <strong>${recipientName}</strong>,<br>
          Terima kasih telah bergabung di <strong>Sekkha Apps</strong>. Masukkan kode One-Time Password (OTP) berikut untuk menyelesaikan pendaftaran akun Anda:
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          ${renderOtpCodeBox(otp)}
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 24px; font-size: 13px; line-height: 1.6; color: #6a6a6a; text-align: center;">
          Jangan bagikan kode ini kepada siapa pun. Tim Sekkha tidak akan pernah meminta kode verifikasi Anda.
        </td>
      </tr>
      <tr>
        <td align="center" style="border-top: 1px solid #f0f0f0; padding-top: 24px; font-size: 12px; color: #8a8a8a;">
          Jika Anda tidak merasa mendaftar di Sekkha Apps, abaikan email ini.<br>
          &copy; 2026 Komunitas Pemuda Vihara Sekkha.
        </td>
      </tr>
    `,
  })

  return dispatchOtpEmail(
    {
      to,
      subject: `${otp} adalah Kode Verifikasi Pendaftaran Sekkha Anda`,
      html: htmlContent,
      label: "Register OTP",
      fallbackDevLog: () =>
        console.log(`🔐 [Registration OTP] Code for ${maskEmail(to)}: ${otp.replace(/./g, "*")}`),
    },
    deps
  )
}

/**
 * Sends a forgot password OTP email via Gmail SMTP (Nodemailer).
 */
export async function sendForgotPasswordOtpEmail(
  { to, otp, name }: SendOtpParams,
  deps?: EmailSendDeps
): Promise<{ success: boolean; error?: string }> {
  const recipientName = escapeHtml(name ? name : "Sahabat Sekkha")
  const htmlContent = renderOtpEmailLayout({
    title: "Kode Pemulihan Kata Sandi Sekkha",
    heading: "Pemulihan Kata Sandi",
    bodyHtml: `
      <tr>
        <td style="padding-bottom: 24px; font-size: 14px; line-height: 1.6; color: #4a4a4a; text-align: center;">
          Halo <strong>${recipientName}</strong>,<br>
          Kami menerima permintaan untuk mengatur ulang kata sandi akun Sekkha Apps Anda. Gunakan kode OTP 6-digit berikut:
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          ${renderOtpCodeBox(otp)}
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 24px; font-size: 13px; line-height: 1.6; color: #dc2626; text-align: center; font-weight: 600;">
          ⚠️ Jangan pernah berikan kode ini kepada siapa pun demi keamanan akun Anda.
        </td>
      </tr>
      <tr>
        <td align="center" style="border-top: 1px solid #f0f0f0; padding-top: 24px; font-size: 12px; color: #8a8a8a;">
          Jika Anda tidak meminta pengaturan ulang kata sandi, abaikan email ini.<br>
          &copy; 2026 Komunitas Pemuda Vihara Sekkha.
        </td>
      </tr>
    `,
  })

  return dispatchOtpEmail(
    {
      to,
      subject: "Kode Pemulihan Kata Sandi Sekkha",
      html: htmlContent,
      label: "Forgot password OTP",
    },
    deps
  )
}

/**
 * Sends an email verification OTP email via Gmail SMTP (Nodemailer).
 */
export async function sendEmailVerificationOtpEmail(
  { to, otp, name }: SendOtpParams,
  deps?: EmailSendDeps
): Promise<{ success: boolean; error?: string }> {
  const recipientName = escapeHtml(name || "Sahabat Sekkha")
  const htmlContent = renderOtpEmailLayout({
    title: "Kode Verifikasi Email Sekkha",
    heading: "Verifikasi Alamat Email",
    bodyHtml: `
      <tr>
        <td style="padding-bottom: 24px; font-size: 14px; line-height: 22px; color: #4a4a4a; text-align: center;">
          Halo <strong>${recipientName}</strong>, Anda meminta verifikasi alamat email baru untuk akun Sekkha Anda. Masukkan 6 digit kode OTP berikut:
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          ${renderOtpCodeBox(otp)}
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 24px; font-size: 12px; line-height: 18px; color: #8a8a8a; text-align: center;">
          Jika Anda tidak merasa meminta verifikasi ini, abaikan email ini. Alamat email Anda tidak akan diubah tanpa konfirmasi kode ini.
        </td>
      </tr>
      <tr>
        <td align="center" style="border-top: 1px solid #f0f0f0; padding-top: 24px; font-size: 12px; color: #8a8a8a;">
          &copy; 2026 Komunitas Pemuda Vihara Sekkha.
        </td>
      </tr>
    `,
  })

  return dispatchOtpEmail(
    {
      to,
      subject: `${otp} adalah Kode Verifikasi Email Sekkha Anda`,
      html: htmlContent,
      label: "Email verification OTP",
    },
    deps
  )
}

/**
 * Sends a password change 6-digit OTP email via Gmail SMTP (Nodemailer).
 */
export async function sendChangePasswordOtpEmail(
  { to, otp, name }: SendOtpParams,
  deps?: EmailSendDeps
): Promise<{ success: boolean; error?: string }> {
  const recipientName = escapeHtml(name || "Sahabat Sekkha")
  const htmlContent = renderOtpEmailLayout({
    title: "Kode Keamanan Ganti Kata Sandi Sekkha",
    heading: "Verifikasi Ubah Kata Sandi",
    bodyHtml: `
      <tr>
        <td style="padding-bottom: 24px; font-size: 14px; line-height: 22px; color: #4a4a4a; text-align: center;">
          Halo <strong>${recipientName}</strong>, akun Sekkha Anda sedang melakukan permintaan perubahan kata sandi. Masukkan 6 digit kode OTP berikut untuk menyelesaikan pergantian kata sandi:
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          ${renderOtpCodeBox(otp)}
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 8px; font-size: 12px; line-height: 18px; color: #dc2626; text-align: center; font-weight: 600;">
          ⚠️ Jangan berikan kode OTP ini kepada siapa pun, termasuk pihak yang mengaku dari Sekkha Apps.
        </td>
      </tr>
      <tr>
        <td align="center" style="border-top: 1px solid #f0f0f0; padding-top: 24px; font-size: 12px; line-height: 18px; color: #8a8a8a; text-align: center;">
          Jika Anda tidak merasa meminta perubahan kata sandi ini, abaikan email ini dan pastikan akun Anda tetap aman.<br>
          &copy; 2026 Komunitas Pemuda Vihara Sekkha.
        </td>
      </tr>
    `,
  })

  return dispatchOtpEmail(
    {
      to,
      subject: `${otp} adalah Kode OTP Ubah Kata Sandi Akun Sekkha Anda`,
      html: htmlContent,
      label: "Change password OTP",
      fallbackDevLog: () =>
        console.log(`🔐 [Password Change OTP] Code for ${maskEmail(to)}: ${otp.replace(/./g, "*")}`),
    },
    deps
  )
}
