import { Link, useLocation, useNavigate } from 'react-router'
import { useLogout, useMe } from '../../lib/auth'
import logoHorizontal from '../../img/logos/invictus-logotipo-horizontal-branca-registrado.svg'
import { IconChevronLeft, IconChevronRight, IconLogout } from './icons'
import { getRouteInfo, navGroups } from './nav'
import './menu.css'

type MenuProps = {
  /** Menu recolhido (só ícones). */
  collapsed: boolean
  onToggle: () => void
  /** Contadores exibidos ao lado do item (ex.: { conversas: 7 }). */
  badges?: Record<string, number>
}

export default function Menu({ collapsed, onToggle, badges = {} }: MenuProps) {
  const { pathname } = useLocation()
  const { activeKey } = getRouteInfo(pathname)
  const navigate = useNavigate()
  const logout = useLogout()
  const role = useMe().data?.role

  function handleLogout() {
    logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })
  }

  return (
    <nav aria-label="Menu principal" className={collapsed ? 'app-menu collapsed' : 'app-menu'}>
      <div className="app-menu-top">
        <Link
          to="/"
          className="app-menu-brand"
          aria-label="Invictus · Home"
          title="Invictus · Meia Lua CRM"
        >
          {/* Uma imagem só: o logotipo começa com o símbolo "I". Recolhido, a moldura
              estreita mostra apenas o símbolo; ao abrir, ela se alarga e revela o resto. */}
          <span className="app-menu-logo-clip">
            <img src={logoHorizontal} alt="Invictus" className="app-menu-logo" />
          </span>
          {!collapsed && <span className="app-menu-tagline">Meia Lua &amp; Invictus · CRM</span>}
        </Link>
        <button
          type="button"
          className="app-menu-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
        </button>
      </div>

      {navGroups.map((group, index) => (
        <div key={group.key} className="app-menu-group">
          {collapsed ? (
            index > 0 && <div className="app-menu-divider" aria-hidden="true" />
          ) : (
            <div className="app-menu-title">{group.title}</div>
          )}

          {group.items
            .filter((item) => !item.roles || (role && item.roles.includes(role)))
            .map((item) => {
              const Icon = item.icon
              const active = item.key === activeKey
              const badge = badges[item.key] ?? 0
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={active ? 'app-menu-link active' : 'app-menu-link'}
                  aria-current={active ? 'page' : undefined}
                  aria-label={
                    collapsed ? item.label + (badge ? `, ${badge} aguardando` : '') : undefined
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <Icon />
                  {!collapsed && <span className="app-menu-label">{item.label}</span>}
                  {badge > 0 && (
                    <span className="app-menu-badge" aria-hidden={collapsed}>
                      {badge}
                    </span>
                  )}
                </Link>
              )
            })}
        </div>
      ))}

      <div className="app-menu-bottom">
        <button
          type="button"
          onClick={handleLogout}
          disabled={logout.isPending}
          className="app-menu-link app-menu-logout"
          aria-label={collapsed ? 'Sair' : undefined}
          title={collapsed ? 'Sair' : undefined}
        >
          <IconLogout />
          {!collapsed && <span className="app-menu-label">Sair</span>}
        </button>
      </div>

      {!collapsed && (
        <div className="app-menu-footer">
          Meia Lua &amp; D'Barreto Confecções
          <br />
          desde 1997
        </div>
      )}
    </nav>
  )
}
