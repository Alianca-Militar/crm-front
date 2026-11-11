import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import BackLink from '../../../components/back_link/back_link'
import { IconChevronLeft } from '../../../components/menu/icons'
import MsgOk from '../../../components/msg_ok/msg_ok'
import { ApiError, type FieldErrors as ApiFieldErrors } from '../../../lib/api'
import { useMe } from '../../../lib/auth'
import { formatMoney } from '../../../lib/format'
import { useWhatsappNumbers } from '../../admin/canais/canais_api'
import {
  type AudienceFilters,
  type AudienceSource,
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_TONE,
  type Campaign,
  type CampaignInput,
  type EstimateInput,
  type ExclusionReason,
  useBuildAudience,
  useCampaign,
  useCancelCampaign,
  useDeleteCampaign,
  useEstimate,
  useExportCampaign,
  useFilterOptions,
  useSaveCampaign,
} from '../campanhas/campanhas_api'
import { FieldErrors } from '../templates/editor_parts'
import { variableInfo } from '../templates/template_utils'
import {
  CATEGORY_LABEL,
  type MessageTemplate,
  STATUS_LABEL,
  useMessageTemplates,
  useTemplateChoices,
} from '../templates/templates_api'
import WhatsappPreview from '../templates/whatsapp_preview'
import AudienceFiltersEditor from './audience_filters'
import AudienceTable from './audience_table'
import ContactsUpload from './contacts_upload'
import '../templates/templates.css'
import './nova_campanha.css'

const OBJECTIVES = [
  'Promoção',
  'Reativação',
  'Pré-venda',
  'Pesquisa + voucher',
  'Data comemorativa',
  'Aniversário',
  'Outro',
]

const STEPS = ['Dados', 'Mensagem', 'Público', 'Conferir', 'Exportar'] as const

const EXCLUSION_ORDER: ExclusionReason[] = [
  'optout',
  'frequency_cap',
  'no_whatsapp',
  'invalid_phone',
  'duplicate',
  'missing_data',
]

// Template que não serve para campanha (a Meta não deixa enviar).
const BLOCKED_TEMPLATE = new Set(['REJECTED', 'PAUSED', 'DISABLED'])

// Template que veio da Meta com {{1}} vira {{var1}}: se o 1 for o nome, a variável puxa do cadastro.
const FROM_RECORD: [string, string][] = [
  ['{{nome-cliente}}', 'Nome do cliente'],
  ['{{corporacao}}', 'Corporação'],
  ['{{nome-loja}}', 'Nome da loja'],
]

function valueLabel(value: string | undefined) {
  const linked = FROM_RECORD.find(([token]) => token === value)
  return linked ? `${linked[1]} (de cada cliente)` : value
}

type Form = {
  name: string
  objective: string
  whatsapp_number: string
  template: string
  audience_source: AudienceSource
  audience_filters: AudienceFilters
  template_values: Record<string, string>
  frequency_cap_days: string
  notes: string
}

const EMPTY: Form = {
  name: '',
  objective: 'Promoção',
  whatsapp_number: '',
  template: '',
  audience_source: 'crm',
  audience_filters: {},
  template_values: {},
  frequency_cap_days: '7',
  notes: '',
}

function toForm(c: Campaign): Form {
  return {
    name: c.name,
    objective: c.objective ?? '',
    whatsapp_number: String(c.whatsapp_number),
    template: String(c.template),
    audience_source: c.audience_source,
    audience_filters: c.audience_filters ?? {},
    template_values: c.template_values ?? {},
    frequency_cap_days: String(c.frequency_cap_days),
    notes: c.notes ?? '',
  }
}

function toInput(f: Form): CampaignInput {
  return {
    name: f.name.trim(),
    objective: f.objective || null,
    whatsapp_number: Number(f.whatsapp_number),
    template: Number(f.template),
    audience_source: f.audience_source,
    audience_filters: f.audience_filters,
    template_values: f.template_values,
    frequency_cap_days: Number(f.frequency_cap_days || 0),
    notes: f.notes || null,
  }
}

/** Valor "atrasado": só muda depois de `ms` sem alteração (evita uma estimativa por tecla). */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Resumo dos filtros em texto, para a etapa Conferir. */
function describeFilters(f: AudienceFilters, labels: Map<number, string>): string[] {
  const out: string[] = []
  if (f.corporacoes?.length) out.push(`Corporação: ${f.corporacoes.join(', ')}`)
  if (f.patentes?.length) out.push(`Patente: ${f.patentes.join(', ')}`)
  if (f.stores?.length) out.push(`Loja: ${f.stores.map((s) => labels.get(s) ?? s).join(', ')}`)
  if (f.cities?.length) out.push(`Cidade: ${f.cities.map((c) => labels.get(c) ?? c).join(', ')}`)
  if (f.purchased_within_days != null)
    out.push(`Comprou nos últimos ${f.purchased_within_days} dias`)
  if (f.not_purchased_days != null) out.push(`Sem comprar há mais de ${f.not_purchased_days} dias`)
  if (f.orders_min != null || f.orders_max != null)
    out.push(`Nº de compras: ${f.orders_min ?? 0} a ${f.orders_max ?? 'sem limite'}`)
  if (f.spent_min != null || f.spent_max != null)
    out.push(
      `Total gasto: R$ ${f.spent_min ?? '0'} a ${f.spent_max ? `R$ ${f.spent_max}` : 'sem limite'}`,
    )
  if (f.rfm_segments?.length) out.push(`Segmento: ${f.rfm_segments.join(', ')}`)
  if (f.birthday_months?.length)
    out.push(`Aniversário em: ${f.birthday_months.map((m) => MONTHS[m - 1]).join(', ')}`)
  if (f.tags?.length) out.push(`Tags: ${f.tags.join(', ')}`)
  if (f.product_groups?.length) out.push(`Comprou do grupo: ${f.product_groups.join(', ')}`)
  if (f.product_categories?.length)
    out.push(`Comprou da categoria: ${f.product_categories.join(', ')}`)
  return out
}

/** Criar e editar campanha em etapas: dados, mensagem, público, conferir e exportar. */
export default function NovaCampanha() {
  const params = useParams()
  const id = params.id ? Number(params.id) : null
  const navigate = useNavigate()
  const location = useLocation()
  const [search, setSearch] = useSearchParams()
  const me = useMe()
  const numbers = useWhatsappNumbers()
  const templates = useMessageTemplates()
  const choices = useTemplateChoices()
  const options = useFilterOptions()
  const existing = useCampaign(id)
  const save = useSaveCampaign()
  const build = useBuildAudience()
  const exportCsv = useExportCampaign()
  const cancel = useCancelCampaign()
  const remove = useDeleteCampaign()

  const [form, setForm] = useState<Form>(EMPTY)
  const [loadedAt, setLoadedAt] = useState<string | null>(null)
  const [errors, setErrors] = useState<ApiFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(
    (location.state as { saved?: string } | null)?.saved ?? null,
  )
  const [confirm, setConfirm] = useState<'export' | 'cancel' | 'delete' | null>(null)

  // Carrega a campanha (de novo sempre que o servidor devolver uma versão nova).
  const campaign = existing.data
  if (campaign && loadedAt !== campaign.updated_at + campaign.status) {
    setLoadedAt(campaign.updated_at + campaign.status)
    setForm(toForm(campaign))
  }

  const role = me.data?.role
  const canWrite = role === 'admin' || role === 'gerente'
  const closed = campaign ? campaign.is_locked || campaign.status === 'cancelled' : false
  const readOnly = !canWrite || closed
  const status = campaign?.status ?? 'draft'
  const dirty = campaign
    ? JSON.stringify(toInput(form)) !== JSON.stringify(toInput(toForm(campaign)))
    : true

  // Etapa atual (na URL). Campanha com lista gerada abre direto na última.
  const maxStep = !campaign ? 2 : status === 'draft' ? 4 : 5
  const defaultStep = !campaign ? 1 : status === 'draft' ? 3 : 5
  const step = Math.min(Number(search.get('etapa')) || defaultStep, maxStep)

  const activeNumbers = (numbers.data ?? []).filter(
    (n) => n.active || String(n.id) === form.whatsapp_number,
  )
  const number = activeNumbers.find((n) => String(n.id) === form.whatsapp_number)
  const numberTemplates = (templates.data ?? []).filter(
    (t) => String(t.whatsapp_number) === form.whatsapp_number,
  )
  const template: MessageTemplate | undefined = numberTemplates.find(
    (t) => String(t.id) === form.template,
  )
  const catalog = choices.data?.variables ?? []
  const templateKeys = (template?.variables ?? []).map((v) => v.key)
  const campaignKeys = templateKeys.filter((k) => variableInfo(k, catalog).origin === 'campaign')

  const estimateInput = useDebounced<EstimateInput | null>(
    form.whatsapp_number && step >= 3
      ? {
          whatsapp_number: Number(form.whatsapp_number),
          template: form.template ? Number(form.template) : null,
          audience_filters: form.audience_filters,
          template_values: form.template_values,
          frequency_cap_days: Number(form.frequency_cap_days || 0),
          campaign: id,
          audience_source: form.audience_source,
        }
      : null,
    500,
  )
  const estimate = useEstimate(closed || step === 5 ? null : estimateInput)
  const summary = estimate.data

  const templateExamples: Record<string, string> = {
    ...Object.fromEntries((template?.variables ?? []).map((v) => [v.key, v.example])),
    ...Object.fromEntries(Object.entries(form.template_values).filter(([, v]) => v)),
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function goTo(next: number) {
    setError(null)
    setErrors({})
    setSearch(next === 1 ? {} : { etapa: String(next) })
    window.scrollTo({ top: 0 })
  }

  function showError(err: unknown, fallback: string) {
    if (err instanceof ApiError) {
      setErrors(err.fieldErrors)
      setError(err.message)
    } else {
      setError(fallback)
    }
  }

  /** Salva (cria na primeira vez). Devolve o id ou null se deu erro. */
  async function persist(nextStep?: number): Promise<number | null> {
    if (campaign && !dirty) return campaign.id
    setError(null)
    setErrors({})
    try {
      const result = await save.mutateAsync({ id: id ?? undefined, data: toInput(form) })
      if (!id) {
        navigate(`/campanhas/${result.id}${nextStep ? `?etapa=${nextStep}` : ''}`, {
          replace: true,
          state: { saved: `Campanha ${result.name} salva como rascunho.` },
        })
      }
      return result.id
    } catch (err) {
      showError(err, 'Não foi possível salvar a campanha.')
      return null
    }
  }

  /** Avança: confere a etapa, salva quando já dá e vai para a próxima. */
  async function next() {
    if (step === 1) {
      const problems: ApiFieldErrors = {}
      if (!form.name.trim()) problems.name = ['Informe o nome da campanha.']
      if (!form.whatsapp_number) problems.whatsapp_number = ['Escolha o número de WhatsApp.']
      if (Object.keys(problems).length) {
        setErrors(problems)
        return
      }
      if (campaign && dirty && !(await persist())) return
      goTo(2)
      return
    }
    if (step === 2) {
      const problems: ApiFieldErrors = {}
      if (!form.template) problems.template = ['Escolha o template.']
      const empty = campaignKeys.filter((k) => !form.template_values[k]?.trim())
      if (empty.length)
        problems.template_values = [`Preencha ${empty.map((k) => `{{${k}}}`).join(', ')}.`]
      if (Object.keys(problems).length) {
        setErrors(problems)
        return
      }
      if (!id) {
        await persist(3) // cria e já abre na etapa 3
        return
      }
      if (await persist()) goTo(3)
      return
    }
    if (step === 3) {
      if (await persist()) goTo(4)
      return
    }
    if (step === 4) {
      if (!id || !(await persist())) return
      try {
        await build.mutateAsync(id)
        goTo(5)
      } catch (err) {
        showError(err, 'Não foi possível gerar a lista.')
      }
    }
  }

  async function onSaveDraft() {
    if (await persist()) setSaved('Rascunho salvo.')
  }

  async function onExport() {
    if (!id) return
    setConfirm(null)
    setError(null)
    try {
      await exportCsv.mutateAsync(id)
      setSaved('Lista exportada. Importe o arquivo na FastZap para enviar.')
    } catch (err) {
      showError(err, 'Não foi possível exportar a lista.')
    }
  }

  async function onCancel() {
    if (!id) return
    setConfirm(null)
    try {
      await cancel.mutateAsync(id)
      setSaved('Campanha cancelada.')
    } catch (err) {
      showError(err, 'Não foi possível cancelar.')
    }
  }

  async function onDelete() {
    if (!id) return
    setConfirm(null)
    try {
      await remove.mutateAsync(id)
      navigate('/campanhas', { replace: true })
    } catch (err) {
      showError(err, 'Não foi possível excluir.')
    }
  }

  if (id && existing.isError) {
    return (
      <div className="page">
        <MsgNok titulo="Campanha não encontrada" mensagem={existing.error.message} />
        <BackLink to="/campanhas" label="Campanhas" />
      </div>
    )
  }

  const busy = save.isPending || build.isPending || exportCsv.isPending
  const canDelete = campaign && !campaign.is_locked && !campaign.exported_at
  const approved = template?.status === 'APPROVED'
  const placeLabels = new Map<number, string>([
    ...(options.data?.stores ?? []).map((s) => [s.value, s.label] as [number, string]),
    ...(options.data?.cities ?? []).map((c) => [c.value, c.label] as [number, string]),
  ])
  const filterLines = describeFilters(form.audience_filters, placeLabels)
  const showFrozen = status !== 'draft' && (closed || step === 5)

  // ---------- Partes reaproveitadas ----------

  // Custo = incluídos × preço da categoria do template no número (Admin › Canais).
  const costCount = showFrozen ? (campaign?.audience_included ?? 0) : (summary?.included ?? 0)
  const rawPrice = template
    ? {
        MARKETING: number?.price_marketing,
        UTILITY: number?.price_utility,
        AUTHENTICATION: number?.price_authentication,
      }[template.category]
    : null
  const price = rawPrice ? Number(rawPrice) : null

  const estimateCard = (
    <section className="card-dark nova-estimate">
      <div className="nova-estimate-label">{showFrozen ? 'Lista gerada' : 'Público estimado'}</div>
      <div className="nova-estimate-value display-num">
        {showFrozen
          ? (campaign?.audience_included ?? 0).toLocaleString('pt-BR')
          : summary
            ? summary.included.toLocaleString('pt-BR')
            : '—'}
      </div>
      <div className="nova-estimate-text">
        {showFrozen ? (
          'contatos na lista.'
        ) : summary ? (
          <>
            contatos na lista, de {summary.matched.toLocaleString('pt-BR')}{' '}
            {form.audience_source === 'external' ? 'na base' : 'no filtro'}
            {estimate.isFetching && ' · atualizando…'}
          </>
        ) : form.audience_source === 'external' && !campaign?.contacts_count ? (
          'Envie o arquivo para estimar.'
        ) : (
          'Calculando…'
        )}
      </div>
      {!showFrozen &&
        summary &&
        (summary.no_phone > 0 || Object.keys(summary.excluded).length > 0) && (
          <ul className="nova-exclusions">
            {EXCLUSION_ORDER.filter((r) => summary.excluded[r]).map((r) => (
              <li key={r}>
                <span>{options.data?.exclusions[r] ?? r}</span>
                <strong>{summary.excluded[r]?.toLocaleString('pt-BR')}</strong>
              </li>
            ))}
            {summary.no_phone > 0 && (
              <li>
                <span>Sem telefone</span>
                <strong>{summary.no_phone.toLocaleString('pt-BR')}</strong>
              </li>
            )}
          </ul>
        )}
      {template && (showFrozen || summary) && (
        <div className="nova-estimate-cost">
          <span>Custo estimado</span>
          {price === null ? (
            <small>Sem preço por mensagem no número (Admin › Canais).</small>
          ) : (
            <>
              <strong>{formatMoney(costCount * price)}</strong>
              <small>
                {costCount.toLocaleString('pt-BR')} × {formatMoney(price)} (
                {CATEGORY_LABEL[template.category] ?? template.category})
              </small>
            </>
          )}
        </div>
      )}
    </section>
  )

  const preview = (values: Record<string, string>) =>
    template && (
      <WhatsappPreview
        compact
        headerType={template.header_type}
        headerText={template.header_content}
        mediaUrl={template.header_media_url}
        mediaName={template.header_media_name}
        body={template.body}
        footer={template.footer}
        buttons={template.buttons}
        examples={values}
        sender={number?.display_name ?? number?.label}
      />
    )

  const notApprovedNotice = template && !approved && (
    <div className="tpl-notice">
      Template <strong>{STATUS_LABEL[template.status].toLowerCase()}</strong>: dá para montar e
      conferir a campanha, mas para exportar ele precisa estar <strong>aprovado</strong>. Quando a
      Meta aprovar, marque em <Link to={`/templates/whatsapp/${template.id}`}>Templates</Link>.
    </div>
  )

  return (
    <div className="page page-nova-campanha">
      <div className="page-head">
        <div className="page-head-text">
          <BackLink to="/campanhas" label="Campanhas" />
          <h1 className="page-title">
            {campaign ? campaign.name : 'Nova campanha'}{' '}
            {campaign && (
              <span className={`badge ${CAMPAIGN_STATUS_TONE[status]}`}>
                {CAMPAIGN_STATUS_LABEL[status]}
              </span>
            )}
          </h1>
        </div>
        {canWrite && campaign && (
          <div className="page-actions">
            {!closed && (
              <button type="button" className="btn sm" onClick={() => setConfirm('cancel')}>
                Cancelar campanha
              </button>
            )}
            {canDelete && (
              <button type="button" className="btn sm" onClick={() => setConfirm('delete')}>
                Excluir
              </button>
            )}
          </div>
        )}
      </div>

      <ol className="nova-steps">
        {STEPS.map((label, i) => {
          const n = i + 1
          const done = n < step || (n === 5 && !!campaign?.exported_at)
          return (
            <li key={label}>
              <button
                type="button"
                className={`nova-step${done ? ' done' : ''}${n === step ? ' current' : ''}`}
                aria-current={n === step ? 'step' : undefined}
                disabled={n > maxStep || busy}
                onClick={() => goTo(n)}
              >
                <span className="nova-step-n">{n}</span>
                {label}
              </button>
            </li>
          )
        })}
      </ol>

      {saved && <MsgOk mensagem={saved} onClose={() => setSaved(null)} />}
      {error && <MsgNok titulo="Atenção" mensagem={error} />}
      {closed && campaign && (
        <div className="tpl-notice">
          {campaign.status === 'cancelled'
            ? 'Campanha cancelada: não pode mais ser alterada.'
            : 'Lista exportada: a campanha está travada. Você ainda pode baixar o CSV de novo.'}
        </div>
      )}
      {campaign?.status === 'audience_ready' && dirty && step < 5 && (
        <div className="tpl-notice">
          Você mudou a campanha depois de gerar a lista. Ao avançar, a lista é descartada e gerada
          de novo.
        </div>
      )}

      <div className="nova-body">
        <div className="nova-main">
          {/* 1 · Dados */}
          {step === 1 && (
            <fieldset className="nova-form" disabled={readOnly}>
              <section className="card">
                <h2 className="card-title">1 · Dados da campanha</h2>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="nc-nome">Nome *</label>
                    <input
                      id="nc-nome"
                      placeholder="Ex.: Voucher R$ 20 · PMMG"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                    />
                    <FieldErrors messages={errors.name} />
                  </div>
                  <div className="field">
                    <label htmlFor="nc-obj">Objetivo</label>
                    <select
                      id="nc-obj"
                      value={form.objective}
                      onChange={(e) => set('objective', e.target.value)}
                    >
                      {OBJECTIVES.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="nc-num">Número de WhatsApp *</label>
                    <select
                      id="nc-num"
                      value={form.whatsapp_number}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          whatsapp_number: e.target.value,
                          template: '',
                          template_values: {},
                        }))
                      }
                    >
                      <option value="">Selecione</option>
                      {activeNumbers.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.store_code} · {n.label} · {n.display_phone_number}
                        </option>
                      ))}
                    </select>
                    <span className="tpl-help muted">A loja da campanha é a loja do número.</span>
                    <FieldErrors messages={errors.whatsapp_number} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="nc-notes">Observações</label>
                  <textarea
                    id="nc-notes"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                  />
                </div>
                {numbers.isSuccess && activeNumbers.length === 0 && (
                  <div className="tpl-notice">
                    Nenhum número de WhatsApp ativo. Cadastre em{' '}
                    <Link to="/admin/canais">Admin › Canais</Link>.
                  </div>
                )}
              </section>
            </fieldset>
          )}

          {/* 2 · Mensagem */}
          {step === 2 && (
            <fieldset className="nova-form" disabled={readOnly}>
              <section className="card">
                <h2 className="card-title">2 · Mensagem</h2>
                <div className="field">
                  <label htmlFor="nc-tpl">Template *</label>
                  <select
                    id="nc-tpl"
                    value={form.template}
                    onChange={(e) => set('template', e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {numberTemplates.map((t) => (
                      <option
                        key={t.id}
                        value={t.id}
                        disabled={BLOCKED_TEMPLATE.has(t.status) && String(t.id) !== form.template}
                      >
                        {t.name} · {t.language} · {STATUS_LABEL[t.status]}
                      </option>
                    ))}
                  </select>
                  <FieldErrors messages={errors.template} />
                </div>
                {templates.isSuccess && numberTemplates.length === 0 && (
                  <div className="tpl-notice">
                    Este número ainda não tem template. Crie em{' '}
                    <Link to="/templates/whatsapp/novo">Templates › Novo</Link>.
                  </div>
                )}
                {notApprovedNotice}

                {template && campaignKeys.length === 0 && (
                  <p className="muted nova-help">
                    As variáveis deste template vêm do cadastro do cliente e da loja: nada para
                    preencher.
                  </p>
                )}
                {campaignKeys.length > 0 && (
                  <>
                    <h3 className="nova-subtitle">Valores da campanha</h3>
                    <div className="form-grid tight">
                      {campaignKeys.map((k) => (
                        <div className="field" key={k}>
                          <label htmlFor={`nc-v-${k}`}>
                            {variableInfo(k, catalog).label}{' '}
                            <span className="mono muted">{`{{${k}}}`}</span> *
                          </label>
                          <input
                            id={`nc-v-${k}`}
                            value={form.template_values[k] ?? ''}
                            placeholder="Igual para todos os contatos"
                            onChange={(e) =>
                              set('template_values', {
                                ...form.template_values,
                                [k]: e.target.value,
                              })
                            }
                          />
                          <span className="nova-linked muted">
                            Ou puxar de cada cliente:{' '}
                            {FROM_RECORD.map(([token, label]) => (
                              <button
                                key={token}
                                type="button"
                                className={
                                  form.template_values[k] === token ? 'btn xs primary' : 'btn xs'
                                }
                                onClick={() =>
                                  set('template_values', { ...form.template_values, [k]: token })
                                }
                              >
                                {label}
                              </button>
                            ))}
                          </span>
                        </div>
                      ))}
                    </div>
                    <span className="tpl-help muted">
                      Na base externa, uma coluna com o mesmo nome (ex.: cupom) troca o valor por
                      contato.
                    </span>
                  </>
                )}
                <FieldErrors messages={errors.template_values} />
              </section>
            </fieldset>
          )}

          {/* 3 · Público */}
          {step === 3 && (
            <fieldset className="nova-form" disabled={readOnly}>
              <section className="card">
                <div className="card-head">
                  <h2 className="card-title">3 · Público</h2>
                  <div role="tablist" aria-label="Origem do público" className="seg-tabs sm">
                    {(
                      [
                        ['crm', 'Clientes do CRM'],
                        ['external', 'Base externa'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        className="seg-tab"
                        aria-selected={form.audience_source === value}
                        onClick={() => set('audience_source', value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="muted nova-help">
                  Sempre ficam de fora: quem pediu para sair, quem recebeu campanha há pouco, sem
                  WhatsApp, telefone inválido e quem não tem dado para alguma variável.
                </p>

                {form.audience_source === 'crm' ? (
                  <>
                    <p className="muted nova-help">Sem filtro, entram todos os clientes.</p>
                    <AudienceFiltersEditor
                      value={form.audience_filters}
                      options={options.data}
                      disabled={readOnly}
                      onChange={(v) => set('audience_filters', v)}
                    />
                    <FieldErrors messages={errors.audience_filters} />
                  </>
                ) : (
                  campaign && (
                    <ContactsUpload
                      campaignId={campaign.id}
                      templateKeys={templateKeys}
                      disabled={readOnly}
                    />
                  )
                )}

                <div className="field nova-cap">
                  <label htmlFor="nc-cap">
                    Não mandar para quem recebeu campanha nos últimos (dias)
                  </label>
                  <input
                    id="nc-cap"
                    type="number"
                    min={0}
                    max={90}
                    inputMode="numeric"
                    value={form.frequency_cap_days}
                    onChange={(e) => set('frequency_cap_days', e.target.value)}
                  />
                  <span className="tpl-help muted">0 = sem limite.</span>
                  <FieldErrors messages={errors.frequency_cap_days} />
                </div>
              </section>
            </fieldset>
          )}

          {/* 4 · Conferir */}
          {step === 4 && (
            <>
              <section className="card">
                <h2 className="card-title">4 · Conferir</h2>
                <dl className="dl nova-review">
                  <dt>Campanha</dt>
                  <dd>
                    {form.name} <span className="muted">· {form.objective}</span>
                  </dd>
                  <dt>Número</dt>
                  <dd>
                    {number
                      ? `${number.store_code} · ${number.label} · ${number.display_phone_number}`
                      : '—'}
                  </dd>
                  <dt>Template</dt>
                  <dd>
                    <span className="mono">{template?.name}</span>{' '}
                    {template && (
                      <span className={approved ? 'badge sm tone-green' : 'badge sm tone-yellow'}>
                        {STATUS_LABEL[template.status]}
                      </span>
                    )}
                  </dd>
                  {campaignKeys.map((k) => [
                    <dt key={`${k}-t`} className="mono">{`{{${k}}}`}</dt>,
                    <dd key={`${k}-d`}>{valueLabel(form.template_values[k])}</dd>,
                  ])}
                  <dt>Público</dt>
                  <dd>
                    {form.audience_source === 'external' ? (
                      `Base externa · ${(campaign?.contacts_count ?? 0).toLocaleString('pt-BR')} contatos no arquivo`
                    ) : filterLines.length ? (
                      <ul className="nova-review-list">
                        {filterLines.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    ) : (
                      'Todos os clientes do CRM'
                    )}
                  </dd>
                  <dt>Frequência</dt>
                  <dd>
                    {Number(form.frequency_cap_days) > 0
                      ? `Sem quem recebeu campanha nos últimos ${form.frequency_cap_days} dias`
                      : 'Sem limite'}
                  </dd>
                </dl>
                {notApprovedNotice}
              </section>

              <section className="card">
                <h2 className="card-title sm">Como a mensagem vai chegar</h2>
                {summary && summary.sample.length > 0 ? (
                  <div className="nova-samples">
                    {summary.sample.slice(0, 3).map((row) => (
                      <figure key={row.phone} className="nova-sample">
                        {preview(row.values)}
                        <figcaption className="muted">{row.name || row.phone}</figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="muted nova-help">
                      Nenhum contato entra na lista ainda. Prévia com os exemplos do template:
                    </p>
                    <div className="nova-samples">{preview(templateExamples)}</div>
                  </>
                )}
              </section>
            </>
          )}

          {/* 5 · Exportar */}
          {step === 5 && campaign && (
            <>
              <section className="card">
                <h2 className="card-title">5 · Exportar para a FastZap</h2>
                {campaign.exported_at ? (
                  <p>
                    Lista exportada em{' '}
                    {new Date(campaign.exported_at).toLocaleString('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                    . Importe o arquivo na FastZap para enviar.
                  </p>
                ) : (
                  <p>
                    A lista está pronta com{' '}
                    <strong>{(campaign.audience_included ?? 0).toLocaleString('pt-BR')}</strong>{' '}
                    contatos. Confira abaixo e exporte o arquivo para importar na FastZap.
                  </p>
                )}
                {notApprovedNotice}
                {canWrite && campaign.status !== 'cancelled' && (
                  <div className="nova-export-actions">
                    <button
                      type="button"
                      className="btn primary"
                      disabled={
                        busy || (!campaign.exported_at && !approved) || !campaign.audience_included
                      }
                      onClick={() => (campaign.exported_at ? onExport() : setConfirm('export'))}
                    >
                      {exportCsv.isPending
                        ? 'Exportando…'
                        : campaign.exported_at
                          ? 'Baixar CSV de novo'
                          : 'Exportar CSV para a FastZap'}
                    </button>
                    {!closed && (
                      <button type="button" className="btn" disabled={busy} onClick={() => goTo(3)}>
                        Mudar o público
                      </button>
                    )}
                  </div>
                )}
              </section>
              <AudienceTable campaignId={campaign.id} keys={templateKeys} />
            </>
          )}

          {/* Navegação */}
          {step < 5 && (
            <div className="nova-nav">
              {step > 1 ? (
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => goTo(step - 1)}
                >
                  <IconChevronLeft size={18} />
                  Voltar
                </button>
              ) : (
                <span />
              )}
              <div className="nova-nav-right">
                {canWrite && !closed && campaign && (
                  <button
                    type="button"
                    className="btn"
                    disabled={busy || !dirty}
                    onClick={onSaveDraft}
                  >
                    {save.isPending ? 'Salvando…' : 'Salvar rascunho'}
                  </button>
                )}
                {!readOnly ? (
                  <button type="button" className="btn primary" disabled={busy} onClick={next}>
                    {build.isPending
                      ? 'Gerando a lista…'
                      : save.isPending
                        ? 'Salvando…'
                        : step === 4
                          ? 'Confirmar e gerar a lista →'
                          : 'Avançar →'}
                  </button>
                ) : (
                  step < maxStep && (
                    <button type="button" className="btn primary" onClick={() => goTo(step + 1)}>
                      Avançar →
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="nova-aside">
          {step >= 3 && estimateCard}
          {step !== 4 && (
            <section className="card nova-preview">
              <h2 className="card-title sm">Prévia · WhatsApp</h2>
              {template ? (
                <>
                  {preview(summary?.sample[0]?.values ?? templateExamples)}
                  <span className="muted nova-help">
                    {summary?.sample[0]
                      ? 'Com os dados do primeiro contato da lista.'
                      : 'Com os exemplos do template.'}
                  </span>
                </>
              ) : (
                <p className="muted">A prévia aparece quando você escolher o template.</p>
              )}
            </section>
          )}
        </aside>
      </div>

      <Modal
        open={confirm === 'export'}
        titulo="Exportar para a FastZap"
        onClose={() => setConfirm(null)}
        footer={
          <>
            <button type="button" className="btn sm" onClick={() => setConfirm(null)}>
              Voltar
            </button>
            <button type="button" className="btn sm primary" onClick={onExport}>
              Exportar
            </button>
          </>
        }
      >
        <p>
          Vai baixar a lista com {(campaign?.audience_included ?? 0).toLocaleString('pt-BR')}{' '}
          contatos. Depois de exportar, a campanha fica travada (público e mensagem não mudam mais)
          e esses contatos passam a contar no limite de frequência.
        </p>
      </Modal>

      <Modal
        open={confirm === 'cancel'}
        titulo="Cancelar campanha"
        onClose={() => setConfirm(null)}
        footer={
          <>
            <button type="button" className="btn sm" onClick={() => setConfirm(null)}>
              Voltar
            </button>
            <button type="button" className="btn sm dark" onClick={onCancel}>
              Cancelar campanha
            </button>
          </>
        }
      >
        <p>
          A campanha fica como cancelada e não pode mais ser alterada.
          {campaign?.exported_at &&
            ' A lista já foi exportada: se a FastZap ainda não enviou, cancele lá também.'}
        </p>
      </Modal>

      <Modal
        open={confirm === 'delete'}
        titulo="Excluir campanha"
        onClose={() => setConfirm(null)}
        footer={
          <>
            <button type="button" className="btn sm" onClick={() => setConfirm(null)}>
              Voltar
            </button>
            <button type="button" className="btn sm dark" onClick={onDelete}>
              Excluir
            </button>
          </>
        }
      >
        <p>A campanha, a base enviada e a lista gerada serão apagadas.</p>
      </Modal>
    </div>
  )
}
