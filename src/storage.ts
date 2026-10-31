import { isSaved, type Saved } from './layout'

// layouts commitados em layouts/<viewId>.json
const files = import.meta.glob<unknown>('../layouts/*.json', { eager: true, import: 'default' })
const fileLayouts = new Map<string, Saved>()
for (const value of Object.values(files)) if (isSaved(value)) fileLayouts.set(value.viewId, value)

const key = (viewId: string) => `viewgax:layout:${viewId}`

export const fileLayout = (viewId: string) => fileLayouts.get(viewId) ?? null

export function localLayout(viewId: string): Saved | null {
  try {
    const value = JSON.parse(localStorage.getItem(key(viewId)) ?? 'null')
    return isSaved(value) ? value : null
  } catch {
    return null
  }
}
export const saveLocal = (saved: Saved) => localStorage.setItem(key(saved.viewId), JSON.stringify(saved))
export const clearLocal = (viewId: string) => localStorage.removeItem(key(viewId))

export function download(saved: Saved) {
  const blob = new Blob([JSON.stringify(saved, null, 2) + '\n'], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${saved.viewId}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
