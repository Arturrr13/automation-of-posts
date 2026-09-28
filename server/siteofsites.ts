export type SubmitPayload = {
  projectName: string
  fullName: string
  email: string
  instagram: string
  studio?: string
  websiteUrl: string
  industry: string
  platform: string
  type?: string
  style: string[]
  designBy: string
  codeBy?: string
  description?: string
  terms: boolean
  /** Craftwork curated categories (1–3 ids) */
  craftworkCategoryIds?: number[]
  /** Optional X / Twitter handle for Craftwork */
  xAccount?: string
  /** Email notification fields (recipient comes from EMAIL_TO env) */
  emailSubject?: string
  emailMessage?: string
}

export type TargetResult = {
  ok: boolean
  status: number
  data?: unknown
  error?: string
}

const FORM_APP_ID = '225dd912-7dea-4738-8688-4b8c6955ffc2'
const FORM_ID = 'd090bb7c-79d9-4fab-9ea5-24b9f78395b0'
const SITE = 'https://www.siteofsites.co'
const SUBMIT_URL = `${SITE}/_api/form-submission-service/v4/submissions`
const TOKENS_URL = `${SITE}/_api/v1/access-tokens`

async function getFormsInstance(): Promise<string> {
  const res = await fetch(TOKENS_URL)
  if (!res.ok) {
    throw new Error(`Failed to get access tokens (${res.status})`)
  }
  const data = (await res.json()) as {
    apps?: Record<string, { instance?: string }>
  }
  const instance = data.apps?.[FORM_APP_ID]?.instance
  if (!instance) {
    throw new Error('Wix Forms instance not found')
  }
  return instance
}

function toWixSubmissions(payload: SubmitPayload) {
  const submissions: Record<string, string | string[] | boolean> = {
    project_name: payload.projectName,
    first_name_40fc: payload.fullName,
    email_be81: payload.email,
    short_answer_458b: payload.instagram,
    link_2c9c: payload.websiteUrl,
    dropdown_8fe3: payload.industry,
    dropdown_ddce: payload.platform,
    tag_picker_c983: payload.style,
    designer: payload.designBy,
    form_field_218c: payload.terms,
  }

  if (payload.studio) submissions.short_answer_dc85 = payload.studio
  if (payload.type) submissions.type = payload.type
  if (payload.codeBy) submissions.code = payload.codeBy
  if (payload.description) submissions.long_answer_25f8 = payload.description

  return submissions
}

function extractWixError(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const record = data as Record<string, any>
  if (typeof record.message === 'string') {
    const nested =
      record.details?.validationError?.fieldViolations?.[0]?.data?.errors?.[0]
        ?.errorMessage
    return nested ? `${record.message}: ${nested}` : record.message
  }
  return undefined
}

export async function submitToSiteOfSites(
  payload: SubmitPayload,
): Promise<TargetResult> {
  try {
    const instance = await getFormsInstance()
    const wixRes = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: instance,
        Origin: SITE,
        Referer: `${SITE}/submit`,
      },
      body: JSON.stringify({
        submission: {
          formId: FORM_ID,
          submissions: toWixSubmissions(payload),
        },
      }),
    })

    const text = await wixRes.text()
    let data: unknown = text
    try {
      data = JSON.parse(text)
    } catch {
      /* keep text */
    }

    return {
      ok: wixRes.ok,
      status: wixRes.status,
      data,
      error: wixRes.ok ? undefined : extractWixError(data) || text.slice(0, 300),
    }
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Site of Sites failed',
    }
  }
}
