import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { type Path, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { ApiError } from '../../../lib/api'
import type { Role } from '../../../lib/auth'
import MsgOk from '../../../components/msg_ok/msg_ok'
import {
  type UserAccount,
  type UserCreated,
  type UserInput,
  useRoles,
  useSaveUser,
  useSendAccessLink,
} from './usuarios_api'

const ROLES = ['admin', 'gerente', 'analista', 'vendedor'] as const

// Sem campo de senha: a pessoa recebe por e-mail o link para criar a dela.
const schema = z.object({
  first_name: z.string().trim().min(1, 'Informe o nome.').max(150),
  last_name: z.string().trim().max(150),
  email: z.email('E-mail inválido.'),
  role: z.enum(ROLES, { error: 'Escolha o perfil.' }),
  position: z.string().trim(),
  phone: z.string().trim(),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

function toForm(user: UserAccount | null): FormValues {
  return {
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    email: user?.email ?? '',
    // Superuser criado no terminal pode não ter perfil: aparece como admin.
    role: (user?.role ?? 'vendedor') as Role,
    position: user?.position ?? '',
    phone: user?.phone ?? '',
    is_active: user?.is_active ?? true,
  }
}

type UsuarioFormProps = {
  /** null = novo usuário */
  user: UserAccount | null
  /** id do usuário logado (não pode se bloquear nem deixar de ser admin) */
  meId: number | undefined
  onClose: () => void
  onSaved: (user: UserAccount | UserCreated) => void
}

export default function UsuarioForm({ user, meId, onClose, onSaved }: UsuarioFormProps) {
  const isNew = user === null
  const isSelf = user !== null && user.id === meId
  const save = useSaveUser()
  const roles = useRoles()
  const sendLink = useSendAccessLink()
  const [error, setError] = useState<string | null>(null)
  const [linkMsg, setLinkMsg] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    setError: setFieldError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(user) })

  const role = useWatch({ control, name: 'role' })

  function onSubmit(values: FormValues) {
    setError(null)
    const data: Partial<UserInput> = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email.trim().toLowerCase(),
      role: values.role,
      position: values.position || null,
      phone: values.phone || null,
      is_active: values.is_active,
    }
    save.mutate(
      { id: user?.id, data },
      {
        onSuccess: onSaved,
        onError: (err) => {
          if (err instanceof ApiError) {
            for (const [field, messages] of Object.entries(err.fieldErrors)) {
              if (field in toForm(null)) {
                setFieldError(field as Path<FormValues>, { message: messages.join(' ') })
              }
            }
            setError(err.message)
          } else {
            setError('Não foi possível salvar o usuário.')
          }
        },
      },
    )
  }

  const fieldError = (name: keyof FormValues) =>
    errors[name] && (
      <span className="usuario-form-error" role="alert">
        {errors[name]?.message}
      </span>
    )

  return (
    <Modal
      open
      titulo={isNew ? 'Novo usuário' : `Editar ${user.first_name || user.email}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form="usuario-form"
            className="btn sm primary"
            disabled={save.isPending}
          >
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form
        id="usuario-form"
        className="usuario-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        autoComplete="off"
      >
        {error && <MsgNok titulo="Não foi possível salvar" mensagem={error} />}

        <div className="form-grid tight">
          <div className="field">
            <label htmlFor="usr-first">Nome</label>
            <input id="usr-first" {...register('first_name')} />
            {fieldError('first_name')}
          </div>
          <div className="field">
            <label htmlFor="usr-last">Sobrenome</label>
            <input id="usr-last" {...register('last_name')} />
            {fieldError('last_name')}
          </div>
        </div>

        <div className="field">
          <label htmlFor="usr-email">E-mail (login)</label>
          <input id="usr-email" type="email" autoComplete="off" {...register('email')} />
          {isNew && (
            <span className="usuario-form-hint">
              A pessoa recebe neste e-mail o link de primeiro acesso para criar a própria senha.
            </span>
          )}
          {fieldError('email')}
        </div>

        <div className="form-grid tight">
          <div className="field">
            <label htmlFor="usr-role">Perfil</label>
            {isSelf ? (
              <>
                <input
                  id="usr-role"
                  readOnly
                  value={roles.data?.find((r) => r.code === role)?.name ?? role}
                />
                <span className="usuario-form-hint">Você não pode mudar o próprio perfil.</span>
              </>
            ) : (
              <select id="usr-role" {...register('role')}>
                {(roles.data ?? []).map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
            {fieldError('role')}
          </div>
          <div className="field">
            <label htmlFor="usr-position">Cargo</label>
            <input id="usr-position" placeholder="Ex.: Gerente da loja" {...register('position')} />
          </div>
          <div className="field">
            <label htmlFor="usr-phone">Telefone</label>
            <input id="usr-phone" inputMode="tel" {...register('phone')} />
          </div>
        </div>

        {!isNew && user.is_active && (
          <div className="usuario-form-access">
            <div>
              <div className="field-label">Acesso</div>
              <span className="usuario-form-hint">
                {user.has_password
                  ? 'Envia um link para a pessoa criar uma nova senha (vale 1 hora).'
                  : 'Ainda não criou a senha. Reenvie o convite se o link expirou (vale 3 dias).'}
              </span>
            </div>
            <button
              type="button"
              className="btn xs"
              disabled={sendLink.isPending}
              onClick={() => {
                setLinkMsg(null)
                setError(null)
                sendLink.mutate(user.id, {
                  onSuccess: () => setLinkMsg(`Link enviado para ${user.email}.`),
                  onError: (err) =>
                    setError(err instanceof ApiError ? err.message : 'Não foi possível enviar.'),
                })
              }}
            >
              {sendLink.isPending
                ? 'Enviando…'
                : user.has_password
                  ? 'Enviar link de nova senha'
                  : 'Reenviar convite'}
            </button>
          </div>
        )}
        {linkMsg && (
          <MsgOk titulo="E-mail enviado" mensagem={linkMsg} onClose={() => setLinkMsg(null)} />
        )}

        {!isSelf && (
          <label className="check">
            <input type="checkbox" {...register('is_active')} />
            Usuário ativo (desmarque para bloquear o acesso)
          </label>
        )}
      </form>
    </Modal>
  )
}
