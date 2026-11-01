import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { ApiError } from '../../../lib/api'
import { type AccessKind, useAccessLink, useSetPassword } from '../../../lib/auth'
import '../redefinir_senha/redefinir_senha.css'

const COPY: Record<AccessKind, { hero: string; pitch: string; title: string; button: string }> = {
  invite: {
    hero: 'Bem-vindo ao CRM',
    pitch: 'Crie a sua senha para entrar pela primeira vez. Ela é só sua: ninguém da equipe a vê.',
    title: 'Criar senha',
    button: 'Criar senha e entrar',
  },
  reset: {
    hero: 'Nova senha',
    pitch: 'Escolha uma senha nova. A antiga deixa de valer assim que você salvar.',
    title: 'Criar nova senha',
    button: 'Salvar e entrar',
  },
}

/** Tela aberta pelo link do e-mail: primeiro acesso (invite) ou esqueci a senha (reset). */
export default function CriarSenha({ kind }: { kind: AccessKind }) {
  const { uid = '', token = '' } = useParams()
  const navigate = useNavigate()
  const link = useAccessLink(uid, token, kind)
  const setPassword = useSetPassword()
  const [password, setPasswordValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const copy = COPY[kind]

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Use ao menos 8 caracteres.')
    if (password !== confirm) return setError('As duas senhas não são iguais.')
    setPassword.mutate(
      { uid, token, kind, password },
      {
        // O backend já faz o login: vai direto para o CRM.
        onSuccess: () => navigate('/', { replace: true }),
        onError: (err) => {
          if (err instanceof ApiError) {
            setError(err.fieldErrors.password?.join(' ') ?? err.message)
          } else {
            setError('Não foi possível salvar a senha.')
          }
        },
      },
    )
  }

  return (
    <div className="auth page-redefinir-senha">
      <section className="auth-hero">
        <svg
          aria-hidden="true"
          className="auth-hero-lines"
          viewBox="0 0 600 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          stroke="#2E2824"
          strokeWidth="1.2"
        >
          <path d="M300 300c60-60 160-40 180 30s-40 140-120 130-120-100-60-160z" />
          <path d="M260 290c80-100 230-80 260 30s-60 200-170 190-170-140-90-220z" />
          <path d="M220 280c100-140 300-120 340 30s-80 260-220 250-220-180-120-280z" />
          <path d="M180 270c120-180 370-160 420 30s-100 320-270 310-270-220-150-340z" />
          <path d="M140 260c140-220 440-200 500 30s-120 380-320 370-320-260-180-400z" />
        </svg>

        <Link to="/login" className="auth-logo">
          [ INVICTUS ]
        </Link>

        <div className="auth-pitch">
          <div className="auth-bar" />
          <h1 className="redefinir-title">{copy.hero}</h1>
          <p>{copy.pitch}</p>
        </div>

        <div className="auth-foot">Meia Lua &amp; D'Barreto · Uniformes Militares</div>
      </section>

      <section className="auth-panel">
        {link.isPending && <p className="muted">Conferindo o link…</p>}

        {link.isError && (
          <div className="auth-form">
            <MsgNok titulo="Link inválido ou expirado" mensagem={link.error.message} />
            <p className="auth-note">
              {kind === 'invite'
                ? 'Peça ao administrador do CRM para reenviar o convite.'
                : 'Peça um novo link na tela de login.'}
            </p>
            <Link
              to={kind === 'invite' ? '/login' : '/redefinir-senha'}
              className="btn primary auth-submit"
            >
              {kind === 'invite' ? 'Ir para o login' : 'Pedir novo link'}
            </Link>
          </div>
        )}

        {link.data && (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-form-head">
              <h2>{copy.title}</h2>
              <p>
                {link.data.first_name ? `${link.data.first_name}, o` : 'O'} seu login é{' '}
                <strong>{link.data.email}</strong>.
              </p>
            </div>

            {error && (
              <MsgNok
                titulo="Não foi possível salvar"
                mensagem={error}
                onClose={() => setError(null)}
              />
            )}

            {/* Campo oculto para o gerenciador de senhas associar a senha ao login. */}
            <input
              type="email"
              name="username"
              autoComplete="username"
              value={link.data.email}
              readOnly
              hidden
            />

            <div className="field">
              <label htmlFor="nova-senha">Senha</label>
              <input
                id="nova-senha"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="nova-senha-conf">Repita a senha</label>
              <input
                id="nova-senha-conf"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn primary auth-submit"
              disabled={setPassword.isPending}
            >
              {setPassword.isPending ? 'Salvando…' : copy.button}
            </button>

            <div className="redefinir-rules">
              <div className="redefinir-rules-title">A senha deve ter</div>
              <div className="redefinir-rules-text">
                Mínimo de 8 caracteres · não pode ser só números · não pode ser uma senha comum ·
                não pode parecer com o seu nome ou e-mail
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
