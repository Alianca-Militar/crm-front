import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'

/** Visitas por tela no período (todas as telas do catálogo, mais vista primeiro). */
export type PageSummary = {
  page_code: string
  page: string
  route: string
  views: number
  /** usuários distintos */
  users: number
  last_view: string | null
}

export type PageViewRow = {
  id: number
  viewed_at: string
  user: string | null
  user_id: number | null
  page: string
  page_code: string
  route: string
  /** "BH · LOJA ..." ou null (todas as lojas) */
  store: string | null
}

export type PageViewFilters = {
  /** código da tela (crm.pages.code) */
  screen: string
  user: string
  store: string
  date_from: string
  date_to: string
}

type Page<T> = { count: number; results: T[] }

function params(filters: PageViewFilters, page?: number) {
  const out = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) out.set(key, value)
  }
  if (page && page > 1) out.set('page', String(page))
  return out
}

export function usePageSummary(filters: PageViewFilters) {
  // O resumo não filtra por tela: a tabela mostra todas e destaca a escolhida.
  const scope = { ...filters, screen: '' }
  return useQuery({
    queryKey: ['page-views', 'summary', scope],
    queryFn: () => api<PageSummary[]>(`/page-views/summary/?${params(scope)}`),
    placeholderData: keepPreviousData,
  })
}

export function usePageViews(filters: PageViewFilters, page: number) {
  return useQuery({
    queryKey: ['page-views', 'list', filters, page],
    queryFn: () => api<Page<PageViewRow>>(`/page-views/?${params(filters, page)}`),
    placeholderData: keepPreviousData,
  })
}
