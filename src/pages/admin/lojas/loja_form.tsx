import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { type Path, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { ApiError } from '../../../lib/api'
import { formatCep, formatCnpj, onlyDigits } from '../../../lib/format'
import { type Store, useCities, useSaveStore, useStates } from './lojas_api'

const schema = z.object({
  code: z.string().trim().min(1, 'Informe a sigla.').max(10, 'Use no máximo 10 caracteres.'),
  name: z.string().trim().min(1, 'Informe o nome fantasia.'),
  corporate: z.string().trim().min(1, 'Informe a razão social.'),
  cnpj: z.string().refine((v) => onlyDigits(v).length === 14, 'O CNPJ tem 14 dígitos.'),
  ie: z.string().trim(),
  email: z.union([z.literal(''), z.email('E-mail inválido.')]),
  address: z.string().trim(),
  cep: z.string().refine((v) => [0, 8].includes(onlyDigits(v).length), 'O CEP tem 8 dígitos.'),
  state: z.string(),
  city: z.string(),
  is_headquarters: z.boolean(),
  active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

function toForm(store: Store | null): FormValues {
  return {
    code: store?.code ?? '',
    name: store?.name ?? '',
    corporate: store?.corporate ?? '',
    cnpj: formatCnpj(store?.cnpj),
    ie: store?.ie ?? '',
    email: store?.email ?? '',
    address: store?.address ?? '',
    cep: formatCep(store?.cep),
    state: store?.state ? String(store.state) : '',
    city: store?.city ? String(store.city) : '',
    is_headquarters: store?.is_headquarters ?? false,
    active: store?.active ?? true,
  }
}

type LojaFormProps = {
  /** null = nova loja */
  store: Store | null
  onClose: () => void
  onSaved: (store: Store) => void
}

export default function LojaForm({ store, onClose, onSaved }: LojaFormProps) {
  const save = useSaveStore()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError: setFieldError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(store) })

  // Selects controlados: as opções chegam da API depois que o formulário abre.
  const stateId = useWatch({ control, name: 'state' })
  const cityId = useWatch({ control, name: 'city' })
  const states = useStates()
  const cities = useCities(stateId ? Number(stateId) : null)

  function onSubmit(values: FormValues) {
    setError(null)
    const data = {
      code: values.code,
      name: values.name,
      corporate: values.corporate,
      cnpj: onlyDigits(values.cnpj),
      ie: values.ie || null,
      email: values.email || null,
      address: values.address || null,
      cep: onlyDigits(values.cep) || null,
      state: values.state ? Number(values.state) : null,
      city: values.city ? Number(values.city) : null,
      is_headquarters: values.is_headquarters,
      active: values.active,
    }
    save.mutate(
      { id: store?.id, data },
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
            setError('Não foi possível salvar a loja.')
          }
        },
      },
    )
  }

  const fieldError = (name: keyof FormValues) =>
    errors[name] && (
      <span className="loja-form-error" role="alert">
        {errors[name]?.message}
      </span>
    )

  const cnpjField = register('cnpj')
  const cepField = register('cep')
  const stateField = register('state')

  return (
    <Modal
      open
      titulo={store ? `Editar loja ${store.code}` : 'Adicionar loja'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form="loja-form"
            className="btn sm primary"
            disabled={save.isPending}
          >
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="loja-form" className="loja-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {error && <MsgNok titulo="Não foi possível salvar" mensagem={error} />}

        <div className="form-grid tight">
          <div className="field">
            <label htmlFor="loja-code">Sigla</label>
            <input id="loja-code" placeholder="JF" {...register('code')} />
            {fieldError('code')}
          </div>
          <div className="field">
            <label htmlFor="loja-name">Nome fantasia</label>
            <input id="loja-name" placeholder="Invictus Juiz de Fora" {...register('name')} />
            {fieldError('name')}
          </div>
        </div>

        <div className="form-grid tight">
          <div className="field">
            <label htmlFor="loja-corporate">Razão social</label>
            <input id="loja-corporate" {...register('corporate')} />
            {fieldError('corporate')}
          </div>
          <div className="field">
            <label htmlFor="loja-cnpj">CNPJ</label>
            <input
              id="loja-cnpj"
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              {...cnpjField}
              onChange={(e) => {
                e.target.value = formatCnpj(e.target.value)
                cnpjField.onChange(e)
              }}
            />
            {fieldError('cnpj')}
          </div>
          <div className="field">
            <label htmlFor="loja-ie">Inscrição estadual</label>
            <input id="loja-ie" {...register('ie')} />
            {fieldError('ie')}
          </div>
        </div>

        <div className="form-grid tight">
          <div className="field">
            <label htmlFor="loja-email">E-mail</label>
            <input id="loja-email" type="email" {...register('email')} />
            {fieldError('email')}
          </div>
          <div className="field">
            <label htmlFor="loja-cep">CEP</label>
            <input
              id="loja-cep"
              inputMode="numeric"
              placeholder="00000-000"
              {...cepField}
              onChange={(e) => {
                e.target.value = formatCep(e.target.value)
                cepField.onChange(e)
              }}
            />
            {fieldError('cep')}
          </div>
        </div>

        <div className="field">
          <label htmlFor="loja-address">Endereço</label>
          <input
            id="loja-address"
            placeholder="Rua, número, complemento · bairro"
            {...register('address')}
          />
          {fieldError('address')}
        </div>

        <div className="form-grid tight">
          <div className="field">
            <label htmlFor="loja-state">UF</label>
            <select
              id="loja-state"
              {...stateField}
              value={stateId}
              onChange={(e) => {
                stateField.onChange(e)
                setValue('city', '')
              }}
            >
              <option value="">Selecione</option>
              {states.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.state}
                </option>
              ))}
            </select>
            {fieldError('state')}
          </div>
          <div className="field">
            <label htmlFor="loja-city">Cidade</label>
            <select
              id="loja-city"
              disabled={!stateId || cities.isPending}
              {...register('city')}
              value={cityId}
            >
              <option value="">{stateId ? 'Selecione' : 'Escolha a UF primeiro'}</option>
              {cities.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.city}
                </option>
              ))}
            </select>
            {fieldError('city')}
          </div>
        </div>

        <div className="loja-form-checks">
          <label className="check">
            <input type="checkbox" {...register('is_headquarters')} />É a matriz
          </label>
          <label className="check">
            <input type="checkbox" {...register('active')} />
            Loja ativa
          </label>
        </div>
      </form>
    </Modal>
  )
}
