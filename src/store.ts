import { useEffect, useState } from 'react'
import bundled from '../data/fortime.json'
import { isDoc, type Doc } from './doc'

// cópia de trabalho no navegador até exportar e commitar data/fortime.json
const KEY = 'viewgax:doc'
const initial = bundled as unknown as Doc
const bundledText = JSON.stringify(initial)

function load(): Doc {
  try {
    const local = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (isDoc(local)) return local
  } catch {
    // cópia local corrompida: volta para o arquivo
  }
  return initial
}

export function useDoc() {
  const [doc, setDoc] = useState<Doc>(load)
  const dirty = JSON.stringify(doc) !== bundledText

  useEffect(() => {
    if (dirty) localStorage.setItem(KEY, JSON.stringify(doc))
    else localStorage.removeItem(KEY)
  }, [doc, dirty])

  /** Edita uma cópia do documento. */
  const update = (fn: (draft: Doc) => void) =>
    setDoc(d => {
      const draft = structuredClone(d)
      fn(draft)
      return draft
    })

  const discard = () => setDoc(initial)
  const replace = (next: Doc) => setDoc(next)
  return { doc, dirty, update, discard, replace }
}

export function exportDoc(doc: Doc) {
  const blob = new Blob([JSON.stringify(doc, null, 2) + '\n'], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'fortime.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function readDoc(file: File): Promise<Doc> {
  const value = JSON.parse(await file.text())
  if (!isDoc(value)) throw new Error('arquivo não é um documento do viewgax')
  return value
}
