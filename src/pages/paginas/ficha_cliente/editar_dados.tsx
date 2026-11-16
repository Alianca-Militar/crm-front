import { type FormEvent, useState } from 'react'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { ApiError } from '../../../lib/api'
import { formatCep, formatCpf } from '../../../lib/format'
import { useCities, useStates } from '../../admin/lojas/lojas_api'
import { type Customer, useSaveCustomer } from '../clientes/clientes_api'

type Values = {
  name: string
  cpf: string
  email: string
  birth_date: string
  cep: string
  address: string
  numero: string
  complemento: string
  state: string
  city: string
}

function initial(c: Customer): Values {
  return {
    name: c.name ?? '',
    cpf: c.cpf ? formatCpf(c.cpf) : '',
    email: c.email ?? '',
    birth_date: c.birth_date ?? '',
    cep: c.cep ? formatCep(c.cep) : '',
    address: c.address ?? '',
    numero: c.numero ?? '',
    complemento: c.complemento ?? '',
    state: c.state ? String(c.state) : '',
    city: c.city ? String(c.city) : '',
  }
}

/** Lápis do card Dados. O backend confere CPF/CNPJ, e-mail e CEP e guarda no log o que mudou. */
export default function EditarDados({
  customer,
  onClose,
}: {
  customer: Customer
  onClose: () => void
}) {
  const save = useSaveCustomer(customer.id)
  const [v, setV] = useState<Values>(() => initial(customer))
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const states = useStates()
  const cities = useCities(v.state ? Number(v.state) : null)

  const set = (field: keyof Values) => (value: string) =>
    setV((old) => ({ ...old, [field]: value }))

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setErrors({})
    setError(null)
    save.mutate(
      {
        name: v.name.trim(),
        cpf: v.cpf,
        email: v.email,
        birth_date: v.birth_date || null,
        cep: v.cep,
        address: v.address,
        numero: v.numero,
        complemento: v.complemento,
        city: v.city ? Number(v.city) : null,
      },
      {
        onSuccess: onClose,
        onError: (err) => {
          if (err instanceof ApiError) {
            setErrors(err.fieldErrors)
            setError(err.message)
          } else {
            setError('Não foi possível salvar.')
          }
        },
      },
    )
  }

  const fieldError = (name: string) =>
    errors[name] && (
      <span className="ficha-edit-error" role="alert">
        {errors[name].join(' ')}
      </span>
    )

  const text = (name: keyof Values, label: string, props: Record<string, string> = {}) => (
    <div className="field">
      <label htmlFor={`cliente-${name}`}>{label}</label>
      <input
        id={`cliente-${name}`}
        value={v[name]}
        onChange={(e) => set(name)(e.target.value)}
        aria-invalid={errors[name] ? true : undefined}
        {...props}
      />
      {fieldError(name)}
    </div>
  )

  return (
    <Modal
      open
      titulo="Editar dados do cliente"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form="cliente-dados"
            className="btn sm primary"
            disabled={save.isPending}
          >
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      {error && <MsgNok titulo="Não foi possível salvar" mensagem={error} />}
      <form id="cliente-dados" className="form-grid tight" onSubmit={onSubmit} noValidate>
        {text('name', 'Nome', { autoComplete: 'off' })}
        {text('cpf', 'CPF/CNPJ', { inputMode: 'numeric', placeholder: '000.000.000-00' })}
        {text('birth_date', 'Nascimento', { type: 'date' })}
        {text('email', 'E-mail', { type: 'email', autoComplete: 'off' })}
        {text('cep', 'CEP', { inputMode: 'numeric', placeholder: '00000-000' })}
        {text('address', 'Endereço')}
        {text('numero', 'Número')}
        {text('complemento', 'Complemento')}
        <div className="field">
          <label htmlFor="cliente-state">UF</label>
          <select
            id="cliente-state"
            value={v.state}
            onChange={(e) => setV((old) => ({ ...old, state: e.target.value, city: '' }))}
          >
            <option value="">—</option>
            {states.data?.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.code}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cliente-city">Cidade</label>
          <select
            id="cliente-city"
            value={v.city}
            disabled={!v.state || cities.isPending}
            onChange={(e) => set('city')(e.target.value)}
          >
            <option value="">—</option>
            {cities.data?.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.city}
              </option>
            ))}
          </select>
          {fieldError('city')}
        </div>
      </form>
      <p className="muted ficha-edit-note">
        Se o cadastro mudar no sistema da loja, a próxima importação traz os dados de lá.
      </p>
    </Modal>
  )
}
