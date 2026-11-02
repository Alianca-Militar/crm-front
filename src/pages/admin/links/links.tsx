import { useState } from 'react'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import MsgOk from '../../../components/msg_ok/msg_ok'
import { formatDate, formatDateTime } from '../../../lib/format'
import { useStores } from '../lojas/lojas_api'
import LinkForm from './link_form'
import { DEVICE_LABEL, type TrackedLink, useDeleteLink, useLinks, useLinkStats } from './links_api'
import './links.css'

const n = (v: number) => v.toLocaleString('pt-BR')

export default function Links() {
  const links = useLinks()
  const stores = useStores()
  const remove = useDeleteLink()
  const [loja, setLoja] = useState('')
  const [status, setStatus] = useState<'' | 'active' | 'inactive'>('active')
  // undefined = formulário fechado · null = novo link · TrackedLink = editar
  const [editing, setEditing] = useState<TrackedLink | null | undefined>(undefined)
  const [showing, setShowing] = useState<TrackedLink | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  const list = (links.data ?? []).filter(
    (l) =>
      (!loja || String(l.store) === loja || l.store === null) &&
      (!status || (status === 'active') === l.active),
  )

  function onDelete(l: TrackedLink) {
    setFailed(null)
    remove.mutate(l.id, {
      onSuccess: () => setSaved(`Link “${l.name}” excluído.`),
      onError: (err) => setFailed(err.message),
    })
  }

  return (
    <div className="page page-links">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Links</h1>
          <p className="page-subtitle">
            Links curtos para campanhas: contam os cliques e levam o cliente ao destino com as UTMs.
          </p>
        </div>
        <button type="button" className="btn primary" onClick={() => setEditing(null)}>
          Novo link
        </button>
      </div>

      {saved && <MsgOk mensagem={saved} onClose={() => setSaved(null)} />}
      {failed && <MsgNok titulo="Não foi possível excluir" mensagem={failed} />}
      {links.isError && (
        <MsgNok titulo="Não foi possível carregar os links" mensagem={links.error.message} />
      )}

      <div className="filter-bar">
        <div className="field">
          <label htmlFor="lnk-f-loja">Loja</label>
          <select id="lnk-f-loja" value={loja} onChange={(e) => setLoja(e.target.value)}>
            <option value="">Todas</option>
            {(stores.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} · {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="lnk-f-status">Situação</label>
          <select
            id="lnk-f-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="active">Ativos</option>
            <option value="inactive">Desativados</option>
            <option value="">Todos</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table compact links-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Link curto</th>
              <th>Destino</th>
              <th>Loja</th>
              <th className="num">Cliques</th>
              <th className="num">Únicos</th>
              <th className="num">7 dias</th>
              <th className="num" title="Entrou na comunidade (avisado pela página de destino)">
                Comunidade
              </th>
              <th className="num" title="Chamou vendedor (avisado pela página de destino)">
                Vendedor
              </th>
              <th>Último clique</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {links.isPending && (
              <tr>
                <td colSpan={11} className="muted">
                  Carregando…
                </td>
              </tr>
            )}
            {links.isSuccess && list.length === 0 && (
              <tr>
                <td colSpan={11} className="muted">
                  {links.data.length === 0
                    ? 'Nenhum link criado ainda. Use “Novo link”.'
                    : 'Nenhum link com estes filtros.'}
                </td>
              </tr>
            )}
            {list.map((l) => (
              <tr key={l.id} className={l.active ? undefined : 'links-off'}>
                <td>
                  <div className="strong">{l.name}</div>
                  {l.purpose && <div className="muted links-small">{l.purpose}</div>}
                  {!l.active && <span className="badge sm tone-gray">Desativado</span>}
                </td>
                <td className="nowrap">
                  <CopyLink url={l.short_url} />
                </td>
                <td className="links-dest">
                  <a href={l.destination_url} target="_blank" rel="noopener noreferrer">
                    {l.destination_url.replace(/^https?:\/\//, '')}
                  </a>
                  {l.utm_campaign && l.append_utm && (
                    <div className="muted links-small">utm_campaign={l.utm_campaign}</div>
                  )}
                </td>
                <td>{l.store_code ?? <span className="muted">Todas</span>}</td>
                <td className="num strong">{n(l.clicks)}</td>
                <td className="num">{n(l.unique_clicks)}</td>
                <td className="num">{n(l.clicks_7d)}</td>
                <td className="num">{n(l.channels)}</td>
                <td className="num">{n(l.sellers)}</td>
                <td className="nowrap links-small">
                  {l.last_click_at ? (
                    formatDateTime(l.last_click_at)
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="num">
                  <div className="links-actions">
                    <button type="button" className="btn xs" onClick={() => setShowing(l)}>
                      Números
                    </button>
                    <button type="button" className="btn xs" onClick={() => setEditing(l)}>
                      Editar
                    </button>
                    {l.clicks + l.visits + l.channels + l.sellers === 0 && (
                      <button
                        type="button"
                        className="btn xs"
                        disabled={remove.isPending}
                        onClick={() => onDelete(l)}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="muted links-hint">
        Prévias do WhatsApp e robôs não contam como clique. “Únicos” conta cada aparelho uma vez por
        dia, sem guardar IP nem dado do cliente. Link com clique não pode ser excluído: desative.
      </p>

      {editing !== undefined && (
        <LinkForm
          link={editing}
          onClose={() => setEditing(undefined)}
          onSaved={(l) => {
            setSaved(editing ? `Link “${l.name}” atualizado.` : `Link criado: ${l.short_url}`)
            setEditing(undefined)
          }}
        />
      )}

      {showing && <LinkStatsModal link={showing} onClose={() => setShowing(null)} />}
    </div>
  )
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <span className="links-copy">
      <a href={url} target="_blank" rel="noopener noreferrer" className="mono">
        {url.replace(/^https?:\/\//, '')}
      </a>
      <button
        type="button"
        className="btn xs"
        onClick={() => {
          navigator.clipboard
            ?.writeText(url)
            .then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
            .catch(() => setCopied(false))
        }}
      >
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </span>
  )
}

const PERIODS = [7, 30, 90]

function LinkStatsModal({ link, onClose }: { link: TrackedLink; onClose: () => void }) {
  const [days, setDays] = useState(30)
  const stats = useLinkStats(link.id, days)
  const series = stats.data?.days ?? []
  const max = Math.max(1, ...series.map((d) => d.clicks))
  const sum = (key: 'clicks' | 'unique_clicks' | 'visits' | 'channels' | 'sellers') =>
    series.reduce((acc, d) => acc + d[key], 0)
  const devices = Object.entries(stats.data?.devices ?? {})
  const step = Math.ceil(series.length / 10)

  return (
    <Modal
      open
      titulo={link.name}
      onClose={onClose}
      footer={
        <button type="button" className="btn sm" onClick={onClose}>
          Fechar
        </button>
      }
    >
      <div className="links-stats">
        <dl className="dl links-dl">
          <dt>Link curto</dt>
          <dd>
            <CopyLink url={link.short_url} />
          </dd>
          <dt>Leva para</dt>
          <dd className="mono links-small links-break">{link.final_url}</dd>
          {link.purpose && (
            <>
              <dt>Para que serve</dt>
              <dd>{link.purpose}</dd>
            </>
          )}
          <dt>Criado</dt>
          <dd>
            {formatDate(link.created_at)}
            {link.created_by_name && ` por ${link.created_by_name}`}
          </dd>
        </dl>

        <div className="links-period" role="group" aria-label="Período">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              className={`btn xs ${p === days ? 'primary' : ''}`}
              onClick={() => setDays(p)}
            >
              {p} dias
            </button>
          ))}
        </div>

        {stats.isError && (
          <MsgNok titulo="Não foi possível carregar os números" mensagem={stats.error.message} />
        )}

        <div className="links-kpis">
          {[
            ['Cliques', sum('clicks')],
            ['Únicos', sum('unique_clicks')],
            ['Abriram a página', sum('visits')],
            ['Comunidade', sum('channels')],
            ['Vendedor', sum('sellers')],
          ].map(([label, value]) => (
            <div key={label} className="kpi">
              <div className="kpi-label">{label}</div>
              <div className="kpi-value">{stats.isPending ? '…' : n(Number(value))}</div>
            </div>
          ))}
        </div>

        <div
          className="links-chart"
          role="img"
          aria-label={`Cliques por dia nos últimos ${days} dias`}
        >
          {series.map((d) => (
            <div
              key={d.date}
              className="links-bar"
              title={`${formatDate(d.date)}: ${d.clicks} cliques (${d.unique_clicks} únicos)`}
            >
              {d.clicks > 0 && <div style={{ height: `${(d.clicks / max) * 100}%` }} />}
            </div>
          ))}
        </div>
        <div className="links-chart-labels">
          {series.map((d, i) => (
            <div key={d.date}>{i % step === 0 ? formatDate(d.date).slice(0, 5) : ''}</div>
          ))}
        </div>

        {devices.length > 0 && (
          <p className="muted links-small">
            Aparelhos: {devices.map(([k, v]) => `${DEVICE_LABEL[k] ?? k} ${n(v)}`).join(' · ')}
          </p>
        )}
      </div>
    </Modal>
  )
}
