import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { call, client, type Schemas } from '../../../lib/api_client'

export type Sale = Schemas['Sale']
export type ImportStatus = Schemas['ImportStatus']
export type SalesGroup = Schemas['Group']

/** Filtros da tela (vazio = sem filtro). */
export type SalesFilters = {
  start: string
  end: string
  store: string
  campaign: string
  q: string
}

function query(f: SalesFilters) {
  return {
    start: f.start,
    end: f.end,
    store: f.store ? Number(f.store) : undefined,
    campaign: f.campaign || undefined,
    q: f.q.trim() || undefined,
  }
}

const key = ['sales'] as const

export function useSales(f: SalesFilters, page: number) {
  return useQuery({
    queryKey: [...key, 'list', f, page],
    queryFn: () => call(client.GET('/api/sales/', { params: { query: { ...query(f), page } } })),
    placeholderData: keepPreviousData,
  })
}

/** Totais e os gráficos de todas as vendas do filtro (não só da página). */
export function useSalesSummary(f: SalesFilters) {
  return useQuery({
    queryKey: [...key, 'summary', f],
    queryFn: () => call(client.GET('/api/sales/summary/', { params: { query: query(f) } })),
    placeholderData: keepPreviousData,
  })
}

export function useImports() {
  return useQuery({
    queryKey: [...key, 'imports'],
    queryFn: () => call(client.GET('/api/sales/imports/')),
    refetchInterval: 5 * 60_000,
  })
}

export function useSalesOptions() {
  return useQuery({
    queryKey: [...key, 'options'],
    queryFn: () => call(client.GET('/api/sales/filter-options/')),
    staleTime: 5 * 60_000,
  })
}

/** Link do Excel com os filtros atuais (o navegador baixa com a sessão). */
export function exportUrl(f: SalesFilters): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query(f))) if (v !== undefined) params.set(k, String(v))
  return `/api/sales/export/?${params}`
}
