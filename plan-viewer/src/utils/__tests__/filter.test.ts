import { describe, it, expect } from 'vitest'
import {
  filterGlossary,
  filterGlossaryByType,
  buildTree,
  flattenTree,
  filterTree,
  filterGlossaryToArchitectureDiagram,
} from '../filter'
import type { GlossaryItem } from '../../types'

const items: GlossaryItem[] = [
  { id: '1', type: 'person', name: 'Person A', description: '' },
  { id: '2', type: 'server', name: 'Server B', description: '' },
  { id: '3', type: 'table', name: 'Table C', description: '' },
  { id: '4', type: 'external-system', name: 'External D', description: '' },
]

describe('filterGlossary', () => {
  it('returns all items for "all" tab', () => {
    expect(filterGlossary(items, 'all')).toHaveLength(4)
  })

  it('filters by context layer', () => {
    const result = filterGlossary(items, 'context')
    expect(result).toHaveLength(2)
    expect(result.map((i) => i.id).sort()).toEqual(['1', '4'])
  })

  it('filters by container layer', () => {
    const result = filterGlossary(items, 'container')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('filters by code layer', () => {
    const result = filterGlossary(items, 'code')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('3')
  })

  it('returns empty array for an empty input', () => {
    expect(filterGlossary([], 'context')).toHaveLength(0)
  })
})

describe('filterGlossaryByType', () => {
  it('filters by exact type', () => {
    const result = filterGlossaryByType(items, 'person')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })
})

describe('buildTree', () => {
  it('builds flat list as all roots when no parentId', () => {
    const tree = buildTree(items)
    expect(tree).toHaveLength(4)
    expect(tree.every((n) => n.depth === 0)).toBe(true)
    expect(tree.every((n) => n.children.length === 0)).toBe(true)
  })

  it('builds hierarchy with parentId', () => {
    const hierarchical: GlossaryItem[] = [
      { id: 'root', type: 'server', name: 'Root', description: '' },
      { id: 'child1', type: 'class', name: 'Child 1', description: '', parentId: 'root' },
      { id: 'child2', type: 'table', name: 'Child 2', description: '', parentId: 'root' },
      { id: 'grandchild', type: 'function', name: 'Grandchild', description: '', parentId: 'child1' },
    ]
    const tree = buildTree(hierarchical)
    expect(tree).toHaveLength(1)
    expect(tree[0].item.id).toBe('root')
    expect(tree[0].depth).toBe(0)
    expect(tree[0].children).toHaveLength(2)
    expect(tree[0].children[0].item.id).toBe('child1')
    expect(tree[0].children[0].depth).toBe(1)
    expect(tree[0].children[0].children).toHaveLength(1)
    expect(tree[0].children[0].children[0].item.id).toBe('grandchild')
    expect(tree[0].children[0].children[0].depth).toBe(2)
    expect(tree[0].children[1].item.id).toBe('child2')
    expect(tree[0].children[1].depth).toBe(1)
  })

  it('treats items with dangling parentId as roots', () => {
    const dangling: GlossaryItem[] = [
      { id: 'a', type: 'class', name: 'A', description: '', parentId: 'nonexistent' },
      { id: 'b', type: 'class', name: 'B', description: '' },
    ]
    const tree = buildTree(dangling)
    expect(tree).toHaveLength(2)
  })

  it('handles circular parentId without infinite recursion', () => {
    const circular: GlossaryItem[] = [
      { id: 'a', type: 'class', name: 'A', description: '', parentId: 'b' },
      { id: 'b', type: 'class', name: 'B', description: '', parentId: 'a' },
    ]
    // Should not throw or hang
    const tree = buildTree(circular)
    // Both should become roots since each references the other
    expect(tree.length).toBeGreaterThanOrEqual(0)
  })

  it('handles empty input', () => {
    const tree = buildTree([])
    expect(tree).toHaveLength(0)
  })

  describe('maxDepth', () => {
    const fourLevels: GlossaryItem[] = [
      { id: 'l0', type: 'server', name: 'L0', description: '' },
      { id: 'l1', type: 'class', name: 'L1', description: '', parentId: 'l0' },
      { id: 'l2', type: 'function', name: 'L2', description: '', parentId: 'l1' },
      { id: 'l3', type: 'function', name: 'L3', description: '', parentId: 'l2' },
    ]

    it('defaults to 3 levels and excludes depth-3 items from flattened tree', () => {
      const tree = buildTree(fourLevels)
      const ids = flattenTree(tree).map((n) => n.item.id)
      expect(ids).toEqual(['l0', 'l1', 'l2'])
      expect(ids).not.toContain('l3')
    })

    it('truncates children of depth-2 nodes when maxDepth=3', () => {
      const tree = buildTree(fourLevels, 3)
      const l2 = flattenTree(tree).find((n) => n.item.id === 'l2')
      expect(l2).toBeDefined()
      expect(l2!.depth).toBe(2)
      expect(l2!.children).toHaveLength(0)
    })

    it('produces only root-depth-0 nodes when maxDepth=1', () => {
      const tree = buildTree(fourLevels, 1)
      expect(tree.every((n) => n.children.length === 0)).toBe(true)
      expect(tree).toHaveLength(1)
      expect(tree[0].item.id).toBe('l0')
    })

    it('empties children of depth-1 nodes when maxDepth=2', () => {
      const tree = buildTree(fourLevels, 2)
      expect(tree[0].item.id).toBe('l0')
      expect(tree[0].children).toHaveLength(1)
      expect(tree[0].children[0].item.id).toBe('l1')
      expect(tree[0].children[0].children).toHaveLength(0)
    })

    it('returns empty forest when maxDepth <= 0', () => {
      expect(buildTree(fourLevels, 0)).toHaveLength(0)
      expect(buildTree(fourLevels, -1)).toHaveLength(0)
    })

    it('terminates on circular parentId combined with maxDepth', () => {
      const circular: GlossaryItem[] = [
        { id: 'a', type: 'class', name: 'A', description: '', parentId: 'b' },
        { id: 'b', type: 'class', name: 'B', description: '', parentId: 'a' },
      ]
      const tree = buildTree(circular, 3)
      expect(tree.length).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('flattenTree', () => {
  it('flattens tree preserving depth-first order', () => {
    const hierarchical: GlossaryItem[] = [
      { id: 'root', type: 'server', name: 'Root', description: '' },
      { id: 'child1', type: 'class', name: 'Child 1', description: '', parentId: 'root' },
      { id: 'child2', type: 'table', name: 'Child 2', description: '', parentId: 'root' },
      { id: 'grandchild', type: 'function', name: 'Grandchild', description: '', parentId: 'child1' },
    ]
    const tree = buildTree(hierarchical)
    const flat = flattenTree(tree)
    expect(flat.map((n) => n.item.id)).toEqual(['root', 'child1', 'grandchild', 'child2'])
  })

  it('returns empty for empty input', () => {
    expect(flattenTree([])).toHaveLength(0)
  })
})

describe('filterTree', () => {
  const hierarchical: GlossaryItem[] = [
    { id: 'root', type: 'server', name: 'Root', description: '' },
    { id: 'child1', type: 'class', name: 'Child 1', description: '', parentId: 'root' },
    { id: 'child2', type: 'table', name: 'Child 2', description: '', parentId: 'root' },
  ]

  it('returns full tree for "all" tab', () => {
    const tree = buildTree(hierarchical)
    const filtered = filterTree(tree, 'all')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].children).toHaveLength(2)
  })

  it('keeps parent if descendant matches layer filter', () => {
    const tree = buildTree(hierarchical)
    const filtered = filterTree(tree, 'component')
    expect(filtered).toHaveLength(1) // root kept because child1 is a class (component)
    expect(filtered[0].item.id).toBe('root')
    expect(filtered[0].children).toHaveLength(1)
    expect(filtered[0].children[0].item.id).toBe('child1')
  })

  it('removes branches with no matching descendants', () => {
    const noMatch: GlossaryItem[] = [
      { id: 'root', type: 'server', name: 'Root', description: '' },
      { id: 'child', type: 'class', name: 'Child', description: '', parentId: 'root' },
    ]
    const tree = buildTree(noMatch)
    const filtered = filterTree(tree, 'context')
    expect(filtered).toHaveLength(0)
  })
})

describe('filterGlossaryToArchitectureDiagram', () => {
  it('keeps only nodes referenced as sources or targets', () => {
    const result = filterGlossaryToArchitectureDiagram(items, [
      { order: 1, source: '1', target: '3', label: 'send', data: 'Payload' },
    ])

    expect(result.map((item) => item.id)).toEqual(['1', '3'])
  })

  it('returns empty when a state has no architecture edges', () => {
    expect(filterGlossaryToArchitectureDiagram(items, [])).toHaveLength(0)
  })
})
