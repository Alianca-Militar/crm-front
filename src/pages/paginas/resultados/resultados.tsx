import { useNavigate, useParams } from 'react-router'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { formatMoney } from '../../../lib/format'
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_TONE,
  useCampaignClicks,
  useCampaignDaily,
  useCampaigns,
} from '../campanhas/campanhas_api'
import { AreaChart, Funil } from '../relatorios/desempenho_campanhas'
import { PRECO_DISPARO } from './precos'
import '../relatorios/relatorios.css'
import './resultados.css'

const int = (v: number) => Math.round(v).toLocaleString('pt-BR')
const pct = (v: number, digits = 1) =>
  `${v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

/** Resultado de uma campanha: indicadores, funil e vendas x vendas da campanha. */
export default function Resultados() {
  const { id } = useParams()
  const navigate = useNavigate()
  const list = useCampaigns()
  // Só campanhas que já saíram têm resultado.
  const sent = (list.data ?? []).filter((c) => c.exported_at || c.sent_at)
  const campaign = id ? list.data?.find((c) => c.id === Number(id)) : sent[0]
  const r = campaign?.results
  const daily = useCampaignDaily(campaign?.id ?? null)
  const clicks = useCampaignClicks(campaign?.id ?? null).data
  const hasLink = (clicks?.links.length ?? 0) > 0
  const dias = (daily.data ?? []).map((d) => ({
    dia: d.day,
    total: Number(d.total),
    campanhas: Number(d.campaign),
  }))
  const share = (() => {
    const total = dias.reduce((t, d) => t + d.total, 0)
    return total ? (dias.reduce((t, d) => t + d.campanhas, 0) / total) * 100 : null
  })()

  const revenue = Number(r?.revenue ?? 0)
  const price = campaign ? PRECO_DISPARO[campaign.store_code] : undefined
  const investment = r && price !== undefined ? r.sent * price : null
  const roi = investment ? (revenue - investment) / investment : null
  const conversion = r?.sent ? (r.orders / r.sent) * 100 : null

  const kpis = [
    {
      label: 'Valor de vendas',
      valor: formatMoney(revenue),
      sub: r ? `${int(r.orders)} vendas de ${int(r.buyers)} clientes` : 'sem envios ainda',
    },
    {
      label: 'ROI',
      valor:
        roi === null
          ? '—'
          : roi.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      sub: '(vendas − investimento) ÷ investimento',
    },
    {
      label: 'Investimento da campanha',
      valor: investment === null ? '—' : formatMoney(investment),
      sub:
        price === undefined
          ? 'sem preço por disparo para a loja'
          : `${int(r?.sent ?? 0)} disparos × ${formatMoney(price)}`,
    },
    {
      label: 'Conversão',
      valor: conversion === null ? '—' : pct(conversion, 2),
      sub: r ? `${int(r.orders)} vendas ÷ ${int(r.sent)} disparos` : 'vendas ÷ disparos',
    },
  ]

  return (
    <div className="page page-resultados">
      <div className="page-head">
        <div className="resultados-head">
          {campaign && (
            <div className="resultados-meta">
              <span className={`badge ${CAMPAIGN_STATUS_TONE[campaign.status]}`}>
                {CAMPAIGN_STATUS_LABEL[campaign.status]}
              </span>
              <span className="muted">
                {campaign.store_name} · {campaign.number_label}
                {campaign.exported_at
                  ? ` · exportada em ${dateFormat.format(new Date(campaign.exported_at))}`
                  : ''}
              </span>
            </div>
          )}
          <h1 className="page-title resultados-title">
            {campaign?.name ?? 'Resultados das campanhas'}
          </h1>
        </div>
        <div className="page-actions">
          <label className="inline-select">
            Campanha
            <select
              value={campaign?.id ?? ''}
              onChange={(e) => navigate(`/campanhas/${e.target.value}/resultados`)}
            >
              {!campaign && <option value="">Escolha</option>}
              {sent.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.store_code}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {list.isError && (
        <MsgNok titulo="Não foi possível carregar as campanhas" mensagem={list.error.message} />
      )}
      {list.isSuccess && id && !campaign && (
        <MsgNok titulo="Campanha não encontrada" mensagem="Escolha outra campanha na lista." />
      )}

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value resultados-kpi-value">{k.valor}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="card-head">
          <div className="resultados-chart-title">
            <h2 className="card-title">Vendas totais x vendas da campanha</h2>
            <span className="muted">
              {dias.length > 0
                ? `${dias.length} dias, do primeiro envio ao fim da janela de ${campaign?.attribution_window_days ?? 15} dias`
                : ''}
              {share !== null ? ` · campanha = ${pct(share)} das vendas` : ''}
            </span>
          </div>
          <div className="legend">
            <span className="legend-item">
              <span className="legend-swatch campanhas-swatch-total" />
              Total das lojas
            </span>
            <span className="legend-item">
              <span className="legend-swatch campanhas-swatch-camp" />
              Campanha
            </span>
          </div>
        </div>
        {daily.isError && (
          <MsgNok titulo="Não foi possível carregar as vendas" mensagem={daily.error.message} />
        )}
        {daily.isSuccess && dias.length === 0 && (
          <p className="muted">A campanha ainda não teve envios.</p>
        )}
        {dias.length > 0 && <AreaChart dias={dias} />}
      </section>

      <div className="row">
        <section className="card campanhas-funil-card resultados-funil">
          <h2 className="card-title">Funil da campanha</h2>
          <Funil
            etapas={[
              { etapa: 'Disponibilizados', valor: campaign?.audience_included ?? null },
              { etapa: 'Enviados', valor: r?.sent ?? 0 },
              { etapa: 'Entregues', valor: r?.delivered ?? 0 },
              { etapa: 'Lidos', valor: r?.read ?? 0 },
              {
                etapa: 'Clicados',
                valor: hasLink ? (clicks?.people ?? 0) : null,
                nota: clicks ? 'A mensagem não tem link curto (/l/…)' : 'Carregando…',
              },
              { etapa: 'Comprados', valor: r?.orders ?? 0 },
            ]}
          />
        </section>

        <section className="card resultados-resumo">
          <h2 className="card-title">Resumo</h2>
          <dl className="resultados-dl">
            <div>
              <dt>Template</dt>
              <dd className="mono">{campaign?.template_name ?? '—'}</dd>
            </div>
            <div>
              <dt>Número</dt>
              <dd>{campaign?.number_label ?? '—'}</dd>
            </div>
            <div>
              <dt>Link</dt>
              <dd className="mono">
                {hasLink ? clicks?.links.map((l) => `/l/${l.code}`).join(', ') : '—'}
              </dd>
            </div>
            <div>
              <dt>Cliques no link</dt>
              <dd>
                {hasLink
                  ? `${int(clicks?.clicks ?? 0)} cliques · ${int(clicks?.people ?? 0)} pessoas`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Taxa de entrega</dt>
              <dd>{r?.sent ? pct((r.delivered / r.sent) * 100) : '—'}</dd>
            </div>
            <div>
              <dt>Taxa de leitura</dt>
              <dd>{r?.sent ? pct((r.read / r.sent) * 100) : '—'}</dd>
            </div>
            <div>
              <dt>Ticket médio</dt>
              <dd>{r?.orders ? formatMoney(revenue / r.orders) : '—'}</dd>
            </div>
            <div>
              <dt>Custo por venda</dt>
              <dd>{investment !== null && r?.orders ? formatMoney(investment / r.orders) : '—'}</dd>
            </div>
            <div>
              <dt>Janela de atribuição</dt>
              <dd>{campaign?.attribution_window_days ?? 15} dias, qualquer loja</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  )
}
