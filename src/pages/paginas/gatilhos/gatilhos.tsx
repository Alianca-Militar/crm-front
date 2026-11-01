import { useState } from 'react'
import { IconArrowRight } from '../../../components/menu/icons'
import { gatilhos } from './mocks'
import './gatilhos.css'

export default function Gatilhos() {
  const [ativos, setAtivos] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(gatilhos.map((g) => [g.id, g.ativo])),
  )

  return (
    <div className="page page-gatilhos">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Gatilhos</h1>
          <p className="page-subtitle">
            Mensagens automáticas disparadas por eventos do cliente ou da loja.
          </p>
        </div>
        <button type="button" className="btn primary">
          Novo gatilho
        </button>
      </div>

      <div className="gatilhos-list">
        {gatilhos.map((g) => {
          const on = ativos[g.id]
          return (
            <article key={g.id} className="gatilhos-card">
              <div className="gatilhos-info">
                <h2 className="gatilhos-name">{g.nome}</h2>
                <div className="gatilhos-stats">
                  {g.loja} · {g.stats}
                </div>
              </div>

              <div className="gatilhos-flow">
                <span className="gatilhos-step when">
                  <strong>QUANDO</strong>
                  {g.quando}
                </span>
                <span className="gatilhos-arrow">
                  <IconArrowRight size={18} />
                </span>
                <span className="gatilhos-step wait">
                  <strong>ESPERAR</strong>
                  {g.espera}
                </span>
                <span className="gatilhos-arrow">
                  <IconArrowRight size={18} />
                </span>
                <span className="gatilhos-step send">
                  <strong>ENVIAR</strong>
                  <span className="mono">{g.acao}</span>
                </span>
              </div>

              <div className="gatilhos-toggle">
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`Ativar ${g.nome}`}
                  className={on ? 'gatilhos-switch on' : 'gatilhos-switch'}
                  onClick={() => setAtivos((a) => ({ ...a, [g.id]: !a[g.id] }))}
                >
                  <span className="gatilhos-knob" />
                </button>
                <span className="gatilhos-toggle-label">{on ? 'Ativo' : 'Pausado'}</span>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
