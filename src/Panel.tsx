import type { Edge } from '@xyflow/react'
import { PALETTE } from './colors'
import type { EdgeData } from './compute'
import { deleteElement, newId, removeFromView, type Doc, type Element, type Metadata, type Relation, type Step, type View } from './doc'
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

function ElementEditor({ doc, view, id, edges, onSelect, update }: Omit<Props, 'selection'> & { id: string }) {
  const el = doc.elements.find(e => e.id === id)
  if (!el) return null
  const edit = (fn: (e: Element) => void) => update(d => fn(d.elements.find(x => x.id === id)!))
  const editView = (fn: (v: View) => void) => update(d => fn(d.views.find(v => v.id === view.id)!))
  const others = doc.elements.filter(e => e.id !== id).sort((a, b) => a.title.localeCompare(b.title))
  const group = view.type === 'view' ? view.groups.find(g => g.elements.includes(id)) : undefined
  const titleOf = (eid: string) => doc.elements.find(e => e.id === eid)?.title ?? eid
  const linked = edges.filter(e => e.source === id || e.target === id)

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
      {linked.length > 0 && (
        <>
          <h3>Comunicações nesta visão</h3>
          <ul className="links">
            {linked.map(e => (
              <li key={e.id}>
                <button onClick={() => onSelect({ type: 'edge', id: e.id })}>
                  {e.source === id ? `→ ${titleOf(e.target)}` : `← ${titleOf(e.source)}`}
                  {e.data?.label && <small>{e.data.label}</small>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
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

function ViewEditor({ view, onSelect, update, onDeleted }: Omit<Props, 'selection' | 'edges' | 'doc'> & { onDeleted: () => void }) {
  const editView = (fn: (v: View) => void) => update(d => fn(d.views.find(v => v.id === view.id)!))
  return (
    <>
      <div className="panel-kicker">{view.type === 'flow' ? 'Fluxo' : 'Visão'}</div>
      <Field label="Título" value={view.title} onChange={v => editView(x => (x.title = v ?? ''))} />
      {view.type === 'view' && (
        <>
          <h3>Grupos (colunas, da esquerda para a direita)</h3>
          {view.groups.map((g, i) => (
            <div key={g.id} className="meta-key">
              <input value={g.title} onChange={e => editView(v => { if (v.type === 'view') v.groups[i].title = e.target.value })} />
              <button title="Mover para a esquerda" disabled={i === 0} onClick={() => editView(v => {
                if (v.type === 'view') v.groups.splice(i - 1, 0, ...v.groups.splice(i, 1))
              })}>↑</button>
              <button title="Excluir grupo (os cards ficam)" onClick={() => editView(v => {
                if (v.type !== 'view') return
                v.groups.splice(i, 1)
                delete v.positions[g.id]
              })}>✕</button>
            </div>
          ))}
          <button onClick={() => editView(v => {
            if (v.type === 'view') v.groups.push({ id: newId('g'), title: `Grupo ${v.groups.length + 1}`, elements: [] })
          })}>+ Grupo</button>
          <p className="hint">Coloque um card num grupo pelo painel do card.</p>
        </>
      )}
      {view.type === 'flow' && (
        <>
          <h3>Passos</h3>
          <ol className="steps">
            {view.steps.map(s => <li key={s.id}><button onClick={() => onSelect({ type: 'edge', id: s.id })}>{s.title || '(sem título)'}</button></li>)}
          </ol>
          <p className="hint">Novo passo: arraste do ponto à direita de um card até outro card.</p>
        </>
      )}
      <button className="danger" onClick={() => {
        if (!confirm(`Excluir "${view.title}"? Os cards e comunicações continuam no modelo.`)) return
        update(d => void (d.views = d.views.filter(v => v.id !== view.id)))
        onDeleted()
      }}>Excluir {view.type === 'flow' ? 'fluxo' : 'visão'}</button>
    </>
  )
}

export function Panel(props: Props & { onViewDeleted: () => void }) {
  const { doc, view, edges, selection, update } = props
  return (
    <aside className="panel">
      <datalist id="icon-names">{ICON_NAMES.map(n => <option key={n} value={n} />)}</datalist>
      {!selection && <ViewEditor {...props} onDeleted={props.onViewDeleted} />}
      {selection?.type === 'node' && (doc.elements.some(e => e.id === selection.id)
        ? <ElementEditor {...props} id={selection.id} />
        : <p className="hint">Grupo: renomeie ou exclua no painel da visão (clique no fundo).</p>)}
      {selection?.type === 'edge' && view.type === 'flow' && <StepEditor {...props} id={selection.id} />}
      {selection?.type === 'edge' && view.type === 'view' &&
        edges.find(e => e.id === selection.id)?.data?.relations.map(id => <RelationEditor key={id} doc={doc} id={id} update={update} />)}
    </aside>
  )
}
