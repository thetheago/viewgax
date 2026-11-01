import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyNodeChanges, Background, Controls, ReactFlow, useNodesInitialized, useReactFlow,
  type FinalConnectionState, type Node, type NodeChange,
} from '@xyflow/react'
import { computeView, withAncestors, type NodeData } from './compute'
import { newId, removeFromView, type Doc, type View } from './doc'
import { ArrowMarkers, edgeTypes, SelectEdge } from './FloatingEdge'
import { autoLayout, fillMissing, hasValidPosition, PRESETS, toPositions, type Preset } from './layout'
import { nodeTypes } from './nodes'
import { Panel, type Selection } from './Panel'
import { Stepper } from './Stepper'

type Props = { doc: Doc; view: View; update: (fn: (d: Doc) => void) => void; editing: boolean; setEditing: (on: boolean) => void }

// fim de arrasto ou de redimensionamento = edição do usuário que vale salvar
const isEditEnd = (c: NodeChange) =>
  (c.type === 'position' && c.dragging === false) || (c.type === 'dimensions' && c.resizing === false)

// card copiado com Ctrl+C; vale entre visões
let copiedId: string | null = null
// visão de onde o duplo clique veio, para o "← voltar" da visão de detalhe
let cameFrom: string | null = null

const isTyping = (e: KeyboardEvent) => !!(e.target as HTMLElement).closest('input, textarea, select')

const groupColumns = (view: View) => (view.type === 'view' ? view.groups.map(g => g.id) : [])

function pointOf(event: MouseEvent | TouchEvent) {
  return 'changedTouches' in event ? event.changedTouches[0] : event
}

/** Ids ligados à seleção; o resto fica apagado. */
function related(edges: { id: string; source: string; target: string }[], selection: Selection): Set<string> | null {
  if (!selection) return null
  if (selection.type === 'edge') {
    const e = edges.find(x => x.id === selection.id)
    return e ? new Set([e.id, e.source, e.target]) : null
  }
  const ids = new Set([selection.id])
  for (const e of edges) {
    if (e.source !== selection.id && e.target !== selection.id) continue
    ids.add(e.id).add(e.source).add(e.target)
  }
  return ids
}

export function Diagram({ doc, view, update, editing, setEditing }: Props) {
  const computed = useMemo(() => computeView(doc, view), [doc, view])
  const [nodes, setNodes] = useState<Node<NodeData>[]>(computed.nodes)
  const [selection, setSelection] = useState<Selection>(null)
  const [status, setStatus] = useState('')
  const [pendingSave, setPendingSave] = useState(false)
  const { fitView, screenToFlowPosition } = useReactFlow()
  const [from] = useState(() => doc.views.find(v => v.id === cameFrom))
  useEffect(() => void (cameFrom = null), [])

  const editView = useCallback((fn: (v: View) => void) => update(d => fn(d.views.find(v => v.id === view.id)!)), [update, view.id])
  const savePositions = useCallback((next: Node[]) => editView(v => void (v.positions = toPositions(next))), [editView])

  // o documento mudou (edição, posição salva): redesenha
  useEffect(() => setNodes(computed.nodes), [computed])

  // card sem posição (novo no modelo, passo novo, grupo novo): o ELK escolhe, o resto fica
  useEffect(() => {
    if (computed.nodes.every(n => hasValidPosition(view.positions, n))) return
    fillMissing(computed.nodes, computed.edges, view.positions, groupColumns(view))
      .then(savePositions)
      .catch(err => setStatus(`erro no layout: ${err.message}`))
  }, [computed, view, savePositions])

  const onNodesChange = useCallback((changes: NodeChange<Node<NodeData>>[]) => {
    setNodes(ns => applyNodeChanges(changes, ns))
    if (changes.some(isEditEnd)) setPendingSave(true)
  }, [])

  useEffect(() => {
    if (!pendingSave) return
    savePositions(nodes)
    setPendingSave(false)
  }, [pendingSave, nodes, savePositions])

  // enquadra só ao abrir a visão; depois a câmera é do usuário (o prop fitView do xyflow falha no build)
  const initialized = useNodesInitialized()
  const fitted = useRef(false)
  useEffect(() => {
    if (!initialized || fitted.current) return
    fitted.current = true
    fitView()
  }, [initialized, fitView])

  // fluxo: aproxima a câmera do passo selecionado
  useEffect(() => {
    if (view.type !== 'flow' || selection?.type !== 'edge') return
    const s = view.steps.find(x => x.id === selection.id)
    if (s) fitView({ nodes: [{ id: s.source }, { id: s.target }], padding: 0.3, minZoom: 0.9, maxZoom: 1.2, duration: 300 }) // zoom mínimo: balão legível
  }, [view, selection, fitView])

  async function suggest(preset: Preset) {
    setStatus('calculando…')
    try {
      savePositions(await autoLayout(nodes, computed.edges, preset, groupColumns(view)))
      setStatus('')
      requestAnimationFrame(() => fitView({ duration: 300 }))
    } catch (err) {
      setStatus(`erro no layout: ${(err as Error).message}`)
    }
  }

  // centro da tela; se já tem card ali, anda para a direita até achar espaço
  const freeSpot = () => {
    const box = document.querySelector('.canvas')!.getBoundingClientRect()
    const spot = screenToFlowPosition({ x: box.x + box.width / 2 - 120, y: box.y + box.height / 2 - 45 })
    const roots = nodes.filter(n => !n.parentId)
    const taken = () => roots.some(n => Math.abs(n.position.x - spot.x) < 260 && Math.abs(n.position.y - spot.y) < 110)
    while (taken()) spot.x += 280
    return spot
  }

  function newCard() {
    const id = newId('el')
    update(d => {
      d.elements.push({ id, title: 'Novo card', kind: 'system', color: 'primary' })
      const v = d.views.find(x => x.id === view.id)!
      v.elements.push(id)
      v.positions[id] = freeSpot()
    })
    setSelection({ type: 'node', id })
  }

  function newGroup() {
    const id = newId('g')
    editView(v => {
      if (v.type !== 'view') return
      v.groups.push({ id, title: `Grupo ${v.groups.length + 1}`, elements: [] })
      v.positions[id] = { ...freeSpot(), w: 400, h: 300 }
    })
    setSelection({ type: 'node', id })
  }

  function addExisting(id: string) {
    editView(v => {
      v.elements.push(id)
      v.positions[id] = freeSpot()
    })
    setSelection({ type: 'node', id })
  }

  function pasteCopy() {
    const original = doc.elements.find(e => e.id === copiedId)
    if (!original) return
    const id = newId('el')
    update(d => {
      d.elements.push({ ...structuredClone(original), id, title: `${original.title} (cópia)` })
      const v = d.views.find(x => x.id === view.id)!
      v.elements.push(id)
      v.positions[id] = freeSpot()
    })
    setSelection({ type: 'node', id })
  }

  // Delete tira o card desta visão (continua no modelo); Ctrl+C / Ctrl+V duplica o card
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!editing || isTyping(e)) return
      const card = selection?.type === 'node' && doc.elements.some(x => x.id === selection.id) ? selection.id : null
      const ctrl = e.ctrlKey || e.metaKey
      const group = selection?.type === 'node' && view.type === 'view' && view.groups.some(g => g.id === selection.id) ? selection.id : null
      const isDelete = e.key === 'Delete' || e.key === 'Backspace'
      if (card && isDelete) {
        editView(v => removeFromView(v, card))
        setSelection(null)
      } else if (group && isDelete) {
        editView(v => void (v.type === 'view' && (v.groups = v.groups.filter(g => g.id !== group))))
        setSelection(null)
      } else if (card && ctrl && e.key === 'c') {
        copiedId = card
      } else if (ctrl && e.key === 'v') {
        pasteCopy()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // soltou a seta em cima de um card: cria comunicação (visão) ou próximo passo (fluxo)
  function onConnectEnd(event: MouseEvent | TouchEvent, state: FinalConnectionState) {
    const source = state.fromNode?.id
    const { clientX, clientY } = pointOf(event)
    const target = (document.elementFromPoint(clientX, clientY)?.closest('.react-flow__node') as HTMLElement | null)?.dataset.id
    if (!source || !target || source === target || !doc.elements.some(e => e.id === target)) return
    const id = newId(view.type === 'flow' ? 'step' : 'rel')
    if (view.type === 'flow') {
      const parents = [...withAncestors(doc, source), ...withAncestors(doc, target)]
      editView(v => {
        if (v.type !== 'flow') return
        v.steps.push({ id, source, target, title: 'Novo passo' })
        v.elements = [...new Set([...v.elements, ...parents])]
      })
      setSelection({ type: 'edge', id })
      return
    }
    update(d => void d.relations.push({ id, source, target, kind: 'http', title: 'Nova comunicação' }))
    setSelection({ type: 'edge', id: `${source}->${target}` })
  }

  const shown = new Set(nodes.map(n => n.id))
  const available = doc.elements.filter(e => !shown.has(e.id)).sort((a, b) => a.title.localeCompare(b.title))
  const highlight = related(computed.edges, selection)
  const dim = (id: string) => (highlight && !highlight.has(id) ? 0.2 : 1)
  const isSelected = (type: 'node' | 'edge', id: string) => selection?.type === type && selection.id === id
  const shownNodes = nodes.map(n => ({ ...n, selected: isSelected('node', n.id), style: { ...n.style, opacity: dim(n.id) } }))
  const shownEdges = computed.edges.map(e => ({
    ...e,
    selected: isSelected('edge', e.id),
    data: { ...e.data!, active: view.type === 'flow' && isSelected('edge', e.id) },
    style: { opacity: dim(e.id) },
  }))
  const edgeColors = [...new Set(computed.edges.map(e => e.data!.color))]
  const selectEdge = useCallback((id: string) => setSelection({ type: 'edge', id }), [])
  const openDetail = (id: string) => {
    const detail = doc.elements.find(e => e.id === id)?.detail
    if (!detail || detail === view.id) return
    cameFrom = view.id
    location.hash = detail
  }

  return (
    <div className={`diagram ${selection ? 'with-panel' : ''} ${editing ? 'editing' : 'reading'}`}>
      <div className="toolbar">
        {from && <a className="crumb" href={`#${from.id}`}>← {from.title || '(sem título)'}</a>}
        <input
          className="title-input"
          value={view.title}
          placeholder="Sem título"
          title={editing ? 'Clique para renomear' : undefined}
          readOnly={!editing}
          onChange={e => editView(v => void (v.title = e.target.value))}
        />
        {editing && (
          <>
            <button className="primary" onClick={newCard}>+ Novo card</button>
            {view.type === 'view' && <button onClick={newGroup}>+ Grupo</button>}
            <select value="" onChange={e => e.target.value && addExisting(e.target.value)}>
              <option value="">+ Card existente…</option>
              {available.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
            <select value="" onChange={e => e.target.value && suggest(e.target.value as Preset)}>
              <option value="">Sugerir layout…</option>
              {Object.entries(PRESETS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <span className="hint">Arraste o ● de um card até outro para {view.type === 'flow' ? 'criar um passo' : 'ligar'}.</span>
          </>
        )}
        {status && <span className="status">{status}</span>}
        <label className="mode-switch" title="Alternar entre visualizar e editar">
          <span className={editing ? '' : 'on'}>Visualizar</span>
          <input type="checkbox" role="switch" checked={editing} onChange={e => setEditing(e.target.checked)} />
          <span className={editing ? 'on' : ''}>Editar</span>
        </label>
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
            onConnectEnd={onConnectEnd}
            onNodeClick={(_, n) => setSelection({ type: 'node', id: n.id })}
            onNodeDoubleClick={(_, n) => openDetail(n.id)}
            nodesDraggable={editing}
            nodesConnectable={editing}
            zoomOnDoubleClick={false}
            onEdgeClick={(_, e) => setSelection({ type: 'edge', id: e.id })}
            onPaneClick={() => setSelection(null)}
            deleteKeyCode={null}
            minZoom={0.1}
          >
            <Background gap={20} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </SelectEdge.Provider>
        {view.type === 'flow' && <Stepper steps={view.steps} selection={selection} onSelect={setSelection} />}
      </div>
      <Panel key={selection ? `${selection.type}:${selection.id}` : 'none'} doc={doc} view={view} edges={computed.edges} selection={selection} onSelect={setSelection} update={update} editing={editing} onOpenDetail={openDetail} />
    </div>
  )
}
