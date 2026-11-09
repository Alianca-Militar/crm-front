import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { IconCheck, IconChevronLeft, IconSearch } from '../../../components/menu/icons'
import { useMe } from '../../../lib/auth'
import { formatPhone, initials } from '../../../lib/format'
import {
  type ConversationDetail,
  type ConversationRow,
  type Message,
  type MsgStatus,
  type Tab,
  useConversation,
  useConversationAction,
  useConversationNumbers,
  useConversations,
  useTransferTargets,
} from './conversas_api'
import { CloseModal, TransferModal } from './conversas_modals'
import {
  formatAgo,
  formatDay,
  formatDuration,
  formatTime,
  useNow,
  waitTone,
  windowState,
} from './conversas_utils'
import './conversas.css'

const TABS: { value: Tab; label: string }[] = [
  { value: 'waiting', label: 'Aguardando' },
  { value: 'open', label: 'Abertas' },
  { value: 'closed', label: 'Encerradas' },
]

const STATUS_BADGE: Record<Tab, { label: string; tone: string }> = {
  waiting: { label: 'Aguardando', tone: 'tone-orange' },
  open: { label: 'Aberta', tone: 'tone-blue' },
  closed: { label: 'Encerrada', tone: 'tone-gray' },
}

/** Mensagem sem texto (foto, áudio…): o que mostrar no lugar. */
const MEDIA_LABEL: Record<string, string> = {
  image: '📷 Foto',
  video: '🎬 Vídeo',
  audio: '🎤 Áudio',
  voice: '🎤 Áudio',
  document: '📄 Documento',
  sticker: 'Figurinha',
  location: '📍 Localização',
  contacts: '👤 Contato',
  reaction: 'Reação',
}

const messageText = (m: Pick<Message, 'text' | 'type'>) =>
  m.text || MEDIA_LABEL[m.type] || `[${m.type}]`

/** Sem nome, a API manda o telefone no lugar: formata para ler melhor. */
const displayName = (c: ConversationRow) => (c.name === c.phone ? formatPhone(c.phone) : c.name)

function useDebounced<T>(value: T, ms = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(id)
  }, [value, ms])
  return debounced
}

export default function Conversas() {
  const now = useNow()
  const me = useMe().data
  const [tab, setTab] = useState<Tab>('waiting')
  // Admin e gerente abrem em "Todas"; o vendedor só vê as próprias de qualquer jeito.
  const [mine, setMine] = useState(false)
  const [store, setStore] = useState('')
  const [number, setNumber] = useState('')
  const [query, setQuery] = useState('')
  const q = useDebounced(query)
  const [selId, setSelId] = useState<number | null>(null)
  const [showChat, setShowChat] = useState(false) // celular: lista ou conversa
  const [modal, setModal] = useState<'transfer' | 'close' | null>(null)
  const [modalKey, setModalKey] = useState(0)

  const numbersQuery = useConversationNumbers()
  const allNumbers = numbersQuery.data ?? []
  const stores = [...new Map(allNumbers.map((n) => [n.store.id, n.store])).values()]
  // Com uma loja escolhida, o filtro de número só mostra os números dela.
  const numbers = allNumbers.filter((n) => !store || String(n.store.id) === store)

  const listQuery = useConversations({ tab, mine, store, number, q })
  const page = listQuery.data
  const list = page?.results ?? []
  const currentId = selId ?? list[0]?.id ?? null
  const detail = useConversation(currentId)
  const current = detail.data && detail.data.id === currentId ? detail.data : null
  const action = useConversationAction(currentId ?? 0)
  const targets = useTransferTargets(modal === 'transfer' ? currentId : null)

  // Atendimento pelo CRM desligado (Configurações): a tela só mostra, ninguém mexe.
  const canAct = page?.crm_send === true && me?.role !== 'analista'
  const canSupervise = page?.can_supervise === true

  function open(id: number) {
    setSelId(id)
    setShowChat(true)
    action.reset()
  }

  function openModal(kind: typeof modal) {
    setModalKey((k) => k + 1)
    setModal(kind)
  }

  function run(kind: 'assume' | 'release', nextTab: Tab) {
    action.mutate(
      { kind },
      {
        onSuccess: () => {
          setTab(nextTab)
          if (nextTab === 'open') setMine(true)
        },
      },
    )
  }

  return (
    <div className={showChat ? 'page-conversas show-chat' : 'page-conversas'}>
      <section aria-label="Lista de conversas" className="conversas-list">
        <div className="conversas-list-head">
          <div className="conversas-title-row">
            <h1 className="conversas-title">Conversas</h1>
            {/* Minhas/Todas só faz sentido em Abertas (Aguardando não tem responsável). */}
            {tab === 'open' && canSupervise && (
              <div className="conversas-toggle" role="group" aria-label="Responsável">
                <button type="button" aria-pressed={mine} onClick={() => setMine(true)}>
                  Minhas
                </button>
                <button type="button" aria-pressed={!mine} onClick={() => setMine(false)}>
                  Todas
                </button>
              </div>
            )}
          </div>

          <div className="conversas-search">
            <IconSearch size={18} />
            <label htmlFor="conversas-q" className="sr-only">
              Buscar conversa
            </label>
            <input
              id="conversas-q"
              type="search"
              placeholder="Nome, telefone ou mensagem"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelId(null)
              }}
            />
          </div>

          <div className="conversas-tabs-row">
            <div className="seg-tabs conversas-tabs" role="tablist" aria-label="Situação">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  className="seg-tab"
                  aria-selected={tab === t.value}
                  onClick={() => {
                    setTab(t.value)
                    setSelId(null)
                  }}
                >
                  {t.label}
                  {t.value !== 'closed' && page && (
                    <span className="seg-tab-count">{page.counts[t.value]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="conversas-subfilters">
            <div className="conversas-selects">
              <label htmlFor="conversas-store" className="sr-only">
                Loja
              </label>
              <select
                id="conversas-store"
                className="conversas-store"
                value={store}
                onChange={(e) => {
                  const next = e.target.value
                  setStore(next)
                  setSelId(null)
                  // O número escolhido pode não ser da nova loja.
                  const chosen = allNumbers.find((n) => String(n.id) === number)
                  if (next && chosen && String(chosen.store.id) !== next) setNumber('')
                }}
              >
                <option value="">Todas as lojas</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <label htmlFor="conversas-number" className="sr-only">
                Número
              </label>
              <select
                id="conversas-number"
                className="conversas-store"
                value={number}
                onChange={(e) => {
                  setNumber(e.target.value)
                  setSelId(null)
                }}
              >
                <option value="">Todos os números</option>
                {numbers.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="conversas-items" aria-busy={listQuery.isFetching}>
          {list.map((c) => (
            <ConversationItem
              key={c.id}
              c={c}
              now={now}
              selected={c.id === currentId}
              onClick={() => open(c.id)}
            />
          ))}
          {listQuery.isError && (
            <p className="conversas-empty" role="alert">
              {listQuery.error.message}
            </p>
          )}
          {listQuery.isPending && <p className="conversas-empty">Carregando…</p>}
          {page && list.length === 0 && (
            <p className="conversas-empty">
              {q
                ? 'Nenhuma conversa encontrada.'
                : tab === 'waiting'
                  ? 'Nenhum cliente esperando. 🎉'
                  : tab === 'open' && mine
                    ? 'Você não tem conversas abertas.'
                    : 'Nenhuma conversa aqui.'}
            </p>
          )}
          {page && page.count > list.length && (
            <p className="conversas-empty">
              Mostrando {list.length} de {page.count}. Use a busca ou os filtros para achar as
              outras.
            </p>
          )}
        </div>
      </section>

      <section aria-label="Conversa" className="conversas-chat">
        {current ? (
          <Chat
            key={current.id}
            c={current}
            now={now}
            meId={me?.id}
            canAct={canAct}
            canSupervise={canSupervise}
            busy={action.isPending}
            error={action.error?.message}
            onBack={() => setShowChat(false)}
            onAssume={() => run('assume', 'open')}
            onRelease={() => run('release', 'waiting')}
            onTransfer={() => openModal('transfer')}
            onClose={() => openModal('close')}
          />
        ) : (
          <div className="conversas-none">
            {detail.isError
              ? detail.error.message
              : currentId !== null
                ? 'Carregando…'
                : 'Escolha uma conversa na lista.'}
          </div>
        )}
      </section>

      <TransferModal
        key={`t${modalKey}`}
        open={modal === 'transfer' && current !== null}
        users={targets.data}
        busy={action.isPending}
        onClose={() => setModal(null)}
        onConfirm={(user) =>
          action.mutate({ kind: 'transfer', user: user.id }, { onSettled: () => setModal(null) })
        }
      />
      <CloseModal
        key={`c${modalKey}`}
        open={modal === 'close' && current !== null}
        busy={action.isPending}
        onClose={() => setModal(null)}
        onConfirm={(reason) =>
          action.mutate({ kind: 'close', reason }, { onSettled: () => setModal(null) })
        }
      />
    </div>
  )
}

function ConversationItem({
  c,
  now,
  selected,
  onClick,
}: {
  c: ConversationRow
  now: number
  selected: boolean
  onClick: () => void
}) {
  const waiting =
    c.tab === 'waiting' && c.waiting_since ? now - new Date(c.waiting_since).getTime() : 0
  const win = windowState(c.last_customer_at, now)
  const name = displayName(c)

  return (
    <button
      type="button"
      className={selected ? 'conversas-item selected' : 'conversas-item'}
      aria-current={selected ? 'true' : undefined}
      onClick={onClick}
    >
      <span className="avatar">{c.customer_id ? initials(name) : '?'}</span>
      <span className="conversas-item-body">
        <span className="conversas-item-top">
          <span className="conversas-item-name">{name}</span>
          <span className="conversas-item-when">{formatAgo(c.last_message_at, now)}</span>
        </span>
        <span className="conversas-item-last">
          {c.last_direction === 'out' && <span className="muted">Loja: </span>}
          {c.last_text ?? <span className="muted">mídia</span>}
        </span>
        <span className="conversas-item-tags">
          {c.tab === 'waiting' && (
            <span className={`badge sm ${waitTone(waiting)}`}>
              esperando {formatDuration(waiting)}
            </span>
          )}
          {c.tab === 'open' &&
            (c.assignee ? (
              <span className="badge sm tone-blue">{c.assignee.name}</span>
            ) : (
              <span className="badge sm tone-yellow">respondida pelo app</span>
            ))}
          {c.tab === 'open' && (
            <span className={`badge sm ${win.tone}`}>
              {win.open ? `janela ${formatDuration(win.ms)}` : 'janela fechada'}
            </span>
          )}
          {c.tab === 'closed' && c.close_reason && (
            <span className="badge sm tone-gray">{c.close_reason}</span>
          )}
          {c.campaign_name && <span className="badge sm tone-orange">{c.campaign_name}</span>}
          <span className="conversas-item-store">{c.number.label}</span>
        </span>
      </span>
    </button>
  )
}

type ChatProps = {
  c: ConversationDetail
  now: number
  meId: number | undefined
  canAct: boolean
  canSupervise: boolean
  busy: boolean
  error: string | undefined
  onBack: () => void
  onAssume: () => void
  onRelease: () => void
  onTransfer: () => void
  onClose: () => void
}

function Chat({
  c,
  now,
  meId,
  canAct,
  canSupervise,
  busy,
  error,
  onBack,
  onAssume,
  onRelease,
  onTransfer,
  onClose,
}: ChatProps) {
  const [showHistory, setShowHistory] = useState(false)
  const win = windowState(c.last_customer_at, now)
  const isMine = c.tab === 'open' && meId !== undefined && c.assignee?.id === meId
  // Vendedor só mexe nas próprias; admin e gerente em qualquer uma.
  const canHandle = canAct && (isMine || canSupervise)
  const badge = STATUS_BADGE[c.tab]
  // A API manda do mais recente para o mais antigo; na tela, em ordem de conversa.
  const history = [...c.history].reverse()

  return (
    <>
      <div className="conversas-chat-head">
        <button
          type="button"
          className="conversas-back"
          onClick={onBack}
          aria-label="Voltar para a lista"
        >
          <IconChevronLeft size={18} />
        </button>
        <div className="conversas-chat-who">
          <span className="conversas-chat-name">
            {displayName(c)} <span className={`badge sm ${badge.tone}`}>{badge.label}</span>
          </span>
          <span className="conversas-chat-meta">
            WhatsApp · {formatPhone(c.phone)} · {c.store.name} ({c.number.label})
            {c.assignee && ` · com ${c.assignee.name}`}
            {c.campaign_name && ` · veio da campanha ${c.campaign_name}`}
          </span>
        </div>
        <div className="conversas-chat-actions">
          {c.customer_id && (
            <Link to={`/clientes/${c.customer_id}`} className="btn xs">
              Ver ficha
            </Link>
          )}
          {canAct && c.tab === 'waiting' && (
            <button type="button" className="btn xs primary" disabled={busy} onClick={onAssume}>
              Assumir
            </button>
          )}
          {canAct && c.tab === 'open' && (
            <>
              {!isMine && (canSupervise || !c.assignee) && (
                <button type="button" className="btn xs" disabled={busy} onClick={onAssume}>
                  Assumir
                </button>
              )}
              {canHandle && (
                <>
                  <button type="button" className="btn xs" disabled={busy} onClick={onTransfer}>
                    Transferir
                  </button>
                  {c.assignee && (
                    <button type="button" className="btn xs" disabled={busy} onClick={onRelease}>
                      Devolver
                    </button>
                  )}
                  <button type="button" className="btn xs dark" disabled={busy} onClick={onClose}>
                    Encerrar
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="conversas-error" role="alert">
          {error}
        </p>
      )}
      {c.tab !== 'closed' && <WindowBar win={win} />}

      <div className="conversas-messages">
        {history.length > 0 && (
          <div className="conversas-history">
            <button
              type="button"
              className="conversas-history-toggle"
              aria-expanded={showHistory}
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? 'Esconder' : 'Ver'} {history.length}{' '}
              {history.length === 1 ? 'atendimento anterior' : 'atendimentos anteriores'}
            </button>
            {showHistory &&
              history.map((h) => (
                <div key={h.id} className="conversas-history-block">
                  <MessageList messages={h.messages} now={now} />
                  <div className="conversas-divider">
                    Encerrada
                    {h.closed_at && ` em ${new Date(h.closed_at).toLocaleDateString('pt-BR')}`}
                    {h.close_reason && ` · ${h.close_reason}`}
                    {h.assignee && ` · ${h.assignee}`}
                  </div>
                </div>
              ))}
          </div>
        )}
        <MessageList messages={c.messages} now={now} />
        {c.tab === 'closed' && (
          <div className="conversas-divider">
            Conversa encerrada
            {c.close_reason && ` · ${c.close_reason}`}
            {c.closed_by_name && ` · por ${c.closed_by_name}`}
          </div>
        )}
      </div>

      <div className="conversas-composer notice">
        <span>
          {c.tab === 'closed'
            ? 'Conversa encerrada. Se o cliente escrever de novo, ela volta para Aguardando.'
            : canAct
              ? 'O envio de mensagens pelo CRM ainda não está disponível.'
              : 'Somente consulta: o atendimento pelo CRM ainda não foi ligado. Responda pelo app do WhatsApp.'}
        </span>
      </div>
    </>
  )
}

function WindowBar({ win }: { win: ReturnType<typeof windowState> }) {
  return (
    <div className={`conversas-window ${win.tone}`} role="status">
      <span className="conversas-window-text">
        {win.open ? (
          <>
            Janela de 24h: <strong>restam {formatDuration(win.ms)}</strong> para responder
            livremente
          </>
        ) : win.ms > 0 ? (
          <>
            Janela de 24h <strong>fechada há {formatDuration(win.ms)}</strong>: só dá para enviar
            template
          </>
        ) : (
          <>
            <strong>Janela fechada</strong>: o cliente ainda não respondeu. Só dá para enviar
            template
          </>
        )}
      </span>
      {win.open && (
        <span className="conversas-window-bar" aria-hidden="true">
          <span style={{ width: `${Math.max(2, win.ratio * 100)}%` }} />
        </span>
      )}
    </div>
  )
}

function MessageList({ messages, now }: { messages: Message[]; now: number }) {
  const days = messages.map((m) => formatDay(m.at, now))
  return (
    <>
      {messages.map((m, i) => (
        <Fragment key={m.id}>
          {days[i] !== days[i - 1] && <div className="conversas-day">{days[i]}</div>}
          <Bubble m={m} />
        </Fragment>
      ))}
    </>
  )
}

const AUTHOR_LABEL: Record<Exclude<Message['author'], 'customer'>, string> = {
  crm: 'pelo CRM',
  api: 'por outro sistema',
  app: 'pelo app do WhatsApp',
  campaign: 'campanha',
  system: 'automática',
}

function Bubble({ m }: { m: Message }) {
  const out = m.direction === 'out'
  const who = m.author === 'customer' ? null : AUTHOR_LABEL[m.author]
  return (
    <div className={`conversas-msg ${out ? 'out' : 'in'} ${m.author}`}>
      <div className="conversas-bubble">
        {m.template && <span className="conversas-template-tag">Template · {m.template}</span>}
        {messageText(m)}
        {m.media_url && (
          <>
            {' '}
            <a href={m.media_url} target="_blank" rel="noreferrer" className="conv-link">
              abrir
            </a>
          </>
        )}
        <div className="conversas-time">
          {who && <span>{who} · </span>}
          {formatTime(m.at)}
          {out && m.status && <StatusTicks status={m.status} />}
        </div>
      </div>
    </div>
  )
}

function StatusTicks({ status }: { status: MsgStatus }) {
  if (status === 'failed') return <span className="conversas-failed"> · não entregue</span>
  const label = { sent: 'Enviada', delivered: 'Entregue', read: 'Lida' }[status]
  return (
    <span className={`conversas-ticks ${status}`} title={label} aria-label={label}>
      <IconCheck size={14} strokeWidth={2.4} />
      {status !== 'sent' && <IconCheck size={14} strokeWidth={2.4} />}
    </span>
  )
}
