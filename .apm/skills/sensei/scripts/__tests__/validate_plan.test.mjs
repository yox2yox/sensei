import { describe, it, expect } from 'vitest'

import { validatePlan } from '../validate_plan.mjs'
import { validateReferences } from '../lib/plan-schema.zod.mjs'

// Minimal valid Gherkin behavior. Every Concern requires one, so test fixtures
// inject this into any pair that doesn't supply its own.
const okBehavior = {
  feature: 'F',
  scenarios: [
    {
      name: 'S',
      steps: [
        { keyword: 'given', text: 'g' },
        { keyword: 'when', text: 'w' },
        { keyword: 'then', text: 't' },
      ],
    },
  ],
}

function withDefaultBehavior(pairs) {
  if (!Array.isArray(pairs)) return pairs
  return pairs.map((p) =>
    p && typeof p === 'object' && !Array.isArray(p) && !('behavior' in p)
      ? { ...p, behavior: okBehavior }
      : p,
  )
}

function basePlan(overrides = {}) {
  const plan = {
    title: 't',
    description: 'd',
    glossary: [
      { id: 'a', type: 'client', name: 'A', icon: '💻' },
      { id: 'b', type: 'server', name: 'B', icon: '🖥️' },
      { id: 'c', type: 'class', name: 'C', icon: '📦' },
      { id: 'd', type: 'class', name: 'D', icon: '📦' },
    ],
    pairs: [{ title: 'P' }],
    ...overrides,
  }
  plan.pairs = withDefaultBehavior(plan.pairs)
  return plan
}

const okEdge = { order: 1, source: 'a', target: 'b', label: 'calls', data: 'X' }
const okEdgeComponent = { order: 2, source: 'c', target: 'd', label: 'wraps', data: 'Y' }

// Minimal valid pair: covers 2 layers (container + component) to satisfy the
// SKILL.md 単一レイヤー禁止 rule that the validator now enforces.
function planWithProposedDiagram(extra = {}) {
  return basePlan({
    pairs: [
      {
        title: 'P',
        examples: [
          {
            title: 'E',
            proposedState: {
              architectureDiagrams: {
                container: { edges: [okEdge] },
                component: { edges: [okEdgeComponent] },
              },
            },
          },
        ],
      },
    ],
    ...extra,
  })
}

describe('validatePlan (JSON Schema + zod)', () => {
  it('accepts a minimal valid plan', () => {
    const result = validatePlan(planWithProposedDiagram())
    expect(result.ok).toBe(true)
  })

  it('reports json-schema errors when a required field is missing', () => {
    const result = validatePlan({ glossary: [{ id: 'a', type: 'client', name: 'A', icon: '💻' }] })
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.source === 'json-schema')).toBe(true)
    expect(result.errors.some((e) => /title/.test(e.message))).toBe(true)
  })

  it('reports json-schema error for an unknown glossary type', () => {
    const plan = basePlan({
      glossary: [{ id: 'a', type: 'unknown', name: 'A', icon: '💻' }],
    })
    const result = validatePlan(plan)
    expect(result.ok).toBe(false)
    expect(result.errors[0].source).toBe('json-schema')
  })

  it('rejects the now-removed "term" glossary type', () => {
    const plan = basePlan({
      glossary: [{ id: 'a', type: 'term', name: 'A', icon: '📖' }],
    })
    const result = validatePlan(plan)
    expect(result.ok).toBe(false)
    expect(result.errors[0].source).toBe('json-schema')
  })

  it('reports json-schema error when pairs is missing', () => {
    const { pairs: _omit, ...rest } = basePlan()
    const result = validatePlan(rest)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => /pairs/.test(e.message))).toBe(true)
  })

  it('reports json-schema error when a pair is missing its behavior', () => {
    const plan = basePlan({ pairs: [{ title: 'P' }] })
    delete plan.pairs[0].behavior
    const result = validatePlan(plan)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.source === 'json-schema')).toBe(true)
    expect(result.errors.some((e) => /behavior/.test(e.message))).toBe(true)
  })

  it('accepts a pair carrying a structured Gherkin behavior', () => {
    const plan = basePlan({
      pairs: [
        {
          title: 'P',
          behavior: {
            feature: 'ログイン',
            description: 'As a 利用者 / I want ログインしたい / So that 機能を使える',
            background: { steps: [{ keyword: 'given', text: 'システムが起動している' }] },
            scenarios: [
              {
                name: '正しい資格情報',
                tags: ['happy-path'],
                steps: [
                  { keyword: 'given', text: '登録済みユーザーがいる' },
                  { keyword: 'when', text: '正しいパスワードを入力する' },
                  { keyword: 'then', text: 'ログインに成功する' },
                ],
              },
            ],
          },
        },
      ],
    })
    const result = validatePlan(plan)
    expect(result.ok).toBe(true)
  })

  it('reports a references error when a scenario has no "then" step', () => {
    const plan = basePlan({
      pairs: [
        {
          title: 'P',
          behavior: {
            feature: 'F',
            scenarios: [
              {
                name: 'no-outcome',
                steps: [
                  { keyword: 'given', text: 'g' },
                  { keyword: 'when', text: 'w' },
                ],
              },
            ],
          },
        },
      ],
    })
    const result = validatePlan(plan)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => /no "then" step/.test(e.message))).toBe(true)
  })

  it('rejects extra unknown properties (additionalProperties=false)', () => {
    const plan = basePlan({ foo: 'bar' })
    const result = validatePlan(plan)
    expect(result.ok).toBe(false)
    expect(result.errors[0].source).toBe('json-schema')
  })

  it('reports references error for unknown architecture edge source id', () => {
    const plan = basePlan({
      pairs: [
        {
          title: 'P',
          examples: [
            {
              title: 'E',
              proposedState: {
                architectureDiagrams: {
                  container: {
                    edges: [
                      { order: 1, source: 'ghost', target: 'b', label: 'x', data: 'y' },
                    ],
                  },
                },
              },
            },
          ],
        },
      ],
    })
    const result = validatePlan(plan)
    expect(result.ok).toBe(false)
    expect(result.errors[0].source).toBe('references')
    expect(result.errors[0].path).toMatch(/source/)
  })

  it('reports references error when an edge mixes layers', () => {
    const plan = basePlan({
      glossary: [
        { id: 'a', type: 'client', name: 'A', icon: '💻' },
        { id: 'b', type: 'class', name: 'B', icon: '📦' },
      ],
      pairs: [
        {
          title: 'P',
          examples: [
            {
              title: 'E',
              proposedState: {
                architectureDiagrams: {
                  container: {
                    edges: [{ order: 1, source: 'a', target: 'b', label: 'x', data: 'y' }],
                  },
                },
              },
            },
          ],
        },
      ],
    })
    const result = validatePlan(plan)
    expect(result.ok).toBe(false)
    expect(result.errors[0].source).toBe('references')
    expect(result.errors.some((e) => /layer/.test(e.message))).toBe(true)
  })
})

describe('validateReferences (cross-field constraints)', () => {
  it('detects duplicate glossary ids', () => {
    const errors = validateReferences(
      basePlan({
        glossary: [
          { id: 'a', type: 'client', name: 'A', icon: '💻' },
          { id: 'a', type: 'server', name: 'A2', icon: '🖥️' },
        ],
      }),
    )
    expect(errors.some((e) => /duplicate/.test(e.message))).toBe(true)
  })

  it('detects unknown parentId', () => {
    const errors = validateReferences(
      basePlan({
        glossary: [
          { id: 'a', type: 'client', name: 'A', icon: '💻', parentId: 'ghost' },
        ],
      }),
    )
    expect(errors.some((e) => /unknown parentId/.test(e.message))).toBe(true)
  })

  it('detects parentId cycles', () => {
    const errors = validateReferences(
      basePlan({
        glossary: [
          { id: 'a', type: 'client', name: 'A', icon: '💻', parentId: 'b' },
          { id: 'b', type: 'server', name: 'B', icon: '🖥️', parentId: 'a' },
        ],
      }),
    )
    expect(errors.some((e) => /cycle/.test(e.message))).toBe(true)
  })

  it('rejects nesting depth greater than 3', () => {
    const errors = validateReferences({
      title: 't',
      description: 'd',
      pairs: [{ title: 'P' }],
      glossary: [
        { id: 'a', type: 'client', name: 'A', icon: '💻' },
        { id: 'b', type: 'server', name: 'B', icon: '🖥️', parentId: 'a' },
        { id: 'c', type: 'function', name: 'C', icon: 'ƒ', parentId: 'b' },
        { id: 'd', type: 'function', name: 'D', icon: 'ƒ', parentId: 'c' },
      ],
    })
    expect(errors.some((e) => /nesting depth/.test(e.message))).toBe(true)
  })

  it('requires architectureDiagrams edge orders across layers to form 1..N', () => {
    const errors = validateReferences(
      basePlan({
        pairs: [
          {
            title: 'P',
            examples: [
              {
                title: 'E',
                proposedState: {
                  architectureDiagrams: {
                    container: {
                      edges: [
                        { order: 1, source: 'a', target: 'b', label: 'x', data: 'y' },
                        { order: 3, source: 'a', target: 'b', label: 'x', data: 'y' },
                      ],
                    },
                  },
                },
              },
            ],
          },
        ],
      }),
    )
    expect(errors.some((e) => /must form 1\.\.2/.test(e.message))).toBe(true)
  })

  it('detects duplicate edge order across diagrams in the same state', () => {
    const errors = validateReferences(
      basePlan({
        glossary: [
          { id: 'a', type: 'client', name: 'A', icon: '💻' },
          { id: 'b', type: 'server', name: 'B', icon: '🖥️' },
          { id: 'c', type: 'class', name: 'C', icon: '📦' },
          { id: 'd', type: 'class', name: 'D', icon: '📦' },
        ],
        pairs: [
          {
            title: 'P',
            examples: [
              {
                title: 'E',
                proposedState: {
                  architectureDiagrams: {
                    container: {
                      edges: [{ order: 1, source: 'a', target: 'b', label: 'x', data: 'y' }],
                    },
                    component: {
                      edges: [{ order: 1, source: 'c', target: 'd', label: 'x', data: 'y' }],
                    },
                  },
                },
              },
            ],
          },
        ],
      }),
    )
    expect(errors.some((e) => /duplicate edge order/.test(e.message))).toBe(true)
  })

  it('detects layer mismatch on edge endpoint', () => {
    const errors = validateReferences(
      basePlan({
        glossary: [
          { id: 'a', type: 'client', name: 'A', icon: '💻' },
          { id: 'b', type: 'class', name: 'B', icon: '📦' },
        ],
        pairs: [
          {
            title: 'P',
            examples: [
              {
                title: 'E',
                proposedState: {
                  architectureDiagrams: {
                    container: {
                      edges: [{ order: 1, source: 'a', target: 'b', label: 'x', data: 'y' }],
                    },
                  },
                },
              },
            ],
          },
        ],
      }),
    )
    expect(errors.some((e) => /layer/.test(e.message))).toBe(true)
  })

  it('validates diagramOptions.edges keys (order or source->target)', () => {
    const errors = validateReferences(
      basePlan({
        pairs: [
          {
            title: 'P',
            examples: [
              {
                title: 'E',
                proposedState: {
                  architectureDiagrams: {
                    container: {
                      edges: [okEdge],
                      diagramOptions: {
                        edges: {
                          '1': {},
                          'a->b': {},
                          'a->ghost': {},
                          '99': {},
                          'weird': {},
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        ],
      }),
    )
    const messages = errors.map((e) => e.message).join('\n')
    expect(messages).toMatch(/target id unknown/)
    expect(messages).toMatch(/unknown architecture edge order in this layer: 99/)
    expect(messages).toMatch(/source->target/)
  })

  it('rejects a pair whose diagrams only span a single C4 layer', () => {
    const errors = validateReferences(
      basePlan({
        pairs: [
          {
            title: 'single-layer',
            examples: [
              {
                title: 'E',
                proposedState: {
                  architectureDiagrams: {
                    container: { edges: [okEdge] },
                  },
                },
              },
            ],
          },
        ],
      }),
    )
    expect(errors.some((e) => /at least 2 C4 layers/.test(e.message))).toBe(true)
  })

  it('accepts an explanation-only pair (no diagrams) even though no layers are used', () => {
    const errors = validateReferences(
      basePlan({
        pairs: [{ title: 'explain', takeaway: 'pithy' }],
      }),
    )
    expect(errors).toEqual([])
  })

  it('returns empty array for a valid plan', () => {
    const errors = validateReferences(planWithProposedDiagram())
    expect(errors).toEqual([])
  })
})
