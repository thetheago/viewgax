import { useState } from 'react'
import { Icon, ICON_NAMES } from './Icon'

const MAX_SHOWN = 72

export function IconPicker({ value, onChange }: { value?: string; onChange: (icon: string | undefined) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const matches = ICON_NAMES.filter(n => n.includes(query.trim().toLowerCase())).slice(0, MAX_SHOWN)
  const pick = (icon: string | undefined) => {
    onChange(icon)
    setOpen(false)
  }
  return (
    <div className="field icon-picker">
      <span>Ícone</span>
      <button className="icon-current" onClick={() => setOpen(!open)}>
        <Icon name={value ?? 'bootstrap:box'} /> {value ?? 'escolher…'}
      </button>
      {open && (
        <div className="icon-box">
          <input autoFocus placeholder="buscar: rabbit, php, phone…" value={query} onChange={e => setQuery(e.target.value)} />
          <div className="icon-grid">
            {matches.map(n => (
              <button key={n} title={n} className={n === value ? 'selected' : ''} onClick={() => pick(n)}><Icon name={n} /></button>
            ))}
          </div>
          {matches.length === 0 && <p className="hint">Nenhum ícone com “{query}”.</p>}
          {value && <button className="ghost" onClick={() => pick(undefined)}>Sem ícone</button>}
        </div>
      )}
    </div>
  )
}
