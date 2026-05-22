import type { GlossaryItem, GlossaryType } from '../types'

export function glossaryItemIcon(item: Pick<GlossaryItem, 'icon' | 'name'>): string {
  if (item.icon && item.icon.trim()) return item.icon
  return [...(item.name ?? '')][0] ?? '•'
}

export const glossaryTypeColors: Record<GlossaryType, string> = {
  // Context
  person: 'bg-rose-100 text-rose-800 border-rose-200',
  'external-system': 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  // Container
  client: 'bg-sky-100 text-sky-800 border-sky-200',
  server: 'bg-blue-100 text-blue-800 border-blue-200',
  'cloud-service': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  db: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  // Component
  class: 'bg-amber-100 text-amber-800 border-amber-200',
  module: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  // Code
  function: 'bg-orange-100 text-orange-800 border-orange-200',
  table: 'bg-teal-100 text-teal-800 border-teal-200',
  interface: 'bg-lime-100 text-lime-800 border-lime-200',
}

export const glossaryTypeBadgeColors: Record<GlossaryType, string> = {
  person: 'bg-rose-100 text-rose-700',
  'external-system': 'bg-fuchsia-100 text-fuchsia-700',
  client: 'bg-sky-100 text-sky-700',
  server: 'bg-blue-100 text-blue-700',
  'cloud-service': 'bg-cyan-100 text-cyan-700',
  db: 'bg-emerald-100 text-emerald-700',
  class: 'bg-amber-100 text-amber-700',
  module: 'bg-yellow-100 text-yellow-700',
  function: 'bg-orange-100 text-orange-700',
  table: 'bg-teal-100 text-teal-700',
  interface: 'bg-lime-100 text-lime-700',
}

export const glossaryTypeLabels: Record<GlossaryType, string> = {
  person: '人',
  'external-system': '外部システム',
  client: 'クライアント',
  server: 'サーバー',
  'cloud-service': 'クラウドサービス',
  db: 'DB',
  class: 'クラス',
  module: 'モジュール',
  function: '関数',
  table: 'テーブル',
  interface: 'インターフェース',
}
