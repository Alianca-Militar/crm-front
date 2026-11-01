import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { type Path, useForm } from 'react-hook-form'
import { z } from 'zod'
import MsgNok from '../../../components/msg_nok/msg_nok'
import MsgOk from '../../../components/msg_ok/msg_ok'
import { ApiError } from '../../../lib/api'
import { useMe } from '../../../lib/auth'
import { type Setting, useSaveSettings, useSettings } from './configuracoes_api'
import './configuracoes.css'

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

const int = (min: number, max: number) =>
  z
    .number({ error: 'Informe um número.' })
    .int('Use um número inteiro.')
    .min(min, `Mínimo ${min}.`)
    .max(max, `Máximo ${max}.`)

const schema = z
  .object({
    timezone: z.string().min(1),
    send_window_start: z.string().regex(HHMM, 'Use HH:MM.'),
    send_window_end: z.string().regex(HHMM, 'Use HH:MM.'),
    max_marketing_per_week: int(0, 14),
    voucher_validity_days: int(1, 365),
    skip_sundays_holidays: z.boolean(),
    attribution_window_days: int(1, 90),
    campaign_close_after_days: int(1, 365),
    consent_text: z.string().trim().min(1, 'Informe o texto de consentimento.'),
    optout_keywords: z
      .string()
      .refine((v) => splitKeywords(v).length > 0, 'Informe ao menos uma palavra.'),
    anonymize_inactive_after_months: int(1, 120),
    mask_data_for_seller: z.boolean(),
    conversation_timeout_hours: int(1, 168),
    pegasus_import_alert_hour: z.string().regex(HHMM, 'Use HH:MM.'),
  })
  .refine((v) => v.send_window_start < v.send_window_end, {
    path: ['send_window_end'],
    message: 'O fim precisa ser depois do início.',
  })

type FormValues = z.infer<typeof schema>
type Key = keyof FormValues

function splitKeywords(text: string): string[] {
  return text
    .split(',')
    .map((w) => w.trim().toUpperCase())
    .filter(Boolean)
}

/** Linhas da API → valores do formulário. */
function toForm(rows: Setting[]): FormValues {
  const v = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>
  return {
    timezone: String(v.timezone ?? 'America/Sao_Paulo'),
    send_window_start: String(v.send_window_start ?? ''),
    send_window_end: String(v.send_window_end ?? ''),
    max_marketing_per_week: Number(v.max_marketing_per_week),
    voucher_validity_days: Number(v.voucher_validity_days),
    skip_sundays_holidays: Boolean(v.skip_sundays_holidays),
    attribution_window_days: Number(v.attribution_window_days),
    campaign_close_after_days: Number(v.campaign_close_after_days),
    consent_text: String(v.consent_text ?? ''),
    optout_keywords: Array.isArray(v.optout_keywords) ? v.optout_keywords.join(', ') : '',
    anonymize_inactive_after_months: Number(v.anonymize_inactive_after_months),
    mask_data_for_seller: Boolean(v.mask_data_for_seller),
    conversation_timeout_hours: Number(v.conversation_timeout_hours),
    pegasus_import_alert_hour: String(v.pegasus_import_alert_hour ?? ''),
  }
}

/** Valores do formulário → valores gravados no banco. */
function toApi(values: FormValues): Record<Key, unknown> {
  return {
    ...values,
    consent_text: values.consent_text.trim(),
    optout_keywords: splitKeywords(values.optout_keywords),
  }
}

const VOUCHER_OPTIONS = [30, 60, 90]
const ANONYMIZE_OPTIONS = [24, 36, 60]
const SEGURANCA = [
  'Exigir verificação em duas etapas para Administradores e Gerentes',
  'Bloquear usuário após 5 tentativas de login',
  'Permitir acesso somente das redes das lojas',
]

/** Garante que o valor salvo apareça no select mesmo fora das opções padrão. */
function withCurrent(options: number[], current: number) {
  return Number.isFinite(current) && !options.includes(current)
    ? [...options, current].sort((a, b) => a - b)
    : options
}

export default function Configuracoes() {
  const me = useMe()
  const settings = useSettings()

  if (settings.isPending) return <p className="muted">Carregando configurações…</p>
  if (settings.isError) {
    return (
      <MsgNok
        titulo="Não foi possível carregar as configurações"
        mensagem={settings.error.message}
      />
    )
  }
  return <ConfiguracoesForm rows={settings.data} canEdit={me.data?.role === 'admin'} />
}

function ConfiguracoesForm({ rows, canEdit }: { rows: Setting[]; canEdit: boolean }) {
  const save = useSaveSettings()
  const [salvo, setSalvo] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const initial = toForm(rows)
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: initial })

  function onSubmit(values: FormValues) {
    setSalvo(null)
    setErro(null)
    const before = toApi(initial)
    const after = toApi(values)
    // Só manda o que mudou.
    const changed = Object.fromEntries(
      (Object.keys(after) as Key[])
        .filter((k) => JSON.stringify(after[k]) !== JSON.stringify(before[k]))
        .map((k) => [k, after[k]]),
    )
    if (Object.keys(changed).length === 0) {
      setSalvo('Nenhuma alteração para salvar.')
      return
    }
    save.mutate(changed, {
      onSuccess: (newRows) => {
        reset(toForm(newRows))
        setSalvo('As novas regras valem para os próximos envios.')
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          for (const [key, messages] of Object.entries(err.fieldErrors)) {
            if (key in getValues()) setError(key as Path<FormValues>, { message: messages[0] })
          }
          setErro(err.message)
        } else {
          setErro('Não foi possível salvar as configurações.')
        }
      },
    })
  }

  const fieldError = (name: Key) =>
    errors[name] && (
      <span className="cfg-error" role="alert">
        {errors[name]?.message}
      </span>
    )

  const num = (name: Key) => register(name, { valueAsNumber: true })

  return (
    <form className="page narrow page-configuracoes" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="page-head">
        <h1 className="page-title">Configurações</h1>
        {canEdit && (
          <button
            type="submit"
            className="btn primary"
            disabled={save.isPending || !isDirty}
            title={!isDirty ? 'Nenhuma alteração' : undefined}
          >
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        )}
      </div>

      {!canEdit && <p className="muted">Somente o perfil Admin pode alterar as configurações.</p>}
      {salvo && (
        <MsgOk titulo="Configurações salvas" mensagem={salvo} onClose={() => setSalvo(null)} />
      )}
      {erro && (
        <MsgNok titulo="Não foi possível salvar" mensagem={erro} onClose={() => setErro(null)} />
      )}

      <fieldset className="cfg-fieldset" disabled={!canEdit}>
        <section className="card">
          <h2 className="card-title">Geral</h2>
          <div className="form-grid tight">
            <div className="field">
              <label htmlFor="cfg-fz">Fuso horário</label>
              <select id="cfg-fz" {...register('timezone')}>
                <option value="America/Sao_Paulo">America/Sao_Paulo (UTC−3)</option>
              </select>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Envios e campanhas</h2>
          <div className="form-grid tight">
            <div className="field">
              <label htmlFor="cfg-j1">Enviar a partir de</label>
              <input id="cfg-j1" type="time" {...register('send_window_start')} />
              {fieldError('send_window_start')}
            </div>
            <div className="field">
              <label htmlFor="cfg-j2">Até</label>
              <input id="cfg-j2" type="time" {...register('send_window_end')} />
              {fieldError('send_window_end')}
            </div>
            <div className="field">
              <label htmlFor="cfg-lim">Máx. mensagens por cliente / semana</label>
              <input
                id="cfg-lim"
                type="number"
                min={0}
                max={14}
                {...num('max_marketing_per_week')}
              />
              {fieldError('max_marketing_per_week')}
            </div>
            <div className="field">
              <label htmlFor="cfg-vd">Validade padrão de voucher</label>
              <select id="cfg-vd" {...num('voucher_validity_days')}>
                {withCurrent(VOUCHER_OPTIONS, initial.voucher_validity_days).map((d) => (
                  <option key={d} value={d}>
                    {d} dias
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cfg-attr">Janela de atribuição (dias)</label>
              <input
                id="cfg-attr"
                type="number"
                min={1}
                max={90}
                {...num('attribution_window_days')}
              />
              {fieldError('attribution_window_days')}
            </div>
            <div className="field">
              <label htmlFor="cfg-close">Fechar resultado da campanha após (dias)</label>
              <input
                id="cfg-close"
                type="number"
                min={1}
                max={365}
                {...num('campaign_close_after_days')}
              />
              {fieldError('campaign_close_after_days')}
            </div>
          </div>
          <label className="check">
            <input type="checkbox" {...register('skip_sundays_holidays')} />
            Não enviar campanhas aos domingos e feriados
          </label>
        </section>

        <section className="card">
          <h2 className="card-title">Privacidade (LGPD)</h2>
          <div className="field">
            <label htmlFor="cfg-tc">Texto de consentimento exibido nos formulários</label>
            <textarea id="cfg-tc" rows={3} {...register('consent_text')} />
            {fieldError('consent_text')}
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="cfg-op">Palavras de descadastro no WhatsApp</label>
              <input id="cfg-op" placeholder="SAIR, PARAR" {...register('optout_keywords')} />
              <span className="cfg-hint">Separe por vírgula.</span>
              {fieldError('optout_keywords')}
            </div>
            <div className="field">
              <label htmlFor="cfg-ret">Anonimizar clientes inativos após</label>
              <select id="cfg-ret" {...num('anonymize_inactive_after_months')}>
                {withCurrent(ANONYMIZE_OPTIONS, initial.anonymize_inactive_after_months).map(
                  (m) => (
                    <option key={m} value={m}>
                      {m} meses
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
          <label className="check">
            <input type="checkbox" {...register('mask_data_for_seller')} />
            Mascarar CPF e telefone para o perfil Vendedor
          </label>
        </section>

        <section className="card">
          <h2 className="card-title">Operação</h2>
          <div className="form-grid tight">
            <div className="field">
              <label htmlFor="cfg-conv">Nova conversa após (horas sem mensagem)</label>
              <input
                id="cfg-conv"
                type="number"
                min={1}
                max={168}
                {...num('conversation_timeout_hours')}
              />
              {fieldError('conversation_timeout_hours')}
            </div>
            <div className="field">
              <label htmlFor="cfg-peg">Alertar se a carga do Pegasus não chegar até</label>
              <input id="cfg-peg" type="time" {...register('pegasus_import_alert_hour')} />
              {fieldError('pegasus_import_alert_hour')}
            </div>
          </div>
        </section>
      </fieldset>

      <section className="card configuracoes-seguranca">
        <div className="cfg-section-head">
          <h2 className="card-title">Segurança</h2>
          <span className="badge tone-gray">Em breve</span>
        </div>
        {SEGURANCA.map((label) => (
          <label key={label} className="check">
            <input type="checkbox" disabled />
            {label}
          </label>
        ))}
      </section>
    </form>
  )
}
