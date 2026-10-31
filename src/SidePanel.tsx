import type { Data, Metadata, Text, View, ViewEdge } from './model'
import { textOf } from './model'

export type Selection = { type: 'node' | 'edge'; id: string } | null

function prettyPayload(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value // ainda não é JSON válido: mostra cru
  }
}

function MetadataTable({ metadata }: { metadata?: Metadata }) {
  if (!metadata) return null
  return (
    <dl className="meta">
      {Object.entries(metadata).map(([key, raw]) => {
        const value = Array.isArray(raw) ? raw.join('\n') : raw
        return (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{key === 'payload' ? <pre>{prettyPayload(value)}</pre> : value}</dd>
          </div>
        )
      })}
    </dl>
  )
}

const Description = ({ text }: { text: Text }) => (textOf(text) ? <p className="desc">{textOf(text)}</p> : null)
const Tags = ({ tags }: { tags?: string[] }) =>
  tags?.length ? <div className="tags">{tags.map(t => <span key={t}>#{t}</span>)}</div> : null

type Props = { data: Data; view: View; selection: Selection; onSelect: (s: Selection) => void }

export function SidePanel({ data, view, selection, onSelect }: Props) {
  if (!selection) return <aside className="panel empty">Clique num card ou numa seta para ver os detalhes.</aside>
  const titleOf = (id: string) => view.nodes.find(n => n.id === id)?.title ?? id

  if (selection.type === 'edge') {
    const edge = view.edges.find(e => e.id === selection.id)
    if (!edge) return null
    return (
      <aside className="panel">
        <div className="panel-kicker">{titleOf(edge.source)} → {titleOf(edge.target)}</div>
        {edge.label && <h2>{edge.label}</h2>}
        {edge.relations.length > 1 && <div className="panel-kicker">{edge.relations.length} relações do modelo entre esses dois</div>}
        {edge.relations.map(id => {
          const r = data.relations[id]
          if (!r) return null
          return (
            <section key={id} className="relation">
              <h3>{r.title ?? '(sem título)'} {r.kind && <span className="badge">{r.kind}</span>}</h3>
              {r.technology && <div className="tech">{r.technology}</div>}
              <Description text={r.description} />
              <MetadataTable metadata={r.metadata} />
              <Tags tags={r.tags} />
            </section>
          )
        })}
      </aside>
    )
  }

  const node = view.nodes.find(n => n.id === selection.id)
  if (!node) return null
  const element = node.modelRef ? data.elements[node.modelRef] : undefined
  const linked = view.edges.filter(e => e.source === node.id || e.target === node.id)
  return (
    <aside className="panel">
      <div className="panel-kicker">{element?.kind ?? 'grupo'}</div>
      <h2>{node.title}</h2>
      {element?.technology && <div className="tech">{element.technology}</div>}
      <Description text={element?.description} />
      <MetadataTable metadata={element?.metadata} />
      <Tags tags={element?.tags} />
      {linked.length > 0 && (
        <>
          <h3>Comunicações nesta visão</h3>
          <ul className="links">
            {linked.map((e: ViewEdge) => (
              <li key={e.id}>
                <button onClick={() => onSelect({ type: 'edge', id: e.id })}>
                  {e.source === node.id ? `→ ${titleOf(e.target)}` : `← ${titleOf(e.source)}`}
                  {e.label && <small>{e.label}</small>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}
