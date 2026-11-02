import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Conflict, InvalidDoc, loadDoc, saveDoc, versionOf } from './docStore.ts'

const valid = JSON.stringify({ version: 1, elements: [], relations: [], views: [] })

describe('docStore', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'viewgax-'))
  const seed = join(dir, 'seed.json')
  const file = join(dir, 'storage', 'fortime.json')
  await writeFile(seed, valid)

  it('primeira leitura copia a semente', async () => {
    expect(JSON.parse(await loadDoc(file, seed))).toEqual(JSON.parse(valid))
  })

  it('grava documento válido', async () => {
    const doc = { version: 1, elements: [{ id: 'a', title: 'A', kind: 'system' }], relations: [], views: [] }
    await saveDoc(file, JSON.stringify(doc))
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(doc)
  })

  it('recusa JSON quebrado ou fora do formato sem tocar no arquivo', async () => {
    const before = await readFile(file, 'utf8')
    await expect(saveDoc(file, '{oops')).rejects.toBeInstanceOf(InvalidDoc)
    await expect(saveDoc(file, '{"version":2}')).rejects.toBeInstanceOf(InvalidDoc)
    expect(await readFile(file, 'utf8')).toBe(before)
  })

  it('recusa gravar sobre versão que outra pessoa já mudou', async () => {
    const read = versionOf(await readFile(file, 'utf8'))
    const next = await saveDoc(file, valid, read)
    await expect(saveDoc(file, valid, read)).rejects.toBeInstanceOf(Conflict)
    await expect(saveDoc(file, valid, next)).resolves.toBe(next)
  })
})
