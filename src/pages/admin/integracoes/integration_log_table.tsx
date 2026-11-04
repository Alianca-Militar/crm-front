import { useState } from 'react'
import Modal from '../../../components/modal/modal'
import { DETAIL_LABEL, type IntegrationLogRow, operationLabel, summarize } from './integracoes_api'
import './integration_log_table.css'

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR')}`
}

function formatDuration(ms: number | null) {
  if (ms === null) return '—'
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1).replace('.', ',')} s`
}

type Props = {
  logs: IntegrationLogRow[] | undefined
  loading: boolean
  /** Mostra a coluna da integração (na aba de Logs, que junta todas). */
  showIntegration?: boolean
  empty: string
  className?: string
}

/** Tabela de chamadas de integração, com o resumo de cada uma e o botão Detalhes. */
export default function IntegrationLogTable({
  logs,
  loading,
  showIntegration,
  empty,
  className = '',
}: Props) {
  const [detail, setDetail] = useState<IntegrationLogRow | null>(null)
  const cols = showIntegration ? 6 : 5

  return (
    <>
      <div className="table-wrap">
        <table
          className={`table compact integration-log-table ${loading ? 'loading' : ''} ${className}`.trim()}
        >
          <thead>
            <tr>
              <th>Data e hora</th>
              {showIntegration && <th>Integração</th>}
              <th>Operação</th>
              <th>Resultado</th>
              <th>O que veio</th>
              <th>
                <span className="sr-only">Detalhes</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && !logs && (
              <tr>
                <td colSpan={cols} className="muted">
                  Carregando…
                </td>
              </tr>
            )}
            {logs?.length === 0 && (
              <tr>
                <td colSpan={cols} className="muted">
                  {empty}
                </td>
              </tr>
            )}
            {logs?.map((l) => (
              <tr key={l.id}>
                <td className="mono nowrap integration-log-time">
                  {formatDateTime(l.occurred_at)}
                </td>
                {showIntegration && <td className="strong">{l.integration_name}</td>}
                <td>{operationLabel(l.operation)}</td>
                <td>
                  <span className={`badge sm square ${l.success ? 'tone-green' : 'tone-red'}`}>
                    {l.success ? 'OK' : 'Erro'}
                  </span>
                </td>
                <td className={l.success ? '' : 'integration-log-error'}>{summarize(l)}</td>
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
      {detail && <LogDetail log={detail} onClose={() => setDetail(null)} />}
    </>
  )
}

function LogDetail({ log, onClose }: { log: IntegrationLogRow; onClose: () => void }) {
  const details = log.details ?? {}
  const known = Object.keys(DETAIL_LABEL).filter((k) => k in details)
  const keys = [...known, ...Object.keys(details).filter((k) => !(k in DETAIL_LABEL))]

  return (
    <Modal
      open
      titulo="Detalhes da chamada"
      onClose={onClose}
      footer={
        <button type="button" className="btn sm" onClick={onClose}>
          Fechar
        </button>
      }
    >
      <div className="integration-log-detail">
        <dl className="dl">
          <dt>Quando</dt>
          <dd>{formatDateTime(log.occurred_at)}</dd>
          <dt>Integração</dt>
          <dd>{log.integration_name}</dd>
          <dt>Operação</dt>
          <dd>{operationLabel(log.operation)}</dd>
          <dt>Resultado</dt>
          <dd>{log.success ? 'OK' : 'Erro'}</dd>
          {log.error_message && (
            <>
              <dt>Erro</dt>
              <dd>{log.error_message}</dd>
            </>
          )}
          <dt>Registros</dt>
          <dd>{log.records ?? '—'}</dd>
          <dt>Duração</dt>
          <dd>{formatDuration(log.duration_ms)}</dd>
          <dt>Resposta</dt>
          <dd className="mono">{log.http_status ?? '—'}</dd>
        </dl>

        {keys.length > 0 && (
          <div className="table-wrap">
            <table className="table compact">
              <thead>
                <tr>
                  <th>O que veio</th>
                  <th className="num">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k}>
                    <td>{DETAIL_LABEL[k] ?? k}</td>
                    <td className="num mono">{String(details[k])}</td>
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
