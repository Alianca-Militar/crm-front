import type { ComponentType } from 'react'
import type { Role } from '../../lib/auth'
import {
  IconAprovacoes,
  IconBloqueios,
  IconCampanhas,
  IconCanais,
  IconClientes,
  IconConfiguracoes,
  IconConversas,
  IconGatilhos,
  IconHome,
  IconIntegracoes,
  IconLogs,
  IconLojas,
  IconRelatorios,
  IconResultados,
  IconTemplates,
  IconUsuarios,
} from './icons'

export type NavItem = {
  key: string
  to: string
  label: string
  icon: ComponentType<{ size?: number }>
  /** Seção no breadcrumb, quando diferente da do grupo. */
  section?: string
  /** Perfis que veem o item e abrem a tela. */
  roles: Role[]
}

export type NavGroup = {
  key: 'crm' | 'admin'
  title: string // título no menu
  section: string // seção no breadcrumb do header
  items: NavItem[]
}

// Quem vê cada item (o backend também recusa com 403 o que o perfil não pode).
const ALL: Role[] = ['admin', 'gerente', 'analista', 'vendedor']
const OFFICE: Role[] = ['admin', 'gerente', 'analista']
const MANAGERS: Role[] = ['admin', 'gerente']
const ADMIN: Role[] = ['admin']

export const navGroups: NavGroup[] = [
  {
    key: 'crm',
    title: 'Relacionamento',
    section: 'Relacionamento',
    items: [
      { key: 'home', to: '/', label: 'Home', icon: IconHome, section: 'CRM', roles: ALL },
      {
        key: 'campanhas',
        to: '/campanhas',
        label: 'Campanhas',
        icon: IconCampanhas,
        roles: OFFICE,
      },
      {
        key: 'resultados',
        to: '/resultados',
        label: 'Resultados',
        icon: IconResultados,
        section: 'Campanhas',
        roles: OFFICE,
      },
      { key: 'clientes', to: '/clientes', label: 'Clientes', icon: IconClientes, roles: ALL },
      {
        key: 'bloqueios',
        to: '/bloqueios',
        label: 'Bloqueios',
        icon: IconBloqueios,
        roles: OFFICE,
      },
      { key: 'conversas', to: '/conversas', label: 'Conversas', icon: IconConversas, roles: ALL },
      {
        key: 'templates',
        to: '/templates',
        label: 'Templates',
        icon: IconTemplates,
        roles: OFFICE,
      },
      { key: 'gatilhos', to: '/gatilhos', label: 'Gatilhos', icon: IconGatilhos, roles: MANAGERS },
      {
        key: 'relatorios',
        to: '/relatorios',
        label: 'Relatórios',
        icon: IconRelatorios,
        roles: OFFICE,
      },
    ],
  },
  {
    key: 'admin',
    title: 'Admin',
    section: 'Admin',
    items: [
      {
        key: 'usuarios',
        to: '/admin/usuarios',
        label: 'Usuários',
        icon: IconUsuarios,
        roles: ADMIN,
      },
      { key: 'lojas', to: '/admin/lojas', label: 'Lojas', icon: IconLojas, roles: MANAGERS },
      { key: 'canais', to: '/admin/canais', label: 'Canais', icon: IconCanais, roles: ADMIN },
      {
        key: 'aprovacoes',
        to: '/admin/aprovacoes',
        label: 'Aprovações',
        icon: IconAprovacoes,
        roles: ADMIN,
      },
      {
        key: 'integracoes',
        to: '/admin/integracoes',
        label: 'Integrações',
        icon: IconIntegracoes,
        roles: ADMIN,
      },
      { key: 'logs', to: '/admin/logs', label: 'Logs', icon: IconLogs, roles: ADMIN },
      {
        key: 'configuracoes',
        to: '/admin/configuracoes',
        label: 'Configurações',
        icon: IconConfiguracoes,
        roles: ADMIN,
      },
    ],
  },
]

/** Telas que não estão no menu, mas aparecem no breadcrumb. */
const extraCrumbs: { pattern: RegExp; activeKey: string | null; section: string; crumb: string }[] =
  [
    {
      pattern: /^\/campanhas\/nova\/?$/,
      activeKey: 'campanhas',
      section: 'Campanhas',
      crumb: 'Nova campanha',
    },
    {
      pattern: /^\/campanhas\/[^/]+\/resultados\/?$/,
      activeKey: 'resultados',
      section: 'Campanhas',
      crumb: 'Resultados',
    },
    {
      pattern: /^\/clientes\/[^/]+\/?$/,
      activeKey: 'clientes',
      section: 'Clientes',
      crumb: 'Ficha do cliente',
    },
    { pattern: /^\/admin\/perfil\/?$/, activeKey: null, section: 'Admin', crumb: 'Meu perfil' },
  ]

export type RouteInfo = { activeKey: string | null; section: string; crumb: string }

/** Descobre o item ativo do menu e o breadcrumb a partir da URL. */
export function getRouteInfo(pathname: string): RouteInfo {
  const extra = extraCrumbs.find((e) => e.pattern.test(pathname))
  if (extra) return { activeKey: extra.activeKey, section: extra.section, crumb: extra.crumb }

  for (const group of navGroups) {
    for (const item of group.items) {
      const match =
        item.to === '/'
          ? pathname === '/'
          : pathname === item.to || pathname.startsWith(item.to + '/')
      if (match) {
        return { activeKey: item.key, section: item.section ?? group.section, crumb: item.label }
      }
    }
  }
  return { activeKey: null, section: 'CRM', crumb: '' }
}

/** Grupos do menu com só os itens do perfil (grupo sem item some). */
export function visibleGroups(role: Role | undefined): NavGroup[] {
  if (!role) return []
  return navGroups
    .map((group) => ({ ...group, items: group.items.filter((i) => i.roles.includes(role)) }))
    .filter((group) => group.items.length > 0)
}

/** O perfil pode abrir esta URL? Telas fora do menu (ex.: Meu perfil) valem para todos. */
export function canAccess(pathname: string, role: Role): boolean {
  const { activeKey } = getRouteInfo(pathname)
  if (activeKey === null) return true
  const item = navGroups.flatMap((g) => g.items).find((i) => i.key === activeKey)
  return !item || item.roles.includes(role)
}
