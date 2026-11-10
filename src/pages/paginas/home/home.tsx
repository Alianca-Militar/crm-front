import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import MsgNok from '../../../components/msg_nok/msg_nok'
import {
  IconCriancas,
  IconFluxo,
  IconOportunidades,
  IconPlus,
} from '../../../components/menu/icons'
import { api } from '../../../lib/api'
import { useMe } from '../../../lib/auth'
import { formatLastAccess, formatMoney, initials, titleCase } from '../../../lib/format'
import { delta, lastDayLabel, MONTHS, periodLabel } from './home_utils'
import MonthChart, { type MonthTrend } from './month_chart'
import YearChart from './year_chart'
import './home.css'

type Period = {
  revenue: string
  orders: number
  avg_ticket: string | null
  buyers: number
  /** Vendas com cliente identificado (fora o consumidor final). */
  identified: number
}

type Dashboard = {
  month: string
  kpis: {
    /** Acumulado do mês: dia 1 até ontem (as vendas do dia chegam no dia seguinte). */
    month: Period
    /** Os mesmos dias do ano anterior. */
    previous_year: Period
    period: { start: string; end: string }
    previous_year_period: { start: string; end: string }
  }
  customers: { total: number; with_phone: number; active_12m: number; new_this_month: number }
  /** Vendas por dia do mês e a tendência até o último dia. */
  daily: MonthTrend
  series: { month: string; stores: Record<string, string> }[]
  stores: ({ id: number; code: string; name: string } & Period)[]
  /** Vendas do mês por grupo de produto: os 7 maiores e "Outros". */
  groups: { group: string; amount: string; share: string }[]
  campaigns: {
    id: number
    name: string
    status: string
    status_label: string
    store_name: string | null
  }[]
  conversations_waiting: {
    total: number
    /** As 5 que esperam há mais tempo (aba Aguardando de Conversas, lojas do usuário). */
    items: {
      id: number
      name: string | null
      number_label: string
      last_message_at: string
      waiting_since: string
    }[]
  }
}

const n = (value: number) => value.toLocaleString('pt-BR')

function saudacao(date: Date) {
  const h = date.getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** "Quarta, 21 de outubro" */
function dataPorExtenso(date: Date) {
  const dia = date.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '')
  const resto = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${resto}`
}

/** "2026-05" → "mai/26" */
function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`
}

/** R$ 154.616 → "R$ 154,6 mil" */
function compact(value: number) {
  if (value >= 1_000_000)
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (value >= 1000)
    return `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return formatMoney(value)
}

export default function Home() {
  const hoje = new Date()
  const me = useMe()
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: () => api<Dashboard>('/dashboard/') })
  const d = dash.data
  const firstName = titleCase(me.data?.name.split(' ')[0] ?? '')

  const month = d?.kpis.month
  const prev = d?.kpis.previous_year
  const dias = d ? periodLabel(d.kpis.period.start, d.kpis.period.end) : ''
  const base = d
    ? periodLabel(d.kpis.previous_year_period.start, d.kpis.previous_year_period.end, true)
    : ''
  const kpis =
    d && month && prev
      ? [
          {
            label: `Faturamento · ${dias}`,
            valor: compact(Number(month.revenue)),
            ...delta(Number(month.revenue), Number(prev.revenue), base),
          },
          {
            label: `Vendas · ${dias}`,
            valor: n(month.orders),
            ...delta(month.orders, prev.orders, base),
          },
          {
            label: `Ticket médio · ${dias}`,
            valor: formatMoney(month.avg_ticket),
            ...delta(Number(month.avg_ticket ?? 0), Number(prev.avg_ticket ?? 0), base),
          },
          {
            label: 'Clientes ativos · 12 meses',
            valor: n(d.customers.active_12m),
            text: `${n(d.customers.new_this_month)} primeira compra no mês`,
            tone: 'neutral',
          },
        ]
      : []

  return (
    <div className="page page-home">
      <div className="page-head">
        <div className="page-head-text">
          <div className="home-date">{dataPorExtenso(hoje)}</div>
          <h1 className="page-title">
            {saudacao(hoje)}
            {firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
        <Link to="/campanhas/nova" className="btn primary">
          <IconPlus size={18} />
          Nova campanha
        </Link>
      </div>

      {dash.isError && <MsgNok titulo="Não foi possível carregar" mensagem={dash.error.message} />}

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.valor}</div>
            <div className={`kpi-sub ${k.tone}`}>{k.text}</div>
          </div>
        ))}
      </div>

      <div className="row">
        <section className="card home-chart-card">
          <div className="card-head">
            <h2 className="card-title">Vendas do mês · {d ? monthLabel(d.month) : ''}</h2>
            <div className="legend">
              {d?.stores.map((s, i) => (
                <span key={s.id} className="legend-item">
                  <span className={`legend-swatch home-series-${i % 3}`} />
                  {s.name}
                </span>
              ))}
              <span className="legend-item">
                <span className="legend-line" />
                Acumulado
              </span>
              <span className="legend-item">
                <span className="legend-line trend" />
                Tendência
              </span>
            </div>
          </div>
          {d && (
            <div className="month-summary">
              <div className="month-summary-item">
                <span className="month-summary-label">Vendido até ontem</span>
                <span className="month-summary-value display-num">
                  {formatMoney(d.daily.realized)}
                </span>
              </div>
              <div className="month-summary-item">
                <span className="month-summary-label">Tendência até {lastDayLabel(d.month)}</span>
                <span className="month-summary-value display-num">
                  {formatMoney(d.daily.trend)}
                </span>
              </div>
              <p className="month-summary-note">
                Ritmo de cada loja no mês, com o peso de cada dia da semana nas últimas 8 semanas,
                nos {d.daily.open_days_left} dias de loja aberta que faltam (segunda a sábado, sem
                feriados). Passe o mouse nas barras para ver cada dia.
              </p>
            </div>
          )}
          {d && <MonthChart data={d.daily} stores={d.stores} />}
        </section>

        <section className="card-dark home-stores">
          <h2 className="card-title">Lojas · {d ? monthLabel(d.month) : ''}</h2>
          {d?.stores.map((s) => (
            <div key={s.id} className="home-store">
              <div className="home-store-name">{s.name}</div>
              <div className="home-store-value display-num">{formatMoney(s.revenue)}</div>
              <div className="home-store-info">
                {s.orders
                  ? `${n(s.orders)} vendas · ticket médio ${formatMoney(s.avg_ticket)}`
                  : 'Sem vendas no mês (ou dados ainda não carregados)'}
              </div>
              <div className="home-store-stats">
                <div>
                  <span>Previsão do mês</span>
                  <strong>{formatMoney(d.daily.trend_by_store[String(s.id)] ?? 0)}</strong>
                </div>
                <div>
                  <span>Cliente identificado</span>
                  <strong>
                    {s.orders ? `${Math.round((s.identified / s.orders) * 100)}%` : '—'}
                  </strong>
                  {s.orders > 0 && (
                    <small>
                      {n(s.identified)} de {n(s.orders)} vendas
                    </small>
                  )}
                </div>
              </div>
            </div>
          ))}
          <Link to="/relatorios" className="home-stores-link">
            Ver relatório por loja
          </Link>
        </section>
      </div>

      <section className="card home-year-card">
        <div className="card-head">
          <h2 className="card-title">Faturamento por mês · últimos 12 meses</h2>
          <div className="legend">
            {d?.stores.map((s, i) => (
              <span key={s.id} className="legend-item">
                <span className={`legend-swatch home-series-${i % 3}`} />
                {s.name}
              </span>
            ))}
          </div>
        </div>

        {d && <YearChart series={d.series} stores={d.stores} current={d.month} />}
      </section>

      <div className="home-lists">
        <section className="card home-list">
          <div className="card-head home-list-head">
            <h2 className="card-title">Campanhas recentes</h2>
            <Link to="/campanhas">Ver todas</Link>
          </div>
          {d?.campaigns.length === 0 && <div className="home-empty">Nenhuma campanha ainda.</div>}
          {d?.campaigns.map((c) => (
            <Link key={c.id} to={`/campanhas/${c.id}`} className="home-campaign">
              <div className="home-campaign-top">
                <span className="home-campaign-name">{c.name}</span>
                <span className="home-campaign-channel">WhatsApp</span>
              </div>
              <div className="home-campaign-info">
                {c.status_label}
                {c.store_name ? ` · ${c.store_name}` : ''}
              </div>
            </Link>
          ))}
        </section>

        <section className="card home-list">
          <div className="card-head home-list-head">
            <h2 className="card-title">
              Conversas aguardando resposta
              {d?.conversations_waiting.total ? ` (${d.conversations_waiting.total})` : ''}
            </h2>
            <Link to="/conversas">Abrir inbox</Link>
          </div>
          {d?.conversations_waiting.items.length === 0 && (
            <div className="home-empty">
              Nenhuma conversa esperando. As conversas aparecem aqui quando o WhatsApp estiver
              conectado ao CRM.
            </div>
          )}
          {d?.conversations_waiting.items.map((m) => (
            <Link key={m.id} to="/conversas" className="home-chat">
              <span className="avatar">{initials(m.name)}</span>
              <span className="home-chat-body">
                <span className="home-chat-name">{titleCase(m.name) || 'Sem nome'}</span>
                <span className="home-chat-msg">{m.number_label}</span>
              </span>
              <span className="home-chat-when">{formatLastAccess(m.waiting_since)}</span>
            </Link>
          ))}
        </section>
      </div>

      <div className="home-lists">
        <section className="card home-list">
          <div className="card-head home-list-head">
            <h2 className="card-title">Vendas por grupo · {d ? monthLabel(d.month) : ''}</h2>
          </div>
          {d?.groups.length === 0 && <div className="home-empty">Sem vendas no mês.</div>}
          {d?.groups.map((g) => (
            <div key={g.group} className="home-group">
              <div className="home-group-top">
                <span className="home-group-name">
                  {titleCase(g.group)}{' '}
                  <span className="home-group-value">({formatMoney(g.amount)})</span>
                </span>
                <span className="home-group-share">
                  {Number(g.share).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%
                </span>
              </div>
              <div className="home-group-bar">
                <span
                  style={{ width: `${(Number(g.share) / Number(d.groups[0].share)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </section>

        <section className="card home-list">
          <div className="card-head home-list-head">
            <h2 className="card-title">Conversão de vendas</h2>
            <span className="badge sm tone-orange">em breve</span>
          </div>
          <div className="home-conversion">
            <div className="home-conversion-rate display-num">—%</div>
            <div className="home-conversion-goal">
              <span>Meta: —</span>
              <span>Realizado: —</span>
            </div>
          </div>
          {(
            [
              ['Fluxo', IconFluxo],
              ['Oportunidades', IconOportunidades],
              ['Crianças', IconCriancas],
            ] as const
          ).map(([label, Icon]) => (
            <div key={label} className="home-conversion-row">
              <span className="home-conversion-label">
                <span className="home-conversion-icon">
                  <Icon size={16} />
                </span>
                {label}
              </span>
              <strong>—</strong>
            </div>
          ))}
          <div className="home-empty">
            Em breve: o fluxo de pessoas nas lojas ainda não chega ao CRM.
          </div>
        </section>
      </div>
    </div>
  )
}
