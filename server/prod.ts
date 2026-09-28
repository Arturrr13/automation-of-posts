import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'
import { handleSubmitApi } from './submit-api'

const PORT = Number(process.env.PORT || 3000)
const DIST = join(process.cwd(), 'dist')

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

function safeJoin(root: string, requestPath: string): string | null {
  const cleaned = normalize(requestPath).replace(/^(\.\.[/\\])+/, '')
  const full = join(root, cleaned)
  if (!full.startsWith(root)) return null
  return full
}

async function sendFile(
  res: import('node:http').ServerResponse,
  filePath: string,
) {
  const data = await readFile(filePath)
  const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream'
  res.statusCode = 200
  res.setHeader('Content-Type', type)
  res.end(data)
}

createServer(async (req, res) => {
  try {
    const host = req.headers.host || 'localhost'
    const url = new URL(req.url || '/', `http://${host}`)

    if (url.pathname === '/api/submit') {
      await handleSubmitApi(req, res)
      return
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405
      res.end('Method not allowed')
      return
    }

    const requestPath =
      url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)
    const filePath = safeJoin(DIST, requestPath)

    if (!filePath) {
      res.statusCode = 400
      res.end('Bad request')
      return
    }

    try {
      const info = await stat(filePath)
      if (info.isFile()) {
        await sendFile(res, filePath)
        return
      }
    } catch {
      /* fall through to index.html */
    }

    await sendFile(res, join(DIST, 'index.html'))
  } catch (error) {
    console.error('[server]', error)
    if (!res.headersSent) {
      res.statusCode = 500
      res.end('Internal server error')
    }
  }
}).listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`)
})
