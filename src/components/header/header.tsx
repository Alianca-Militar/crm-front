import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { IconChevronRight, IconSearch } from '../menu/icons'
import { getRouteInfo } from '../menu/nav'
import Avatar from '../avatar/avatar'
import Notifications, { type NotificationItem } from '../notifications/notifications'
import './header.css'

export type HeaderUser = {
  nome: string
  perfil: string
  loja?: string | null
  /** Iniciais vindas do backend (se faltar, calcula pelo nome). */
  iniciais?: string
  /** URL da foto do avatar */
  foto?: string | null
}

export type StoreOption = { value: string; label: string }

type HeaderProps = {
  user: HeaderUser
  stores: StoreOption[]
  store: string
  onStoreChange: (value: string) => void
  notifications: NotificationItem[]
  onMarkAllRead?: () => void
}

function initials(nome: string) {
  const parts = nome.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export default function Header({
  user,
  stores,
  store,
  onStoreChange,
  notifications,
  onMarkAllRead,
}: HeaderProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { section, crumb } = getRouteInfo(pathname)
  const [search, setSearch] = useState('')

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    const q = search.trim()
    navigate(q ? `/clientes?q=${encodeURIComponent(q)}` : '/clientes')
  }

  return (
    <header className="app-header">
      <div className="app-header-crumbs">
        <span>{section}</span>
        <IconChevronRight size={14} />
        <span className="app-header-crumb">{crumb}</span>
      </div>

      <form className="app-header-search" role="search" onSubmit={handleSearch}>
        <IconSearch size={18} />
        <label htmlFor="app-header-search-input" className="sr-only">
          Buscar
        </label>
        <input
          id="app-header-search-input"
          type="search"
          placeholder="Buscar cliente, CPF, telefone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      <label className="app-header-store">
        Loja
        <select value={store} onChange={(e) => onStoreChange(e.target.value)}>
          {stores.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <Notifications items={notifications} onMarkAllRead={onMarkAllRead} />

      <Link to="/admin/perfil" className="app-header-user">
        <Avatar
          className="app-header-avatar"
          url={user.foto}
          initials={user.iniciais || initials(user.nome)}
        />
        <span className="app-header-user-text">
          <span className="app-header-user-name">{user.nome}</span>
          <span className="app-header-user-role">
            {user.perfil}
            {user.loja ? ` · ${user.loja}` : ''}
          </span>
        </span>
      </Link>
    </header>
  )
}
