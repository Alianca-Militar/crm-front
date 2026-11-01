import { useState } from 'react'
import { nps, periodos, produtos, relatorios } from './mocks'
import './relatorios.css'

export default function Relatorios() {
  const [selecionado, setSelecionado] = useState(0)

  return (
    <div className="page page-relatorios">
      <div className="page-head">
        <h1 className="page-title">Relatórios</h1>
        <div className="page-actions">
          <label className="inline-select">
            Período
            <select>
              {periodos.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn md">
            Exportar PDF
          </button>
          <button type="button" className="btn md">
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="relatorios-picker">
        {relatorios.map((r, i) => (
          <button
            key={r.nome}
            type="button"
            aria-pressed={i === selecionado}
            className={i === selecionado ? 'relatorios-option on' : 'relatorios-option'}
            onClick={() => setSelecionado(i)}
          >
            <span className="relatorios-option-name">{r.nome}</span>
            <span className="relatorios-option-desc">{r.desc}</span>
          </button>
        ))}
      </div>

      <div className="row">
        <section className="card relatorios-produtos">
          <h2 className="card-title relatorios-produtos-title">
            Vendas por produto e loja · outubro
          </h2>
          <div className="relatorios-scroll">
            <table className="table compact relatorios-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="num">Juiz de Fora</th>
                  <th className="num">Belo Horizonte</th>
                  <th className="num">Total</th>
                  <th className="num">Via campanha</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((p) => (
                  <tr key={p.nome}>
                    <td className="strong">{p.nome}</td>
                    <td className="num">{p.jf}</td>
                    <td className="num">{p.bh}</td>
                    <td className="num relatorios-total">{p.total}</td>
                    <td className="num">{p.camp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

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
      </div>
    </div>
  )
}
