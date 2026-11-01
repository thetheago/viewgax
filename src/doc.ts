// Formato do arquivo exportado/importado (data/fortime.json) e operações de edição.
export type Metadata = Record<string, string | string[]>
/** x/y relativos ao pai `p` (ausente = raiz). Se o pai mudar, a posição deixa de valer. */
export type Position = { x: number; y: number; w?: number; h?: number; p?: string }

export type Element = {
  id: string
  parent?: string
  title: string
  kind: string
  color?: string
  icon?: string
  technology?: string
  description?: string
  metadata?: Metadata
  tags?: string[]
  /** visão que detalha este elemento (duplo clique abre) */
  detail?: string
}
export type Relation = {
  id: string
  source: string
  target: string
  title?: string
  kind?: string
  technology?: string
  description?: string
  metadata?: Metadata
  tags?: string[]
}
export type Group = { id: string; title: string; elements: string[] }
export type Step = { id: string; source: string; target: string; title: string; notes?: string }

type ViewBase = { id: string; title: string; elements: string[]; positions: Record<string, Position> }
export type ElementView = ViewBase & { type: 'view'; groups: Group[] }
export type FlowView = ViewBase & { type: 'flow'; steps: Step[] }
export type View = ElementView | FlowView

export type Doc = { version: 1; elements: Element[]; relations: Relation[]; views: View[] }

export function isDoc(value: unknown): value is Doc {
  const d = value as Doc
  return d?.version === 1 && Array.isArray(d.elements) && Array.isArray(d.relations) && Array.isArray(d.views)
}

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Apaga o elemento do modelo inteiro: filhos sobem para o pai dele; relações e passos com ele somem. */
export function deleteElement(doc: Doc, id: string) {
  const el = doc.elements.find(e => e.id === id)
  doc.elements = doc.elements.filter(e => e.id !== id)
  for (const child of doc.elements) if (child.parent === id) child.parent = el?.parent
  doc.relations = doc.relations.filter(r => r.source !== id && r.target !== id)
  for (const view of doc.views) removeFromView(view, id)
}

export function removeFromView(view: View, id: string) {
  view.elements = view.elements.filter(e => e !== id)
  delete view.positions[id]
  if (view.type === 'view') for (const g of view.groups) g.elements = g.elements.filter(e => e !== id)
  else view.steps = view.steps.filter(s => s.source !== id && s.target !== id)
}
