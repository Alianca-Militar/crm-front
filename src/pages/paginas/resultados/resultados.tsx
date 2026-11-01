import { Link } from 'react-router'
import { campanha, campanhasSelect, cidades, funil, kpis, porLoja, resgates } from './mocks'
import './resultados.css'

export default function Resultados() {
  // TODO: carregar a campanha pelo :id da URL (GET /api/campaigns/{id}/results/)
  const base = funil[0][1]

  return (
    <div className="page page-resultados">
      <div className="page-head">
        <div className="resultados-head">
          <div className="resultados-meta">
            <span className="badge tone-green">{campanha.status}</span>
            <span className="muted">{campanha.info}</span>
          </div>
          <h1 className="page-title resultados-title">{campanha.nome}</h1>
        </div>
        <div className="page-actions">
          <label className="inline-select">
            Campanha
            <select>
              {campanhasSelect.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn md">
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="kpi-grid resultados-kpis">
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value resultados-kpi-value">{k.valor}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="row">
        <section className="card resultados-funil">
          <h2 className="card-title">Funil da campanha</h2>
          {funil.map(([etapa, n], i) => {
            const pct = (n / base) * 100
            const ultima = i === funil.length - 1
            return (
              <div key={etapa} className="resultados-funil-row">
                <div className="resultados-funil-label">{etapa}</div>
                <div className="resultados-funil-track">
                  <div
                    className={ultima ? 'resultados-funil-bar last' : 'resultados-funil-bar'}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="resultados-funil-num">
                  <strong>{n.toLocaleString('pt-BR')}</strong>{' '}
                  <span className="resultados-funil-pct">{pct.toFixed(0)}%</span>
                </div>
              </div>
            )
          })}
        </section>

        <section className="card resultados-cidades">
          <h2 className="card-title">Interesse em nova loja</h2>
          <p className="resultados-cidades-sub">Resposta da pesquisa · 312 respondentes</p>
          {cidades.map((c) => (
            <div key={c.nome} className="resultados-cidade">
              <div className="resultados-cidade-top">
                <span className="strong">{c.nome}</span>
                <span>{c.pct}%</span>
              </div>
              <div className="resultados-cidade-track">
                <span style={{ width: `${c.pct}%` }} />
              </div>
            </div>
          ))}
        </section>
      </div>

      <div className="row">
        <section className="card-dark resultados-lojas">
          <h2 className="card-title">Por loja</h2>
          {porLoja.map((l) => (
            <div key={l.loja} className="resultados-loja">
              <div>
                <div className="resultados-loja-label">{l.loja}</div>
                <div className="resultados-loja-value display-num">{l.resgates}</div>
              </div>
              <div className="resultados-loja-right">
                <div className="resultados-loja-label">Receita</div>
                <div className="resultados-loja-value display-num accent">{l.receita}</div>
              </div>
            </div>
          ))}
        </section>

        <section className="card resultados-resgates">
          <h2 className="card-title resultados-resgates-title">Últimos vouchers resgatados</h2>
          <div className="resultados-resgates-scroll">
            <table className="table plain compact resultados-resgates-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Código</th>
                  <th>Loja</th>
                  <th>Compra</th>
                  <th>Quando</th>
                </tr>
              </thead>
              <tbody>
                {resgates.map((r) => (
                  <tr key={r.cod}>
                    <td>
                      <Link to={`/clientes/${r.clienteId}`} className="row-link">
                        {r.nome}
                      </Link>
                    </td>
                    <td className="mono">{r.cod}</td>
                    <td>{r.loja}</td>
                    <td className="strong">{r.valor}</td>
                    <td className="muted">{r.quando}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
