import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { DateRange } from '../../../components/date_range/date_range_utils'
import { api } from '../../../lib/api'
import { call, client, type Schemas } from '../../../lib/api_client'
import type { ProductLeaf } from './vendas_produto_utils'

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

/** Uma linha por subcategoria (valores em texto decimal). */
type ProductSalesRow = {
  group: string
  category: string
  subcategory: string
  amount: string
  gross: string
  discount: string
  quantity: string
  amount_with_cost: string
  cost: string
}

export function useProductsReport(range: DateRange) {
  const params = new URLSearchParams({ start: range.start, end: range.end })
  return useQuery({
    queryKey: ['reports', 'products', range.start, range.end],
    queryFn: async (): Promise<ProductLeaf[]> =>
      (await api<ProductSalesRow[]>(`/reports/products/?${params}`)).map((r) => ({
        grupo: r.group,
        categoria: r.category,
        subcategoria: r.subcategory,
        valor: Number(r.amount),
        bruto: Number(r.gross),
        desconto: Number(r.discount),
        qtd: Number(r.quantity),
        valorComCusto: Number(r.amount_with_cost),
        custo: Number(r.cost),
      })),
    placeholderData: keepPreviousData,
  })
}

export type CustomerBaseReport = Schemas['CustomerBaseReport']

/** Base de clientes: a foto de hoje; o período vale para vendas sem cliente e receita do RFM. */
export function useCustomerBaseReport(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'customers', range.start, range.end],
    queryFn: () =>
      call(
        client.GET('/api/reports/customers/', {
          params: { query: { start: range.start, end: range.end } },
        }),
      ),
    placeholderData: keepPreviousData,
  })
}

export type IndicatorsReport = Schemas['IndicatorsReport']

/** Indicadores (PA, ticket médio, markup, faturamento) contra os mesmos dias do ano anterior. */
export function useIndicatorsReport(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'indicators', range.start, range.end],
    queryFn: () =>
      call(
        client.GET('/api/reports/indicators/', {
          params: { query: { start: range.start, end: range.end } },
        }),
      ),
    placeholderData: keepPreviousData,
  })
}
