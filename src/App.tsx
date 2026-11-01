import { useEffect, useRef, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { Diagram } from './Diagram'
import { newId, type View } from './doc'
import { exportDoc, readDoc, useDoc } from './store'

const hashView = () => decodeURIComponent(location.hash.slice(1))

function ViewList({ title, views, current, onAdd }: { title: string; views: View[]; current: string; onAdd: () => void }) {
  return (
    <>
      <h4>{title} <button className="add" title={`Nova ${title.toLowerCase()}`} onClick={onAdd}>+</button></h4>
      {views.map(v => (
        <a key={v.id} href={`#${v.id}`} className={v.id === current ? 'active' : ''}>{v.title || '(sem título)'}</a>
      ))}
    </>
  )
}

export function App() {
  const { doc, dirty, update, discard, replace } = useDoc()
  const [viewId, setViewId] = useState(hashView)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onHash = () => setViewId(hashView())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const view = doc.views.find(v => v.id === viewId) ?? doc.views[0]

  function add(type: 'view' | 'flow') {
    const id = newId(type)
    const base = { id, title: type === 'flow' ? 'Novo fluxo' : 'Nova visão', elements: [], positions: {} }
    update(d => void d.views.push(type === 'flow' ? { ...base, type, steps: [] } : { ...base, type, groups: [] }))
    location.hash = id
  }

  async function importFile(file: File) {
    try {
      replace(await readDoc(file))
      setError('')
    } catch (err) {
      setError(`importação falhou: ${(err as Error).message}`)
    }
  }

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">viewgax</div>
        <ViewList title="Visões" views={doc.views.filter(v => v.type === 'view')} current={view?.id ?? ''} onAdd={() => add('view')} />
        <ViewList title="Fluxos" views={doc.views.filter(v => v.type === 'flow')} current={view?.id ?? ''} onAdd={() => add('flow')} />
        <div className="file">
          {dirty && <div className="dirty">Alterações só neste navegador — exporte e commite em data/fortime.json</div>}
          <button onClick={() => exportDoc(doc)}>Exportar JSON</button>
          <button onClick={() => fileInput.current?.click()}>Importar JSON</button>
          <input ref={fileInput} type="file" accept=".json" hidden onChange={e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) importFile(file)
          }} />
          {dirty && <button onClick={() => confirm('Descartar todas as alterações locais?') && discard()}>Descartar alterações</button>}
          {error && <div className="status">{error}</div>}
        </div>
      </nav>
      {view
        ? (
          <ReactFlowProvider key={view.id}>
            <Diagram doc={doc} view={view} update={update} onViewDeleted={() => (location.hash = '')} />
          </ReactFlowProvider>
        )
        : <div className="empty-state">Nenhuma visão. Crie uma no menu ao lado.</div>}
    </div>
  )
}
