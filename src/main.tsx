import { createRoot } from 'react-dom/client'
import { $likec4data } from 'likec4:single-project'

const data = $likec4data.get()
const views = Object.values(data.views)

createRoot(document.getElementById('root')!).render(
  <ul>
    {views.map(v => (
      <li key={v.id}>
        <b>{v.id}</b> ({v._type}) — {v.nodes.length} nós, {v.edges.length} setas
      </li>
    ))}
  </ul>,
)
