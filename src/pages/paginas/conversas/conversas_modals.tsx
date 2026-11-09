import { useState } from 'react'
import Modal from '../../../components/modal/modal'
import { ROLE_LABEL } from '../../../lib/auth'
import { formatPhone, onlyDigits } from '../../../lib/format'
import type { TransferTarget } from './conversas_api'
import {
  CLIENTES,
  type ClienteBase,
  CLOSE_REASONS,
  type Conversa,
  NUMBERS,
  STORES,
  TEMPLATES,
} from './mocks'
import { fillTemplate } from './conversas_utils'

const firstName = (name: string) => name.replace(/^[\dº.\s]*[A-Za-zº]+\.\s*/, '').split(' ')[0]

type TransferProps = {
  open: boolean
  /** Usuários ativos que atendem a loja do número (sem quem já está com a conversa). */
  users: TransferTarget[] | undefined
  busy: boolean
  onClose: () => void
  onConfirm: (user: TransferTarget) => void
}

export function TransferModal({ open, users, busy, onClose, onConfirm }: TransferProps) {
  const [userId, setUserId] = useState('')
  const options = users ?? []
  const chosen = options.find((u) => String(u.id) === userId)

  return (
    <Modal
      open={open}
      titulo="Transferir conversa"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn sm dark"
            disabled={!chosen || busy}
            onClick={() => chosen && onConfirm(chosen)}
          >
            Transferir
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="conv-transfer">Para quem?</label>
        <select id="conv-transfer" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">{users ? 'Escolha um usuário' : 'Carregando…'}</option>
          {options.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {ROLE_LABEL[u.role]}
            </option>
          ))}
        </select>
      </div>
      <p className="muted conv-modal-hint">
        A conversa vai para as Abertas de quem receber, com o histórico completo.
      </p>
    </Modal>
  )
}

type CloseProps = {
  open: boolean
  busy: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

export function CloseModal({ open, busy, onClose, onConfirm }: CloseProps) {
  const [reason, setReason] = useState('')
  const [other, setOther] = useState('')
  const final = reason === 'Outro' ? other.trim() && `Outro: ${other.trim()}` : reason

  return (
    <Modal
      open={open}
      titulo="Encerrar conversa"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn sm dark"
            disabled={!final || busy}
            onClick={() => final && onConfirm(final)}
          >
            Encerrar
          </button>
        </>
      }
    >
      <fieldset className="conv-reasons">
        <legend className="field-label">Motivo</legend>
        {CLOSE_REASONS.map((r) => (
          <label key={r} className="check">
            <input
              type="radio"
              name="conv-reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
            />
            {r}
          </label>
        ))}
      </fieldset>
      {reason === 'Outro' && (
        <div className="field">
          <label htmlFor="conv-reason-other">Qual?</label>
          <input
            id="conv-reason-other"
            value={other}
            maxLength={120}
            onChange={(e) => setOther(e.target.value)}
          />
        </div>
      )}
      <p className="muted conv-modal-hint">
        Se o cliente escrever de novo, abre uma conversa nova em Aguardando.
      </p>
    </Modal>
  )
}

function TemplatePicker({
  template,
  setTemplate,
  values,
}: {
  template: string
  setTemplate: (name: string) => void
  values: Record<string, string>
}) {
  const chosen = TEMPLATES.find((t) => t.name === template)
  return (
    <>
      <div className="field">
        <label htmlFor="conv-template">Template aprovado</label>
        <select id="conv-template" value={template} onChange={(e) => setTemplate(e.target.value)}>
          <option value="">Escolha um template</option>
          {TEMPLATES.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} · {t.category}
            </option>
          ))}
        </select>
      </div>
      {chosen && (
        <div className="conv-template-preview">
          <span className="field-label">Prévia</span>
          <div className="conversas-bubble">{fillTemplate(chosen.body, values)}</div>
        </div>
      )}
    </>
  )
}

type TemplateProps = {
  conversa: Conversa | null
  onClose: () => void
  onConfirm: (text: string, template: string) => void
}

export function TemplateModal({ conversa, onClose, onConfirm }: TemplateProps) {
  const [template, setTemplate] = useState('')
  const chosen = TEMPLATES.find((t) => t.name === template)
  const values: Record<string, string> = conversa
    ? { nome: firstName(conversa.name), loja: conversa.store }
    : {}

  return (
    <Modal
      open={conversa !== null}
      titulo="Enviar template"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn sm primary"
            disabled={!chosen}
            onClick={() => chosen && onConfirm(fillTemplate(chosen.body, values), chosen.name)}
          >
            Enviar
          </button>
        </>
      }
    >
      <p className="muted conv-modal-hint">
        Fora da janela de 24h a Meta só aceita template aprovado. Cada envio é cobrado pela Meta.
      </p>
      <TemplatePicker template={template} setTemplate={setTemplate} values={values} />
    </Modal>
  )
}

export type NewConversation = {
  customerId: number | null
  name: string
  phone: string
  store: string
  number: string
  template: string
  text: string
}

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Telefone digitado → só DDD + número, sem o 55. */
function localPhone(value: string): string {
  const digits = onlyDigits(value)
  return digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits
}

function searchCustomers(query: string): ClienteBase[] {
  const q = plain(query.trim())
  const digits = onlyDigits(query)
  if (q.length < 3) return []
  return CLIENTES.filter(
    (c) =>
      plain(c.name).includes(q) ||
      (digits.length >= 3 && (c.phone.includes(digits) || onlyDigits(c.cpf).includes(digits))),
  ).slice(0, 6)
}

const firstNumberOf = (store: string) => NUMBERS.find((n) => n.store === store)?.label

type StartProps = {
  open: boolean
  onClose: () => void
  onConfirm: (data: NewConversation) => void
}

export function StartModal({ open, onClose, onConfirm }: StartProps) {
  const [mode, setMode] = useState<'base' | 'new'>('base')
  const [query, setQuery] = useState('')
  const [customer, setCustomer] = useState<ClienteBase | null>(null)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [number, setNumber] = useState(NUMBERS[0].label)
  const [template, setTemplate] = useState('')

  const results = customer ? [] : searchCustomers(query)
  const phone = localPhone(newPhone)
  const phoneOk = phone.length === 10 || phone.length === 11
  // Número digitado que já está na base: oferece usar o cadastro.
  const known = mode === 'new' && phoneOk ? CLIENTES.find((c) => c.phone === phone) : undefined
  const store = NUMBERS.find((n) => n.label === number)?.store ?? STORES[0]
  const chosen = TEMPLATES.find((t) => t.name === template)
  const name = mode === 'base' ? (customer?.name ?? '') : newName.trim()
  const values = { nome: name ? firstName(name) : 'cliente', loja: store }
  const ready = Boolean(chosen && (mode === 'base' ? customer : phoneOk))

  function pick(c: ClienteBase) {
    setCustomer(c)
    setMode('base')
    setNumber(firstNumberOf(c.store) ?? number)
  }

  function confirm() {
    if (!chosen) return
    const data = { store, number, template: chosen.name, text: fillTemplate(chosen.body, values) }
    if (mode === 'base' && customer) {
      onConfirm({
        ...data,
        customerId: customer.id,
        name: customer.name,
        phone: formatPhone(customer.phone),
      })
    } else if (mode === 'new' && phoneOk) {
      const shown = formatPhone(phone)
      onConfirm({ ...data, customerId: null, name: newName.trim() || shown, phone: shown })
    }
  }

  return (
    <Modal
      open={open}
      titulo="Iniciar conversa"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn sm primary" disabled={!ready} onClick={confirm}>
            Enviar
          </button>
        </>
      }
    >
      <div className="seg-tabs conv-start-tabs" role="tablist" aria-label="Com quem">
        <button
          type="button"
          role="tab"
          className="seg-tab"
          aria-selected={mode === 'base'}
          onClick={() => setMode('base')}
        >
          Cliente da base
        </button>
        <button
          type="button"
          role="tab"
          className="seg-tab"
          aria-selected={mode === 'new'}
          onClick={() => setMode('new')}
        >
          Número novo
        </button>
      </div>

      {mode === 'base' &&
        (customer ? (
          <div className="conv-start-chosen">
            <div>
              <strong>{customer.name}</strong>
              <span className="muted">
                {formatPhone(customer.phone)} · {customer.store}
              </span>
            </div>
            <button type="button" className="btn sm" onClick={() => setCustomer(null)}>
              Trocar
            </button>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="conv-start-search">Buscar cliente</label>
            <input
              id="conv-start-search"
              type="search"
              placeholder="Nome, CPF ou telefone"
              value={query}
              autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
            />
            {query.trim().length >= 3 &&
              (results.length > 0 ? (
                <ul className="conv-start-results">
                  {results.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => pick(c)}>
                        <strong>{c.name}</strong>
                        <span className="muted">
                          {formatPhone(c.phone)} · CPF {c.cpf} · {c.store}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted conv-modal-hint">
                  Nenhum cliente encontrado.{' '}
                  <button type="button" className="conv-link" onClick={() => setMode('new')}>
                    Iniciar com um número novo
                  </button>
                </p>
              ))}
          </div>
        ))}

      {mode === 'new' && (
        <>
          <div className="field">
            <label htmlFor="conv-start-phone">WhatsApp com DDD</label>
            <input
              id="conv-start-phone"
              type="tel"
              inputMode="numeric"
              placeholder="(31) 99999-9999"
              value={newPhone}
              autoComplete="off"
              aria-invalid={newPhone !== '' && !phoneOk}
              onChange={(e) => setNewPhone(e.target.value)}
              onBlur={() => phoneOk && setNewPhone(formatPhone(phone))}
            />
            {newPhone !== '' && !phoneOk && (
              <span className="muted conv-modal-hint">
                Digite o DDD e o número (10 ou 11 dígitos).
              </span>
            )}
          </div>
          {known ? (
            <p className="conv-start-known">
              Esse número já é de <strong>{known.name}</strong>.{' '}
              <button type="button" className="conv-link" onClick={() => pick(known)}>
                Usar o cadastro
              </button>
            </p>
          ) : (
            <div className="field">
              <label htmlFor="conv-start-name">Nome (opcional)</label>
              <input
                id="conv-start-name"
                value={newName}
                maxLength={80}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          )}
        </>
      )}

      <div className="field">
        <label htmlFor="conv-start-number">Enviar pelo número</label>
        <select id="conv-start-number" value={number} onChange={(e) => setNumber(e.target.value)}>
          {NUMBERS.map((n) => (
            <option key={n.label} value={n.label}>
              {n.label} · {n.store}
            </option>
          ))}
        </select>
      </div>
      <TemplatePicker template={template} setTemplate={setTemplate} values={values} />
      <p className="muted conv-modal-hint">
        A primeira mensagem tem que ser um template aprovado. A conversa abre em Abertas, com você
        como responsável. Quando o cliente responder, a janela de 24h abre e dá para escrever
        livremente.
      </p>
    </Modal>
  )
}
