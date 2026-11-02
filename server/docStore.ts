// Persistência do documento num arquivo JSON (montável como volume no container).
import { access, copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname } from 'node:path'
import { isDoc } from '../src/doc.ts'

export const MAX_BYTES = 10 * 1024 * 1024

/** Lê o arquivo; na primeira vez copia a semente versionada no repo. */
export async function loadDoc(file: string, seed: string): Promise<string> {
  try {
    await access(file)
  } catch {
    await mkdir(dirname(file), { recursive: true })
    await copyFile(seed, file)
  }
  return readFile(file, 'utf8')
}

/** Versão do conteúdo; o cliente devolve no If-Match para não sobrescrever a edição de outra pessoa. */
export const versionOf = (text: string) => `"${createHash('sha1').update(text).digest('hex')}"`

export class InvalidDoc extends Error {}
export class Conflict extends Error {}

// uma gravação por vez: a checagem de versão e a escrita não podem se intercalar
let queue: Promise<unknown> = Promise.resolve()

/** Grava se `expected` (versão lida pelo cliente) ainda é a atual; devolve a nova versão. */
export function saveDoc(file: string, body: string, expected?: string): Promise<string> {
  const run = queue.then(() => write(file, body, expected))
  queue = run.catch(() => {})
  return run
}

/** Valida e grava atomicamente (tmp + rename): queda no meio da escrita não corrompe o arquivo. */
async function write(file: string, body: string, expected?: string) {
  let doc: unknown
  try {
    doc = JSON.parse(body)
  } catch {
    throw new InvalidDoc('JSON inválido')
  }
  if (!isDoc(doc)) throw new InvalidDoc('não é um documento do viewgax')
  if (expected && expected !== versionOf(await readFile(file, 'utf8').catch(() => ''))) throw new Conflict('outra pessoa salvou antes')
  await mkdir(dirname(file), { recursive: true })
  const text = JSON.stringify(doc, null, 2) + '\n'
  const tmp = `${file}.tmp`
  await writeFile(tmp, text)
  await rename(tmp, file)
  return versionOf(text)
}
