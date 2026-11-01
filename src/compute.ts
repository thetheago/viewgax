// Doc + visão → nós e setas do xyflow. Posições salvas vêm de view.positions.
import type { Edge, Node } from '@xyflow/react'
import type { Doc, Element, View } from './doc'

export const CARD_W = 240

export type NodeData = { title: string; color?: string; icon?: string; technology?: string; description?: string; detail?: string; group: boolean }
export type EdgeData = { color: string; line: string; label?: string; relations: string[]; step?: number; notes?: string; active?: boolean }

// kinds de relação do modelo → estilo da seta
const EDGE_STYLE: Record<string, { color: string; line: string }> = {
  http: { color: 'primary', line: 'solid' },
  async: { color: 'amber', line: 'dashed' },
  db: { color: 'gray', line: 'dotted' },
}
const styleOf = (kind?: string) => EDGE_STYLE[kind ?? ''] ?? { color: 'gray', line: 'solid' }

/** Elementos que aparecem: os da visão e, no fluxo, as pontas dos passos. */
export function shownIds(view: View): Set<string> {
  const ids = new Set(view.elements)
  if (view.type === 'flow') for (const s of view.steps) ids.add(s.source).add(s.target)
  return ids
}

/** O elemento e todos os seus pais: num passo novo, cada card aparece dentro do sistema dono. */
export function withAncestors(doc: Doc, id: string): string[] {
  const out: string[] = []
  for (let p: string | undefined = id; p; p = doc.elements.find(e => e.id === p)?.parent) out.push(p)
  return out
}

export function computeView(doc: Doc, view: View): { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] } {
  const byId = new Map(doc.elements.map(e => [e.id, e]))
  const shown = shownIds(view)
  for (const id of shown) if (!byId.has(id)) shown.delete(id)

  // pai visível mais próximo: elemento visível acima, senão o grupo da visão
  const groupOf = new Map<string, string>()
  if (view.type === 'view') for (const g of view.groups) for (const id of g.elements) groupOf.set(id, g.id)
  const visibleAncestor = (id: string) => {
    for (let p = byId.get(id)?.parent; p; p = byId.get(p)?.parent) if (shown.has(p)) return p
    return undefined
  }
  const parentOf = new Map<string, string | undefined>()
  for (const id of shown) parentOf.set(id, visibleAncestor(id) ?? groupOf.get(id))

  const groups = view.type === 'view' ? view.groups : []
  const hasChildren = new Set([...parentOf.values()].filter(Boolean))
  const depth = (id: string): number => (parentOf.get(id) ? 1 + depth(parentOf.get(id)!) : 0)

  const groupNodes: Node<NodeData>[] = groups.map(g => ({
    id: g.id, type: 'container', position: { x: 0, y: 0 }, width: 400, height: 300,
    data: { title: g.title, group: true },
  }))
  const elementNodes = [...shown]
    .sort((a, b) => depth(a) - depth(b)) // xyflow exige o pai antes do filho
    .map((id): Node<NodeData> => {
      const e = byId.get(id) as Element
      const container = hasChildren.has(id)
      const data = { title: e.title, color: e.color, icon: e.icon, technology: e.technology, description: e.description, detail: e.detail, group: false }
      return {
        id, type: container ? 'container' : 'card', parentId: parentOf.get(id), expandParent: true,
        position: { x: 0, y: 0 }, ...(container ? { width: 400, height: 300 } : {}), data,
      }
    })

  const nodes = [...groupNodes, ...elementNodes].map(n => {
    const p = view.positions[n.id]
    if (!p || p.p !== n.parentId) return n
    return { ...n, position: { x: p.x, y: p.y }, ...(p.w && p.h && n.type === 'container' ? { width: p.w, height: p.h } : {}) }
  })

  return { nodes, edges: view.type === 'flow' ? flowEdges(view.steps, shown) : relationEdges(doc, shown, byId) }
}

function flowEdges(steps: { id: string; source: string; target: string; title: string; notes?: string }[], shown: Set<string>): Edge<EdgeData>[] {
  return steps
    .filter(s => shown.has(s.source) && shown.has(s.target))
    .map((s, i) => ({
      id: s.id, source: s.source, target: s.target, type: 'floating',
      data: { color: 'gray', line: 'dashed', label: s.title, notes: s.notes, relations: [], step: i + 1 },
    }))
}

// relação entre elementos escondidos sobe para o ancestral visível; várias no mesmo par viram uma seta
function relationEdges(doc: Doc, shown: Set<string>, byId: Map<string, Element>): Edge<EdgeData>[] {
  const nearest = (id: string) => {
    for (let p: string | undefined = id; p; p = byId.get(p)?.parent) if (shown.has(p)) return p
    return undefined
  }
  const isAncestor = (a: string, b: string) => {
    for (let p = byId.get(b)?.parent; p; p = byId.get(p)?.parent) if (p === a) return true
    return false
  }
  const byPair = new Map<string, Edge<EdgeData>>()
  for (const r of doc.relations) {
    const source = nearest(r.source)
    const target = nearest(r.target)
    if (!source || !target || source === target || isAncestor(source, target) || isAncestor(target, source)) continue
    const id = `${source}->${target}`
    const edge = byPair.get(id)
    if (edge) {
      edge.data!.relations.push(r.id)
      edge.data!.label = `${edge.data!.relations.length} relações`
      continue
    }
    byPair.set(id, { id, source, target, type: 'floating', data: { ...styleOf(r.kind), label: r.title, relations: [r.id] } })
  }
  return [...byPair.values()]
}
