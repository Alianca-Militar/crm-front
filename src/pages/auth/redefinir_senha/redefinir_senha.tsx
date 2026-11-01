import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'
import MsgNok from '../../../components/msg_nok/msg_nok'
import MsgOk from '../../../components/msg_ok/msg_ok'
import { ApiError } from '../../../lib/api'
import { useRequestPasswordReset } from '../../../lib/auth'
import { IconChevronLeft } from '../../../components/menu/icons'
import './redefinir_senha.css'

export default function RedefinirSenha() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRequestPasswordReset()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    // O backend responde igual exista ou não o e-mail (não revela quem é cadastrado).
    request.mutate(email.trim().toLowerCase(), {
      onSuccess: () => setSent(true),
      onError: (err) =>
        setError(
          err instanceof ApiError && err.status === 429
            ? 'Muitos pedidos seguidos. Aguarde um pouco e tente de novo.'
            : err instanceof ApiError
              ? err.message
              : 'Não foi possível enviar o link.',
        ),
    })
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
          <path d="M60 620c40-30 110-20 120 30s-50 70-100 60-60-60-20-90z" />
          <path d="M30 610c60-50 160-30 180 40s-80 110-150 90-90-90-30-130z" />
        </svg>

        <Link to="/login" className="auth-logo">
          [ INVICTUS ]
        </Link>

        <div className="auth-pitch">
          <div className="auth-bar" />
          <h1 className="redefinir-title">Recupere seu acesso</h1>
          <p>
            Enviamos um link seguro para o e-mail cadastrado. O link vale por 1 hora e só pode ser
            usado uma vez.
          </p>
        </div>

        <div className="auth-foot">Meia Lua &amp; D'Barreto · Uniformes Militares</div>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <Link to="/login" className="redefinir-back">
            <IconChevronLeft size={18} />
            Voltar para o login
          </Link>

          <div className="auth-form-head">
            <h2>Redefinir senha</h2>
            <p>
              Informe o e-mail corporativo. Se ele estiver cadastrado, você receberá as instruções.
            </p>
          </div>

          {sent && (
            <MsgOk
              titulo="Link enviado"
              mensagem="Se o e-mail estiver cadastrado, o link chega em alguns minutos. Confira também o spam."
              onClose={() => setSent(false)}
            />
          )}
          {error && (
            <MsgNok
              titulo="Não foi possível enviar"
              mensagem={error}
              onClose={() => setError(null)}
            />
          )}

          <div className="field">
            <label htmlFor="redefinir-email">E-mail</label>
            <input
              id="redefinir-email"
              type="email"
              placeholder="nome@meialuadbarreto.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn primary auth-submit" disabled={request.isPending}>
            {request.isPending ? 'Enviando…' : sent ? 'Reenviar link' : 'Enviar link'}
          </button>

          <div className="redefinir-rules">
            <div className="redefinir-rules-title">Nova senha deve ter</div>
            <div className="redefinir-rules-text">
              Mínimo de 8 caracteres · não pode ser só números · não pode ser uma senha comum · não
              pode parecer com o seu nome ou e-mail
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
