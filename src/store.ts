import { useEffect, useRef, useState } from 'react'
import seed from '../data/fortime.json'
import { isDoc, type Doc } from './doc'

const API = './api/doc'
const SAVE_DELAY_MS = 400
const UNDO_LIMIT = 100
const UNDO_GROUP_MS = 800 // edições seguidas (digitar um nome) viram um passo só do Ctrl+Z

export type SaveStatus = 'carregando' | 'salvo' | 'salvando' | 'erro' | 'conflito' | 'sem servidor'

/** Documento vem do servidor (arquivo no container) e é salvo sozinho a cada edição. */
export function useDoc() {
  const [doc, setDoc] = useState<Doc | null>(null)
  const [status, setStatus] = useState<SaveStatus>('carregando')
  const changed = useRef(false) // só salva o que o usuário editou, não o que acabou de carregar
  const version = useRef<string | null>(null) // ETag do que está no servidor
  const past = useRef<Doc[]>([])
  const future = useRef<Doc[]>([])
  const lastEdit = useRef(0)

  useEffect(() => {
    fetch(API)
      .then(r => {
        if (!r.ok) throw new Error(String(r.status))
        version.current = r.headers.get('etag')
        return r.json()
      })
      .then(value => {
        if (!isDoc(value)) throw new Error('documento inválido no servidor')
        setDoc(value)
        setStatus('salvo')
      })
      .catch(() => {
        // site estático sem servidor: só leitura da semente
        setDoc(seed as unknown as Doc)
        setStatus('sem servidor')
      })
  }, [])

  useEffect(() => {
    if (!doc || !changed.current || status === 'sem servidor' || status === 'conflito') return
    setStatus('salvando')
    const timer = setTimeout(() => {
      changed.current = false
      const headers: Record<string, string> = { 'content-type': 'application/json' }
      if (version.current) headers['if-match'] = version.current
      fetch(API, { method: 'PUT', headers, body: JSON.stringify(doc) })
        .then(r => {
          if (r.ok) version.current = r.headers.get('etag')
          setStatus(r.ok ? 'salvo' : r.status === 409 ? 'conflito' : 'erro')
        })
        .catch(() => setStatus('erro'))
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [doc]) // eslint-disable-line react-hooks/exhaustive-deps

  // edição ainda não enviada: avisa antes de fechar a aba
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (status === 'salvando' || status === 'erro' || status === 'conflito') e.preventDefault()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [status])

  // guarda o estado anterior para o Ctrl+Z; a checagem de identidade evita duplicar no StrictMode
  const remember = (previous: Doc) => {
    const now = Date.now()
    if (now - lastEdit.current > UNDO_GROUP_MS && past.current.at(-1) !== previous) {
      past.current = [...past.current, previous].slice(-UNDO_LIMIT)
      future.current = []
    }
    lastEdit.current = now
  }

  /** Edita uma cópia do documento. */
  const update = (fn: (draft: Doc) => void) => {
    changed.current = true
    setDoc(d => {
      if (!d) return d
      remember(d)
      const draft = structuredClone(d)
      fn(draft)
      return draft
    })
  }
  const replace = (next: Doc) => {
    changed.current = true
    if (doc) remember(doc)
    setDoc(next)
  }
  /** Ctrl+Z (from = past) e Ctrl+Shift+Z (from = future). */
  const travel = (from: typeof past, to: typeof past) => {
    const target = from.current.at(-1)
    if (!doc || !target) return
    from.current = from.current.slice(0, -1)
    to.current = [...to.current, doc]
    lastEdit.current = 0
    changed.current = true
    setDoc(target)
  }
  const undo = () => travel(past, future)
  const redo = () => travel(future, past)
  return { doc, status, update, replace, undo, redo }
}

export async function readDoc(file: File): Promise<Doc> {
  const value = JSON.parse(await file.text())
  if (!isDoc(value)) throw new Error('arquivo não é um documento do viewgax')
  return value
}
