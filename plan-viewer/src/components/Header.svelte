<script lang="ts">
  import InlineGlossaryText from './InlineGlossaryText.svelte'
  import MetaphorText from './MetaphorText.svelte'
  import type { GlossaryItem, Metaphor } from '../types'

  interface Props {
    title: string
    description: string
    metaphor?: Metaphor
    takeaway?: string
    glossary: GlossaryItem[]
  }
  const { title, description, metaphor, takeaway, glossary }: Props = $props()
</script>

<header class="bg-white border-b border-gray-200 px-6 py-6">
  <div class="max-w-7xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-900">{title}</h1>
    {#if description}
      <p class="mt-2 text-gray-600 text-base max-w-4xl">
        <InlineGlossaryText text={description} glossary={glossary} />
      </p>
    {/if}

    {#if takeaway}
      <section class="mt-5 rounded-lg border border-slate-300 bg-slate-50 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-600">ひと言で</p>
        <p class="mt-1 text-base font-semibold leading-7 text-gray-900">
          <MetaphorText text={takeaway} glossary={glossary} />
        </p>
      </section>
    {/if}

    {#if metaphor}
      <section class="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">全体のたとえ</p>
        <h2 class="mt-1 text-lg font-bold text-gray-900">{metaphor.title}</h2>
        <p class="mt-1 text-sm leading-6 text-gray-700">
          <InlineGlossaryText text={metaphor.description} glossary={glossary} />
        </p>
      </section>
    {/if}
  </div>
</header>
