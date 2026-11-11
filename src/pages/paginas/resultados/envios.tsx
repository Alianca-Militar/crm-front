import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { formatDateTime, formatPhone } from '../../../lib/format'
import {
  type CampaignFailure,
  SEND_STATUS_LABEL,
  SEND_STATUS_TONE,
  type SendFilters,
  type SendStatus,
  useCampaignFailures,
  useCampaignSends,
} from '../campanhas/campanhas_api'

const int = (v: number) => v.toLocaleString('pt-BR')

function useDebounced<T>(value: T, ms = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(id)
  }, [value, ms])
  return debounced
}

/** Falhas por código da Meta; clicar num código filtra a tabela de envios. */
export function Falhas({
  campaignId,
  onPick,
}: {
  campaignId: number | null
  onPick: (code: number | null) => void
}) {
  const failures = useCampaignFailures(campaignId)
  const rows = failures.data ?? []
  const total = rows.reduce((t, r) => t + r.total, 0)

  return (
    <section className="card resultados-falhas">
      <h2 className="card-title">Falhas por código</h2>
      {failures.isError && (
        <MsgNok titulo="Não foi possível carregar as falhas" mensagem={failures.error.message} />
      )}
      {failures.isSuccess && rows.length === 0 && (
        <p className="muted">Nenhum envio falhou nesta campanha.</p>
      )}
      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="table compact">
            <thead>
              <tr>
                <th>Código</th>
                <th>O que aconteceu</th>
                <th className="num">Envios</th>
                <th className="num">% das falhas</th>
                <th>
                  <span className="sr-only">Ver envios</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: CampaignFailure) => (
                <tr key={r.code ?? 'none'}>
                  <td className="mono">{r.code ?? '—'}</td>
                  <td>{r.description}</td>
                  <td className="num">{int(r.total)}</td>
                  <td className="num">
                    {((r.total / total) * 100).toLocaleString('pt-BR', {
                      maximumFractionDigits: 1,
                    })}
                    %
                  </td>
                  <td className="nowrap">
                    {r.code !== null && (
                      <button type="button" className="btn sm" onClick={() => onPick(r.code)}>
                        Ver envios
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/** Tabela de envios da campanha, com filtro por status, erro, resposta e busca. */
export function Envios({
  campaignId,
  errorCode,
  onErrorCode,
}: {
  campaignId: number | null
  errorCode: number | null
  onErrorCode: (code: number | null) => void
}) {
  const [status, setStatus] = useState<SendStatus | ''>('')
  const [replied, setReplied] = useState(false)
  const [query, setQuery] = useState('')
  const q = useDebounced(query.trim())
  const filters: SendFilters = {
    current_status: status || undefined,
    error_code: errorCode ?? undefined,
    replied: replied || undefined,
    q: q || undefined,
  }
  const sends = useCampaignSends(campaignId, filters)
  const rows = sends.data?.pages.flatMap((p) => p.results) ?? []
  const loading = sends.isFetching && !sends.isFetchingNextPage

  return (
    <section className="card resultados-envios" id="envios">
      <h2 className="card-title">Envios</h2>
      <div className="filter-bar">
        <div className="field wide">
          <label htmlFor="env-q">Buscar</label>
          <input
            id="env-q"
            type="search"
            placeholder="Telefone ou nome do cliente"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="env-status">Status</label>
          <select
            id="env-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as SendStatus | '')}
          >
            <option value="">Todos</option>
            {Object.entries(SEND_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <label className="check resultados-check">
          <input type="checkbox" checked={replied} onChange={(e) => setReplied(e.target.checked)} />
          Só quem respondeu
        </label>
        {errorCode !== null && (
          <button type="button" className="btn sm" onClick={() => onErrorCode(null)}>
            Erro {errorCode} ✕
          </button>
        )}
      </div>

      {sends.isError && (
        <MsgNok titulo="Não foi possível carregar os envios" mensagem={sends.error.message} />
      )}

      <div className="table-wrap">
        <table className={`table compact ${loading ? 'loading' : ''}`.trim()}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Status</th>
              <th>Enviada</th>
              <th>Entregue</th>
              <th>Lida</th>
              <th>Respondeu</th>
              <th>Erro</th>
            </tr>
          </thead>
          <tbody>
            {sends.isPending && campaignId !== null && (
              <tr>
                <td colSpan={8} className="muted">
                  Carregando…
                </td>
              </tr>
            )}
            {sends.isSuccess && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  Nenhum envio com esses filtros.
                </td>
              </tr>
            )}
            {rows.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.customer ? (
                    <Link to={`/clientes/${s.customer}`}>{s.customer_name ?? 'Sem nome'}</Link>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="mono nowrap">{formatPhone(s.phone_normalized)}</td>
                <td>
                  <span className={`badge sm ${SEND_STATUS_TONE[s.current_status]}`}>
                    {SEND_STATUS_LABEL[s.current_status]}
                  </span>
                </td>
                <td className="nowrap">{s.sent_at ? formatDateTime(s.sent_at) : '—'}</td>
                <td className="nowrap">{s.delivered_at ? formatDateTime(s.delivered_at) : '—'}</td>
                <td className="nowrap">{s.read_at ? formatDateTime(s.read_at) : '—'}</td>
                <td className="nowrap">{s.replied_at ? formatDateTime(s.replied_at) : '—'}</td>
                <td title={s.error_description ?? undefined}>
                  {s.failed_at ? (
                    <>
                      <span className="mono">{s.error_code ?? '—'}</span>{' '}
                      <span className="muted">{s.error_description}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sends.hasNextPage && (
        <button
          type="button"
          className="btn resultados-more"
          disabled={sends.isFetchingNextPage}
          onClick={() => void sends.fetchNextPage()}
        >
          {sends.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}
    </section>
  )
}
