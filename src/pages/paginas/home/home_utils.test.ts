import { describe, expect, it } from 'vitest'
import { delta, periodLabel } from './home_utils'

describe('periodLabel', () => {
  it('escreve o período curto e com ano', () => {
    expect(periodLabel('2026-11-01', '2026-11-02')).toBe('1 a 2/nov')
    expect(periodLabel('2025-11-01', '2025-11-02', true)).toBe('1 a 2/nov/2025')
    expect(periodLabel('2026-11-01', '2026-11-01')).toBe('1/nov')
  })
})

describe('delta', () => {
  it('compara com o ano anterior', () => {
    expect(delta(120, 100, '1 a 2/nov/2025')).toEqual({
      text: '+20% vs. 1 a 2/nov/2025',
      tone: 'good',
    })
    expect(delta(80, 100, 'x').tone).toBe('bad')
    expect(delta(50, 0, '1/nov/2025').text).toBe('sem vendas em 1/nov/2025')
  })
})
