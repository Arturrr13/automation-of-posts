import type { SubmitPayload, TargetResult } from './siteofsites'
import type { MultipartFile } from './multipart'

export type EmailAttachment = MultipartFile

/** Gmail limit is 25MB total; base64 adds ~33%, keep under 18MB raw. */
const GMAIL_SAFE_MAX_BYTES = 18 * 1024 * 1024

function parseRecipients(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  const seen = new Set<string>()
  const list: string[] = []
  for (const part of raw.split(/[,;\n]+/)) {
    const email = part.trim().toLowerCase()
    if (!email || !email.includes('@') || seen.has(email)) continue
    seen.add(email)
    list.push(part.trim())
  }
  return list
}

function mailConfig() {
  const host = process.env.MAILHOST?.trim() || process.env.SMTP_HOST?.trim()
  const port = Number(process.env.MAILPORT || process.env.SMTP_PORT || 587)
  const user = process.env.MAILUSER?.trim() || process.env.SMTP_USER?.trim()
  const pass =
    process.env.MAILPASSWORD?.trim() || process.env.SMTP_PASS?.trim()
  const to = parseRecipients(process.env.MAILTO || process.env.EMAIL_TO)
  const from =
    process.env.MAILFROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    user ||
    ''
  const resendKey = process.env.RESEND_API_KEY?.trim()

  return { host, port, user, pass, to, from, resendKey }
}

function validatePayload(
  payload: SubmitPayload,
  attachments: EmailAttachment[],
  to: string[],
): string | null {
  if (!to.length) return 'Set MAILTO in .env'
  if (!payload.emailSubject?.trim()) return 'Email subject is required'
  const text = payload.emailMessage?.trim() || ''
  if (!text && attachments.length === 0) {
    return 'Email message or attachments are required'
  }
  const attachmentsBytes = attachments.reduce(
    (sum, file) => sum + file.buffer.length,
    0,
  )
  if (attachmentsBytes > GMAIL_SAFE_MAX_BYTES) {
    const mb = (attachmentsBytes / (1024 * 1024)).toFixed(1)
    return `Attachments too large (${mb}MB). Keep under 18MB`
  }
  return null
}

/** HTTPS API — works on Render (SMTP ports are often blocked there) */
async function sendViaResend(
  payload: SubmitPayload,
  attachments: EmailAttachment[],
  to: string[],
  from: string,
  apiKey: string,
): Promise<TargetResult> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: payload.email || undefined,
      subject: payload.emailSubject!.trim(),
      text: payload.emailMessage?.trim() || '',
      attachments: attachments.map((file) => ({
        filename: file.filename,
        content: file.buffer.toString('base64'),
      })),
    }),
  })

  const data = (await res.json().catch(() => ({}))) as {
    id?: string
    message?: string
    name?: string
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      data,
      error: data.message || data.name || `Resend failed (${res.status})`,
    }
  }

  return {
    ok: true,
    status: res.status,
    data: { messageId: data.id, to, via: 'resend' },
  }
}

async function sendViaSmtpOnce(
  payload: SubmitPayload,
  attachments: EmailAttachment[],
  to: string[],
  from: string,
  host: string,
  port: number,
  user: string,
  pass: string,
): Promise<TargetResult> {
  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    // Render / cloud: prefer IPv4; avoid hanging forever on blocked SMTP
    family: 4,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
    tls: { servername: host },
  })

  const info = await transporter.sendMail({
    from: from || user,
    to,
    replyTo: payload.email || undefined,
    subject: payload.emailSubject!.trim(),
    text: payload.emailMessage?.trim() || '',
    attachments: attachments.map((file) => ({
      filename: file.filename,
      content: file.buffer,
      contentType: file.mime,
    })),
  })

  return {
    ok: true,
    status: 200,
    data: {
      messageId: info.messageId,
      to,
      via: `smtp:${port}`,
      attachments: attachments.map((f) => f.filename),
    },
  }
}

async function sendViaSmtp(
  payload: SubmitPayload,
  attachments: EmailAttachment[],
  to: string[],
  from: string,
  host: string,
  preferredPort: number,
  user: string,
  pass: string,
): Promise<TargetResult> {
  const ports = [...new Set([preferredPort, 465, 587])]
  let lastError = 'SMTP failed'

  for (const port of ports) {
    try {
      return await sendViaSmtpOnce(
        payload,
        attachments,
        to,
        from,
        host,
        port,
        user,
        pass,
      )
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      console.warn(`[email] SMTP :${port} failed:`, lastError)
    }
  }

  const blocked = /timeout|ETIMEDOUT|ECONNREFUSED|ESOCKET/i.test(lastError)
  return {
    ok: false,
    status: 0,
    error: blocked
      ? `SMTP blocked/timeout on host (common on Render). Set RESEND_API_KEY for HTTPS email, or send from a host that allows ports 587/465. Last error: ${lastError}`
      : lastError,
  }
}

export async function sendEmailMessage(
  payload: SubmitPayload,
  attachments: EmailAttachment[] = [],
): Promise<TargetResult> {
  try {
    const { host, port, user, pass, to, from, resendKey } = mailConfig()
    const invalid = validatePayload(payload, attachments, to)
    if (invalid) {
      return { ok: false, status: 400, error: invalid }
    }

    // Prefer Resend on cloud hosts — uses HTTPS, not blocked like SMTP
    if (resendKey) {
      const sender =
        from ||
        process.env.MAILFROM?.trim() ||
        'Website Submit <onboarding@resend.dev>'
      return await sendViaResend(payload, attachments, to, sender, resendKey)
    }

    if (!host || !user || !pass) {
      return {
        ok: false,
        status: 400,
        error:
          'Set MAILHOST/MAILUSER/MAILPASSWORD, or RESEND_API_KEY (recommended on Render)',
      }
    }

    return await sendViaSmtp(
      payload,
      attachments,
      to,
      from,
      host,
      port,
      user,
      pass,
    )
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Email send failed'
    const errorMessage = /552|message size|MaxSizeError/i.test(raw)
      ? 'Attachments too large for Gmail (~25MB limit). Remove big files and try again'
      : /timeout|ETIMEDOUT/i.test(raw)
        ? `SMTP timeout (often blocked on Render). Set RESEND_API_KEY. ${raw}`
        : raw
    return {
      ok: false,
      status: 0,
      error: errorMessage,
    }
  }
}
