import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { type Path, useForm } from 'react-hook-form'
import { z } from 'zod'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { ApiError } from '../../../lib/api'
import { useStores } from '../lojas/lojas_api'
import {
  type EmailSender,
  SENDER_PROVIDER_LABEL,
  SENDER_PURPOSE_LABEL,
  SENDER_STATUS_LABEL,
  type SenderProvider,
  type SenderPurpose,
  type SenderStatus,
  useSaveEmailSender,
} from './canais_api'

const schema = z.object({
  store: z.string(),
  label: z.string().trim().min(1, 'Informe um apelido.'),
  from_name: z.string().trim().min(1, 'Informe o nome que aparece no “De:”.'),
  from_email: z.email('E-mail inválido.'),
  reply_to: z.union([z.literal(''), z.email('E-mail inválido.')]),
  purpose: z.enum(['marketing', 'transactional']),
  provider: z.enum(['zeptomail', 'smtp']),
  status: z.enum(['pending', 'active', 'inactive']),
  is_default: z.boolean(),
  notes: z.string().trim(),
})

type FormValues = z.infer<typeof schema>

function toForm(s: EmailSender | null): FormValues {
  return {
    store: s?.store ? String(s.store) : '',
    label: s?.label ?? '',
    from_name: s?.from_name ?? '',
    from_email: s?.from_email ?? '',
    reply_to: s?.reply_to ?? '',
    purpose: s?.purpose ?? 'marketing',
    provider: s?.provider ?? 'zeptomail',
    status: s?.status ?? 'pending',
    is_default: s?.is_default ?? false,
    notes: s?.notes ?? '',
  }
}

type Props = {
  /** null = novo */
  sender: EmailSender | null
  onClose: () => void
  onSaved: (s: EmailSender) => void
}

/** Cadastro e edição de um remetente de e-mail. */
export default function RemetenteForm({ sender, onClose, onSaved }: Props) {
  const stores = useStores()
  const save = useSaveEmailSender()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(sender) })

  function onSubmit(values: FormValues) {
    setError(null)
    const data = {
      ...values,
      store: values.store ? Number(values.store) : null,
      reply_to: values.reply_to || null,
      notes: values.notes || null,
    }
    save.mutate(
      { id: sender?.id, data },
      {
        onSuccess: onSaved,
        onError: (err) => {
          if (err instanceof ApiError) {
            for (const [field, messages] of Object.entries(err.fieldErrors)) {
              if (field in schema.shape) {
                setFieldError(field as Path<FormValues>, { message: messages.join(' ') })
              }
            }
            setError(err.message)
          } else {
            setError('Não foi possível salvar o remetente.')
          }
        },
      },
    )
  }

  const fieldError = (name: keyof FormValues) =>
    errors[name] && (
      <span className="canais-error" role="alert">
        {errors[name]?.message}
      </span>
    )

  return (
    <Modal
      open
      titulo={sender ? `Editar ${sender.label}` : 'Novo remetente de e-mail'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form="remetente-form"
            className="btn sm primary"
            disabled={save.isPending}
          >
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form
        id="remetente-form"
        className="canais-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        {error && <MsgNok titulo="Não foi possível salvar" mensagem={error} />}

        <fieldset className="canais-fieldset">
          <legend>Remetente</legend>
          <div className="form-grid tight">
            <div className="field">
              <label htmlFor="snd-label">Apelido</label>
              <input id="snd-label" placeholder="Marketing JF" {...register('label')} />
              {fieldError('label')}
            </div>
            <div className="field">
              <label htmlFor="snd-store">Loja</label>
              <select id="snd-store" {...register('store')}>
                <option value="">Todas as lojas</option>
                {(stores.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="snd-name">Nome no “De:”</label>
              <input id="snd-name" placeholder="Invictus Juiz de Fora" {...register('from_name')} />
              {fieldError('from_name')}
            </div>
            <div className="field">
              <label htmlFor="snd-email">E-mail do remetente</label>
              <input
                id="snd-email"
                type="email"
                placeholder="ofertas@seudominio.com.br"
                {...register('from_email')}
              />
              {fieldError('from_email')}
            </div>
            <div className="field">
              <label htmlFor="snd-reply">Responder para</label>
              <input
                id="snd-reply"
                type="email"
                placeholder="Opcional: onde chegam as respostas"
                {...register('reply_to')}
              />
              {fieldError('reply_to')}
            </div>
          </div>
          <p className="muted canais-hint">
            O domínio do e-mail precisa estar verificado na ZeptoMail. O token e a senha continuam
            só no servidor (.env), não aqui.
          </p>
        </fieldset>

        <fieldset className="canais-fieldset">
          <legend>Uso</legend>
          <div className="form-grid tighter">
            <div className="field">
              <label htmlFor="snd-purpose">Tipo de e-mail</label>
              <select id="snd-purpose" {...register('purpose')}>
                {(Object.keys(SENDER_PURPOSE_LABEL) as SenderPurpose[]).map((k) => (
                  <option key={k} value={k}>
                    {SENDER_PURPOSE_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="snd-provider">Envio por</label>
              <select id="snd-provider" {...register('provider')}>
                {(Object.keys(SENDER_PROVIDER_LABEL) as SenderProvider[]).map((k) => (
                  <option key={k} value={k}>
                    {SENDER_PROVIDER_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="snd-status">Status</label>
              <select id="snd-status" {...register('status')}>
                {(Object.keys(SENDER_STATUS_LABEL) as SenderStatus[]).map((k) => (
                  <option key={k} value={k}>
                    {SENDER_STATUS_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="check">
            <input type="checkbox" {...register('is_default')} />
            Remetente padrão deste tipo de e-mail
          </label>
          <div className="field">
            <label htmlFor="snd-notes">Observações</label>
            <textarea id="snd-notes" rows={2} {...register('notes')} />
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
