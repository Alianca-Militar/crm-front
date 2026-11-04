import { useState } from 'react'
import MsgNok from '../../../components/msg_nok/msg_nok'
import {
  type IntegrationLogFilters,
  useIntegrationLogs,
  useIntegrations,
} from '../integracoes/integracoes_api'
import IntegrationLogTable from '../integracoes/integration_log_table'
import { PAGE_SIZE } from './logs_api'

const EMPTY: IntegrationLogFilters = { integration: '', result: '', date_from: '', date_to: '' }

/** Aba "Integrações" de Admin > Logs: cada chamada das integrações (integration_logs). */
export default function IntegrationsTab() {
  const [filters, setFilters] = useState<IntegrationLogFilters>(EMPTY)
  const [page, setPage] = useState(1)
  const logs = useIntegrationLogs(filters, page)
  const integrations = useIntegrations()

  function update(patch: Partial<IntegrationLogFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(1)
  }

  const count = logs.data?.count ?? 0
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const first = count ? (page - 1) * PAGE_SIZE + 1 : 0
  const last = Math.min(page * PAGE_SIZE, count)
  const hasFilter = Object.values(filters).some(Boolean)

  return (
    <>
      <div className="filter-bar">
        <div className="field">
          <label htmlFor="il-integracao">Integração</label>
          <select
            id="il-integracao"
            value={filters.integration}
            onChange={(e) => update({ integration: e.target.value })}
          >
            <option value="">Todas</option>
            {(integrations.data ?? []).map((i) => (
              <option key={i.id} value={String(i.id)}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="il-resultado">Resultado</label>
          <select
            id="il-resultado"
            value={filters.result}
            onChange={(e) => update({ result: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="ok">OK</option>
            <option value="error">Só erros</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="il-de">De</label>
          <input
            id="il-de"
            type="date"
            value={filters.date_from}
            max={filters.date_to || undefined}
            onChange={(e) => update({ date_from: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="il-ate">Até</label>
          <input
            id="il-ate"
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

      {logs.isError && (
        <MsgNok titulo="Não foi possível carregar os logs" mensagem={logs.error.message} />
      )}

      <IntegrationLogTable
        logs={logs.data?.results}
        loading={logs.isFetching}
        showIntegration
        empty={hasFilter ? 'Nenhuma chamada com esses filtros.' : 'Nenhuma chamada ainda.'}
      />

      {count > 0 && (
        <div className="pager">
          <span>
            {first}–{last} de {count} registros
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
    </>
  )
}
