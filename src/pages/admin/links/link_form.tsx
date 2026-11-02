import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { type Path, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { ApiError } from '../../../lib/api'
import { useStores } from '../lojas/lojas_api'
import { slugify, type TrackedLink, useSaveLink } from './links_api'

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do link.'),
  purpose: z.string().trim(),
  store: z.string(),
  destination_url: z.string().trim().min(1, 'Informe para onde o link leva.'),
  code: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === '' || /^[a-z0-9][a-z0-9-]{2,39}$/.test(v), {
      message: 'De 3 a 40 letras minúsculas, números ou hífen.',
    }),
  append_utm: z.boolean(),
  utm_source: z.string().trim(),
  utm_medium: z.string().trim(),
  utm_campaign: z.string().trim(),
  utm_content: z.string().trim(),
  active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

function toForm(l: TrackedLink | null): FormValues {
  return {
    name: l?.name ?? '',
    purpose: l?.purpose ?? '',
    store: l?.store ? String(l.store) : '',
    destination_url: l?.destination_url ?? '',
    code: l?.code ?? '',
    append_utm: l?.append_utm ?? true,
    utm_source: l?.utm_source ?? (l ? '' : 'whatsapp'),
    utm_medium: l?.utm_medium ?? (l ? '' : 'campanha'),
    utm_campaign: l?.utm_campaign ?? '',
    utm_content: l?.utm_content ?? '',
    active: l?.active ?? true,
  }
}

/** Destino direto do WhatsApp: não leva UTM (o WhatsApp ignora e o link fica feio). */
function isWhatsappUrl(url: string): boolean {
  return /(^|\/\/)(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)/i.test(url)
}

type Props = {
  /** null = novo */
  link: TrackedLink | null
  onClose: () => void
  onSaved: (l: TrackedLink) => void
}

/** Cadastro e edição de um link curto. O código não muda depois de criado. */
export default function LinkForm({ link, onClose, onSaved }: Props) {
  const stores = useStores()
  const save = useSaveLink()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    setError: setFieldError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(link) })
  const appendUtm = useWatch({ control, name: 'append_utm' })

  function onSubmit(values: FormValues) {
    setError(null)
    const data = {
      name: values.name,
      purpose: values.purpose || null,
      store: values.store ? Number(values.store) : null,
      destination_url: values.destination_url,
      append_utm: values.append_utm,
      utm_source: values.utm_source || null,
      utm_medium: values.utm_medium || null,
      utm_campaign: values.utm_campaign || null,
      utm_content: values.utm_content || null,
      active: values.active,
      ...(link ? {} : { code: values.code }),
    }
    save.mutate(
      { id: link?.id, data },
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
            setError('Não foi possível salvar o link.')
          }
        },
      },
    )
  }

  const fieldError = (name: keyof FormValues) =>
    errors[name] && (
      <span className="links-error" role="alert">
        {errors[name]?.message}
      </span>
    )

  return (
    <Modal
      open
      titulo={link ? `Editar ${link.name}` : 'Novo link'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form="link-form"
            className="btn sm primary"
            disabled={save.isPending}
          >
            {save.isPending ? 'Salvando…' : link ? 'Salvar' : 'Criar link'}
          </button>
        </>
      }
    >
      <form id="link-form" className="links-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {error && <MsgNok titulo="Não foi possível salvar" mensagem={error} />}

        <fieldset className="links-fieldset">
          <legend>Link</legend>
          <div className="form-grid tight">
            <div className="field">
              <label htmlFor="lnk-name">Nome</label>
              <input
                id="lnk-name"
                placeholder="Direcionamento atendimento BH"
                {...register('name', {
                  onBlur: () => {
                    // Sugere a campanha da UTM a partir do nome, se ainda estiver vazia.
                    if (!getValues('utm_campaign') && getValues('name')) {
                      setValue('utm_campaign', slugify(getValues('name')))
                    }
                  },
                })}
              />
              {fieldError('name')}
            </div>
            <div className="field">
              <label htmlFor="lnk-store">Loja</label>
              <select id="lnk-store" {...register('store')}>
                <option value="">Todas as lojas</option>
                {(stores.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="lnk-purpose">Para que serve</label>
            <textarea
              id="lnk-purpose"
              rows={2}
              placeholder="Campanhas do WhatsApp: leva o cliente para o número de atendimento."
              {...register('purpose')}
            />
          </div>
          <div className="field">
            <label htmlFor="lnk-dest">Link de destino</label>
            <input
              id="lnk-dest"
              inputMode="url"
              placeholder="https://atendimentojf.meialuadbarreto.com.br"
              {...register('destination_url', {
                onBlur: () => {
                  if (!link && isWhatsappUrl(getValues('destination_url'))) {
                    setValue('append_utm', false)
                  }
                },
              })}
            />
            {fieldError('destination_url')}
          </div>
          <div className="field">
            <label htmlFor="lnk-code">Código do link curto</label>
            {link ? (
              <input id="lnk-code" value={link.short_url} readOnly className="mono" />
            ) : (
              <input
                id="lnk-code"
                className="mono"
                placeholder="Vazio = o sistema gera (ex.: k7m2xq)"
                autoCapitalize="none"
                {...register('code')}
              />
            )}
            {fieldError('code')}
            <span className="muted links-hint">
              {link
                ? 'O código não muda: o link já pode ter sido divulgado. O destino pode mudar.'
                : 'Opcional. Ex.: "bf-jf" vira link.meialuadbarreto.com.br/l/bf-jf.'}
            </span>
          </div>
        </fieldset>

        <fieldset className="links-fieldset">
          <legend>Rastreamento (UTM)</legend>
          <label className="check">
            <input type="checkbox" {...register('append_utm')} />
            Adicionar as UTMs e o código do link ao destino
          </label>
          {appendUtm ? (
            <div className="form-grid tight">
              <div className="field">
                <label htmlFor="lnk-src">Origem (utm_source)</label>
                <input id="lnk-src" placeholder="whatsapp" {...register('utm_source')} />
              </div>
              <div className="field">
                <label htmlFor="lnk-med">Mídia (utm_medium)</label>
                <input id="lnk-med" placeholder="campanha" {...register('utm_medium')} />
              </div>
              <div className="field">
                <label htmlFor="lnk-camp">Campanha (utm_campaign)</label>
                <input id="lnk-camp" placeholder="atendimento-bh" {...register('utm_campaign')} />
              </div>
              <div className="field">
                <label htmlFor="lnk-cont">Conteúdo (utm_content)</label>
                <input id="lnk-cont" placeholder="Opcional" {...register('utm_content')} />
              </div>
            </div>
          ) : (
            <p className="muted links-hint">
              O cliente vai para o destino como está. Use em link direto do WhatsApp (wa.me ou
              chat.whatsapp.com). O clique continua sendo contado.
            </p>
          )}
        </fieldset>

        {link && (
          <label className="check">
            <input type="checkbox" {...register('active')} />
            Link ativo (desativado, o cliente vai para o site da loja e não conta clique)
          </label>
        )}
      </form>
    </Modal>
  )
}
