import { useState } from 'react'
import { Link } from 'react-router'
import MsgNok from '../../../components/msg_nok/msg_nok'
import MsgOk from '../../../components/msg_ok/msg_ok'
import { useMe } from '../../../lib/auth'
import { formatCep, formatCnpj } from '../../../lib/format'
import LojaForm from './loja_form'
import { useWhatsappNumbers } from '../canais/canais_api'
import { type Store, useStores } from './lojas_api'
import './lojas.css'

const EMPTY = '—'

export default function Lojas() {
  const me = useMe()
  const stores = useStores()
  const canEdit = me.data?.role === 'admin'
  // undefined = formulário fechado · null = nova loja · Store = editar
  const [editing, setEditing] = useState<Store | null | undefined>(undefined)
  const [saved, setSaved] = useState<string | null>(null)
  const numbers = useWhatsappNumbers()

  return (
    <div className="page page-lojas">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Lojas</h1>
          <p className="page-subtitle">
            Operadas por Meia Lua e D'Barreto Confecções Ltda sob licença da marca INVICTUS.
          </p>
        </div>
        {canEdit && (
          <button type="button" className="btn primary" onClick={() => setEditing(null)}>
            Adicionar loja
          </button>
        )}
      </div>

      {saved && <MsgOk mensagem={saved} onClose={() => setSaved(null)} />}

      {stores.isPending && <p className="muted">Carregando lojas…</p>}

      {stores.isError && (
        <MsgNok titulo="Não foi possível carregar as lojas" mensagem={stores.error.message} />
      )}

      {stores.data?.length === 0 && (
        <section className="card lojas-empty">
          <p>Nenhuma loja cadastrada ainda.</p>
          {canEdit && (
            <button type="button" className="btn sm" onClick={() => setEditing(null)}>
              Cadastrar a primeira loja
            </button>
          )}
        </section>
      )}

      {!!stores.data?.length && (
        <div className="lojas-grid">
          {stores.data.map((l) => (
            <article key={l.id} className="lojas-card">
              <div className="lojas-card-head">
                <div className="lojas-card-title">
                  <span className="lojas-sigla">
                    {l.code}
                    {l.is_headquarters && ' · Matriz'}
                  </span>
                  <h2 className="lojas-nome">{l.name}</h2>
                </div>
                <span className={l.active ? 'badge tone-green' : 'badge tone-gray'}>
                  {l.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              <dl className="dl lojas-dl">
                <dt>Razão social</dt>
                <dd>{l.corporate}</dd>
                <dt>CNPJ</dt>
                <dd className="mono">{formatCnpj(l.cnpj)}</dd>
                <dt>Inscrição est.</dt>
                <dd>{l.ie || EMPTY}</dd>
                <dt>Endereço</dt>
                <dd>{l.address || EMPTY}</dd>
                <dt>CEP</dt>
                <dd>{l.cep ? formatCep(l.cep) : EMPTY}</dd>
                <dt>Cidade</dt>
                <dd>{l.city_name ? `${l.city_name}/${l.state_code}` : (l.state_code ?? EMPTY)}</dd>
                <dt>E-mail</dt>
                <dd>{l.email || EMPTY}</dd>
              </dl>

              <div className="lojas-actions">
                {canEdit && (
                  <button type="button" className="btn sm" onClick={() => setEditing(l)}>
                    Editar loja
                  </button>
                )}
                <Link to={`/admin/canais?loja=${l.id}`} className="lojas-team-link">
                  WhatsApp ({numbers.data?.filter((n) => n.store === l.id).length ?? 0})
                </Link>
                <Link to="/admin/usuarios" className="lojas-team-link">
                  Ver equipe
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <LojaForm
          store={editing}
          onClose={() => setEditing(undefined)}
          onSaved={(store) => {
            setSaved(editing ? `Loja ${store.code} atualizada.` : `Loja ${store.code} cadastrada.`)
            setEditing(undefined)
          }}
        />
      )}
    </div>
  )
}
