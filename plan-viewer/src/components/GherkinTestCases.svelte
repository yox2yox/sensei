<script lang="ts">
  import type { GherkinTestCase, GlossaryItem } from '../types'

  interface Props {
    testCases: GherkinTestCase[]
    glossary: GlossaryItem[]
  }

  const { testCases, glossary }: Props = $props()
  const glossaryById = $derived(new Map(glossary.map((item) => [item.id, item])))

  function itemName(id: string): string {
    return glossaryById.get(id)?.name ?? id
  }
</script>

{#if testCases.length}
  <section class="mt-5 rounded-lg border border-violet-200 bg-violet-50 p-4">
    <h3 class="text-sm font-bold text-violet-950">Glossary item 別テストケース (Gherkin)</h3>
    <div class="mt-3 grid gap-3 md:grid-cols-2">
      {#each testCases as testCase (`${testCase.glossaryItemId}:${testCase.scenario}`)}
        <article class="rounded border border-violet-200 bg-white p-3 font-mono text-xs leading-5 text-gray-800">
          <p class="font-sans text-xs font-bold text-violet-800">{itemName(testCase.glossaryItemId)}</p>
          <p><span class="font-bold text-violet-700">Feature:</span> {testCase.feature}</p>
          <p><span class="font-bold text-violet-700">Scenario:</span> {testCase.scenario}</p>
          {#each testCase.given as step}<p><span class="font-bold">Given</span> {step}</p>{/each}
          {#each testCase.when as step}<p><span class="font-bold">When</span> {step}</p>{/each}
          {#each testCase.then as step}<p><span class="font-bold">Then</span> {step}</p>{/each}
          {#each testCase.and ?? [] as step}<p><span class="font-bold">And</span> {step}</p>{/each}
        </article>
      {/each}
    </div>
  </section>
{/if}
