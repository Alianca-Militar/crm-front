import { useState } from 'react'
import Avatar from '../../../components/avatar/avatar'
import MsgNok from '../../../components/msg_nok/msg_nok'
import MsgOk from '../../../components/msg_ok/msg_ok'
import { type Role, useMe } from '../../../lib/auth'
import { formatLastAccess } from '../../../lib/format'
import { useStores } from '../lojas/lojas_api'
import UsuarioForm from './usuario_form'
import VincularLojas from './vincular_lojas'
import { type UserAccount, useRoles, useUsers } from './usuarios_api'
import './usuarios.css'

// O que cada perfil acessa (regras em backend/core/permissions.py).
const ROLE_DESC: Record<Role, string> = {
  admin: 'Acesso total, em todas as lojas, inclusive Admin',
  gerente: 'Campanhas, relatórios e equipe das suas lojas',
  analista: 'Campanhas, resultados, clientes, bloqueios e relatórios',
  vendedor: 'Busca de cliente, ficha e o botão de bloqueio',
}

function fullName(u: UserAccount) {
  return `${u.first_name} ${u.last_name}`.trim() || u.email
}

export default function Usuarios() {
  const me = useMe()
  const users = useUsers()
  const roles = useRoles()
  const stores = useStores()
  // undefined = formulário fechado · null = novo usuário · UserAccount = editar
  const [editing, setEditing] = useState<UserAccount | null | undefined>(undefined)
  const [linking, setLinking] = useState<UserAccount | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const roleName = (code: Role | null) =>
    roles.data?.find((r) => r.code === code)?.name ?? code ?? 'Sem perfil'
  // Com muitas lojas, mostra as 3 primeiras e "+N" (a lista completa fica no title).
  const storeNames = (u: UserAccount) => {
    if (u.role === 'admin') return 'Todas'
    if (u.stores.length === 0) return <span className="badge tone-yellow">Nenhuma</span>
    const codes = u.stores.map((id) => stores.data?.find((s) => s.id === id)?.code ?? `#${id}`)
    const shown = codes.slice(0, 3).join(', ')
    const rest = codes.length - 3
    return <span title={codes.join(', ')}>{rest > 0 ? `${shown} +${rest}` : shown}</span>
  }

  const total = users.data?.length ?? 0
  const blocked = users.data?.filter((u) => !u.is_active).length ?? 0

  return (
    <div className="page page-usuarios">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Usuários</h1>
          {users.data && (
            <p className="page-subtitle">
              {total} {total === 1 ? 'usuário' : 'usuários'}
              {blocked > 0 && ` · ${blocked} ${blocked === 1 ? 'bloqueado' : 'bloqueados'}`}
            </p>
          )}
        </div>
        <button type="button" className="btn primary" onClick={() => setEditing(null)}>
          Novo usuário
        </button>
      </div>

      {saved && <MsgOk mensagem={saved} onClose={() => setSaved(null)} />}
      {warning && (
        <MsgNok
          titulo="Usuário cadastrado, mas o e-mail não foi enviado"
          mensagem={warning}
          onClose={() => setWarning(null)}
        />
      )}

      <div className="usuarios-perfis">
        {(roles.data ?? []).map((r) => (
          <div key={r.code} className="usuarios-perfil">
            <div className="usuarios-perfil-nome">{r.name}</div>
            <div className="usuarios-perfil-desc">{ROLE_DESC[r.code]}</div>
          </div>
        ))}
      </div>

      {users.isPending && <p className="muted">Carregando usuários…</p>}
      {users.isError && (
        <MsgNok titulo="Não foi possível carregar os usuários" mensagem={users.error.message} />
      )}

      {users.data && (
        <div className="table-wrap">
          <table className="table usuarios-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Loja</th>
                <th>Último acesso</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.data.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="usuarios-person">
                      <Avatar className="avatar sm dark" url={u.avatar_url} initials={u.avatar} />
                      <div>
                        <div className="strong">
                          {fullName(u)}
                          {u.id === me.data?.id && <span className="muted"> (você)</span>}
                        </div>
                        <div className="usuarios-email">
                          {u.email}
                          {u.position && ` · ${u.position}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{roleName(u.role)}</td>
                  <td>{storeNames(u)}</td>
                  <td className="muted">{formatLastAccess(u.last_login)}</td>
                  <td>
                    {!u.is_active ? (
                      <span className="badge tone-red">Bloqueado</span>
                    ) : u.has_password ? (
                      <span className="badge tone-green">Ativo</span>
                    ) : (
                      <span className="badge tone-yellow" title="Ainda não criou a senha">
                        Convite pendente
                      </span>
                    )}
                  </td>
                  <td className="num">
                    <div className="usuarios-actions">
                      {/* Admin vê todas as lojas: o botão aparece, mas desabilitado. */}
                      <button
                        type="button"
                        className="btn xs"
                        onClick={() => setLinking(u)}
                        disabled={u.role === 'admin'}
                        title={
                          u.role === 'admin' ? 'O perfil Admin já vê todas as lojas' : undefined
                        }
                      >
                        Vincular lojas
                      </button>
                      <button type="button" className="btn xs" onClick={() => setEditing(u)}>
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== undefined && (
        <UsuarioForm
          user={editing}
          meId={me.data?.id}
          onClose={() => setEditing(undefined)}
          onSaved={(u) => {
            setWarning(null)
            if ('invite' in u && !u.invite.sent) {
              setSaved(null)
              setWarning(
                `${u.invite.error ?? 'Falha no envio.'} Depois, abra "Editar" e use "Reenviar convite".`,
              )
            } else {
              setSaved(
                'invite' in u
                  ? `Usuário ${fullName(u)} cadastrado. O convite de primeiro acesso foi enviado para ${u.email}.`
                  : `Usuário ${fullName(u)} atualizado.`,
              )
            }
            setEditing(undefined)
            // Novo usuário que não é admin: já abre a escolha das lojas.
            if (!editing && u.role !== 'admin') setLinking(u)
          }}
        />
      )}

      {linking && (
        <VincularLojas
          user={linking}
          onClose={() => setLinking(null)}
          onSaved={(u) => {
            const n = u.stores.length
            setSaved(
              `${fullName(u)}: ${n === 0 ? 'nenhuma loja vinculada' : n === 1 ? '1 loja vinculada' : `${n} lojas vinculadas`}.`,
            )
            setLinking(null)
          }}
        />
      )}
    </div>
  )
}
