import { defineConfig, loadEnv } from 'vite'
import { submitProxyPlugin } from './server/proxy'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value
  }

  return {
    server: {
      port: 3000,
      host: true,
    },
    plugins: [submitProxyPlugin()],
  }
})
