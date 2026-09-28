import type { SubmitPayload, TargetResult } from './siteofsites'

const SITE = 'https://www.ogimage.gallery'
const SITE_ID = '6040b8a8176ad35fd8dbf709'
const PAGE_ID = '6040dec990635a2f10ddfb11'
const ELEMENT_ID = '82509f9f-3d2b-a57b-e267-d47f61b9a62d'
const SUBMIT_URL = `https://webflow.com/api/v1/form/${SITE_ID}`

function normalizeTwitter(value?: string): string {
  const raw = value?.trim()
  if (!raw) return ''
  const handle = raw
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '')
  return handle ? `@${handle}` : ''
}

export async function submitToOgImageGallery(
  payload: SubmitPayload,
): Promise<TargetResult> {
  try {
    const fields: Record<string, string> = {
      URL: payload.websiteUrl,
    }
    const twitter = normalizeTwitter(payload.xAccount)
    if (twitter) fields.Twitter = twitter

    const res = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: SITE,
        Referer: `${SITE}/submit`,
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        name: 'Email Form',
        pageId: PAGE_ID,
        elementId: ELEMENT_ID,
        domain: 'www.ogimage.gallery',
        source: `${SITE}/submit`,
        test: false,
        fields,
        dolphin: false,
      }),
    })

    const text = await res.text()
    let data: unknown = text
    try {
      data = JSON.parse(text)
    } catch {
      /* keep text */
    }

    const record = data as { msg?: string; code?: number }
    const ok = res.ok && (record.msg === 'ok' || record.code === 200)

    return {
      ok,
      status: res.status,
      data,
      error: ok
        ? undefined
        : typeof data === 'string'
          ? data.slice(0, 300)
          : `Unexpected response (${res.status})`,
    }
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'OGimage.gallery failed',
    }
  }
}
