import { useState } from 'react'
import type { Edge } from '@xyflow/react'
import { PALETTE } from './colors'
import type { EdgeData } from './compute'
import { deleteElement, newId, removeFromView, type Doc, type Element, type Group, type Metadata, type Relation, type Step, type View } from './doc'
import { ICON_NAMES } from './Icon'

export type Selection = { type: 'node' | 'edge'; id: string } | null
type Update = (fn: (draft: Doc) => void) => void
type Props = {
  doc: Doc
  view: View
  edges: Edge<EdgeData>[]
  selection: Selection
  onSelect: (s: Selection) => void
  update: Update
}

const RELATION_KINDS = ['http', 'async', 'db', 'outro']

/** Campo de texto; vazio vira undefined para não sujar o JSON. */
function Field({ label, value, onChange, multiline, mono }: {
  label: string; value?: string; onChange: (v: string | undefined) => void; multiline?: boolean; mono?: boolean
}) {
  const set = (v: string) => onChange(v === '' ? undefined : v)
  return (
    <label className="field">
      <span>{label}</span>
      {multiline
        ? <textarea className={mono ? 'mono' : ''} value={value ?? ''} rows={mono ? 6 : 3} onChange={e => set(e.target.value)} />
        : <input value={value ?? ''} onChange={e => set(e.target.value)} />}
    </label>
  )
}

function isJson(value: string) {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

function MetadataEditor({ metadata, onChange }: { metadata?: Metadata; onChange: (m: Metadata | undefined) => void }) {
  const entries = Object.entries(metadata ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v.join('\n') : v] as [string, string])
  const save = (next: [string, string][]) => onChange(next.length ? Object.fromEntries(next) : undefined)
  const setAt = (i: number, entry: [string, string]) => save(entries.map((e, j) => (j === i ? entry : e)))
  return (
    <div className="metadata">
      <div className="field-title">Detalhes (routing key, fila, payload, ACK/DLQ…)</div>
      {entries.map(([key, value], i) => (
        <div key={i} className="meta-row">
          <div className="meta-key">
            <input value={key} placeholder="chave" onChange={e => setAt(i, [e.target.value, value])} />
            <button title="Remover campo" onClick={() => save(entries.filter((_, j) => j !== i))}>✕</button>
          </div>
          <textarea
            className={key === 'payload' ? 'mono' : ''}
            rows={key === 'payload' ? 6 : 2}
            value={value}
            onChange={e => setAt(i, [key, e.target.value])}
          />
          {key === 'payload' && !isJson(value) && <small className="hint">ainda não é JSON válido</small>}
        </div>
      ))}
      <div className="row">
        <button onClick={() => save([...entries, [`campo${entries.length + 1}`, '']])}>+ campo</button>
        {!metadata?.payload && <button onClick={() => save([...entries, ['payload', '{\n  \n}']])}>+ payload</button>}
      </div>
    </div>
  )
}

function RelationEditor({ doc, id, update }: { doc: Doc; id: string; update: Update }) {
  const r = doc.relations.find(x => x.id === id)
  if (!r) return null
  const edit = (fn: (rel: Relation) => void) => update(d => fn(d.relations.find(x => x.id === id)!))
  const titleOf = (eid: string) => doc.elements.find(e => e.id === eid)?.title ?? eid
  return (
    <section className="relation">
      <div className="panel-kicker">{titleOf(r.source)} → {titleOf(r.target)}</div>
      <Field label="Título" value={r.title} onChange={v => edit(x => (x.title = v))} />
      <label className="field">
        <span>Tipo</span>
        <select value={r.kind ?? 'outro'} onChange={e => edit(x => (x.kind = e.target.value === 'outro' ? undefined : e.target.value))}>
          {RELATION_KINDS.map(k => <option key={k}>{k}</option>)}
        </select>
      </label>
      <Field label="Protocolo / tecnologia" value={r.technology} onChange={v => edit(x => (x.technology = v))} />
      <Field label="Explicação" value={r.description} multiline onChange={v => edit(x => (x.description = v))} />
      <MetadataEditor metadata={r.metadata} onChange={m => edit(x => (x.metadata = m))} />
      <button className="danger" onClick={() => update(d => void (d.relations = d.relations.filter(x => x.id !== id)))}>
        Excluir comunicação
      </button>
    </section>
  )
}

function ElementEditor({ doc, view, id, onSelect, update }: Omit<Props, 'selection' | 'edges'> & { id: string }) {
  const el = doc.elements.find(e => e.id === id)
  if (!el) return null
  const edit = (fn: (e: Element) => void) => update(d => fn(d.elements.find(x => x.id === id)!))
  const editView = (fn: (v: View) => void) => update(d => fn(d.views.find(v => v.id === view.id)!))
  const others = doc.elements.filter(e => e.id !== id).sort((a, b) => a.title.localeCompare(b.title))
  const group = view.type === 'view' ? view.groups.find(g => g.elements.includes(id)) : undefined

  return (
    <>
      <Field label="Nome" value={el.title} onChange={v => edit(x => (x.title = v ?? ''))} />
      <Field label="Tipo (actor, system, service, queue…)" value={el.kind} onChange={v => edit(x => (x.kind = v ?? ''))} />
      <Field label="Tecnologia" value={el.technology} onChange={v => edit(x => (x.technology = v))} />
      <Field label="Descrição" value={el.description} multiline onChange={v => edit(x => (x.description = v))} />
      <div className="row">
        <label className="field">
          <span>Cor</span>
          <select value={el.color ?? 'primary'} onChange={e => edit(x => (x.color = e.target.value))}>
            {Object.keys(PALETTE).map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Ícone</span>
          <input list="icon-names" value={el.icon ?? ''} placeholder="bootstrap:phone" onChange={e => edit(x => (x.icon = e.target.value || undefined))} />
        </label>
      </div>
      <label className="field">
        <span>Dentro de</span>
        <select value={el.parent ?? ''} onChange={e => edit(x => (x.parent = e.target.value || undefined))}>
          <option value="">— nenhum —</option>
          {others.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
        </select>
      </label>
      {view.type === 'view' && (
        <label className="field">
          <span>Grupo nesta visão</span>
          <select value={group?.id ?? ''} onChange={e => editView(v => {
            if (v.type !== 'view') return
            for (const g of v.groups) g.elements = g.elements.filter(x => x !== id)
            v.groups.find(g => g.id === e.target.value)?.elements.push(id)
          })}>
            <option value="">— nenhum —</option>
            {view.groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </label>
      )}
      <MetadataEditor metadata={el.metadata} onChange={m => edit(x => (x.metadata = m))} />
      <div className="row">
        <button onClick={() => { editView(v => removeFromView(v, id)); onSelect(null) }}>Tirar desta visão</button>
        <button className="danger" onClick={() => {
          if (!confirm(`Excluir "${el.title}" do modelo inteiro? Some de todas as visões, com suas comunicações.`)) return
          update(d => deleteElement(d, id))
          onSelect(null)
        }}>Excluir do modelo</button>
      </div>
    </>
  )
}

function StepEditor({ doc, view, id, onSelect, update }: Omit<Props, 'selection' | 'edges'> & { id: string }) {
  if (view.type !== 'flow') return null
  const index = view.steps.findIndex(s => s.id === id)
  const step = view.steps[index]
  if (!step) return null
  const editFlow = (fn: (steps: Step[]) => void) =>
    update(d => { const v = d.views.find(x => x.id === view.id); if (v?.type === 'flow') fn(v.steps) })
  const edit = (fn: (s: Step) => void) => editFlow(steps => fn(steps[index]))
  const move = (delta: number) => editFlow(steps => {
    const [s] = steps.splice(index, 1)
    steps.splice(Math.max(0, Math.min(steps.length, index + delta)), 0, s)
  })
  const titleOf = (eid: string) => doc.elements.find(e => e.id === eid)?.title ?? eid
  const relations = doc.relations.filter(r => r.source === step.source && r.target === step.target)

  return (
    <>
      <div className="panel-kicker">Passo {index + 1} · {titleOf(step.source)} → {titleOf(step.target)}</div>
      <Field label="Título do passo" value={step.title} onChange={v => edit(s => (s.title = v ?? ''))} />
      <Field label="Explicação (balão)" value={step.notes} multiline onChange={v => edit(s => (s.notes = v))} />
      <div className="row">
        <button onClick={() => move(-1)} disabled={index === 0}>↑ Antes</button>
        <button onClick={() => move(1)} disabled={index === view.steps.length - 1}>↓ Depois</button>
        <button className="danger" onClick={() => { editFlow(steps => steps.splice(index, 1)); onSelect(null) }}>Excluir passo</button>
      </div>
      <h3>Comunicação no modelo</h3>
      {relations.map(r => <RelationEditor key={r.id} doc={doc} id={r.id} update={update} />)}
      {relations.length === 0 && (
        <button onClick={() => update(d => void d.relations.push({ id: newId('rel'), source: step.source, target: step.target, kind: 'http', title: step.title }))}>
          + Criar comunicação {titleOf(step.source)} → {titleOf(step.target)}
        </button>
      )}
    </>
  )
}

function GroupEditor({ view, id, onSelect, update }: Omit<Props, 'selection' | 'edges' | 'doc'> & { id: string }) {
  if (view.type !== 'view') return null
  const i = view.groups.findIndex(g => g.id === id)
  if (i < 0) return null
  const edit = (fn: (groups: Group[]) => void) =>
    update(d => { const v = d.views.find(x => x.id === view.id); if (v?.type === 'view') fn(v.groups) })
  const move = (delta: number) => edit(groups => groups.splice(i + delta, 0, ...groups.splice(i, 1)))
  return (
    <>
      <Field label="Nome do grupo" value={view.groups[i].title} onChange={v => edit(groups => (groups[i].title = v ?? ''))} />
      <p className="hint">A ordem dos grupos define as colunas do layout "Camadas →".</p>
      <div className="row">
        <button disabled={i === 0} onClick={() => move(-1)}>← Coluna antes</button>
        <button disabled={i === view.groups.length - 1} onClick={() => move(1)}>Coluna depois →</button>
        <button className="danger" onClick={() => { edit(groups => groups.splice(i, 1)); onSelect(null) }}>Excluir grupo</button>
      </div>
    </>
  )
}

/* ── leitura ─────────────────────────── */

function prettyJson(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

function MetadataView({ metadata }: { metadata?: Metadata }) {
  if (!metadata) return null
  return (
    <dl className="meta">
      {Object.entries(metadata).map(([key, raw]) => {
        const value = Array.isArray(raw) ? raw.join('\n') : raw
        return (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{key === 'payload' ? <pre className="code">{prettyJson(value)}</pre> : value}</dd>
          </div>
        )
      })}
    </dl>
  )
}

const KindBadge = ({ kind }: { kind?: string }) => <span className={`badge kind-${kind ?? 'outro'}`}>{kind ?? 'outro'}</span>

function RelationView({ doc, id }: { doc: Doc; id: string }) {
  const r = doc.relations.find(x => x.id === id)
  if (!r) return null
  const titleOf = (eid: string) => doc.elements.find(e => e.id === eid)?.title ?? eid
  return (
    <article className="relation-view">
      <div className="relation-route">{titleOf(r.source)} <span>→</span> {titleOf(r.target)}</div>
      <h3>{r.title || '(sem título)'} <KindBadge kind={r.kind} /></h3>
      {r.technology && <div className="tech">{r.technology}</div>}
      {r.description && <p className="desc">{r.description}</p>}
      <MetadataView metadata={r.metadata} />
      {r.tags && <div className="tags">{r.tags.map(t => <span key={t}>#{t}</span>)}</div>}
    </article>
  )
}

function ElementView({ doc, id, edges, onSelect }: { doc: Doc; id: string; edges: Edge<EdgeData>[]; onSelect: (s: Selection) => void }) {
  const el = doc.elements.find(e => e.id === id)
  if (!el) return null
  const titleOf = (eid: string) => doc.elements.find(e => e.id === eid)?.title ?? eid
  const incoming = edges.filter(e => e.target === id)
  const outgoing = edges.filter(e => e.source === id)
  const parent = el.parent ? titleOf(el.parent) : null
  const LinkList = ({ title, list, other }: { title: string; list: Edge<EdgeData>[]; other: (e: Edge<EdgeData>) => string }) =>
    list.length ? (
      <>
        <h4 className="section-title">{title} <span>{list.length}</span></h4>
        <ul className="links">
          {list.map(e => (
            <li key={e.id}>
              <button onClick={() => onSelect({ type: 'edge', id: e.id })}>
                <strong>{titleOf(other(e))}</strong>
                {e.data?.label && <small>{e.data.label}</small>}
              </button>
            </li>
          ))}
        </ul>
      </>
    ) : null
  return (
    <>
      {el.technology && <div className="tech">{el.technology}</div>}
      {parent && <div className="tech">dentro de <strong>{parent}</strong></div>}
      {el.description && <p className="desc">{el.description}</p>}
      <MetadataView metadata={el.metadata} />
      <LinkList title="Recebe de" list={incoming} other={e => e.source} />
      <LinkList title="Chama / envia para" list={outgoing} other={e => e.target} />
    </>
  )
}

function StepView({ doc, view, id }: { doc: Doc; view: View; id: string }) {
  if (view.type !== 'flow') return null
  const step = view.steps.find(s => s.id === id)
  if (!step) return null
  const relations = doc.relations.filter(r => r.source === step.source && r.target === step.target)
  return (
    <>
      {step.notes ? <p className="desc">{step.notes}</p> : <p className="hint">Sem explicação ainda. Clique em Editar para escrever o texto do balão.</p>}
      {relations.map(r => <RelationView key={r.id} doc={doc} id={r.id} />)}
    </>
  )
}

/* ── painel ──────────────────────────── */

function headerOf(doc: Doc, view: View, edges: Edge<EdgeData>[], selection: NonNullable<Selection>) {
  const titleOf = (eid: string) => doc.elements.find(e => e.id === eid)?.title ?? eid
  if (selection.type === 'node') {
    const el = doc.elements.find(e => e.id === selection.id)
    if (el) return { kicker: el.kind, title: el.title }
    const group = view.type === 'view' ? view.groups.find(g => g.id === selection.id) : undefined
    return { kicker: 'grupo', title: group?.title ?? '' }
  }
  if (view.type === 'flow') {
    const i = view.steps.findIndex(s => s.id === selection.id)
    const step = view.steps[i]
    return { kicker: `passo ${i + 1} · ${titleOf(step?.source)} → ${titleOf(step?.target)}`, title: step?.title ?? '' }
  }
  const edge = edges.find(e => e.id === selection.id)
  return { kicker: 'comunicação', title: edge ? `${titleOf(edge.source)} → ${titleOf(edge.target)}` : '' }
}

export function Panel(props: Props) {
  const { doc, view, edges, selection, onSelect, update } = props
  const [editing, setEditing] = useState(false)
  if (!selection) return null
  const { kicker, title } = headerOf(doc, view, edges, selection)
  const isElement = selection.type === 'node' && doc.elements.some(e => e.id === selection.id)
  const isGroup = selection.type === 'node' && !isElement
  const relationIds = selection.type === 'edge' && view.type === 'view' ? edges.find(e => e.id === selection.id)?.data?.relations ?? [] : []

  return (
    <aside className="panel">
      <datalist id="icon-names">{ICON_NAMES.map(n => <option key={n} value={n} />)}</datalist>
      <header className="panel-header">
        <div>
          <div className="panel-kicker">{kicker}</div>
          <h2>{title || '(sem título)'}</h2>
        </div>
        {!isGroup && <button className={editing ? 'primary' : ''} onClick={() => setEditing(!editing)}>{editing ? 'Concluir' : 'Editar'}</button>}
        <button className="ghost close" title="Fechar" onClick={() => onSelect(null)}>✕</button>
      </header>

      {isGroup && <GroupEditor view={view} id={selection.id} onSelect={onSelect} update={update} />}
      {isElement && (editing
        ? <ElementEditor doc={doc} view={view} id={selection.id} onSelect={onSelect} update={update} />
        : <ElementView doc={doc} id={selection.id} edges={edges} onSelect={onSelect} />)}
      {selection.type === 'edge' && view.type === 'flow' && (editing
        ? <StepEditor doc={doc} view={view} id={selection.id} onSelect={onSelect} update={update} />
        : <StepView doc={doc} view={view} id={selection.id} />)}
      {relationIds.map(id => (editing
        ? <RelationEditor key={id} doc={doc} id={id} update={update} />
        : <RelationView key={id} doc={doc} id={id} />))}
    </aside>
  )
}
