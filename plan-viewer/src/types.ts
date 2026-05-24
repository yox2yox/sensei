export type C4Layer = 'context' | 'container' | 'component' | 'code'

export type GlossaryType =
  // Context layer
  | 'person'
  | 'external-system'
  // Container layer
  | 'client'
  | 'server'
  | 'cloud-service'
  | 'db'
  // Component layer
  | 'class'
  | 'module'
  // Code layer
  | 'function'
  | 'table'
  | 'interface'

export interface GlossaryItem {
  id: string
  type: GlossaryType
  name: string
  description?: string
  icon?: string
  parentId?: string
  analogy?: string
  responsibility?: string
  evidence?: Evidence[]
}

export interface CodeSnippet {
  language?: string
  code: string | string[]
  label?: string
  path?: string
  startLine?: number
  endLine?: number
}

export interface ArchitectureEdge {
  order: number
  source: string
  target: string
  label: string
  data: string
  sourcePosition?: NodePortPosition
  targetPosition?: NodePortPosition
  edgeType?: EdgeRenderType
  edgeStyle?: EdgeRenderStyle
  animated?: boolean
}

export interface Evidence {
  path?: string
  startLine?: number
  endLine?: number
  label?: string
  codeSnippets?: CodeSnippet
}

export interface Metaphor {
  title: string
  description: string
}

export interface StoryScene {
  title: string
  actor?: string
  action: string
  result?: string
  edgeRefs?: number[]
  evidence?: Evidence[]
}

export interface ArchitectureDiagram {
  edges: ArchitectureEdge[]
  diagramOptions?: DiagramOptions
}

export type ArchitectureDiagramsByLayer = Partial<Record<C4Layer, ArchitectureDiagram>>

export interface FlowState {
  architectureDiagrams?: ArchitectureDiagramsByLayer
  storyTitle?: string
  scenes?: StoryScene[]
  takeaway?: string
}

export interface Example {
  title?: string
  condition?: string
  currentState?: FlowState
  proposedState?: FlowState
}

export interface Concern {
  title: string
  workflowPosition?: string
  examples?: Example[]
  safeguards?: string[]
  takeaway?: string
}

export interface Plan {
  title: string
  description: string
  glossary: GlossaryItem[]
  metaphor?: Metaphor
  takeaway?: string
  pairs: Concern[]
}

export type NodePortPosition = 'top' | 'right' | 'bottom' | 'left'
export type EdgeRenderType = 'default' | 'straight' | 'step' | 'smoothstep'
export type EdgeRenderStyle = 'solid' | 'dashed' | 'dotted' | 'bold'

export interface DiagramNodePosition {
  x: number
  y: number
}

export interface DiagramEdgeOptions {
  sourcePosition?: NodePortPosition
  targetPosition?: NodePortPosition
  type?: EdgeRenderType
  style?: EdgeRenderStyle
  animated?: boolean
}

export interface DiagramOptions {
  nodePositions?: Record<string, DiagramNodePosition>
  edges?: Record<string, DiagramEdgeOptions>
}

export type EdgeDiffStatus = 'added' | 'changed' | 'removed' | 'unchanged'

export interface DiffEdge {
  order: number
  source: string
  target: string
  label: string
  data: string
  status: EdgeDiffStatus
}
