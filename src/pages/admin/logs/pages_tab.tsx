import { useState } from 'react'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { formatLastAccess } from '../../../lib/format'
import { useStores } from '../lojas/lojas_api'
import { useUsers } from '../usuarios/usuarios_api'
import { PAGE_SIZE } from './logs_api'
import { type PageViewFilters, usePageSummary, usePageViews } from './pages_api'

const EMPTY: PageViewFilters = { screen: '', user: '', store: '', date_from: '', date_to: '' }

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR')}`
}

/** Aba "Pages" de Admin > Logs: quais telas são abertas, por quem e quando (page_views). */
export default function PagesTab() {
  const [filters, setFilters] = useState<PageViewFilters>(EMPTY)
  const [page, setPage] = useState(1)
  const summary = usePageSummary(filters)
  const views = usePageViews(filters, page)
  const users = useUsers()
  const stores = useStores()

  function update(patch: Partial<PageViewFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(1)
  }

  // Clicar na tela já filtrada tira o filtro.
  function toggleScreen(code: string) {
    update({ screen: filters.screen === code ? '' : code })
  }

  const rows = summary.data ?? []
  const maxViews = Math.max(1, ...rows.map((r) => r.views))
  const totalViews = rows.reduce((sum, r) => sum + r.views, 0)
  const count = views.data?.count ?? 0
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const hasFilter = Object.values(filters).some(Boolean)

  return (
    <>
      <div className="filter-bar">
        <div className="field">
          <label htmlFor="pv-tela">Tela</label>
          <select
            id="pv-tela"
            value={filters.screen}
            onChange={(e) => update({ screen: e.target.value })}
          >
            <option value="">Todas</option>
            {[...rows]
              .sort((a, b) => a.page.localeCompare(b.page, 'pt-BR'))
              .map((r) => (
                <option key={r.page_code} value={r.page_code}>
                  {r.page}
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pv-user">Usuário</label>
          <select id="pv-user" value={filters.user} onChange={(e) => update({ user: e.target.value })}>
            <option value="">Todos</option>
            {(users.data ?? []).map((u) => (
              <option key={u.id} value={String(u.id)}>
                {`${u.first_name} ${u.last_name}`.trim() || u.email}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pv-loja">Loja</label>
          <select
            id="pv-loja"
            value={filters.store}
            onChange={(e) => update({ store: e.target.value })}
          >
            <option value="">Todas</option>
            {(stores.data ?? []).map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.code} · {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pv-de">De</label>
          <input
            id="pv-de"
            type="date"
            value={filters.date_from}
            max={filters.date_to || undefined}
            onChange={(e) => update({ date_from: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="pv-ate">Até</label>
          <input
            id="pv-ate"
            type="date"
            value={filters.date_to}
            min={filters.date_from || undefined}
            onChange={(e) => update({ date_to: e.target.value })}
          />
        </div>
        {hasFilter && (
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              setFilters(EMPTY)
              setPage(1)
            }}
          >
            Limpar
          </button>
        )}
      </div>

      {summary.isError && (
        <MsgNok titulo="Não foi possível carregar os acessos" mensagem={summary.error.message} />
      )}

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Acessos por tela</h2>
          <span className="muted">
            {totalViews} {totalViews === 1 ? 'visita' : 'visitas'} no período · clique numa tela
            para ver os acessos dela
          </span>
        </div>
        <div className="table-wrap">
          <table className="table compact pages-summary">
            <thead>
              <tr>
                <th>Tela</th>
                <th>Visitas</th>
                <th className="num">Usuários</th>
                <th>Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {summary.isPending && (
                <tr>
                  <td colSpan={4} className="muted">
                    Carregando…
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.page_code}
                  className={[
                    'pages-row',
                    r.views === 0 ? 'pages-row-empty' : '',
                    filters.screen === r.page_code ? 'pages-row-active' : '',
                  ].join(' ')}
                  tabIndex={0}
                  aria-selected={filters.screen === r.page_code}
                  onClick={() => toggleScreen(r.page_code)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleScreen(r.page_code)
                    }
                  }}
                >
                  <td>
                    <div className="strong">{r.page}</div>
                    <div className="mono muted logs-small">{r.route}</div>
                  </td>
                  <td className="pages-bar-cell">
                    <span className="pages-bar">
                      <span
                        className="pages-bar-fill"
                        style={{ width: `${(r.views / maxViews) * 100}%` }}
                      />
                    </span>
                    <span className="pages-bar-value">{r.views}</span>
                  </td>
                  <td className="num">{r.users}</td>
                  <td className="muted nowrap">{formatLastAccess(r.last_view)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">
            Últimos acessos
            {filters.screen && ` · ${rows.find((r) => r.page_code === filters.screen)?.page ?? ''}`}
          </h2>
        </div>
        {views.isError && <MsgNok mensagem={views.error.message} />}
        <div className="table-wrap">
          <table
            className={
              views.isFetching ? 'table compact logs-table loading' : 'table compact logs-table'
            }
          >
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Usuário</th>
                <th>Tela</th>
                <th>Loja</th>
              </tr>
            </thead>
            <tbody>
              {views.data?.results.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    {hasFilter ? 'Nenhum acesso com esses filtros.' : 'Nenhum acesso registrado ainda.'}
                  </td>
                </tr>
              )}
              {views.data?.results.map((v) => (
                <tr key={v.id}>
                  <td className="mono nowrap logs-small">{formatDateTime(v.viewed_at)}</td>
                  <td className="strong">{v.user ?? '—'}</td>
                  <td>{v.page}</td>
                  <td className="muted">{v.store ?? 'Todas as lojas'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {count > PAGE_SIZE && (
          <div className="pager">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, count)} de {count} acessos
            </span>
            <div className="pager-buttons">
              <button
                type="button"
                className="btn sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
