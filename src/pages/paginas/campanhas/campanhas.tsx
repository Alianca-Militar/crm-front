import { useState } from 'react'
import { Link } from 'react-router'
import { IconPlus } from '../../../components/menu/icons'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { useMe } from '../../../lib/auth'
import { formatMoney } from '../../../lib/format'
import {
  type Campaign,
  type CampaignListFilters,
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_TONE,
  type CampaignStatus,
  useCampaigns,
} from './campanhas_api'
import './campanhas.css'

const TABS: { label: string; statuses: CampaignStatus[] | null }[] = [
  { label: 'Todas', statuses: null },
  { label: 'Rascunho', statuses: ['draft', 'audience_ready'] },
  { label: 'Em andamento', statuses: ['exported', 'sending', 'sent'] },
  { label: 'Finalizadas', statuses: ['finished'] },
  { label: 'Canceladas', statuses: ['cancelled'] },
]

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
const n = (value: number) => value.toLocaleString('pt-BR')

/** Número e % sobre as enviadas (ex.: "1.234 · 87%"). */
function Rate({ value, of }: { value: number; of: number }) {
  return (
    <>
      {n(value)}
      <span className="campanhas-rate"> · {Math.round((value / of) * 100)}%</span>
    </>
  )
}

/** Enviadas, entregues, lidas e vendas atribuídas (vazio enquanto nada foi enviado). */
function Results({ c }: { c: Campaign }) {
  const r = c.results
  if (!r || !r.sent) {
    return (
      <>
        {[0, 1, 2, 3].map((i) => (
          <td key={i} className="num muted">
            —
          </td>
        ))}
      </>
    )
  }
  return (
    <>
      <td className="num">{n(r.sent)}</td>
      <td className="num nowrap">
        <Rate value={r.delivered} of={r.sent} />
      </td>
      <td className="num nowrap">
        <Rate value={r.read} of={r.sent} />
      </td>
      <td className="num nowrap">
        {r.orders ? (
          <span title={`${n(r.orders)} vendas de ${n(r.buyers)} clientes`}>
            <strong>{formatMoney(r.revenue)}</strong>
            <span className="campanhas-rate"> · {n(r.orders)}</span>
          </span>
        ) : (
          <span className="muted">R$ 0,00</span>
        )}
      </td>
    </>
  )
}

export default function Campanhas() {
  const me = useMe()
  const [filters, setFilters] = useState<CampaignListFilters>({})
  const campaigns = useCampaigns(filters)
  const stores = me.data?.stores ?? []
  const [tab, setTab] = useState('Todas')
  const canWrite = me.data?.role === 'admin' || me.data?.role === 'gerente'
  const all = campaigns.data ?? []
  const statuses = TABS.find((t) => t.label === tab)?.statuses ?? null
  const rows = statuses ? all.filter((c) => statuses.includes(c.status)) : all

  return (
    <div className="page page-campanhas">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Campanhas</h1>
          <p className="page-subtitle">
            Monte o público e gere a lista para a FastZap enviar pelo WhatsApp.
          </p>
        </div>
        {canWrite && (
          <Link to="/campanhas/nova" className="btn primary">
            <IconPlus size={18} />
            Nova campanha
          </Link>
        )}
      </div>

      <div className="campanhas-toolbar">
        <div role="tablist" aria-label="Filtrar por status" className="seg-tabs">
          {TABS.map((t) => {
            const n = t.statuses
              ? all.filter((c) => t.statuses?.includes(c.status)).length
              : all.length
            return (
              <button
                key={t.label}
                type="button"
                role="tab"
                aria-selected={t.label === tab}
                className="seg-tab"
                onClick={() => setTab(t.label)}
              >
                {t.label}
                {n > 0 && <span className="seg-tab-count">{n}</span>}
              </button>
            )
          })}
        </div>
        <div className="campanhas-filters">
          {stores.length > 1 && (
            <div className="field">
              <label htmlFor="camp-store">Loja</label>
              <select
                id="camp-store"
                value={filters.store ?? ''}
                onChange={(e) => setFilters({ ...filters, store: e.target.value })}
              >
                <option value="">Todas</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="camp-from">Criada de</label>
            <input
              id="camp-from"
              type="date"
              value={filters.created_from ?? ''}
              onChange={(e) => setFilters({ ...filters, created_from: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="camp-to">até</label>
            <input
              id="camp-to"
              type="date"
              value={filters.created_to ?? ''}
              onChange={(e) => setFilters({ ...filters, created_to: e.target.value })}
            />
          </div>
        </div>
      </div>

      {campaigns.isError && (
        <MsgNok
          titulo="Não foi possível carregar as campanhas"
          mensagem={campaigns.error.message}
        />
      )}

      <div className="table-wrap">
        <table className="table campanhas-table">
          <thead>
            <tr>
              <th>Campanha</th>
              <th>Loja</th>
              <th className="num">Público</th>
              <th className="num">Enviadas</th>
              <th className="num">Entregues</th>
              <th className="num">Lidas</th>
              <th
                className="num"
                title="Compras em qualquer loja dentro da janela da campanha (padrão 7 dias). Cada venda conta só para a campanha mais recente."
              >
                Vendas
              </th>
              <th>Criada</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {campaigns.isPending && (
              <tr>
                <td colSpan={10} className="muted">
                  Carregando…
                </td>
              </tr>
            )}
            {campaigns.isSuccess && rows.length === 0 && (
              <tr>
                <td colSpan={10} className="muted">
                  {all.length === 0
                    ? 'Nenhuma campanha ainda. Crie a primeira em “Nova campanha”.'
                    : 'Nenhuma campanha neste filtro.'}
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/campanhas/${c.id}`} className="row-link">
                    {c.name}
                  </Link>
                  {c.objective && <div className="campanhas-tipo">{c.objective}</div>}
                  <div className="campanhas-tipo">
                    {c.number_label} · <span className="mono">{c.template_name}</span>
                  </div>
                </td>
                <td>{c.store_code}</td>
                <td className="num">
                  {c.audience_total ? (
                    <span title={`${c.audience_total} no filtro`}>
                      {(c.audience_included ?? 0).toLocaleString('pt-BR')}
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <Results c={c} />
                <td className="nowrap">{dateFormat.format(new Date(c.created_at))}</td>
                <td>
                  <span
                    className={`badge ${CAMPAIGN_STATUS_TONE[c.status]}`}
                    title={
                      c.exported_at
                        ? `Exportada em ${dateFormat.format(new Date(c.exported_at))}`
                        : undefined
                    }
                  >
                    {CAMPAIGN_STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td className="nowrap">
                  <Link to={`/campanhas/${c.id}/resultados`} className="btn sm">
                    Resultado
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
