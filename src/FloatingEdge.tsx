import { createContext, useContext } from 'react'
import {
  BaseEdge, EdgeLabelRenderer, getBezierPath, Position, useInternalNode,
  type Edge, type EdgeProps, type InternalNode,
} from '@xyflow/react'
import { colorOf } from './colors'
import type { EdgeData } from './model'

/** Clique no rótulo seleciona a seta (o rótulo fica fora do SVG da seta). */
export const SelectEdge = createContext<(id: string) => void>(() => {})

type Point = { x: number; y: number }

function rectOf(node: InternalNode) {
  const { x, y } = node.internals.positionAbsolute
  return { x, y, w: node.measured.width ?? 0, h: node.measured.height ?? 0 }
}
const centerOf = (node: InternalNode): Point => {
  const r = rectOf(node)
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
}

// ponto onde a reta entre os centros cruza a borda do nó
function borderPoint(node: InternalNode, toward: Point): Point {
  const r = rectOf(node)
  const c = centerOf(node)
  const dx = toward.x - c.x
  const dy = toward.y - c.y
  const scale = 1 / Math.max(Math.abs(dx) / (r.w / 2), Math.abs(dy) / (r.h / 2), 1e-6)
  return { x: c.x + dx * scale, y: c.y + dy * scale }
}

function sideOf(node: InternalNode, p: Point): Position {
  const r = rectOf(node)
  if (p.x <= r.x + 1) return Position.Left
  if (p.x >= r.x + r.w - 1) return Position.Right
  if (p.y <= r.y + 1) return Position.Top
  return Position.Bottom
}

const DASH: Record<string, string | undefined> = { dashed: '7 5', dotted: '2 5' }

export function FloatingEdge({ id, source, target, data, selected, style }: EdgeProps<Edge<EdgeData>>) {
  const select = useContext(SelectEdge)
  const s = useInternalNode(source)
  const t = useInternalNode(target)
  if (!s || !t || !data) return null

  const sp = borderPoint(s, centerOf(t))
  const tp = borderPoint(t, centerOf(s))
  const [path, lx, ly] = getBezierPath({
    sourceX: sp.x, sourceY: sp.y, sourcePosition: sideOf(s, sp),
    targetX: tp.x, targetY: tp.y, targetPosition: sideOf(t, tp),
  })
  const color = colorOf(data.edge.color)
  const label = data.edge.label

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={18}
        markerEnd={`url(#arrow-${data.edge.color})`}
        style={{ stroke: color, strokeWidth: selected ? 3 : 1.6, strokeDasharray: DASH[data.edge.line], ...style }}
      />
      {(label || data.step) && (
        <EdgeLabelRenderer>
          <div
            className={`edge-label nodrag nopan ${selected ? 'selected' : ''}`}
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`, opacity: style?.opacity }}
            onClick={() => select(id)}
          >
            {data.step && <b className="step" style={{ background: color }}>{data.step}</b>}
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

/** Um marcador de ponta de seta por cor (o markerEnd do xyflow não herda a cor do traço). */
export function ArrowMarkers({ colors }: { colors: string[] }) {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {colors.map(c => (
          <marker key={c} id={`arrow-${c}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={colorOf(c)} />
          </marker>
        ))}
      </defs>
    </svg>
  )
}

export const edgeTypes = { floating: FloatingEdge }
