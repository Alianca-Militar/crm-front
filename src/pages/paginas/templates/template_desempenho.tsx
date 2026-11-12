import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { formatDateTime, formatMoney } from '../../../lib/format'
import {
  type MessageTemplate,
  type TemplateEventRow,
  useTemplatePerformance,
} from './templates_api'

const int = (v: number) => v.toLocaleString('pt-BR')
const pct = (part: number, total: number) =>
  total ? `${((part / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—'

const VALUE_LABEL: Record<string, string> = {
  GREEN: 'Alta',
  YELLOW: 'Média',
  RED: 'Baixa',
  UNKNOWN: 'Sem avaliação',
  APPROVED: 'Aprovado',
  PAUSED: 'Pausado',
  DISABLED: 'Desativado',
  REJECTED: 'Rejeitado',
  PENDING: 'Em aprovação',
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
}

const EVENT_LABEL: Record<TemplateEventRow['event'], string> = {
  STATUS: 'Status',
  QUALITY: 'Qualidade',
  CATEGORY: 'Categoria (muda o preço)',
}

const label = (v: string | null) => (v ? (VALUE_LABEL[v] ?? v) : '—')

/** Desempenho na Meta (30 dias, inclusive o que sai pela FastZap) e histórico do template. */
export function DesempenhoModal({
  template,
  onClose,
}: {
  template: MessageTemplate
  onClose: () => void
}) {
  const perf = useTemplatePerformance(template.id)
  const p = perf.data
  const t = p?.totals
  const peak = Math.max(1, ...(p?.daily ?? []).map((d) => d.sent))

  return (
    <Modal
      open
      titulo={`Desempenho · ${template.name}`}
      onClose={onClose}
      footer={
        <button type="button" className="btn sm" onClick={onClose}>
          Fechar
        </button>
      }
    >
      {perf.isError && <MsgNok titulo="Não foi possível carregar" mensagem={perf.error.message} />}
      {!p && !perf.isError && <p className="muted">Carregando…</p>}
      {p && t && (
        <div className="tpl-perf">
          {template.status === 'PAUSED' && (
            <div className="tpl-perf-alert">
              <strong>
                Pausado pela Meta
                {template.paused_until ? ` até ${formatDateTime(template.paused_until)}` : ''}.
              </strong>{' '}
              {template.pause_reason ?? 'Qualidade baixa.'} Campanha com este template falha
              enquanto ele estiver pausado.
            </div>
          )}

          <p className="muted tpl-perf-sub">
            Números da Meta dos últimos 30 dias, inclusive os envios feitos pela FastZap.
            {p.synced_at ? ` Atualizado ${formatDateTime(p.synced_at)}.` : ''}
          </p>

          {p.daily.length === 0 ? (
            <p className="muted">
              Ainda sem estatísticas da Meta para este template. Elas chegam todo dia às 8h (ou pelo
              botão “Atualizar estatísticas”), se estiverem ativadas na conta da Meta.
            </p>
          ) : (
            <>
              <div className="tpl-perf-kpis">
                <div>
                  <span>Enviadas</span>
                  <strong>{int(t.sent)}</strong>
                </div>
                <div>
                  <span>Entregues</span>
                  <strong>{int(t.delivered)}</strong>
                  <small>{pct(t.delivered, t.sent)}</small>
                </div>
                <div>
                  <span>Lidas</span>
                  <strong>{int(t.read)}</strong>
                  <small>{pct(t.read, t.delivered)} das entregues</small>
                </div>
                <div>
                  <span>Cliques</span>
                  <strong>{int(t.clicked)}</strong>
                  <small>{pct(t.clicked, t.read)} das lidas</small>
                </div>
                <div>
                  <span>Custo (Meta)</span>
                  <strong>{t.cost === null ? '—' : formatMoney(t.cost)}</strong>
                  <small>aproximado</small>
                </div>
              </div>

              <div className="tpl-perf-chart" aria-label="Enviadas e lidas por dia">
                {p.daily.map((d) => (
                  <div
                    key={d.day}
                    className="tpl-perf-day"
                    title={`${d.day.split('-').reverse().join('/')}: ${int(d.sent)} enviadas, ${int(d.read)} lidas, ${int(d.clicked)} cliques`}
                  >
                    <span className="sent" style={{ height: `${(d.sent / peak) * 100}%` }} />
                    <span className="read" style={{ height: `${(d.read / peak) * 100}%` }} />
                  </div>
                ))}
              </div>
              <div className="legend">
                <span className="legend-item">
                  <span className="legend-swatch tpl-swatch-sent" />
                  Enviadas
                </span>
                <span className="legend-item">
                  <span className="legend-swatch tpl-swatch-read" />
                  Lidas
                </span>
              </div>

              {p.buttons.length > 0 && (
                <div className="tpl-perf-block">
                  <h3>Cliques por botão</h3>
                  <ul className="tpl-perf-buttons">
                    {p.buttons.map((b) => (
                      <li key={b.button}>
                        <span>{b.button}</span>
                        <strong>{int(b.count)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="tpl-perf-block">
            <h3>Histórico na Meta</h3>
            {p.events.length === 0 ? (
              <p className="muted">Nenhuma mudança de status, qualidade ou categoria registrada.</p>
            ) : (
              <div className="table-wrap">
                <table className="table compact">
                  <thead>
                    <tr>
                      <th>Quando</th>
                      <th>O quê</th>
                      <th>De</th>
                      <th>Para</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.events.map((e) => (
                      <tr key={e.id}>
                        <td className="nowrap">{formatDateTime(e.occurred_at)}</td>
                        <td>
                          {EVENT_LABEL[e.event]}
                          {e.detail && <div className="muted tpl-perf-detail">{e.detail}</div>}
                        </td>
                        <td>{label(e.old_value)}</td>
                        <td>{label(e.new_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
