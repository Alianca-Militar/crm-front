import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react'
import { formatMoney } from '../../../lib/format'

type Money = number | string

export type MonthTrend = {
  days: { day: string; projected: boolean; stores: Record<string, Money> }[]
  /** Vendido do dia 1 até ontem. */
  realized: Money
  /** Realizado + média por dia de venda × dias de loja aberta que faltam. */
  trend: Money
  trend_by_store: Record<string, Money>
  open_days_left: number
  /** Peso de cada dia da semana por loja ("0" = segunda), das últimas 8 semanas. */
  weights: Record<string, Record<string, Money>>
}

type Store = { id: number; name: string }

const HEIGHT = 240
const PAD = { top: 16, right: 64, bottom: 24, left: 52 }

/** R$ 154.616 → "154 mil"; R$ 1.234.567 → "1,2 mi" */
function short(value: number) {
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (value >= 1000) return `${Math.round(value / 1000).toLocaleString('pt-BR')} mil`
  return Math.round(value).toLocaleString('pt-BR')
}

/** Escala "redonda" para o eixo: 3 marcas que cobrem o maior valor. */
function niceMax(value: number) {
  if (value <= 0) return 1
  const step = 10 ** Math.floor(Math.log10(value / 3))
  return Math.ceil(value / 3 / step) * step * 3
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** Vendas por dia do mês (barras por loja) e o acumulado, com a tendência até o fim do mês. */
export default function MonthChart({ data, stores }: { data: MonthTrend; stores: Store[] }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const ids = stores.map((s) => String(s.id))
  const totals = data.days.map((d) => ids.reduce((t, id) => t + Number(d.stores[id] ?? 0), 0))
  const cumulative = totals.reduce<number[]>((acc, t) => [...acc, (acc.at(-1) ?? 0) + t], [])
  const lastRealized = data.days.findLastIndex((d) => !d.projected)

  const dayMax = niceMax(Math.max(...totals))
  const cumMax = Math.max(1, Number(data.trend), cumulative.at(-1) ?? 0)
  const w = Math.max(width, 280)
  const plotW = w - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const slot = plotW / data.days.length
  const barW = Math.max(2, slot * 0.62)
  const x = (i: number) => PAD.left + slot * i + slot / 2
  const yDay = (v: number) => PAD.top + plotH - (v / dayMax) * plotH
  const yCum = (v: number) => PAD.top + plotH - (v / cumMax) * plotH

  const point = (i: number) => `${x(i)},${yCum(cumulative[i])}`
  const realizedLine = cumulative
    .slice(0, lastRealized + 1)
    .map((_, i) => point(i))
    .join(' ')
  const trendLine = cumulative
    .map((_, i) => i)
    .filter((i) => i >= Math.max(0, lastRealized))
    .map(point)
    .join(' ')
  const end = data.days.length - 1
  const todayIndex = lastRealized + 1
  const labelEvery = w < 520 ? 5 : w < 760 ? 2 : 1

  function pick(event: PointerEvent<SVGSVGElement>) {
    const left = event.currentTarget.getBoundingClientRect().left
    const i = Math.floor((event.clientX - left - PAD.left) / slot)
    setHover(Math.min(end, Math.max(0, i)))
  }

  function onKey(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const step = event.key === 'ArrowLeft' ? -1 : 1
    setHover((h) => Math.min(end, Math.max(0, (h ?? lastRealized) + step)))
  }

  return (
    <div ref={ref} className="month-chart">
      {width > 0 && (
        <svg
          width={w}
          height={HEIGHT}
          tabIndex={0}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
          role="img"
          aria-label={`Vendas por dia do mês. Realizado ${formatMoney(data.realized)}, tendência ${formatMoney(data.trend)}.`}
        >
          {[0, 1, 2, 3].map((k) => {
            const v = (dayMax / 3) * k
            return (
              <g key={k}>
                <line
                  className="month-chart-grid"
                  x1={PAD.left}
                  x2={w - PAD.right}
                  y1={yDay(v)}
                  y2={yDay(v)}
                />
                <text
                  className="month-chart-axis"
                  x={PAD.left - 8}
                  y={yDay(v) + 4}
                  textAnchor="end"
                >
                  {short(v)}
                </text>
              </g>
            )
          })}

          {todayIndex <= end && (
            <g>
              <line
                className="month-chart-today"
                x1={x(todayIndex) - slot / 2}
                x2={x(todayIndex) - slot / 2}
                y1={PAD.top}
                y2={PAD.top + plotH}
              />
              <text className="month-chart-axis" x={x(todayIndex) - slot / 2 + 4} y={PAD.top + 10}>
                hoje
              </text>
            </g>
          )}

          {data.days.map((d, i) => {
            let top = PAD.top + plotH
            return (
              <g key={d.day} className={d.projected ? 'month-chart-projected' : undefined}>
                {hover === i && (
                  <rect
                    className="month-chart-hover"
                    x={x(i) - slot / 2}
                    y={PAD.top}
                    width={slot}
                    height={plotH}
                  />
                )}
                {stores.map((s, k) => {
                  const v = Number(d.stores[String(s.id)] ?? 0)
                  if (!v) return null
                  const h = (v / dayMax) * plotH
                  top -= h
                  return (
                    <rect
                      key={s.id}
                      className={`home-series-fill-${k % 3}`}
                      x={x(i) - barW / 2}
                      y={top}
                      width={barW}
                      height={Math.max(1, h - 1)}
                      rx={1.5}
                    />
                  )
                })}
                {(i + 1) % labelEvery === 0 || i === 0 ? (
                  <text className="month-chart-axis" x={x(i)} y={HEIGHT - 6} textAnchor="middle">
                    {i + 1}
                  </text>
                ) : null}
              </g>
            )
          })}

          {lastRealized >= 0 && <polyline className="month-chart-line" points={realizedLine} />}
          {lastRealized < end && <polyline className="month-chart-line trend" points={trendLine} />}
          <circle className="month-chart-dot" cx={x(end)} cy={yCum(cumulative[end])} r={3.5} />
          {hover !== null && (
            <circle
              className="month-chart-dot hover"
              cx={x(hover)}
              cy={yCum(cumulative[hover])}
              r={4.5}
            />
          )}
          <text className="month-chart-end" x={x(end) + 8} y={yCum(cumulative[end]) + 4}>
            {short(cumulative[end])}
          </text>
        </svg>
      )}
      {hover !== null && width > 0 && (
        <DayTooltip
          day={data.days[hover]}
          stores={stores}
          weights={data.weights}
          total={totals[hover]}
          cumulative={cumulative[hover]}
          left={x(hover)}
          alignRight={x(hover) > w / 2}
        />
      )}
    </div>
  )
}

const WEEKDAY = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']

const factor = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}×`

/** Caixa do dia: valor de cada loja, total do dia e acumulado do mês. */
function DayTooltip({
  day,
  stores,
  weights,
  total,
  cumulative,
  left,
  alignRight,
}: {
  day: MonthTrend['days'][number]
  stores: Store[]
  weights: MonthTrend['weights']
  total: number
  cumulative: number
  left: number
  alignRight: boolean
}) {
  const date = new Date(`${day.day}T12:00`)
  // getDay: 0 = domingo; os pesos vêm com 0 = segunda.
  const wd = (date.getDay() + 6) % 7
  const name = WEEKDAY[wd]
  const dm = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const closed = total === 0

  return (
    <div className={alignRight ? 'month-tooltip right' : 'month-tooltip'} style={{ left }}>
      <div className="month-tooltip-head">
        <span>
          {name.charAt(0).toUpperCase() + name.slice(1)}, {dm}
        </span>
        {day.projected && !closed && <span className="badge sm tone-orange">previsão</span>}
      </div>
      {closed ? (
        <div className="month-tooltip-muted">
          {day.projected ? 'Loja fechada (domingo ou feriado)' : 'Sem vendas'}
        </div>
      ) : (
        <>
          {stores.map((s, k) => {
            const value = Number(day.stores[String(s.id)] ?? 0)
            const weight = Number(weights[String(s.id)]?.[String(wd)] ?? 1)
            return (
              <div key={s.id} className="month-tooltip-row">
                <span className={`legend-swatch home-series-${k % 3}`} />
                <span className="month-tooltip-name">{s.name}</span>
                <span className="month-tooltip-value">{formatMoney(value)}</span>
                {day.projected && <span className="month-tooltip-weight">{factor(weight)}</span>}
              </div>
            )
          })}
          <div className="month-tooltip-row total">
            <span className="month-tooltip-name">Total do dia</span>
            <span className="month-tooltip-value">{formatMoney(total)}</span>
          </div>
        </>
      )}
      <div className="month-tooltip-row cumulative">
        <span className="month-tooltip-name">
          {day.projected ? 'Acumulado previsto' : 'Acumulado no mês'}
        </span>
        <span className="month-tooltip-value">{formatMoney(cumulative)}</span>
      </div>
      {day.projected && !closed && (
        <div className="month-tooltip-muted">
          O número com × é quanto a {name} vende em relação à média da loja nas últimas 8 semanas.
        </div>
      )}
    </div>
  )
}
