// zod による Plan スキーマ定義。
// JSON Schema (reference/plan.schema.json) では表現しきれない参照整合性は、
// このファイル後半の `validateReferences` として実装する。

import { z } from 'zod'

export const CodeSnippet = z
  .object({
    language: z.string().optional(),
    code: z.union([z.string(), z.array(z.string())]),
    label: z.string().optional(),
    path: z.string().optional(),
    startLine: z.number().int().min(1).optional(),
    endLine: z.number().int().min(1).optional(),
  })
  .strict()

export const Evidence = z
  .object({
    path: z.string().min(1).optional(),
    startLine: z.number().int().min(1).optional(),
    endLine: z.number().int().min(1).optional(),
    label: z.string().optional(),
    codeSnippets: CodeSnippet.optional(),
  })
  .strict()

export const Metaphor = z
  .object({
    title: z.string(),
    description: z.string(),
  })
  .strict()

const Position = z.enum(['top', 'right', 'bottom', 'left'])
const EdgeType = z.enum(['default', 'straight', 'step', 'smoothstep'])
const EdgeStyle = z.enum(['solid', 'dashed', 'dotted', 'bold'])

export const C4Layer = z.enum(['context', 'container', 'component', 'code'])

export const GlossaryType = z.enum([
  // Context layer
  'person',
  'external-system',
  // Container layer
  'client',
  'server',
  'cloud-service',
  'db',
  // Component layer
  'class',
  'module',
  // Code layer
  'function',
  'table',
  'interface',
])

export const GLOSSARY_TYPE_TO_LAYER = {
  'person': 'context',
  'external-system': 'context',
  'client': 'container',
  'server': 'container',
  'cloud-service': 'container',
  'db': 'container',
  'class': 'component',
  'module': 'component',
  'function': 'code',
  'table': 'code',
  'interface': 'code',
}

export const ArchitectureEdge = z
  .object({
    order: z.number().int().min(1),
    source: z.string(),
    target: z.string(),
    label: z.string(),
    data: z.string(),
    sourcePosition: Position.optional(),
    targetPosition: Position.optional(),
    edgeType: EdgeType.optional(),
    edgeStyle: EdgeStyle.optional(),
    animated: z.boolean().optional(),
  })
  .strict()

export const StoryScene = z
  .object({
    title: z.string().min(1),
    actor: z.string().optional(),
    action: z.string().min(1),
    result: z.string().optional(),
    edgeRefs: z.array(z.number().int().min(1)).optional(),
    evidence: z.array(Evidence).optional(),
  })
  .strict()

export const DiagramOptions = z
  .object({
    nodePositions: z
      .record(
        z.string(),
        z.object({ x: z.number(), y: z.number() }).strict(),
      )
      .optional(),
    edges: z
      .record(
        z.string(),
        z
          .object({
            sourcePosition: Position.optional(),
            targetPosition: Position.optional(),
            type: EdgeType.optional(),
            style: EdgeStyle.optional(),
            animated: z.boolean().optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict()

export const GlossaryItem = z
  .object({
    id: z.string().min(1),
    type: GlossaryType,
    name: z.string(),
    icon: z.string(),
    description: z.string().optional(),
    parentId: z.string().optional(),
    analogy: z.string().optional(),
    responsibility: z.string().optional(),
    evidence: z.array(Evidence).optional(),
  })
  .strict()

export const ArchitectureDiagram = z
  .object({
    edges: z.array(ArchitectureEdge),
    diagramOptions: DiagramOptions.optional(),
  })
  .strict()

export const ArchitectureDiagrams = z
  .object({
    context: ArchitectureDiagram.optional(),
    container: ArchitectureDiagram.optional(),
    component: ArchitectureDiagram.optional(),
    code: ArchitectureDiagram.optional(),
  })
  .strict()

export const State = z
  .object({
    architectureDiagrams: ArchitectureDiagrams.optional(),
    storyTitle: z.string().optional(),
    scenes: z.array(StoryScene).optional(),
    takeaway: z.string().optional(),
  })
  .strict()

export const Example = z
  .object({
    title: z.string(),
    condition: z.string().optional(),
    currentState: State.optional(),
    proposedState: State.optional(),
  })
  .strict()

export const Concern = z
  .object({
    title: z.string(),
    examples: z.array(Example).optional(),
    safeguards: z.array(z.string()).optional(),
    takeaway: z.string().optional(),
  })
  .strict()

export const Plan = z
  .object({
    title: z.string(),
    description: z.string(),
    metaphor: Metaphor.optional(),
    takeaway: z.string().optional(),
    glossary: z.array(GlossaryItem).min(1),
    pairs: z.array(Concern).min(1),
  })
  .strict()

const LAYERS = ['context', 'container', 'component', 'code']

// 参照整合性チェック。zod / JSON Schema では表現できない制約を扱う。
// 戻り値は { path: string, message: string } の配列（空なら問題なし）。
export function validateReferences(plan) {
  const errors = []
  const push = (path, message) => errors.push({ path, message })

  // glossary id 集合・重複検出
  const ids = new Set()
  const itemById = new Map()
  for (let i = 0; i < plan.glossary.length; i++) {
    const item = plan.glossary[i]
    if (ids.has(item.id)) {
      push(`glossary[${i}].id`, `duplicate glossary id: ${JSON.stringify(item.id)}`)
    }
    ids.add(item.id)
    itemById.set(item.id, item)
  }

  // parentId は ids に存在
  for (let i = 0; i < plan.glossary.length; i++) {
    const item = plan.glossary[i]
    if (item.parentId !== undefined && !ids.has(item.parentId)) {
      push(
        `glossary[${i}].parentId`,
        `unknown parentId: ${JSON.stringify(item.parentId)}`,
      )
    }
  }

  // parentId のサイクル検出 & 深さ ≤ 3
  const parentOf = new Map(plan.glossary.map((g) => [g.id, g.parentId]))
  for (const item of plan.glossary) {
    let depth = 1
    let cursor = item.parentId
    const seen = new Set([item.id])
    while (cursor !== undefined) {
      if (seen.has(cursor)) {
        push(`glossary[id=${item.id}].parentId`, `cycle in parentId chain via ${cursor}`)
        break
      }
      seen.add(cursor)
      depth++
      if (depth > 3) {
        push(
          `glossary[id=${item.id}]`,
          `nesting depth exceeds 3 (viewer drops depth 4+ nodes)`,
        )
        break
      }
      cursor = parentOf.get(cursor)
    }
  }

  // state 単位の検査
  const checkState = (statePath, state) => {
    if (!state) return
    const diagrams = state.architectureDiagrams ?? {}
    // edge order must be unique within a state and together form 1..N so that
    // scene.edgeRefs can resolve unambiguously across layers.
    const orderSet = new Set()
    const orderLocations = new Map()

    for (const layer of LAYERS) {
      const diagram = diagrams[layer]
      if (!diagram) continue
      const dPath = `${statePath}.architectureDiagrams.${layer}`
      diagram.edges.forEach((edge, i) => {
        const ePath = `${dPath}.edges[${i}]`
        if (orderSet.has(edge.order)) {
          push(
            `${ePath}.order`,
            `duplicate edge order ${edge.order} across diagrams in the same state (also seen at ${orderLocations.get(edge.order)})`,
          )
        }
        orderSet.add(edge.order)
        orderLocations.set(edge.order, ePath)
        for (const role of ['source', 'target']) {
          const id = edge[role]
          if (!ids.has(id)) {
            push(`${ePath}.${role}`, `unknown glossary id: ${JSON.stringify(id)}`)
            continue
          }
          const item = itemById.get(id)
          if (GLOSSARY_TYPE_TO_LAYER[item.type] !== layer) {
            push(
              `${ePath}.${role}`,
              `glossary id ${JSON.stringify(id)} has type ${JSON.stringify(item.type)} ` +
                `which belongs to layer ${JSON.stringify(GLOSSARY_TYPE_TO_LAYER[item.type])}, ` +
                `but this diagram is for layer ${JSON.stringify(layer)}`,
            )
          }
        }
      })

      const dOptions = diagram.diagramOptions
      if (dOptions?.nodePositions) {
        for (const key of Object.keys(dOptions.nodePositions)) {
          if (!ids.has(key)) {
            push(
              `${dPath}.diagramOptions.nodePositions[${JSON.stringify(key)}]`,
              `unknown glossary id`,
            )
          }
        }
      }
      if (dOptions?.edges) {
        const orderSetForLayer = new Set(diagram.edges.map((e) => e.order))
        for (const key of Object.keys(dOptions.edges)) {
          const ePath = `${dPath}.diagramOptions.edges[${JSON.stringify(key)}]`
          if (/^\d+$/.test(key)) {
            if (!orderSetForLayer.has(Number(key))) {
              push(ePath, `references unknown architecture edge order in this layer: ${key}`)
            }
          } else if (key.includes('->')) {
            const [src, tgt] = key.split('->')
            if (!ids.has(src)) push(ePath, `source id unknown: ${JSON.stringify(src)}`)
            if (!ids.has(tgt)) push(ePath, `target id unknown: ${JSON.stringify(tgt)}`)
          } else {
            push(
              ePath,
              `key must be either "<order>" (e.g. "1") or "source->target"`,
            )
          }
        }
      }
    }

    // The union of all orders across the layers in this state should be 1..N.
    if (orderSet.size > 0) {
      const sorted = [...orderSet].sort((a, b) => a - b)
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i] !== i + 1) {
          push(
            `${statePath}.architectureDiagrams`,
            `edge orders across layers must form 1..${sorted.length} (got [${sorted.join(', ')}])`,
          )
          break
        }
      }
    }

    // scenes
    const scenes = state.scenes ?? []
    scenes.forEach((scene, i) => {
      const sPath = `${statePath}.scenes[${i}]`
      if (scene.actor !== undefined && !ids.has(scene.actor)) {
        push(`${sPath}.actor`, `unknown glossary id: ${JSON.stringify(scene.actor)}`)
      }
      ;(scene.edgeRefs ?? []).forEach((ord, j) => {
        if (!orderSet.has(ord)) {
          push(
            `${sPath}.edgeRefs[${j}]`,
            `unknown architecture edge order in this state: ${ord}`,
          )
        }
      })
    })
  }

  ;(plan.pairs ?? []).forEach((concern, i) => {
    ;(concern.examples ?? []).forEach((example, j) => {
      const base = `pairs[${i}].examples[${j}]`
      checkState(`${base}.currentState`, example.currentState)
      checkState(`${base}.proposedState`, example.proposedState)
    })
  })

  return errors
}
