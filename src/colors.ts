// Nomes de cor (herdados do tema LikeC4) → hex; tons claros para brilhar no fundo escuro
export const PALETTE: Record<string, string> = {
  primary: '#5b9dff', secondary: '#22d3ee', muted: '#8b95b5', slate: '#7a86a8', gray: '#a3acc9',
  indigo: '#8b7bff', green: '#34d399', amber: '#fbbf24', red: '#fb7185',
}
export const colorOf = (name?: string | null) => PALETTE[name ?? ''] ?? PALETTE.primary
