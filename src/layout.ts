import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js'
import type { Edge, Node } from '@xyflow/react'

export type SavedNode = { x: number; y: number; w?: number; h?: number }
export type Saved = { version: 1; viewId: string; nodes: Record<string, SavedNode> }

const isContainer = (n: Node) => n.type === 'container'
const widthOf = (n: Node) => n.width ?? n.measured?.width
const heightOf = (n: Node) => n.height ?? n.measured?.height

export function toSaved(viewId: string, nodes: Node[]): Saved {
  const out: Record<string, SavedNode> = {}
  for (const n of nodes) {
    const pos = { x: Math.round(n.position.x), y: Math.round(n.position.y) }
    out[n.id] = isContainer(n) ? { ...pos, w: Math.round(widthOf(n) ?? 0), h: Math.round(heightOf(n) ?? 0) } : pos
  }
  return { version: 1, viewId, nodes: out }
}

/** Salvo vence; quem não está no salvo fica na posição automática; ids que saíram do modelo são ignorados. */
export function applySaved<T extends Node>(nodes: T[], saved?: Saved | null): T[] {
  if (!saved) return nodes
  return nodes.map(n => {
    const s = saved.nodes[n.id]
    if (!s) return n
    const size = s.w && s.h ? { width: s.w, height: s.h } : {}
    return { ...n, position: { x: s.x, y: s.y }, ...size }
  })
}

export function isSaved(value: unknown): value is Saved {
  const v = value as Saved
  return v?.version === 1 && typeof v.viewId === 'string' && typeof v.nodes === 'object' && v.nodes !== null
}

export type Preset = 'layered' | 'grid'
export const PRESETS: Record<Preset, string> = { layered: 'Camadas →', grid: 'Grade' }

const OPTIONS: Record<Preset, Record<string, string>> = {
  layered: {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    'elk.layered.spacing.nodeNodeBetweenLayers': '90',
    'elk.spacing.nodeNode': '40',
  },
  grid: { 'elk.algorithm': 'rectpacking', 'elk.spacing.nodeNode': '40' },
}
// espaço para o título do container
const PADDING = '[top=56,left=24,bottom=24,right=24]'
const elk = new ELK()

/** columns: ids de nós raiz na ordem esquerda → direita (os grupos da view, como no .c4). */
export async function autoLayout<T extends Node>(nodes: T[], edges: Edge[], preset: Preset, columns: string[] = []): Promise<T[]> {
  const parentOf = new Map(nodes.map(n => [n.id, n.parentId]))
  const isAncestor = (a: string, b: string): boolean => {
    for (let p = parentOf.get(b); p; p = parentOf.get(p)) if (p === a) return true
    return false
  }

  const elkNodes = new Map<string, ElkNode>(
    nodes.map(n => [n.id, { id: n.id, children: [], layoutOptions: { ...OPTIONS[preset], 'elk.padding': PADDING } }]),
  )
  const roots: ElkNode[] = []
  for (const n of nodes) {
    const e = elkNodes.get(n.id)!
    // container: o ELK calcula o tamanho pelos filhos
    if (!isContainer(n)) Object.assign(e, { width: widthOf(n) ?? 240, height: heightOf(n) ?? 90 })
    const column = columns.indexOf(n.id)
    if (column >= 0) e.layoutOptions!['elk.partitioning.partition'] = String(column)
    const parent = n.parentId ? elkNodes.get(n.parentId) : undefined
    ;(parent ? parent.children! : roots).push(e)
  }

  const layoutEdges = preset === 'layered'
    ? edges.filter(e => !isAncestor(e.source, e.target) && !isAncestor(e.target, e.source))
    : []
  const graph: ElkNode = {
    id: '__root',
    layoutOptions: { ...OPTIONS[preset], 'elk.partitioning.activate': String(columns.length > 0) },
    children: roots,
    edges: layoutEdges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  }
  const result = await elk.layout(graph)

  const placed = new Map<string, ElkNode>()
  const walk = (list: ElkNode[] = []) => list.forEach(n => (placed.set(n.id, n), walk(n.children)))
  walk(result.children)

  return nodes.map(n => {
    const r = placed.get(n.id)!
    const size = isContainer(n) ? { width: r.width, height: r.height } : {}
    return { ...n, position: { x: r.x ?? 0, y: r.y ?? 0 }, ...size }
  })
}
