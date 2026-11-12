import { type FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import MsgOk from '../../../components/msg_ok/msg_ok'
import { ApiError } from '../../../lib/api'
import { formatDateTime, formatPhone, onlyDigits, titleCase } from '../../../lib/format'
import { useCustomerOptions } from '../clientes/clientes_api'
import {
  EXPORT_URL,
  isMasked,
  type ManualOptout,
  openFullHistory,
  type OptoutRow,
  PAGE_SIZE,
  type Scope,
  SOURCE_LABEL,
  useBlocklist,
  useManualOptout,
  usePhoneHistory,
  useReviewAction,
  useReviewQueue,
} from './bloqueios_api'
import { PhoneCell } from './phone_cell'
import './bloqueios.css'

type Aba = 'atuais' | 'historico' | 'revisao'

const ABAS: { key: Aba; label: string; subtitle: string }[] = [
  {
    key: 'atuais',
    label: 'Bloqueados agora',
    subtitle: 'Telefones que não podem receber marketing hoje (a lista que vai para a FastZap).',
  },
  {
    key: 'historico',
    label: 'Histórico por telefone',
    subtitle: 'Todos os bloqueios e liberações de um telefone, com origem, motivo e quem fez.',
  },
  {
    key: 'revisao',
    label: 'Revisão',
    subtitle:
      'Pedidos ambíguos ("não quero sair da lista"): já bloqueados, aguardando confirmação.',
  },
]

const n = (value: number) => value.toLocaleString('pt-BR')

function scopeText(scope: Scope, storeName: string | null) {
  return scope === 'store' ? `Só ${storeName ?? 'uma loja'}` : 'Todas as lojas'
}

export default function Bloqueios() {
  // Aba e telefone ficam na URL: o "Histórico" da lista abre direto no telefone.
  const [params, setParams] = useSearchParams()
  const aba: Aba = (ABAS.find((a) => a.key === params.get('aba'))?.key ?? 'atuais') as Aba
  const current = ABAS.find((a) => a.key === aba) ?? ABAS[0]
  const [manual, setManual] = useState<Partial<ManualOptout> | null>(null)
  const [done, setDone] = useState('')

  // Totais das abas (sem os filtros da lista). O histórico é de um telefone: sem total.
  const blockedTotal = useBlocklist({ page: 1 }).data?.count
  const reviewTotal = useReviewQueue().data?.count
  const totals: Partial<Record<Aba, number | undefined>> = {
    atuais: blockedTotal,
    revisao: reviewTotal,
  }

  function openHistory(phone: string) {
    setParams({ aba: 'historico', phone })
  }

  return (
    <div className="page page-bloqueios">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Bloqueios</h1>
          <p className="page-subtitle">{current.subtitle}</p>
        </div>
        <button type="button" className="btn primary md" onClick={() => setManual({})}>
          Bloquear ou liberar telefone
        </button>
      </div>

      {done && <MsgOk mensagem={done} onClose={() => setDone('')} />}

      <div role="tablist" aria-label="Visão" className="seg-tabs">
        {ABAS.map((a) => (
          <button
            key={a.key}
            type="button"
            role="tab"
            aria-selected={a.key === aba}
            className="seg-tab"
            onClick={() => setParams(a.key === 'atuais' ? {} : { aba: a.key })}
          >
            {a.label}
            {!!totals[a.key] && <span className="seg-tab-count">{n(totals[a.key] ?? 0)}</span>}
          </button>
        ))}
      </div>

      {aba === 'atuais' && <BlockedTab onHistory={openHistory} />}
      {aba === 'historico' && (
        <HistoryTab
          phone={params.get('phone') ?? ''}
          onPhone={(phone) => setParams(phone ? { aba: 'historico', phone } : { aba: 'historico' })}
          onManual={setManual}
        />
      )}
      {aba === 'revisao' && <ReviewTab onHistory={openHistory} onDone={setDone} />}

      <ManualModal
        initial={manual}
        onClose={() => setManual(null)}
        onSaved={(row) => {
          setManual(null)
          setDone(
            `${formatPhone(row.phone_normalized)} ${row.status === 'blocked' ? 'bloqueado' : 'liberado'} para marketing.`,
          )
        }}
      />
    </div>
  )
}

// ---------- Bloqueados agora ----------

function BlockedTab({ onHistory }: { onHistory: (phone: string) => void }) {
  const [filters, setFilters] = useState({
    q: '',
    source: '',
    store: '',
    since_from: '',
    since_to: '',
  })
  const [page, setPage] = useState(1)
  const stores = useCustomerOptions().data?.stores ?? []
  const list = useBlocklist({ ...filters, page })

  function set(name: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [name]: value }))
    setPage(1)
  }

  const total = list.data?.count ?? 0
  const first = total ? (page - 1) * PAGE_SIZE + 1 : 0
  const last = Math.min(page * PAGE_SIZE, total)

  return (
    <>
      <div className="filter-bar">
        <div className="field wide">
          <label htmlFor="bl-q">Buscar</label>
          <input
            id="bl-q"
            type="search"
            placeholder="Telefone ou nome do cliente"
            value={filters.q}
            onChange={(e) => set('q', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="bl-source">Origem</label>
          <select
            id="bl-source"
            value={filters.source}
            onChange={(e) => set('source', e.target.value)}
          >
            <option value="">Todas</option>
            {Object.entries(SOURCE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bl-store">Loja</label>
          <select
            id="bl-store"
            value={filters.store}
            onChange={(e) => set('store', e.target.value)}
          >
            <option value="">Todas</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bl-from">Bloqueado de</label>
          <input
            id="bl-from"
            type="date"
            value={filters.since_from}
            onChange={(e) => set('since_from', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="bl-to">até</label>
          <input
            id="bl-to"
            type="date"
            value={filters.since_to}
            onChange={(e) => set('since_to', e.target.value)}
          />
        </div>
        <a className="btn sm bloqueios-export" href={EXPORT_URL} download>
          Exportar CSV
        </a>
      </div>

      {list.isError && <MsgNok titulo="Não foi possível carregar" mensagem={list.error.message} />}

      <div className="table-wrap">
        <table className="table bloqueios-table">
          <thead>
            <tr>
              <th>Telefone</th>
              <th>Cliente</th>
              <th>Origem</th>
              <th>Vale para</th>
              <th>Desde</th>
              <th>Motivo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.data?.results.map((row) => (
              <tr key={row.id}>
                <td className="mono">
                  <PhoneCell phone={row.phone_normalized} optoutId={row.optout} />
                </td>
                <td>
                  {row.customer_id ? (
                    <Link to={`/clientes/${row.customer_id}`}>
                      {titleCase(row.customer_name) || `Cliente ${row.customer_id}`}
                    </Link>
                  ) : (
                    <span className="muted">sem cadastro</span>
                  )}
                </td>
                <td>
                  <span className="badge sm square tone-gray">{SOURCE_LABEL[row.source]}</span>
                </td>
                <td>{scopeText(row.scope, row.store_name)}</td>
                <td>{formatDateTime(row.since)}</td>
                <td className="bloqueios-reason">
                  {row.reason || <span className="muted">—</span>}
                </td>
                <td className="bloqueios-actions">
                  <button
                    type="button"
                    className="btn xs"
                    onClick={() => openFullHistory(row.phone_normalized, row.optout, onHistory)}
                  >
                    Histórico
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.isPending && <div className="table-empty">Carregando…</div>}
        {list.data && total === 0 && (
          <div className="table-empty">Nenhum telefone bloqueado com esses filtros.</div>
        )}
      </div>

      <div className="pager">
        <span>{total ? `Mostrando ${n(first)}–${n(last)} de ${n(total)} bloqueados` : ''}</span>
        <div className="pager-buttons">
          <button
            type="button"
            className="btn sm"
            disabled={!list.data?.previous}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </button>
          <button
            type="button"
            className="btn sm"
            disabled={!list.data?.next}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
    </>
  )
}

// ---------- Histórico por telefone ----------

function HistoryTab({
  phone,
  onPhone,
  onManual,
}: {
  phone: string
  onPhone: (phone: string) => void
  onManual: (initial: Partial<ManualOptout>) => void
}) {
  const [typed, setTyped] = useState(phone)
  const history = usePhoneHistory(phone)
  const rows = history.data?.results ?? []
  // A situação atual é o evento mais recente (a lista vem do mais novo para o mais antigo).
  const blocked = rows[0]?.status === 'blocked'

  function search(e: FormEvent) {
    e.preventDefault()
    onPhone(onlyDigits(typed))
  }

  return (
    <>
      <form className="filter-bar" onSubmit={search}>
        <div className="field wide">
          <label htmlFor="hist-phone">Telefone</label>
          <input
            id="hist-phone"
            type="search"
            inputMode="tel"
            placeholder="(31) 98888-7777"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        </div>
        <button type="submit" className="btn sm bloqueios-export">
          Ver histórico
        </button>
      </form>

      {!phone && <div className="table-empty">Digite um telefone, com ou sem o 9.</div>}
      {history.isError && (
        <MsgNok titulo="Não foi possível carregar" mensagem={history.error.message} />
      )}

      {phone && history.data && (
        <>
          <div className="bloqueios-status">
            <span>
              <strong>{formatPhone(rows[0]?.phone_normalized ?? phone)}</strong>
              {rows.length === 0 ? (
                <span className="muted"> · nunca foi bloqueado</span>
              ) : (
                <span className={blocked ? 'badge sm tone-red' : 'badge sm tone-green'}>
                  {blocked ? 'Bloqueado' : 'Liberado'}
                </span>
              )}
            </span>
            <button
              type="button"
              className="btn sm"
              onClick={() =>
                onManual({
                  phone: rows[0]?.phone_normalized ?? phone,
                  status: blocked ? 'released' : 'blocked',
                })
              }
            >
              {blocked ? 'Liberar' : 'Bloquear'}
            </button>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Situação</th>
                  <th>Origem</th>
                  <th>Vale para</th>
                  <th>Motivo / mensagem</th>
                  <th>Quem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.occurred_at)}</td>
                    <td>
                      <span
                        className={
                          row.status === 'blocked' ? 'badge sm tone-red' : 'badge sm tone-green'
                        }
                      >
                        {row.status === 'blocked' ? 'Bloqueou' : 'Liberou'}
                      </span>
                      {row.needs_review && !row.reviewed_at && (
                        <span className="badge sm tone-yellow">Em revisão</span>
                      )}
                    </td>
                    <td>{SOURCE_LABEL[row.source]}</td>
                    <td>{scopeText(row.scope, row.store_name)}</td>
                    <td className="bloqueios-reason">
                      {row.origin_text || <span className="muted">—</span>}
                    </td>
                    <td>
                      {row.created_by_name ?? <span className="muted">o próprio cliente</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}

// ---------- Revisão ----------

function ReviewTab({
  onHistory,
  onDone,
}: {
  onHistory: (phone: string) => void
  onDone: (message: string) => void
}) {
  const queue = useReviewQueue()
  const confirm = useReviewAction('confirm')
  const discard = useReviewAction('discard')
  const busy = confirm.isPending || discard.isPending
  const error = confirm.error ?? discard.error
  const rows = queue.data?.results ?? []

  function act(row: OptoutRow, kind: 'confirm' | 'discard') {
    const mutation = kind === 'confirm' ? confirm : discard
    mutation.mutate(row.id, {
      onSuccess: () =>
        onDone(
          kind === 'confirm'
            ? `Bloqueio de ${formatPhone(row.phone_normalized)} confirmado.`
            : `Pedido descartado: ${formatPhone(row.phone_normalized)} liberado para marketing.`,
        ),
    })
  }

  return (
    <>
      {error && <MsgNok titulo="Não foi possível concluir" mensagem={error.message} />}
      {queue.isError && (
        <MsgNok titulo="Não foi possível carregar" mensagem={queue.error.message} />
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Telefone</th>
              <th>Cliente</th>
              <th>Mensagem do cliente</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatDateTime(row.occurred_at)}</td>
                <td className="mono">
                  {isMasked(row.phone_normalized) ? (
                    <PhoneCell phone={row.phone_normalized} optoutId={row.id} />
                  ) : (
                    <button
                      type="button"
                      className="bloqueios-link"
                      onClick={() => onHistory(row.phone_normalized)}
                    >
                      {formatPhone(row.phone_normalized)}
                    </button>
                  )}
                </td>
                <td>
                  {row.customer ? (
                    <Link to={`/clientes/${row.customer}`}>
                      {titleCase(row.customer_name) || `Cliente ${row.customer}`}
                    </Link>
                  ) : (
                    <span className="muted">sem cadastro</span>
                  )}
                </td>
                <td className="bloqueios-reason">{row.origin_text ?? '—'}</td>
                <td className="bloqueios-actions">
                  <button
                    type="button"
                    className="btn xs"
                    disabled={busy}
                    onClick={() => act(row, 'discard')}
                    title="Não era pedido de saída: libera o telefone"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    className="btn xs dark"
                    disabled={busy}
                    onClick={() => act(row, 'confirm')}
                  >
                    Confirmar bloqueio
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {queue.isPending && <div className="table-empty">Carregando…</div>}
        {queue.data && rows.length === 0 && (
          <div className="table-empty">Nenhum pedido aguardando revisão.</div>
        )}
      </div>
    </>
  )
}

// ---------- Bloqueio / liberação manual ----------

function ManualModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Partial<ManualOptout> | null
  onClose: () => void
  onSaved: (row: OptoutRow) => void
}) {
  return (
    <Modal open={initial !== null} titulo="Bloquear ou liberar telefone" onClose={onClose}>
      {/* key: reabre limpo a cada vez, já com o telefone/situação vindos do histórico */}
      {initial && (
        <ManualForm
          key={JSON.stringify(initial)}
          initial={initial}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  )
}

function ManualForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Partial<ManualOptout>
  onClose: () => void
  onSaved: (row: OptoutRow) => void
}) {
  const [form, setForm] = useState<ManualOptout>({
    phone: initial.phone ? formatPhone(initial.phone) : '',
    status: initial.status ?? 'blocked',
    reason: '',
    scope: 'all_stores',
    store: null,
  })
  const stores = useCustomerOptions().data?.stores ?? []
  const save = useManualOptout()

  function submit(e: FormEvent) {
    e.preventDefault()
    save.mutate(
      { ...form, phone: onlyDigits(form.phone), store: form.scope === 'store' ? form.store : null },
      { onSuccess: onSaved },
    )
  }

  const fieldError = (name: string) =>
    save.error instanceof ApiError ? save.error.fieldErrors[name]?.join(' ') : undefined

  return (
    <form className="bloqueios-form" onSubmit={submit}>
      {save.isError && <MsgNok titulo="Não foi possível salvar" mensagem={save.error.message} />}

      <div className="field">
        <label htmlFor="mo-phone">Telefone</label>
        <input
          id="mo-phone"
          inputMode="tel"
          required
          placeholder="(31) 98888-7777"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        {fieldError('phone') && (
          <span className="bloqueios-field-error">{fieldError('phone')}</span>
        )}
      </div>

      <fieldset className="bloqueios-choice">
        <legend className="field-label">O que fazer</legend>
        <label className="check">
          <input
            type="radio"
            name="mo-status"
            checked={form.status === 'blocked'}
            onChange={() => setForm({ ...form, status: 'blocked' })}
          />
          Bloquear marketing
        </label>
        <label className="check">
          <input
            type="radio"
            name="mo-status"
            checked={form.status === 'released'}
            onChange={() => setForm({ ...form, status: 'released' })}
          />
          Liberar marketing
        </label>
      </fieldset>

      <fieldset className="bloqueios-choice">
        <legend className="field-label">Vale para</legend>
        <label className="check">
          <input
            type="radio"
            name="mo-scope"
            checked={form.scope === 'all_stores'}
            onChange={() => setForm({ ...form, scope: 'all_stores' })}
          />
          Todas as lojas
        </label>
        <label className="check">
          <input
            type="radio"
            name="mo-scope"
            checked={form.scope === 'store'}
            onChange={() => setForm({ ...form, scope: 'store' })}
          />
          Só uma loja
        </label>
      </fieldset>

      {form.scope === 'store' && (
        <div className="field">
          <label htmlFor="mo-store">Loja</label>
          <select
            id="mo-store"
            required
            value={form.store ?? ''}
            onChange={(e) => setForm({ ...form, store: Number(e.target.value) || null })}
          >
            <option value="">Escolha…</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {fieldError('store') && (
            <span className="bloqueios-field-error">{fieldError('store')}</span>
          )}
        </div>
      )}

      <div className="field">
        <label htmlFor="mo-reason">Motivo</label>
        <textarea
          id="mo-reason"
          required
          rows={3}
          maxLength={500}
          placeholder="Ex.: cliente pediu por telefone para não receber ofertas"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
        <span className="muted bloqueios-hint">Fica no histórico do telefone e na auditoria.</span>
      </div>

      <div className="bloqueios-form-foot">
        <button type="button" className="btn md" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="submit"
          className="btn primary md"
          disabled={save.isPending || !form.reason.trim() || onlyDigits(form.phone).length < 10}
        >
          {save.isPending ? 'Salvando…' : form.status === 'blocked' ? 'Bloquear' : 'Liberar'}
        </button>
      </div>
    </form>
  )
}
