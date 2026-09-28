import type { IncomingMessage } from 'node:http'

export type MultipartFile = {
  filename: string
  mime: string
  buffer: Buffer
}

export type MultipartResult = {
  fields: Record<string, string>
  files: Record<string, MultipartFile>
  /** All file parts for a field name (supports multiple attachments) */
  fileLists: Record<string, MultipartFile[]>
}

async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

function headerValue(headers: string, name: string): string | undefined {
  const re = new RegExp(`${name}="([^"]*)"|${name}=([^;\\s]+)`, 'i')
  const m = headers.match(re)
  return m?.[1] ?? m?.[2]
}

/**
 * Minimal multipart/form-data parser for our submit endpoint.
 */
export async function parseMultipart(
  req: IncomingMessage,
): Promise<MultipartResult> {
  const contentType = req.headers['content-type'] || ''
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2]
  if (!boundary) {
    throw new Error('Missing multipart boundary')
  }

  const body = await readRawBody(req)
  const delim = Buffer.from(`--${boundary}`)
  const fields: Record<string, string> = {}
  const files: Record<string, MultipartFile> = {}
  const fileLists: Record<string, MultipartFile[]> = {}

  let start = body.indexOf(delim)
  while (start !== -1) {
    const afterDelim = start + delim.length
    if (body[afterDelim] === 0x2d && body[afterDelim + 1] === 0x2d) break

    let partStart = afterDelim
    if (body[partStart] === 0x0d && body[partStart + 1] === 0x0a) partStart += 2

    const next = body.indexOf(delim, partStart)
    if (next === -1) break

    let partEnd = next
    if (body[partEnd - 2] === 0x0d && body[partEnd - 1] === 0x0a) partEnd -= 2

    const part = body.subarray(partStart, partEnd)
    const headerEnd = part.indexOf('\r\n\r\n')
    if (headerEnd === -1) {
      start = next
      continue
    }

    const headers = part.subarray(0, headerEnd).toString('utf8')
    const content = part.subarray(headerEnd + 4)
    const rawName = headerValue(headers, 'name')
    if (!rawName) {
      start = next
      continue
    }
    const name = rawName.replace(/\[\]$/, '')

    const filename = headerValue(headers, 'filename')
    if (filename !== undefined) {
      const mimeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i)
      const file: MultipartFile = {
        filename: filename || 'upload.bin',
        mime: mimeMatch?.[1]?.trim() || 'application/octet-stream',
        buffer: Buffer.from(content),
      }
      files[name] = file
      if (!fileLists[name]) fileLists[name] = []
      fileLists[name].push(file)
    } else {
      fields[name] = content.toString('utf8')
    }

    start = next
  }

  return { fields, files, fileLists }
}

export async function readJsonBody(req: IncomingMessage): Promise<string> {
  const buf = await readRawBody(req)
  return buf.toString('utf8')
}
