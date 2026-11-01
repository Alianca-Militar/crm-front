import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'

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
}

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

export const PAGE_SIZE = 50
