import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import MsgNok from '../../../components/msg_nok/msg_nok'
import MsgOk from '../../../components/msg_ok/msg_ok'
import { useMe } from '../../../lib/auth'
import { formatDate, formatDateTime, formatMoney } from '../../../lib/format'
import { useWhatsappNumbers } from '../../admin/canais/canais_api'
import {
  ConfirmDeleteModal,
  DuplicateModal,
  MetaPayloadModal,
  StatusModal,
} from './template_modals'
import { examplesOf, formatMessage } from './template_utils'
import {
  CATEGORY_LABEL,
  EMAIL_CATEGORY_LABEL,
  EMAIL_STATUS_LABEL,
  EMAIL_STATUS_TONE,
  type EmailStatus,
  type EmailTemplate,
  type MessageTemplate,
  STATUS_LABEL,
  STATUS_TONE,
  type TemplateCategory,
  type TemplateStatus,
  useDeleteEmailTemplate,
  useDeleteMessageTemplate,
  useDuplicateEmailTemplate,
  useEmailTemplates,
  useMessageTemplates,
  useSyncTemplateAnalytics,
  useSyncTemplates,
} from './templates_api'
import { DesempenhoModal } from './template_desempenho'
import WhatsappPreview from './whatsapp_preview'
import './templates.css'

type Canal = 'whatsapp' | 'email'

function plain(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function usageText(t: MessageTemplate) {
  const parts = []
  if (t.usage.campaigns)
    parts.push(`${t.usage.campaigns} campanha${t.usage.campaigns > 1 ? 's' : ''}`)
  if (t.usage.triggers) parts.push(`${t.usage.triggers} gatilho${t.usage.triggers > 1 ? 's' : ''}`)
  return parts.length ? `Usado em ${parts.join(' e ')}` : 'Não usado ainda'
}

export default function Templates() {
  const [params, setParams] = useSearchParams()
  const canal: Canal = params.get('canal') === 'email' ? 'email' : 'whatsapp'
  const me = useMe()
  const canWrite = me.data?.role === 'admin' || me.data?.role === 'gerente'
  const whatsapp = useMessageTemplates()
  const email = useEmailTemplates()

  return (
    <div className="page page-templates">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Templates</h1>
          <p className="page-subtitle">
            {canal === 'whatsapp'
              ? 'Modelos de WhatsApp passam por um admin e pela Meta antes do uso em campanhas.'
              : 'Modelos de e-mail para campanhas e avisos aos clientes.'}
          </p>
        </div>
        {canWrite && (
          <Link
            to={canal === 'whatsapp' ? '/templates/whatsapp/novo' : '/templates/email/novo'}
            className="btn primary"
          >
            Novo template
          </Link>
        )}
      </div>

      <div role="tablist" aria-label="Canal" className="seg-tabs">
        <button
          type="button"
          role="tab"
          aria-selected={canal === 'whatsapp'}
          className="seg-tab"
          onClick={() => setParams({})}
        >
          WhatsApp
          {!!whatsapp.data?.length && <span className="seg-tab-count">{whatsapp.data.length}</span>}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={canal === 'email'}
          className="seg-tab"
          onClick={() => setParams({ canal: 'email' })}
        >
          E-mail
          {!!email.data?.length && <span className="seg-tab-count">{email.data.length}</span>}
        </button>
      </div>

      {canal === 'whatsapp' ? (
        <WhatsappList canWrite={canWrite} isAdmin={me.data?.role === 'admin'} />
      ) : (
        <EmailList canWrite={canWrite} />
      )}
    </div>
  )
}

/** Busca na Meta os templates do número escolhido (aprovados, em análise, rejeitados...). */
function SyncFromMeta({ onDone }: { onDone: (message: string) => void }) {
  const numbers = useWhatsappNumbers()
  const sync = useSyncTemplates()
  const ready = (numbers.data ?? []).filter((n) => n.waba_id)
  const [chosen, setChosen] = useState('')
  const [error, setError] = useState<string | null>(null)
  const selected = chosen || (ready.length === 1 ? String(ready[0].id) : '')

  if (!ready.length) return null

  async function run() {
    setError(null)
    try {
      const r = await sync.mutateAsync(Number(selected))
      onDone(
        r.total
          ? `Meta: ${r.total} template(s) encontrados · ${r.created} novos · ${r.updated} atualizados.`
          : 'A Meta não tem templates nesta conta ainda.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível buscar na Meta.')
    }
  }

  return (
    <div className="tpl-sync">
      <div className="field">
        <label htmlFor="tpl-sync-number">Buscar templates da Meta</label>
        <select id="tpl-sync-number" value={selected} onChange={(e) => setChosen(e.target.value)}>
          <option value="">Escolha o número</option>
          {ready.map((n) => (
            <option key={n.id} value={n.id}>
              {n.store_code} · {n.label}
            </option>
          ))}
        </select>
      </div>
      <button type="button" className="btn" disabled={!selected || sync.isPending} onClick={run}>
        {sync.isPending ? 'Buscando…' : 'Buscar na Meta'}
      </button>
      {error && <MsgNok titulo="Não foi possível buscar" mensagem={error} />}
    </div>
  )
}

/** Busca agora na Meta as estatísticas dos templates (roda sozinho todo dia às 8h). */
function SyncAnalytics({ onDone }: { onDone: (message: string) => void }) {
  const sync = useSyncTemplateAnalytics()
  return (
    <div className="tpl-sync-analytics">
      <button
        type="button"
        className="btn"
        disabled={sync.isPending}
        title="Enviadas, lidas, cliques e custo dos últimos 30 dias, direto da Meta"
        onClick={() =>
          sync.mutate(undefined, {
            onSuccess: (r) =>
              onDone(
                r.errors.length
                  ? `Estatísticas: ${r.days} dia(s) atualizados; ${r.errors.join(' · ')}`
                  : `Estatísticas atualizadas: ${r.days} dia(s) de template.`,
              ),
          })
        }
      >
        {sync.isPending ? 'Atualizando…' : 'Atualizar estatísticas'}
      </button>
      {sync.isError && <MsgNok titulo="Não foi possível atualizar" mensagem={sync.error.message} />}
    </div>
  )
}

type Dialog = {
  kind: 'duplicate' | 'status' | 'payload' | 'delete' | 'performance'
  template: MessageTemplate
} | null

/** Lista em cards com a prévia do WhatsApp (layout) ou em tabela. */
type View = 'layout' | 'tabela'
const VIEW_KEY = 'crm.templates.visao'

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'tabela' ? 'tabela' : 'layout'
  } catch {
    return 'layout'
  }
}

function saveView(view: View) {
  try {
    localStorage.setItem(VIEW_KEY, view)
  } catch {
    // sem localStorage: a tela só não lembra a escolha
  }
}

const QUALITY: Record<string, [string, string]> = {
  GREEN: ['Alta', 'tone-green'],
  YELLOW: ['Média', 'tone-yellow'],
  RED: ['Baixa', 'tone-red'],
}

/** "1.234 enviadas · 68% lidas · 45 cliques" (números da Meta, 30 dias). */
function statsText(t: MessageTemplate): string | null {
  const s = t.stats_30d
  if (!s || !s.sent) return null
  const read = Math.round((s.read / s.sent) * 100)
  return `${s.sent.toLocaleString('pt-BR')} enviadas · ${read}% lidas · ${s.clicked.toLocaleString('pt-BR')} cliques`
}

/** Pausa da Meta, motivo da rejeição, devolução do admin ou uso em campanhas. */
function FootNote({ t, short = false }: { t: MessageTemplate; short?: boolean }) {
  if (t.status === 'PAUSED') {
    return (
      <span className="templates-reason">
        Pausado pela Meta{t.paused_until ? ` até ${formatDateTime(t.paused_until)}` : ''}
        {t.pause_reason ? `: ${t.pause_reason}` : ' (qualidade baixa)'}
      </span>
    )
  }
  if (t.status === 'REJECTED' && t.rejection_reason) {
    return <span className="templates-reason">Motivo: {t.rejection_reason}</span>
  }
  if (t.status === 'DRAFT' && t.review_comment) {
    return <span className="templates-reason">Devolvido: {t.review_comment}</span>
  }
  return short ? null : <span>{usageText(t)}</span>
}

function WhatsappList({ canWrite, isAdmin }: { canWrite: boolean; isAdmin: boolean }) {
  const navigate = useNavigate()
  const templates = useMessageTemplates()
  const numbers = useWhatsappNumbers()
  const remove = useDeleteMessageTemplate()
  const [q, setQ] = useState('')
  const [number, setNumber] = useState('')
  const [status, setStatus] = useState<TemplateStatus | ''>('')
  const [category, setCategory] = useState<TemplateCategory | ''>('')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [view, setViewState] = useState<View>(readView)
  const setView = (v: View) => {
    setViewState(v)
    saveView(v)
  }

  const search = plain(q.trim())
  const list = (templates.data ?? []).filter(
    (t) =>
      (!number || String(t.whatsapp_number) === number) &&
      (!status || t.status === status) &&
      (!category || t.category === category) &&
      (!search || plain(`${t.name} ${t.body}`).includes(search)),
  )
  const hasFilter = Boolean(q || number || status || category)
  const close = () => {
    setDialog(null)
    setDeleteError(null)
  }

  function actions(t: MessageTemplate) {
    const inUse = t.usage.campaigns + t.usage.triggers > 0
    return (
      <>
        <button
          type="button"
          className="btn xs"
          onClick={() => navigate(`/templates/whatsapp/${t.id}`)}
        >
          {canWrite && t.editable ? 'Editar' : 'Ver'}
        </button>
        {t.meta_template_id && (
          <button
            type="button"
            className="btn xs"
            onClick={() => setDialog({ kind: 'performance', template: t })}
          >
            Desempenho
          </button>
        )}
        {canWrite && (
          <button
            type="button"
            className="btn xs"
            onClick={() => setDialog({ kind: 'duplicate', template: t })}
          >
            Duplicar
          </button>
        )}
        {isAdmin && t.status !== 'IN_REVIEW' && (
          <button
            type="button"
            className="btn xs"
            onClick={() => setDialog({ kind: 'status', template: t })}
          >
            Status
          </button>
        )}
        <button
          type="button"
          className="btn xs"
          onClick={() => setDialog({ kind: 'payload', template: t })}
        >
          JSON
        </button>
        {canWrite && t.editable && !inUse && (
          <button
            type="button"
            className="btn xs"
            onClick={() => setDialog({ kind: 'delete', template: t })}
          >
            Excluir
          </button>
        )}
      </>
    )
  }

  return (
    <>
      {numbers.isSuccess && numbers.data.length === 0 && (
        <div className="tpl-notice">
          Nenhum número de WhatsApp cadastrado. O template é criado por número: cadastre em{' '}
          <Link to="/admin/canais">Admin › Canais</Link>.
        </div>
      )}
      {done && <MsgOk mensagem={done} onClose={() => setDone(null)} />}

      {canWrite && (
        <div className="tpl-sync-row">
          <SyncFromMeta onDone={setDone} />
          <SyncAnalytics onDone={setDone} />
        </div>
      )}

      <div className="filter-bar">
        <div className="field wide">
          <label htmlFor="tpl-q">Buscar</label>
          <input
            id="tpl-q"
            type="search"
            placeholder="Nome ou texto"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="tpl-f-number">Número</label>
          <select id="tpl-f-number" value={number} onChange={(e) => setNumber(e.target.value)}>
            <option value="">Todos</option>
            {(numbers.data ?? []).map((n) => (
              <option key={n.id} value={n.id}>
                {n.store_code} · {n.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tpl-f-status">Status</label>
          <select
            id="tpl-f-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TemplateStatus | '')}
          >
            <option value="">Todos</option>
            {(Object.keys(STATUS_LABEL) as TemplateStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tpl-f-cat">Categoria</label>
          <select
            id="tpl-f-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value as TemplateCategory | '')}
          >
            <option value="">Todas</option>
            {(Object.keys(CATEGORY_LABEL) as TemplateCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        {hasFilter && (
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              setQ('')
              setNumber('')
              setStatus('')
              setCategory('')
            }}
          >
            Limpar
          </button>
        )}
        <div role="tablist" aria-label="Visualização" className="seg-tabs sm templates-view">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'layout'}
            className="seg-tab"
            onClick={() => setView('layout')}
          >
            Layout
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'tabela'}
            className="seg-tab"
            onClick={() => setView('tabela')}
          >
            Tabela
          </button>
        </div>
      </div>

      {templates.isPending && <p className="muted">Carregando templates…</p>}
      {templates.isError && (
        <MsgNok
          titulo="Não foi possível carregar os templates"
          mensagem={templates.error.message}
        />
      )}
      {templates.isSuccess && list.length === 0 && (
        <section className="card tpl-empty">
          <p>
            {hasFilter
              ? 'Nenhum template com esses filtros.'
              : 'Nenhum template de WhatsApp ainda.'}
          </p>
          {canWrite && !hasFilter && (
            <Link to="/templates/whatsapp/novo" className="btn sm">
              Criar o primeiro template
            </Link>
          )}
        </section>
      )}

      {view === 'layout' ? (
        <div className="templates-grid">
          {list.map((t) => (
            <article key={t.id} className="templates-card">
              <div className="templates-card-top">
                <span className="templates-kind">
                  {CATEGORY_LABEL[t.category]} · {t.language}
                </span>
                <span className={`badge sm ${STATUS_TONE[t.status]}`}>
                  {STATUS_LABEL[t.status]}
                </span>
              </div>
              <div>
                <h2 className="templates-name mono">{t.name}</h2>
                <div className="templates-number muted">{t.number_label}</div>
              </div>
              <div className="templates-preview">
                <WhatsappPreview
                  compact
                  headerType={t.header_type}
                  headerText={t.header_content}
                  mediaUrl={t.header_media_url}
                  mediaName={t.header_media_name}
                  body={t.body}
                  footer={t.footer}
                  buttons={t.buttons}
                  examples={
                    t.category === 'AUTHENTICATION' ? { '1': '123456' } : examplesOf(t.variables)
                  }
                />
              </div>
              <div className="templates-foot">
                <FootNote t={t} />
                {statsText(t) && <span className="templates-stats">30 dias: {statsText(t)}</span>}
              </div>
              <div className="templates-buttons">{actions(t)}</div>
            </article>
          ))}
        </div>
      ) : (
        list.length > 0 && (
          <div className="table-wrap">
            <table className="table templates-table">
              <thead>
                <tr>
                  <th>Template</th>
                  <th>Número</th>
                  <th>Categoria</th>
                  <th>Status</th>
                  <th>Qualidade</th>
                  <th>Últimos 30 dias (Meta)</th>
                  <th>Uso</th>
                  <th>Atualizado</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link to={`/templates/whatsapp/${t.id}`} className="row-link mono">
                        {t.name}
                      </Link>
                      <div className="templates-table-sub">
                        <FootNote t={t} short />
                      </div>
                    </td>
                    <td>{t.number_label}</td>
                    <td className="nowrap">
                      {CATEGORY_LABEL[t.category]}
                      <div className="templates-table-sub">{t.language}</div>
                    </td>
                    <td>
                      <span className={`badge sm ${STATUS_TONE[t.status]}`}>
                        {STATUS_LABEL[t.status]}
                      </span>
                    </td>
                    <td>
                      {t.quality_score && QUALITY[t.quality_score] ? (
                        <span className={`badge sm ${QUALITY[t.quality_score][1]}`}>
                          {QUALITY[t.quality_score][0]}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {statsText(t) ? (
                        <>
                          <div className="nowrap">{statsText(t)}</div>
                          {t.stats_30d?.cost && (
                            <div className="templates-table-sub">
                              custo {formatMoney(t.stats_30d.cost)}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="nowrap">
                      {t.usage.campaigns + t.usage.triggers > 0 ? (
                        usageText(t).replace('Usado em ', '')
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="nowrap">{formatDate(t.updated_at)}</td>
                    <td>
                      <div className="templates-buttons nowrap">{actions(t)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {dialog?.kind === 'payload' && <MetaPayloadModal id={dialog.template.id} onClose={close} />}
      {dialog?.kind === 'performance' && (
        <DesempenhoModal template={dialog.template} onClose={close} />
      )}
      {dialog?.kind === 'duplicate' && (
        <DuplicateModal
          template={dialog.template}
          onClose={close}
          onDone={(copy) => {
            close()
            navigate(`/templates/whatsapp/${copy.id}`, {
              state: { saved: `Cópia ${copy.name} criada como rascunho.` },
            })
          }}
        />
      )}
      {dialog?.kind === 'status' && (
        <StatusModal
          template={dialog.template}
          onClose={close}
          onDone={(t) => {
            close()
            setDone(`Status de ${t.name}: ${STATUS_LABEL[t.status]}.`)
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDeleteModal
          name={dialog.template.name}
          pending={remove.isPending}
          error={deleteError}
          onClose={close}
          onConfirm={() =>
            remove.mutate(dialog.template.id, {
              onSuccess: () => {
                setDone(`Template ${dialog.template.name} excluído.`)
                close()
              },
              onError: (err) => setDeleteError(err.message),
            })
          }
        />
      )}
    </>
  )
}

function EmailList({ canWrite }: { canWrite: boolean }) {
  const navigate = useNavigate()
  const me = useMe()
  const templates = useEmailTemplates()
  const duplicate = useDuplicateEmailTemplate()
  const remove = useDeleteEmailTemplate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<EmailStatus | ''>('')
  const [deleting, setDeleting] = useState<EmailTemplate | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isAdmin = me.data?.role === 'admin'

  const search = plain(q.trim())
  const list = (templates.data ?? []).filter(
    (t) =>
      (!status || t.status === status) &&
      (!search || plain(`${t.name} ${t.subject} ${t.body}`).includes(search)),
  )
  const hasFilter = Boolean(q || status)

  return (
    <>
      {done && <MsgOk mensagem={done} onClose={() => setDone(null)} />}
      {error && <MsgNok mensagem={error} />}

      <div className="filter-bar">
        <div className="field wide">
          <label htmlFor="em-q">Buscar</label>
          <input
            id="em-q"
            type="search"
            placeholder="Nome, assunto ou texto"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="em-f-status">Status</label>
          <select
            id="em-f-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as EmailStatus | '')}
          >
            <option value="">Todos</option>
            {(Object.keys(EMAIL_STATUS_LABEL) as EmailStatus[]).map((s) => (
              <option key={s} value={s}>
                {EMAIL_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {templates.isPending && <p className="muted">Carregando templates…</p>}
      {templates.isError && (
        <MsgNok
          titulo="Não foi possível carregar os templates"
          mensagem={templates.error.message}
        />
      )}
      {templates.isSuccess && list.length === 0 && (
        <section className="card tpl-empty">
          <p>
            {hasFilter ? 'Nenhum template com esses filtros.' : 'Nenhum template de e-mail ainda.'}
          </p>
          {canWrite && !hasFilter && (
            <Link to="/templates/email/novo" className="btn sm">
              Criar o primeiro template
            </Link>
          )}
        </section>
      )}

      <div className="templates-grid">
        {list.map((t) => {
          const examples = examplesOf(t.variables)
          const mine = isAdmin || t.store !== null
          return (
            <article key={t.id} className="templates-card">
              <div className="templates-card-top">
                <span className="templates-kind">
                  {EMAIL_CATEGORY_LABEL[t.category]} · {t.store_code ?? 'Todas as lojas'}
                </span>
                <span className={`badge sm ${EMAIL_STATUS_TONE[t.status]}`}>
                  {EMAIL_STATUS_LABEL[t.status]}
                </span>
              </div>
              <h2 className="templates-name">{t.name}</h2>
              <div className="templates-body">
                <div className="strong">Assunto: {formatMessage(t.subject, examples)}</div>
                <div className="templates-clamp">{formatMessage(t.body, examples)}</div>
              </div>
              <div className="templates-buttons">
                <button
                  type="button"
                  className="btn xs"
                  onClick={() => navigate(`/templates/email/${t.id}`)}
                >
                  {canWrite && mine ? 'Editar' : 'Ver'}
                </button>
                {canWrite && (
                  <button
                    type="button"
                    className="btn xs"
                    disabled={duplicate.isPending}
                    onClick={() =>
                      duplicate.mutate(t.id, {
                        onSuccess: (copy) =>
                          navigate(`/templates/email/${copy.id}`, {
                            state: { saved: `Cópia “${copy.name}” criada como rascunho.` },
                          }),
                        onError: (err) => setError(err.message),
                      })
                    }
                  >
                    Duplicar
                  </button>
                )}
                {canWrite && mine && t.status !== 'active' && (
                  <button type="button" className="btn xs" onClick={() => setDeleting(t)}>
                    Excluir
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {deleting && (
        <ConfirmDeleteModal
          name={deleting.name}
          pending={remove.isPending}
          error={deleteError}
          onClose={() => {
            setDeleting(null)
            setDeleteError(null)
          }}
          onConfirm={() =>
            remove.mutate(deleting.id, {
              onSuccess: () => {
                setDone(`Template ${deleting.name} excluído.`)
                setDeleting(null)
              },
              onError: (err) => setDeleteError(err.message),
            })
          }
        />
      )}
    </>
  )
}
