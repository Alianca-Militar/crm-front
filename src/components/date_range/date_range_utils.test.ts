import { describe, expect, it } from 'vitest'
import { presetRange, rangeText } from './date_range_utils'

const today = new Date(2026, 10, 10, 15, 30) // 10/11/2026

describe('presetRange', () => {
  it('últimos 7 e 30 dias contam hoje', () => {
    expect(presetRange('last7', today)).toEqual({
      preset: 'last7',
      start: '2026-11-04',
      end: '2026-11-10',
    })
    expect(presetRange('last30', today).start).toBe('2026-10-12')
  })

  it('mês atual vai do dia 1 até hoje', () => {
    expect(presetRange('month', today)).toEqual({
      preset: 'month',
      start: '2026-11-01',
      end: '2026-11-10',
    })
  })
})

describe('rangeText', () => {
  it('mostra o ano uma vez quando é o mesmo', () => {
    expect(rangeText({ preset: 'custom', start: '2026-11-04', end: '2026-11-10' })).toBe(
      '04/11 – 10/11/2026',
    )
    expect(rangeText({ preset: 'custom', start: '2025-12-20', end: '2026-01-05' })).toBe(
      '20/12/2025 – 05/01/2026',
    )
  })
})
