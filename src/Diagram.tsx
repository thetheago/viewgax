import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyNodeChanges, Background, Controls, ReactFlow, useNodesInitialized, useReactFlow,
  type Edge, type Node, type NodeChange,
} from '@xyflow/react'
import { applySaved, autoLayout, isSaved, PRESETS, toSaved, type Preset } from './layout'
import { isDynamic, toFlow, type CardData, type Data, type EdgeData, type View } from './model'
import { nodeTypes } from './nodes'
import { ArrowMarkers, edgeTypes, SelectEdge } from './FloatingEdge'
import { SidePanel, type Selection } from './SidePanel'
import { Stepper } from './Stepper'
import { clearLocal, download, fileLayout, localLayout, saveLocal } from './storage'

type Source = 'local' | 'arquivo' | 'automático'

const sourceOf = (viewId: string): Source =>
  localLayout(viewId) ? 'local' : fileLayout(viewId) ? 'arquivo' : 'automático'

function initialNodes(view: View) {
  return applySaved(toFlow(view).nodes, localLayout(view.id) ?? fileLayout(view.id))
}

// fim de arrasto ou de redimensionamento = edição do usuário que vale salvar
const isEditEnd = (c: NodeChange) =>
  (c.type === 'position' && c.dragging === false) || (c.type === 'dimensions' && c.resizing === false)

/** Ids ligados à seleção; o resto fica apagado. */
function related(view: View, selection: Selection): Set<string> | null {
  if (!selection) return null
  if (selection.type === 'edge') {
    const e = view.edges.find(x => x.id === selection.id)
    return e ? new Set([e.id, e.source, e.target]) : null
  }
  const ids = new Set([selection.id])
  for (const e of view.edges) {
    if (e.source !== selection.id && e.target !== selection.id) continue
    ids.add(e.id).add(e.source).add(e.target)
  }
  return ids
}

const groupColumns = (view: View) => view.nodes.filter(n => n.kind === '@group' && !n.parent).map(n => n.id)

export function Diagram({ data, view }: { data: Data; view: View }) {
  const flow = useMemo(() => toFlow(view), [view])
  const [nodes, setNodes] = useState<Node<CardData>[]>(() => initialNodes(view))
  const [selection, setSelection] = useState<Selection>(null)
  const [source, setSource] = useState<Source>(() => sourceOf(view.id))
  const [status, setStatus] = useState('')
  const [pendingSave, setPendingSave] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const { fitView } = useReactFlow()

  const persist = useCallback((next: Node[]) => {
    saveLocal(toSaved(view.id, next))
    setSource('local')
  }, [view.id])

  const onNodesChange = useCallback((changes: NodeChange<Node<CardData>>[]) => {
    setNodes(ns => applyNodeChanges(changes, ns))
    if (changes.some(isEditEnd)) setPendingSave(true)
  }, [])

  useEffect(() => {
    if (!pendingSave) return
    persist(nodes)
    setPendingSave(false)
  }, [pendingSave, nodes, persist])

  const replaceNodes = (next: Node<CardData>[]) => {
    setNodes(next)
    persist(next)
    requestAnimationFrame(() => fitView({ duration: 300 }))
  }

  async function suggest(preset: Preset) {
    setStatus('calculando…')
    try {
      replaceNodes(await autoLayout(nodes, flow.edges, preset, groupColumns(view)))
      setStatus('')
    } catch (err) {
      setStatus(`erro no layout: ${(err as Error).message}`)
    }
  }

  async function importFile(file: File) {
    try {
      const value = JSON.parse(await file.text())
      if (!isSaved(value)) throw new Error('arquivo não é um layout do viewgax')
      if (value.viewId !== view.id) throw new Error(`layout é da visão "${value.viewId}"`)
      replaceNodes(applySaved(nodes, value))
      setStatus('')
    } catch (err) {
      setStatus(`importação falhou: ${(err as Error).message}`)
    }
  }

  function discardLocal() {
    clearLocal(view.id)
    setNodes(initialNodes(view))
    setSource(sourceOf(view.id))
  }

  // o prop fitView do xyflow às vezes dispara antes da medição no build de produção
  const initialized = useNodesInitialized()
  useEffect(() => {
    if (initialized) fitView()
  }, [initialized, fitView])

  // fluxo dinâmico: aproxima a câmera do passo selecionado
  useEffect(() => {
    if (!isDynamic(view) || selection?.type !== 'edge') return
    const e = view.edges.find(x => x.id === selection.id)
    if (e) fitView({ nodes: [{ id: e.source }, { id: e.target }], padding: 0.6, maxZoom: 1.2, duration: 300 })
  }, [view, selection, fitView])

  const highlight = related(view, selection)
  const dim = (id: string) => (highlight && !highlight.has(id) ? 0.2 : 1)
  const shownNodes = nodes.map(n => ({ ...n, style: { ...n.style, opacity: dim(n.id) } }))
  const shownEdges: Edge<EdgeData>[] = flow.edges.map(e => ({
    ...e,
    selected: selection?.type === 'edge' && selection.id === e.id,
    style: { opacity: dim(e.id) },
  }))
  const edgeColors = [...new Set(view.edges.map(e => e.color))]
  const selectEdge = useCallback((id: string) => setSelection({ type: 'edge', id }), [])

  return (
    <div className="diagram">
      <div className="toolbar">
        <h1>{view.title ?? view.id}</h1>
        <label>
          Sugerir layout
          <select value="" onChange={e => e.target.value && suggest(e.target.value as Preset)}>
            <option value="">escolha…</option>
            {Object.entries(PRESETS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <button onClick={() => download(toSaved(view.id, nodes))}>Baixar layout</button>
        <button onClick={() => fileInput.current?.click()}>Importar layout</button>
        <input ref={fileInput} type="file" accept=".json" hidden onChange={e => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) importFile(file)
        }} />
        <button onClick={discardLocal} disabled={source !== 'local'}>Descartar alterações locais</button>
        <span className={`source ${source}`}>
          layout: {source}{source === 'local' && ' — baixe e commite em layouts/'}
        </span>
        {status && <span className="status">{status}</span>}
      </div>
      <div className="canvas">
        <ArrowMarkers colors={edgeColors} />
        <SelectEdge.Provider value={selectEdge}>
          <ReactFlow
            nodes={shownNodes}
            edges={shownEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onNodeClick={(_, n) => setSelection({ type: 'node', id: n.id })}
            onEdgeClick={(_, e) => setSelection({ type: 'edge', id: e.id })}
            onPaneClick={() => setSelection(null)}
            nodesConnectable={false}
            minZoom={0.1}
          >
            <Background gap={20} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </SelectEdge.Provider>
        {isDynamic(view) && <Stepper view={view} selection={selection} onSelect={setSelection} />}
      </div>
      <SidePanel data={data} view={view} selection={selection} onSelect={setSelection} />
    </div>
  )
}
