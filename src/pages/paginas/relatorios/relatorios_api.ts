import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { DateRange } from '../../../components/date_range/date_range_utils'
import { api } from '../../../lib/api'

/** Campanhas num período, independente de quando cada uma começou (valores em texto decimal). */
export type CampaignsReport = {
  /** Campanhas com envio no período. */
  campaigns: number
  /** Enviados, entregues e lidos pela data de cada status. */
  sent: number
  delivered: number
  read: number
  /** Links curtos das campanhas cuja janela passa pelo período; cliques feitos no período. */
  links: number
  clicks: number
  people: number
  /** Vendas atribuídas a uma campanha, feitas no período. */
  orders: number
  buyers: number
  revenue: string
  /** Custo dos envios do período; unpriced = envios sem preço no número. */
  cost: string
  unpriced: number
  daily: { day: string; total: string; campaign: string }[]
}

export function useCampaignsReport(range: DateRange) {
  const params = new URLSearchParams({ start: range.start, end: range.end })
  return useQuery({
    queryKey: ['reports', 'campaigns', range.start, range.end],
    queryFn: () => api<CampaignsReport>(`/reports/campaigns/?${params}`),
    placeholderData: keepPreviousData,
  })
}
