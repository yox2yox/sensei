<script lang="ts">
  import { normalizePlan } from './utils/normalize'
  import { C4_LAYERS, C4_LAYER_LABELS, C4_LAYER_DESCRIPTIONS } from './utils/c4'
  import type { C4Layer, Concern, Example, FlowState, Plan } from './types'
  import Header from './components/Header.svelte'
  import GlossaryPanel from './components/GlossaryPanel.svelte'
  import GherkinTestCases from './components/GherkinTestCases.svelte'
  import ArchitectureDiagram from './components/ArchitectureDiagram.svelte'

  interface LoadResult {
    plan: Plan | null
    pairs: Concern[]
    error: string | null
  }

  function loadPlan(): LoadResult {
    const el = document.getElementById('plan-data')
    const text = el?.textContent?.trim() ?? ''
    if (!text) {
      return {
        plan: null,
        pairs: [],
        error:
          'プランデータが埋め込まれていません。generator スクリプトで HTML を再生成してください。',
      }
    }
    try {
      const parsed = JSON.parse(text) as unknown
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid plan JSON: expected an object')
      }
      const plan = parsed as Plan
      const normalized = normalizePlan(plan)
      return { plan, pairs: normalized.pairs, error: null }
    } catch (e) {
      return {
        plan: null,
        pairs: [],
        error: `プランのデコードに失敗しました: ${e instanceof Error ? e.message : String(e)}`,
      }
    }
  }

  const { plan, pairs, error } = loadPlan()

  function definedLayers(state?: FlowState): C4Layer[] {
    const diagrams = state?.architectureDiagrams
    if (!diagrams) return []
    return C4_LAYERS.filter((layer) => (diagrams[layer]?.edges?.length ?? 0) > 0)
  }

  function hasAnyDiagram(state?: FlowState): boolean {
    return definedLayers(state).length > 0
  }


  function concernToExample(concern: Concern): Example | null {
    if (concern.currentState === undefined && concern.proposedState === undefined) return null
    return {
      title: concern.title,
      currentState: concern.currentState,
      proposedState: concern.proposedState,
    }
  }

  function visibleExamples(concern: Concern): Example[] {
    const direct = concernToExample(concern)
    return direct ? [direct] : (concern.examples ?? [])
  }
</script>

<div class="min-h-screen bg-gray-50">
  {#if error}
    <div class="flex items-center justify-center min-h-screen">
      <div class="bg-red-50 border border-red-200 text-red-800 rounded-lg p-8 max-w-lg text-center">
        <p class="text-lg font-semibold mb-2">エラー</p>
        <p class="text-sm">{error}</p>
      </div>
    </div>
  {:else if plan}
    <Header
      title={plan.title}
      description={plan.description}
      metaphor={plan.metaphor}
      takeaway={plan.takeaway}
      glossary={plan.glossary}
    />

    <main class="max-w-7xl mx-auto">
      <GlossaryPanel items={plan.glossary} />

      {#each pairs as concern, i (i)}
        <section class="px-6 py-6 border-t border-gray-200">
          {#if concern.title || concern.workflowPosition}
            <div class="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {#if concern.title}
                <h2 class="text-2xl font-bold text-gray-900">{concern.title}</h2>
              {/if}
              {#if concern.workflowPosition}
                <span class="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  📍 {concern.workflowPosition}
                </span>
              {/if}
            </div>
          {/if}

          {#if concern.testCases?.length}
            <GherkinTestCases testCases={concern.testCases} glossary={plan.glossary} />
          {/if}

          {#each visibleExamples(concern) as example, j (j)}
            <article class="mt-6 first:mt-0 rounded-xl border-2 border-indigo-200 bg-indigo-50/30 p-5">
              {#if example.title && visibleExamples(concern).length > 1}
                <h3 class="mb-3 text-lg font-semibold text-gray-900">{example.title}</h3>
              {/if}

              {#if example.currentState && hasAnyDiagram(example.currentState)}
                <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div class="mb-2 flex items-center gap-2">
                    <span class="rounded bg-amber-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">AS-IS</span>
                    <h4 class="text-base font-semibold text-amber-900">現状のアーキテクチャ</h4>
                  </div>
                  {#each definedLayers(example.currentState) as layer (layer)}
                    <div class="mt-3 first:mt-0">
                      <div class="mb-1 flex items-baseline gap-2">
                        <span class="rounded bg-amber-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">C4: {C4_LAYER_LABELS[layer]}</span>
                        <span class="text-xs text-amber-900/80">{C4_LAYER_DESCRIPTIONS[layer]}</span>
                      </div>
                      <ArchitectureDiagram
                        glossary={plan.glossary}
                        architectureEdges={example.currentState.architectureDiagrams?.[layer]?.edges ?? []}
                        diagram={example.currentState.architectureDiagrams?.[layer]?.diagramOptions}
                        {layer}
                      />
                    </div>
                  {/each}
                </div>
              {/if}

              {#if example.proposedState && hasAnyDiagram(example.proposedState)}
                <div class="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4">
                  <div class="mb-2 flex items-center gap-2">
                    <span class="rounded bg-sky-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">TO-BE</span>
                    <h4 class="text-base font-semibold text-sky-900">変更後のアーキテクチャ</h4>
                  </div>
                  {#each definedLayers(example.proposedState) as layer (layer)}
                    <div class="mt-3 first:mt-0">
                      <div class="mb-1 flex items-baseline gap-2">
                        <span class="rounded bg-sky-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">C4: {C4_LAYER_LABELS[layer]}</span>
                        <span class="text-xs text-sky-900/80">{C4_LAYER_DESCRIPTIONS[layer]}</span>
                      </div>
                      <ArchitectureDiagram
                        glossary={plan.glossary}
                        architectureEdges={example.proposedState.architectureDiagrams?.[layer]?.edges ?? []}
                        diagram={example.proposedState.architectureDiagrams?.[layer]?.diagramOptions}
                        {layer}
                        isDiff={example.currentState !== undefined}
                        baseArchitectureEdges={example.currentState?.architectureDiagrams?.[layer]?.edges ?? []}
                      />
                    </div>
                  {/each}
                </div>
              {/if}
            </article>
          {/each}
        </section>
      {/each}
    </main>
  {/if}
</div>
