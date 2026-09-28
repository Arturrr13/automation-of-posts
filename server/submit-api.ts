import type { IncomingMessage, ServerResponse } from 'node:http'
import { submitToSiteOfSites, type SubmitPayload } from './siteofsites'
import { submitToMinimalGallery } from './minimalgallery'
import { submitToOnePageLove } from './onepagelove'
import { submitToCraftwork } from './craftwork'
import { submitToOgImageGallery } from './ogimage'
// Disabled until CAPSOLVER_API_KEY is set (Cloudflare Turnstile)
// import { submitToFooterDesign } from './footer'
// Disabled: details.so is passwordless (magic link) — no stable ongoing auth
// import { submitToDetailsSo } from './details'
import { submitToS5Style, type S5CoverImage } from './s5style'
import { sendEmailMessage, type EmailAttachment } from './email'
import { parseMultipart, readJsonBody } from './multipart'

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function readSubmitRequest(req: IncomingMessage): Promise<{
  payload: SubmitPayload
  coverImage?: S5CoverImage
  emailAttachments: EmailAttachment[]
}> {
  const contentType = req.headers['content-type'] || ''

  if (contentType.includes('multipart/form-data')) {
    const { fields, files, fileLists } = await parseMultipart(req)
    const raw = fields.payload || fields.data || '{}'
    const payload = JSON.parse(raw) as SubmitPayload
    const file = files.thumbnail || files.cover_image || files.coverImage
    const coverImage = file
      ? {
          buffer: file.buffer,
          filename: file.filename,
          mime: file.mime,
        }
      : undefined

    const emailAttachments =
      fileLists.emailAttachment ||
      fileLists.emailAttachments ||
      fileLists.attachment ||
      []

    return { payload, coverImage, emailAttachments }
  }

  const payload = JSON.parse(await readJsonBody(req)) as SubmitPayload
  return { payload, emailAttachments: [] }
}

/** Shared handler for Vite middleware and production Node server */
export async function handleSubmitApi(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const { payload, coverImage, emailAttachments } =
      await readSubmitRequest(req)

    if (!payload.terms) {
      sendJson(res, 400, { ok: false, error: 'Terms must be accepted' })
      return
    }

    if (!payload.style?.length) {
      sendJson(res, 400, { ok: false, error: 'Select at least one Style' })
      return
    }

    const [
      siteOfSites,
      minimalGallery,
      onePageLove,
      craftwork,
      ogImage,
      s5Style,
      email,
    ] = await Promise.all([
      submitToSiteOfSites(payload),
      submitToMinimalGallery(payload),
      submitToOnePageLove(payload),
      submitToCraftwork(payload),
      submitToOgImageGallery(payload),
      // submitToDetailsSo(payload),
      submitToS5Style(payload, coverImage),
      sendEmailMessage(payload, emailAttachments),
      // submitToFooterDesign(payload),
    ])

    const results = {
      siteOfSites,
      minimalGallery,
      onePageLove,
      craftwork,
      ogImage,
      // detailsSo,
      s5Style,
      email,
      // footerDesign,
    }

    const resultsArray = Object.entries(results).map(([site, result]) => ({
      site,
      ok: result.ok,
      status: result.status,
      error: result.error ?? null,
    }))
    console.log('[submit] results', resultsArray)

    const ok = Object.values(results).every((r) => r.ok)
    sendJson(res, 200, {
      ok,
      results,
      resultsArray,
    })
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Submit failed',
    })
  }
}
