import { Link, useSearchParams } from 'react-router'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { formatDate, formatMoney, initials, titleCase } from '../../../lib/format'
import { PAGE_SIZE, useCustomerOptions, useCustomers } from './clientes_api'
import './clientes.css'

const ORDERINGS = [
  { value: 'recent', label: 'Compra mais recente' },
  { value: 'spent', label: 'Maior gasto' },
  { value: 'orders', label: 'Mais compras' },
  { value: 'name', label: 'Nome' },
]

const n = (value: number) => value.toLocaleString('pt-BR')

export default function Clientes() {
  // Busca e filtros ficam na URL (?q=&corp=...), então a busca do header também cai aqui.
  const [params, setParams] = useSearchParams()
  const filters = {
    q: params.get('q') ?? '',
    corp: params.get('corp') ?? '',
    store: params.get('store') ?? '',
    segment: params.get('segment') ?? '',
    buyers: params.get('buyers') ?? '',
    ordering: params.get('ordering') ?? 'recent',
    page: Number(params.get('page') ?? '1') || 1,
  }
  const options = useCustomerOptions()
  const list = useCustomers(filters)

  function set(name: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    if (name !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const total = list.data?.count ?? 0
  const first = total ? (filters.page - 1) * PAGE_SIZE + 1 : 0
  const last = Math.min(filters.page * PAGE_SIZE, total)
  const o = options.data

  return (
    <div className="page page-clientes">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">
            {o
              ? `${n(o.total)} clientes · ${n(o.buyers)} já compraram · ${n(o.with_phone)} com telefone`
              : 'Carregando…'}
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="field wide">
          <label htmlFor="clientes-q">Buscar</label>
          <input
            id="clientes-q"
            type="search"
            placeholder="Nome, CPF ou telefone"
            value={filters.q}
            onChange={(e) => set('q', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="clientes-corp">Corporação</label>
          <select
            id="clientes-corp"
            value={filters.corp}
            onChange={(e) => set('corp', e.target.value)}
          >
            <option value="">Todas</option>
            {o?.corporations.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="clientes-loja">Loja</label>
          <select
            id="clientes-loja"
            value={filters.store}
            onChange={(e) => set('store', e.target.value)}
          >
            <option value="">Todas</option>
            {o?.stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="clientes-seg">Segmento</label>
          <select
            id="clientes-seg"
            value={filters.segment}
            onChange={(e) => set('segment', e.target.value)}
          >
            <option value="">Todos</option>
            {o?.segments.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="clientes-ord">Ordenar por</label>
          <select
            id="clientes-ord"
            value={filters.ordering}
            onChange={(e) => set('ordering', e.target.value)}
          >
            {ORDERINGS.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
        <label className="check clientes-buyers">
          <input
            type="checkbox"
            checked={filters.buyers === '1'}
            onChange={(e) => set('buyers', e.target.checked ? '1' : '')}
          />
          Só quem já comprou
        </label>
      </div>

      {list.isError && <MsgNok titulo="Não foi possível carregar" mensagem={list.error.message} />}

      <div className="table-wrap">
        <table className="table clientes-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>CPF</th>
              <th>Corporação</th>
              <th>Loja</th>
              <th>Última compra</th>
              <th className="num">Compras</th>
              <th className="num">Total gasto</th>
              <th>Contato</th>
              <th>Segmento</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.results.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/clientes/${c.id}`} className="clientes-person">
                    <span className="avatar sm">{initials(c.name)}</span>
                    <span className="clientes-person-text">
                      <span className="clientes-person-name">
                        {titleCase(c.name) || `Cliente ${c.id}`}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="mono clientes-cpf">{c.cpf ?? '—'}</td>
                <td>{c.corp_tipo ?? '—'}</td>
                <td>{c.store_name ?? '—'}</td>
                <td>{formatDate(c.last_order_at)}</td>
                <td className="num">{c.orders_count || '—'}</td>
                <td className="num strong">{c.orders_count ? formatMoney(c.total_spent) : '—'}</td>
                <td>
                  {[c.primary_phone && 'Telefone', c.has_email && 'e-mail']
                    .filter(Boolean)
                    .join(' · ') || <span className="muted">sem contato</span>}
                </td>
                <td>
                  {c.rfm_segment ? (
                    <span className="badge sm square tone-orange">{c.rfm_segment}</span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.isPending && <div className="table-empty">Carregando…</div>}
        {list.data && total === 0 && (
          <div className="table-empty">Nenhum cliente encontrado com esses filtros.</div>
        )}
      </div>

      <div className="pager">
        <span>{total ? `Mostrando ${n(first)}–${n(last)} de ${n(total)} clientes` : ''}</span>
        <div className="pager-buttons">
          <button
            type="button"
            className="btn sm"
            disabled={!list.data?.previous}
            onClick={() => set('page', String(filters.page - 1))}
          >
            Anterior
          </button>
          <button
            type="button"
            className="btn sm"
            disabled={!list.data?.next}
            onClick={() => set('page', String(filters.page + 1))}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  )
}
