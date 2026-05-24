import { describe, it, expect } from 'vitest'
import { collectLayerViolations, normalizePlan } from '../normalize'
import type { Plan } from '../../types'

const baseGlossary = [
  { id: 'a', type: 'server' as const, name: 'A', description: '' },
  { id: 'b', type: 'server' as const, name: 'B', description: '' },
  { id: 'c', type: 'class' as const, name: 'C', description: '' },
]

function makeState(label = 'call') {
  return {
    architectureDiagrams: {
      container: {
        edges: [{ order: 1, source: 'a', target: 'b', label, data: 'X' }],
      },
    },
  }
}

describe('normalizePlan', () => {
  it('returns concerns as-is when content is present', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      pairs: [
        {
          title: 'C1',
          examples: [
            { title: 'ex1', currentState: makeState(), proposedState: makeState('C1-new') },
          ],
        },
        {
          title: 'C2',
          examples: [{ title: 'ex2', proposedState: makeState('C2') }],
        },
      ],
    }
    const result = normalizePlan(plan)
    expect(result.pairs).toHaveLength(2)
    expect(result.pairs[0].title).toBe('C1')
    expect(result.pairs[1].examples?.[0].currentState).toBeUndefined()
  })

  it('throws when pairs is an empty array', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      pairs: [],
    }
    expect(() => normalizePlan(plan)).toThrow(/empty/i)
  })

  it('filters out concerns that have neither examples, safeguards, nor takeaway', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      pairs: [
        { title: 'keep', examples: [{ title: 'e', proposedState: makeState() }] },
        { title: 'drop' },
        { title: 'also-keep', safeguards: ['be careful'] },
      ],
    }
    const result = normalizePlan(plan)
    expect(result.pairs).toHaveLength(2)
    expect(result.pairs.map((p) => p.title)).toEqual(['keep', 'also-keep'])
  })

  it('keeps explanation-only concerns without diagrams', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      pairs: [
        {
          title: 'explain',
          takeaway: 'pithy summary',
        },
      ],
    }
    const result = normalizePlan(plan)
    expect(result.pairs).toHaveLength(1)
    expect(result.pairs[0].title).toBe('explain')
  })

  it('rejects edges whose glossary type does not belong to the diagram layer', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      pairs: [
        {
          title: 'mixed',
          examples: [
            {
              title: 'e',
              proposedState: {
                architectureDiagrams: {
                  container: {
                    edges: [
                      // 'c' is class (component layer), not container — should fail
                      { order: 1, source: 'a', target: 'c', label: 'x', data: 'y' },
                    ],
                  },
                },
              },
            },
          ],
        },
      ],
    }
    expect(() => normalizePlan(plan)).toThrow(/layer/i)
  })
})

describe('collectLayerViolations', () => {
  it('returns empty array for layer-clean plans', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      pairs: [{ title: 'P', examples: [{ title: 'e', proposedState: makeState() }] }],
    }
    expect(collectLayerViolations(plan)).toEqual([])
  })

  it('reports each mismatched endpoint', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      pairs: [
        {
          title: 'P',
          examples: [
            {
              title: 'e',
              proposedState: {
                architectureDiagrams: {
                  component: {
                    edges: [
                      // 'a' and 'b' are servers (container), not component
                      { order: 1, source: 'a', target: 'b', label: 'x', data: 'y' },
                    ],
                  },
                },
              },
            },
          ],
        },
      ],
    }
    const violations = collectLayerViolations(plan)
    expect(violations).toHaveLength(2)
    expect(violations.every((v) => v.expectedLayer === 'component')).toBe(true)
  })
})
