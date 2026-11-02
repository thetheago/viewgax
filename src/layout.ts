import type { ElkNode } from 'elkjs/lib/elk.bundled.js'
import type { Edge, Node } from '@xyflow/react'
import type { Position } from './doc'

const isContainer = (n: Node) => n.type === 'container'
const widthOf = (n: Node) => n.width ?? n.measured?.width
const heightOf = (n: Node) => n.height ?? n.measured?.height

export function toPositions(nodes: Node[]): Record<string, Position> {
  const out: Record<string, Position> = {}
  for (const n of nodes) {
    const pos = { x: Math.round(n.position.x), y: Math.round(n.position.y), ...(n.parentId ? { p: n.parentId } : {}) }
    out[n.id] = isContainer(n) ? { ...pos, w: Math.round(widthOf(n) ?? 0), h: Math.round(heightOf(n) ?? 0) } : pos
  }
  return out
}

/** Posição salva só vale se o card continua no mesmo pai. */
export const hasValidPosition = (saved: Record<string, Position>, n: Node) =>
  saved[n.id] !== undefined && saved[n.id].p === n.parentId

/** Quem não tem posição salva recebe a do ELK; os salvos ficam onde estão. */
export async function fillMissing<T extends Node>(nodes: T[], edges: Edge[], saved: Record<string, Position>, columns: string[]): Promise<T[]> {
  const valid = (n: Node) => hasValidPosition(saved, n)
  if (nodes.every(valid)) return nodes
  const auto = new Map((await autoLayout(nodes, edges, 'layered', columns)).map(n => [n.id, n]))
  return nodes.map(n => (valid(n) ? n : auto.get(n.id)!))
}

export type Preset = 'layered' | 'down' | 'tree' | 'radial' | 'grid'
export const PRESETS: Record<Preset, string> = {
  layered: 'Camadas →', down: 'Camadas ↓', tree: 'Árvore', radial: 'Radial', grid: 'Grade',
}

const LAYERED = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.layered.spacing.nodeNodeBetweenLayers': '90',
  'elk.spacing.nodeNode': '40',
}
const OPTIONS: Record<Preset, Record<string, string>> = {
  layered: LAYERED,
  down: { ...LAYERED, 'elk.direction': 'DOWN' },
  tree: { 'elk.algorithm': 'mrtree', 'elk.direction': 'RIGHT', 'elk.spacing.nodeNode': '50' },
  radial: { 'elk.algorithm': 'radial', 'elk.spacing.nodeNode': '60' },
  grid: { 'elk.algorithm': 'rectpacking', 'elk.spacing.nodeNode': '40' },
}
// só o layered entende arestas entre níveis; os outros recebem as arestas subidas para os nós raiz
const isLayered = (p: Preset) => p === 'layered' || p === 'down'

/** Árvore e radial travam com ciclo (estouro de pilha no ELK): fica só uma floresta das arestas. */
export function spanningForest(pairs: string[][]): string[][] {
  const root = new Map<string, string>()
  const find = (x: string): string => {
    const p = root.get(x) ?? x
    return p === x ? x : find(p)
  }
  return pairs.filter(([a, b]) => {
    const [ra, rb] = [find(a), find(b)]
    if (ra === rb) return false
    root.set(rb, ra)
    return true
  })
}
// espaço para o título do container
const PADDING = '[top=56,left=24,bottom=24,right=24]'

/** columns: ids de nós raiz na ordem esquerda → direita (os grupos da view, como no .c4). */
export async function autoLayout<T extends Node>(nodes: T[], edges: Edge[], preset: Preset, columns: string[] = []): Promise<T[]> {
  const parentOf = new Map(nodes.map(n => [n.id, n.parentId]))
  const isAncestor = (a: string, b: string): boolean => {
    for (let p = parentOf.get(b); p; p = parentOf.get(p)) if (p === a) return true
    return false
  }

  const elkNodes = new Map<string, ElkNode>(
    // árvore e radial só fazem sentido entre os nós raiz; dentro de um container os filhos viram grade
    nodes.map(n => [n.id, { id: n.id, children: [], layoutOptions: { ...(isLayered(preset) ? OPTIONS[preset] : OPTIONS.grid), 'elk.padding': PADDING } }]),
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

  const rootOf = (id: string) => {
    let r = id
    for (let p = parentOf.get(r); p; p = parentOf.get(p)) r = p
    return r
  }
  const rootPairs = [...new Set(edges.map(e => `${rootOf(e.source)}\n${rootOf(e.target)}`))]
    .map(k => k.split('\n'))
    .filter(([a, b]) => a !== b)
  const layoutEdges = preset === 'grid' ? []
    : isLayered(preset)
      ? edges.filter(e => !isAncestor(e.source, e.target) && !isAncestor(e.target, e.source)).map(e => [e.source, e.target])
      : preset === 'tree' || preset === 'radial' ? spanningForest(rootPairs) : rootPairs
  const graph: ElkNode = {
    id: '__root',
    layoutOptions: { ...OPTIONS[preset], 'elk.partitioning.activate': String(isLayered(preset) && columns.length > 0) },
    children: roots,
    edges: layoutEdges.map(([source, target], i) => ({ id: `e${i}`, sources: [source], targets: [target] })),
  }
  // ELK pesa 1,6 MB: só baixa quando algum layout é calculado
  const { default: ELK } = await import('elkjs/lib/elk.bundled.js')
  const result = await new ELK().layout(graph)

  const placed = new Map<string, ElkNode>()
  const walk = (list: ElkNode[] = []) => list.forEach(n => (placed.set(n.id, n), walk(n.children)))
  walk(result.children)

  return nodes.map(n => {
    const r = placed.get(n.id)!
    const size = isContainer(n) ? { width: r.width, height: r.height } : {}
    return { ...n, position: { x: r.x ?? 0, y: r.y ?? 0 }, ...size }
  })
}
