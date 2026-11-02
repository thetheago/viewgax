import type { IncomingMessage } from 'node:http'
import type { Connect, Plugin } from 'vite'
import { Conflict, InvalidDoc, loadDoc, MAX_BYTES, saveDoc, versionOf } from './docStore.ts'

const FILE = process.env.DATA_FILE ?? 'storage/fortime.json'
const SEED = 'data/fortime.json'

class TooLarge extends Error {}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BYTES) throw new TooLarge()
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** GET/PUT /api/doc */
const handler: Connect.NextHandleFunction = async (req, res, next) => {
  if (req.url?.split('?')[0] !== '/api/doc') return next()
  try {
    if (req.method === 'GET') {
      const text = await loadDoc(FILE, SEED)
      res.setHeader('content-type', 'application/json')
      res.setHeader('etag', versionOf(text))
      res.end(text)
      return
    }
    if (req.method === 'PUT') {
      res.setHeader('etag', await saveDoc(FILE, await readBody(req), req.headers['if-match']))
      res.statusCode = 204
      res.end()
      return
    }
    res.statusCode = 405
    res.end()
  } catch (err) {
    res.statusCode = err instanceof InvalidDoc ? 400 : err instanceof TooLarge ? 413 : err instanceof Conflict ? 409 : 500
    if (res.statusCode === 500) console.error('[viewgax] falha no /api/doc', err)
    res.end(err instanceof Error ? err.message : 'erro')
  }
}

export const docApi = (): Plugin => ({
  name: 'viewgax-doc-api',
  configureServer: server => void server.middlewares.use(handler),
  configurePreviewServer: server => void server.middlewares.use(handler),
})
