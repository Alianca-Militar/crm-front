import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'
import { conversas, filtros } from './mocks'
import './conversas.css'

export default function Conversas() {
  const [selId, setSelId] = useState(conversas[0].id)
  const [rascunho, setRascunho] = useState('')
  // Mensagens enviadas nesta sessão, por conversa (só na tela; nada é enviado de verdade)
  const [enviadas, setEnviadas] = useState<Record<number, string[]>>({})

  const atual = conversas.find((c) => c.id === selId) ?? conversas[0]
  const extras = enviadas[atual.id] ?? []

  function handleSend(event: FormEvent) {
    event.preventDefault()
    const texto = rascunho.trim()
    if (!texto) return
    setEnviadas((e) => ({ ...e, [atual.id]: [...(e[atual.id] ?? []), texto] }))
    setRascunho('')
  }

  return (
    <div className="page-conversas">
      <section aria-label="Lista de conversas" className="conversas-list">
        <div className="conversas-list-head">
          <h1 className="conversas-title">Conversas</h1>
          <div className="conversas-filters">
            {filtros.map((f) => (
              <span key={f.label} className={f.ativo ? 'conversas-filter on' : 'conversas-filter'}>
                {f.label}
              </span>
            ))}
          </div>
        </div>

        {conversas.map((c) => (
          <button
            key={c.id}
            type="button"
            className={c.id === atual.id ? 'conversas-item selected' : 'conversas-item'}
            aria-current={c.id === atual.id ? 'true' : undefined}
            onClick={() => setSelId(c.id)}
          >
            <span className="avatar">{c.ini}</span>
            <span className="conversas-item-body">
              <span className="conversas-item-top">
                <span className="conversas-item-name">{c.nome}</span>
                <span className="conversas-item-when">{c.quando}</span>
              </span>
              <span className="conversas-item-last">{c.ultima}</span>
              <span className="conversas-item-store">{c.loja}</span>
            </span>
          </button>
        ))}
      </section>

      <section aria-label="Conversa" className="conversas-chat">
        <div className="conversas-chat-head">
          <div className="conversas-chat-who">
            <span className="conversas-chat-name">{atual.nome}</span>
            <span className="conversas-chat-meta">
              WhatsApp · {atual.fone} · {atual.loja}
            </span>
          </div>
          <div className="page-actions">
            <Link to={`/clientes/${atual.clienteId}`} className="btn sm">
              Ver ficha
            </Link>
            <button type="button" className="btn sm dark">
              Resolver
            </button>
          </div>
        </div>

        <div className="conversas-messages">
          {atual.msgs.map((m, i) => (
            <div key={i} className={m.de === 'c' ? 'conversas-msg in' : 'conversas-msg out'}>
              <div className="conversas-bubble">
                {m.texto}
                <div className="conversas-time">{m.hora}</div>
              </div>
            </div>
          ))}
          {extras.map((texto, i) => (
            <div key={`extra-${i}`} className="conversas-msg out">
              <div className="conversas-bubble">
                {texto}
                <div className="conversas-time">agora</div>
              </div>
            </div>
          ))}
        </div>

        <form className="conversas-composer" onSubmit={handleSend}>
          <label htmlFor="conversas-msg" className="sr-only">
            Mensagem
          </label>
          <input
            id="conversas-msg"
            placeholder="Escreva uma resposta…"
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
          />
          <Link to="/templates" className="conversas-templates">
            Templates
          </Link>
          <button type="submit" className="btn primary conversas-send">
            Enviar
          </button>
        </form>
      </section>
    </div>
  )
}
