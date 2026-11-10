/** Períodos do filtro de datas. Datas no formato do <input type="date"> ("2026-11-10"). */

export type Preset = 'last7' | 'last30' | 'month' | 'custom'

export type DateRange = { preset: Preset; start: string; end: string }

export const PRESETS: { id: Exclude<Preset, 'custom'>; label: string }[] = [
  { id: 'last7', label: 'Últimos 7 dias' },
  { id: 'last30', label: 'Últimos 30 dias' },
  { id: 'month', label: 'Mês atual' },
]

export const PRESET_LABEL: Record<Preset, string> = {
  last7: 'Últimos 7 dias',
  last30: 'Últimos 30 dias',
  month: 'Mês atual',
  custom: 'Personalizado',
}

/** Data local (não UTC) como "AAAA-MM-DD". */
export function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Os últimos N dias contam hoje; o mês atual vai do dia 1 até hoje. */
export function presetRange(preset: Exclude<Preset, 'custom'>, today = new Date()): DateRange {
  const end = isoDay(today)
  if (preset === 'month') {
    return { preset, start: isoDay(new Date(today.getFullYear(), today.getMonth(), 1)), end }
  }
  const days = preset === 'last7' ? 7 : 30
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1))
  return { preset, start: isoDay(start), end }
}

/** "2026-11-04" → "04/11/2026" */
export function brDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** "04/11 – 10/11/2026", ou com os dois anos quando mudam. */
export function rangeText({ start, end }: DateRange): string {
  if (!start || !end) return ''
  const a = brDate(start)
  const b = brDate(end)
  return start.slice(0, 4) === end.slice(0, 4) ? `${a.slice(0, 5)} – ${b}` : `${a} – ${b}`
}
