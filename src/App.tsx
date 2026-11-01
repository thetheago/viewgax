import { useEffect, useRef, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { Diagram } from './Diagram'
import { newId, type View } from './doc'
import { Home } from './Home'
import { Brand } from './Logo'
import { exportDoc, readDoc, useDoc } from './store'

const hashView = () => decodeURIComponent(location.hash.slice(1))

function ViewList({ title, type, views, current, onAdd }: {
  title: string; type: 'view' | 'flow'; views: View[]; current: string; onAdd: () => void
}) {
  return (
    <>
      <h4 className={type}>{title} <button className="add" title={type === 'flow' ? 'Novo fluxo' : 'Nova visão'} onClick={onAdd}>+</button></h4>
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

  const view = doc.views.find(v => v.id === viewId)

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

  const fileActions = (
    <div className="file">
      {dirty && <div className="dirty">Alterações só neste navegador — exporte e commite em data/fortime.json</div>}
      <button className="primary" onClick={() => exportDoc(doc)}>Exportar JSON</button>
      <button onClick={() => fileInput.current?.click()}>Importar JSON</button>
      <input ref={fileInput} type="file" accept=".json" hidden onChange={e => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (file) importFile(file)
      }} />
      {dirty && <button className="ghost" onClick={() => confirm('Descartar todas as alterações locais?') && discard()}>Descartar alterações</button>}
      {error && <div className="status">{error}</div>}
    </div>
  )

    const remove = (id: string) => update(d => void (d.views = d.views.filter(v => v.id !== id)))

  if (!view) return <Home doc={doc} onAdd={add} onDelete={remove} fileActions={fileActions} />

  return (
    <div className="app">
      <nav className="sidebar">
        <Brand />
        <ViewList title="Visões" type="view" views={doc.views.filter(v => v.type === 'view')} current={view.id} onAdd={() => add('view')} />
        <ViewList title="Fluxos" type="flow" views={doc.views.filter(v => v.type === 'flow')} current={view.id} onAdd={() => add('flow')} />
        {fileActions}
      </nav>
      <ReactFlowProvider key={view.id}>
        <Diagram doc={doc} view={view} update={update} />
      </ReactFlowProvider>
    </div>
  )
}
