import type { CSSProperties } from 'react'
import { Handle, NodeResizer, Position, type Node, type NodeProps } from '@xyflow/react'
import { colorOf } from './colors'
import { CARD_W, type NodeData } from './compute'
import { Icon } from './Icon'

// alvo invisível; a seta é solta em cima do card (Diagram.onConnectEnd) e desenhada pela FloatingEdge
const Handles = () => (
  <>
    <Handle type="target" position={Position.Left} className="handle" isConnectableStart={false} />
    <Handle type="source" position={Position.Right} className="handle-source" title="Arraste até outro card" />
  </>
)

export function Card({ data, selected }: NodeProps<Node<NodeData>>) {
  return (
    <div className={`card ${selected ? 'selected' : ''}`} style={{ width: CARD_W, '--c': colorOf(data.color) } as CSSProperties}>
      <Handles />
      <div className="card-head">
        <span className="chip"><Icon name={data.icon ?? 'bootstrap:box'} /></span>
        <div>
          <div className="card-title">{data.title}</div>
          {data.technology && <div className="card-tech">{data.technology}</div>}
        </div>
        {data.detail && <span className="detail-mark" title="Duplo clique abre o detalhe">⤢</span>}
      </div>
      {data.description && <div className="card-desc">{data.description}</div>}
    </div>
  )
}

export function Container({ data, selected }: NodeProps<Node<NodeData>>) {
  const color = colorOf(data.color)
  return (
    <div className={`container ${data.group ? 'group' : ''} ${selected ? 'selected' : ''}`} style={{ '--c': color } as CSSProperties}>
      <NodeResizer isVisible={selected} minWidth={200} minHeight={120} color={color} />
      {!data.group && <Handles />}
      <div className="container-head">
        <Icon name={data.icon} />
        <span>{data.title}</span>
        {data.detail && <span className="detail-mark" title="Duplo clique abre o detalhe">⤢</span>}
      </div>
    </div>
  )
}

export const nodeTypes = { card: Card, container: Container }
