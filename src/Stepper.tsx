import { useEffect } from 'react'
import type { Step } from './doc'
import type { Selection } from './Panel'

type Props = { steps: Step[]; selection: Selection; onSelect: (s: Selection) => void }

/** Passo atual = seta selecionada; anterior/próximo só muda a seleção. */
export function Stepper({ steps, selection, onSelect }: Props) {
  const current = selection?.type === 'edge' ? steps.findIndex(e => e.id === selection.id) : -1
  const go = (i: number) => {
    if (i < 0 || i >= steps.length) return
    onSelect({ type: 'edge', id: steps[i].id })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return // digitando no painel
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
        {step ? <><b>Passo {current + 1}/{steps.length}</b> {step.title}</> : steps.length ? `${steps.length} passos — ▶ para começar` : 'Sem passos ainda'}
      </span>
      <button onClick={() => go(current + 1)} disabled={current >= steps.length - 1}>▶</button>
      {step && <button onClick={() => onSelect(null)}>Todos</button>}
    </div>
  )
}
