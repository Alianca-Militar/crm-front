import { zodResolver } from '@hookform/resolvers/zod'
import { type FormEvent, useRef, useState } from 'react'
import { type Path, useForm } from 'react-hook-form'
import { z } from 'zod'
import Avatar from '../../../components/avatar/avatar'
import MsgNok from '../../../components/msg_nok/msg_nok'
import MsgOk from '../../../components/msg_ok/msg_ok'
import { ApiError } from '../../../lib/api'
import { ROLE_LABEL } from '../../../lib/auth'
import { formatLastAccess } from '../../../lib/format'
import {
  type Profile,
  useChangePassword,
  useEndSession,
  useProfile,
  useRemoveAvatar,
  useSaveProfile,
  useSessions,
  useUploadAvatar,
} from './perfil_api'
import './perfil.css'

// Ainda não existem notificações no CRM: a seção fica visível, mas desligada.
const AVISOS = [
  'Nova conversa na minha loja',
  'Campanha concluída',
  'Template aprovado ou rejeitado',
  'Resumo diário por e-mail',
]

const AVATAR_TYPES = 'image/jpeg,image/png,image/webp'
const AVATAR_MAX_MB = 5

function errorText(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    const first = Object.values(err.fieldErrors)[0]
    return first ? first.join(' ') : err.message
  }
  return fallback
}

export default function Perfil() {
  const profile = useProfile()
  const [saved, setSaved] = useState<string | null>(null)

  if (profile.isPending) return <p className="muted">Carregando perfil…</p>
  if (profile.isError) {
    return <MsgNok titulo="Não foi possível carregar o perfil" mensagem={profile.error.message} />
  }
  const p = profile.data

  return (
    <div className="page narrow page-perfil">
      <div className="page-head perfil-head">
        <AvatarBlock profile={p} onDone={setSaved} />
        <button type="submit" form="perfil-dados" className="btn primary">
          Salvar alterações
        </button>
      </div>

      {saved && (
        <MsgOk titulo="Perfil atualizado" mensagem={saved} onClose={() => setSaved(null)} />
      )}

      {/* key: recria o formulário com os valores salvos */}
      <DadosForm key={p.id} profile={p} onSaved={() => setSaved('Suas alterações foram salvas.')} />

      <div className="row">
        <SenhaCard />

        <section className="card perfil-half perfil-avisos">
          <div className="perfil-card-head">
            <h2 className="card-title">Me avisar quando</h2>
            <span className="badge tone-gray">Em breve</span>
          </div>
          {AVISOS.map((label) => (
            <label key={label} className="check">
              <input type="checkbox" disabled />
              {label}
            </label>
          ))}
        </section>
      </div>

      <SessoesCard />
    </div>
  )
}

// --- Foto, nome e perfil ----------------------------------------------------------------

function AvatarBlock({ profile, onDone }: { profile: Profile; onDone: (msg: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()
  const [error, setError] = useState<string | null>(null)
  const busy = upload.isPending || remove.isPending

  function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!AVATAR_TYPES.split(',').includes(file.type)) {
      setError('Envie uma imagem JPG, PNG ou WebP.')
      return
    }
    if (file.size > AVATAR_MAX_MB * 1024 * 1024) {
      setError(`A imagem pode ter no máximo ${AVATAR_MAX_MB} MB.`)
      return
    }
    upload.mutate(file, {
      onSuccess: () => onDone('Foto atualizada.'),
      onError: (err) => setError(errorText(err, 'Não foi possível enviar a foto.')),
    })
  }

  const name = `${profile.first_name} ${profile.last_name}`.trim() || profile.email
  const details = [ROLE_LABEL[profile.role], profile.position].filter(Boolean).join(' · ')
  const stores =
    profile.role === 'admin' ? 'Todas as lojas' : profile.stores.map((s) => s.name).join(', ')

  return (
    <div className="perfil-id">
      <div className="perfil-photo">
        <Avatar className="perfil-avatar" url={profile.avatar_url} initials={profile.initials} />
        <div className="perfil-photo-actions">
          <button
            type="button"
            className="btn xs"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {upload.isPending ? 'Enviando…' : profile.avatar_url ? 'Trocar foto' : 'Enviar foto'}
          </button>
          {profile.avatar_url && (
            <button
              type="button"
              className="btn xs perfil-photo-remove"
              disabled={busy}
              onClick={() => {
                setError(null)
                remove.mutate(undefined, {
                  onSuccess: () => onDone('Foto removida.'),
                  onError: (err) => setError(errorText(err, 'Não foi possível remover a foto.')),
                })
              }}
            >
              Remover
            </button>
          )}
          <input
            ref={input}
            type="file"
            accept={AVATAR_TYPES}
            hidden
            onChange={(e) => {
              onFile(e.target.files?.[0])
              e.target.value = '' // permite escolher o mesmo arquivo de novo
            }}
          />
        </div>
      </div>
      <div className="perfil-id-text">
        <h1 className="page-title perfil-name">{name}</h1>
        <div className="perfil-role">{details}</div>
        {stores && <div className="perfil-role">{stores}</div>}
        {error && <span className="perfil-error">{error}</span>}
      </div>
    </div>
  )
}

// --- Dados pessoais ---------------------------------------------------------------------

const dadosSchema = z.object({
  first_name: z.string().trim().min(1, 'Informe o nome.').max(150),
  last_name: z.string().trim().max(150),
  phone: z.string().trim().max(30, 'Telefone longo demais.'),
  default_store_id: z.string(),
})
type DadosValues = z.infer<typeof dadosSchema>

function DadosForm({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const save = useSaveProfile()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<DadosValues>({
    resolver: zodResolver(dadosSchema),
    defaultValues: {
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone ?? '',
      default_store_id: profile.default_store_id ? String(profile.default_store_id) : '',
    },
  })

  function onSubmit(values: DadosValues) {
    setError(null)
    save.mutate(
      {
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone || null,
        default_store_id: values.default_store_id ? Number(values.default_store_id) : null,
      },
      {
        onSuccess: onSaved,
        onError: (err) => {
          if (err instanceof ApiError) {
            for (const [field, messages] of Object.entries(err.fieldErrors)) {
              if (field in dadosSchema.shape) {
                setFieldError(field as Path<DadosValues>, { message: messages.join(' ') })
              }
            }
            setError(err.message)
          } else {
            setError('Não foi possível salvar.')
          }
        },
      },
    )
  }

  const fieldError = (name: keyof DadosValues) =>
    errors[name] && (
      <span className="perfil-error" role="alert">
        {errors[name]?.message}
      </span>
    )

  return (
    <form id="perfil-dados" className="card" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2 className="card-title">Dados pessoais</h2>
      {error && <MsgNok titulo="Não foi possível salvar" mensagem={error} />}
      <div className="form-grid">
        <div className="field">
          <label htmlFor="perfil-nome">Nome</label>
          <input id="perfil-nome" autoComplete="given-name" {...register('first_name')} />
          {fieldError('first_name')}
        </div>
        <div className="field">
          <label htmlFor="perfil-sobrenome">Sobrenome</label>
          <input id="perfil-sobrenome" autoComplete="family-name" {...register('last_name')} />
          {fieldError('last_name')}
        </div>
        <div className="field">
          <label htmlFor="perfil-email">E-mail (login)</label>
          <input id="perfil-email" value={profile.email} readOnly disabled />
          <span className="perfil-hint">Para trocar o e-mail, fale com o administrador.</span>
        </div>
        <div className="field">
          <label htmlFor="perfil-cel">Celular</label>
          <input
            id="perfil-cel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(31) 9 9999-9999"
            {...register('phone')}
          />
          {fieldError('phone')}
        </div>
        {profile.stores.length > 1 && (
          <div className="field">
            <label htmlFor="perfil-loja">Loja padrão</label>
            <select id="perfil-loja" {...register('default_store_id')}>
              <option value="">Todas as lojas</option>
              {profile.stores.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="perfil-hint">O CRM já abre filtrado nesta loja.</span>
            {fieldError('default_store_id')}
          </div>
        )}
      </div>
    </form>
  )
}

// --- Senha ------------------------------------------------------------------------------

function SenhaCard() {
  const change = useChangePassword()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setDone(false)
    if (!current) return setError('Informe a senha atual.')
    if (next.length < 8) return setError('A nova senha precisa ter ao menos 8 caracteres.')
    if (next !== confirm) return setError('A confirmação não é igual à nova senha.')
    change.mutate(
      { current_password: current, new_password: next },
      {
        onSuccess: () => {
          setCurrent('')
          setNext('')
          setConfirm('')
          setDone(true)
        },
        onError: (err) => setError(errorText(err, 'Não foi possível alterar a senha.')),
      },
    )
  }

  return (
    <form className="card perfil-half perfil-senha" onSubmit={onSubmit} noValidate>
      <h2 className="card-title">Alterar senha</h2>
      {done && (
        <MsgOk
          titulo="Senha alterada"
          mensagem="As outras sessões foram encerradas."
          onClose={() => setDone(false)}
        />
      )}
      {error && (
        <MsgNok titulo="Senha não alterada" mensagem={error} onClose={() => setError(null)} />
      )}
      <div className="field">
        <label htmlFor="perfil-s0">Senha atual</label>
        <input
          id="perfil-s0"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="perfil-s1">Nova senha</label>
        <input
          id="perfil-s1"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="perfil-s2">Confirmar nova senha</label>
        <input
          id="perfil-s2"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <span className="perfil-hint">
        Mínimo de 8 caracteres, não pode ser só números, nem uma senha comum, nem parecida com o seu
        nome ou e-mail.
      </span>
      <div>
        <button type="submit" className="btn sm dark" disabled={change.isPending}>
          {change.isPending ? 'Alterando…' : 'Alterar senha'}
        </button>
      </div>
    </form>
  )
}

// --- Sessões ----------------------------------------------------------------------------

function SessoesCard() {
  const sessions = useSessions()
  const end = useEndSession()
  const [error, setError] = useState<string | null>(null)
  const others = sessions.data?.filter((s) => !s.current).length ?? 0

  function endSession(id: string) {
    setError(null)
    end.mutate(id, { onError: (err) => setError(errorText(err, 'Não foi possível encerrar.')) })
  }

  return (
    <section className="card perfil-sessoes">
      <div className="perfil-card-head">
        <h2 className="card-title">Sessões ativas</h2>
        {others > 0 && (
          <button
            type="button"
            className="btn xs"
            disabled={end.isPending}
            onClick={() => endSession('others')}
          >
            Sair das outras sessões
          </button>
        )}
      </div>
      {error && <MsgNok mensagem={error} onClose={() => setError(null)} />}
      {sessions.isPending && <p className="muted">Carregando…</p>}
      {sessions.isError && <MsgNok mensagem={sessions.error.message} />}
      {sessions.data?.map((s) => (
        <div key={s.id} className="perfil-sessao">
          <span>
            <strong>{s.device}</strong>
            {' — '}
            {s.login_at ? `entrou ${formatLastAccess(s.login_at)}` : 'entrada sem registro'}
            {s.ip && <span className="muted"> · IP {s.ip}</span>}
          </span>
          {s.current ? (
            <span className="perfil-sessao-atual">Esta sessão</span>
          ) : (
            <button
              type="button"
              className="btn xs"
              disabled={end.isPending}
              onClick={() => endSession(s.id)}
            >
              Encerrar
            </button>
          )}
        </div>
      ))}
    </section>
  )
}
