import { useState } from 'react'
import { Link } from 'react-router'
import MsgNok from '../../../components/msg_nok/msg_nok'
import MsgOk from '../../../components/msg_ok/msg_ok'
import { useMe } from '../../../lib/auth'
import { formatDate } from '../../../lib/format'
import { RejectReviewModal, SubmitMetaModal } from '../../paginas/templates/template_modals'
import { examplesOf } from '../../paginas/templates/template_utils'
import {
  CATEGORY_LABEL,
  type MessageTemplate,
  STATUS_LABEL,
  useTemplateReviews,
} from '../../paginas/templates/templates_api'
import WhatsappPreview from '../../paginas/templates/whatsapp_preview'
import '../../paginas/templates/templates.css'
import './aprovacoes.css'

type Dialog = { kind: 'submit' | 'reject'; template: MessageTemplate } | null

/** Templates que gerentes mandaram para aprovação: o admin aprova (envia à Meta) ou recusa. */
export default function Aprovacoes() {
  const me = useMe()
  const isAdmin = me.data?.role === 'admin'
  const reviews = useTemplateReviews(isAdmin)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [done, setDone] = useState<string | null>(null)

  if (me.data && !isAdmin) {
    return (
      <div className="page">
        <MsgNok titulo="Sem acesso" mensagem="Só um admin aprova templates." />
      </div>
    )
  }

  const list = reviews.data ?? []

  return (
    <div className="page page-aprovacoes">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Aprovações</h1>
          <p className="page-subtitle">
            Templates de WhatsApp que os gerentes pediram para enviar à Meta. Aprovar já envia.
          </p>
        </div>
      </div>

      {done && <MsgOk mensagem={done} onClose={() => setDone(null)} />}
      {reviews.isPending && <p className="muted">Carregando…</p>}
      {reviews.isError && (
        <MsgNok titulo="Não foi possível carregar" mensagem={reviews.error.message} />
      )}
      {reviews.isSuccess && list.length === 0 && (
        <section className="card tpl-empty">
          <p>Nenhum template aguardando aprovação.</p>
        </section>
      )}

      <div className="aprov-list">
        {list.map((t) => {
          const examples = examplesOf(t.variables)
          return (
            <article key={t.id} className="card aprov-item">
              <div className="aprov-main">
                <div className="templates-card-top">
                  <span className="templates-kind">
                    {CATEGORY_LABEL[t.category]} · {t.language} · {t.number_label}
                  </span>
                  <span className="badge sm tone-blue">{STATUS_LABEL[t.status]}</span>
                </div>
                <h2 className="templates-name mono">{t.name}</h2>
                <div className="aprov-meta muted">
                  Pedido por {t.review_requested_by_name ?? '—'} em{' '}
                  {formatDate(t.review_requested_at)}
                </div>
                <div className="aprov-notes">
                  <span className="aprov-notes-label">Observação</span>
                  {t.notes ? <p>{t.notes}</p> : <p className="muted">Sem observação.</p>}
                </div>
              </div>

              <div className="templates-preview aprov-preview">
                <WhatsappPreview
                  compact
                  headerType={t.header_type}
                  headerText={t.header_content}
                  mediaUrl={t.header_media_url}
                  mediaName={t.header_media_name}
                  body={t.body}
                  footer={t.footer}
                  buttons={t.buttons}
                  examples={t.category === 'AUTHENTICATION' ? { '1': '123456' } : examples}
                />
              </div>

              <div className="templates-buttons aprov-actions">
                <Link to={`/templates/whatsapp/${t.id}`} className="btn xs">
                  Abrir
                </Link>
                <button
                  type="button"
                  className="btn xs"
                  onClick={() => setDialog({ kind: 'reject', template: t })}
                >
                  Recusar
                </button>
                <button
                  type="button"
                  className="btn xs primary"
                  onClick={() => setDialog({ kind: 'submit', template: t })}
                >
                  Aprovar e enviar à Meta
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {dialog?.kind === 'submit' && (
        <SubmitMetaModal
          template={dialog.template}
          onClose={() => setDialog(null)}
          onDone={(t) => {
            setDialog(null)
            setDone(`${t.name} enviado para a Meta: ${STATUS_LABEL[t.status].toLowerCase()}.`)
          }}
        />
      )}
      {dialog?.kind === 'reject' && (
        <RejectReviewModal
          template={dialog.template}
          onClose={() => setDialog(null)}
          onDone={(t) => {
            setDialog(null)
            setDone(`${t.name} devolvido para o rascunho.`)
          }}
        />
      )}
    </div>
  )
}
