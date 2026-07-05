import type { ArchitectureEdge, DiffEdge, EdgeDiffStatus } from '../types'

export type Side = 'top' | 'right' | 'bottom' | 'left'

export interface PositionedNode {
  id: string
  /** Absolute x of the node's top-left corner */
  x: number
  /** Absolute y of the node's top-left corner */
  y: number
  width: number
  height: number
}

/**
 * Pick which side of `a` an edge to `b` should leave from (and vice-versa for the
 * arriving side on `b`), based purely on the relative position of the two nodes.
 *
 * The rule is: the dominant axis of the center-to-center delta determines the
 * side. Horizontal dominance → right/left, vertical dominance → bottom/top.
 *
 * This guarantees that the (sourceSide, targetSide) pair is a pure function of
 * the geometry, so edges in opposite directions between the same pair of nodes
 * land on the same handle pair and can be merged.
 */
export function pickSides(a: PositionedNode, b: PositionedNode): { source: Side; target: Side } {
  const acx = a.x + a.width / 2
  const acy = a.y + a.height / 2
  const bcx = b.x + b.width / 2
  const bcy = b.y + b.height / 2

  const dx = bcx - acx
  const dy = bcy - acy

  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal relationship.
    if (dx >= 0) return { source: 'right', target: 'left' }
    return { source: 'left', target: 'right' }
  }
  // Vertical relationship.
  if (dy >= 0) return { source: 'bottom', target: 'top' }
  return { source: 'top', target: 'bottom' }
}

export function handleId(side: Side, kind: 'source' | 'target'): string {
  return `${side}-${kind === 'source' ? 's' : 't'}`
}

/** A canonical key for an unordered pair {a, b}. */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`
}

export interface RoutedEdgeInput {
  /** Stable id from upstream — preserved when this edge is rendered standalone. */
  id: string
  order: number
  source: string
  target: string
  label: string
  data: string
  animated?: boolean
  type?: string
  /** Pre-composed style string from the caller (e.g. status colors + dashed). */
  style?: string
  /** Diff status, only used when rendering merged edges so we can prioritise. */
  status?: EdgeDiffStatus
}

export interface RoutedEdgeOutput {
  id: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
  label: string
  animated: boolean
  type?: string
  style: string
  /** Marker on the arriving end (always shown). */
  markerEnd: { type: 'arrowclosed' }
  /** Marker on the leaving end — only present when the edge was merged from a
   *  bidirectional pair. */
  markerStart?: { type: 'arrowclosed' }
  /** True when this edge represents multiple underlying edges. */
  merged: boolean
}

/**
 * Given positioned nodes and raw edges, produce a list of routed Svelte Flow
 * edges where:
 *  - the source/target handle is chosen from the relative position of the two
 *    nodes (see `pickSides`),
 *  - edges between the same unordered pair of nodes are merged into a single
 *    edge. If any of them go in the opposite direction, the merged edge is
 *    rendered with arrows on both ends and the labels are combined.
 *
 * `positions` is keyed by node id and is expected to be in absolute coordinates.
 * Edges whose source or target is missing from `positions` are silently dropped
 * — the caller is responsible for the warning, just like before.
 */
export function routeEdges(
  positions: Map<string, PositionedNode>,
  edges: RoutedEdgeInput[]
): RoutedEdgeOutput[] {
  // Group by unordered pair, dropping edges with unknown endpoints.
  const groups = new Map<string, RoutedEdgeInput[]>()
  for (const edge of edges) {
    if (!positions.has(edge.source) || !positions.has(edge.target)) continue
    const key = pairKey(edge.source, edge.target)
    const list = groups.get(key) ?? []
    list.push(edge)
    groups.set(key, list)
  }

  const result: RoutedEdgeOutput[] = []

  for (const list of groups.values()) {
    // Determine the "primary" direction. We pick the direction of the
    // lowest-order edge in the group so that the visual arrow follows the
    // earliest interaction in time, which matches user expectation for
    // numbered flows.
    const sorted = [...list].sort((a, b) => a.order - b.order)
    const primary = sorted[0]
    const primarySource = primary.source
    const primaryTarget = primary.target

    const a = positions.get(primarySource)!
    const b = positions.get(primaryTarget)!
    const { source: sourceSide, target: targetSide } = pickSides(a, b)

    const hasReverse = sorted.some(
      (e) => e.source === primaryTarget && e.target === primarySource
    )

    // Build the composed label. When there's only one underlying edge keep it
    // as-is; otherwise join with newlines so each underlying edge stays
    // readable. Reverse-direction edges are prefixed with "←" to disambiguate.
    const labelLines = sorted.map((e) => {
      const text = `${e.order}. ${e.label}`
      if (sorted.length === 1) return text
      const reverse = e.source === primaryTarget && e.target === primarySource
      return `${reverse ? '← ' : '→ '}${text}`
    })

    // Choose representative style: prefer "added" > "removed" > "changed" >
    // first one. This keeps diff colours visible when a merged group mixes
    // statuses.
    const statusPriority: Record<EdgeDiffStatus, number> = {
      added: 3,
      removed: 2,
      changed: 1,
      unchanged: 0,
    }
    const styleSource = sorted.reduce((best, cur) => {
      const bp = best.status ? statusPriority[best.status] : -1
      const cp = cur.status ? statusPriority[cur.status] : -1
      return cp > bp ? cur : best
    }, sorted[0])

    const merged = sorted.length > 1
    const animated = sorted.some((e) => e.animated)
    // When merging, prefer a smooth curve so the bidirectional label has room.
    const type = merged ? 'smoothstep' : sorted[0].type

    result.push({
      id: merged
        ? `merged-${pairKey(primarySource, primaryTarget)}`
        : primary.id,
      source: primarySource,
      target: primaryTarget,
      sourceHandle: handleId(sourceSide, 'source'),
      targetHandle: handleId(targetSide, 'target'),
      label: labelLines.join('\n'),
      animated,
      type,
      style: styleSource.style ?? '',
      markerEnd: { type: 'arrowclosed' },
      markerStart: hasReverse ? { type: 'arrowclosed' } : undefined,
      merged,
    })
  }

  // Stable order: by primary edge order for predictable rendering.
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}

/** Convenience: extract the underlying `RoutedEdgeInput` shape from an
 *  ArchitectureEdge / DiffEdge, with a caller-supplied style string. */
export function toRoutedInput(
  edge: ArchitectureEdge | DiffEdge,
  style: string,
  options: { animated?: boolean; type?: string } = {}
): RoutedEdgeInput {
  const status = (edge as DiffEdge).status
  return {
    id: status
      ? `${edge.order}-${edge.source}-${edge.target}-${status}`
      : `${edge.order}-${edge.source}-${edge.target}`,
    order: edge.order,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    data: edge.data,
    animated: options.animated,
    type: options.type,
    style,
    status,
  }
}
