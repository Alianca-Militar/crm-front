import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { Page } from '../clientes/clientes_api'

export type OptoutSource =
  | 'button'
  | 'whatsapp_preference'
  | 'text_keyword'
  | 'seller'
  | 'send_error_131050'
  | 'manual'
  | 'import'

export const SOURCE_LABEL: Record<OptoutSource, string> = {
  button: 'Botão',
  whatsapp_preference: 'Preferência do WhatsApp',
  text_keyword: 'Palavra-chave',
  seller: 'Vendedor',
  send_error_131050: 'Erro 131050 no envio',
  manual: 'Manual',
  import: 'Importação',
}

export type Scope = 'all_stores' | 'store'

export type BlockedRow = {
  id: number
  /** Pedido que gerou o bloqueio (usado para ver o telefone completo). */
  optout: number
  /** Mascarado para quem não é Admin. */
  phone_normalized: string
  customer_id: number | null
  customer_name: string | null
  scope: Scope
  store_id: number | null
  store_name: string | null
  source: OptoutSource
  since: string
  reason: string | null
}

export type OptoutRow = {
  id: number
  customer: number | null
  customer_name: string | null
  phone_normalized: string
  status: 'blocked' | 'released'
  source: OptoutSource
  scope: Scope
  store: number | null
  store_name: string | null
  origin_text: string | null
  needs_review: boolean
  reviewed_at: string | null
  reviewed_by_name: string | null
  created_by_name: string | null
  occurred_at: string
}

export type BlockedFilters = {
  q?: string
  source?: string
  store?: string
  since_from?: string
  since_to?: string
  page?: number
}

export type ManualOptout = {
  phone: string
  status: 'blocked' | 'released'
  reason: string
  scope: Scope
  store?: number | null
}

const key = ['optouts'] as const

/** A lista mostra o telefone mascarado (só o Admin vê completo). */
export const isMasked = (phone: string) => phone.includes('*')

/** Telefone completo de um bloqueio. Fica registrado no log. */
export async function revealPhone(optoutId: number): Promise<string> {
  return (await api<{ phone: string }>(`/optouts/${optoutId}/phone/`)).phone
}

/** O telefone completo: o da lista, ou pedido ao backend se veio mascarado. */
export function fullPhone(phone: string, optoutId: number): Promise<string> {
  return isMasked(phone) ? revealPhone(optoutId) : Promise.resolve(phone)
}

/** Abre o histórico do telefone completo (pede ao backend se a lista veio mascarada). */
export function openFullHistory(
  phone: string,
  optoutId: number,
  onHistory: (phone: string) => void,
) {
  fullPhone(phone, optoutId)
    .then(onHistory)
    .catch(() => undefined)
}

export function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, String(v))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export function useBlocklist(filters: BlockedFilters) {
  return useQuery({
    queryKey: [...key, 'blocklist', filters],
    queryFn: () => api<Page<BlockedRow>>(`/optouts/blocklist/${query(filters)}`),
    placeholderData: keepPreviousData,
  })
}

export function usePhoneHistory(phone: string) {
  return useQuery({
    queryKey: [...key, 'history', phone],
    queryFn: () => api<Page<OptoutRow>>(`/optouts/${query({ phone })}`),
    enabled: phone.replace(/\D/g, '').length >= 10,
  })
}

export function useReviewQueue() {
  return useQuery({
    queryKey: [...key, 'review'],
    queryFn: () => api<Page<OptoutRow>>('/optouts/review/'),
  })
}

/** Depois de qualquer mudança: listas de bloqueio e a busca de clientes (filtro "bloqueado"). */
function useRefresh() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: key })
    void queryClient.invalidateQueries({ queryKey: ['customers'] })
  }
}

export function useManualOptout() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (body: ManualOptout) => api<OptoutRow>('/optouts/', { method: 'POST', body }),
    onSuccess: refresh,
  })
}

export function useReviewAction(kind: 'confirm' | 'discard') {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: number) => api<OptoutRow>(`/optouts/${id}/${kind}/`, { method: 'POST' }),
    onSuccess: refresh,
  })
}

export const EXPORT_URL = '/api/optouts/blocklist/export/'
export const PAGE_SIZE = 50
