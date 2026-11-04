import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'

export type Integration = {
  id: number
  /** "pegasus_jf" */
  code: string
  name: string
  kind: 'external' | 'internal'
  store_code: string | null
  status: 'ok' | 'error' | 'disconnected'
  active: boolean
  last_success_at: string | null
  last_error_at: string | null
  last_error_message: string | null
  consecutive_failures: number
  last_log_at: string | null
  /** Ativa e sem chamada boa nas últimas 26 h (o coletor roda 1 vez por dia). */
  stale: boolean
}

export type IntegrationLogRow = {
  id: number
  occurred_at: string
  integration: number
  integration_name: string
  direction: 'inbound' | 'outbound'
  operation: string
  success: boolean
  http_status: number | null
  duration_ms: number | null
  records: number | null
  error_message: string | null
  /** Resumo do que veio (só contagens). */
  details: Record<string, number | string> | null
}

export type IntegrationLogFilters = {
  integration: string
  /** "ok", "error" ou vazio */
  result: string
  date_from: string
  date_to: string
}

type Page<T> = { count: number; results: T[] }

export const OPERATION_LABEL: Record<string, string> = {
  pegasus_ping: 'Teste de conexão',
  pegasus_customers: 'Clientes',
  pegasus_orders: 'Vendas',
}

/** Campos do resumo, na ordem em que aparecem. */
export const DETAIL_LABEL: Record<string, string> = {
  version: 'Versão do coletor',
  received: 'Linhas recebidas',
  new: 'Linhas novas',
  changed: 'Linhas alteradas',
  unchanged: 'Linhas sem mudança',
  customers_new: 'Clientes novos',
  customers_updated: 'Clientes atualizados',
  customers_by_phone: 'Juntados pelo telefone (já existiam)',
  companies: 'Empresas (CNPJ, fora das campanhas)',
  customers_without_phone: 'Clientes sem telefone',
  cpf_duplicates: 'CPF repetido',
  phones_new: 'Telefones novos',
  phones_taken: 'Telefone já de outro cliente',
  phones_invalid: 'Telefones inválidos',
  orders_new: 'Vendas novas',
  orders_updated: 'Vendas atualizadas',
  orders_cancelled: 'Vendas canceladas',
  orders_ignored: 'Ignoradas (orçamento, não venda)',
  items: 'Itens',
  batch: 'Lote',
}

// O que aparece na linha da tabela; o resto fica nos detalhes.
const SUMMARY: Record<string, [string, string][]> = {
  pegasus_customers: [
    ['received', 'recebidos'],
    ['customers_new', 'novos'],
    ['customers_updated', 'atualizados'],
  ],
  pegasus_orders: [
    ['received', 'recebidas'],
    ['orders_new', 'novas'],
    ['orders_updated', 'atualizadas'],
    ['orders_cancelled', 'canceladas'],
    ['unchanged', 'sem mudança'],
  ],
}

export function operationLabel(operation: string) {
  return OPERATION_LABEL[operation] ?? operation
}

/** "5834 recebidos · 1 novos" (zeros somem, menos o total recebido). */
export function summarize(log: IntegrationLogRow) {
  if (!log.success) return log.error_message || 'Erro'
  // Chamadas de antes do resumo existir (ou sem resumo): só o total.
  if (!log.details) return log.records === null ? '—' : `${log.records} registros`
  const details = log.details
  if (log.operation === 'pegasus_ping') {
    return details.version ? `Coletor ${details.version}` : 'Chave e conexão ok'
  }
  const parts = (SUMMARY[log.operation] ?? [])
    .filter(([key], i) => i === 0 || Number(details[key] ?? 0) > 0)
    .map(([key, label]) => `${details[key] ?? 0} ${label}`)
  if (parts.length) return parts.join(' · ')
  return log.records === null ? '—' : `${log.records} registros`
}

const integrationsKey = ['integrations']

export function useIntegrations() {
  return useQuery({
    queryKey: integrationsKey,
    queryFn: () => api<Integration[]>('/integrations/'),
  })
}

export function useSetIntegrationActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api<Integration>(`/integrations/${id}/`, { method: 'PATCH', body: { active } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationsKey }),
  })
}

/** As últimas 10 chamadas de uma integração. */
export function useLastIntegrationLogs(id: number) {
  return useQuery({
    queryKey: ['integration-logs', 'last', id],
    queryFn: () => api<IntegrationLogRow[]>(`/integrations/${id}/logs/`),
  })
}

export function useIntegrationLogs(filters: IntegrationLogFilters, page: number) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  if (page > 1) params.set('page', String(page))
  return useQuery({
    queryKey: ['integration-logs', 'list', filters, page],
    queryFn: () => api<Page<IntegrationLogRow>>(`/integration-logs/?${params}`),
    placeholderData: keepPreviousData,
  })
}
