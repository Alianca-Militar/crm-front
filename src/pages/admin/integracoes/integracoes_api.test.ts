import { describe, expect, it } from 'vitest'
import { type IntegrationLogRow, summarize } from './integracoes_api'

const base: IntegrationLogRow = {
  id: 1,
  occurred_at: '2026-11-03T12:42:19Z',
  integration: 1,
  integration_name: 'Pegasus · Loja JF',
  direction: 'inbound',
  operation: 'pegasus_orders',
  success: true,
  http_status: 200,
  duration_ms: 900,
  records: 17,
  error_message: null,
  details: { received: 17, orders_new: 12, orders_updated: 0, unchanged: 4 },
}

describe('summarize', () => {
  it('mostra o total recebido e só os números diferentes de zero', () => {
    expect(summarize(base)).toBe('17 recebidas · 12 novas · 4 sem mudança')
  })

  it('mostra o erro quando a chamada falhou', () => {
    expect(summarize({ ...base, success: false, error_message: 'Dados inválidos.' })).toBe(
      'Dados inválidos.',
    )
  })

  it('mostra a versão no teste de conexão', () => {
    expect(summarize({ ...base, operation: 'pegasus_ping', details: { version: '1.0' } })).toBe(
      'Coletor 1.0',
    )
  })

  it('cai no total de registros quando não há resumo (chamadas antigas)', () => {
    expect(summarize({ ...base, details: null })).toBe('17 registros')
    expect(summarize({ ...base, operation: 'outra', details: {} })).toBe('17 registros')
  })
})
