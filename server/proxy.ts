import type { Plugin } from 'vite'
import { handleSubmitApi } from './submit-api'

export function submitProxyPlugin(): Plugin {
  return {
    name: 'submit-proxy',
    configureServer(server) {
      server.middlewares.use('/api/submit', async (req, res, next) => {
        if (req.method !== 'POST' && req.method !== 'OPTIONS') {
          next()
          return
        }
        await handleSubmitApi(req, res)
      })
    },
  }
}
