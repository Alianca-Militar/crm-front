import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../../lib/api'

export type CampaignStatus =
  'draft' | 'audience_ready' | 'exported' | 'sending' | 'sent' | 'cancelled'

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: 'Rascunho',
  audience_ready: 'Público pronto',
  exported: 'Exportada',
  sending: 'Enviando',
  sent: 'Enviada',
  cancelled: 'Cancelada',
}

export const CAMPAIGN_STATUS_TONE: Record<CampaignStatus, string> = {
  draft: 'tone-gray',
  audience_ready: 'tone-yellow',
  exported: 'tone-blue',
  sending: 'tone-blue',
  sent: 'tone-green',
  cancelled: 'tone-red',
}

/** Filtros do público (mesmas chaves do backend: campaigns/audience.py). */
export type AudienceFilters = {
  corporacoes?: string[]
  patentes?: string[]
  stores?: number[]
  cities?: number[]
  rfm_segments?: string[]
  birthday_months?: number[]
  tags?: string[]
  /** grupo e categoria do cadastro de produtos (valem para o mesmo produto comprado) */
  product_groups?: string[]
  product_categories?: string[]
  purchased_within_days?: number
  not_purchased_days?: number
  orders_min?: number
  orders_max?: number
  spent_min?: string
  spent_max?: string
}

/** crm = filtros sobre os clientes; external = contatos de um arquivo */
export type AudienceSource = 'crm' | 'external'

export type Campaign = {
  id: number
  store: number
  store_code: string
  store_name: string
  name: string
  objective: string | null
  whatsapp_number: number
  number_label: string
  template: number
  template_name: string
  template_status: string
  audience_source: AudienceSource
  contacts_count: number
  audience_filters: AudienceFilters
  template_values: Record<string, string>
  status: CampaignStatus
  exported_at: string | null
  sent_at: string | null
  frequency_cap_days: number
  notes: string | null
  is_locked: boolean
  audience_included: number | null
  audience_total: number | null
  created_at: string
  updated_at: string
  /** Só na lista: funil e vendas atribuídas (último toque, qualquer loja, janela da campanha). */
  results?: CampaignResults | null
}

export type CampaignResults = {
  sent: number
  delivered: number
  read: number
  orders: number
  buyers: number
  revenue: string
}

export type CampaignListFilters = {
  store?: string
  created_from?: string
  created_to?: string
}

export type CampaignInput = Pick<
  Campaign,
  | 'name'
  | 'objective'
  | 'whatsapp_number'
  | 'template'
  | 'audience_source'
  | 'audience_filters'
  | 'template_values'
  | 'frequency_cap_days'
  | 'notes'
>

export type ExclusionReason =
  | 'optout'
  | 'frequency_cap'
  | 'no_whatsapp'
  | 'invalid_phone'
  | 'duplicate'
  | 'missing_data'
  | 'manual'

export type AudienceRow = {
  customer_id: number | null
  name: string
  phone: string
  included: boolean
  reason: ExclusionReason | null
  reason_label: string | null
  values: Record<string, string>
}

export type AudienceSummary = {
  matched: number
  included: number
  excluded: Partial<Record<ExclusionReason, number>>
  no_phone: number
  sample: AudienceRow[]
}

export type FilterOptions = {
  corporacoes: string[]
  patentes: string[]
  rfm_segments: string[]
  tags: string[]
  cities: { value: number; label: string }[]
  stores: { value: number; label: string }[]
  products: { group: string; categories: string[] }[]
  exclusions: Record<ExclusionReason, string>
}

const key = ['campaigns'] as const

export function useCampaigns(filters: CampaignListFilters = {}) {
  const search = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString()
  return useQuery({
    queryKey: [...key, 'list', filters],
    queryFn: () => api<Campaign[]>(`/campaigns/${search ? `?${search}` : ''}`),
    placeholderData: keepPreviousData,
  })
}

export function useCampaign(id: number | null) {
  return useQuery({
    queryKey: [...key, 'detail', id],
    queryFn: () => api<Campaign>(`/campaigns/${id}/`),
    enabled: id !== null,
  })
}

export function useFilterOptions() {
  return useQuery({
    queryKey: [...key, 'filter-options'],
    queryFn: () => api<FilterOptions>('/campaigns/filter-options/'),
    staleTime: 5 * 60 * 1000,
  })
}

export type EstimateInput = {
  whatsapp_number: number
  template: number | null
  audience_filters: AudienceFilters
  template_values: Record<string, string>
  frequency_cap_days: number
  campaign: number | null
  audience_source: AudienceSource
}

/** Estimativa do público (não grava). Só roda com o número escolhido. */
export function useEstimate(input: EstimateInput | null) {
  return useQuery({
    queryKey: [...key, 'estimate', input],
    queryFn: () => api<AudienceSummary>('/campaigns/estimate/', { method: 'POST', body: input }),
    enabled: input !== null,
    placeholderData: (previous) => previous,
  })
}

function useInvalidate() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: key })
}

export function useSaveCampaign() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: CampaignInput }) =>
      id
        ? api<Campaign>(`/campaigns/${id}/`, { method: 'PATCH', body: data })
        : api<Campaign>('/campaigns/', { method: 'POST', body: data }),
    onSuccess: invalidate,
  })
}

export function useDeleteCampaign() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/campaigns/${id}/`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export function useBuildAudience() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) =>
      api<AudienceSummary>(`/campaigns/${id}/build-audience/`, { method: 'POST' }),
    onSuccess: invalidate,
  })
}

export function useCancelCampaign() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => api<Campaign>(`/campaigns/${id}/cancel/`, { method: 'POST' }),
    onSuccess: invalidate,
  })
}

export type AudiencePage = {
  count: number
  page: number
  pages: number
  results: AudienceRow[]
}

export function useAudience(id: number | null, included: boolean, page: number) {
  return useQuery({
    queryKey: [...key, 'audience', id, included, page],
    queryFn: () =>
      api<AudiencePage>(`/campaigns/${id}/audience/?included=${included}&page=${page}`),
    enabled: id !== null,
    placeholderData: (previous) => previous,
  })
}

function getCookie(name: string): string {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=')[1]) : ''
}

/** Baixa o CSV da FastZap (POST: a primeira exportação trava a campanha). */
async function downloadExport(id: number): Promise<void> {
  if (!getCookie('csrftoken')) await fetch('/api/auth/csrf/', { credentials: 'same-origin' })
  const response = await fetch(`/api/campaigns/${id}/export/`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-CSRFToken': getCookie('csrftoken') },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new ApiError(response.status, body?.detail ?? `Erro ${response.status}.`)
  }
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `campanha-${id}.csv`
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export function useExportCampaign() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: downloadExport, onSuccess: invalidate })
}

// ---------- Base externa (arquivo) ----------

export type ContactsSummary = {
  count: number
  invalid_phones: number
  /** variáveis encontradas nas colunas do arquivo */
  columns: string[]
  sample: ({ row: number; phone: string; name: string } & Record<string, string | number>)[]
  duplicates?: number
  empty_rows?: number
  ignored_columns?: string[]
}

export function useContacts(id: number | null) {
  return useQuery({
    queryKey: [...key, 'contacts', id],
    queryFn: () => api<ContactsSummary>(`/campaigns/${id}/contacts/`),
    enabled: id !== null,
  })
}

export function useUploadContacts() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const body = new FormData()
      body.append('file', file)
      body.append('consent', 'true')
      return api<ContactsSummary>(`/campaigns/${id}/contacts/`, { method: 'POST', body })
    },
    onSuccess: invalidate,
  })
}

export function useDeleteContacts() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/campaigns/${id}/contacts/`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}
