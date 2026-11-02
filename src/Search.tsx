import { useState } from 'react'
import type { Doc, Metadata, View } from './doc'

export type Focus = { id: string; at: number }
type Result = { key: string; kind: string; title: string; sub?: string; view: string; focus?: string }

const metaText = (m?: Metadata) => Object.values(m ?? {}).flat().join(' ')
const matches = (text: string, words: string[]) => words.every(w => text.toLowerCase().includes(w))
const MAX_RESULTS = 30

/** Visão para mostrar estes ids: a atual se tem todos, senão a primeira visão (não fluxo) que tem. */
function viewWith(doc: Doc, current: string | undefined, ids: string[]): View | undefined {
  const has = (v: View) => ids.every(id => v.elements.includes(id))
  const ordered = [...doc.views].sort((a, b) => Number(b.id === current) - Number(a.id === current) || Number(a.type === 'flow') - Number(b.type === 'flow'))
  return ordered.find(has)
}

function search(doc: Doc, current: string | undefined, query: string): Result[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const titleOf = (id: string) => doc.elements.find(e => e.id === id)?.title ?? id
  const out: Result[] = []
  for (const v of doc.views) {
    if (matches(v.title, words)) out.push({ key: v.id, kind: v.type === 'flow' ? 'Fluxo' : 'Visão', title: v.title, view: v.id })
  }
  for (const e of doc.elements) {
    if (!matches([e.title, e.kind, e.technology, e.description, metaText(e.metadata)].join(' '), words)) continue
    const v = viewWith(doc, current, [e.id])
    if (v) out.push({ key: e.id, kind: e.kind || 'card', title: e.title, sub: `em ${v.title}`, view: v.id, focus: e.id })
  }
  for (const r of doc.relations) {
    if (!matches([r.title, r.technology, r.description, metaText(r.metadata)].join(' '), words)) continue
    const both = viewWith(doc, current, [r.source, r.target])
    const v = both ?? viewWith(doc, current, [r.source])
    if (!v) continue
    out.push({
      key: r.id, kind: r.kind ?? 'comunicação', title: r.title || '(sem título)',
      sub: `${titleOf(r.source)} → ${titleOf(r.target)} · em ${v.title}`, view: v.id, focus: both ? `${r.source}->${r.target}` : r.source,
    })
  }
  return out.slice(0, MAX_RESULTS)
}

/** Ctrl+K: acha visão, card ou comunicação (título, tecnologia, routing key, fila…) e vai até ela. */
export function Search({ doc, current, onPick, onClose }: {
  doc: Doc; current?: string; onPick: (view: string, focus?: string) => void; onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const results = search(doc, current, query)
  const pick = (r?: Result) => {
    if (!r) return
    onPick(r.view, r.focus)
    onClose()
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter') pick(results[active])
    if (e.key === 'ArrowDown') setActive(i => Math.min(i + 1, results.length - 1))
    if (e.key === 'ArrowUp') setActive(i => Math.max(i - 1, 0))
  }
  return (
    <div className="search-backdrop" onClick={onClose}>
      <div className="search" onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Buscar card, fila, routing key, visão…"
          value={query}
          onChange={e => { setQuery(e.target.value); setActive(0) }}
          onKeyDown={onKey}
        />
        <ul>
          {results.map((r, i) => (
            <li key={r.key} className={i === active ? 'active' : ''} onMouseEnter={() => setActive(i)} onClick={() => pick(r)}>
              <span className="search-kind">{r.kind}</span>
              <strong>{r.title}</strong>
              {r.sub && <small>{r.sub}</small>}
            </li>
          ))}
          {query && results.length === 0 && <li className="empty">Nada encontrado.</li>}
        </ul>
        <footer><kbd>↑↓</kbd> navegar <kbd>Enter</kbd> abrir <kbd>Esc</kbd> fechar</footer>
      </div>
    </div>
  )
}
