import type { C4Layer, GlossaryType } from '../types'

export const C4_LAYERS: readonly C4Layer[] = ['context', 'container', 'component', 'code'] as const

export const GLOSSARY_TYPE_TO_LAYER: Record<GlossaryType, C4Layer> = {
  // Context
  'person': 'context',
  'external-system': 'context',
  // Container
  'client': 'container',
  'server': 'container',
  'cloud-service': 'container',
  'db': 'container',
  // Component
  'class': 'component',
  'module': 'component',
  // Code
  'function': 'code',
  'table': 'code',
  'interface': 'code',
}

export const C4_LAYER_LABELS: Record<C4Layer, string> = {
  context: 'Context',
  container: 'Container',
  component: 'Component',
  code: 'Code',
}

export const C4_LAYER_DESCRIPTIONS: Record<C4Layer, string> = {
  context: 'システムを取り巻く人や外部システムを示す最上位の図',
  container: 'デプロイ単位（アプリ・サーバー・DB など）の関係を示す図',
  component: 'コンテナ内の主要な構成要素（クラス・モジュール）の関係を示す図',
  code: '関数・テーブル・インターフェースなどコード詳細の関係を示す図',
}

export function getC4Layer(type: GlossaryType): C4Layer {
  return GLOSSARY_TYPE_TO_LAYER[type]
}

export function getTypesForLayer(layer: C4Layer): GlossaryType[] {
  return (Object.entries(GLOSSARY_TYPE_TO_LAYER) as [GlossaryType, C4Layer][])
    .filter(([, l]) => l === layer)
    .map(([t]) => t)
}

export function isTypeInLayer(type: GlossaryType, layer: C4Layer): boolean {
  return GLOSSARY_TYPE_TO_LAYER[type] === layer
}
