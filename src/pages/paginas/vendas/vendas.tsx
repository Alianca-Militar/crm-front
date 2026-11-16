import { Fragment, useDeferredValue, useState } from 'react'
import { Link } from 'react-router'
import DateRangePicker from '../../../components/date_range/date_range'
import { presetRange, rangeText } from '../../../components/date_range/date_range_utils'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { formatDateTime, formatLastAccess, formatMoney, titleCase } from '../../../lib/format'
import {
  exportUrl,
  type ImportStatus,
  type SalesFilters,
  type SalesGroup,
  useImports,
  useSales,
  useSalesOptions,
  useSalesSummary,
} from './vendas_api'
import './vendas.css'

const n = (value: number) => value.toLocaleString('pt-BR')

const PAGE_SIZE = 10

const STATE: Record<ImportStatus['state'], { label: string; tone: string }> = {
  ok: { label: 'Em dia', tone: 'tone-green' },
  late: { label: 'Atrasada', tone: 'tone-yellow' },
  error: { label: 'Com erro', tone: 'tone-red' },
  never: { label: 'Sem carga', tone: 'tone-gray' },
}

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** "às 17:50" hoje; "amanhã às 08:30" no dia seguinte. */
function nextRun(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  return d.toDateString() === today.toDateString() ? `às ${hhmm(iso)}` : `amanhã às ${hhmm(iso)}`
}

function Importacoes() {
  const imports = useImports()
  if (!imports.data?.length) return null
  return (
    <section className="vendas-imports" aria-label="Status das importações">
      {imports.data.map((s) => (
        <div key={s.store_id} className={`vendas-import state-${s.state}`}>
          <div className="vendas-import-top">
            <span className="vendas-import-store">{s.store_name}</span>
            <span className={`badge sm square ${STATE[s.state].tone}`}>{STATE[s.state].label}</span>
          </div>
          <div className="vendas-import-when">
            {s.last_success_at
              ? `Última carga ${formatLastAccess(s.last_success_at)}`
              : 'O coletor da loja ainda não mandou dados'}
          </div>
          <div className="vendas-import-info">
            {n(s.orders_new)} vendas novas · {n(s.customers_new)} clientes novos · próxima{' '}
            {nextRun(s.next_run)}
          </div>
          {s.state === 'late' && s.missed && (
            <div className="vendas-import-warn">
              A carga das {hhmm(s.missed)} não chegou. Confira se o PC da loja está ligado.
            </div>
          )}
          {s.state === 'error' && (
            <div className="vendas-import-warn error">
              A última carga deu erro{s.error ? `: ${s.error}` : ''}.
            </div>
          )}
        </div>
      ))}
    </section>
  )
}

/** Vendas pagas das lojas, com o cliente e a campanha atribuída. */
export default function Vendas() {
  const [periodo, setPeriodo] = useState(() => presetRange('month'))
  const [q, setQ] = useState('')
  const [store, setStore] = useState('')
  const [campaign, setCampaign] = useState('')
  const [open, setOpen] = useState<number | null>(null)
  const [page, setPage] = useState(1)

  // A busca espera a digitação assentar antes de consultar.
  const search = useDeferredValue(q)
  const filters: SalesFilters = {
    start: periodo.start,
    end: periodo.end,
    store,
    campaign,
    q: search,
  }
  const options = useSalesOptions()
  const list = useSales(filters, page)
  const totals = useSalesSummary(filters)

  const total = list.data?.count ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const t = totals.data
  const revenue = Number(t?.revenue ?? 0)
  const campaignRevenue = Number(t?.campaign_revenue ?? 0)
  const filtered = Boolean(q || store || campaign)

  function change(update: () => void) {
    update()
    setPage(1)
    setOpen(null)
  }

  const kpis = [
    { label: 'Vendas', valor: t ? n(t.orders) : '—', sub: rangeText(periodo) },
    { label: 'Faturamento', valor: t ? formatMoney(t.revenue) : '—', sub: 'vendas pagas' },
    { label: 'Ticket médio', valor: formatMoney(t?.avg_ticket), sub: 'faturamento ÷ vendas' },
    {
      label: 'Com campanha',
      valor: t ? formatMoney(campaignRevenue) : '—',
      sub: t
        ? `${n(t.campaign_orders)} vendas · ${revenue ? Math.round((campaignRevenue / revenue) * 100) : 0}% do faturamento`
        : '',
    },
  ]

  return (
    <div className="page page-vendas">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Vendas</h1>
          <p className="page-subtitle">
            Vendas que chegaram das lojas, com o cliente e a campanha atribuída.
          </p>
        </div>
        <div className="page-actions">
          <DateRangePicker value={periodo} onChange={(r) => change(() => setPeriodo(r))} />
          <a
            className="btn md"
            href={exportUrl(filters)}
            download
            title="Baixa a lista com os filtros atuais (até 20 mil vendas)"
          >
            Exportar Excel
          </a>
        </div>
      </div>

      <Importacoes />

      <div className="filter-bar">
        <div className="field wide">
          <label htmlFor="vendas-q">Buscar</label>
          <input
            id="vendas-q"
            type="search"
            placeholder="Cliente, CPF, telefone ou nº da venda"
            value={q}
            onChange={(e) => change(() => setQ(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="vendas-loja">Loja</label>
          <select
            id="vendas-loja"
            value={store}
            onChange={(e) => change(() => setStore(e.target.value))}
          >
            <option value="">Todas</option>
            {options.data?.stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="vendas-campanha">Campanha</label>
          <select
            id="vendas-campanha"
            value={campaign}
            onChange={(e) => change(() => setCampaign(e.target.value))}
          >
            <option value="">Todas as vendas</option>
            <option value="with">Só com campanha</option>
            <option value="without">Só sem campanha</option>
            {!!options.data?.campaigns.length && (
              <optgroup label="Campanha">
                {options.data.campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {list.isError && <MsgNok titulo="Não foi possível carregar" mensagem={list.error.message} />}

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value vendas-kpi-value">{k.valor}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="vendas-count" aria-live="polite">
        <span>
          {list.data ? (
            <>
              <strong>{n(total)}</strong> {total === 1 ? 'venda' : 'vendas'}
              {filtered ? ' com esses filtros' : ''}
            </>
          ) : (
            'Carregando…'
          )}
          {list.isFetching && list.data && <span className="muted"> · atualizando…</span>}
        </span>
        {filtered && (
          <button
            type="button"
            className="btn sm"
            onClick={() =>
              change(() => {
                setQ('')
                setStore('')
                setCampaign('')
              })
            }
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table className="table vendas-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Loja</th>
              <th>Nº venda</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Pagamento</th>
              <th>Itens</th>
              <th className="num">Desconto</th>
              <th className="num">Acréscimo</th>
              <th className="num">Valor</th>
              <th title="Campanha que o cliente recebeu antes da compra (último toque, dentro da janela)">
                Campanha
              </th>
            </tr>
          </thead>
          <tbody>
            {list.data?.results.map((s) => (
              <Fragment key={s.id}>
                <tr>
                  <td className="nowrap">{formatDateTime(s.ordered_at)}</td>
                  <td>{s.store_name.replace('Loja Invictus - ', '')}</td>
                  <td className="mono">{s.orc_id}</td>
                  <td>
                    {s.customer ? (
                      <Link to={`/clientes/${s.customer.id}`} className="vendas-customer">
                        {titleCase(s.customer.name) || `Cliente ${s.customer.id}`}
                      </Link>
                    ) : (
                      <span className="muted">Consumidor final</span>
                    )}
                  </td>
                  <td>{s.seller_name || '—'}</td>
                  <td>{s.payment || '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="link-button"
                      aria-expanded={open === s.id}
                      onClick={() => setOpen(open === s.id ? null : s.id)}
                    >
                      {s.items.length} {s.items.length === 1 ? 'item' : 'itens'}
                    </button>
                  </td>
                  <td className="num">
                    {Number(s.discount) ? (
                      <span className="vendas-discount">−{formatMoney(s.discount)}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="num">
                    {Number(s.surcharge) ? (
                      <span className="vendas-surcharge">+{formatMoney(s.surcharge)}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="num strong">{formatMoney(s.total_amount)}</td>
                  <td>
                    {s.campaign ? (
                      <Link
                        to={`/campanhas/${s.campaign.id}/resultados`}
                        className="vendas-campaign"
                        title={`Recebeu em ${formatDateTime(s.campaign.sent_at)}`}
                      >
                        {s.campaign.name}
                      </Link>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
                {open === s.id && (
                  <tr className="vendas-items-row">
                    <td colSpan={11}>
                      <ul className="vendas-items">
                        {s.items.map((i) => (
                          <li key={i.nmr_seq}>
                            <span>
                              {Number(i.quantity).toLocaleString('pt-BR')}× {i.product_name}
                            </span>
                            <span className="muted">{formatMoney(i.total_price)}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {list.isPending && <div className="table-empty">Carregando…</div>}
        {list.data && total === 0 && (
          <div className="table-empty">Nenhuma venda encontrada com esses filtros.</div>
        )}
      </div>

      <div className="pager">
        <span>
          {total
            ? `Mostrando ${n((page - 1) * PAGE_SIZE + 1)}–${n(Math.min(page * PAGE_SIZE, total))} de ${n(total)} vendas`
            : ''}
        </span>
        <div className="pager-buttons">
          <span className="vendas-page">
            Página {page} de {pages}
          </span>
          <button
            type="button"
            className="btn sm"
            disabled={!list.data?.previous}
            onClick={() => {
              setPage(page - 1)
              setOpen(null)
            }}
          >
            Anterior
          </button>
          <button
            type="button"
            className="btn sm"
            disabled={!list.data?.next}
            onClick={() => {
              setPage(page + 1)
              setOpen(null)
            }}
          >
            Próxima
          </button>
        </div>
      </div>

      <div className="vendas-charts">
        <Ranking titulo="Vendas por vendedor" linhas={t?.by_seller ?? []} total={revenue} />
        <Ranking titulo="Vendas por pagamento" linhas={t?.by_payment ?? []} total={revenue} />
      </div>
    </div>
  )
}

const pct = (part: number, total: number) =>
  total ? `${((part / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—'

/** Barras horizontais: faturamento de cada linha, com vendas, % do total e ticket. */
function Ranking({
  titulo,
  linhas,
  total,
}: {
  titulo: string
  linhas: SalesGroup[]
  total: number
}) {
  const max = Math.max(1, ...linhas.map((l) => Number(l.revenue)))
  return (
    <section className="card vendas-chart">
      <h2 className="card-title">{titulo}</h2>
      {linhas.length === 0 && <p className="muted">Sem vendas no período.</p>}
      <div className="vendas-bars">
        {linhas.map((l) => {
          const valor = Number(l.revenue)
          return (
            <div key={l.name} className="vendas-bar-row">
              <div className="vendas-bar-top">
                <span className="vendas-bar-name">{l.name}</span>
                <strong>{formatMoney(valor)}</strong>
              </div>
              <div className="vendas-bar" aria-hidden="true">
                <span style={{ width: `${(valor / max) * 100}%` }} />
              </div>
              <small>
                {n(l.orders)} {l.orders === 1 ? 'venda' : 'vendas'} · {pct(valor, total)} do
                faturamento · ticket {formatMoney(valor / l.orders)}
              </small>
            </div>
          )
        })}
      </div>
    </section>
  )
}
