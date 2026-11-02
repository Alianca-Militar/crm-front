import { describe, expect, it } from 'vitest'
import { canAccess, getRouteInfo, visibleGroups } from './nav'

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

const keys = (role: Parameters<typeof visibleGroups>[0]) =>
  visibleGroups(role).flatMap((g) => g.items.map((i) => i.key))

describe('menu por perfil', () => {
  it('vendedor vê só Home, Clientes e Conversas, sem o grupo Admin', () => {
    expect(keys('vendedor')).toEqual(['home', 'clientes', 'conversas'])
    expect(visibleGroups('vendedor').map((g) => g.key)).toEqual(['crm'])
  })

  it('analista vê as telas do CRM, sem Gatilhos e sem Admin', () => {
    expect(keys('analista')).toEqual([
      'home',
      'campanhas',
      'resultados',
      'clientes',
      'bloqueios',
      'conversas',
      'templates',
      'relatorios',
    ])
  })

  it('gerente vê tudo do CRM e só Lojas no Admin', () => {
    const admin = visibleGroups('gerente').find((g) => g.key === 'admin')
    expect(admin?.items.map((i) => i.key)).toEqual(['lojas'])
    expect(keys('gerente')).toContain('gatilhos')
  })

  it('admin vê tudo', () => {
    const all = visibleGroups('admin').flatMap((g) => g.items)
    expect(all).toHaveLength(16)
  })

  it('sem perfil não vê nada', () => {
    expect(visibleGroups(undefined)).toEqual([])
  })
})

describe('canAccess', () => {
  it('vendedor não abre campanhas nem telas de admin, mesmo digitando a URL', () => {
    expect(canAccess('/campanhas', 'vendedor')).toBe(false)
    expect(canAccess('/campanhas/nova', 'vendedor')).toBe(false)
    expect(canAccess('/campanhas/5/resultados', 'vendedor')).toBe(false)
    expect(canAccess('/admin/usuarios', 'vendedor')).toBe(false)
    expect(canAccess('/bloqueios', 'vendedor')).toBe(false)
  })

  it('vendedor abre clientes, a ficha, conversas e o próprio perfil', () => {
    expect(canAccess('/clientes', 'vendedor')).toBe(true)
    expect(canAccess('/clientes/123', 'vendedor')).toBe(true)
    expect(canAccess('/conversas', 'vendedor')).toBe(true)
    expect(canAccess('/admin/perfil', 'vendedor')).toBe(true)
  })

  it('gerente não abre Usuários nem Configurações', () => {
    expect(canAccess('/admin/usuarios', 'gerente')).toBe(false)
    expect(canAccess('/admin/configuracoes', 'gerente')).toBe(false)
    expect(canAccess('/admin/lojas', 'gerente')).toBe(true)
  })
})
