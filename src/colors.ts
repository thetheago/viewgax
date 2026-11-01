// Nomes de cor (herdados do tema LikeC4) → hex
export const PALETTE: Record<string, string> = {
  primary: '#3b82f6', secondary: '#0ea5e9', muted: '#64748b', slate: '#475569', gray: '#94a3b8',
  indigo: '#6366f1', green: '#16a34a', amber: '#f59e0b', red: '#ef4444',
}
export const colorOf = (name?: string | null) => PALETTE[name ?? ''] ?? PALETTE.primary
