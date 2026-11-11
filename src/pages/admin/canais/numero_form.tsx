import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { type Path, useForm } from 'react-hook-form'
import { z } from 'zod'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { ApiError } from '../../../lib/api'
import { useStores } from '../lojas/lojas_api'
import {
  MODE_LABEL,
  type NumberMode,
  type NumberProvider,
  type NumberPurpose,
  PROVIDER_LABEL,
  PURPOSE_LABEL,
  useSaveWhatsappNumber,
  type WhatsappNumber,
} from './canais_api'

const price = z
  .string()
  .trim()
  .regex(/^(\d{1,6}([.,]\d{1,4})?)?$/, 'Use um valor como 0,54.')

/** "0,54" → "0.54"; vazio → null. */
const toPrice = (v: string) => (v ? v.replace(',', '.') : null)
/** "0.5400" → "0,54". */
const fromPrice = (v: string | null | undefined) =>
  v ? Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 4 }).replace(/\./g, '') : ''

const PRICES = [
  { name: 'price_marketing', label: 'Marketing' },
  { name: 'price_utility', label: 'Utilidade' },
  { name: 'price_authentication', label: 'Autenticação' },
] as const

const schema = z.object({
  store: z.string().min(1, 'Escolha a loja.'),
  label: z.string().trim().min(1, 'Informe um apelido.'),
  display_phone_number: z
    .string()
    .refine((v) => /^\d{10,13}$/.test(v.replace(/\D/g, '')), 'Use DDD e número.'),
  display_name: z.string().trim(),
  purpose: z.enum(['atendimento', 'ofertas', 'misto']),
  mode: z.enum(['coexistence', 'cloud_api']),
  provider: z.enum(['fastzap', 'octadesk', 'pluri', 'meta']),
  active: z.boolean(),
  waba_id: z.string().trim().regex(/^\d*$/, 'Só números.'),
  phone_number_id: z.string().trim().regex(/^\d*$/, 'Só números.'),
  business_portfolio_id: z.string().trim().regex(/^\d*$/, 'Só números.'),
  price_marketing: price,
  price_utility: price,
  price_authentication: price,
})

type FormValues = z.infer<typeof schema>

function toForm(n: WhatsappNumber | null, storeId: number | null): FormValues {
  return {
    store: n ? String(n.store) : storeId ? String(storeId) : '',
    label: n?.label ?? '',
    display_phone_number: n?.display_phone_number ?? '',
    display_name: n?.display_name ?? '',
    purpose: n?.purpose ?? 'ofertas',
    mode: n?.mode ?? 'coexistence',
    provider: n?.provider ?? 'fastzap',
    active: n?.active ?? true,
    waba_id: n?.waba_id ?? '',
    phone_number_id: n?.phone_number_id ?? '',
    business_portfolio_id: n?.business_portfolio_id ?? '',
    price_marketing: fromPrice(n?.price_marketing),
    price_utility: fromPrice(n?.price_utility),
    price_authentication: fromPrice(n?.price_authentication),
  }
}

type Props = {
  /** null = novo */
  number: WhatsappNumber | null
  /** loja já escolhida no filtro da tela (novo número) */
  storeId: number | null
  onClose: () => void
  onSaved: (n: WhatsappNumber) => void
}

/** Cadastro e edição de um número de WhatsApp. */
export default function NumeroForm({ number, storeId, onClose, onSaved }: Props) {
  const stores = useStores()
  const save = useSaveWhatsappNumber()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toForm(number, storeId),
  })

  function onSubmit(values: FormValues) {
    setError(null)
    const data = {
      ...values,
      store: Number(values.store),
      display_name: values.display_name || null,
      waba_id: values.waba_id || null,
      phone_number_id: values.phone_number_id || null,
      business_portfolio_id: values.business_portfolio_id || null,
      price_marketing: toPrice(values.price_marketing),
      price_utility: toPrice(values.price_utility),
      price_authentication: toPrice(values.price_authentication),
    }
    save.mutate(
      { id: number?.id, data },
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
            setError('Não foi possível salvar o número.')
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
      titulo={number ? `Editar ${number.label}` : 'Novo número de WhatsApp'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form="numero-form"
            className="btn sm primary"
            disabled={save.isPending}
          >
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="numero-form" className="canais-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {error && <MsgNok titulo="Não foi possível salvar" mensagem={error} />}

        <fieldset className="canais-fieldset">
          <legend>Número</legend>
          <div className="form-grid tight">
            <div className="field">
              <label htmlFor="num-store">Loja</label>
              <select id="num-store" {...register('store')}>
                <option value="">Selecione</option>
                {(stores.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
              </select>
              {fieldError('store')}
            </div>
            <div className="field">
              <label htmlFor="num-label">Apelido</label>
              <input id="num-label" placeholder="Ofertas JF" {...register('label')} />
              {fieldError('label')}
            </div>
            <div className="field">
              <label htmlFor="num-phone">Número</label>
              <input
                id="num-phone"
                inputMode="tel"
                placeholder="+55 32 99999-0000"
                {...register('display_phone_number')}
              />
              {fieldError('display_phone_number')}
            </div>
            <div className="field">
              <label htmlFor="num-display">Nome de exibição</label>
              <input
                id="num-display"
                placeholder="Nome que o cliente vê"
                {...register('display_name')}
              />
            </div>
          </div>
          <div className="form-grid tighter">
            <div className="field">
              <label htmlFor="num-purpose">Uso</label>
              <select id="num-purpose" {...register('purpose')}>
                {(Object.keys(PURPOSE_LABEL) as NumberPurpose[]).map((k) => (
                  <option key={k} value={k}>
                    {PURPOSE_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="num-mode">Modo</label>
              <select id="num-mode" {...register('mode')}>
                {(Object.keys(MODE_LABEL) as NumberMode[]).map((k) => (
                  <option key={k} value={k}>
                    {MODE_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="num-provider">Quem envia</label>
              <select id="num-provider" {...register('provider')}>
                {(Object.keys(PROVIDER_LABEL) as NumberProvider[]).map((k) => (
                  <option key={k} value={k}>
                    {PROVIDER_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="canais-fieldset">
          <legend>Meta</legend>
          <p className="muted canais-hint">
            Ficam no Gerenciador do WhatsApp (business.facebook.com). A WABA é necessária para
            mandar templates para aprovação.
          </p>
          <div className="form-grid tighter">
            <div className="field">
              <label htmlFor="num-waba">WABA ID</label>
              <input id="num-waba" inputMode="numeric" {...register('waba_id')} />
              {fieldError('waba_id')}
            </div>
            <div className="field">
              <label htmlFor="num-pnid">Phone number ID</label>
              <input id="num-pnid" inputMode="numeric" {...register('phone_number_id')} />
              {fieldError('phone_number_id')}
            </div>
            <div className="field">
              <label htmlFor="num-bp">Portfólio (Business ID)</label>
              <input id="num-bp" inputMode="numeric" {...register('business_portfolio_id')} />
              {fieldError('business_portfolio_id')}
            </div>
          </div>
        </fieldset>

        <fieldset className="canais-fieldset">
          <legend>Custo por mensagem (R$)</legend>
          <p className="muted canais-hint">
            Preço de cada mensagem de template enviada por este número, conforme a tabela da Meta ou
            do parceiro. É o investimento nos resultados e relatórios das campanhas.
          </p>
          <div className="form-grid tighter">
            {PRICES.map((p) => (
              <div key={p.name} className="field">
                <label htmlFor={`num-${p.name}`}>{p.label}</label>
                <input
                  id={`num-${p.name}`}
                  inputMode="decimal"
                  placeholder="0,00"
                  {...register(p.name)}
                />
                {fieldError(p.name)}
              </div>
            ))}
          </div>
        </fieldset>

        <label className="check">
          <input type="checkbox" {...register('active')} />
          Ativo no CRM (desligado, o número não aparece para novos templates e campanhas)
        </label>
      </form>
    </Modal>
  )
}
