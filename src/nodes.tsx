import { Handle, NodeResizer, Position, type Node, type NodeProps } from '@xyflow/react'
import { IconRenderer } from 'likec4:single-project'
import { colorOf } from './colors'
import { CARD_W, textOf, type CardData } from './model'

const isGroup = (kind: string) => kind === '@group'

// handles invisíveis: as setas são "flutuantes" (FloatingEdge calcula a borda)
const Handles = () => (
  <>
    <Handle type="target" position={Position.Left} className="handle" />
    <Handle type="source" position={Position.Right} className="handle" />
  </>
)

function Icon({ node }: CardData) {
  if (!node.icon) return null
  return <span className="icon"><IconRenderer node={node} /></span>
}

export function Card({ data, selected }: NodeProps<Node<CardData>>) {
  const { node } = data
  const description = textOf(node.description)
  return (
    <div className={`card ${selected ? 'selected' : ''}`} style={{ width: CARD_W, borderTopColor: colorOf(node.color) }}>
      <Handles />
      <div className="card-head">
        <Icon node={node} />
        <div className="card-title">{node.title}</div>
      </div>
      {node.technology && <div className="card-tech">{node.technology}</div>}
      {description && <div className="card-desc">{description}</div>}
    </div>
  )
}

export function Container({ data, selected }: NodeProps<Node<CardData>>) {
  const { node } = data
  const color = colorOf(node.color)
  return (
    <div className={`container ${isGroup(node.kind) ? 'group' : ''} ${selected ? 'selected' : ''}`} style={{ borderColor: color }}>
      <NodeResizer isVisible={selected} minWidth={200} minHeight={120} color={color} />
      <Handles />
      <div className="container-head" style={{ color }}>
        <Icon node={node} />
        <span>{node.title}</span>
      </div>
    </div>
  )
}

export const nodeTypes = { card: Card, container: Container }
