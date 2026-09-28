import type { SubmitPayload, TargetResult } from './siteofsites'

const SITE = 'https://www.footer.design'
const SUBMIT_PAGE = `${SITE}/submit`
const SITE_ID = '64fe0870e6e4f3a42a145c1c'
const PAGE_ID = '64fe4211dfdda5f17bdf1f0f'
const ELEMENT_ID = '2ed29eda-4f86-47dc-6e4c-0f90a6b28477'
const SUBMIT_URL = `https://webflow.com/api/v1/form/${SITE_ID}`
const TURNSTILE_SITEKEY = '0x4AAAAAAAQTptj2So4dx43e'

function instagramUrl(handle: string): string {
  const h = handle.trim().replace(/^@/, '')
  if (!h) return 'https://instagram.com'
  if (/^https?:\/\//i.test(h)) return h
  return `https://instagram.com/${h}`
}

function designerLink(payload: SubmitPayload): string {
  if (payload.xAccount?.trim()) {
    const h = payload.xAccount
      .trim()
      .replace(/^@/, '')
      .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '')
    return `https://x.com/${h}`
  }
  return payload.websiteUrl
}

async function solveTurnstileWithCapSolver(apiKey: string): Promise<string> {
  const createRes = await fetch('https://api.capsolver.com/createTask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientKey: apiKey,
      task: {
        type: 'AntiTurnstileTaskProxyLess',
        websiteURL: SUBMIT_PAGE,
        websiteKey: TURNSTILE_SITEKEY,
      },
    }),
  })
  const created = (await createRes.json()) as {
    taskId?: string
    errorDescription?: string
  }
  if (!created.taskId) {
    throw new Error(created.errorDescription || 'CapSolver createTask failed')
  }

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const pollRes = await fetch('https://api.capsolver.com/getTaskResult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientKey: apiKey, taskId: created.taskId }),
    })
    const poll = (await pollRes.json()) as {
      status?: string
      solution?: { token?: string }
      errorDescription?: string
    }
    if (poll.status === 'ready' && poll.solution?.token) return poll.solution.token
    if (poll.status === 'failed') {
      throw new Error(poll.errorDescription || 'CapSolver task failed')
    }
  }
  throw new Error('CapSolver timeout')
}

async function solveTurnstileWith2Captcha(apiKey: string): Promise<string> {
  const createRes = await fetch('https://api.2captcha.com/createTask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientKey: apiKey,
      task: {
        type: 'TurnstileTaskProxyless',
        websiteURL: SUBMIT_PAGE,
        websiteKey: TURNSTILE_SITEKEY,
      },
    }),
  })
  const created = (await createRes.json()) as {
    taskId?: number | string
    errorDescription?: string
    errorId?: number
  }
  if (created.errorId || !created.taskId) {
    throw new Error(created.errorDescription || '2Captcha createTask failed')
  }

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const pollRes = await fetch('https://api.2captcha.com/getTaskResult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientKey: apiKey, taskId: created.taskId }),
    })
    const poll = (await pollRes.json()) as {
      status?: string
      solution?: { token?: string }
      errorDescription?: string
      errorId?: number
    }
    if (poll.status === 'ready' && poll.solution?.token) return poll.solution.token
    if (poll.errorId || poll.status === 'failed') {
      throw new Error(poll.errorDescription || '2Captcha task failed')
    }
  }
  throw new Error('2Captcha timeout')
}

async function getTurnstileToken(): Promise<string> {
  const fromEnv = process.env.FOOTER_TURNSTILE_TOKEN?.trim()
  if (fromEnv) return fromEnv

  const capSolverKey = process.env.CAPSOLVER_API_KEY?.trim()
  if (capSolverKey) return solveTurnstileWithCapSolver(capSolverKey)

  const twoCaptchaKey = process.env.TWO_CAPTCHA_API_KEY?.trim()
  if (twoCaptchaKey) return solveTurnstileWith2Captcha(twoCaptchaKey)

  throw new Error(
    'footer.design requires Cloudflare Turnstile. Set CAPSOLVER_API_KEY or TWO_CAPTCHA_API_KEY.',
  )
}

export async function submitToFooterDesign(
  payload: SubmitPayload,
): Promise<TargetResult> {
  try {
    const token = await getTurnstileToken()

    const fields: Record<string, string> = {
      URL: payload.websiteUrl,
      'Designer Name': payload.designBy || '',
      'Designer Link': designerLink(payload),
      'Submitter Name': payload.fullName,
      'Submitter URL': instagramUrl(payload.instagram),
      'cf-turnstile-response': token,
    }

    const res = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: SITE,
        Referer: SUBMIT_PAGE,
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        name: 'Email Form',
        pageId: PAGE_ID,
        elementId: ELEMENT_ID,
        domain: 'www.footer.design',
        source: SUBMIT_PAGE,
        test: false,
        fields,
        fileUploads: {},
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
          : record.msg || `Unexpected response (${res.status})`,
    }
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Footer.design failed',
    }
  }
}
