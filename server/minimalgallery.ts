import type { SubmitPayload, TargetResult } from './siteofsites'

const SITE = 'https://minimal.gallery'
const SUBMIT_URL = `${SITE}/submit/`

function getHidden(html: string, name: string): string {
  const re = new RegExp(
    `id="${name}"[^>]*value="([^"]*)"|name="${name}"[^>]*value="([^"]*)"`,
  )
  const match = html.match(re)
  const value = match?.[1] || match?.[2]
  if (!value) {
    throw new Error(`Missing ACF field: ${name}`)
  }
  return value
}

async function getFormTokens() {
  const res = await fetch(SUBMIT_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) {
    throw new Error(`Failed to load Minimal Gallery form (${res.status})`)
  }
  const html = await res.text()
  return {
    _acf_screen: getHidden(html, '_acf_screen'),
    _acf_post_id: getHidden(html, '_acf_post_id'),
    _acf_validation: getHidden(html, '_acf_validation'),
    _acf_form: getHidden(html, '_acf_form'),
    _acf_nonce: getHidden(html, '_acf_nonce'),
    _acfe_data: getHidden(html, '_acfe_data'),
  }
}

export async function submitToMinimalGallery(
  payload: SubmitPayload,
): Promise<TargetResult> {
  try {
    const tokens = await getFormTokens()
    const body = new URLSearchParams()

    body.set('_acf_screen', tokens._acf_screen)
    body.set('_acf_post_id', tokens._acf_post_id)
    body.set('_acf_validation', tokens._acf_validation)
    body.set('_acf_form', tokens._acf_form)
    body.set('_acf_nonce', tokens._acf_nonce)
    body.set('_acf_changed', '1')
    body.set('_acfe_data', tokens._acfe_data)
    body.set('acf[_validate_email]', '')

    // Step 1: Website (radio value is "Post")
    body.set('acf[field_661f915dc33dd]', 'Post')

    // Step 2 fields mapped from our form
    body.set('acf[field_636a8d7a98b84]', payload.websiteUrl)
    body.set('acf[field_655e7b3111787]', payload.projectName)
    body.set('acf[field_636a8d904aa51]', payload.fullName)
    body.set('acf[field_636a8d974aa52]', payload.email)
    body.set('acf[field_661f8e3880c8b]', payload.description || '')
    body.set('acf[field_661f8c4480c87]', '')

    const res = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        Origin: SITE,
        Referer: SUBMIT_URL,
      },
      body,
      redirect: 'manual',
    })

    const location = res.headers.get('location') || ''
    const bodyText =
      res.status === 200 || res.status === 400 || res.status === 403
        ? await res.text()
        : ''
    const ok =
      (res.status === 302 && location.includes('submit-thanks')) ||
      (res.status === 200 && bodyText.includes('submit-thanks'))

    return {
      ok,
      status: res.status,
      data: {
        location: location || null,
        preview: bodyText ? bodyText.slice(0, 400) : null,
      },
      error: ok
        ? undefined
        : `Unexpected response (${res.status}${location ? `, ${location}` : ''})`,
    }
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Minimal Gallery failed',
    }
  }
}
