import { useEffect, useState } from 'react'
import type { Step } from './doc'
import type { Selection } from './Panel'

type Props = { steps: Step[]; selection: Selection; onSelect: (s: Selection) => void }

const PLAY_MS = 2600

/** Passo atual = seta selecionada; anterior/próximo só muda a seleção. */
export function Stepper({ steps, selection, onSelect }: Props) {
  const current = selection?.type === 'edge' ? steps.findIndex(e => e.id === selection.id) : -1
  const go = (i: number) => {
    if (i < 0 || i >= steps.length) return
    onSelect({ type: 'edge', id: steps[i].id })
  }

  // ▶ automático: avança sozinho e para no último passo
  const [playing, setPlaying] = useState(false)
  const atEnd = current >= steps.length - 1
  useEffect(() => {
    if (!playing) return
    if (atEnd) return setPlaying(false)
    const timer = setTimeout(() => go(current + 1), current < 0 ? 0 : PLAY_MS)
    return () => clearTimeout(timer)
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return // digitando no painel
      if (e.key === ' ') {
        e.preventDefault()
        setPlaying(p => !p)
      }
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
      <button className="play" title="Tocar o fluxo (espaço)" disabled={!steps.length} onClick={() => {
        if (atEnd) go(0)
        setPlaying(!playing)
      }}>{playing ? '❚❚' : '▶︎ Tocar'}</button>
      <button onClick={() => go(current - 1)} disabled={current <= 0}>◀</button>
      <span>
        {step ? <><b>Passo {current + 1}/{steps.length}</b> {step.title}</> : steps.length ? `${steps.length} passos — ▶ para começar` : 'Sem passos ainda'}
      </span>
      <button onClick={() => go(current + 1)} disabled={current >= steps.length - 1}>▶</button>
      {step && <button onClick={() => onSelect(null)}>Todos</button>}
    </div>
  )
}
