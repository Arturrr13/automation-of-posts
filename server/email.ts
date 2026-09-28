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
  const port = Number(
    process.env.MAILPORT || process.env.SMTP_PORT || 587,
  )
  const user = process.env.MAILUSER?.trim() || process.env.SMTP_USER?.trim()
  const pass =
    process.env.MAILPASSWORD?.trim() || process.env.SMTP_PASS?.trim()
  const to = parseRecipients(
    process.env.MAILTO || process.env.EMAIL_TO,
  )
  const from =
    process.env.MAILFROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    user ||
    ''

  return { host, port, user, pass, to, from }
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
        error: `Attachments too large (${mb}MB). Gmail limit is ~25MB total — keep under 18MB`,
      }
    }

    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })

    const info = await transporter.sendMail({
      from: from || user,
      to,
      replyTo: payload.email || undefined,
      subject: payload.emailSubject.trim(),
      text,
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
        attachments: attachments.map((f) => f.filename),
      },
    }
  } catch (error) {
    const raw =
      error instanceof Error ? error.message : 'Email send failed'
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
