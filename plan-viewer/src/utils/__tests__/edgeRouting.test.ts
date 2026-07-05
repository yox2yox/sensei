import { describe, expect, it } from 'vitest'
import {
  pickSides,
  routeEdges,
  type PositionedNode,
  type RoutedEdgeInput,
} from '../edgeRouting'

function pos(id: string, x: number, y: number, w = 100, h = 50): PositionedNode {
  return { id, x, y, width: w, height: h }
}

function input(
  id: string,
  source: string,
  target: string,
  order: number,
  extras: Partial<RoutedEdgeInput> = {}
): RoutedEdgeInput {
  return {
    id,
    source,
    target,
    order,
    label: extras.label ?? `lbl-${id}`,
    data: extras.data ?? `data-${id}`,
    style: extras.style,
    status: extras.status,
    animated: extras.animated,
    type: extras.type,
  }
}

describe('pickSides', () => {
  it('uses right/left when target is to the right', () => {
    const a = pos('a', 0, 0)
    const b = pos('b', 300, 10)
    expect(pickSides(a, b)).toEqual({ source: 'right', target: 'left' })
  })

  it('uses left/right when target is to the left', () => {
    const a = pos('a', 300, 0)
    const b = pos('b', 0, 0)
    expect(pickSides(a, b)).toEqual({ source: 'left', target: 'right' })
  })

  it('uses bottom/top when target is below and vertical dominates', () => {
    const a = pos('a', 0, 0)
    const b = pos('b', 10, 400)
    expect(pickSides(a, b)).toEqual({ source: 'bottom', target: 'top' })
  })

  it('uses top/bottom when target is above and vertical dominates', () => {
    const a = pos('a', 0, 400)
    const b = pos('b', 10, 0)
    expect(pickSides(a, b)).toEqual({ source: 'top', target: 'bottom' })
  })

  it('is symmetric — swapping A and B inverts the sides', () => {
    const a = pos('a', 0, 0)
    const b = pos('b', 300, 0)
    const ab = pickSides(a, b)
    const ba = pickSides(b, a)
    expect(ab.source).toBe(ba.target)
    expect(ab.target).toBe(ba.source)
  })
})

describe('routeEdges', () => {
  it('drops edges with unknown endpoints', () => {
    const positions = new Map([['a', pos('a', 0, 0)]])
    const result = routeEdges(positions, [input('e1', 'a', 'ghost', 1)])
    expect(result).toEqual([])
  })

  it('emits a single routed edge with handles derived from geometry', () => {
    const positions = new Map([
      ['a', pos('a', 0, 0)],
      ['b', pos('b', 300, 0)],
    ])
    const result = routeEdges(positions, [input('e1', 'a', 'b', 1)])
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      source: 'a',
      target: 'b',
      sourceHandle: 'right-s',
      targetHandle: 'left-t',
      merged: false,
    })
    expect(result[0].markerStart).toBeUndefined()
  })

  it('merges A→B and B→A into a single bidirectional edge', () => {
    const positions = new Map([
      ['a', pos('a', 0, 0)],
      ['b', pos('b', 300, 0)],
    ])
    const result = routeEdges(positions, [
      input('e1', 'a', 'b', 1, { label: 'fetch', data: 'req' }),
      input('e2', 'b', 'a', 2, { label: 'result', data: 'json' }),
    ])
    expect(result).toHaveLength(1)
    const edge = result[0]
    // Lowest-order edge wins → primary direction a→b.
    expect(edge.source).toBe('a')
    expect(edge.target).toBe('b')
    expect(edge.sourceHandle).toBe('right-s')
    expect(edge.targetHandle).toBe('left-t')
    expect(edge.merged).toBe(true)
    expect(edge.markerStart).toBeDefined()
    expect(edge.markerEnd).toBeDefined()
    // Reverse edge gets a ← prefix in the combined label.
    expect(edge.label).toContain('→')
    expect(edge.label).toContain('←')
    expect(edge.label).toContain('fetch')
    expect(edge.label).toContain('result')
    expect(edge.label).not.toContain('req')
    expect(edge.label).not.toContain('json')
  })

  it('merges two same-direction edges without a reverse arrow', () => {
    const positions = new Map([
      ['a', pos('a', 0, 0)],
      ['b', pos('b', 300, 0)],
    ])
    const result = routeEdges(positions, [
      input('e1', 'a', 'b', 1),
      input('e2', 'a', 'b', 2),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].merged).toBe(true)
    expect(result[0].markerStart).toBeUndefined()
  })

  it('handles vertical bidirectional pairs', () => {
    const positions = new Map([
      ['a', pos('a', 0, 0)],
      ['b', pos('b', 0, 400)],
    ])
    const result = routeEdges(positions, [
      input('e1', 'a', 'b', 1),
      input('e2', 'b', 'a', 2),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].sourceHandle).toBe('bottom-s')
    expect(result[0].targetHandle).toBe('top-t')
    expect(result[0].markerStart).toBeDefined()
  })
})
