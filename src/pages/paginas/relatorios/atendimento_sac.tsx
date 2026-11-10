import { useState } from 'react'
import { formatMoney } from '../../../lib/format'
import { useWidth } from './use_width'

type Nps = {
  geral: string
  respostas: string
  promotores: number
  neutros: number
  detratores: number
  porLoja: { loja: string; nps: string }[]
}
type Resumo = {
  conversas: number
  mensagens: number
  notaAtendente: number
  avaliacoesAtendente: number
  notaIa: number
  analisadasIa: number
}
type Dia = { dia: string; conversas: number; custoTemplates: number; custoMensagens: number }

const int = (v: number) => Math.round(v).toLocaleString('pt-BR')
const dec = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const pct = (part: number, total: number) =>
  total ? `${((part / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—'
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

// Cores das fatias e séries (as 3 primeiras são as do CRM).
const SERIES = ['var(--accent)', 'var(--ink)', 'var(--border-strong)', '#d9a400', 'var(--ok-icon)']

/** NPS, notas do Google, indicadores, custo por dia, conversas por número e a IA. */
export default function AtendimentoSac({
  nps,
  google,
  resumo,
  dias,
  porNumero,
  iaAcertos,
  iaNotas,
  periodo,
}: {
  nps: Nps
  google: { loja: string; nota: number; avaliacoes: number }[]
  resumo: Resumo
  dias: Dia[]
  porNumero: { numero: string; conversas: number }[]
  iaAcertos: { semana: string; acertos: number; erros: number }[]
  iaNotas: { nota: string; conversas: number }[]
  periodo: string
}) {
  const kpis = [
    { label: 'Conversas', valor: int(resumo.conversas), sub: 'no período' },
    {
      label: 'Mensagens',
      valor: int(resumo.mensagens),
      sub: `${dec(resumo.conversas ? resumo.mensagens / resumo.conversas : 0)} por conversa`,
    },
    {
      label: 'Nota do atendente',
      valor: `${dec(resumo.notaAtendente)}/5`,
      sub: `${int(resumo.avaliacoesAtendente)} avaliações dos clientes`,
    },
    {
      label: 'Nota IA do atendimento',
      valor: `${dec(resumo.notaIa)}/10`,
      sub: `${int(resumo.analisadasIa)} conversas analisadas`,
    },
  ]

  return (
    <>
      <div className="row">
        <section className="card relatorios-nps">
          <h2 className="card-title">Satisfação no atendimento</h2>
          <div className="relatorios-nps-nums">
            <div>
              <div className="relatorios-nps-label">NPS geral</div>
              <div className="relatorios-nps-value display-num">{nps.geral}</div>
            </div>
            <div>
              <div className="relatorios-nps-label">Respostas</div>
              <div className="relatorios-nps-value display-num">{nps.respostas}</div>
            </div>
          </div>
          <div
            className="relatorios-nps-bar"
            role="img"
            aria-label={`Promotores ${nps.promotores}%, neutros ${nps.neutros}%, detratores ${nps.detratores}%`}
          >
            <div className="promotores" style={{ width: `${nps.promotores}%` }} />
            <div className="neutros" style={{ width: `${nps.neutros}%` }} />
            <div className="detratores" style={{ width: `${nps.detratores}%` }} />
          </div>
          <div className="legend">
            <span className="legend-item">
              <span className="legend-swatch promotores" />
              Promotores {nps.promotores}%
            </span>
            <span className="legend-item">
              <span className="legend-swatch neutros" />
              Neutros {nps.neutros}%
            </span>
            <span className="legend-item">
              <span className="legend-swatch detratores" />
              Detratores {nps.detratores}%
            </span>
          </div>
          <div className="relatorios-nps-lojas">
            {nps.porLoja.map((l) => (
              <div key={l.loja} className="relatorios-nps-loja">
                <span>{l.loja}</span>
                <strong>{l.nps}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="card sac-google">
          <h2 className="card-title">Notas no Google por loja</h2>
          {google.map((g) => (
            <div key={g.loja} className="sac-google-loja">
              <div>
                <div className="sac-google-name">{g.loja}</div>
                <div className="sac-google-count">{int(g.avaliacoes)} avaliações</div>
              </div>
              <div className="sac-google-score">
                <span className="display-num">{dec(g.nota)}</span>
                <Stars value={g.nota} />
              </div>
            </div>
          ))}
        </section>
      </div>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.valor}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Conversas por dia x custo · {periodo}</h2>
          <div className="legend">
            <span className="legend-item">
              <span className="legend-swatch sac-swatch-bar" />
              Conversas
            </span>
            <span className="legend-item">
              <span className="sac-swatch-line" />
              Custo (templates + mensagens)
            </span>
          </div>
        </div>
        <CostChart dias={dias} />
      </section>

      <div className="row">
        <section className="card sac-third">
          <h2 className="card-title">Conversas por número</h2>
          <Donut
            items={porNumero.map((n) => ({ label: n.numero, value: n.conversas }))}
            center="conversas"
          />
        </section>

        <section className="card sac-third">
          <h2 className="card-title">IA: acertos x erros por semana</h2>
          <div className="legend">
            <span className="legend-item">
              <span className="legend-swatch sac-ok" />
              Acertos
            </span>
            <span className="legend-item">
              <span className="legend-swatch sac-bad" />
              Erros
            </span>
          </div>
          <div className="sac-bars">
            {iaAcertos.map((s) => {
              const total = s.acertos + s.erros
              return (
                <div key={s.semana} className="sac-bars-row">
                  <span>{s.semana}</span>
                  <div
                    className="sac-stack"
                    role="img"
                    aria-label={`${s.acertos} acertos e ${s.erros} erros`}
                  >
                    <span className="sac-ok" style={{ width: `${(s.acertos / total) * 100}%` }} />
                    <span className="sac-bad" style={{ width: `${(s.erros / total) * 100}%` }} />
                  </div>
                  <strong>{pct(s.acertos, total)}</strong>
                </div>
              )
            })}
          </div>
        </section>

        <section className="card sac-third">
          <h2 className="card-title">Notas da IA (conversas por nota)</h2>
          <Histogram items={iaNotas} />
        </section>
      </div>
    </>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="sac-stars" aria-label={`${dec(value)} de 5 estrelas`}>
      <span className="sac-stars-base">★★★★★</span>
      <span className="sac-stars-fill" style={{ width: `${(value / 5) * 100}%` }}>
        ★★★★★
      </span>
    </span>
  )
}

const HEIGHT = 240
const PAD = { top: 16, right: 64, bottom: 26, left: 44 }

function CostChart({ dias }: { dias: Dia[] }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const w = Math.max(width, 280)
  const plotW = w - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const base = PAD.top + plotH
  const slot = plotW / Math.max(1, dias.length)
  const cost = dias.map((d) => d.custoTemplates + d.custoMensagens)
  const maxConv = Math.max(1, ...dias.map((d) => d.conversas))
  const maxCost = Math.max(1, ...cost)
  const x = (i: number) => PAD.left + slot * i + slot / 2
  const yConv = (v: number) => base - (v / maxConv) * plotH
  const yCost = (v: number) => base - (v / maxCost) * plotH
  const labelEvery = Math.ceil(dias.length / Math.max(2, Math.floor(plotW / 60)))
  const total = cost.reduce((t, c) => t + c, 0)
  const h = hover === null ? null : dias[hover]

  return (
    <div ref={ref} className="campanhas-area">
      {width > 0 && dias.length > 0 && (
        <svg
          width={w}
          height={HEIGHT}
          role="img"
          aria-label={`Conversas por dia e custo diário. Custo no período ${formatMoney(total)}.`}
          onPointerMove={(event) => {
            const left = event.currentTarget.getBoundingClientRect().left
            const i = Math.floor((event.clientX - left - PAD.left) / slot)
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
                y1={base - (plotH / 3) * k}
                y2={base - (plotH / 3) * k}
              />
              <text
                className="campanhas-axis"
                x={PAD.left - 8}
                y={base - (plotH / 3) * k + 4}
                textAnchor="end"
              >
                {int((maxConv / 3) * k)}
              </text>
              <text className="campanhas-axis" x={w - PAD.right + 8} y={base - (plotH / 3) * k + 4}>
                {formatMoney((maxCost / 3) * k)}
              </text>
            </g>
          ))}
          {dias.map((d, i) => (
            <g key={d.dia}>
              {hover === i && (
                <rect
                  className="sac-hover"
                  x={x(i) - slot / 2}
                  y={PAD.top}
                  width={slot}
                  height={plotH}
                />
              )}
              <rect
                className="sac-bar"
                x={x(i) - Math.max(2, slot * 0.6) / 2}
                y={yConv(d.conversas)}
                width={Math.max(2, slot * 0.6)}
                height={Math.max(0, base - yConv(d.conversas))}
                rx={1.5}
              />
              {i % labelEvery === 0 && (
                <text className="campanhas-axis" x={x(i)} y={HEIGHT - 6} textAnchor="middle">
                  {dm(d.dia)}
                </text>
              )}
            </g>
          ))}
          <path
            className="sac-line"
            d={cost.map((c, i) => `${i ? 'L' : 'M'}${x(i)},${yCost(c)}`).join(' ')}
          />
        </svg>
      )}
      {h && hover !== null && (
        <div
          className={x(hover) > w / 2 ? 'campanhas-tooltip right' : 'campanhas-tooltip'}
          style={{ left: x(hover) }}
        >
          <strong>{dm(h.dia)}</strong>
          <span>Conversas: {int(h.conversas)}</span>
          <span>Templates: {formatMoney(h.custoTemplates)}</span>
          <span>Mensagens: {formatMoney(h.custoMensagens)}</span>
          <span>
            <strong>Custo do dia: {formatMoney(h.custoTemplates + h.custoMensagens)}</strong>
          </span>
        </div>
      )}
      <p className="relatorios-note sac-total">Custo no período: {formatMoney(total)}</p>
    </div>
  )
}

function Donut({ items, center }: { items: { label: string; value: number }[]; center: string }) {
  const total = items.reduce((t, i) => t + i.value, 0)
  const r = 60
  const c = 2 * Math.PI * r
  const lens = items.map((i) => (total ? (i.value / total) * c : 0))
  // Onde cada fatia começa: soma das anteriores.
  const starts = lens.map((_, k) => lens.slice(0, k).reduce((t, l) => t + l, 0))
  return (
    <div className="sac-donut">
      <svg
        viewBox="0 0 160 160"
        width={160}
        height={160}
        role="img"
        aria-label={`${int(total)} ${center}`}
      >
        <circle cx={80} cy={80} r={r} className="sac-donut-base" />
        {total > 0 &&
          items.map((item, k) => (
            <circle
              key={item.label}
              cx={80}
              cy={80}
              r={r}
              fill="none"
              stroke={SERIES[k % SERIES.length]}
              strokeWidth={24}
              strokeDasharray={`${lens[k]} ${c - lens[k]}`}
              strokeDashoffset={-starts[k]}
              transform="rotate(-90 80 80)"
            />
          ))}
        <text x={80} y={78} textAnchor="middle" className="sac-donut-total">
          {int(total)}
        </text>
        <text x={80} y={96} textAnchor="middle" className="campanhas-axis">
          {center}
        </text>
      </svg>
      <ul className="sac-donut-legend">
        {items.map((item, k) => (
          <li key={item.label}>
            <span className="legend-swatch" style={{ background: SERIES[k % SERIES.length] }} />
            <span className="sac-donut-name">{item.label}</span>
            <strong>{int(item.value)}</strong>
            <span className="sac-donut-pct">{pct(item.value, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Histogram({ items }: { items: { nota: string; conversas: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.conversas))
  return (
    <div
      className="sac-histogram"
      role="img"
      aria-label="Quantidade de conversas por faixa de nota"
    >
      {items.map((i) => (
        <div key={i.nota} className="sac-histogram-col">
          <strong>{int(i.conversas)}</strong>
          <div className="sac-histogram-track">
            <span style={{ height: `${(i.conversas / max) * 100}%` }} />
          </div>
          <span>{i.nota}</span>
        </div>
      ))}
    </div>
  )
}
