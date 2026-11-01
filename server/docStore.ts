// Persistência do documento num arquivo JSON (montável como volume no container).
import { access, copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
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

export class InvalidDoc extends Error {}

/** Valida e grava atomicamente (tmp + rename): queda no meio da escrita não corrompe o arquivo. */
export async function saveDoc(file: string, body: string) {
  let doc: unknown
  try {
    doc = JSON.parse(body)
  } catch {
    throw new InvalidDoc('JSON inválido')
  }
  if (!isDoc(doc)) throw new InvalidDoc('não é um documento do viewgax')
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  await writeFile(tmp, JSON.stringify(doc, null, 2) + '\n')
  await rename(tmp, file)
}
