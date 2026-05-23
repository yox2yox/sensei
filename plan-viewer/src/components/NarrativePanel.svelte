<script lang="ts">
  import type { Evidence, Example, FlowState, GlossaryItem } from '../types'
  import InlineGlossaryText from './InlineGlossaryText.svelte'
  import MetaphorText from './MetaphorText.svelte'
  import CodeAccordion from './CodeAccordion.svelte'

  interface Props {
    example: Example
    glossary: GlossaryItem[]
  }

  const { example, glossary }: Props = $props()

  const itemMap = $derived(new Map(glossary.map((item) => [item.id, item])))

  function formatEvidence(ref: Evidence): string {
    const path = ref.path ?? '計画'
    if (ref.startLine && ref.endLine && ref.endLine !== ref.startLine) {
      return `${path}:${ref.startLine}-${ref.endLine}`
    }
    if (ref.startLine) return `${path}:${ref.startLine}`
    return path
  }

  function actorName(id?: string): string | null {
    if (!id) return null
    const item = itemMap.get(id)
    if (!item) return id
    return item.name
  }

  function diagramEdgeLabels(state: FlowState, edgeNumbers?: number[]): string[] {
    if (!edgeNumbers || edgeNumbers.length === 0) return []
    const diagrams = state.architectureDiagrams
    if (!diagrams) return []
    const allEdges = Object.values(diagrams).flatMap((d) => d?.edges ?? [])
    return edgeNumbers
      .map((order) => allEdges.find((edge) => edge.order === order))
      .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge))
      .map((edge) => {
        const source = actorName(edge.source) ?? edge.source
        const target = actorName(edge.target) ?? edge.target
        return `${edge.order}. ${source} → ${target}: ${edge.label} / ${edge.data}`
      })
  }

  function hasStateNarrative(state?: FlowState): boolean {
    return Boolean(state?.storyTitle || state?.scenes?.length || state?.takeaway)
  }

  let hasNarrative = $derived(
    hasStateNarrative(example.currentState) || hasStateNarrative(example.proposedState),
  )
</script>

{#if hasNarrative}
  <div class="my-5 space-y-4">
    {#each [
      { label: 'AS-IS の処理の流れ', state: example.currentState, badge: 'AS-IS', badgeClass: 'bg-amber-600' },
      { label: 'TO-BE の処理の流れ', state: example.proposedState, badge: 'TO-BE', badgeClass: 'bg-sky-600' },
    ] as block}
      {#if hasStateNarrative(block.state)}
        <section class="rounded-lg border border-gray-200 bg-white p-4">
          <div class="flex items-center gap-2">
            <span class="rounded {block.badgeClass} px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">{block.badge}</span>
            <h3 class="text-base font-bold text-gray-900">{block.state?.storyTitle ?? block.label}</h3>
          </div>
          {#if block.state?.takeaway}
            <p class="mt-2 rounded-md bg-slate-50 p-3 text-sm font-semibold leading-6 text-gray-900">
              <span class="mr-2 inline-block rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">ひと言で</span>
              <MetaphorText text={block.state.takeaway} glossary={glossary} />
            </p>
          {/if}
          {#if block.state?.scenes?.length}
            <ol class="mt-3 space-y-3">
              {#each block.state.scenes as scene, i}
                <li class="rounded-md border border-gray-100 bg-gray-50 p-3">
                  <div class="flex items-start gap-3">
                    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="font-semibold text-gray-900">
                        <InlineGlossaryText text={scene.title} glossary={glossary} />
                      </p>
                      {#if scene.actor}
                        <p class="mt-1 text-xs font-medium text-gray-500">中心要素: {actorName(scene.actor)}</p>
                      {/if}
                      <p class="mt-2 text-sm leading-6 text-gray-700">
                        <MetaphorText text={scene.action} glossary={glossary} />
                      </p>
                      {#if scene.result}
                        <p class="mt-1 text-sm leading-6 text-gray-600">
                          <MetaphorText text={scene.result} glossary={glossary} />
                        </p>
                      {/if}
                      {#if diagramEdgeLabels(block.state, scene.edgeRefs).length}
                        <ul class="mt-2 space-y-1">
                          {#each diagramEdgeLabels(block.state, scene.edgeRefs) as label}
                            <li class="text-xs text-gray-600">{label}</li>
                          {/each}
                        </ul>
                      {/if}
                      {#if scene.evidence?.length}
                        <ul class="mt-2 space-y-2">
                          {#each scene.evidence as ref}
                            <li class="rounded bg-white px-2 py-1 text-xs text-gray-700 ring-1 ring-gray-200">
                              <div>
                                <span class="font-medium">{ref.label ?? '裏付け'}</span>
                                <span class="ml-1 font-mono">{formatEvidence(ref)}</span>
                              </div>
                              {#if ref.codeSnippets}
                                <div class="mt-2">
                                  <CodeAccordion snippets={[ref.codeSnippets]} compact />
                                </div>
                              {/if}
                            </li>
                          {/each}
                        </ul>
                      {/if}
                    </div>
                  </div>
                </li>
              {/each}
            </ol>
          {/if}
        </section>
      {/if}
    {/each}
  </div>
{/if}
