import { useMemo, useState } from 'react'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { ApiError } from '../../../lib/api'
import { useStores } from '../lojas/lojas_api'
import { type UserAccount, useSaveUser } from './usuarios_api'

/** Sem acento e em minúsculas, para a busca achar "Juiz de Fora" com "juiz de fora". */
function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

type VincularLojasProps = {
  user: UserAccount
  onClose: () => void
  onSaved: (user: UserAccount) => void
}

export default function VincularLojas({ user, onClose, onSaved }: VincularLojasProps) {
  const stores = useStores()
  const save = useSaveUser()
  const [selected, setSelected] = useState<Set<number>>(() => new Set(user.stores))
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const visible = useMemo(() => {
    const q = normalize(query.trim())
    const list = stores.data ?? []
    return q ? list.filter((s) => normalize(`${s.code} ${s.name}`).includes(q)) : list
  }, [stores.data, query])

  const total = stores.data?.length ?? 0
  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(s.id))

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Marca ou desmarca só as lojas que a busca está mostrando.
  function toggleVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const s of visible) {
        if (allVisibleSelected) next.delete(s.id)
        else next.add(s.id)
      }
      return next
    })
  }

  function onSave() {
    setError(null)
    save.mutate(
      { id: user.id, data: { stores: [...selected] } },
      {
        onSuccess: onSaved,
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : 'Não foi possível salvar as lojas.'),
      },
    )
  }

  const name = `${user.first_name} ${user.last_name}`.trim() || user.email

  return (
    <Modal
      open
      titulo={`Lojas de ${name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn sm primary"
            onClick={onSave}
            disabled={save.isPending || stores.isPending}
          >
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="vincular-lojas">
        {error && <MsgNok titulo="Não foi possível salvar" mensagem={error} />}
        {stores.isError && (
          <MsgNok titulo="Não foi possível carregar as lojas" mensagem={stores.error.message} />
        )}

        <div className="field">
          <label htmlFor="vinc-busca">Buscar loja</label>
          <input
            id="vinc-busca"
            type="search"
            placeholder="Código ou nome"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="vincular-lojas-bar">
          <span className="muted">
            {selected.size} de {total} {total === 1 ? 'loja selecionada' : 'lojas selecionadas'}
          </span>
          {visible.length > 0 && (
            <button type="button" className="btn xs" onClick={toggleVisible}>
              {allVisibleSelected ? 'Desmarcar' : 'Marcar'} {query.trim() ? 'resultado' : 'todas'}
            </button>
          )}
        </div>

        <ul className="vincular-lojas-list">
          {stores.isPending && <li className="muted">Carregando lojas…</li>}
          {stores.data && visible.length === 0 && (
            <li className="muted">Nenhuma loja encontrada.</li>
          )}
          {visible.map((s) => (
            <li key={s.id}>
              <label className="check">
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                <span className="strong">{s.code}</span>
                <span>{s.name}</span>
                {!s.active && <span className="badge tone-red">Inativa</span>}
              </label>
            </li>
          ))}
        </ul>

        {selected.size === 0 && (
          <span className="usuario-form-hint">
            Sem loja vinculada, o usuário não vê dados de nenhuma loja.
          </span>
        )}
      </div>
    </Modal>
  )
}
