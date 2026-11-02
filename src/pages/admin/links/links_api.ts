import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'

export type TrackedLink = {
  id: number
  code: string
  short_url: string
  name: string
  purpose: string | null
  store: number | null
  store_code: string | null
  destination_url: string
  append_utm: boolean
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  /** Destino com as UTMs e o ?lk= (para onde o clique leva de fato). */
  final_url: string
  active: boolean
  created_by_name: string | null
  created_at: string
  updated_at: string
  clicks: number
  unique_clicks: number
  clicks_7d: number
  visits: number
  channels: number
  sellers: number
  last_click_at: string | null
}

export type TrackedLinkInput = Pick<
  TrackedLink,
  | 'name'
  | 'purpose'
  | 'store'
  | 'destination_url'
  | 'append_utm'
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign'
  | 'utm_content'
  | 'active'
> & { code?: string }

export type LinkDay = {
  date: string
  clicks: number
  unique_clicks: number
  visits: number
  channels: number
  sellers: number
}

export type LinkStats = { days: LinkDay[]; devices: Record<string, number> }

export const DEVICE_LABEL: Record<string, string> = {
  mobile: 'Celular',
  desktop: 'Computador',
  other: 'Outro',
}

const linksKey = ['links'] as const

export function useLinks() {
  return useQuery({ queryKey: linksKey, queryFn: () => api<TrackedLink[]>('/links/') })
}

export function useLinkStats(id: number, days: number) {
  return useQuery({
    queryKey: [...linksKey, id, 'stats', days],
    queryFn: () => api<LinkStats>(`/links/${id}/stats/?days=${days}`),
  })
}

export function useSaveLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: Partial<TrackedLinkInput> }) =>
      id
        ? api<TrackedLink>(`/links/${id}/`, { method: 'PATCH', body: data })
        : api<TrackedLink>('/links/', { method: 'POST', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: linksKey }),
  })
}

export function useDeleteLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/links/${id}/`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: linksKey }),
  })
}

/** "Comunidade JF · Black Friday" → "comunidade-jf-black-friday" (sugestão de utm_campaign). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
