import type { ReactNode } from 'react'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { formatDateTime, formatLastAccess } from '../../../lib/format'
import {
  type LimitTier,
  LIMIT_LABEL,
  META_STATUS_LABEL,
  META_STATUS_TONE,
  QUALITY_LABEL,
} from './canais_api'
import {
  EVENT_LABEL,
  NAME_STATUS_LABEL,
  THROUGHPUT_LABEL,
  TEMPLATE_STATUS_LABEL,
  useNumberQuality,
  VERIFICATION_LABEL,
} from './numero_meta_api'

const limitText = (tier: string | null) => (tier ? (LIMIT_LABEL[tier as LimitTier] ?? tier) : '—')

function Dot({ value }: { value: string | null }) {
  if (!value) return <span className="muted">—</span>
  return (
    <span className="canais-quality">
      <span className={`canais-dot q-${value.toLowerCase()}`} aria-hidden="true" />
      {QUALITY_LABEL[value as keyof typeof QUALITY_LABEL] ?? value}
    </span>
  )
}

/** Aba Qualidade: o que a Meta informa do número, o histórico e a qualidade dos templates. */
export default function NumeroQualidade({ numberId }: { numberId: number }) {
  const quality = useNumberQuality(numberId)
  const q = quality.data

  if (quality.isError) {
    return (
      <MsgNok titulo="Não foi possível carregar a qualidade" mensagem={quality.error.message} />
    )
  }
  if (!q) return <p className="muted">Carregando…</p>

  const d = q.details
  const nameStatus = d.new_name_status && d.new_name_status !== 'NONE' ? d.new_name_status : null
  const items: { label: string; value: ReactNode; sub?: string }[] = [
    { label: 'Qualidade do número', value: <Dot value={q.quality_rating} /> },
    {
      label: 'Status na Meta',
      value: q.meta_status ? (
        <span className={`badge sm ${META_STATUS_TONE[q.meta_status]}`}>
          {META_STATUS_LABEL[q.meta_status]}
        </span>
      ) : (
        '—'
      ),
    },
    {
      label: 'Limite de mensagens',
      value: limitText(q.messaging_limit_tier),
      sub: 'Conversas iniciadas por dia, somando os números do portfólio',
    },
    {
      label: 'Velocidade de envio',
      value: d.throughput?.level
        ? (THROUGHPUT_LABEL[d.throughput.level] ?? d.throughput.level)
        : '—',
    },
    {
      label: 'Nome de exibição',
      value: q.display_name ?? '—',
      sub: d.name_status ? (NAME_STATUS_LABEL[d.name_status] ?? d.name_status) : undefined,
    },
    {
      label: 'Troca de nome',
      value: nameStatus ? (NAME_STATUS_LABEL[nameStatus] ?? nameStatus) : 'Sem troca pendente',
    },
    {
      label: 'Empresa oficial (selo)',
      value:
        d.is_official_business_account === undefined
          ? '—'
          : d.is_official_business_account
            ? 'Sim'
            : 'Não',
    },
    {
      label: 'Verificação do número',
      value: d.code_verification_status
        ? (VERIFICATION_LABEL[d.code_verification_status] ?? d.code_verification_status)
        : '—',
    },
  ]

  return (
    <div className="canais-qualidade">
      <p className="muted canais-hint">
        {q.meta_synced_at
          ? `Dados da Meta de ${formatLastAccess(q.meta_synced_at)}. O CRM consulta todo dia às 7h e quando a Meta avisa uma mudança; para atualizar agora, use “Atualizar da Meta” na lista de números.`
          : 'Ainda sem dados da Meta: use “Atualizar da Meta” na lista de números.'}
      </p>

      <div className="canais-qualidade-grid">
        {items.map((i) => (
          <div key={i.label} className="canais-qualidade-item">
            <span className="canais-qualidade-label">{i.label}</span>
            <strong className="canais-qualidade-value">{i.value}</strong>
            {i.sub && <span className="muted canais-small">{i.sub}</span>}
          </div>
        ))}
      </div>

      <section className="canais-qualidade-block">
        <h3 className="canais-qualidade-title">Histórico de qualidade e limite</h3>
        {q.history.length === 0 ? (
          <p className="muted">
            Nenhuma mudança registrada ainda. Cada aviso da Meta e cada mudança vista na consulta
            diária entram aqui.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table compact">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>O que aconteceu</th>
                  <th>Qualidade</th>
                  <th>Limite</th>
                  <th>Status</th>
                  <th>Origem</th>
                </tr>
              </thead>
              <tbody>
                {q.history.map((h) => (
                  <tr key={h.id}>
                    <td className="nowrap">{formatDateTime(h.occurred_at)}</td>
                    <td>
                      {h.event
                        .split(',')
                        .map((e) => EVENT_LABEL[e] ?? e)
                        .join(' · ')}
                    </td>
                    <td className="nowrap">
                      <Dot value={h.quality_rating} />
                    </td>
                    <td className="nowrap">{limitText(h.messaging_limit)}</td>
                    <td>{h.meta_status ? META_STATUS_LABEL[h.meta_status] : '—'}</td>
                    <td className="muted">
                      {h.source === 'webhook' ? 'Aviso da Meta' : 'Consulta'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="canais-qualidade-block">
        <h3 className="canais-qualidade-title">Qualidade dos templates</h3>
        {q.templates.length === 0 ? (
          <p className="muted">Nenhum template enviado à Meta neste número.</p>
        ) : (
          <div className="table-wrap">
            <table className="table compact">
              <thead>
                <tr>
                  <th>Template</th>
                  <th>Categoria</th>
                  <th>Status</th>
                  <th>Qualidade</th>
                </tr>
              </thead>
              <tbody>
                {q.templates.map((t) => (
                  <tr key={t.id}>
                    <td className="mono">
                      {t.name} <span className="muted">· {t.language}</span>
                    </td>
                    <td>{t.category}</td>
                    <td>{TEMPLATE_STATUS_LABEL[t.status] ?? t.status}</td>
                    <td className="nowrap">
                      <Dot value={t.quality_score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
