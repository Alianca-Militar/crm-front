import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { ApiError } from '../../../lib/api'
import { useLogin } from '../../../lib/auth'
import './login.css'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSignedIn, setKeepSignedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Volta para a tela que a pessoa tentou abrir antes do login.
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => navigate(from, { replace: true }),
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : 'Não foi possível entrar.'),
      },
    )
  }

  return (
    <div className="auth page-login">
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
          <path d="M120 380c40-90 170-120 240-60s60 170-30 210-250-40-210-150z" />
          <path d="M80 380c50-130 220-170 320-80s80 230-40 280-330-60-280-200z" />
          <path d="M40 390c60-170 280-220 400-100s100 290-50 350-410-80-350-250z" />
          <path d="M0 400c70-210 340-270 480-120s120 350-60 420-490-100-420-300z" />
          <path d="M-40 410c80-250 400-320 560-140s140 410-70 490-570-120-490-350z" />
          <path d="M200 380c20-40 90-50 120-20s20 80-20 90-120-20-100-70z" />
          <path d="M420 90c40-30 110-10 120 40s-50 80-100 60-60-70-20-100z" />
          <path d="M390 80c60-50 160-20 180 60s-80 120-150 90-90-110-30-150z" />
          <path d="M-20 720c120-60 260-20 380 40s260 40 300 10" />
          <path d="M-20 760c120-60 260-20 380 40s260 40 300 10" />
        </svg>

        <div className="auth-brand">
          <span className="auth-logo">[ INVICTUS ]</span>
          <span className="auth-tagline">Meia Lua &amp; D'Barreto · Uniformes Militares</span>
        </div>

        <div className="auth-pitch">
          <div className="auth-bar" />
          <h1>
            Relacionamento
            <br />
            com quem veste a farda.
          </h1>
          <p>
            CRM das lojas Invictus Juiz de Fora e Belo Horizonte. Campanhas, clientes, conversas e
            resultados em um só lugar.
          </p>
        </div>

        <div className="auth-foot">Confecções · desde 1997</div>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-head">
            <div className="auth-eyebrow">Acesso restrito</div>
            <h2>Entrar no CRM</h2>
            <p>Use o e-mail corporativo cadastrado pela administração.</p>
          </div>

          {error && (
            <MsgNok
              titulo="Não foi possível entrar"
              mensagem={error}
              onClose={() => setError(null)}
            />
          )}

          <div className="field">
            <label htmlFor="login-email">E-mail</label>
            <input
              id="login-email"
              type="email"
              placeholder="nome@meialuadbarreto.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <div className="login-password-head">
              <label htmlFor="login-senha">Senha</label>
              <Link to="/redefinir-senha" className="login-forgot">
                Esqueci minha senha
              </Link>
            </div>
            <input
              id="login-senha"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
            />
            Manter conectado neste dispositivo
          </label>

          <button type="submit" className="btn primary auth-submit" disabled={login.isPending}>
            {login.isPending ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="auth-note">
            Ao entrar você concorda com a política de uso de dados de clientes (LGPD). Problemas de
            acesso? Fale com o administrador da sua loja.
          </p>
        </form>
      </section>
    </div>
  )
}
