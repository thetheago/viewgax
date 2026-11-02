import type { Doc, View } from './doc'
import { Brand } from './Logo'
import { Thumbnail } from './Thumbnail'

type Props = { doc: Doc; onAdd: (type: 'view' | 'flow') => void; onDelete: (id: string) => void; fileActions: React.ReactNode }

function Tile({ view, onDelete }: { view: View; onDelete: (id: string) => void }) {
  const detail = view.type === 'flow'
    ? `${view.steps.length} passos`
    : `${view.elements.length} cards · ${view.groups.length} grupos`
  return (
    <a className={`tile ${view.type}`} href={`#${view.id}`}>
      <Thumbnail view={view} />
      <button className="tile-delete" title="Excluir" onClick={e => {
        e.preventDefault() // o tile é um link
        if (confirm(`Excluir "${view.title}"? Cards e comunicações continuam no modelo.`)) onDelete(view.id)
      }}>✕</button>
      <div className="tile-body">
        <span className="tile-kind">{view.type === 'flow' ? 'Fluxo' : 'Visão'}</span>
        <strong>{view.title || '(sem título)'}</strong>
        <small>{detail}</small>
      </div>
    </a>
  )
}

function Section({ title, type, views, onAdd, onDelete }: { title: string; type: 'view' | 'flow'; views: View[]; onAdd: () => void; onDelete: (id: string) => void }) {
  return (
    <section className="home-section">
      <h2 className={type}>{title} <span>{views.length}</span></h2>
      <div className="tiles">
        {views.map(v => <Tile key={v.id} view={v} onDelete={onDelete} />)}
        <button className={`tile tile-new ${type}`} onClick={onAdd}>
          <span>+</span>
          {type === 'flow' ? 'Novo fluxo' : 'Nova visão'}
        </button>
      </div>
    </section>
  )
}

export function Home({ doc, onAdd, onDelete, fileActions }: Props) {
  const views = doc.views.filter(v => v.type === 'view')
  const flows = doc.views.filter(v => v.type === 'flow')
  return (
    <main className="home">
      <header className="home-header">
        <Brand />
        <div className="home-actions">{fileActions}</div>
      </header>
      <div className="home-hero">
        <h1>Como os sistemas <span>conversam.</span></h1>
        <p>Visões da arquitetura e fluxos passo a passo: quem chama quem, por qual protocolo, fila e payload.</p>
        <div className="stats">
          <div><strong>{doc.elements.length}</strong><span>cards</span></div>
          <div><strong>{doc.relations.length}</strong><span>comunicações</span></div>
          <div><strong>{views.length}</strong><span>visões</span></div>
          <div><strong>{flows.length}</strong><span>fluxos</span></div>
        </div>
      </div>
      <Section title="Visões" type="view" views={views} onAdd={() => onAdd('view')} onDelete={onDelete} />
      <Section title="Fluxos" type="flow" views={flows} onAdd={() => onAdd('flow')} onDelete={onDelete} />
    </main>
  )
}
