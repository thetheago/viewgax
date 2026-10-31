// Único ponto que conhece o formato de dados do LikeC4 (versão fixada no package.json).
import { useSyncExternalStore } from 'react'
import { $likec4data } from 'likec4:single-project'
import type { Edge, Node } from '@xyflow/react'

export type Text = { txt?: string; md?: string } | null | undefined
export type Metadata = Record<string, string | string[]>

export type ViewNode = {
  id: string
  parent: string | null
  level: number
  children: string[]
  title: string
  kind: string
  color: string
  icon?: string | null
  technology?: string | null
  description?: Text
  modelRef?: string
  x: number
  y: number
  width: number
  height: number
}
export type ViewEdge = {
  id: string
  source: string
  target: string
  label?: string | null
  color: string
  line: string
  relations: string[]
}
export type View = {
  id: string
  _type: string
  title: string | null
  hash: string
  nodes: ViewNode[]
  edges: ViewEdge[]
}
export type Relation = {
  id: string
  title?: string
  kind?: string
  technology?: string
  description?: Text
  metadata?: Metadata
  tags?: string[]
}
export type Element = {
  id: string
  title: string
  kind: string
  technology?: string
  description?: Text
  metadata?: Metadata
  tags?: string[]
}
export type Data = {
  views: Record<string, View>
  relations: Record<string, Relation>
  elements: Record<string, Element>
}

export type CardData = { node: ViewNode }
export type EdgeData = { edge: ViewEdge; step?: number }

const get = () => $likec4data.get() as unknown as Data
const listen = (cb: () => void) => $likec4data.listen(cb)
/** Modelo atualizado ao editar o .c4 com o dev rodando. */
export const useData = () => useSyncExternalStore(listen, get)

export const textOf = (t: Text) => t?.txt ?? t?.md ?? ''
export const isDynamic = (view: View) => view._type === 'dynamic'

export const CARD_W = 240
const CARD_H = 90

export function toFlow(view: View): { nodes: Node<CardData>[]; edges: Edge<EdgeData>[] } {
  const byId = new Map(view.nodes.map(n => [n.id, n]))
  // xyflow exige o pai antes do filho no array
  const sorted = [...view.nodes].sort((a, b) => a.level - b.level)

  const nodes = sorted.map((n): Node<CardData> => {
    const parent = n.parent ? byId.get(n.parent) : undefined
    const px = parent?.x ?? 0
    const py = parent?.y ?? 0
    const base = { id: n.id, parentId: n.parent ?? undefined, expandParent: true, data: { node: n } }
    if (n.children.length > 0) {
      return { ...base, type: 'container', position: { x: n.x - px, y: n.y - py }, width: n.width, height: n.height }
    }
    // posição do LikeC4 (Graphviz), centralizando nosso card menor no espaço dele
    const position = { x: n.x - px + (n.width - CARD_W) / 2, y: n.y - py + (n.height - CARD_H) / 2 }
    return { ...base, type: 'card', position }
  })

  const edges = view.edges
    .filter(e => byId.has(e.source) && byId.has(e.target))
    .map((e, i): Edge<EdgeData> => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'floating',
      data: { edge: e, step: isDynamic(view) ? i + 1 : undefined },
    }))

  return { nodes, edges }
}
