import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { api, ApiError } from '../../lib/api'
import { ROLE_LABEL, useMe } from '../../lib/auth'
import { useTemplateReviews } from '../../pages/paginas/templates/templates_api'
import Header, { type HeaderUser, type StoreOption } from '../header/header'
import Menu from '../menu/menu'
import { canAccess } from '../menu/nav'
import type { NotificationItem } from '../notifications/notifications'
import './layout.css'

const MENU_KEY = 'crm.menuRecolhido'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(MENU_KEY) === '1'
  } catch {
    return false
  }
}

function saveCollapsed(value: boolean) {
  try {
    localStorage.setItem(MENU_KEY, value ? '1' : '0')
  } catch {
    // sem localStorage (aba anônima, bloqueio): o menu só não lembra a escolha
  }
}

/** Layout das telas logadas: menu lateral, header no topo e a página no centro. */
export default function Layout() {
  const location = useLocation()
  const me = useMe()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  // null = ainda não mexeu no seletor: vale a loja padrão do perfil.
  const [store, setStore] = useState<string | null>(null)
  // TODO: alimentar com os alertas do painel (qualidade do número, revisões, falhas, webhooks)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  // Loja do header: a escolhida, senão a padrão do perfil, senão a única que a pessoa tem.
  const myStores = me.data?.stores ?? []
  const defaultStore =
    myStores.find((st) => st.id === me.data?.default_store_id)?.code ??
    (myStores.length === 1 ? myStores[0].code : '')
  const currentStore = store ?? defaultStore
  const meId = me.data?.id
  // Contador de "Aprovações" no menu (templates aguardando um admin).
  const reviews = useTemplateReviews(me.data?.role === 'admin')

  // Registra cada tela aberta (aba "Pages" em Admin > Logs). Falha aqui não atrapalha a tela.
  useEffect(() => {
    if (!meId) return
    api('/page-views/', {
      method: 'POST',
      body: { path: location.pathname, store: currentStore },
    }).catch(() => {})
  }, [meId, location.pathname, currentStore])

  if (me.isPending) {
    return <div className="app-loading">Carregando…</div>
  }
  if (me.isError) {
    const semSessao = me.error instanceof ApiError && [401, 403].includes(me.error.status)
    if (semSessao) {
      return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    }
    return <div className="app-loading">{me.error.message}</div>
  }
  // Tela fora do perfil (ex.: vendedor digitou /campanhas): volta para a Home.
  if (!canAccess(location.pathname, me.data.role)) {
    return <Navigate to="/" replace />
  }

  const user: HeaderUser = {
    nome: me.data.name,
    perfil: ROLE_LABEL[me.data.role],
    loja: me.data.stores.length === 1 ? me.data.stores[0].code : null,
    iniciais: me.data.initials,
    foto: me.data.avatar_url,
  }
  const stores: StoreOption[] = [
    ...(me.data.stores.length > 1 ? [{ value: '', label: 'Todas as lojas' }] : []),
    ...me.data.stores.map((st) => ({ value: st.code, label: st.name })),
  ]

  function toggleMenu() {
    setCollapsed((current) => {
      saveCollapsed(!current)
      return !current
    })
  }

  return (
    <div className={collapsed ? 'app-layout menu-collapsed' : 'app-layout'}>
      <Menu
        collapsed={collapsed}
        onToggle={toggleMenu}
        badges={{ aprovacoes: reviews.data?.length ?? 0 }}
      />
      <Header
        user={user}
        stores={stores}
        store={currentStore}
        onStoreChange={setStore}
        notifications={notifications}
        onMarkAllRead={() => setNotifications((list) => list.map((n) => ({ ...n, lida: true })))}
      />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
