import { useEffect, useRef, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { Diagram } from './Diagram'
import { newId, type View } from './doc'
import { Home } from './Home'
import { Brand } from './Logo'
import { Search, type Focus } from './Search'
import { readDoc, useDoc, type SaveStatus } from './store'

const hashView = () => decodeURIComponent(location.hash.slice(1))

const STATUS_TEXT: Record<SaveStatus, string> = {
  carregando: 'Carregando…',
  salvo: 'Tudo salvo',
  salvando: 'Salvando…',
  erro: 'Erro ao salvar — a próxima edição tenta de novo',
  conflito: 'Outra pessoa salvou antes. Recarregue a página — suas últimas edições não foram salvas',
  'sem servidor': 'Somente leitura: servidor indisponível',
}

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
  const { doc, status, update, replace, undo, redo } = useDoc()
  const [viewId, setViewId] = useState(hashView)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [searching, setSearching] = useState(false)
  const [focus, setFocus] = useState<Focus | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onHash = () => setViewId(hashView())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // atalhos globais: Ctrl+K busca; Ctrl+Z / Ctrl+Shift+Z (ou Ctrl+Y) desfaz e refaz
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 'k') {
        e.preventDefault()
        setSearching(true)
      }
      if ((e.target as HTMLElement).closest('input, textarea, select')) return // o campo tem o próprio desfazer
      if (key === 'z' && !e.shiftKey) undo()
      if ((key === 'z' && e.shiftKey) || key === 'y') redo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!doc) return <div className="loading">Carregando…</div>
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
      <div className={`save-status ${status.replace(' ', '-')}`}>{STATUS_TEXT[status]}</div>
      <button onClick={() => fileInput.current?.click()} disabled={status === 'sem servidor'}>Importar JSON</button>
      <input ref={fileInput} type="file" accept=".json" hidden onChange={e => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (file && confirm('Importar substitui tudo o que está salvo. Continuar?')) importFile(file)
      }} />
      {error && <div className="status">{error}</div>}
    </div>
  )

  const remove = (id: string) => update(d => void (d.views = d.views.filter(v => v.id !== id)))

  const goTo = (target: string, id?: string) => {
    location.hash = target
    setFocus(id ? { id, at: Date.now() } : null)
  }
  const search = searching && <Search doc={doc} current={view?.id} onPick={goTo} onClose={() => setSearching(false)} />

  if (!view) return <>{search}<Home doc={doc} onAdd={add} onDelete={remove} fileActions={fileActions} /></>

  return (
    <div className="app">
      {search}
      <nav className="sidebar">
        <Brand />
        <button className="search-open" onClick={() => setSearching(true)}>Buscar… <kbd>Ctrl K</kbd></button>
        <ViewList title="Visões" type="view" views={doc.views.filter(v => v.type === 'view')} current={view.id} onAdd={() => add('view')} />
        <ViewList title="Fluxos" type="flow" views={doc.views.filter(v => v.type === 'flow')} current={view.id} onAdd={() => add('flow')} />
        {fileActions}
      </nav>
      <ReactFlowProvider key={view.id}>
        <Diagram doc={doc} view={view} update={update} editing={editing && status !== 'sem servidor'} setEditing={setEditing} focus={focus} />
      </ReactFlowProvider>
    </div>
  )
}
