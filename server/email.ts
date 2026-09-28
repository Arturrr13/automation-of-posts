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

  return { host, port, user, pass, to, from }
}

async function resolveIpv4(host: string): Promise<string> {
  const dns = await import('node:dns/promises')
  const { address } = await dns.lookup(host, { family: 4 })
  return address
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
  const ipv4 = await resolveIpv4(host)
  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.createTransport({
    host: ipv4,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
    tls: { servername: host },
    name: host,
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
      via: `smtp:${port}/ipv4`,
      attachments: attachments.map((f) => f.filename),
    },
  }
}

export async function sendEmailMessage(
  payload: SubmitPayload,
  attachments: EmailAttachment[] = [],
): Promise<TargetResult> {
  try {
    const { host, port, user, pass, to, from } = mailConfig()

    if (!to.length) {
      return { ok: false, status: 400, error: 'Set MAILTO in .env' }
    }
    if (!host || !user || !pass) {
      return {
        ok: false,
        status: 400,
        error: 'Set MAILHOST, MAILUSER, MAILPASSWORD in .env',
      }
    }
    if (!payload.emailSubject?.trim()) {
      return { ok: false, status: 400, error: 'Email subject is required' }
    }

    const text = payload.emailMessage?.trim() || ''
    if (!text && attachments.length === 0) {
      return {
        ok: false,
        status: 400,
        error: 'Email message or attachments are required',
      }
    }

    const attachmentsBytes = attachments.reduce(
      (sum, file) => sum + file.buffer.length,
      0,
    )
    if (attachmentsBytes > GMAIL_SAFE_MAX_BYTES) {
      const mb = (attachmentsBytes / (1024 * 1024)).toFixed(1)
      return {
        ok: false,
        status: 400,
        error: `Attachments too large (${mb}MB). Keep under 18MB`,
      }
    }

    const ports = [...new Set([587, port, 465].filter(Boolean))]
    let lastError = 'SMTP failed'

    for (const tryPort of ports) {
      try {
        return await sendViaSmtpOnce(
          payload,
          attachments,
          to,
          from,
          host,
          tryPort,
          user,
          pass,
        )
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        console.warn(`[email] SMTP :${tryPort} failed:`, lastError)
      }
    }

    return { ok: false, status: 0, error: lastError }
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Email send failed'
    const errorMessage = /552|message size|MaxSizeError/i.test(raw)
      ? 'Attachments too large for Gmail (~25MB limit). Remove big files and try again'
      : raw
    return {
      ok: false,
      status: 0,
      error: errorMessage,
    }
  }
}
