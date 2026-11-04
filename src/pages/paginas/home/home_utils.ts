export const MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

/** "2026-11-01", "2026-11-02" → "1 a 2/nov" (um dia só: "1/nov"); com ano: "1 a 2/nov/2025". */
export function periodLabel(start: string, end: string, withYear = false) {
  const [y, m, d1] = start.split('-')
  const d2 = end.split('-')[2]
  const days = d1 === d2 ? String(Number(d1)) : `${Number(d1)} a ${Number(d2)}`
  return `${days}/${MONTHS[Number(m) - 1]}${withYear ? `/${y}` : ''}`
}

/** Variação contra os mesmos dias do ano anterior. */
export function delta(now: number, before: number, base: string): { text: string; tone: string } {
  if (!before) return { text: `sem vendas em ${base}`, tone: 'neutral' }
  const pct = Math.round(((now - before) / before) * 100)
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : ''
  return {
    text: `${sign}${Math.abs(pct)}% vs. ${base}`,
    tone: pct > 0 ? 'good' : pct < 0 ? 'bad' : 'neutral',
  }
}
