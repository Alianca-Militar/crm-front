import { formatMoney } from '../../../lib/format'
import type { RfmTone } from './mocks'

type Resumo = { total: number; whatsapp: number; completos: number; optin: number }
type SemIdentificacao = { valor: number; vendas: number; totalValor: number; totalVendas: number }
type Perfil = { perfil: string; clientes: number; receita: number; acao: string; tom: RfmTone }

const int = (v: number) => Math.round(v).toLocaleString('pt-BR')
const pct = (part: number, total: number) =>
  total ? `${((part / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—'

/** Base de clientes: indicadores, vendas sem cliente, completude, lojas e perfis RFM. */
export default function BaseClientes({
  resumo,
  semId,
  completude,
  porLoja,
  rfm,
}: {
  resumo: Resumo
  semId: SemIdentificacao
  completude: { campo: string; pct: number }[]
  porLoja: { loja: string; clientes: number }[]
  rfm: Perfil[]
}) {
  const kpis = [
    { label: 'Total de clientes', valor: int(resumo.total), sub: 'pessoas físicas na base' },
    {
      label: 'Com WhatsApp',
      valor: int(resumo.whatsapp),
      sub: `${pct(resumo.whatsapp, resumo.total)} da base`,
    },
    {
      label: 'Cadastros completos',
      valor: int(resumo.completos),
      sub: `${pct(resumo.completos, resumo.total)} da base`,
    },
    {
      label: 'Opt-in ativo',
      valor: int(resumo.optin),
      sub: `${pct(resumo.optin, resumo.total)} aceitam marketing`,
    },
  ]
  const lojaMax = Math.max(1, ...porLoja.map((l) => l.clientes))
  const lojaTotal = porLoja.reduce((t, l) => t + l.clientes, 0)
  const semIdPct = semId.totalVendas ? (semId.vendas / semId.totalVendas) * 100 : 0

  return (
    <>
      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.valor}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <section className="card base-semid">
        <div className="base-semid-text">
          <h2 className="card-title">Vendas sem identificação (consumidor final)</h2>
          <p className="relatorios-note base-semid-note">
            Vendas do período lançadas no consumidor final do PDV, sem o cliente.
          </p>
        </div>
        <div className="base-semid-nums">
          <div>
            <span>Valor</span>
            <strong>{formatMoney(semId.valor)}</strong>
            <small>{pct(semId.valor, semId.totalValor)} do faturamento</small>
          </div>
          <div>
            <span>Vendas</span>
            <strong>{int(semId.vendas)}</strong>
            <small>de {int(semId.totalVendas)} no período</small>
          </div>
          <div>
            <span>Sem identificar</span>
            <strong className="base-semid-pct">{pct(semId.vendas, semId.totalVendas)}</strong>
            <div className="base-bar" aria-hidden="true">
              <span style={{ width: `${semIdPct}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div className="row">
        <section className="card base-half">
          <h2 className="card-title">Completude do cadastro (% preenchido)</h2>
          <div className="base-bars">
            {completude.map((c) => (
              <div key={c.campo} className="base-bar-row">
                <span className="base-bar-name">{c.campo}</span>
                <div className="base-bar">
                  <span style={{ width: `${c.pct}%` }} />
                </div>
                <strong>{c.pct}%</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="card base-half">
          <h2 className="card-title">Clientes por loja</h2>
          <div className="base-bars">
            {porLoja.map((l) => (
              <div key={l.loja} className="base-bar-row wide">
                <span className="base-bar-name">{l.loja}</span>
                <div className="base-bar dark">
                  <span style={{ width: `${(l.clientes / lojaMax) * 100}%` }} />
                </div>
                <strong>
                  {int(l.clientes)} <small>({pct(l.clientes, lojaTotal)})</small>
                </strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Matriz RFM · perfis (nº de clientes · receita no período)</h2>
        </div>
        <div className="rfm-grid">
          {rfm.map((p) => (
            <div key={p.perfil} className={`rfm-card tone-${p.tom}`}>
              <div className="rfm-name">{p.perfil}</div>
              <div className="rfm-count display-num">{int(p.clientes)}</div>
              <div className="rfm-revenue">{formatMoney(p.receita)}</div>
              <div className="rfm-action">{p.acao}</div>
            </div>
          ))}
        </div>
        <p className="relatorios-note base-rfm-note">
          RFM: recência (última compra), frequência (nº de compras) e valor gasto. Dados de exemplo.
        </p>
      </section>
    </>
  )
}
