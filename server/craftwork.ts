import type { SubmitPayload, TargetResult } from './siteofsites'

const SITE = 'https://craftwork.design'
const SUBMIT_URL = `${SITE}/api/v2/curated/requests`

/** Curated website categories from GET /api/v2/curated/categories */
export const CRAFTWORK_CATEGORIES = [
  { id: 4, name: 'Portfolio' },
  { id: 3, name: 'Agency' },
  { id: 10, name: 'E-commerce' },
  { id: 12, name: 'Tech' },
  { id: 8, name: 'Web Apps' },
  { id: 1, name: 'Desktop Apps' },
  { id: 7, name: 'Mobile Apps' },
  { id: 14, name: 'Design Tools' },
  { id: 2, name: 'Development Tools' },
  { id: 11, name: 'Productivity' },
  { id: 15, name: 'Marketing' },
  { id: 9, name: 'Finance' },
  { id: 6, name: 'Artificial Intelligence' },
  { id: 5, name: 'Web3' },
  { id: 13, name: 'Assets' },
  { id: 16, name: 'Catalog' },
] as const

const VALID_IDS = new Set(CRAFTWORK_CATEGORIES.map((c) => c.id))

function normalizeXAccount(value?: string): string | null {
  const raw = value?.trim()
  if (!raw) return null
  return raw.replace(/^@/, '').replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '')
}

function extractError(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const record = data as Record<string, unknown>
  if (typeof record.error === 'string') return record.error
  if (record.error && typeof record.error === 'object') {
    const nested = record.error as { message?: string }
    if (typeof nested.message === 'string') return nested.message
  }
  if (typeof record.message === 'string' && record.success === false) {
    return record.message
  }
  return undefined
}

export async function submitToCraftwork(
  payload: SubmitPayload,
): Promise<TargetResult> {
  try {
    const categoryIds = (payload.craftworkCategoryIds || []).filter((id) =>
      VALID_IDS.has(id as (typeof CRAFTWORK_CATEGORIES)[number]['id']),
    )

    if (!categoryIds.length) {
      return {
        ok: false,
        status: 400,
        error: 'Select at least one Craftwork category',
      }
    }

    if (categoryIds.length > 3) {
      return {
        ok: false,
        status: 400,
        error: 'Craftwork allows up to 3 categories',
      }
    }

    const body = {
      websiteUrl: payload.websiteUrl,
      xAccountUsername: normalizeXAccount(payload.xAccount),
      categoryIds,
    }

    const res = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: SITE,
        Referer: `${SITE}/curated/websites`,
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

    const record = data as { success?: boolean }
    const ok = res.ok && record.success !== false

    return {
      ok,
      status: res.status,
      data,
      error: ok
        ? undefined
        : extractError(data) || `Unexpected response (${res.status})`,
    }
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Craftwork failed',
    }
  }
}
