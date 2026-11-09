import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import MsgNok from '../../../components/msg_nok/msg_nok'
import BackLink from '../../../components/back_link/back_link'
import MsgOk from '../../../components/msg_ok/msg_ok'
import { ApiError, type FieldErrors as ApiFieldErrors } from '../../../lib/api'
import { useMe } from '../../../lib/auth'
import { Counter, FieldErrors, TextTools, VariablesEditor } from './editor_parts'
import EmailPreview from './email_preview'
import {
  emailSlots,
  examplesOf,
  htmlToText,
  nextGeneric,
  resolveVariables,
  textToHtml,
} from './template_utils'
import {
  EMAIL_CATEGORY_LABEL,
  EMAIL_STATUS_LABEL,
  EMAIL_STATUS_TONE,
  type EmailBodyFormat,
  type EmailCategory,
  type EmailHeaderType,
  type EmailStatus,
  type EmailTemplate,
  type EmailTemplateInput,
  type TemplateVariable,
  useEmailTemplate,
  useSaveEmailTemplate,
  useSendEmailTest,
  useTemplateChoices,
} from './templates_api'

// Mesmos limites do backend (campaigns/email_templates_api.py).
const LIMITS = {
  name: 120,
  subject: 150,
  preheader: 150,
  header_text: 150,
  body: 20000,
  body_html: 200000,
  button_text: 40,
  footer: 1000,
}

type Form = {
  store: string
  name: string
  category: EmailCategory
  status: EmailStatus
  subject: string
  preheader: string
  header_type: EmailHeaderType
  header_content: string
  body: string
  body_format: EmailBodyFormat
  button_text: string
  button_url: string
  footer: string
  variables: TemplateVariable[]
}

const EMPTY: Form = {
  store: '',
  name: '',
  category: 'marketing',
  status: 'draft',
  subject: '',
  preheader: '',
  header_type: 'none',
  header_content: '',
  body: '',
  body_format: 'text',
  button_text: '',
  button_url: '',
  footer: '',
  variables: [],
}

function toForm(t: EmailTemplate): Form {
  return {
    store: t.store ? String(t.store) : '',
    name: t.name,
    category: t.category,
    status: t.status,
    subject: t.subject,
    preheader: t.preheader ?? '',
    header_type: t.header_type,
    header_content: t.header_content ?? '',
    body: t.body,
    body_format: t.body_format,
    button_text: t.button_text ?? '',
    button_url: t.button_url ?? '',
    footer: t.footer ?? '',
    variables: t.variables,
  }
}

function toInput(f: Form): EmailTemplateInput {
  return {
    ...f,
    store: f.store ? Number(f.store) : null,
    preheader: f.preheader || null,
    header_content: f.header_type === 'none' ? null : f.header_content,
    button_text: f.button_text || null,
    button_url: f.button_url || null,
    footer: f.footer || null,
  }
}

const HEADER_OPTIONS: { value: EmailHeaderType; label: string }[] = [
  { value: 'none', label: 'Nenhum' },
  { value: 'text', label: 'Título' },
  { value: 'image', label: 'Imagem' },
]

/** Editor de template de e-mail. `id` = editar; sem id = novo. */
export default function EmailEditor({ id }: { id?: number }) {
  const navigate = useNavigate()
  const location = useLocation()
  const me = useMe()
  const choices = useTemplateChoices()
  const existing = useEmailTemplate(id ?? null)
  const save = useSaveEmailTemplate()
  const sendTest = useSendEmailTest()

  const [form, setForm] = useState<Form>(EMPTY)
  const [loadedId, setLoadedId] = useState<number | null>(null)
  const [errors, setErrors] = useState<ApiFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(
    (location.state as { saved?: string } | null)?.saved ?? null,
  )
  const subjectRef = useRef<HTMLInputElement>(null)
  const preheaderRef = useRef<HTMLInputElement>(null)
  const headerRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const urlRef = useRef<HTMLInputElement>(null)

  const role = me.data?.role
  const isAdmin = role === 'admin'
  const canWrite = isAdmin || role === 'gerente'
  const stores = me.data?.stores ?? []

  if (existing.data && loadedId !== existing.data.id) {
    setLoadedId(existing.data.id)
    setForm(toForm(existing.data))
  }
  // Gerente não cria para "todas as lojas": começa na primeira loja dele.
  if (!id && !isAdmin && !form.store && stores.length > 0) {
    setForm((f) => ({ ...f, store: String(stores[0].id) }))
  }

  const template = existing.data
  const readOnly = !canWrite || (!isAdmin && template !== undefined && template.store === null)
  const slots = emailSlots([
    form.subject,
    form.preheader,
    form.header_type === 'text' ? form.header_content : '',
    form.body,
    form.button_url,
  ])
  const catalog = choices.data?.variables ?? []
  const variables = resolveVariables(slots, form.variables, catalog)
  const generic = nextGeneric([
    form.subject,
    form.preheader,
    form.header_content,
    form.body,
    form.button_url,
  ])

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Ao trocar o formato, converte o que já foi escrito.
  function setBodyFormat(format: EmailBodyFormat) {
    if (format === form.body_format) return
    setForm((f) => ({
      ...f,
      body_format: format,
      body: format === 'html' ? textToHtml(f.body) : htmlToText(f.body),
    }))
  }

  const isHtml = form.body_format === 'html'

  async function onSave() {
    setError(null)
    setErrors({})
    try {
      const result = await save.mutateAsync({ id, data: toInput({ ...form, variables }) })
      if (!id) {
        navigate(`/templates/email/${result.id}`, {
          replace: true,
          state: { saved: `Template ${result.name} salvo.` },
        })
      } else {
        setSaved('Alterações salvas.')
        setLoadedId(null)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors)
        setError(err.message)
      } else {
        setError('Não foi possível salvar o template.')
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function onSendTest() {
    if (!id) return
    setError(null)
    sendTest.mutate(id, {
      onSuccess: (r) => setSaved(`Teste enviado para ${r.to}.`),
      onError: (err) => setError(err.message),
    })
  }

  if (id && existing.isPending) return <div className="page muted">Carregando…</div>
  if (id && existing.isError) {
    return (
      <div className="page">
        <MsgNok titulo="Template não encontrado" mensagem={existing.error.message} />
        <BackLink to="/templates?canal=email" label="Templates" />
      </div>
    )
  }

  const storeName = stores.find((s) => String(s.id) === form.store)?.name

  return (
    <div className="page page-template-editor">
      <div className="page-head">
        <div className="page-head-text">
          <BackLink to="/templates?canal=email" label="Templates" />
          <h1 className="page-title">
            {template ? template.name : 'Novo template de e-mail'}
            {template && (
              <span className={`badge sm ${EMAIL_STATUS_TONE[template.status]} tpl-title-badge`}>
                {EMAIL_STATUS_LABEL[template.status]}
              </span>
            )}
          </h1>
          <p className="page-subtitle">
            Modelos de e-mail para campanhas e avisos. Salve antes de enviar um teste.
          </p>
        </div>
        <div className="page-actions">
          {template && (
            <button
              type="button"
              className="btn sm"
              disabled={sendTest.isPending}
              title="Envia para o seu e-mail, com os valores de exemplo"
              onClick={onSendTest}
            >
              {sendTest.isPending ? 'Enviando…' : 'Enviar teste para mim'}
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              className="btn sm primary"
              disabled={save.isPending}
              onClick={onSave}
            >
              {save.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          )}
        </div>
      </div>

      {saved && <MsgOk mensagem={saved} onClose={() => setSaved(null)} />}
      {error && <MsgNok titulo="Não foi possível concluir" mensagem={error} />}

      <div className="tpl-editor">
        <fieldset className="tpl-form" disabled={readOnly}>
          <section className="card">
            <h2 className="card-title sm">Configuração</h2>
            <div className="form-grid tighter">
              <div className="field">
                <label htmlFor="em-category">Categoria</label>
                <select
                  id="em-category"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value as EmailCategory)}
                >
                  {(Object.keys(EMAIL_CATEGORY_LABEL) as EmailCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {EMAIL_CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
                <FieldErrors messages={errors.category} />
              </div>
              <div className="field">
                <label htmlFor="em-store">Loja</label>
                <select
                  id="em-store"
                  value={form.store}
                  onChange={(e) => set('store', e.target.value)}
                >
                  {isAdmin && <option value="">Todas as lojas</option>}
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </select>
                <FieldErrors messages={errors.store} />
              </div>
              <div className="field">
                <label htmlFor="em-status">Status</label>
                <select
                  id="em-status"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value as EmailStatus)}
                >
                  {(Object.keys(EMAIL_STATUS_LABEL) as EmailStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {EMAIL_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <FieldErrors messages={errors.status} />
              </div>
            </div>
            <div className="field">
              <div className="tpl-label-row">
                <label htmlFor="em-name">Nome</label>
                <Counter value={form.name} max={LIMITS.name} />
              </div>
              <input
                id="em-name"
                placeholder="Reativação de clientes"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
              <span className="tpl-help muted">Só para identificar no CRM. O cliente não vê.</span>
              <FieldErrors messages={errors.name} />
            </div>
          </section>

          <section className="card">
            <h2 className="card-title sm">Caixa de entrada</h2>
            <div className="field">
              <div className="tpl-label-row">
                <label htmlFor="em-subject">Assunto</label>
                <Counter value={form.subject} max={LIMITS.subject} />
              </div>
              <input
                id="em-subject"
                ref={subjectRef}
                placeholder="Sentimos sua falta, {{nome-cliente}}"
                value={form.subject}
                onChange={(e) => set('subject', e.target.value)}
              />
              <TextTools
                field={subjectRef}
                variables={catalog}
                generic={generic}
                emoji
                formatting={false}
                disabled={readOnly}
                onChange={(v) => set('subject', v)}
              />
              <FieldErrors messages={errors.subject} />
            </div>
            <div className="field">
              <div className="tpl-label-row">
                <label htmlFor="em-preheader">Pré-cabeçalho</label>
                <Counter value={form.preheader} max={LIMITS.preheader} />
              </div>
              <input
                id="em-preheader"
                ref={preheaderRef}
                placeholder="Texto curto que aparece ao lado do assunto"
                value={form.preheader}
                onChange={(e) => set('preheader', e.target.value)}
              />
              <TextTools
                field={preheaderRef}
                variables={catalog}
                generic={generic}
                emoji
                formatting={false}
                disabled={readOnly}
                onChange={(v) => set('preheader', v)}
              />
              <FieldErrors messages={errors.preheader} />
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title sm">Cabeçalho</h2>
              <span className="muted tpl-optional">Opcional</span>
            </div>
            <div className="field">
              <label htmlFor="em-header-type">Tipo</label>
              <select
                id="em-header-type"
                value={form.header_type}
                onChange={(e) => set('header_type', e.target.value as EmailHeaderType)}
              >
                {HEADER_OPTIONS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
            </div>
            {form.header_type === 'text' && (
              <div className="field">
                <div className="tpl-label-row">
                  <label htmlFor="em-header">Título</label>
                  <Counter value={form.header_content} max={LIMITS.header_text} />
                </div>
                <input
                  id="em-header"
                  ref={headerRef}
                  value={form.header_content}
                  onChange={(e) => set('header_content', e.target.value)}
                />
                <TextTools
                  field={headerRef}
                  variables={catalog}
                  generic={generic}
                  emoji
                  formatting={false}
                  disabled={readOnly}
                  onChange={(v) => set('header_content', v)}
                />
                <FieldErrors messages={errors.header_content} />
              </div>
            )}
            {form.header_type === 'image' && (
              <div className="field">
                <label htmlFor="em-image">Endereço da imagem</label>
                <input
                  id="em-image"
                  inputMode="url"
                  placeholder="https://..."
                  value={form.header_content}
                  onChange={(e) => set('header_content', e.target.value)}
                />
                <span className="tpl-help muted">
                  Use uma imagem publicada na internet (site, Drive público…): o e-mail carrega a
                  imagem desse endereço. Largura ideal: 1040 px.
                </span>
                <FieldErrors messages={errors.header_content} />
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title sm">Texto do e-mail</h2>
              <div role="tablist" aria-label="Formato do texto" className="seg-tabs sm">
                {(
                  [
                    ['text', 'Texto'],
                    ['html', 'HTML'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    className="seg-tab"
                    aria-selected={form.body_format === value}
                    disabled={readOnly}
                    onClick={() => setBodyFormat(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <TextTools
              field={bodyRef}
              formatting={!isHtml}
              emoji
              variables={catalog}
              generic={generic}
              disabled={readOnly}
              onChange={(v) => set('body', v)}
            />
            <textarea
              ref={bodyRef}
              aria-label={isHtml ? 'HTML do e-mail' : 'Texto do e-mail'}
              className={isHtml ? 'tpl-code' : undefined}
              rows={isHtml ? 16 : 10}
              spellCheck={!isHtml}
              placeholder={
                isHtml
                  ? '<p>Olá {{nome-cliente}},</p>\n<p>Confira as novidades da semana.</p>'
                  : 'Olá {{nome-cliente}},\n\nDeixe uma linha em branco para começar outro parágrafo.'
              }
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
            />
            <div className="tpl-label-row">
              <span className="tpl-help muted">
                {isHtml
                  ? 'Um trecho de HTML entra no layout padrão (título, botão e rodapé continuam). ' +
                    'Um e-mail completo, com <html>, vai do jeito que está. Use estilos inline: ' +
                    'muitos programas de e-mail ignoram <style>. Sem script nem formulário.'
                  : 'Deixe uma linha em branco para começar outro parágrafo. *negrito* e _itálico_.'}
              </span>
              <Counter value={form.body} max={isHtml ? LIMITS.body_html : LIMITS.body} />
            </div>
            <FieldErrors messages={errors.body} />
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title sm">Botão e rodapé</h2>
              <span className="muted tpl-optional">Opcional</span>
            </div>
            <div className="form-grid tight">
              <div className="field">
                <div className="tpl-label-row">
                  <label htmlFor="em-btn">Texto do botão</label>
                  <Counter value={form.button_text} max={LIMITS.button_text} />
                </div>
                <input
                  id="em-btn"
                  placeholder="Ver ofertas"
                  value={form.button_text}
                  onChange={(e) => set('button_text', e.target.value)}
                />
                <FieldErrors messages={errors.button_text} />
              </div>
              <div className="field">
                <label htmlFor="em-url">Link do botão</label>
                <input
                  id="em-url"
                  ref={urlRef}
                  inputMode="url"
                  placeholder="https://..."
                  value={form.button_url}
                  onChange={(e) => set('button_url', e.target.value)}
                />
                <TextTools
                  field={urlRef}
                  variables={catalog}
                  generic={generic}
                  formatting={false}
                  disabled={readOnly}
                  onChange={(v) => set('button_url', v)}
                />
                <FieldErrors messages={errors.button_url} />
              </div>
            </div>
            <div className="field">
              <div className="tpl-label-row">
                <label htmlFor="em-footer">Rodapé</label>
                <Counter value={form.footer} max={LIMITS.footer} />
              </div>
              <textarea
                id="em-footer"
                rows={2}
                placeholder="Você recebe este e-mail porque é cliente da Invictus."
                value={form.footer}
                onChange={(e) => set('footer', e.target.value)}
              />
              <FieldErrors messages={errors.footer} />
            </div>
          </section>

          <section className="card">
            <h2 className="card-title sm">Variáveis</h2>
            <VariablesEditor
              variables={variables}
              catalog={catalog}
              origins={choices.data?.origins ?? {}}
              disabled={readOnly}
              errors={errors.variables}
              onChange={(v) => set('variables', v)}
            />
          </section>
        </fieldset>

        <aside className="tpl-preview">
          <div className="tpl-preview-sticky">
            <h2 className="card-title sm">Prévia</h2>
            <EmailPreview
              sender={storeName ?? 'Remetente'}
              subject={form.subject}
              preheader={form.preheader}
              headerType={form.header_type}
              headerContent={form.header_content}
              body={form.body}
              bodyFormat={form.body_format}
              buttonText={form.button_text}
              buttonUrl={form.button_url}
              footer={form.footer}
              examples={examplesOf(variables)}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
