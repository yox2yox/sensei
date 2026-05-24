import type { ArchitectureEdge, C4Layer, GlossaryItem, GlossaryType } from '../types'
import { GLOSSARY_TYPE_TO_LAYER } from './c4'

export interface TreeNode {
  item: GlossaryItem
  children: TreeNode[]
  depth: number
}

export const DEFAULT_MAX_DEPTH = 3

export type GlossaryTab = 'all' | C4Layer

/**
 * Build a forest (list of root trees) from flat glossary items.
 *
 * @param maxDepth Maximum number of levels to retain (1-indexed; root = level 1).
 *   Nodes at depths >= maxDepth are dropped; nodes at depth = maxDepth - 1
 *   have `.children` truncated to `[]`. Defaults to 3.
 */
export function buildTree(items: GlossaryItem[], maxDepth: number = DEFAULT_MAX_DEPTH): TreeNode[] {
  const itemMap = new Map<string, GlossaryItem>(items.map((i) => [i.id, i]))
  const childrenMap = new Map<string, GlossaryItem[]>()

  for (const item of items) {
    const pid = item.parentId ?? '__root__'
    const list = childrenMap.get(pid) ?? []
    list.push(item)
    childrenMap.set(pid, list)
  }

  function build(parentId: string, depth: number, visited: Set<string>): TreeNode[] {
    if (depth >= maxDepth) return []
    const children = childrenMap.get(parentId) ?? []
    return children
      .filter((item) => !visited.has(item.id))
      .map((item) => {
        const next = new Set(visited)
        next.add(item.id)
        return {
          item,
          children: build(item.id, depth + 1, next),
          depth,
        }
      })
  }

  if (maxDepth <= 0) return []

  // Root nodes: parentId is undefined OR parentId references a non-existent item
  const roots: TreeNode[] = []
  for (const item of items) {
    if (!item.parentId || !itemMap.has(item.parentId)) {
      const visited = new Set<string>([item.id])
      roots.push({
        item,
        children: build(item.id, 1, visited),
        depth: 0,
      })
    }
  }

  return roots
}

/** Flatten a tree into a list preserving hierarchy order */
export function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []
  function walk(list: TreeNode[]) {
    for (const node of list) {
      result.push(node)
      walk(node.children)
    }
  }
  walk(nodes)
  return result
}

/** Filter tree by C4 layer tab — keep parent nodes if any descendant matches */
export function filterTree(nodes: TreeNode[], tab: GlossaryTab): TreeNode[] {
  if (tab === 'all') return nodes

  function filterNodes(list: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = []
    for (const node of list) {
      const filteredChildren = filterNodes(node.children)
      if (GLOSSARY_TYPE_TO_LAYER[node.item.type] === tab || filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren })
      }
    }
    return result
  }

  return filterNodes(nodes)
}

/** Flat filter by C4 layer (kept exported for legacy and tests). */
export function filterGlossary(
  items: GlossaryItem[],
  tab: GlossaryTab
): GlossaryItem[] {
  if (tab === 'all') return items
  return items.filter((item) => GLOSSARY_TYPE_TO_LAYER[item.type] === tab)
}

/** Filter glossary items by exact type (e.g. for badges, debug views). */
export function filterGlossaryByType(
  items: GlossaryItem[],
  type: GlossaryType
): GlossaryItem[] {
  return items.filter((item) => item.type === type)
}

/** Keep only glossary items that are directly used by a state's architecture diagram. */
export function filterGlossaryToArchitectureDiagram(
  items: GlossaryItem[],
  architectureEdges: ArchitectureEdge[]
): GlossaryItem[] {
  const usedIds = new Set<string>()
  for (const edge of architectureEdges) {
    usedIds.add(edge.source)
    usedIds.add(edge.target)
  }
  return items.filter((item) => usedIds.has(item.id))
}
