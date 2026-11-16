import { describe, expect, it } from 'vitest'
import { timeAgo } from './notifications_api'

describe('timeAgo', () => {
  const now = new Date('2026-11-16T15:00:00-03:00').getTime()
  const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString()

  it('mostra minutos, horas, ontem e a data', () => {
    expect(timeAgo(ago(0), now)).toBe('agora')
    expect(timeAgo(ago(4), now)).toBe('há 4 min')
    expect(timeAgo(ago(125), now)).toBe('há 2 h')
    expect(timeAgo(ago(30 * 60), now)).toBe('ontem')
    expect(timeAgo('2026-11-10T12:00:00-03:00', now)).toBe('10/11')
  })
})
