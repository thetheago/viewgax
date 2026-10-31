import { describe, expect, it } from 'vitest'
import type { Edge, Node } from '@xyflow/react'
import { applySaved, autoLayout, isSaved, toSaved } from './layout'

const nodes: Node[] = [
  { id: 'sys', type: 'container', position: { x: 0, y: 0 }, width: 500, height: 300, data: {} },
  { id: 'sys.a', type: 'card', parentId: 'sys', position: { x: 10, y: 60 }, measured: { width: 240, height: 90 }, data: {} },
  { id: 'sys.b', type: 'card', parentId: 'sys', position: { x: 10, y: 200 }, measured: { width: 240, height: 90 }, data: {} },
  { id: 'ext', type: 'card', position: { x: 700, y: 0 }, measured: { width: 240, height: 90 }, data: {} },
]
const edges: Edge[] = [
  { id: 'e1', source: 'sys.a', target: 'sys.b' },
  { id: 'e2', source: 'sys.b', target: 'ext' },
  { id: 'e3', source: 'sys', target: 'sys.a' }, // pai → filho: o ELK não aceita, deve ser ignorada
]

describe('applySaved', () => {
  it('salvo vence, novo mantém a posição automática, removido é ignorado', () => {
    const saved = toSaved('v', nodes)
    saved.nodes['sys.a'] = { x: 99, y: 77 }
    delete saved.nodes['ext']
    saved.nodes['sumiu'] = { x: 1, y: 1 }
    const out = applySaved(nodes, saved)
    expect(out.find(n => n.id === 'sys.a')!.position).toEqual({ x: 99, y: 77 })
    expect(out.find(n => n.id === 'ext')!.position).toEqual({ x: 700, y: 0 })
    expect(out.map(n => n.id)).toEqual(nodes.map(n => n.id))
    expect(out[0]).toMatchObject({ width: 500, height: 300 })
  })

  it('valida o arquivo importado', () => {
    expect(isSaved(toSaved('v', nodes))).toBe(true)
    expect(isSaved({ nodes: {} })).toBe(false)
    expect(isSaved(null)).toBe(false)
  })
})

describe.each(['layered', 'grid'] as const)('autoLayout %s', preset => {
  it('filhos cabem dentro do container', async () => {
    const out = await autoLayout(nodes, edges, preset)
    const sys = out[0]
    for (const child of out.filter(n => n.parentId === 'sys')) {
      expect(child.position.x).toBeGreaterThanOrEqual(0)
      expect(child.position.y).toBeGreaterThanOrEqual(56)
      expect(child.position.x + 240).toBeLessThanOrEqual(sys.width!)
      expect(child.position.y + 90).toBeLessThanOrEqual(sys.height!)
    }
  })
})

it('layered respeita a ordem das colunas (grupos)', async () => {
  const flat: Node[] = ['a', 'b', 'c'].map(id => ({ id, type: 'card', position: { x: 0, y: 0 }, data: {} }))
  // c → a puxaria c para a esquerda; a coluna força a, b, c
  const out = await autoLayout(flat, [{ id: 'e', source: 'c', target: 'a' }], 'layered', ['a', 'b', 'c'])
  const x = (id: string) => out.find(n => n.id === id)!.position.x
  expect(x('a')).toBeLessThan(x('b'))
  expect(x('b')).toBeLessThan(x('c'))
})
