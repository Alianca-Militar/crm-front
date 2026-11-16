import { useState } from 'react'
import { Link } from 'react-router'
import MsgNok from '../../../components/msg_nok/msg_nok'
import {
  NOTIFICATIONS_PAGE,
  timeAgo,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from '../../../components/notifications/notifications_api'
import { formatDateTime } from '../../../lib/format'
import './notificacoes.css'

/** Todas as notificações do usuário (as do sino e as mais antigas, até 90 dias). */
export default function Notificacoes() {
  const [unread, setUnread] = useState(false)
  const [page, setPage] = useState(1)
  const list = useNotifications(page, unread)
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const rows = list.data?.results ?? []
  const total = list.data?.count ?? 0
  const pages = Math.max(1, Math.ceil(total / NOTIFICATIONS_PAGE))

  function filter(value: boolean) {
    setUnread(value)
    setPage(1)
  }

  return (
    <div className="page narrow page-notificacoes">
      <div className="page-head">
        <h1 className="page-title">Notificações</h1>
        <div className="page-actions">
          <button
            type="button"
            className="btn sm"
            disabled={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Marcar todas como lidas
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Filtro" className="seg-tabs">
        {[
          { value: false, label: 'Todas' },
          { value: true, label: 'Não lidas' },
        ].map((t) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            className="seg-tab"
            aria-selected={unread === t.value}
            onClick={() => filter(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.isError && (
        <MsgNok titulo="Não foi possível carregar as notificações" mensagem={list.error.message} />
      )}

      <section className="card notificacoes-list">
        {list.isPending && <p className="muted">Carregando…</p>}
        {list.isSuccess && rows.length === 0 && (
          <p className="muted">
            {unread ? 'Nenhuma notificação por ler.' : 'Nenhuma notificação nos últimos 90 dias.'}
          </p>
        )}
        {rows.map((n) => {
          const body = (
            <>
              <span
                className={
                  n.type === 'error'
                    ? 'notifications-dot error'
                    : n.read_at
                      ? 'notifications-dot'
                      : 'notifications-dot unread'
                }
              />
              <span className="notificacoes-body">
                <span className="notificacoes-title">{n.title}</span>
                {n.body && <span className="notificacoes-text">{n.body}</span>}
                <span className="notificacoes-when" title={formatDateTime(n.created_at)}>
                  {timeAgo(n.created_at)}
                </span>
              </span>
            </>
          )
          const className = n.read_at ? 'notificacoes-item' : 'notificacoes-item unread'
          const onClick = () => {
            if (!n.read_at) markRead.mutate(n.id)
          }
          return n.link ? (
            <Link key={n.id} to={n.link} className={className} onClick={onClick}>
              {body}
            </Link>
          ) : (
            <button key={n.id} type="button" className={className} onClick={onClick}>
              {body}
            </button>
          )
        })}
      </section>

      {pages > 1 && (
        <div className="pager">
          <span>
            Página {page} de {pages}
          </span>
          <div className="pager-buttons">
            <button
              type="button"
              className="btn sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </button>
            <button
              type="button"
              className="btn sm"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      <p className="muted notificacoes-note">
        Escolha o que quer receber em <Link to="/admin/perfil">Meu perfil › Me avisar quando</Link>.
      </p>
    </div>
  )
}
