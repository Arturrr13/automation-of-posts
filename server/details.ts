import type { SubmitPayload, TargetResult } from './siteofsites'

// Kept for later re-enable. Currently disabled in server/proxy.ts
// (details.so is passwordless magic-link — no stable ongoing auth).

const SITE = 'https://www.details.so'
const FEEDBACK_URL = `${SITE}/api/feedback`

/**
 * details.so uses passwordless (email magic link) auth via Supabase.
 * There is no password — put a session access_token in DETAILS_ACCESS_TOKEN.
 *
 * How to get it (once, then paste into .env):
 * 1. Open https://www.details.so and sign in with artur@thefirstthelast.agency
 * 2. Open DevTools → Application → Local Storage → https://www.details.so
 * 3. Find the key like `sb-…-auth-token` (or search "access_token")
 * 4. Copy the JSON value's `access_token` string into DETAILS_ACCESS_TOKEN
 */
function getAccessToken(): string {
  const token = process.env.DETAILS_ACCESS_TOKEN?.trim()
  if (token) return token

  throw new Error(
    'details.so has no password login. Sign in once in the browser, then set DETAILS_ACCESS_TOKEN in .env (see server/details.ts)',
  )
}

function buildMessage(payload: SubmitPayload): string {
  const lines = [
    `I'd like to suggest this website for the inspiration gallery: ${payload.websiteUrl}`,
  ]
  if (payload.projectName) lines.push(`Project: ${payload.projectName}`)
  if (payload.fullName) lines.push(`Submitted by: ${payload.fullName}`)
  if (payload.description) lines.push(payload.description)
  const message = lines.join('\n\n').trim()
  return message.length >= 20
    ? message
    : `${message}\n\nPlease consider featuring this site.`
}

export async function submitToDetailsSo(
  payload: SubmitPayload,
): Promise<TargetResult> {
  try {
    const accessToken = getAccessToken()
    const body = {
      category: 'content-issue', // Suggest content / site
      message: buildMessage(payload),
    }

    const res = await fetch(FEEDBACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        Origin: SITE,
        Referer: `${SITE}/inspo`,
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify(body),
    })

    const text = await res.text()
    let data: unknown = text
    try {
      data = JSON.parse(text)
    } catch {
      /* keep text */
    }

    const record = data as { error?: string }
    const ok = res.ok && !record.error

    return {
      ok,
      status: res.status,
      data,
      error: ok
        ? undefined
        : record.error ||
          (typeof data === 'string' ? data.slice(0, 300) : undefined) ||
          `Unexpected response (${res.status})`,
    }
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Details.so failed',
    }
  }
}
