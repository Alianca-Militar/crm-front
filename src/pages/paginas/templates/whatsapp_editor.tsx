import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import MsgNok from '../../../components/msg_nok/msg_nok'
import BackLink from '../../../components/back_link/back_link'
import MsgOk from '../../../components/msg_ok/msg_ok'
import { ApiError, type FieldErrors as ApiFieldErrors } from '../../../lib/api'
import { useMe } from '../../../lib/auth'
import { formatDate } from '../../../lib/format'
import { useWhatsappNumbers } from '../../admin/canais/canais_api'
import { Counter, FieldErrors, SampleFields, TextTools, VariablesEditor } from './editor_parts'
import { MetaPayloadModal, RejectReviewModal, SubmitMetaModal } from './template_modals'
import {
  examplesOf,
  nextGeneric,
  normalizeName,
  resolveVariables,
  varKeys,
  whatsappSlots,
} from './template_utils'
import {
  type ButtonType,
  type HeaderType,
  type MessageTemplate,
  type MessageTemplateInput,
  STATUS_LABEL,
  STATUS_TONE,
  type TemplateButton,
  type TemplateCategory,
  type TemplateVariable,
  useMessageTemplate,
  useRequestReview,
  useSaveMessageTemplate,
  useTemplateChoices,
  useUploadHeaderMedia,
  useWithdrawReview,
} from './templates_api'
import WhatsappPreview from './whatsapp_preview'

type Form = {
  whatsapp_number: string
  name: string
  language: string
  category: TemplateCategory
  header_type: HeaderType
  header_content: string
  body: string
  footer: string
  buttons: TemplateButton[]
  variables: TemplateVariable[]
  add_security_recommendation: boolean
  code_expiration_minutes: string
  notes: string
}

const EMPTY: Form = {
  whatsapp_number: '',
  name: '',
  language: 'pt_BR',
  category: 'MARKETING',
  header_type: 'none',
  header_content: '',
  body: '',
  footer: '',
  buttons: [],
  variables: [],
  add_security_recommendation: true,
  code_expiration_minutes: '10',
  notes: '',
}

const MEDIA_ACCEPT: Partial<Record<HeaderType, string>> = {
  image: 'image/jpeg,image/png',
  video: 'video/mp4',
  document: 'application/pdf',
}

// Texto que a Meta monta nos templates de autenticação (igual ao backend, só para a prévia).
const AUTH_TEXTS: Record<string, [string, string, string]> = {
  pt: [
    '*{{1}}* é seu código de verificação.',
    'Para sua segurança, não o compartilhe.',
    'Este código expira em {n} minutos.',
  ],
  es: [
    'Tu código de verificación es *{{1}}*.',
    'Por tu seguridad, no lo compartas.',
    'Este código caduca en {n} minutos.',
  ],
  en: [
    '*{{1}}* is your verification code.',
    'For your security, do not share this code.',
    'This code expires in {n} minutes.',
  ],
}

function authTexts(language: string) {
  return AUTH_TEXTS[language.split('_')[0]] ?? AUTH_TEXTS.pt
}

function toForm(t: MessageTemplate): Form {
  return {
    whatsapp_number: String(t.whatsapp_number),
    name: t.name,
    language: t.language,
    category: t.category,
    header_type: t.header_type ?? 'none',
    header_content: t.header_content ?? '',
    body: t.category === 'AUTHENTICATION' ? '' : t.body,
    footer: t.category === 'AUTHENTICATION' ? '' : (t.footer ?? ''),
    buttons: t.buttons,
    variables: t.variables,
    add_security_recommendation: t.options?.add_security_recommendation ?? true,
    code_expiration_minutes:
      t.options?.code_expiration_minutes != null ? String(t.options.code_expiration_minutes) : '',
    notes: t.notes ?? '',
  }
}

function toInput(f: Form): MessageTemplateInput {
  const isAuth = f.category === 'AUTHENTICATION'
  return {
    whatsapp_number: Number(f.whatsapp_number),
    name: f.name,
    language: f.language,
    category: f.category,
    header_type: isAuth ? 'none' : f.header_type,
    header_content: f.header_type === 'text' ? f.header_content : null,
    body: f.body,
    footer: f.footer || null,
    buttons: f.buttons,
    variables: f.variables,
    options: isAuth
      ? {
          add_security_recommendation: f.add_security_recommendation,
          code_expiration_minutes: f.code_expiration_minutes
            ? Number(f.code_expiration_minutes)
            : null,
        }
      : {},
    notes: f.notes.trim() || null,
  }
}

const NEW_BUTTON: Record<Exclude<ButtonType, 'OTP'>, TemplateButton> = {
  QUICK_REPLY: { type: 'QUICK_REPLY', text: '' },
  URL: { type: 'URL', text: '', url: 'https://' },
  PHONE_NUMBER: { type: 'PHONE_NUMBER', text: '', phone_number: '+55' },
  COPY_CODE: { type: 'COPY_CODE', text: 'Copiar código', example: '' },
}

// "Cancelar marketing": resposta rápida pronta. O CRM bloqueia quem toca nela porque o texto
// está nas palavras de descadastro (Configurações).
const OPTOUT_BUTTON_TEXT = 'Parar promoções'
const OPTOUT_FOOTER = 'Não tem interesse? Toque em Parar promoções.'

/** Editor de template de WhatsApp. `id` = editar; sem id = novo. */
export default function WhatsappEditor({ id }: { id?: number }) {
  const navigate = useNavigate()
  const location = useLocation()
  const me = useMe()
  const choices = useTemplateChoices()
  const numbers = useWhatsappNumbers()
  const existing = useMessageTemplate(id ?? null)
  const save = useSaveMessageTemplate()
  const upload = useUploadHeaderMedia()
  const requestReview = useRequestReview()
  const withdraw = useWithdrawReview()
  const [submitting, setSubmitting] = useState<MessageTemplate | null>(null)
  const [rejecting, setRejecting] = useState(false)

  const [form, setForm] = useState<Form>(EMPTY)
  const [loadedId, setLoadedId] = useState<number | null>(null)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [removeMedia, setRemoveMedia] = useState(false)
  const [errors, setErrors] = useState<ApiFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(
    (location.state as { saved?: string } | null)?.saved ?? null,
  )
  const [showPayload, setShowPayload] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const headerRef = useRef<HTMLInputElement>(null)

  // Carrega o template uma vez (e de novo se a pessoa navegar para outro).
  if (existing.data && loadedId !== existing.data.id) {
    setLoadedId(existing.data.id)
    setForm(toForm(existing.data))
    setMediaFile(null)
    setRemoveMedia(false)
  }

  // Números ligados no CRM (mais o já escolhido, se tiver sido desligado depois).
  const selectable = (numbers.data ?? []).filter(
    (n) => n.active || String(n.id) === form.whatsapp_number,
  )
  // Número padrão: o único que a pessoa tem.
  const onlyNumber = selectable.length === 1 ? selectable[0] : null
  if (!id && !form.whatsapp_number && onlyNumber) {
    setForm((f) => ({ ...f, whatsapp_number: String(onlyNumber.id) }))
  }

  const localUrl = useMemo(() => (mediaFile ? URL.createObjectURL(mediaFile) : null), [mediaFile])
  useEffect(() => () => (localUrl ? URL.revokeObjectURL(localUrl) : undefined), [localUrl])

  const template = existing.data
  const role = me.data?.role
  const isAdmin = role === 'admin'
  const canWrite = isAdmin || role === 'gerente'
  const readOnly = !canWrite || (template ? !template.editable : false)
  const limits = choices.data?.limits ?? {}
  const isAuth = form.category === 'AUTHENTICATION'
  const isMedia = ['image', 'video', 'document'].includes(form.header_type)
  const slots = whatsappSlots({ ...form, header_content: form.header_content })
  const catalog = choices.data?.variables ?? []
  const variables = resolveVariables(slots, form.variables, catalog)
  const generic = nextGeneric([form.header_content, form.body, ...form.buttons.map((b) => b.url)])
  const number = numbers.data?.find((n) => String(n.id) === form.whatsapp_number)

  const sampleProps = {
    variables,
    catalog,
    disabled: readOnly,
    onChange: (v: TemplateVariable[]) => set('variables', v),
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setButton(index: number, patch: Partial<TemplateButton>) {
    set(
      'buttons',
      form.buttons.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    )
  }

  function moveButton(index: number, delta: number) {
    const list = [...form.buttons]
    const [item] = list.splice(index, 1)
    list.splice(index + delta, 0, item)
    set('buttons', list)
  }

  function count(type: ButtonType) {
    return form.buttons.filter((b) => b.type === type).length
  }

  function canAdd(type: Exclude<ButtonType, 'OTP'>) {
    if (form.buttons.length >= (limits.buttons ?? 10)) return false
    if (type === 'URL') return count('URL') < (limits.url_buttons ?? 2)
    if (type === 'PHONE_NUMBER') return count('PHONE_NUMBER') < (limits.phone_buttons ?? 1)
    if (type === 'COPY_CODE') return form.category === 'MARKETING' && count('COPY_CODE') < 1
    return true
  }

  const hasOptoutButton = form.buttons.some(
    (b) => b.type === 'QUICK_REPLY' && b.text.trim() === OPTOUT_BUTTON_TEXT,
  )

  /** Só um por template e só em Marketing. Preenche o rodapé se ele estiver vazio. */
  function addOptoutButton() {
    setForm((f) => ({
      ...f,
      buttons: [...f.buttons, { type: 'QUICK_REPLY', text: OPTOUT_BUTTON_TEXT }],
      footer: f.footer.trim() ? f.footer : OPTOUT_FOOTER,
    }))
  }

  function fail(err: unknown, fallback: string) {
    if (err instanceof ApiError) {
      setErrors(err.fieldErrors)
      setError(err.message)
    } else {
      setError(fallback)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Grava o formulário (e o arquivo do cabeçalho). Devolve o template salvo ou null. */
  async function persist(): Promise<MessageTemplate | null> {
    setError(null)
    setErrors({})
    try {
      let result = await save.mutateAsync({ id, data: toInput({ ...form, variables }) })
      if (isMedia && mediaFile) {
        result = await upload.mutateAsync({ id: result.id, file: mediaFile })
      } else if (isMedia && removeMedia && result.header_media_url) {
        result = await upload.mutateAsync({ id: result.id, file: null })
      }
      setMediaFile(null)
      setRemoveMedia(false)
      return result
    } catch (err) {
      fail(err, 'Não foi possível salvar o template.')
      return null
    }
  }

  async function onSave() {
    const result = await persist()
    if (!result) return
    if (!id) {
      navigate(`/templates/whatsapp/${result.id}`, {
        replace: true,
        state: { saved: `Template ${result.name} salvo como rascunho.` },
      })
    } else {
      setSaved('Alterações salvas.')
      setLoadedId(null) // recarrega o formulário com o que o backend gravou
    }
  }

  /** Gerente: salva e pede a aprovação de um admin. */
  async function onRequestReview() {
    const result = await persist()
    if (!result) return
    try {
      await requestReview.mutateAsync({ id: result.id, notes: form.notes.trim() || null })
      setSaved('Pedido enviado. Um admin vai aprovar ou devolver com o motivo.')
      setLoadedId(null)
    } catch (err) {
      fail(err, 'Não foi possível pedir a aprovação.')
    }
  }

  /** Admin: salva (se ainda é rascunho) e abre a confirmação do envio à Meta. */
  async function onSubmitMeta() {
    const result = readOnly ? (template ?? null) : await persist()
    if (result) setSubmitting(result)
  }

  async function onWithdraw() {
    if (!template) return
    try {
      await withdraw.mutateAsync({ id: template.id })
      setSaved('Pedido de aprovação retirado: o template voltou a ser rascunho.')
      setLoadedId(null)
    } catch (err) {
      fail(err, 'Não foi possível tirar da aprovação.')
    }
  }

  if (id && existing.isPending) return <div className="page muted">Carregando…</div>
  if (id && existing.isError) {
    return (
      <div className="page">
        <MsgNok titulo="Template não encontrado" mensagem={existing.error.message} />
        <BackLink to="/templates" label="Templates" />
      </div>
    )
  }

  const [authCode, authSecurity, authExpires] = authTexts(form.language)
  const previewBody = isAuth
    ? `${authCode}${form.add_security_recommendation ? ` ${authSecurity}` : ''}`
    : form.body
  const previewFooter = isAuth
    ? form.code_expiration_minutes
      ? authExpires.replace('{n}', form.code_expiration_minutes)
      : null
    : form.footer
  const previewButtons: TemplateButton[] = isAuth
    ? [{ type: 'OTP', text: form.buttons[0]?.text || 'Copiar código' }]
    : form.buttons
  const examples = isAuth ? { '1': '123456' } : examplesOf(variables)
  const mediaUrl = removeMedia ? null : (localUrl ?? template?.header_media_url ?? null)
  const mediaName = removeMedia ? null : (mediaFile?.name ?? template?.header_media_name ?? null)
  const busy = save.isPending || upload.isPending || requestReview.isPending || withdraw.isPending

  return (
    <div className="page page-template-editor">
      <div className="page-head">
        <div className="page-head-text">
          <BackLink to="/templates" label="Templates" />
          <h1 className="page-title">
            {template ? template.name : 'Novo template de WhatsApp'}
            {template && (
              <span className={`badge sm ${STATUS_TONE[template.status]} tpl-title-badge`}>
                {STATUS_LABEL[template.status]}
              </span>
            )}
          </h1>
          <p className="page-subtitle">
            Templates precisam da aprovação da Meta antes de serem usados em campanhas.
          </p>
        </div>
        <div className="page-actions">
          {template && (
            <button type="button" className="btn sm" onClick={() => setShowPayload(true)}>
              Ver JSON para a Meta
            </button>
          )}
          {!readOnly && (
            <button type="button" className="btn sm" disabled={busy} onClick={onSave}>
              {save.isPending || upload.isPending ? 'Salvando…' : 'Salvar rascunho'}
            </button>
          )}
          {template && canWrite && !isAdmin && template.editable && (
            <button
              type="button"
              className="btn sm primary"
              disabled={busy}
              onClick={onRequestReview}
            >
              {requestReview.isPending ? 'Enviando…' : 'Pedir aprovação'}
            </button>
          )}
          {template && canWrite && !isAdmin && template.status === 'IN_REVIEW' && (
            <button type="button" className="btn sm" disabled={busy} onClick={onWithdraw}>
              Tirar da aprovação
            </button>
          )}
          {template && isAdmin && template.status === 'IN_REVIEW' && (
            <button type="button" className="btn sm" onClick={() => setRejecting(true)}>
              Recusar
            </button>
          )}
          {template && isAdmin && (template.editable || template.status === 'IN_REVIEW') && (
            <button type="button" className="btn sm primary" disabled={busy} onClick={onSubmitMeta}>
              {template.status === 'IN_REVIEW' ? 'Aprovar e enviar à Meta' : 'Enviar para a Meta'}
            </button>
          )}
        </div>
      </div>

      {saved && <MsgOk mensagem={saved} onClose={() => setSaved(null)} />}
      {error && <MsgNok titulo="Não foi possível salvar" mensagem={error} />}
      {template?.status === 'REJECTED' && template.rejection_reason && (
        <MsgNok titulo="Rejeitado pela Meta" mensagem={template.rejection_reason} />
      )}
      {template?.status === 'DRAFT' && template.review_comment && (
        <MsgNok
          titulo={`Devolvido por ${template.reviewed_by_name ?? 'um admin'}`}
          mensagem={template.review_comment}
        />
      )}
      {template?.status === 'IN_REVIEW' ? (
        <div className="tpl-notice">
          Aguardando a aprovação de um admin
          {template.review_requested_by_name && ` (pedido por ${template.review_requested_by_name}`}
          {template.review_requested_at && ` em ${formatDate(template.review_requested_at)}`}
          {template.review_requested_by_name && ')'}. Enquanto isso o template não pode ser alterado
          {!isAdmin && ': para mudar, clique em “Tirar da aprovação”'}.
        </div>
      ) : (
        template &&
        !template.editable && (
          <div className="tpl-notice">
            Template {STATUS_LABEL[template.status].toLowerCase()} não pode ser alterado. Para mudar
            o texto, duplique-o na lista de templates e envie a nova versão para aprovação.
          </div>
        )
      )}
      {numbers.isSuccess && selectable.length === 0 && (
        <div className="tpl-notice">
          Nenhum número de WhatsApp ativo. Cadastre ou ligue um em{' '}
          <Link to="/admin/canais">Admin › Canais</Link>.
        </div>
      )}

      <div className="tpl-editor">
        <fieldset className="tpl-form" disabled={readOnly}>
          {/* Configuração */}
          <section className="card">
            <h2 className="card-title sm">Configuração</h2>
            <div className="field">
              <span className="field-label">Categoria</span>
              <div className="tpl-categories" role="radiogroup" aria-label="Categoria">
                {(choices.data?.categories ?? []).map((c) => (
                  <label
                    key={c.value}
                    className={form.category === c.value ? 'tpl-category active' : 'tpl-category'}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={c.value}
                      checked={form.category === c.value}
                      onChange={() => {
                        const category = c.value as TemplateCategory
                        setForm((f) => ({
                          ...f,
                          category,
                          // "Copiar código" só existe em Marketing.
                          buttons:
                            category === 'MARKETING'
                              ? f.buttons
                              : f.buttons.filter((b) => b.type !== 'COPY_CODE'),
                        }))
                      }}
                    />
                    <span className="tpl-category-name">{c.label}</span>
                    <span className="tpl-category-help">{c.help}</span>
                  </label>
                ))}
              </div>
              <FieldErrors messages={errors.category} />
            </div>

            <div className="form-grid tight">
              <div className="field">
                <label htmlFor="tpl-number">Número de WhatsApp</label>
                <select
                  id="tpl-number"
                  value={form.whatsapp_number}
                  onChange={(e) => set('whatsapp_number', e.target.value)}
                >
                  <option value="">Selecione</option>
                  {selectable.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.store_code} · {n.label} · {n.display_phone_number}
                      {!n.active && ' (desligado)'}
                    </option>
                  ))}
                </select>
                <FieldErrors messages={errors.whatsapp_number} />
              </div>
              <div className="field">
                <label htmlFor="tpl-lang">Idioma</label>
                <select
                  id="tpl-lang"
                  value={form.language}
                  onChange={(e) => set('language', e.target.value)}
                >
                  {(choices.data?.languages ?? []).map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label} ({l.value})
                    </option>
                  ))}
                </select>
                <span className="tpl-help muted">
                  A Meta aprova cada idioma separado. O texto precisa estar no idioma escolhido.
                </span>
                <FieldErrors messages={errors.language} />
              </div>
            </div>

            <div className="field">
              <div className="tpl-label-row">
                <label htmlFor="tpl-name">Nome</label>
                <Counter value={form.name} max={limits.name} />
              </div>
              <input
                id="tpl-name"
                className="mono"
                placeholder="promo_inverno_2026"
                value={form.name}
                onChange={(e) => set('name', normalizeName(e.target.value))}
              />
              <span className="tpl-help muted">
                Só letras minúsculas, números e _. O cliente não vê o nome.
              </span>
              <FieldErrors messages={errors.name} />
            </div>
          </section>

          {isAuth ? (
            <section className="card">
              <h2 className="card-title sm">Código de verificação</h2>
              <p className="muted tpl-help">
                Em templates de autenticação a Meta define o texto. O código ({'{{1}}'}) é
                preenchido no envio.
              </p>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.add_security_recommendation}
                  onChange={(e) => set('add_security_recommendation', e.target.checked)}
                />
                Adicionar aviso de segurança (“{authSecurity}”)
              </label>
              <div className="form-grid tight">
                <div className="field">
                  <label htmlFor="tpl-exp">Validade do código (minutos)</label>
                  <input
                    id="tpl-exp"
                    type="number"
                    min={limits.code_expiration_min ?? 1}
                    max={limits.code_expiration_max ?? 90}
                    placeholder="Sem validade no texto"
                    value={form.code_expiration_minutes}
                    onChange={(e) => set('code_expiration_minutes', e.target.value)}
                  />
                  <FieldErrors messages={errors.options} />
                </div>
                <div className="field">
                  <label htmlFor="tpl-otp">Texto do botão</label>
                  <input
                    id="tpl-otp"
                    maxLength={limits.button_text}
                    placeholder="Copiar código"
                    value={form.buttons[0]?.text ?? ''}
                    onChange={(e) => set('buttons', [{ type: 'OTP', text: e.target.value }])}
                  />
                  <FieldErrors messages={errors.buttons} />
                </div>
              </div>
            </section>
          ) : (
            <>
              {/* Cabeçalho */}
              <section className="card">
                <div className="card-head">
                  <h2 className="card-title sm">Cabeçalho</h2>
                  <span className="muted tpl-optional">Opcional</span>
                </div>
                <div className="field">
                  <label htmlFor="tpl-header-type">Tipo</label>
                  <select
                    id="tpl-header-type"
                    value={form.header_type}
                    onChange={(e) => {
                      set('header_type', e.target.value as HeaderType)
                      setMediaFile(null)
                    }}
                  >
                    {(choices.data?.header_types ?? []).map((h) => (
                      <option key={h.value} value={h.value}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                  <FieldErrors messages={errors.header_type} />
                </div>

                {form.header_type === 'text' && (
                  <div className="field">
                    <div className="tpl-label-row">
                      <label htmlFor="tpl-header">Texto do cabeçalho</label>
                      <Counter value={form.header_content} max={limits.header_text} />
                    </div>
                    <input
                      id="tpl-header"
                      ref={headerRef}
                      placeholder="Novidades da semana"
                      value={form.header_content}
                      onChange={(e) => set('header_content', e.target.value)}
                    />
                    <TextTools
                      field={headerRef}
                      formatting={false}
                      variables={catalog}
                      generic={generic}
                      canAddVar={!/\{\{/.test(form.header_content)}
                      disabled={readOnly}
                      onChange={(v) => set('header_content', v)}
                    />
                    <span className="tpl-help muted">
                      Até 1 variável. Sem emoji nem formatação.
                    </span>
                    <FieldErrors messages={errors.header_content} />
                    <SampleFields
                      {...sampleProps}
                      title="Exemplo de conteúdo do cabeçalho"
                      keys={varKeys(form.header_content)}
                      idPrefix="tpl-sample-header"
                    />
                  </div>
                )}

                {isMedia && (
                  <div className="field">
                    <span className="field-label">Arquivo de exemplo</span>
                    <div className="tpl-media">
                      {mediaName ? (
                        <span className="tpl-media-name">{mediaName}</span>
                      ) : (
                        <span className="muted">Nenhum arquivo</span>
                      )}
                      <label className="btn xs">
                        {mediaName ? 'Trocar' : 'Escolher arquivo'}
                        <input
                          type="file"
                          className="sr-only"
                          accept={MEDIA_ACCEPT[form.header_type]}
                          onChange={(e) => {
                            setMediaFile(e.target.files?.[0] ?? null)
                            setRemoveMedia(false)
                            e.target.value = ''
                          }}
                        />
                      </label>
                      {mediaName && (
                        <button
                          type="button"
                          className="btn xs"
                          onClick={() => {
                            setMediaFile(null)
                            setRemoveMedia(true)
                          }}
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <span className="tpl-help muted">
                      {choices.data?.media[form.header_type]}. A Meta usa o exemplo só para aprovar;
                      o arquivo de cada campanha é escolhido no disparo.
                    </span>
                  </div>
                )}

                {form.header_type === 'location' && (
                  <p className="muted tpl-help">
                    A localização (endereço da loja) é enviada junto com a mensagem, no disparo.
                  </p>
                )}
              </section>

              {/* Corpo */}
              <section className="card">
                <div className="card-head">
                  <h2 className="card-title sm">Corpo da mensagem</h2>
                  <Counter value={form.body} max={limits.body} />
                </div>
                <TextTools
                  field={bodyRef}
                  variables={catalog}
                  generic={generic}
                  disabled={readOnly}
                  onChange={(v) => set('body', v)}
                />
                <textarea
                  ref={bodyRef}
                  aria-label="Corpo da mensagem"
                  rows={7}
                  placeholder={'Olá {{nome-cliente}}! A nova coleção chegou na {{nome-loja}}.'}
                  value={form.body}
                  onChange={(e) => set('body', e.target.value)}
                />
                <FieldErrors messages={errors.body} />
                <SampleFields
                  {...sampleProps}
                  title="Exemplo de conteúdo do corpo"
                  keys={varKeys(form.body)}
                  idPrefix="tpl-sample-body"
                />
              </section>

              {/* Rodapé */}
              <section className="card">
                <div className="card-head">
                  <h2 className="card-title sm">Rodapé</h2>
                  <span className="muted tpl-optional">Opcional</span>
                </div>
                <div className="field">
                  <div className="tpl-label-row">
                    <label htmlFor="tpl-footer">Texto do rodapé</label>
                    <Counter value={form.footer} max={limits.footer} />
                  </div>
                  <input
                    id="tpl-footer"
                    placeholder="Responda SAIR para não receber ofertas"
                    value={form.footer}
                    onChange={(e) => set('footer', e.target.value)}
                  />
                  <FieldErrors messages={errors.footer} />
                </div>
              </section>

              {/* Botões */}
              <section className="card">
                <div className="card-head">
                  <h2 className="card-title sm">Botões</h2>
                  <span className="muted tpl-optional">
                    {form.buttons.length}/{limits.buttons ?? 10} · opcional
                  </span>
                </div>
                {form.buttons.map((b, i) => (
                  <div key={i} className="tpl-button-row">
                    <div className="tpl-button-head">
                      <span className="tpl-button-type">
                        {choices.data?.button_types.find((t) => t.value === b.type)?.label}
                      </span>
                      <div className="tpl-button-actions">
                        <button
                          type="button"
                          className="btn xs"
                          aria-label="Subir botão"
                          disabled={i === 0}
                          onClick={() => moveButton(i, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn xs"
                          aria-label="Descer botão"
                          disabled={i === form.buttons.length - 1}
                          onClick={() => moveButton(i, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn xs"
                          onClick={() =>
                            set(
                              'buttons',
                              form.buttons.filter((_, j) => j !== i),
                            )
                          }
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                    <div className="form-grid tight">
                      {b.type === 'COPY_CODE' ? (
                        <div className="field">
                          <label htmlFor={`tpl-b${i}-code`}>Código de exemplo</label>
                          <input
                            id={`tpl-b${i}-code`}
                            className="mono"
                            maxLength={limits.copy_code}
                            placeholder="PROMO10"
                            value={b.example ?? ''}
                            onChange={(e) => setButton(i, { example: e.target.value })}
                          />
                        </div>
                      ) : (
                        <div className="field">
                          <div className="tpl-label-row">
                            <label htmlFor={`tpl-b${i}-text`}>Texto do botão</label>
                            <Counter value={b.text} max={limits.button_text} />
                          </div>
                          <input
                            id={`tpl-b${i}-text`}
                            value={b.text}
                            onChange={(e) => setButton(i, { text: e.target.value })}
                          />
                        </div>
                      )}
                      {b.type === 'URL' && (
                        <div className="field">
                          <label htmlFor={`tpl-b${i}-url`}>Endereço do site</label>
                          <input
                            id={`tpl-b${i}-url`}
                            inputMode="url"
                            value={b.url ?? ''}
                            onChange={(e) => setButton(i, { url: e.target.value })}
                          />
                          <span className="tpl-help muted">
                            Pode terminar com uma variável para mudar o fim do link, ex.:{' '}
                            {'https://site.com.br/{{cupom}}'}
                          </span>
                          <SampleFields
                            {...sampleProps}
                            title="Exemplo do link"
                            keys={varKeys(b.url).slice(0, 1)}
                            idPrefix={`tpl-sample-b${i}`}
                          />
                        </div>
                      )}
                      {b.type === 'PHONE_NUMBER' && (
                        <div className="field">
                          <label htmlFor={`tpl-b${i}-phone`}>Telefone</label>
                          <input
                            id={`tpl-b${i}-phone`}
                            inputMode="tel"
                            value={b.phone_number ?? ''}
                            onChange={(e) => setButton(i, { phone_number: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div className="tpl-add-buttons">
                  {(Object.keys(NEW_BUTTON) as Exclude<ButtonType, 'OTP'>[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      className="btn xs"
                      disabled={!canAdd(type)}
                      onClick={() => set('buttons', [...form.buttons, { ...NEW_BUTTON[type] }])}
                    >
                      + {choices.data?.button_types.find((t) => t.value === type)?.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn xs"
                    disabled={
                      form.category !== 'MARKETING' || hasOptoutButton || !canAdd('QUICK_REPLY')
                    }
                    onClick={addOptoutButton}
                  >
                    + Cancelar marketing
                  </button>
                </div>
                <span className="tpl-help muted">
                  Até 10 botões: respostas rápidas juntas, até 2 “Acessar site” e 1 “Ligar”. “Copiar
                  código” (cupom) e “Cancelar marketing” só em Marketing. “Cancelar marketing” cria
                  a resposta rápida “{OPTOUT_BUTTON_TEXT}” e, se o rodapé estiver vazio, preenche
                  com “{OPTOUT_FOOTER}”.
                </span>
                <FieldErrors messages={errors.buttons} />
              </section>

              {/* Variáveis */}
              <section className="card">
                <h2 className="card-title sm">Variáveis: de onde vêm os valores</h2>
                <VariablesEditor
                  showExample={false}
                  variables={variables}
                  catalog={catalog}
                  origins={choices.data?.origins ?? {}}
                  disabled={readOnly}
                  errors={errors.variables}
                  onChange={(v) => set('variables', v)}
                />
              </section>
            </>
          )}

          {/* Observação interna */}
          <section className="card">
            <h2 className="card-title sm">Observação para quem aprova</h2>
            <div className="field">
              <label htmlFor="tpl-notes" className="sr-only">
                Observação para quem aprova
              </label>
              <textarea
                id="tpl-notes"
                rows={3}
                maxLength={2000}
                placeholder="Ex.: para qual campanha é, público, data de início…"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
              <span className="tpl-help muted">Fica só no CRM: não vai para a Meta.</span>
            </div>
          </section>

          {template && template.missing.length > 0 && (
            <section className="card tpl-missing">
              <h2 className="card-title sm">Falta para enviar à Meta</h2>
              <ul>
                {template.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </section>
          )}
        </fieldset>

        <aside className="tpl-preview">
          <div className="tpl-preview-sticky">
            <h2 className="card-title sm">Prévia</h2>
            <WhatsappPreview
              headerType={isAuth ? 'none' : form.header_type}
              headerText={form.header_content}
              mediaUrl={mediaUrl}
              mediaName={mediaName}
              body={previewBody}
              footer={previewFooter}
              buttons={previewButtons}
              examples={examples}
              sender={number?.display_name || number?.label}
            />
            <p className="muted tpl-help">
              As variáveis aparecem com o exemplo. Na campanha, cada cliente recebe os próprios
              dados.
            </p>
          </div>
        </aside>
      </div>

      {showPayload && template && (
        <MetaPayloadModal id={template.id} onClose={() => setShowPayload(false)} />
      )}
      {submitting && (
        <SubmitMetaModal
          template={submitting}
          onClose={() => {
            setSubmitting(null)
            setLoadedId(null)
          }}
          onDone={(t) => {
            setSubmitting(null)
            setLoadedId(null)
            setSaved(`Enviado para a Meta: ${STATUS_LABEL[t.status].toLowerCase()}.`)
          }}
        />
      )}
      {rejecting && template && (
        <RejectReviewModal
          template={template}
          onClose={() => setRejecting(false)}
          onDone={() => {
            setRejecting(false)
            setLoadedId(null)
            setSaved('Template devolvido para o rascunho com o motivo.')
          }}
        />
      )}
    </div>
  )
}
