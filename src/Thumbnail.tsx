import type { View } from './doc'

const CARD = { w: 240, h: 90 }

/** Miniatura da visão a partir das posições salvas (x/y são relativos ao pai). */
export function Thumbnail({ view }: { view: View }) {
  const abs = (id: string, seen = 0): { x: number; y: number } => {
    const p = view.positions[id]
    if (!p || seen > 20) return { x: 0, y: 0 }
    const parent = p.p ? abs(p.p, seen + 1) : { x: 0, y: 0 }
    return { x: parent.x + p.x, y: parent.y + p.y }
  }
  const boxes = Object.entries(view.positions).map(([id, p]) => ({
    id, ...abs(id), w: p.w ?? CARD.w, h: p.h ?? CARD.h, container: p.w !== undefined,
  }))
  if (!boxes.length) return <div className="thumb empty">vazio</div>

  const minX = Math.min(...boxes.map(b => b.x)) - 20
  const minY = Math.min(...boxes.map(b => b.y)) - 20
  const maxX = Math.max(...boxes.map(b => b.x + b.w)) + 20
  const maxY = Math.max(...boxes.map(b => b.y + b.h)) + 20
  const center = (id: string) => {
    const b = boxes.find(x => x.id === id)
    return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null
  }
  const steps = view.type === 'flow' ? view.steps.map(s => [center(s.source), center(s.target)] as const) : []

  return (
    <svg className="thumb" viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} preserveAspectRatio="xMidYMid meet">
      {boxes.filter(b => b.container).map(b => <rect key={b.id} className="t-container" x={b.x} y={b.y} width={b.w} height={b.h} rx={24} />)}
      {steps.map(([a, b], i) => a && b && <line key={i} className="t-step" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />)}
      {boxes.filter(b => !b.container).map(b => <rect key={b.id} className="t-card" x={b.x} y={b.y} width={b.w} height={b.h} rx={16} />)}
    </svg>
  )
}
