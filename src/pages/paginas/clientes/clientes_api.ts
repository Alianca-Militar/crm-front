import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { OptoutRow } from '../bloqueios/bloqueios_api'
import type { PastConversation } from '../conversas/conversas_api'

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] }

export type CustomerRow = {
  id: number
  name: string | null
  cpf: string | null
  primary_phone: string | null
  has_email: boolean
  home_store: number | null
  store_name: string | null
  corp_tipo: string | null
  rfm_segment: string | null
  orders_count: number
  total_spent: string | null
  last_order_at: string | null
  is_generic: boolean
}

export type CustomerPhone = {
  id: number
  phone_normalized: string | null
  source: string | null
  is_primary: boolean
  has_whatsapp: boolean | null
}

export type CustomerDetails = {
  corp_tipo: string | null
  patente: string | null
  first_order_at: string | null
  last_order_at: string | null
  orders_count: number
  total_spent: string
  avg_ticket: string | null
  favorite_category: string | null
  rfm_segment: string | null
  last_campaign_sent_at: string | null
  /** Campanhas diferentes recebidas nos últimos 30 dias (recalculado 1 vez por dia). */
  campaigns_received_30d: number
  last_message_in_at: string | null
  last_message_out_at: string | null
  tags: string[]
}

export type BlocklistRow = {
  phone_normalized: string
  scope: 'all_stores' | 'store'
  status: string
  source: string
  since: string
}

export type Customer = {
  id: number
  name: string | null
  cpf: string | null
  email: string | null
  birth_date: string | null
  address: string | null
  numero: string | null
  complemento: string | null
  cep: string | null
  city_name: string | null
  state_code: string | null
  store_name: string | null
  is_generic: boolean
  source: string | null
  created_at: string
  phones: CustomerPhone[]
  details: CustomerDetails | null
  marketing_status: BlocklistRow[]
  /** Pedidos de bloqueio e liberações dos telefones do cliente. */
  optout_history: OptoutRow[]
}

/** Conversa na ficha: a do histórico, com a loja e se ainda está aberta. */
export type CustomerConversation = PastConversation & { store: string; status: 'open' | 'closed' }

export type OrderLine = {
  nmr_seq: number
  sku: string | null
  product_name: string
  quantity: string
  total_price: string
}

export type CustomerOrder = {
  id: number
  store_name: string
  orc_id: string
  status: string
  total_amount: string
  vlr_desc: string
  cond_pag: string | null
  ordered_at: string
  items: OrderLine[]
}

export type CustomerSend = {
  id: number
  campaign: number
  campaign_name: string
  current_status: string
  sent_at: string | null
  read_at: string | null
  failed_at: string | null
}

export type CustomerFilters = {
  q?: string
  corp?: string
  store?: string
  segment?: string
  buyers?: string
  last_order_from?: string
  last_order_to?: string
  blocked?: string
  ordering?: string
  page?: number
}

export type FilterOptions = {
  corporations: string[]
  segments: string[]
  stores: { id: number; code: string; name: string }[]
  total: number
  with_phone: number
  buyers: number
}

const key = ['customers'] as const

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, String(v))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: [...key, 'list', filters],
    queryFn: () => api<Page<CustomerRow>>(`/customers/${query(filters)}`),
    placeholderData: keepPreviousData,
  })
}

export function useCustomerOptions() {
  return useQuery({
    queryKey: [...key, 'filter-options'],
    queryFn: () => api<FilterOptions>('/customers/filter-options/'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: [...key, 'detail', id],
    queryFn: () => api<Customer>(`/customers/${id}/`),
    enabled: Number.isFinite(id),
  })
}

export function useCustomerOrders(id: number, page: number) {
  return useQuery({
    queryKey: [...key, 'orders', id, page],
    queryFn: () => api<Page<CustomerOrder>>(`/customers/${id}/orders/${query({ page })}`),
    enabled: Number.isFinite(id),
    placeholderData: keepPreviousData,
  })
}

export function useCustomerSends(id: number) {
  return useQuery({
    queryKey: [...key, 'sends', id],
    queryFn: () => api<Page<CustomerSend>>(`/customers/${id}/campaign-sends/`),
    enabled: Number.isFinite(id),
  })
}

/** Linha do tempo das conversas (só leitura), das lojas do usuário. */
export function useCustomerConversations(id: number, enabled: boolean) {
  return useQuery({
    queryKey: [...key, 'conversations', id],
    queryFn: () => api<CustomerConversation[]>(`/customers/${id}/conversations/`),
    enabled: enabled && Number.isFinite(id),
  })
}

export type AttachmentKind = 'image' | 'audio' | 'video' | 'document'

export type Attachment = {
  id: number
  conversation: number
  type: string
  direction: 'in' | 'out'
  at: string
  number_label: string
  store_code: string
  caption: string | null
  /** Abre o arquivo (o backend confere a permissão e manda para o R2). */
  media_url: string | null
  media_pending: boolean
  media_removed: boolean
  media_mime_type: string | null
  media_filename: string | null
}

export type AttachmentsPage = {
  counts: Record<AttachmentKind, number>
  kind: AttachmentKind
  page: number
  has_more: boolean
  items: Attachment[]
}

/** Aba Anexos: fotos, áudios, vídeos e documentos das conversas (lojas do usuário). */
export function useCustomerAttachments(id: number, kind: AttachmentKind, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: [...key, 'attachments', id, kind],
    queryFn: ({ pageParam }) =>
      api<AttachmentsPage>(`/customers/${id}/attachments/?kind=${kind}&page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.has_more ? last.page + 1 : undefined),
    enabled: enabled && Number.isFinite(id),
  })
}

/** "Cliente pediu para não receber": bloqueia todos os telefones do cliente nas campanhas. */
export function useCustomerOptout(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) =>
      api<OptoutRow[]>(`/customers/${id}/optout/`, { method: 'POST', body: { reason } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['optouts'] })
    },
  })
}

export const PAGE_SIZE = 50
