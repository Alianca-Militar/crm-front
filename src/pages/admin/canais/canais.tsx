import { useState } from 'react'
import { useSearchParams } from 'react-router'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import MsgOk from '../../../components/msg_ok/msg_ok'
import { useMe } from '../../../lib/auth'
import { formatLastAccess } from '../../../lib/format'
import { useStores } from '../lojas/lojas_api'
import {
  type EmailSender,
  LIMIT_LABEL,
  MODE_LABEL,
  META_STATUS_LABEL,
  META_STATUS_TONE,
  PROVIDER_LABEL,
  PURPOSE_LABEL,
  QUALITY_LABEL,
  SENDER_PROVIDER_LABEL,
  SENDER_PURPOSE_LABEL,
  SENDER_STATUS_LABEL,
  SENDER_STATUS_TONE,
  useDeleteEmailSender,
  useEmailSenders,
  useSyncNumbersFromMeta,
  useTestEmailSender,
  useWhatsappNumbers,
  type WhatsappNumber,
} from './canais_api'
import NumeroForm from './numero_form'
import RemetenteForm from './remetente_form'
import './canais.css'

type Aba = 'whatsapp' | 'email'

export default function Canais() {
  // Aba e loja ficam na URL (?aba=email&loja=2): o link da tela de Lojas abre filtrado.
  const [params, setParams] = useSearchParams()
  const aba: Aba = params.get('aba') === 'email' ? 'email' : 'whatsapp'
  const loja = params.get('loja') ?? ''
  const me = useMe()
  const canEdit = me.data?.role === 'admin'
  const numbers = useWhatsappNumbers()
  const senders = useEmailSenders()

  function go(next: { aba?: Aba; loja?: string }) {
    const nextAba = next.aba ?? aba
    const nextLoja = next.loja ?? loja
    setParams({
      ...(nextAba === 'email' ? { aba: 'email' } : {}),
      ...(nextLoja ? { loja: nextLoja } : {}),
    })
  }

  return (
    <div className="page page-canais">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Canais</h1>
          <p className="page-subtitle">
            Números de WhatsApp e remetentes de e-mail usados nas campanhas e nos templates.
          </p>
        </div>
      </div>

      <div role="tablist" aria-label="Canal" className="seg-tabs">
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'whatsapp'}
          className="seg-tab"
          onClick={() => go({ aba: 'whatsapp' })}
        >
          WhatsApp
          {!!numbers.data?.length && <span className="seg-tab-count">{numbers.data.length}</span>}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'email'}
          className="seg-tab"
          onClick={() => go({ aba: 'email' })}
        >
          E-mail
          {!!senders.data?.length && <span className="seg-tab-count">{senders.data.length}</span>}
        </button>
      </div>

      {aba === 'whatsapp' ? (
        <NumerosTab canEdit={canEdit} loja={loja} onLoja={(v) => go({ loja: v })} />
      ) : (
        <RemetentesTab canEdit={canEdit} loja={loja} onLoja={(v) => go({ loja: v })} />
      )}
    </div>
  )
}

function StoreFilter({
  id,
  value,
  onChange,
  allLabel = 'Todas',
}: {
  id: string
  value: string
  onChange: (v: string) => void
  allLabel?: string
}) {
  const stores = useStores()
  return (
    <div className="field">
      <label htmlFor={id}>Loja</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {(stores.data ?? []).map((s) => (
          <option key={s.id} value={s.id}>
            {s.code} · {s.name}
          </option>
        ))}
      </select>
    </div>
  )
}

const AWAITING_META = 'Aguardando integração com a Meta'

function NotFromMeta() {
  return (
    <span className="muted" title={AWAITING_META}>
      —
    </span>
  )
}

function QualityDot({ value }: { value: WhatsappNumber['quality_rating'] }) {
  if (!value) return <NotFromMeta />
  return (
    <span className="canais-quality">
      <span className={`canais-dot q-${value.toLowerCase()}`} aria-hidden="true" />
      {QUALITY_LABEL[value]}
    </span>
  )
}

// ---------- WhatsApp ----------

function NumerosTab({
  canEdit,
  loja,
  onLoja,
}: {
  canEdit: boolean
  loja: string
  onLoja: (v: string) => void
}) {
  const numbers = useWhatsappNumbers()
  // undefined = fechado · null = novo · número = editar
  const [editing, setEditing] = useState<WhatsappNumber | null | undefined>(undefined)
  const [saved, setSaved] = useState<string | null>(null)
  const sync = useSyncNumbersFromMeta()
  const [syncErrors, setSyncErrors] = useState<string[]>([])
  const list = (numbers.data ?? []).filter((n) => !loja || String(n.store) === loja)

  function onSync() {
    setSaved(null)
    setSyncErrors([])
    sync.mutate(undefined, {
      onSuccess: (r) => {
        setSaved(`${r.updated} número(s) atualizado(s) com os dados da Meta.`)
        setSyncErrors(r.errors)
      },
    })
  }

  return (
    <>
      {saved && <MsgOk mensagem={saved} onClose={() => setSaved(null)} />}
      {sync.isError && (
        <MsgNok titulo="Não foi possível atualizar da Meta" mensagem={sync.error.message} />
      )}
      {syncErrors.length > 0 && (
        <MsgNok titulo="Alguns números não atualizaram" mensagem={syncErrors.join(' · ')} />
      )}

      <div className="filter-bar">
        <StoreFilter id="num-f-loja" value={loja} onChange={onLoja} />
        {canEdit && (
          <>
            <button type="button" className="btn" disabled={sync.isPending} onClick={onSync}>
              {sync.isPending ? 'Atualizando…' : 'Atualizar da Meta'}
            </button>
            <button type="button" className="btn primary" onClick={() => setEditing(null)}>
              Adicionar número
            </button>
          </>
        )}
      </div>

      {numbers.isError && (
        <MsgNok titulo="Não foi possível carregar os números" mensagem={numbers.error.message} />
      )}

      {numbers.isSuccess && !numbers.data.some((n) => n.meta_synced_at) && (
        <p className="muted canais-hint">
          Status na Meta, qualidade e limite de mensagens vêm da Meta: o CRM atualiza todo dia às
          7h, ou na hora pelo botão “Atualizar da Meta”.
        </p>
      )}

      <div className="table-wrap">
        <table className="table compact canais-table">
          <thead>
            <tr>
              <th>Apelido</th>
              <th>Número</th>
              <th>Loja</th>
              <th>Uso</th>
              <th>WABA</th>
              <th>No CRM</th>
              <th>Na Meta</th>
              <th>Qualidade</th>
              <th>Limite</th>
              <th className="num">Templates</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {numbers.isPending && (
              <tr>
                <td colSpan={11} className="muted">
                  Carregando…
                </td>
              </tr>
            )}
            {numbers.isSuccess && list.length === 0 && (
              <tr>
                <td colSpan={11} className="muted">
                  {loja ? 'Nenhum número nesta loja.' : 'Nenhum número cadastrado ainda.'}
                </td>
              </tr>
            )}
            {list.map((n) => (
              <tr key={n.id}>
                <td>
                  <div className="strong">{n.label}</div>
                  {n.display_name && <div className="muted canais-small">{n.display_name}</div>}
                </td>
                <td className="mono nowrap">{n.display_phone_number}</td>
                <td>{n.store_code}</td>
                <td>
                  <div>{PURPOSE_LABEL[n.purpose]}</div>
                  <div className="muted canais-small">
                    {MODE_LABEL[n.mode]} · {PROVIDER_LABEL[n.provider]}
                  </div>
                </td>
                <td className="mono canais-small">
                  {n.waba_id ?? <span className="muted">não informada</span>}
                </td>
                <td>
                  <span className={`badge sm ${n.active ? 'tone-green' : 'tone-gray'}`}>
                    {n.active ? 'Ativo' : 'Desligado'}
                  </span>
                </td>
                <td>
                  {n.meta_status ? (
                    <span className={`badge sm ${META_STATUS_TONE[n.meta_status]}`}>
                      {META_STATUS_LABEL[n.meta_status]}
                    </span>
                  ) : (
                    <NotFromMeta />
                  )}
                </td>
                <td className="nowrap">
                  <QualityDot value={n.quality_rating} />
                </td>
                <td className="nowrap">
                  {n.messaging_limit_tier ? (
                    (LIMIT_LABEL[n.messaging_limit_tier] ?? n.messaging_limit_tier)
                  ) : (
                    <NotFromMeta />
                  )}
                </td>
                <td className="num">{n.templates_count}</td>
                <td className="num">
                  {canEdit && (
                    <button type="button" className="btn xs" onClick={() => setEditing(n)}>
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <NumeroForm
          number={editing}
          storeId={loja ? Number(loja) : null}
          onClose={() => setEditing(undefined)}
          onSaved={(n) => {
            setSaved(editing ? `Número ${n.label} atualizado.` : `Número ${n.label} cadastrado.`)
            setEditing(undefined)
          }}
        />
      )}
    </>
  )
}

// ---------- E-mail ----------

function RemetentesTab({
  canEdit,
  loja,
  onLoja,
}: {
  canEdit: boolean
  loja: string
  onLoja: (v: string) => void
}) {
  const senders = useEmailSenders()
  const test = useTestEmailSender()
  const remove = useDeleteEmailSender()
  const [editing, setEditing] = useState<EmailSender | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<EmailSender | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Filtro por loja: mostra os da loja e os de "todas as lojas".
  const list = (senders.data ?? []).filter(
    (s) => !loja || s.store === null || String(s.store) === loja,
  )

  return (
    <>
      {saved && <MsgOk mensagem={saved} onClose={() => setSaved(null)} />}
      {error && (
        <MsgNok
          titulo="Não foi possível concluir"
          mensagem={error}
          onClose={() => setError(null)}
        />
      )}

      <div className="filter-bar">
        <StoreFilter id="snd-f-loja" value={loja} onChange={onLoja} />
        {canEdit && (
          <button type="button" className="btn primary" onClick={() => setEditing(null)}>
            Adicionar remetente
          </button>
        )}
      </div>

      {senders.isError && (
        <MsgNok titulo="Não foi possível carregar os remetentes" mensagem={senders.error.message} />
      )}

      <div className="table-wrap">
        <table className="table compact canais-table">
          <thead>
            <tr>
              <th>Apelido</th>
              <th>Remetente</th>
              <th>Loja</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Último teste</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {senders.isPending && (
              <tr>
                <td colSpan={7} className="muted">
                  Carregando…
                </td>
              </tr>
            )}
            {senders.isSuccess && list.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  Nenhum remetente cadastrado ainda.
                </td>
              </tr>
            )}
            {list.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="strong">
                    {s.label}
                    {s.is_default && (
                      <span className="badge sm tone-blue canais-default">Padrão</span>
                    )}
                  </div>
                  {s.notes && <div className="muted canais-small">{s.notes}</div>}
                </td>
                <td>
                  <div>{s.from_name}</div>
                  <div className="mono muted canais-small">{s.from_email}</div>
                  {s.reply_to && <div className="muted canais-small">Respostas: {s.reply_to}</div>}
                </td>
                <td>{s.store_code ?? 'Todas'}</td>
                <td>
                  <div>{SENDER_PURPOSE_LABEL[s.purpose]}</div>
                  <div className="muted canais-small">{SENDER_PROVIDER_LABEL[s.provider]}</div>
                </td>
                <td>
                  <span className={`badge sm ${SENDER_STATUS_TONE[s.status]}`}>
                    {SENDER_STATUS_LABEL[s.status]}
                  </span>
                </td>
                <td className="muted nowrap">
                  {s.last_test_at ? formatLastAccess(s.last_test_at) : 'Nunca'}
                </td>
                <td className="num nowrap">
                  {canEdit && (
                    <div className="canais-actions">
                      <button
                        type="button"
                        className="btn xs"
                        disabled={test.isPending}
                        title="Envia um e-mail deste remetente para você"
                        onClick={() => {
                          setError(null)
                          test.mutate(s.id, {
                            onSuccess: (r) => setSaved(`Teste de ${s.label} enviado para ${r.to}.`),
                            onError: (err) => setError(err.message),
                          })
                        }}
                      >
                        {test.isPending && test.variables === s.id ? 'Enviando…' : 'Enviar teste'}
                      </button>
                      <button type="button" className="btn xs" onClick={() => setEditing(s)}>
                        Editar
                      </button>
                      {s.status !== 'active' && (
                        <button type="button" className="btn xs" onClick={() => setDeleting(s)}>
                          Excluir
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <RemetenteForm
          sender={editing}
          onClose={() => setEditing(undefined)}
          onSaved={(s) => {
            setSaved(
              editing ? `Remetente ${s.label} atualizado.` : `Remetente ${s.label} cadastrado.`,
            )
            setEditing(undefined)
          }}
        />
      )}

      {deleting && (
        <Modal
          open
          titulo="Excluir remetente"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button type="button" className="btn sm" onClick={() => setDeleting(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn sm dark"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(deleting.id, {
                    onSuccess: () => {
                      setSaved(`Remetente ${deleting.label} excluído.`)
                      setDeleting(null)
                    },
                    onError: (err) => {
                      setError(err.message)
                      setDeleting(null)
                    },
                  })
                }
              >
                {remove.isPending ? 'Excluindo…' : 'Excluir'}
              </button>
            </>
          }
        >
          <p>
            Excluir o remetente <strong>{deleting.label}</strong> ({deleting.from_email})?
          </p>
        </Modal>
      )}
    </>
  )
}
