import { useState } from 'react'
import { formatMoney } from '../../../lib/format'
import { MONTHS } from './home_utils'

type Store = { id: number; name: string }
type Month = { month: string; stores: Record<string, number | string> }

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/** "2026-05" → "mai/26" */
function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`
}

/** Faturamento por mês, barras empilhadas por loja, com a caixa do mês ao passar o mouse. */
export default function YearChart({
  series,
  stores,
  current,
}: {
  series: Month[]
  stores: Store[]
  /** Mês corrente ("2026-11"): ainda parcial. */
  current: string
}) {
  const [hover, setHover] = useState<{ index: number; left: number; right: boolean } | null>(null)
  const totals = series.map((m) => stores.reduce((t, s) => t + Number(m.stores[s.id] ?? 0), 0))
  const max = Math.max(1, ...totals)

  return (
    <div className="year-chart" onPointerLeave={() => setHover(null)}>
      <div
        className="home-chart"
        role="img"
        aria-label="Gráfico de barras empilhadas com o faturamento mensal de cada loja"
      >
        {series.map((m, i) => (
          <div
            key={m.month}
            className={hover?.index === i ? 'home-bar hover' : 'home-bar'}
            onPointerEnter={(event) => {
              const el = event.currentTarget
              const box = el.parentElement?.getBoundingClientRect()
              const center = el.offsetLeft + el.offsetWidth / 2
              setHover({ index: i, left: center, right: box ? center > box.width / 2 : false })
            }}
          >
            {[...stores].reverse().map((s) => {
              const value = Number(m.stores[String(s.id)] ?? 0)
              const index = stores.indexOf(s)
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
        {series.map((m) => (
          <div key={m.month}>{monthLabel(m.month)}</div>
        ))}
      </div>

      {hover && (
        <MonthTooltip
          month={series[hover.index]}
          previous={hover.index > 0 ? totals[hover.index - 1] : null}
          total={totals[hover.index]}
          stores={stores}
          partial={series[hover.index].month === current}
          left={hover.left}
          alignRight={hover.right}
        />
      )}
    </div>
  )
}

function MonthTooltip({
  month,
  previous,
  total,
  stores,
  partial,
  left,
  alignRight,
}: {
  month: Month
  previous: number | null
  total: number
  stores: Store[]
  partial: boolean
  left: number
  alignRight: boolean
}) {
  const [y, m] = month.month.split('-')
  const name = MONTH_NAMES[Number(m) - 1]
  const change = previous && !partial ? Math.round(((total - previous) / previous) * 100) : null

  return (
    <div className={alignRight ? 'month-tooltip right' : 'month-tooltip'} style={{ left }}>
      <div className="month-tooltip-head">
        <span>
          {name.charAt(0).toUpperCase() + name.slice(1)} de {y}
        </span>
        {partial && <span className="badge sm tone-orange">parcial</span>}
      </div>
      {stores.map((s, k) => {
        const value = Number(month.stores[String(s.id)] ?? 0)
        return (
          <div key={s.id} className="month-tooltip-row">
            <span className={`legend-swatch home-series-${k % 3}`} />
            <span className="month-tooltip-name">{s.name}</span>
            <span className="month-tooltip-value">{formatMoney(value)}</span>
            <span className="month-tooltip-weight">
              {total ? `${Math.round((value / total) * 100)}%` : ''}
            </span>
          </div>
        )
      })}
      <div className="month-tooltip-row total">
        <span className="month-tooltip-name">Total do mês</span>
        <span className="month-tooltip-value">{formatMoney(total)}</span>
      </div>
      {change !== null && (
        <div className={`month-tooltip-muted ${change >= 0 ? 'good' : 'bad'}`}>
          {change > 0 ? '+' : change < 0 ? '−' : ''}
          {Math.abs(change)}% em relação ao mês anterior
        </div>
      )}
      {partial && <div className="month-tooltip-muted">Mês em andamento.</div>}
    </div>
  )
}
