import type {
  ArchitectureDiagram,
  C4Layer,
  Concern,
  Example,
  FlowState,
  GlossaryItem,
  Plan,
} from '../types'
import { C4_LAYERS, GLOSSARY_TYPE_TO_LAYER } from './c4'

export interface NormalizedPlan {
  pairs: Concern[]
}

export interface LayerViolation {
  path: string
  itemId: string
  itemType: string
  expectedLayer: C4Layer
}

function exampleHasContent(ex: Example): boolean {
  return Boolean(
    ex.currentState !== undefined ||
      ex.proposedState !== undefined ||
      ex.condition ||
      ex.title,
  )
}

function concernHasVisibleContent(c: Concern): boolean {
  return Boolean(
    c.currentState !== undefined ||
      c.proposedState !== undefined ||
      c.testCases?.length ||
      (c.examples ?? []).some(exampleHasContent) ||
      c.safeguards?.length ||
      c.takeaway,
  )
}

function checkDiagramLayer(
  layer: C4Layer,
  diagram: ArchitectureDiagram | undefined,
  glossaryById: Map<string, GlossaryItem>,
  pathPrefix: string,
  violations: LayerViolation[],
): void {
  if (!diagram) return
  for (let i = 0; i < diagram.edges.length; i++) {
    const edge = diagram.edges[i]
    for (const role of ['source', 'target'] as const) {
      const id = edge[role]
      const item = glossaryById.get(id)
      if (!item) continue
      const itemLayer = GLOSSARY_TYPE_TO_LAYER[item.type]
      if (itemLayer !== layer) {
        violations.push({
          path: `${pathPrefix}.edges[${i}].${role}`,
          itemId: id,
          itemType: item.type,
          expectedLayer: layer,
        })
      }
    }
  }
}

function checkState(
  state: FlowState | undefined,
  glossaryById: Map<string, GlossaryItem>,
  pathPrefix: string,
  violations: LayerViolation[],
): void {
  if (!state?.architectureDiagrams) return
  for (const layer of C4_LAYERS) {
    const diagram = state.architectureDiagrams[layer]
    checkDiagramLayer(
      layer,
      diagram,
      glossaryById,
      `${pathPrefix}.architectureDiagrams.${layer}`,
      violations,
    )
  }
}

/**
 * Return layer violations: edge endpoints whose glossary type does not match
 * the diagram's layer. Returns an empty array when the plan is layer-clean.
 */
export function collectLayerViolations(plan: Plan): LayerViolation[] {
  const violations: LayerViolation[] = []
  const glossaryById = new Map(plan.glossary.map((g) => [g.id, g]))
  ;(plan.pairs ?? []).forEach((concern, ci) => {
    checkState(concern.currentState, glossaryById, `pairs[${ci}].currentState`, violations)
    checkState(concern.proposedState, glossaryById, `pairs[${ci}].proposedState`, violations)
    ;(concern.examples ?? []).forEach((example, ei) => {
      const base = `pairs[${ci}].examples[${ei}]`
      checkState(example.currentState, glossaryById, `${base}.currentState`, violations)
      checkState(example.proposedState, glossaryById, `${base}.proposedState`, violations)
    })
  })
  return violations
}

export function normalizePlan(plan: Plan): NormalizedPlan {
  const pairs = Array.isArray(plan.pairs) ? plan.pairs : []
  if (pairs.length === 0) {
    throw new Error('pairs must not be empty')
  }
  const violations = collectLayerViolations(plan)
  if (violations.length > 0) {
    const first = violations[0]
    const summary =
      `architecture diagram references a glossary item whose layer does not match. ` +
      `at ${first.path}: id=${first.itemId} type=${first.itemType} (expected layer: ${first.expectedLayer})` +
      (violations.length > 1 ? ` (+${violations.length - 1} more)` : '')
    throw new Error(summary)
  }
  return { pairs: pairs.filter(concernHasVisibleContent) }
}
