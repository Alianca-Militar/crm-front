import { type DateRange, rangeText } from '../../../components/date_range/date_range_utils'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { formatMoney } from '../../../lib/format'
import IndicadoresChart, { type Ponto } from './indicadores_chart'
import { type IndicatorsReport, useIndicatorsReport } from './relatorios_api'

type Indicators = IndicatorsReport['current']
type Num = string | number | null

const dec = (v: Num, digits = 2) =>
  v === null
    ? '—'
    : Number(v).toLocaleString('pt-BR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
const int = (v: Num) => (v === null ? '—' : Math.round(Number(v)).toLocaleString('pt-BR'))

/** "2026-11-01".."2026-11-11" → "2026"; período que vira o ano → "2025/26". */
function yearOf(p: { start: string; end: string }) {
  const [a, b] = [p.start.slice(0, 4), p.end.slice(0, 4)]
  return a === b ? a : `${a}/${b.slice(2)}`
}

/** Atual ÷ anterior em % (100% = igual). */
function ratio(now: Num, before: Num): number | null {
  return now === null || before === null || !Number(before)
    ? null
    : (Number(now) / Number(before)) * 100
}

function Variacao({ now, before, base }: { now: Num; before: Num; base: string }) {
  const r = ratio(now, before)
  if (r === null) return <div className="kpi-sub neutral">sem base em {base}</div>
  const diff = Math.round(r - 100)
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
  return (
    <div className={`kpi-sub ${diff > 0 ? 'good' : diff < 0 ? 'bad' : 'neutral'}`}>
      {sign}
      {Math.abs(diff)}% vs. {base}
    </div>
  )
}

const COLUMNS: {
  label: string
  title: string
  value: (i: Indicators) => string
  raw: (i: Indicators) => Num
}[] = [
  { label: 'PA', title: 'Peças por atendimento', value: (i) => dec(i.pa), raw: (i) => i.pa },
  {
    label: 'VA',
    title: 'Valor por atendimento (ticket médio)',
    value: (i) => formatMoney(i.avg_ticket),
    raw: (i) => i.avg_ticket,
  },
  {
    label: 'PMV',
    title: 'Preço médio de venda por peça',
    value: (i) => formatMoney(i.pmv),
    raw: (i) => i.pmv,
  },
  {
    label: 'Quantidade',
    title: 'Peças vendidas',
    value: (i) => int(i.pieces),
    raw: (i) => i.pieces,
  },
  {
    label: 'Vendas',
    title: 'Atendimentos (vendas pagas)',
    value: (i) => int(i.orders),
    raw: (i) => i.orders,
  },
  {
    label: 'Faturamento',
    title: 'Valor líquido das vendas',
    value: (i) => formatMoney(i.revenue),
    raw: (i) => i.revenue,
  },
]

function Linhas({
  nome,
  current,
  previous,
  anos,
  total,
}: {
  nome: string
  current: Indicators
  previous: Indicators
  anos: [string, string]
  total?: boolean
}) {
  return (
    <>
      {(
        [
          [anos[0], previous],
          [anos[1], current],
        ] as const
      ).map(([ano, ind]) => (
        <tr key={ano} className={total ? 'ind-total' : undefined}>
          <td>{nome}</td>
          <td>{ano}</td>
          {COLUMNS.map((c) => (
            <td key={c.label} className="num">
              {c.value(ind)}
            </td>
          ))}
        </tr>
      ))}
      <tr className={total ? 'ind-sub ind-total' : 'ind-sub'}>
        <td>{total ? 'Variação total' : 'Subtotal'}</td>
        <td>-</td>
        {COLUMNS.map((c) => {
          const r = ratio(c.raw(current), c.raw(previous))
          return (
            <td key={c.label} className={`num ${r === null ? '' : r >= 100 ? 'up' : 'down'}`}>
              {r === null ? '—' : `${Math.round(r)}%`}
            </td>
          )
        })}
      </tr>
    </>
  )
}

/** Indicadores: PA, ticket médio, markup e faturamento x ano anterior, vendas por dia e hora,
 *  e o comparativo por loja. */
export default function Indicadores({ range }: { range: DateRange }) {
  const report = useIndicatorsReport(range)
  const r = report.data
  const anos: [string, string] = r
    ? [yearOf(r.previous_period), yearOf(r.period)]
    : ['ano anterior', 'atual']
  const base = anos[0]

  const kpis = r
    ? [
        {
          label: 'PA · peças por atendimento',
          valor: dec(r.current.pa),
          antes: dec(r.previous.pa),
          now: r.current.pa,
          before: r.previous.pa,
        },
        {
          label: 'Ticket médio',
          valor: formatMoney(r.current.avg_ticket),
          antes: formatMoney(r.previous.avg_ticket),
          now: r.current.avg_ticket,
          before: r.previous.avg_ticket,
        },
        {
          label: 'Markup',
          valor: dec(r.current.markup),
          antes: dec(r.previous.markup),
          now: r.current.markup,
          before: r.previous.markup,
        },
        {
          label: 'Faturamento',
          valor: formatMoney(r.current.revenue),
          antes: formatMoney(r.previous.revenue),
          now: r.current.revenue,
          before: r.previous.revenue,
        },
      ]
    : []

  const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
  const dias: Ponto[] = (r?.daily ?? []).map((d) => ({
    eixo: dm(d.day),
    titulo: dm(d.day),
    atual: Number(d.revenue),
    anterior: Number(d.previous_revenue),
    vendas: d.orders,
    vendasAntes: d.previous_orders,
  }))
  // Só as horas com venda em algum dos dois anos (do primeiro ao último horário).
  const horas = r?.hourly ?? []
  const comVenda = horas.filter((h) => h.orders || h.previous_orders).map((h) => h.hour)
  const [primeira, ultima] = [Math.min(...comVenda), Math.max(...comVenda)]
  const horarios: Ponto[] = horas
    .filter((h) => h.hour >= primeira && h.hour <= ultima)
    .map((h) => ({
      eixo: `${h.hour}h`,
      titulo: `${h.hour}h às ${h.hour + 1}h`,
      atual: Number(h.revenue),
      anterior: Number(h.previous_revenue),
      vendas: h.orders,
      vendasAntes: h.previous_orders,
    }))

  return (
    <>
      {report.isError && (
        <MsgNok titulo="Não foi possível carregar o relatório" mensagem={report.error.message} />
      )}
      {r && (
        <p className="relatorios-note">
          {rangeText(range)} comparado com os mesmos dias de {base} ({dm(r.previous_period.start)}/
          {r.previous_period.start.slice(0, 4)} a {dm(r.previous_period.end)}/
          {r.previous_period.end.slice(0, 4)}).
        </p>
      )}

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.valor}</div>
            <div className="kpi-sub">
              {base}: {k.antes}
            </div>
            <Variacao now={k.now} before={k.before} base={base} />
          </div>
        ))}
      </div>

      <div className="row">
        <section className="card ind-chart-card">
          <div className="card-head">
            <h2 className="card-title">Venda por dia</h2>
            <Legenda anos={anos} />
          </div>
          {report.isPending ? (
            <p className="muted">Carregando…</p>
          ) : (
            <IndicadoresChart pontos={dias} anos={anos} rotulo="Venda por dia" />
          )}
        </section>
        <section className="card ind-chart-card">
          <div className="card-head">
            <h2 className="card-title">Venda por horário</h2>
            <Legenda anos={anos} />
          </div>
          {report.isPending ? (
            <p className="muted">Carregando…</p>
          ) : (
            <IndicadoresChart pontos={horarios} anos={anos} rotulo="Venda por horário" />
          )}
        </section>
      </div>

      {r && (
        <section className="card">
          <h2 className="card-title">Comparativo por loja</h2>
          <div className="table-wrap ind-table-wrap">
            <table className="table compact ind-table">
              <thead>
                <tr>
                  <th>Loja</th>
                  <th>Ano</th>
                  {COLUMNS.map((c) => (
                    <th key={c.label} className="num" title={c.title}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.stores.map((s) => (
                  <Linhas
                    key={s.store_id}
                    nome={s.name}
                    current={s.current}
                    previous={s.previous}
                    anos={anos}
                  />
                ))}
                {r.stores.length > 1 && (
                  <Linhas
                    nome="Total"
                    current={r.current}
                    previous={r.previous}
                    anos={anos}
                    total
                  />
                )}
              </tbody>
            </table>
          </div>
          <p className="relatorios-note">
            PA = peças ÷ vendas · VA = faturamento ÷ vendas (ticket médio) · PMV = faturamento ÷
            peças · Subtotal = {anos[1]} ÷ {anos[0]} (acima de 100% cresceu). Markup = valor dos
            itens com custo cadastrado ÷ custo deles.
          </p>
        </section>
      )}
    </>
  )
}

function Legenda({ anos }: { anos: [string, string] }) {
  return (
    <div className="legend">
      <span className="legend-item">
        <span className="legend-swatch ind-swatch-now" />
        {anos[1]}
      </span>
      <span className="legend-item">
        <span className="ind-line-before" />
        {anos[0]}
      </span>
    </div>
  )
}
