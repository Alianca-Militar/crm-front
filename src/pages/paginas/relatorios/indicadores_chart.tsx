import { useState } from 'react'
import { formatMoney } from '../../../lib/format'
import { useWidth } from './use_width'

/** Um dia ou um horário: faturamento atual (barra) e do ano anterior (linha). */
export type Ponto = {
  eixo: string
  titulo: string
  atual: number
  anterior: number
  vendas: number
  vendasAntes: number
}

const HEIGHT = 240
const PAD = { top: 16, right: 12, bottom: 26, left: 52 }

const short = (v: number) =>
  v >= 1000
    ? `${Math.round(v / 1000).toLocaleString('pt-BR')} mil`
    : Math.round(v).toLocaleString('pt-BR')

/** Barras do período e a linha dos mesmos dias (ou horários) do ano anterior. */
export default function IndicadoresChart({
  pontos,
  anos,
  rotulo,
}: {
  pontos: Ponto[]
  anos: [string, string]
  rotulo: string
}) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const w = Math.max(width, 260)
  const plotW = w - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const max = Math.max(1, ...pontos.flatMap((p) => [p.atual, p.anterior]))
  const step = 10 ** Math.floor(Math.log10(max / 3))
  const top = Math.ceil(max / 3 / step) * step * 3
  const slot = pontos.length ? plotW / pontos.length : plotW
  const x = (i: number) => PAD.left + slot * i + slot / 2
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH
  const base = PAD.top + plotH
  const barW = Math.max(2, Math.min(28, slot * 0.6))
  const labelEvery = Math.ceil(pontos.length / Math.max(2, Math.floor(plotW / 44)))
  const line = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.anterior)}`).join(' ')
  const h = hover === null ? null : pontos[hover]

  return (
    <div ref={ref} className="campanhas-area">
      {!pontos.length && <p className="muted">Sem vendas no período.</p>}
      {width > 0 && pontos.length > 0 && (
        <svg
          width={w}
          height={HEIGHT}
          role="img"
          aria-label={`${rotulo}: ${anos[1]} em barras e ${anos[0]} em linha`}
          onPointerMove={(event) => {
            const left = event.currentTarget.getBoundingClientRect().left
            const i = Math.floor((event.clientX - left - PAD.left) / slot)
            setHover(Math.min(pontos.length - 1, Math.max(0, i)))
          }}
          onPointerLeave={() => setHover(null)}
        >
          {[0, 1, 2, 3].map((k) => (
            <g key={k}>
              <line
                className="campanhas-grid"
                x1={PAD.left}
                x2={w - PAD.right}
                y1={y((top / 3) * k)}
                y2={y((top / 3) * k)}
              />
              <text
                className="campanhas-axis"
                x={PAD.left - 8}
                y={y((top / 3) * k) + 4}
                textAnchor="end"
              >
                {short((top / 3) * k)}
              </text>
            </g>
          ))}
          {pontos.map((p, i) => (
            <rect
              key={p.titulo}
              className={hover === i ? 'ind-bar on' : 'ind-bar'}
              x={x(i) - barW / 2}
              y={y(p.atual)}
              width={barW}
              height={base - y(p.atual)}
              rx={2}
            />
          ))}
          <path className="ind-line-prev" d={line} />
          {pontos.map((p, i) =>
            i % labelEvery === 0 ? (
              <text
                key={p.titulo}
                className="campanhas-axis"
                x={x(i)}
                y={HEIGHT - 6}
                textAnchor="middle"
              >
                {p.eixo}
              </text>
            ) : null,
          )}
        </svg>
      )}
      {h && hover !== null && (
        <div
          className={x(hover) > w / 2 ? 'campanhas-tooltip right' : 'campanhas-tooltip'}
          style={{ left: x(hover) }}
        >
          <strong>{h.titulo}</strong>
          <span>
            {anos[1]}: {formatMoney(h.atual)} · {h.vendas.toLocaleString('pt-BR')} vendas
          </span>
          <span className="muted">
            {anos[0]}: {formatMoney(h.anterior)} · {h.vendasAntes.toLocaleString('pt-BR')} vendas
          </span>
        </div>
      )}
    </div>
  )
}
