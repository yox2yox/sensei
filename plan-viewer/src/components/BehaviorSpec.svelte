<script lang="ts">
  import type { Behavior, BehaviorStep, GlossaryItem } from '../types'
  import InlineGlossaryText from './InlineGlossaryText.svelte'

  interface Props {
    behavior: Behavior
    glossary: GlossaryItem[]
  }

  const { behavior, glossary }: Props = $props()

  // Gherkin の表示用キーワードと配色。and / but は直前のステップ種別を引き継ぐ
  // のが Gherkin の慣習なので、淡色で「継続」であることを示す。
  const KEYWORD_LABEL: Record<string, string> = {
    given: 'Given',
    when: 'When',
    then: 'Then',
    and: 'And',
    but: 'But',
  }
  const KEYWORD_CLASS: Record<string, string> = {
    given: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    when: 'bg-sky-100 text-sky-800 border-sky-200',
    then: 'bg-violet-100 text-violet-800 border-violet-200',
    and: 'bg-slate-100 text-slate-600 border-slate-200',
    but: 'bg-rose-100 text-rose-700 border-rose-200',
  }

  function keywordLabel(step: BehaviorStep): string {
    return KEYWORD_LABEL[step.keyword] ?? step.keyword
  }
  function keywordClass(step: BehaviorStep): string {
    return KEYWORD_CLASS[step.keyword] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  }
</script>

<section class="mb-4 overflow-hidden rounded-lg border border-teal-300 bg-white">
  <header class="flex items-center gap-2 border-b border-teal-200 bg-teal-50 px-4 py-2">
    <span class="rounded bg-teal-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
      Gherkin
    </span>
    <h3 class="text-sm font-bold text-teal-900">受け入れ条件（システムの振る舞い）</h3>
  </header>

  <div class="px-4 py-3">
    <!-- Feature -->
    <p class="flex flex-wrap items-baseline gap-x-2 text-base font-bold text-gray-900">
      <span class="font-mono text-sm font-semibold text-teal-700">Feature:</span>
      <span><InlineGlossaryText text={behavior.feature} {glossary} /></span>
    </p>
    {#if behavior.description}
      <p class="mt-1 whitespace-pre-line border-l-2 border-teal-200 pl-3 text-sm leading-6 text-gray-600">
        <InlineGlossaryText text={behavior.description} {glossary} />
      </p>
    {/if}

    <!-- Background -->
    {#if behavior.background?.steps?.length}
      <div class="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
        <p class="font-mono text-xs font-bold uppercase tracking-wide text-slate-500">Background</p>
        <ul class="mt-1.5 space-y-1">
          {#each behavior.background.steps as step}
            {@render stepRow(step)}
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Scenarios -->
    <ol class="mt-3 space-y-3">
      {#each behavior.scenarios as scenario, i (i)}
        <li class="rounded-md border border-gray-200 bg-gray-50/70 p-3">
          <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span class="font-mono text-xs font-bold uppercase tracking-wide text-gray-500">
              {scenario.examples ? 'Scenario Outline' : 'Scenario'}
            </span>
            <span class="text-sm font-semibold text-gray-900">{scenario.name}</span>
            {#each scenario.tags ?? [] as tag}
              <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">@{tag}</span>
            {/each}
          </div>

          <ul class="mt-2 space-y-1">
            {#each scenario.steps as step}
              {@render stepRow(step)}
            {/each}
          </ul>

          {#if scenario.examples}
            <div class="mt-2.5">
              <p class="font-mono text-xs font-bold uppercase tracking-wide text-gray-500">Examples</p>
              <div class="mt-1 overflow-x-auto">
                <table class="min-w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {#each scenario.examples.header as col}
                        <th class="border border-gray-300 bg-gray-100 px-2 py-1 text-left font-semibold text-gray-700">{col}</th>
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#each scenario.examples.rows as row}
                      <tr>
                        {#each row as cell}
                          <td class="border border-gray-200 px-2 py-1 font-mono text-gray-700">{cell}</td>
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}
        </li>
      {/each}
    </ol>
  </div>
</section>

{#snippet stepRow(step: BehaviorStep)}
  <li>
    <div class="flex items-baseline gap-2 text-sm leading-6">
      <span class="inline-flex w-14 shrink-0 justify-center rounded border px-1.5 py-0.5 text-xs font-bold {keywordClass(step)}">
        {keywordLabel(step)}
      </span>
      <span class="min-w-0 flex-1 text-gray-800">
        <InlineGlossaryText text={step.text} {glossary} />
      </span>
    </div>
    {#if step.table?.length}
      <div class="mt-1 ml-16 overflow-x-auto">
        <table class="border-collapse text-xs">
          <tbody>
            {#each step.table as row, r}
              <tr>
                {#each row as cell}
                  {#if r === 0}
                    <th class="border border-gray-300 bg-gray-100 px-2 py-0.5 text-left font-semibold text-gray-700">{cell}</th>
                  {:else}
                    <td class="border border-gray-200 px-2 py-0.5 font-mono text-gray-700">{cell}</td>
                  {/if}
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </li>
{/snippet}
