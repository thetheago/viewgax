import { useEffect, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { Diagram } from './Diagram'
import { isDynamic, useData, type View } from './model'

const hashView = () => decodeURIComponent(location.hash.slice(1))

function ViewList({ title, views, current }: { title: string; views: View[]; current: string }) {
  return (
    <>
      <h4>{title}</h4>
      {views.map(v => (
        <a key={v.id} href={`#${v.id}`} className={v.id === current ? 'active' : ''}>{v.title ?? v.id}</a>
      ))}
    </>
  )
}

export function App() {
  const data = useData()
  const [viewId, setViewId] = useState(hashView)
  useEffect(() => {
    const onHash = () => setViewId(hashView())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const views = Object.values(data.views)
  const view = data.views[viewId] ?? data.views.index ?? views[0]

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">viewgax</div>
        <ViewList title="Visões" views={views.filter(v => !isDynamic(v))} current={view.id} />
        <ViewList title="Fluxos" views={views.filter(isDynamic)} current={view.id} />
      </nav>
      {/* remonta ao trocar de visão ou quando o .c4 muda */}
      <ReactFlowProvider key={`${view.id}:${view.hash}`}>
        <Diagram data={data} view={view} />
      </ReactFlowProvider>
    </div>
  )
}
