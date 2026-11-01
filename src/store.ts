import { useEffect, useRef, useState } from 'react'
import seed from '../data/fortime.json'
import { isDoc, type Doc } from './doc'

const API = './api/doc'
const SAVE_DELAY_MS = 400

export type SaveStatus = 'carregando' | 'salvo' | 'salvando' | 'erro' | 'sem servidor'

/** Documento vem do servidor (arquivo no container) e é salvo sozinho a cada edição. */
export function useDoc() {
  const [doc, setDoc] = useState<Doc | null>(null)
  const [status, setStatus] = useState<SaveStatus>('carregando')
  const changed = useRef(false) // só salva o que o usuário editou, não o que acabou de carregar

  useEffect(() => {
    fetch(API)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
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
    if (!doc || !changed.current || status === 'sem servidor') return
    setStatus('salvando')
    const timer = setTimeout(() => {
      changed.current = false
      fetch(API, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(doc) })
        .then(r => setStatus(r.ok ? 'salvo' : 'erro'))
        .catch(() => setStatus('erro'))
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [doc]) // eslint-disable-line react-hooks/exhaustive-deps

  // edição ainda não enviada: avisa antes de fechar a aba
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (status === 'salvando' || status === 'erro') e.preventDefault()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [status])

  /** Edita uma cópia do documento. */
  const update = (fn: (draft: Doc) => void) => {
    changed.current = true
    setDoc(d => {
      if (!d) return d
      const draft = structuredClone(d)
      fn(draft)
      return draft
    })
  }
  const replace = (next: Doc) => {
    changed.current = true
    setDoc(next)
  }
  return { doc, status, update, replace }
}

export async function readDoc(file: File): Promise<Doc> {
  const value = JSON.parse(await file.text())
  if (!isDoc(value)) throw new Error('arquivo não é um documento do viewgax')
  return value
}
