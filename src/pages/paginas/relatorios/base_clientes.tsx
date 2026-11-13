import type { DateRange } from '../../../components/date_range/date_range_utils'
import { rangeText } from '../../../components/date_range/date_range_utils'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { formatMoney } from '../../../lib/format'
import { useCustomerBaseReport } from './relatorios_api'

type Tone = 'best' | 'good' | 'watch' | 'risk' | 'lost'

/** O que fazer com cada perfil RFM (os perfis vêm do backend, sales/pegasus.rfm_segment). */
const SEGMENT: Record<string, { acao: string; tom: Tone }> = {
  Campeões: { acao: 'Recompensar, VIP, pedir indicação.', tom: 'best' },
  Fiéis: { acao: 'Upsell, fidelidade, indicação.', tom: 'best' },
  Promissores: { acao: 'Incentivar a próxima compra.', tom: 'good' },
  Novos: { acao: 'Boas-vindas, garantir a 2ª compra.', tom: 'good' },
  'Em risco': { acao: 'Reativar logo: lembrete + oferta.', tom: 'risk' },
  Hibernando: { acao: 'Campanha de reativação ou aceitar a perda.', tom: 'lost' },
}

const int = (v: number) => Math.round(v).toLocaleString('pt-BR')
const pct = (part: number, total: number) =>
  total ? `${((part / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—'

/** Base de clientes: indicadores, vendas sem cliente, completude, lojas e perfis RFM. */
export default function BaseClientes({ range }: { range: DateRange }) {
  const report = useCustomerBaseReport(range)
  const r = report.data
  const total = r?.summary.total ?? 0

  const kpis = r
    ? [
        { label: 'Total de clientes', valor: int(total), sub: 'pessoas físicas na base' },
        {
          label: 'Com telefone',
          valor: int(r.summary.with_phone),
          sub: `${pct(r.summary.with_phone, total)} da base · ${int(r.summary.whatsapp)} com WhatsApp confirmado`,
        },
        {
          label: 'Cadastros completos',
          valor: int(r.summary.complete),
          sub: `${pct(r.summary.complete, total)} · CPF, telefone, cidade e endereço`,
        },
        {
          label: 'Liberados para marketing',
          valor: int(r.summary.marketing),
          sub: `${pct(r.summary.marketing, total)} · com telefone fora do bloqueio`,
        },
      ]
    : []
  const semId = r?.unidentified
  const semIdPct = semId?.total_orders ? (semId.orders / semId.total_orders) * 100 : 0
  const lojaMax = Math.max(1, ...(r?.stores ?? []).map((l) => l.customers))

  return (
    <>
      {report.isError && (
        <MsgNok titulo="Não foi possível carregar o relatório" mensagem={report.error.message} />
      )}

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.valor}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {semId && (
        <section className="card base-semid">
          <div className="base-semid-text">
            <h2 className="card-title">Vendas sem identificação (consumidor final)</h2>
            <p className="relatorios-note base-semid-note">
              Vendas de {rangeText(range)} lançadas no consumidor final do PDV, sem o cliente. Venda
              sem cliente não entra no RFM nem nas campanhas.
            </p>
          </div>
          <div className="base-semid-body">
            <div className="base-semid-nums">
              <div>
                <span>Sem identificar</span>
                <strong className="base-semid-pct">{pct(semId.orders, semId.total_orders)}</strong>
                <div className="base-bar" aria-hidden="true">
                  <span style={{ width: `${semIdPct}%` }} />
                </div>
              </div>
              <div>
                <span>Vendas</span>
                <strong>{int(semId.orders)}</strong>
                <small>de {int(semId.total_orders)} no período</small>
              </div>
              <div>
                <span>Valor</span>
                <strong>{formatMoney(semId.revenue)}</strong>
                <small>
                  {pct(Number(semId.revenue), Number(semId.total_revenue))} do faturamento
                </small>
              </div>
            </div>
            <div className="base-semid-stores">
              <h3 className="base-semid-sub">Por loja</h3>
              {semId.stores.length === 0 && <p className="muted">Sem vendas no período.</p>}
              {semId.stores.map((l) => {
                const p = l.total_orders ? (l.orders / l.total_orders) * 100 : 0
                return (
                  <div key={l.store_id} className="base-semid-store">
                    <div className="base-semid-store-top">
                      <span>{l.name}</span>
                      <strong>{pct(l.orders, l.total_orders)}</strong>
                    </div>
                    <div className="base-bar" aria-hidden="true">
                      <span style={{ width: `${p}%` }} />
                    </div>
                    <small>
                      {int(l.orders)} de {int(l.total_orders)} vendas · {formatMoney(l.revenue)} sem
                      cliente
                    </small>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {r && (
        <div className="row">
          <section className="card base-half">
            <h2 className="card-title">Completude do cadastro (% preenchido)</h2>
            <div className="base-bars">
              {r.completeness.map((c) => {
                const p = total ? Math.round((c.filled / total) * 100) : 0
                return (
                  <div key={c.field} className="base-bar-row">
                    <span className="base-bar-name">{c.field}</span>
                    <div className="base-bar">
                      <span style={{ width: `${p}%` }} />
                    </div>
                    <strong>{p}%</strong>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="card base-half">
            <h2 className="card-title">Clientes por loja</h2>
            <div className="base-bars">
              {r.stores.map((l) => (
                <div key={l.store_id ?? 'none'} className="base-bar-row wide">
                  <span className="base-bar-name">{l.name}</span>
                  <div className="base-bar dark">
                    <span style={{ width: `${(l.customers / lojaMax) * 100}%` }} />
                  </div>
                  <strong>
                    {int(l.customers)} <small>({pct(l.customers, total)})</small>
                  </strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {r && (
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              Matriz RFM · perfis (nº de clientes · receita em {rangeText(range)})
            </h2>
          </div>
          <div className="rfm-grid">
            {r.segments.map((s) => (
              <div key={s.segment} className={`rfm-card tone-${SEGMENT[s.segment]?.tom ?? 'good'}`}>
                <div className="rfm-name">{s.segment}</div>
                <div className="rfm-count display-num">{int(s.customers)}</div>
                <div className="rfm-revenue">{formatMoney(s.revenue)}</div>
                <div className="rfm-action">{SEGMENT[s.segment]?.acao}</div>
              </div>
            ))}
          </div>
          <p className="relatorios-note base-rfm-note">
            RFM: recência (última compra) e frequência (nº de compras), recalculados a cada carga
            das lojas. O perfil é o de hoje; a receita é a do período. {int(r.no_purchase)} clientes
            ainda sem compra ficam fora.
          </p>
        </section>
      )}
    </>
  )
}
