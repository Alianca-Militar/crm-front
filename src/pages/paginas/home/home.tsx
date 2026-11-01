import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { IconPlus } from '../../../components/menu/icons'
import { api } from '../../../lib/api'
import { useMe } from '../../../lib/auth'
import { formatLastAccess, formatMoney, initials, titleCase } from '../../../lib/format'
import './home.css'

type Period = { revenue: string; orders: number; avg_ticket: string | null; buyers: number }

type Dashboard = {
  month: string
  kpis: { month: Period; previous_same_period: Period }
  customers: { total: number; with_phone: number; active_12m: number; new_this_month: number }
  series: { month: string; stores: Record<string, string> }[]
  stores: ({ id: number; code: string; name: string } & Period)[]
  campaigns: {
    id: number
    name: string
    status: string
    status_label: string
    store_name: string | null
  }[]
  conversations_waiting: {
    total: number
    items: { id: number; name: string | null; number_label: string; last_message_at: string }[]
  }
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
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

/** Variação contra o mesmo período do mês anterior. */
function delta(now: number, before: number): { text: string; tone: string } {
  if (!before) return { text: 'sem base no mês anterior', tone: 'neutral' }
  const pct = Math.round(((now - before) / before) * 100)
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : ''
  return {
    text: `${sign}${Math.abs(pct)}% vs. mesmo período do mês anterior`,
    tone: pct > 0 ? 'good' : pct < 0 ? 'bad' : 'neutral',
  }
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
  const prev = d?.kpis.previous_same_period
  const kpis =
    d && month && prev
      ? [
          {
            label: 'Faturamento no mês',
            valor: compact(Number(month.revenue)),
            ...delta(Number(month.revenue), Number(prev.revenue)),
          },
          { label: 'Vendas no mês', valor: n(month.orders), ...delta(month.orders, prev.orders) },
          {
            label: 'Ticket médio no mês',
            valor: formatMoney(month.avg_ticket),
            ...delta(Number(month.avg_ticket ?? 0), Number(prev.avg_ticket ?? 0)),
          },
          {
            label: 'Clientes ativos · 12 meses',
            valor: n(d.customers.active_12m),
            text: `${n(d.customers.new_this_month)} primeira compra no mês`,
            tone: 'neutral',
          },
        ]
      : []

  const storeIds = d?.stores.map((s) => String(s.id)) ?? []
  const totals = d?.series.map((m) => storeIds.reduce((t, id) => t + Number(m.stores[id] ?? 0), 0))
  const max = Math.max(1, ...(totals ?? [0]))

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

          <div
            className="home-chart"
            role="img"
            aria-label="Gráfico de barras empilhadas com o faturamento mensal de cada loja"
          >
            {d?.series.map((m) => (
              <div
                key={m.month}
                className="home-bar"
                title={d.stores
                  .map((s) => `${s.name}: ${formatMoney(m.stores[String(s.id)] ?? 0)}`)
                  .join(' · ')}
              >
                {[...d.stores].reverse().map((s) => {
                  const value = Number(m.stores[String(s.id)] ?? 0)
                  const index = d.stores.indexOf(s)
                  return value > 0 ? (
                    <div
                      key={s.id}
                      className={`home-series-${index % 3}`}
                      style={{ height: `${(value / max) * 100}%` }}
                    />
                  ) : null
                })}
              </div>
            ))}
          </div>
          <div className="home-chart-labels">
            {d?.series.map((m) => (
              <div key={m.month}>{monthLabel(m.month)}</div>
            ))}
          </div>
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
            </div>
          ))}
          <Link to="/relatorios" className="home-stores-link">
            Ver relatório por loja
          </Link>
        </section>
      </div>

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
              <span className="home-chat-when">{formatLastAccess(m.last_message_at)}</span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  )
}
