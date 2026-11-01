import { useState } from 'react'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { ApiError } from '../../../lib/api'
import { useWhatsappNumbers } from '../../admin/canais/canais_api'
import { normalizeName } from './template_utils'
import {
  type MessageTemplate,
  STATUS_LABEL,
  type TemplateStatus,
  useDuplicateMessageTemplate,
  useMetaPayload,
  useRejectReview,
  useSetTemplateStatus,
  useSubmitTemplate,
} from './templates_api'

/** JSON que o CRM vai mandar para a Meta (POST /{WABA_ID}/message_templates). */
export function MetaPayloadModal({ id, onClose }: { id: number; onClose: () => void }) {
  const payload = useMetaPayload(id)
  const [copied, setCopied] = useState(false)
  const json = payload.data ? JSON.stringify(payload.data.payload, null, 2) : ''

  return (
    <Modal
      open
      titulo="JSON para a Meta"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn sm"
            disabled={!json}
            onClick={() => {
              navigator.clipboard
                ?.writeText(json)
                .then(() => setCopied(true))
                .catch(() => setCopied(false))
            }}
          >
            {copied ? 'Copiado' : 'Copiar JSON'}
          </button>
          <button type="button" className="btn sm" onClick={onClose}>
            Fechar
          </button>
        </>
      }
    >
      <div className="tpl-payload">
        {payload.isPending && <p className="muted">Carregando…</p>}
        {payload.isError && <MsgNok mensagem={payload.error.message} />}
        {payload.data && (
          <>
            <p className="tpl-help">
              Pedido que o CRM faz em <code>{payload.data.endpoint}</code> quando um admin envia o
              template. A observação interna não vai junto.
            </p>
            {payload.data.missing.length > 0 && (
              <div className="tpl-notice">
                <strong>Antes de enviar:</strong>
                <ul>
                  {payload.data.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            <pre className="tpl-json">{json}</pre>
          </>
        )}
      </div>
    </Modal>
  )
}

/** Cópia em rascunho, no mesmo número ou em outro (ex.: levar para a outra loja). */
export function DuplicateModal({
  template,
  onClose,
  onDone,
}: {
  template: MessageTemplate
  onClose: () => void
  onDone: (copy: MessageTemplate) => void
}) {
  const numbers = useWhatsappNumbers()
  const duplicate = useDuplicateMessageTemplate()
  const [number, setNumber] = useState(String(template.whatsapp_number))
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Só números ligados no CRM; se o do template foi desligado, cai no primeiro ligado.
  const options = (numbers.data ?? []).filter((n) => n.active)
  const selected = options.some((n) => String(n.id) === number)
    ? number
    : String(options[0]?.id ?? '')

  function submit() {
    setError(null)
    duplicate.mutate(
      { id: template.id, whatsapp_number: Number(selected), name: name || undefined },
      {
        onSuccess: onDone,
        onError: (err) => {
          const fields = err instanceof ApiError ? Object.values(err.fieldErrors).flat() : []
          setError([err.message, ...fields].join(' '))
        },
      },
    )
  }

  return (
    <Modal
      open
      titulo={`Duplicar ${template.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn sm primary"
            disabled={duplicate.isPending}
            onClick={submit}
          >
            {duplicate.isPending ? 'Duplicando…' : 'Duplicar'}
          </button>
        </>
      }
    >
      <div className="loja-form">
        {error && <MsgNok titulo="Não foi possível duplicar" mensagem={error} />}
        <div className="field">
          <label htmlFor="dup-number">Número de WhatsApp</label>
          <select id="dup-number" value={selected} onChange={(e) => setNumber(e.target.value)}>
            {options.map((n) => (
              <option key={n.id} value={n.id}>
                {n.store_code} · {n.label} · {n.display_phone_number}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="dup-name">Nome da cópia</label>
          <input
            id="dup-name"
            className="mono"
            placeholder={
              number === String(template.whatsapp_number) ? `${template.name}_copia` : template.name
            }
            value={name}
            onChange={(e) => setName(normalizeName(e.target.value))}
          />
          <span className="tpl-help muted">Vazio = nome automático. A cópia vira rascunho.</span>
        </div>
      </div>
    </Modal>
  )
}

const STATUS_OPTIONS: TemplateStatus[] = [
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'PAUSED',
  'DISABLED',
]

/**
 * Status à mão (só admin): para registrar um template aprovado fora do CRM (FastZap ou painel
 * da Meta). Os enviados pelo CRM recebem o status sozinhos, pelo webhook.
 */
export function StatusModal({
  template,
  onClose,
  onDone,
}: {
  template: MessageTemplate
  onClose: () => void
  onDone: (t: MessageTemplate) => void
}) {
  const setStatus = useSetTemplateStatus()
  const [status, setStatusValue] = useState<TemplateStatus>(template.status)
  const [metaId, setMetaId] = useState(template.meta_template_id ?? '')
  const [reason, setReason] = useState(template.rejection_reason ?? '')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    setError(null)
    setStatus.mutate(
      {
        id: template.id,
        status,
        meta_template_id: metaId || null,
        rejection_reason: status === 'REJECTED' ? reason : null,
      },
      {
        onSuccess: onDone,
        onError: (err) => {
          const fields = err instanceof ApiError ? Object.values(err.fieldErrors).flat() : []
          setError(fields.length ? fields.join(' ') : err.message)
        },
      },
    )
  }

  return (
    <Modal
      open
      titulo={`Status de ${template.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn sm primary"
            disabled={setStatus.isPending}
            onClick={submit}
          >
            {setStatus.isPending ? 'Salvando…' : 'Salvar status'}
          </button>
        </>
      }
    >
      <div className="loja-form">
        <p className="tpl-help">
          Use quando o template foi aprovado ou rejeitado fora do CRM (FastZap ou painel da Meta).
          Os enviados pelo CRM recebem o status da Meta sozinhos.
        </p>
        {error && <MsgNok titulo="Não foi possível mudar o status" mensagem={error} />}
        <div className="form-grid tight">
          <div className="field">
            <label htmlFor="st-status">Status</label>
            <select
              id="st-status"
              value={status}
              onChange={(e) => setStatusValue(e.target.value as TemplateStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="st-meta">ID do template na Meta</label>
            <input
              id="st-meta"
              inputMode="numeric"
              placeholder="Opcional"
              value={metaId}
              onChange={(e) => setMetaId(e.target.value)}
            />
          </div>
        </div>
        {status === 'REJECTED' && (
          <div className="field">
            <label htmlFor="st-reason">Motivo da rejeição</label>
            <textarea
              id="st-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}

function errorText(err: Error) {
  const fields = err instanceof ApiError ? Object.values(err.fieldErrors).flat() : []
  return [err.message, ...fields].join(' ')
}

/** Admin confirma o envio para a Meta (aprovação interna + pedido de aprovação na Meta). */
export function SubmitMetaModal({
  template,
  onClose,
  onDone,
}: {
  template: MessageTemplate
  onClose: () => void
  onDone: (t: MessageTemplate) => void
}) {
  const submit = useSubmitTemplate()
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal
      open
      titulo="Enviar para a Meta"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn sm primary"
            disabled={submit.isPending}
            onClick={() => {
              setError(null)
              submit.mutate(
                { id: template.id },
                { onSuccess: onDone, onError: (err) => setError(errorText(err)) },
              )
            }}
          >
            {submit.isPending ? 'Enviando…' : 'Aprovar e enviar'}
          </button>
        </>
      }
    >
      <div className="loja-form">
        {error && <MsgNok titulo="A Meta não aceitou o envio" mensagem={error} />}
        <p>
          Enviar <strong className="mono">{template.name}</strong> ({template.number_label}) para a
          aprovação da Meta?
        </p>
        <p className="tpl-help muted">
          {template.meta_template_id
            ? 'Este template já existe na Meta (rejeitado): ele vai como edição do mesmo template.'
            : 'O template é criado na conta (WABA) do número.'}{' '}
          Depois de enviado ele não pode ser editado; a resposta da Meta chega sozinha.
        </p>
      </div>
    </Modal>
  )
}

/** Admin devolve o pedido para o rascunho, explicando o que mudar. */
export function RejectReviewModal({
  template,
  onClose,
  onDone,
}: {
  template: MessageTemplate
  onClose: () => void
  onDone: (t: MessageTemplate) => void
}) {
  const reject = useRejectReview()
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal
      open
      titulo={`Recusar ${template.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn sm dark"
            disabled={reject.isPending || !comment.trim()}
            onClick={() => {
              setError(null)
              reject.mutate(
                { id: template.id, comment },
                { onSuccess: onDone, onError: (err) => setError(errorText(err)) },
              )
            }}
          >
            {reject.isPending ? 'Recusando…' : 'Recusar'}
          </button>
        </>
      }
    >
      <div className="loja-form">
        {error && <MsgNok titulo="Não foi possível recusar" mensagem={error} />}
        <div className="field">
          <label htmlFor="rv-comment">O que precisa mudar</label>
          <textarea
            id="rv-comment"
            rows={4}
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <span className="tpl-help muted">
            O template volta para rascunho e quem pediu vê este motivo no editor.
          </span>
        </div>
      </div>
    </Modal>
  )
}

/** Confirmação de exclusão (sem o confirm() do navegador). */
export function ConfirmDeleteModal({
  name,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  name: string
  pending: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open
      titulo="Excluir template"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn sm dark" disabled={pending} onClick={onConfirm}>
            {pending ? 'Excluindo…' : 'Excluir'}
          </button>
        </>
      }
    >
      {error && <MsgNok titulo="Não foi possível excluir" mensagem={error} />}
      <p>
        Excluir o template <strong>{name}</strong>? Isso não pode ser desfeito.
      </p>
    </Modal>
  )
}
