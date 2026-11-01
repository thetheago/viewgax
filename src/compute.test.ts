import { describe, expect, it } from 'vitest'
import { computeView, withAncestors } from './compute'
import { deleteElement, type Doc } from './doc'

const doc = (): Doc => ({
  version: 1,
  elements: [
    { id: 'pr', title: 'punch_register', kind: 'system' },
    { id: 'pr.api', parent: 'pr', title: 'API', kind: 'service' },
    { id: 'pr.consumer', parent: 'pr', title: 'Consumer', kind: 'worker' },
    { id: 'rabbit', title: 'RabbitMQ', kind: 'broker' },
    { id: 'user', title: 'Colaborador', kind: 'actor' },
  ],
  relations: [
    { id: 'r1', source: 'user', target: 'pr.api', kind: 'http', title: 'POST' },
    { id: 'r2', source: 'pr.api', target: 'rabbit', kind: 'async' },
    { id: 'r3', source: 'pr.consumer', target: 'rabbit', kind: 'async' },
    { id: 'r4', source: 'pr', target: 'pr.api' },
  ],
  views: [
    { id: 'v', type: 'view', title: 'V', elements: ['user', 'pr', 'rabbit'], positions: { user: { x: 5, y: 6 } }, groups: [{ id: 'g1', title: 'Pessoas', elements: ['user'] }] },
    { id: 'f', type: 'flow', title: 'F', elements: [], positions: {}, steps: [{ id: 's1', source: 'user', target: 'pr.api', title: 'bate' }] },
  ],
})

describe('computeView', () => {
  it('sobe relações de filhos escondidos e agrega no mesmo par', () => {
    const { nodes, edges } = computeView(doc(), doc().views[0])
    expect(nodes.map(n => n.id).sort()).toEqual(['g1', 'pr', 'rabbit', 'user'])
    // salvo como raiz, mas agora está no grupo g1: posição descartada
    expect(nodes.find(n => n.id === 'user')).toMatchObject({ parentId: 'g1', position: { x: 0, y: 0 } })
    const toRabbit = edges.find(e => e.id === 'pr->rabbit')!
    expect(toRabbit.data!.relations).toEqual(['r2', 'r3'])
    expect(edges.map(e => e.id).sort()).toEqual(['pr->rabbit', 'user->pr'])
  })

  it('aninha o filho visível no pai e ignora relação pai → filho', () => {
    const d = doc()
    d.views[0].elements.push('pr.api')
    const { nodes, edges } = computeView(d, d.views[0])
    expect(nodes.find(n => n.id === 'pr')!.type).toBe('container')
    expect(nodes.find(n => n.id === 'pr.api')!.parentId).toBe('pr')
    expect(edges.some(e => e.source === 'pr' && e.target === 'pr.api')).toBe(false)
  })

  it('fluxo mostra as pontas dos passos; pai só se estiver na visão', () => {
    const d = doc()
    expect(computeView(d, d.views[1]).nodes.map(n => n.id).sort()).toEqual(['pr.api', 'user'])
    d.views[1].elements.push(...withAncestors(d, 'pr.api'))
    const { nodes, edges } = computeView(d, d.views[1])
    expect(nodes.map(n => n.id).sort()).toEqual(['pr', 'pr.api', 'user'])
    expect(nodes.find(n => n.id === 'pr.api')!.parentId).toBe('pr')
    expect(edges[0]).toMatchObject({ id: 's1', data: { step: 1, label: 'bate' } })
  })
})

it('deleteElement limpa relações, visões e passos e sobe os filhos', () => {
  const d = doc()
  deleteElement(d, 'pr')
  expect(d.elements.find(e => e.id === 'pr.api')!.parent).toBeUndefined()
  expect(d.relations.map(r => r.id)).toEqual(['r1', 'r2', 'r3'])
  expect(d.views[0].elements).toEqual(['user', 'rabbit'])
  deleteElement(d, 'user')
  expect(d.views[1].type === 'flow' && d.views[1].steps).toEqual([])
  expect(d.views[0].type === 'view' && d.views[0].groups[0].elements).toEqual([])
})
