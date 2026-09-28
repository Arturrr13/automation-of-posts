import type { SubmitPayload, TargetResult } from './siteofsites'

const SITE = 'https://onepagelove.com'
const SUBMIT_PAGE = `${SITE}/submit`
const AJAX_URL = `${SITE}/wp-admin/admin-ajax.php`

async function getNonce(): Promise<string> {
  const res = await fetch(SUBMIT_PAGE, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) {
    throw new Error(`Failed to load One Page Love form (${res.status})`)
  }
  const html = await res.text()
  const nonce = html.match(/"nonce"\s*:\s*"([^"]+)"/)?.[1]
  if (!nonce) {
    throw new Error('One Page Love nonce not found')
  }
  return nonce
}

function firstNameFromFullName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0]
  return part || fullName.trim()
}

export async function submitToOnePageLove(
  payload: SubmitPayload,
): Promise<TargetResult> {
  try {
    const nonce = await getNonce()
    const body = new URLSearchParams({
      action: 'opl_submit_website',
      nonce,
      first_name: firstNameFromFullName(payload.fullName),
      email: payload.email,
      // Multi-step UI only — "Unique Inspiration" for websites
      type: 'inspiration',
      url: payload.websiteUrl,
      confirm: '1',
      opl_hp_field: '',
    })

    const res = await fetch(AJAX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        Origin: SITE,
        Referer: SUBMIT_PAGE,
      },
      body,
    })

    const text = await res.text()
    let data: unknown = text
    try {
      data = JSON.parse(text)
    } catch {
      /* keep text */
    }

    const record = data as { success?: boolean; data?: { message?: string } }
    const ok = res.ok && record.success === true

    return {
      ok,
      status: res.status,
      data,
      error: ok
        ? undefined
        : record.data?.message || `Unexpected response (${res.status})`,
    }
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'One Page Love failed',
    }
  }
}
