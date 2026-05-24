<script lang="ts">
  import { tick } from 'svelte'
  import InlineGlossaryText from './InlineGlossaryText.svelte'
  import CodeAccordion from './CodeAccordion.svelte'
  import type { GlossaryItem } from '../types'
  import { buildTree, filterTree, flattenTree, type GlossaryTab, type TreeNode } from '../utils/filter'
  import { C4_LAYERS, C4_LAYER_LABELS } from '../utils/c4'
  import { getGlossaryAncestorIds } from '../utils/glossaryLinks'
  import {
    glossaryItemIcon,
    glossaryTypeBadgeColors,
    glossaryTypeColors,
    glossaryTypeLabels,
  } from '../utils/glossaryDisplay'
  import { selectedGlossaryId } from '../stores'

  interface Props {
    items: GlossaryItem[]
  }
  const { items }: Props = $props()

  let activeTab = $state<GlossaryTab>('all')

  const tabs: { value: GlossaryTab; label: string }[] = [
    { value: 'all', label: 'すべて' },
    ...C4_LAYERS.map((layer) => ({ value: layer as GlossaryTab, label: C4_LAYER_LABELS[layer] })),
  ]

  let tree = $derived(buildTree(items))
  let filteredTree = $derived(filterTree(tree, activeTab))
  let flatNodes = $derived(flattenTree(filteredTree))
  let itemMap = $derived(new Map(items.map((i) => [i.id, i])))

  let selectedId = $state<string | null>(null)
  let cardElements = new Map<string, HTMLDivElement>()

  $effect(() => {
    const unsubscribe = selectedGlossaryId.subscribe((v) => {
      selectedId = v
    })
    return unsubscribe
  })

  $effect(() => {
    if (!selectedId || !itemMap.has(selectedId)) return

    const idToScroll = selectedId
    const ancestorIds = getGlossaryAncestorIds(selectedId, items)
    const nextCollapsed = new Set(collapsed)
    let changed = false
    for (const id of ancestorIds) {
      if (nextCollapsed.delete(id)) changed = true
    }
    if (changed) collapsed = nextCollapsed
    if (!flatNodes.some((node) => node.item.id === selectedId)) activeTab = 'all'

    tick().then(() => {
      cardElements.get(idToScroll)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  })

  function handleCardClick(id: string) {
    selectedGlossaryId.update((current) => (current === id ? null : id))
  }

  let collapsed = $state<Set<string>>(new Set())

  function toggleCollapse(id: string) {
    collapsed = new Set(collapsed)
    if (collapsed.has(id)) {
      collapsed.delete(id)
    } else {
      collapsed.add(id)
    }
  }

  function registerCard(element: HTMLDivElement, id: string) {
    cardElements.set(id, element)
    return {
      destroy() {
        if (cardElements.get(id) === element) {
          cardElements.delete(id)
        }
      },
    }
  }

  function isVisible(node: TreeNode): boolean {
    let current = node.item.parentId
    const seen = new Set<string>()
    while (current && itemMap.has(current) && !seen.has(current)) {
      seen.add(current)
      if (collapsed.has(current)) return false
      current = itemMap.get(current)?.parentId
    }
    return true
  }

  function hasChildren(node: TreeNode): boolean {
    return node.children.length > 0
  }

  function formatEvidenceRef(ref: { path?: string; startLine?: number; endLine?: number }): string {
    const path = ref.path ?? '計画'
    if (ref.startLine && ref.endLine && ref.endLine !== ref.startLine) {
      return `${path}:${ref.startLine}-${ref.endLine}`
    }
    if (ref.startLine) return `${path}:${ref.startLine}`
    return path
  }

  function firstEvidence(item: GlossaryItem): string | null {
    const ref = item.evidence?.[0]
    return ref ? formatEvidenceRef(ref) : null
  }
</script>

<section class="px-6 py-6">
  <h2 class="text-xl font-semibold text-gray-800 mb-1">構成要素</h2>
  <p class="text-sm text-gray-600 mb-4">アーキテクチャ図に出てくる要素を、役割と責務で読めるように並べています。</p>
  <div class="flex gap-2 mb-4 border-b border-gray-200">
    {#each tabs as tab}
      <button
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === tab.value
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'}"
        onclick={() => { activeTab = tab.value }}
      >
        {tab.label}
      </button>
    {/each}
  </div>
  <div class="space-y-1">
    {#each flatNodes as node (node.item.id)}
      {#if isVisible(node)}
        <div
          use:registerCard={node.item.id}
          class="w-full text-left rounded-lg border transition-all cursor-pointer {glossaryTypeColors[node.item.type]} {selectedId === node.item.id ? 'ring-2 ring-offset-1 ring-blue-400' : 'hover:shadow-md'}"
          style="margin-left: {node.depth * 24}px; padding: {node.depth === 0 ? '12px 16px' : '8px 16px'};"
          role="button"
          tabindex="0"
          onclick={() => handleCardClick(node.item.id)}
          onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(node.item.id) }}
        >
          <div class="flex items-center gap-2">
            {#if hasChildren(node)}
              <button
                class="text-gray-400 hover:text-gray-600 w-5 h-5 flex items-center justify-center flex-shrink-0"
                onclick={(e: MouseEvent) => { e.stopPropagation(); toggleCollapse(node.item.id) }}
              >
                <span class="text-xs">{collapsed.has(node.item.id) ? '▶' : '▼'}</span>
              </button>
            {:else}
              <span class="w-5 flex-shrink-0"></span>
            {/if}
            <span class="emoji-font text-lg">{glossaryItemIcon(node.item)}</span>
            <span class="text-xs font-medium px-2 py-0.5 rounded {glossaryTypeBadgeColors[node.item.type]}">
              {glossaryTypeLabels[node.item.type]}
            </span>
            <p class="font-bold text-gray-900 text-sm flex-1">{node.item.name}</p>
          </div>
          {#if node.item.description}
            <p class="text-xs text-gray-600 mt-1 ml-7 line-clamp-2">
              <InlineGlossaryText text={node.item.description} glossary={items} />
            </p>
          {/if}
          {#if node.item.analogy || node.item.responsibility || firstEvidence(node.item)}
            <div class="mt-2 ml-7 grid gap-1 text-xs text-gray-700">
              {#if node.item.analogy}
                <p>
                  <span class="font-semibold">たとえると:</span>
                  <InlineGlossaryText text={node.item.analogy} glossary={items} />
                </p>
              {/if}
              {#if node.item.responsibility}
                <p>
                  <span class="font-semibold">担当:</span>
                  <InlineGlossaryText text={node.item.responsibility} glossary={items} />
                </p>
              {/if}
              {#if firstEvidence(node.item)}
                <p><span class="font-semibold">裏付け:</span> <span class="font-mono">{firstEvidence(node.item)}</span></p>
              {/if}
            </div>
          {/if}
          {#if node.item.evidence?.some((e) => e.codeSnippets)}
            <div class="ml-7 mt-2 space-y-2" onclick={(e: MouseEvent) => e.stopPropagation()} onkeydown={(e: KeyboardEvent) => e.stopPropagation()} role="presentation">
              {#each node.item.evidence ?? [] as ev}
                {#if ev.codeSnippets}
                  <CodeAccordion snippets={[ev.codeSnippets]} />
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
</section>
