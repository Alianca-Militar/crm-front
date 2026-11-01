import { describe, expect, it } from 'vitest'
import { formatCep, formatCnpj, formatLastAccess, onlyDigits } from './format'

describe('format', () => {
  it('onlyDigits', () => {
    expect(onlyDigits('11.222.333/0001-81')).toBe('11222333000181')
    expect(onlyDigits(null)).toBe('')
  })

  it('formatCnpj completo e enquanto digita', () => {
    expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81')
    expect(formatCnpj('112')).toBe('11.2')
    expect(formatCnpj('11222333')).toBe('11.222.333')
    expect(formatCnpj('112223330001')).toBe('11.222.333/0001')
    expect(formatCnpj('11.222.333/0001-8199')).toBe('11.222.333/0001-81')
  })

  it('formatCep', () => {
    expect(formatCep('36045410')).toBe('36045-410')
    expect(formatCep('3604')).toBe('3604')
    expect(formatCep(null)).toBe('')
  })

  it('formatLastAccess', () => {
    const now = new Date(2026, 9, 24, 10, 0)
    expect(formatLastAccess(null, now)).toBe('—')
    expect(formatLastAccess(new Date(2026, 9, 24, 8, 12).toISOString(), now)).toBe('hoje, 08:12')
    expect(formatLastAccess(new Date(2026, 9, 23, 17, 55).toISOString(), now)).toBe('ontem, 17:55')
    expect(formatLastAccess(new Date(2026, 8, 2, 9, 0).toISOString(), now)).toBe('02/09/2026')
  })
})
