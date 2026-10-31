import { useEffect } from 'react'
import type { View } from './model'
import type { Selection } from './SidePanel'

type Props = { view: View; selection: Selection; onSelect: (s: Selection) => void }

/** Passo atual = seta selecionada; anterior/próximo só muda a seleção. */
export function Stepper({ view, selection, onSelect }: Props) {
  const steps = view.edges
  const current = selection?.type === 'edge' ? steps.findIndex(e => e.id === selection.id) : -1
  const go = (i: number) => {
    if (i < 0 || i >= steps.length) return
    onSelect({ type: 'edge', id: steps[i].id })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(current + 1)
      if (e.key === 'ArrowLeft') go(current - 1)
      if (e.key === 'Escape') onSelect(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const step = steps[current]
  return (
    <div className="stepper">
      <button onClick={() => go(current - 1)} disabled={current <= 0}>◀</button>
      <span>
        {step ? <><b>Passo {current + 1}/{steps.length}</b> {step.label}</> : `${steps.length} passos — ▶ para começar`}
      </span>
      <button onClick={() => go(current + 1)} disabled={current >= steps.length - 1}>▶</button>
      {step && <button onClick={() => onSelect(null)}>Todos</button>}
    </div>
  )
}
