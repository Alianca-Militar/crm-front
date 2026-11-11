import { useState } from 'react'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { type DateRange, rangeText } from '../../../components/date_range/date_range_utils'
import { formatMoney } from '../../../lib/format'
import { useCampaignsReport } from './relatorios_api'
import { useWidth } from './use_width'

export type Dia = { dia: string; total: number; campanhas: number }
/** valor null = etapa que ainda não é medida. */
export type Etapa = { etapa: string; valor: number | null; nota?: string }

const int = (v: number) => Math.round(v).toLocaleString('pt-BR')
const pct = (v: number, digits = 1) =>
  `${v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`

/** Indicadores, vendas totais x campanhas por dia e o funil dos envios, no período. */
export default function DesempenhoCampanhas({ range }: { range: DateRange }) {
  const report = useCampaignsReport(range)
  const r = report.data
  const revenue = Number(r?.revenue ?? 0)
  // Sem preço nenhum cadastrado nos números, o investimento fica em aberto.
  const investment = r && (Number(r.cost) > 0 || !r.unpriced) ? Number(r.cost) : null
  const conversao = r?.sent ? (r.orders / r.sent) * 100 : null
  const roi = investment ? (revenue - investment) / investment : null
  const dias: Dia[] = (r?.daily ?? []).map((d) => ({
    dia: d.day,
    total: Number(d.total),
    campanhas: Number(d.campaign),
  }))

  const kpis = [
    { label: 'Campanhas', valor: r ? int(r.campaigns) : '—', sub: 'com disparos no período' },
    {
      label: 'Vendas das campanhas',
      valor: formatMoney(revenue),
      sub: r ? `${int(r.orders)} vendas de ${int(r.buyers)} clientes` : '',
    },
    {
      label: 'Conversão',
      valor: conversao === null ? '—' : pct(conversao, 2),
      sub: r ? `${int(r.orders)} vendas ÷ ${int(r.sent)} disparos` : 'vendas ÷ disparos',
    },
    {
      label: 'ROI',
      valor:
        roi === null
          ? '—'
          : roi.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      sub:
        investment === null
          ? 'sem preço por mensagem nos números'
          : `investimento ${formatMoney(investment)}`,
    },
  ]

  return (
    <>
      {report.isError && (
        <MsgNok titulo="Não foi possível carregar o relatório" mensagem={report.error.message} />
      )}
      {r && r.unpriced > 0 && (
        <p className="relatorios-note">
          {int(r.unpriced)} disparos do período saíram por números sem preço por mensagem: ficaram
          fora do investimento. Cadastre o preço em Admin › Canais.
        </p>
      )}

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value campanhas-kpi-value">{k.valor}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="row">
        <section className="card campanhas-area-card">
          <div className="card-head">
            <h2 className="card-title">
              Vendas totais x vendas das campanhas · {rangeText(range)}
            </h2>
            <div className="legend">
              <span className="legend-item">
                <span className="legend-swatch campanhas-swatch-total" />
                Total das lojas
              </span>
              <span className="legend-item">
                <span className="legend-swatch campanhas-swatch-camp" />
                Campanhas
              </span>
            </div>
          </div>
          {report.isPending ? <p className="muted">Carregando…</p> : <AreaChart dias={dias} />}
        </section>

        <section className="card campanhas-funil-card">
          <h2 className="card-title">Funil das campanhas</h2>
          <Funil
            etapas={[
              { etapa: 'Enviados', valor: r?.sent ?? 0 },
              { etapa: 'Entregues', valor: r?.delivered ?? 0 },
              { etapa: 'Lidos', valor: r?.read ?? 0 },
              {
                etapa: 'Clicados',
                valor: r?.links ? r.people : null,
                nota: r ? 'As campanhas do período não têm link curto (/l/…)' : 'Carregando…',
              },
              { etapa: 'Comprados', valor: r?.orders ?? 0 },
            ]}
          />
        </section>
      </div>
    </>
  )
}

const HEIGHT = 260
const PAD = { top: 16, right: 16, bottom: 26, left: 56 }

const short = (v: number) =>
  v >= 1000 ? `${Math.round(v / 1000).toLocaleString('pt-BR')} mil` : int(v)

export function AreaChart({ dias }: { dias: Dia[] }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const w = Math.max(width, 280)
  const plotW = w - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const max = Math.max(1, ...dias.map((d) => d.total))
  const step = 10 ** Math.floor(Math.log10(max / 3))
  const top = Math.ceil(max / 3 / step) * step * 3
  const x = (i: number) => PAD.left + (dias.length > 1 ? (plotW * i) / (dias.length - 1) : 0)
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH
  const base = PAD.top + plotH

  const area = (key: 'total' | 'campanhas') =>
    `M${x(0)},${base} ` +
    dias.map((d, i) => `L${x(i)},${y(d[key])}`).join(' ') +
    ` L${x(dias.length - 1)},${base} Z`
  const line = (key: 'total' | 'campanhas') =>
    dias.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d[key])}`).join(' ')
  const labelEvery = Math.ceil(dias.length / Math.max(2, Math.floor(plotW / 60)))
  const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
  const h = hover === null ? null : dias[hover]

  return (
    <div ref={ref} className="campanhas-area">
      {width > 0 && dias.length > 0 && (
        <svg
          width={w}
          height={HEIGHT}
          role="img"
          aria-label="Gráfico de área com as vendas totais e as vendas das campanhas por dia"
          onPointerMove={(event) => {
            const left = event.currentTarget.getBoundingClientRect().left
            const i = Math.round(((event.clientX - left - PAD.left) / plotW) * (dias.length - 1))
            setHover(Math.min(dias.length - 1, Math.max(0, i)))
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
          <path className="campanhas-area-total" d={area('total')} />
          <path className="campanhas-line-total" d={line('total')} />
          <path className="campanhas-area-camp" d={area('campanhas')} />
          <path className="campanhas-line-camp" d={line('campanhas')} />
          {dias.map((d, i) =>
            i % labelEvery === 0 ? (
              <text
                key={d.dia}
                className="campanhas-axis"
                x={x(i)}
                y={HEIGHT - 6}
                textAnchor="middle"
              >
                {dm(d.dia)}
              </text>
            ) : null,
          )}
          {hover !== null && (
            <line className="campanhas-hover" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={base} />
          )}
        </svg>
      )}
      {h && hover !== null && (
        <div
          className={x(hover) > w / 2 ? 'campanhas-tooltip right' : 'campanhas-tooltip'}
          style={{ left: x(hover) }}
        >
          <strong>{dm(h.dia)}</strong>
          <span>Total das lojas: {formatMoney(h.total)}</span>
          <span>Campanhas: {formatMoney(h.campanhas)}</span>
          {h.total > 0 && (
            <span className="muted">{pct((h.campanhas / h.total) * 100)} do total</span>
          )}
        </div>
      )}
    </div>
  )
}

export function Funil({ etapas }: { etapas: Etapa[] }) {
  const first = etapas[0]?.valor ?? 0
  return (
    <ol className="campanhas-funil">
      {etapas.map((e, i) => {
        const share = first && e.valor !== null ? (e.valor / first) * 100 : 0
        const prev = i > 0 ? etapas[i - 1].valor : null
        return (
          <li key={e.etapa}>
            <div className="campanhas-funil-top">
              <span>{e.etapa}</span>
              <strong>{e.valor === null ? '—' : int(e.valor)}</strong>
            </div>
            <div className="campanhas-funil-track">
              {e.valor !== null && <span style={{ width: `${Math.max(share, 1.5)}%` }} />}
            </div>
            <div className="campanhas-funil-sub">
              {e.valor === null
                ? (e.nota ?? 'Em breve')
                : `${pct(share)} do total${prev ? ` · ${pct((e.valor / prev) * 100)} da etapa anterior` : ''}`}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
