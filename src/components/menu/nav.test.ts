import { describe, expect, it } from 'vitest'
import { getRouteInfo } from './nav'

describe('getRouteInfo', () => {
  it('marca a Home na raiz', () => {
    expect(getRouteInfo('/').activeKey).toBe('home')
  })

  it('usa o breadcrumb extra da ficha do cliente', () => {
    expect(getRouteInfo('/clientes/123')).toEqual({
      activeKey: 'clientes',
      section: 'Clientes',
      crumb: 'Ficha do cliente',
    })
  })

  it('não marca nenhum item em rota desconhecida', () => {
    expect(getRouteInfo('/nao-existe').activeKey).toBeNull()
  })
})
