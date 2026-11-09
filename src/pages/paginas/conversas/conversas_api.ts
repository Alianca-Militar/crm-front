import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { Role } from '../../../lib/auth'

export type Tab = 'waiting' | 'open' | 'closed'
export type MsgStatus = 'sent' | 'delivered' | 'read' | 'failed'
/** customer = cliente; crm/api = pelo CRM ou outro sistema; app = app do WhatsApp; campaign. */
export type MsgAuthor = 'customer' | 'crm' | 'api' | 'app' | 'campaign' | 'system'

export type Message = {
  id: number
  direction: 'in' | 'out'
  author: MsgAuthor
  type: string
  text: string | null
  template: string | null
  media_url: string | null
  media_mime_type: string | null
  at: string
  status: MsgStatus | null
  error_code: string | null
}

export type ConversationRow = {
  id: number
  tab: Tab
  status: 'open' | 'closed'
  customer_id: number | null
  name: string
  phone: string
  store: { id: number; name: string }
  number: { id: number; label: string }
  assignee: { id: number; name: string } | null
  origin: string | null
  campaign_name: string | null
  waiting_since: string | null
  started_at: string
  last_message_at: string
  last_customer_at: string | null
  last_text: string | null
  last_direction: 'in' | 'out' | null
  closed_at: string | null
  close_reason: string | null
}

export type PastConversation = {
  id: number
  number: string
  started_at: string
  closed_at: string | null
  close_reason: string | null
  assignee: string | null
  messages: Message[]
}

export type ConversationDetail = ConversationRow & {
  closed_by_name: string | null
  messages: Message[]
  history: PastConversation[]
}

export type ConversationList = {
  count: number
  next: string | null
  previous: string | null
  results: ConversationRow[]
  counts: { waiting: number; open: number }
  /** Atendimento pelo CRM ligado (Configurações). Desligado = tela só de consulta. */
  crm_send: boolean
  can_supervise: boolean
}

export type ConversationNumber = { id: number; label: string; store: { id: number; name: string } }
export type TransferTarget = { id: number; name: string; role: Role }

export type ConversationFilters = {
  tab: Tab
  mine: boolean
  store: string
  number: string
  q: string
}

/** Novas mensagens chegam pelo webhook: a tela rebusca sozinha. */
const POLL_MS = 30_000

const listKey = ['conversations', 'list'] as const
const detailKey = (id: number) => ['conversations', 'detail', id] as const

export function useConversations(f: ConversationFilters) {
  const params = new URLSearchParams({ tab: f.tab })
  if (f.mine && f.tab !== 'waiting') params.set('mine', '1')
  if (f.store) params.set('store', f.store)
  if (f.number) params.set('number', f.number)
  if (f.q.trim()) params.set('q', f.q.trim())
  return useQuery({
    queryKey: [...listKey, params.toString()],
    queryFn: () => api<ConversationList>(`/conversations/?${params}`),
    placeholderData: keepPreviousData,
    refetchInterval: POLL_MS,
  })
}

export function useConversation(id: number | null) {
  return useQuery({
    queryKey: detailKey(id ?? 0),
    queryFn: () => api<ConversationDetail>(`/conversations/${id}/`),
    enabled: id !== null,
    refetchInterval: POLL_MS,
  })
}

export function useConversationNumbers() {
  return useQuery({
    queryKey: ['conversations', 'numbers'],
    queryFn: () => api<ConversationNumber[]>('/conversations/numbers/'),
    staleTime: 5 * 60_000,
  })
}

export function useTransferTargets(id: number | null) {
  return useQuery({
    queryKey: ['conversations', 'transfer-targets', id],
    queryFn: () => api<TransferTarget[]>(`/conversations/${id}/transfer-targets/`),
    enabled: id !== null,
  })
}

type Action =
  | { kind: 'assume' | 'release' }
  | { kind: 'transfer'; user: number }
  | { kind: 'close'; reason: string }

/** Assumir, devolver, transferir e encerrar: só mudam o CRM, nada vai para a Meta. */
export function useConversationAction(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: Action) => {
      const { kind, ...body } = action
      return api<ConversationDetail>(`/conversations/${id}/${kind}/`, {
        method: 'POST',
        body: Object.keys(body).length ? body : undefined,
      })
    },
    onSuccess: (conv) => {
      queryClient.setQueryData(detailKey(conv.id), conv)
      void queryClient.invalidateQueries({ queryKey: listKey })
    },
  })
}
