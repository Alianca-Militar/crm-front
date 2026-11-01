import { useState } from 'react'
import { Link } from 'react-router'
import { IconPlus } from '../../../components/menu/icons'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { useMe } from '../../../lib/auth'
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_TONE,
  type CampaignStatus,
  useCampaigns,
} from './campanhas_api'
import './campanhas.css'

const TABS: { label: string; statuses: CampaignStatus[] | null }[] = [
  { label: 'Todas', statuses: null },
  { label: 'Rascunho', statuses: ['draft', 'audience_ready'] },
  { label: 'Exportadas', statuses: ['exported', 'sending', 'sent'] },
  { label: 'Canceladas', statuses: ['cancelled'] },
]

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

export default function Campanhas() {
  const me = useMe()
  const campaigns = useCampaigns()
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
              <th>Número · Template</th>
              <th className="num">Público</th>
              <th>Criada</th>
              <th>Exportada</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.isPending && (
              <tr>
                <td colSpan={7} className="muted">
                  Carregando…
                </td>
              </tr>
            )}
            {campaigns.isSuccess && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
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
                </td>
                <td>{c.store_code}</td>
                <td>
                  <div>{c.number_label}</div>
                  <div className="campanhas-tipo mono">{c.template_name}</div>
                </td>
                <td className="num">
                  {c.audience_total ? (
                    <span title={`${c.audience_total} no filtro`}>
                      {(c.audience_included ?? 0).toLocaleString('pt-BR')}
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="nowrap">{dateFormat.format(new Date(c.created_at))}</td>
                <td className="nowrap">
                  {c.exported_at ? (
                    dateFormat.format(new Date(c.exported_at))
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${CAMPAIGN_STATUS_TONE[c.status]}`}>
                    {CAMPAIGN_STATUS_LABEL[c.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
