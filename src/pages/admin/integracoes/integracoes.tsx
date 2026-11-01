import { useState } from 'react'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { alerta, integracoes, statusTone } from './mocks'
import './integracoes.css'

export default function Integracoes() {
  const [mostrarAlerta, setMostrarAlerta] = useState(true)

  return (
    <div className="page page-integracoes">
      <div className="page-head-text">
        <h1 className="page-title">Integrações</h1>
        <p className="page-subtitle">
          Canais de envio, sistemas das lojas e formulários que alimentam o CRM.
        </p>
      </div>

      {mostrarAlerta && (
        <MsgNok
          titulo={alerta.titulo}
          mensagem={alerta.mensagem}
          onClose={() => setMostrarAlerta(false)}
        />
      )}

      <div className="integracoes-grid">
        {integracoes.map((i) => (
          <article
            key={i.nome}
            className={i.status === 'Com erro' ? 'integracoes-card error' : 'integracoes-card'}
          >
            <div className="integracoes-card-top">
              <div className="integracoes-id">
                <span className="integracoes-sigla">{i.sigla}</span>
                <div>
                  <h2 className="integracoes-nome">{i.nome}</h2>
                  <div className="integracoes-tipo">{i.tipo}</div>
                </div>
              </div>
              <span className={`badge sm ${statusTone[i.status]}`}>{i.status}</span>
            </div>
            <p className="integracoes-desc">{i.desc}</p>
            <div className="integracoes-foot">
              <span>{i.sync}</span>
              <button type="button" className="btn xs">
                {i.botao}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
