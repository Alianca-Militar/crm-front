import type { ComponentType } from 'react'
import type { Role } from '../../lib/auth'
import {
  IconAprovacoes,
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
  /** Só aparece para estes perfis (padrão: todos). */
  roles?: Role[]
}

export type NavGroup = {
  key: 'crm' | 'admin'
  title: string // título no menu
  section: string // seção no breadcrumb do header
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    key: 'crm',
    title: 'Relacionamento',
    section: 'Relacionamento',
    items: [
      { key: 'home', to: '/', label: 'Home', icon: IconHome, section: 'CRM' },
      { key: 'campanhas', to: '/campanhas', label: 'Campanhas', icon: IconCampanhas },
      {
        key: 'resultados',
        to: '/resultados',
        label: 'Resultados',
        icon: IconResultados,
        section: 'Campanhas',
      },
      { key: 'clientes', to: '/clientes', label: 'Clientes', icon: IconClientes },
      { key: 'conversas', to: '/conversas', label: 'Conversas', icon: IconConversas },
      { key: 'templates', to: '/templates', label: 'Templates', icon: IconTemplates },
      { key: 'gatilhos', to: '/gatilhos', label: 'Gatilhos', icon: IconGatilhos },
      { key: 'relatorios', to: '/relatorios', label: 'Relatórios', icon: IconRelatorios },
    ],
  },
  {
    key: 'admin',
    title: 'Admin',
    section: 'Admin',
    items: [
      { key: 'usuarios', to: '/admin/usuarios', label: 'Usuários', icon: IconUsuarios },
      { key: 'lojas', to: '/admin/lojas', label: 'Lojas', icon: IconLojas },
      { key: 'canais', to: '/admin/canais', label: 'Canais', icon: IconCanais },
      {
        key: 'aprovacoes',
        to: '/admin/aprovacoes',
        label: 'Aprovações',
        icon: IconAprovacoes,
        roles: ['admin'],
      },
      { key: 'integracoes', to: '/admin/integracoes', label: 'Integrações', icon: IconIntegracoes },
      { key: 'logs', to: '/admin/logs', label: 'Logs', icon: IconLogs },
      {
        key: 'configuracoes',
        to: '/admin/configuracoes',
        label: 'Configurações',
        icon: IconConfiguracoes,
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
