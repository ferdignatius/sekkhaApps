import { describe, it, expect } from "bun:test"
import {
  MAX_EMAIL_RETRIES,
  isNonRetryableSmtpError,
  sendMailWithRetry,
  sendRegisterOtpEmail,
  sendForgotPasswordOtpEmail,
  sendEmailVerificationOtpEmail,
  sendChangePasswordOtpEmail,
  maskEmail,
  type MailTransportLike,
} from "../email"

const noOpSleep = async () => {}

describe("SMTP Email Delivery & Retry Limit", () => {
  it("caps MAX_EMAIL_RETRIES at exactly 2 retries", () => {
    expect(MAX_EMAIL_RETRIES).toBe(2)
  })

  it("sends once and stops immediately on first-attempt success", async () => {
    let calls = 0
    const transporter: MailTransportLike = {
      async sendMail() {
        calls++
        return { messageId: "msg-1" }
      },
    }

    const result = await sendMailWithRetry(
      transporter,
      { from: "sender@gmail.com", to: "user@gmail.com", subject: "OTP", html: "<p>123456</p>" },
      { sleep: noOpSleep }
    )

    expect(result).toEqual({ success: true, messageId: "msg-1", attempts: 1 })
    expect(calls).toBe(1)
  })

  it("retries transient SMTP/network errors up to 2 times (3 total attempts) and succeeds on final retry", async () => {
    let calls = 0
    const delays: number[] = []
    const transporter: MailTransportLike = {
      async sendMail() {
        calls++
        if (calls < 3) {
          const err = new Error("Connection timeout") as Error & { code?: string; responseCode?: number }
          err.code = "ETIMEDOUT"
          err.responseCode = 421
          throw err
        }
        return { messageId: "msg-retry-ok" }
      },
    }

    const result = await sendMailWithRetry(
      transporter,
      { from: "sender@gmail.com", to: "user@gmail.com", subject: "OTP", html: "<p>123456</p>" },
      {
        sleep: async (ms) => {
          delays.push(ms)
        },
      }
    )

    expect(result).toEqual({ success: true, messageId: "msg-retry-ok", attempts: 3 })
    expect(calls).toBe(3)
    expect(delays.length).toBe(2)
  })

  it("stops strictly after 2 retries (never retries more than twice) on repeated transient failure", async () => {
    let calls = 0
    const delays: number[] = []
    const transporter: MailTransportLike = {
      async sendMail() {
        calls++
        const err = new Error("Temporary server error") as Error & { responseCode?: number }
        err.responseCode = 451
        throw err
      },
    }

    const result = await sendMailWithRetry(
      transporter,
      { from: "sender@gmail.com", to: "user@gmail.com", subject: "OTP", html: "<p>123456</p>" },
      {
        sleep: async (ms) => {
          delays.push(ms)
        },
      }
    )

    expect(result.success).toBe(false)
    expect(result.attempts).toBe(3) // 1 initial attempt + 2 retries max
    expect(result.error).toContain("Temporary server error")
    expect(calls).toBe(3)
    expect(delays.length).toBe(2)
  })

  it("does NOT retry on 452 4.2.2 recipient inbox full (OverQuotaTemp) errors", async () => {
    let calls = 0
    const transporter: MailTransportLike = {
      async sendMail() {
        calls++
        const err = new Error(
          "452 4.2.2 The recipient's inbox is out of storage space. Please direct the recipient to https://support.google.com/mail/?p=OverQuotaTemp"
        ) as Error & { responseCode?: number; response?: string }
        err.responseCode = 452
        err.response = "452 4.2.2 OverQuotaTemp"
        throw err
      },
    }

    expect(
      isNonRetryableSmtpError({
        responseCode: 452,
        message: "452 4.2.2 The recipient's inbox is out of storage space",
      })
    ).toBe(true)

    const result = await sendMailWithRetry(
      transporter,
      { from: "sender@gmail.com", to: "fullbox@gmail.com", subject: "OTP", html: "<p>123456</p>" },
      { sleep: noOpSleep }
    )

    expect(result.success).toBe(false)
    expect(result.attempts).toBe(1)
    expect(calls).toBe(1)
  })

  it("does NOT retry on permanent 5xx or authentication (EAUTH) SMTP errors", async () => {
    expect(isNonRetryableSmtpError({ responseCode: 550, message: "550 5.1.1 User unknown" })).toBe(true)
    expect(isNonRetryableSmtpError({ code: "EAUTH", responseCode: 535, message: "Username and Password not accepted" })).toBe(true)
    expect(isNonRetryableSmtpError({ code: "ETIMEDOUT", message: "Connection timed out" })).toBe(false)

    let calls = 0
    const transporter: MailTransportLike = {
      async sendMail() {
        calls++
        const err = new Error("550 5.1.1 User unknown") as Error & { responseCode?: number }
        err.responseCode = 550
        throw err
      },
    }

    const result = await sendMailWithRetry(
      transporter,
      { from: "sender@gmail.com", to: "missing@gmail.com", subject: "OTP", html: "<p>123456</p>" },
      { sleep: noOpSleep }
    )

    expect(result.success).toBe(false)
    expect(result.attempts).toBe(1)
    expect(calls).toBe(1)
  })

  it("applies the 2-retry limit across all OTP email senders without throwing on failure", async () => {
    const senders = [
      sendRegisterOtpEmail,
      sendForgotPasswordOtpEmail,
      sendEmailVerificationOtpEmail,
      sendChangePasswordOtpEmail,
    ]

    for (const sendFn of senders) {
      let calls = 0
      const transporter: MailTransportLike = {
        async sendMail() {
          calls++
          const err = new Error("Transient socket error") as Error & { code?: string }
          err.code = "ECONNRESET"
          throw err
        },
      }

      const res = await sendFn(
        { to: "member@gmail.com", otp: "123456", name: "Member" },
        { transporter, retryOptions: { sleep: noOpSleep } }
      )

      expect(calls).toBe(3)
      expect(res.success).toBe(false)
      expect(res.error).toContain("Transient socket error")
    }
  })

  it("masks email safely for production logs", () => {
    expect(maskEmail("jasthiankeiven@gmail.com")).toBe("ja***@gmail.com")
    expect(maskEmail("ab@gmail.com")).toBe("a***@gmail.com")
  })
})

