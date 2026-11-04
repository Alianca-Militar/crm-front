import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { useUsers } from '../usuarios/usuarios_api'
import {
  type AuditLogRow,
  exportUrl,
  LOG_TYPE_LABEL,
  LOG_TYPE_TONE,
  type LogFilters,
  type LogType,
  PAGE_SIZE,
  useAuditLogs,
} from './logs_api'
import IntegrationsTab from './integrations_tab'
import PagesTab from './pages_tab'
import './logs.css'

const EMPTY: LogFilters = { q: '', type: '', user: '', date_from: '', date_to: '' }

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR')}`
}

type Aba = 'logs' | 'pages' | 'integracoes'

const ABAS: { key: Aba; label: string; subtitle: string }[] = [
  {
    key: 'logs',
    label: 'Logs',
    subtitle: 'Trilha de auditoria de acessos, alterações e envios. Retenção de 12 meses.',
  },
  {
    key: 'pages',
    label: 'Pages',
    subtitle: 'Quais telas cada usuário abriu, e quando. Retenção de 12 meses.',
  },
  {
    key: 'integracoes',
    label: 'Integrações',
    subtitle: 'O que cada integração mandou para o CRM, e quando. Retenção de 12 meses.',
  },
]

export default function Logs() {
  // A aba fica na URL (?aba=pages): o link pode ser compartilhado e o "voltar" funciona.
  const [params, setParams] = useSearchParams()
  const current = ABAS.find((a) => a.key === params.get('aba')) ?? ABAS[0]
  const aba = current.key

  return (
    <div className="page page-logs">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Logs</h1>
          <p className="page-subtitle">{current.subtitle}</p>
        </div>
      </div>

      <div role="tablist" aria-label="Tipo de registro" className="seg-tabs">
        {ABAS.map((a) => (
          <button
            key={a.key}
            type="button"
            role="tab"
            aria-selected={a.key === aba}
            className="seg-tab"
            onClick={() => setParams(a.key === 'logs' ? {} : { aba: a.key })}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'logs' && <LogsTab />}
      {aba === 'pages' && <PagesTab />}
      {aba === 'integracoes' && <IntegrationsTab />}
    </div>
  )
}

function LogsTab() {
  const [filters, setFilters] = useState<LogFilters>(EMPTY)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<AuditLogRow | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const logs = useAuditLogs(filters, page)
  const users = useUsers()

  function update(patch: Partial<LogFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(1)
  }

  // A busca espera a pessoa parar de digitar antes de consultar.
  function onSearch(value: string) {
    setSearch(value)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => update({ q: value }), 350)
  }

  function clear() {
    window.clearTimeout(timer.current)
    setSearch('')
    setFilters(EMPTY)
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
        <div className="field wide">
          <label htmlFor="logs-q">Buscar</label>
          <input
            id="logs-q"
            type="search"
            placeholder="Usuário, ação, IP ou registro"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="logs-tipo">Tipo</label>
          <select
            id="logs-tipo"
            value={filters.type}
            onChange={(e) => update({ type: e.target.value as LogType | '' })}
          >
            <option value="">Todos</option>
            {(Object.keys(LOG_TYPE_LABEL) as LogType[]).map((t) => (
              <option key={t} value={t}>
                {LOG_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="logs-user">Usuário</label>
          <select
            id="logs-user"
            value={filters.user}
            onChange={(e) => update({ user: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="system">Sistema</option>
            {(users.data ?? []).map((u) => (
              <option key={u.id} value={String(u.id)}>
                {`${u.first_name} ${u.last_name}`.trim() || u.email}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="logs-de">De</label>
          <input
            id="logs-de"
            type="date"
            value={filters.date_from}
            max={filters.date_to || undefined}
            onChange={(e) => update({ date_from: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="logs-ate">Até</label>
          <input
            id="logs-ate"
            type="date"
            value={filters.date_to}
            min={filters.date_from || undefined}
            onChange={(e) => update({ date_to: e.target.value })}
          />
        </div>
        {(hasFilter || search) && (
          <button type="button" className="btn sm" onClick={clear}>
            Limpar
          </button>
        )}
        <a className="btn sm" href={exportUrl(filters)} download>
          Exportar CSV
        </a>
      </div>

      {logs.isError && (
        <MsgNok titulo="Não foi possível carregar os logs" mensagem={logs.error.message} />
      )}

      <div className="table-wrap">
        <table
          className={
            logs.isFetching ? 'table compact logs-table loading' : 'table compact logs-table'
          }
        >
          <thead>
            <tr>
              <th>Data e hora</th>
              <th>Tipo</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>Origem</th>
              <th>
                <span className="sr-only">Detalhes</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.isPending && (
              <tr>
                <td colSpan={6} className="muted">
                  Carregando…
                </td>
              </tr>
            )}
            {logs.data?.results.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  {hasFilter ? 'Nenhum registro com esses filtros.' : 'Nenhum registro ainda.'}
                </td>
              </tr>
            )}
            {logs.data?.results.map((l) => (
              <tr key={l.id}>
                <td className="mono nowrap logs-small">{formatDateTime(l.occurred_at)}</td>
                <td>
                  <span className={`badge sm square ${LOG_TYPE_TONE[l.type]}`}>
                    {LOG_TYPE_LABEL[l.type]}
                  </span>
                </td>
                <td className="strong">{l.actor}</td>
                <td>{l.description}</td>
                <td className="mono muted logs-small">{l.origin || '—'}</td>
                <td className="num">
                  <button type="button" className="btn xs" onClick={() => setDetail(l)}>
                    Detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      {detail && <LogDetail log={detail} onClose={() => setDetail(null)} />}
    </>
  )
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** Janela com o antes/depois da alteração e os dados técnicos do evento. */
function LogDetail({ log, onClose }: { log: AuditLogRow; onClose: () => void }) {
  const before = log.before ?? {}
  const after = log.after ?? {}
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
  const hasBefore = Object.keys(before).length > 0

  return (
    <Modal
      open
      titulo="Detalhes do registro"
      onClose={onClose}
      footer={
        <button type="button" className="btn sm" onClick={onClose}>
          Fechar
        </button>
      }
    >
      <div className="logs-detail">
        <p className="logs-detail-desc">{log.description}</p>
        <dl className="dl">
          <dt>Quando</dt>
          <dd>{formatDateTime(log.occurred_at)}</dd>
          <dt>Usuário</dt>
          <dd>{log.actor}</dd>
          <dt>Tipo</dt>
          <dd>{LOG_TYPE_LABEL[log.type]}</dd>
          <dt>Origem</dt>
          <dd>{log.origin || '—'}</dd>
          <dt>Código</dt>
          <dd className="mono">{log.action}</dd>
          {log.entity_table && (
            <>
              <dt>Registro</dt>
              <dd className="mono">
                {log.entity_table}
                {log.entity_id ? ` #${log.entity_id}` : ''}
              </dd>
            </>
          )}
        </dl>

        {keys.length > 0 && (
          <div className="table-wrap">
            <table className="table compact">
              <thead>
                <tr>
                  <th>Campo</th>
                  {hasBefore && <th>Antes</th>}
                  <th>{hasBefore ? 'Depois' : 'Valor'}</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k}>
                    <td className="mono logs-small">{k}</td>
                    {hasBefore && <td className="logs-value">{formatValue(before[k])}</td>}
                    <td className="logs-value">{formatValue(after[k])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}
