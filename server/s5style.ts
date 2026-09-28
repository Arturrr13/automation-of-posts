import type { SubmitPayload, TargetResult } from './siteofsites'

const API = 'https://api.s5-style.com'
const ORIGIN = 'https://www.s5-style.com'

export type S5CoverImage = {
  buffer: Buffer
  filename: string
  mime: string
}

type LoginCookies = {
  securityToken: string
  sessionId: string
}

function parseSetCookie(header: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  // Node may join multiple Set-Cookie with comma; split carefully on cookie starts
  const parts = header.split(/,(?=\s*[^;=]+=)/)
  for (const part of parts) {
    const pair = part.split(';')[0]?.trim()
    if (!pair) continue
    const eq = pair.indexOf('=')
    if (eq <= 0) continue
    out[pair.slice(0, eq)] = pair.slice(eq + 1)
  }
  return out
}

async function login(): Promise<LoginCookies> {
  const email = process.env.S5_EMAIL?.trim()
  const password = process.env.S5_PASSWORD?.trim()
  if (!email || !password) {
    throw new Error(
      'S5-Style requires login. Set S5_EMAIL + S5_PASSWORD in .env',
    )
  }

  const res = await fetch(`${API}/account/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      Referer: `${ORIGIN}/submit/`,
    },
    body: JSON.stringify({ email, password }),
  })

  const cookies = parseSetCookie(res.headers.get('set-cookie'))
  // Prefer getSetCookie when available (undici / Node 18+)
  const setCookies =
    typeof (res.headers as Headers & { getSetCookie?: () => string[] })
      .getSetCookie === 'function'
      ? (res.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
      : []

  for (const raw of setCookies) {
    const name = raw.split('=')[0]
    const value = raw.split(';')[0]?.slice(name.length + 1)
    if (name && value) cookies[name] = value
  }

  const securityToken = cookies.security_token
  const sessionId = cookies.sessionid
  if (!res.ok || !securityToken || !sessionId) {
    let message = `S5-Style login failed (${res.status})`
    try {
      const data = (await res.json()) as { error?: { message?: string }; message?: string }
      message = data.error?.message || data.message || message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }

  return { securityToken, sessionId }
}

function extractError(data: unknown, status: number): string {
  if (!data || typeof data !== 'object') return `S5-Style submit failed (${status})`
  const record = data as {
    error?: {
      message?: string
      code?: string
      errors?: Array<{ field?: string; message?: string }>
    }
    message?: string
  }
  const nested = record.error?.errors?.[0]
  if (nested?.message) {
    return nested.field
      ? `${nested.field}: ${nested.message}`
      : nested.message
  }
  return (
    record.error?.message ||
    record.message ||
    `S5-Style submit failed (${status})`
  )
}

export async function submitToS5Style(
  payload: SubmitPayload,
  coverImage?: S5CoverImage,
): Promise<TargetResult> {
  try {
    if (!coverImage?.buffer?.length) {
      return {
        ok: false,
        status: 400,
        error: 'Thumbnail image is required for S5-Style',
      }
    }

    const { securityToken, sessionId } = await login()

    const form = new FormData()
    form.append('title', payload.projectName)
    form.append('site_url', payload.websiteUrl)
    form.append(
      'cover_image',
      new Blob([new Uint8Array(coverImage.buffer)], {
        type: coverImage.mime || 'application/octet-stream',
      }),
      coverImage.filename || 'cover.jpg',
    )

    const res = await fetch(`${API}/posts`, {
      method: 'POST',
      headers: {
        Origin: ORIGIN,
        Referer: `${ORIGIN}/submit/form/`,
        'security-token': securityToken,
        Cookie: `security_token=${securityToken}; sessionid=${sessionId}`,
      },
      body: form,
    })

    let data: unknown
    const text = await res.text()
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { raw: text }
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: extractError(data, res.status),
      }
    }

    return { ok: true, status: res.status, data }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'S5-Style submit failed',
    }
  }
}
