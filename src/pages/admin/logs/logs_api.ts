import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'

export type LogType = 'access' | 'change' | 'send' | 'export' | 'error'

export const LOG_TYPE_LABEL: Record<LogType, string> = {
  access: 'Acesso',
  change: 'Alteração',
  send: 'Envio',
  export: 'Exportação',
  error: 'Erro',
}

export const LOG_TYPE_TONE: Record<LogType, string> = {
  access: 'tone-blue',
  change: 'tone-orange',
  send: 'tone-green',
  export: 'tone-yellow',
  error: 'tone-red',
}

export type AuditLogRow = {
  id: number
  occurred_at: string
  type: LogType
  /** Quem fez: nome do usuário, "Sistema"... */
  actor: string
  actor_id: number | null
  /** Texto em português ("Cadastrou a loja BH · ...") */
  description: string
  /** "Chrome · Windows · 189.10.20.30" */
  origin: string
  /** Código técnico ("store.create") */
  action: string
  entity_table: string | null
  entity_id: number | null
  /** Antes/depois (telefones já vêm mascarados) */
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

export type LogFilters = {
  q: string
  type: LogType | ''
  /** id do usuário, "system" ou vazio */
  user: string
  date_from: string
  date_to: string
}

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] }

export const PAGE_SIZE = 50

export function filterParams(filters: LogFilters, page?: number) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value.trim())
  }
  if (page && page > 1) params.set('page', String(page))
  return params
}

export function useAuditLogs(filters: LogFilters, page: number) {
  return useQuery({
    queryKey: ['audit-logs', filters, page],
    queryFn: () => api<Page<AuditLogRow>>(`/audit-logs/?${filterParams(filters, page)}`),
    // Mantém a página atual na tela enquanto a próxima carrega.
    placeholderData: keepPreviousData,
  })
}

/** Link do CSV com os mesmos filtros (o backend registra a exportação no log). */
export function exportUrl(filters: LogFilters) {
  return `/api/audit-logs/export/?${filterParams(filters)}`
}
