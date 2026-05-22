import { describe, expect, it } from 'vitest'
import { render } from 'svelte/server'
import GlossaryTooltip from '../../components/GlossaryTooltip.svelte'
import InlineGlossaryText from '../../components/InlineGlossaryText.svelte'
import type { GlossaryItem } from '../../types'
import { getGlossaryAncestorIds, glossaryLinksToPlainText, parseGlossaryLinks } from '../glossaryLinks'

const glossary: GlossaryItem[] = [
  { id: 'root', type: 'server', name: 'Root', description: '' },
  {
    id: 'child',
    type: 'class',
    name: 'Child',
    description: 'Child glossary description',
    analogy: 'Ask <a href="#glossary:root">Root</a> first',
    responsibility: 'Own <a href="#glossary:missing">missing labels</a>',
    parentId: 'root',
  },
  { id: 'leaf', type: 'table', name: 'Leaf', description: '', parentId: 'child' },
]

const ids = new Set(glossary.map((item) => item.id))

describe('parseGlossaryLinks', () => {
  it('recognizes only exact glossary anchor syntax', () => {
    expect(parseGlossaryLinks('See <a href="#glossary:child">child</a>.', ids)).toEqual([
      { type: 'text', text: 'See ' },
      { type: 'glossary-link', id: 'child', label: 'child' },
      { type: 'text', text: '.' },
    ])

    expect(parseGlossaryLinks('<A href="#glossary:child">child</A>', ids)).toEqual([
      { type: 'text', text: '<A href="#glossary:child">child</A>' },
    ])
    expect(parseGlossaryLinks("<a href='#glossary:child'>child</a>", ids)).toEqual([
      { type: 'text', text: "<a href='#glossary:child'>child</a>" },
    ])
    expect(parseGlossaryLinks('<a data-x="#glossary:child">child</a>', ids)).toEqual([
      { type: 'text', text: '<a data-x="#glossary:child">child</a>' },
    ])
  })

  it('renders missing targets and empty targets as plain labels', () => {
    expect(parseGlossaryLinks('<a href="#glossary:missing">missing label</a>', ids)).toEqual([
      { type: 'text', text: 'missing label' },
    ])
    expect(parseGlossaryLinks('<a href="#glossary:">empty label</a>', ids)).toEqual([
      { type: 'text', text: 'empty label' },
    ])
  })

  it('keeps unsupported tags and malformed anchors literal', () => {
    expect(parseGlossaryLinks('<strong>literal</strong>', ids)).toEqual([
      { type: 'text', text: '<strong>literal</strong>' },
    ])
    expect(parseGlossaryLinks('<a href="#glossary:child">no close', ids)).toEqual([
      { type: 'text', text: '<a href="#glossary:child">no close' },
    ])
    expect(parseGlossaryLinks('<a href="#other:child">wrong prefix</a>', ids)).toEqual([
      { type: 'text', text: '<a href="#other:child">wrong prefix</a>' },
    ])
  })

  it('does not interpret nested tags in labels as HTML', () => {
    expect(parseGlossaryLinks('<a href="#glossary:child"><em>Child</em></a>', ids)).toEqual([
      { type: 'glossary-link', id: 'child', label: '<em>Child</em>' },
    ])
  })
})

describe('glossaryLinksToPlainText', () => {
  it('strips supported glossary anchors down to their labels', () => {
    expect(glossaryLinksToPlainText('Ask <a href="#glossary:child">Child</a>.', ids)).toBe('Ask Child.')
    expect(glossaryLinksToPlainText('<a href="#glossary:missing">Missing</a>', ids)).toBe('Missing')
  })
})

describe('InlineGlossaryText', () => {
  it('renders valid targets as non-navigating buttons with chips hidden until interaction and missing targets as plain text', () => {
    const { body } = render(InlineGlossaryText, {
      props: {
        text: 'Open <a href="#glossary:child">child</a> and <a href="#glossary:missing">missing</a>.',
        glossary,
      },
    })

    expect(body).toContain('<button')
    expect(body).toContain('child')
    expect(body).toContain('missing')
    expect(body).not.toContain('href="#glossary:child"')
    expect(body).not.toContain('href="#glossary:missing"')
    expect(body).not.toContain('Child glossary description')
    expect(body).not.toContain('aria-label="Child のチップを閉じる"')
  })

  it('escapes nested tags in labels instead of injecting HTML', () => {
    const { body } = render(InlineGlossaryText, {
      props: {
        text: '<a href="#glossary:child"><em>Child</em></a>',
        glossary,
      },
    })

    expect(body).toContain('&lt;em>Child&lt;/em>')
    expect(body).not.toContain('<em>Child</em>')
  })
})

describe('GlossaryTooltip', () => {
  it('renders shared chip content with glossary links flattened to text', () => {
    const { body } = render(GlossaryTooltip, {
      props: {
        item: glossary[1],
        validIds: ids,
        onclose: () => {},
      },
    })

    expect(body).toContain('Child glossary description')
    expect(body).toContain('Ask Root first')
    expect(body).toContain('Own missing labels')
    expect(body).not.toContain('href="#glossary:root"')
    expect(body).not.toContain('href="#glossary:missing"')
    expect(body).toContain('aria-label="Child のチップを閉じる"')
  })
})

describe('glossary link helpers', () => {
  it('finds collapsed ancestors that must be expanded before scrolling', () => {
    expect(getGlossaryAncestorIds('leaf', glossary)).toEqual(['child', 'root'])
  })
})
