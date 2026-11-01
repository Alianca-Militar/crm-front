import { useState } from 'react'
import { Link, useParams } from 'react-router'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { formatCep, formatDate, formatMoney, initials, titleCase } from '../../../lib/format'
import {
  type Customer,
  useCustomer,
  useCustomerOrders,
  useCustomerSends,
} from '../clientes/clientes_api'
import './ficha_cliente.css'

const ABAS = ['Compras', 'Campanhas'] as const
type Aba = (typeof ABAS)[number]

const SEND_STATUS: Record<string, string> = {
  queued: 'Exportada',
  sent: 'Enviada',
  delivered: 'Entregue',
  read: 'Lida',
  failed: 'Falhou',
}

/** 5532999990000 → (32) 99999-0000 */
function formatPhone(phone: string | null): string {
  if (!phone) return '—'
  const local = phone.startsWith('55') ? phone.slice(2) : phone
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  return phone
}

function formatCpf(cpf: string | null): string {
  if (!cpf) return '—'
  if (cpf.length === 11) return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (cpf.length === 14) {
    return cpf.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return cpf
}

function address(c: Customer): string {
  const street = [c.address, c.numero].filter(Boolean).join(', ')
  const line = [street, c.complemento].filter(Boolean).join(' · ')
  return line || '—'
}

export default function FichaCliente() {
  const id = Number(useParams().id)
  const [aba, setAba] = useState<Aba>('Compras')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<number | null>(null)
  const customer = useCustomer(id)
  const orders = useCustomerOrders(id, page)
  const sends = useCustomerSends(id)

  if (customer.isPending) return <div className="page">Carregando…</div>
  if (customer.isError) {
    return (
      <div className="page">
        <Link to="/clientes" className="back-link">
          ← Clientes
        </Link>
        <MsgNok titulo="Cliente não encontrado" mensagem={customer.error.message} />
      </div>
    )
  }

  const c = customer.data
  const d = c.details
  const blocked = c.marketing_status.some((b) => b.status === 'blocked')
  const tags = [
    d?.rfm_segment && { label: d.rfm_segment, hot: true },
    d?.corp_tipo && { label: d.corp_tipo, hot: false },
    c.store_name && { label: c.store_name, hot: false },
    c.is_generic && { label: 'Cadastro genérico do PDV', hot: false },
  ].filter(Boolean) as { label: string; hot: boolean }[]
  const stats = [
    { label: 'Compras', value: String(d?.orders_count ?? 0) },
    { label: 'Total gasto', value: formatMoney(d?.total_spent) },
    { label: 'Ticket médio', value: formatMoney(d?.avg_ticket) },
    { label: 'Última compra', value: formatDate(d?.last_order_at) },
  ]
  const dados = [
    { label: 'CPF/CNPJ', value: formatCpf(c.cpf), mono: true },
    { label: 'Nascimento', value: formatDate(c.birth_date) },
    { label: 'E-mail', value: c.email ?? '—' },
    { label: 'Endereço', value: address(c) },
    {
      label: 'Cidade',
      value: c.city_name
        ? `${titleCase(c.city_name)}${c.state_code ? ` - ${c.state_code}` : ''}`
        : '—',
    },
    { label: 'CEP', value: c.cep ? formatCep(c.cep) : '—', mono: true },
    { label: 'Cliente desde', value: formatDate(d?.first_order_at ?? c.created_at) },
    { label: 'Categoria favorita', value: d?.favorite_category ?? '—' },
  ]
  const ordersPage = orders.data
  const pages = ordersPage ? Math.max(1, Math.ceil(ordersPage.count / 50)) : 1

  return (
    <div className="page page-ficha-cliente">
      <Link to="/clientes" className="back-link">
        ← Clientes
      </Link>

      <div className="ficha-body">
        <aside className="ficha-aside">
          <section className="card-dark">
            <div className="ficha-id">
              <span className="ficha-avatar">{initials(c.name)}</span>
              <div className="ficha-id-text">
                <h1 className="ficha-name">{c.name ?? `Cliente ${c.id}`}</h1>
                {d?.patente && <div className="ficha-role">{d.patente}</div>}
              </div>
            </div>

            {tags.length > 0 && (
              <div className="ficha-tags">
                {tags.map((t) => (
                  <span key={t.label} className={t.hot ? 'ficha-tag hot' : 'ficha-tag'}>
                    {t.label}
                  </span>
                ))}
              </div>
            )}

            <div className="ficha-stats">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="ficha-stat-label">{s.label}</div>
                  <div className="ficha-stat-value display-num">{s.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="card ficha-card">
            <h2 className="card-title sm">Dados</h2>
            <dl className="dl">
              {dados.map((x) => (
                <div key={x.label} className="ficha-dl-row">
                  <dt>{x.label}</dt>
                  <dd className={x.mono ? 'mono' : undefined}>{x.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card ficha-card">
            <h2 className="card-title sm">Telefones</h2>
            {c.phones.length === 0 && <p className="muted">Nenhum telefone válido.</p>}
            {c.phones.map((p) => (
              <div key={p.id} className="ficha-consent">
                <span className="mono">{formatPhone(p.phone_normalized)}</span>
                <span className="muted">
                  {p.is_primary ? 'principal' : 'secundário'}
                  {p.has_whatsapp === false ? ' · sem WhatsApp' : ''}
                </span>
              </div>
            ))}
          </section>

          <section className="card ficha-card">
            <h2 className="card-title sm">Marketing (LGPD)</h2>
            <div className="ficha-consent">
              <span>WhatsApp</span>
              {blocked ? (
                <span className="ficha-consent-blocked">Bloqueado</span>
              ) : (
                <span className="ficha-consent-ok">Pode receber</span>
              )}
            </div>
            {d?.last_campaign_sent_at && (
              <div className="ficha-consent">
                <span>Última campanha</span>
                <span className="muted">{formatDate(d.last_campaign_sent_at)}</span>
              </div>
            )}
          </section>
        </aside>

        <section className="ficha-history">
          <div role="tablist" aria-label="Histórico do cliente" className="ficha-tabs">
            {ABAS.map((a) => (
              <button
                key={a}
                type="button"
                role="tab"
                aria-selected={a === aba}
                className="ficha-tab"
                onClick={() => setAba(a)}
              >
                {a}
                {a === 'Compras' && ordersPage ? ` (${ordersPage.count})` : ''}
              </button>
            ))}
          </div>

          <div className="ficha-history-body">
            {aba === 'Compras' && (
              <div className="ficha-scroll">
                {ordersPage && ordersPage.count === 0 && (
                  <p className="muted">Nenhuma compra registrada.</p>
                )}
                {ordersPage && ordersPage.count > 0 && (
                  <table className="table plain compact ficha-orders">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Itens</th>
                        <th>Loja</th>
                        <th>Pagamento</th>
                        <th className="num">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersPage.results.map((o) => (
                        <tr key={o.id}>
                          <td className="nowrap">{formatDate(o.ordered_at)}</td>
                          <td>
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => setOpen(open === o.id ? null : o.id)}
                            >
                              {o.items.length} {o.items.length === 1 ? 'item' : 'itens'}
                            </button>
                            {open === o.id && (
                              <ul className="ficha-items">
                                {o.items.map((i) => (
                                  <li key={i.nmr_seq}>
                                    {Number(i.quantity).toLocaleString('pt-BR')}× {i.product_name}{' '}
                                    <span className="muted">{formatMoney(i.total_price)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td>{o.store_name}</td>
                          <td>{o.cond_pag ?? '—'}</td>
                          <td className="num strong">
                            {formatMoney(o.total_amount)}
                            {o.status !== 'paid' && <span className="muted"> (cancelada)</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {pages > 1 && (
                  <div className="pager">
                    <span>
                      Página {page} de {pages}
                    </span>
                    <div className="pager-buttons">
                      <button
                        type="button"
                        className="btn sm"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        className="btn sm"
                        disabled={page >= pages}
                        onClick={() => setPage(page + 1)}
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {aba === 'Campanhas' && (
              <>
                {sends.data?.count === 0 && (
                  <p className="muted">Este cliente ainda não esteve em nenhuma campanha.</p>
                )}
                {sends.data?.results.map((s) => (
                  <Link key={s.id} to={`/campanhas/${s.campaign}`} className="ficha-campaign">
                    <span className="ficha-campaign-name">{s.campaign_name}</span>
                    <span className="muted">
                      {SEND_STATUS[s.current_status] ?? s.current_status}
                      {s.sent_at ? ` · ${formatDate(s.sent_at)}` : ''}
                    </span>
                  </Link>
                ))}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
