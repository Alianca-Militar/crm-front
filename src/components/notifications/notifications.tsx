import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { IconBell } from '../menu/icons'
import './notifications.css'

export type NotificationItem = {
  id: string
  titulo: string
  texto: string
  /** Texto pronto para exibir, ex.: "há 4 min". */
  quando: string
  /** Tela para onde a notificação leva. */
  href: string
  lida: boolean
  /** Falhas ganham o marcador vermelho. */
  tipo?: 'info' | 'erro'
}

type NotificationsProps = {
  items: NotificationItem[]
  onMarkAllRead?: () => void
}

export default function Notifications({ items, onMarkAllRead }: NotificationsProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const unread = items.filter((n) => !n.lida).length

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="notifications" ref={rootRef}>
      <button
        type="button"
        className={open ? 'notifications-bell open' : 'notifications-bell'}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={unread ? `Notificações, ${unread} novas` : 'Notificações'}
      >
        <IconBell />
        {unread > 0 && <span className="notifications-bell-badge">{unread}</span>}
      </button>

      {open && (
        <div className="notifications-panel">
          <div className="notifications-head">
            <div className="notifications-head-title">
              <span className="notifications-title">Notificações</span>
              {unread > 0 && (
                <span className="notifications-count">
                  {unread} {unread === 1 ? 'nova' : 'novas'}
                </span>
              )}
            </div>
            {unread > 0 && onMarkAllRead && (
              <button type="button" className="notifications-mark" onClick={onMarkAllRead}>
                Marcar como lidas
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="notifications-empty">Nenhuma notificação no momento.</p>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                to={n.href}
                className={n.lida ? 'notifications-item' : 'notifications-item unread'}
                onClick={() => setOpen(false)}
              >
                <span
                  className={
                    n.tipo === 'erro'
                      ? 'notifications-dot error'
                      : n.lida
                        ? 'notifications-dot'
                        : 'notifications-dot unread'
                  }
                />
                <span className="notifications-item-body">
                  <span className="notifications-item-title">{n.titulo}</span>
                  <span className="notifications-item-text">{n.texto}</span>
                  <span className="notifications-item-when">{n.quando}</span>
                </span>
              </Link>
            ))
          )}

          <div className="notifications-foot">
            <Link to="/admin/logs" onClick={() => setOpen(false)}>
              Ver todas as notificações
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
