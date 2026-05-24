<script lang="ts">
  import type { GlossaryItem } from '../types'
  import InlineGlossaryText from './InlineGlossaryText.svelte'

  interface Props {
    text?: string | null
    glossary: GlossaryItem[]
  }

  const { text = '', glossary }: Props = $props()

  // SKILL.md asks writers to add metaphors as a suffix in the form
  // 「— 例えるとこれは ◯◯ にあたる」 (em dash or en dash, optional spaces).
  // We split at the first such marker and render the trailing portion in a
  // muted style so readers can see it as a supplement, not the main claim.
  const split = $derived.by(() => {
    const raw = text ?? ''
    const match = raw.match(/[—–]\s*(?:例えると|たとえると|例えれば|たとえれば)/)
    if (!match || match.index === undefined) {
      return { main: raw, analogy: null as string | null }
    }
    return {
      main: raw.slice(0, match.index).trimEnd(),
      analogy: raw.slice(match.index),
    }
  })
</script>

<InlineGlossaryText text={split.main} glossary={glossary} />
{#if split.analogy}
  <span class="ml-1 text-gray-500">
    <InlineGlossaryText text={split.analogy} glossary={glossary} />
  </span>
{/if}
