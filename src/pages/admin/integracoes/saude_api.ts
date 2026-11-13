import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'

export type Health = {
  now: string
  /** Limites (minutos) para amarelo/vermelho, definidos no backend. */
  limits_minutes: {
    worker_silent: number
    queue_waiting: number
    number_silent: number
    import_late: number
  }
  /** running = deu sinal de vida; busy = sem sinal, mas rodando um job longo. */
  worker: { state: 'running' | 'busy' | 'stopped'; last_seen_at: string | null; running: number }
  queue: {
    pending: number
    /** Esperando a próxima tentativa depois de um erro. */
    scheduled: number
    oldest_pending_at: string | null
    done_24h: number
  }
  numbers: {
    id: number
    label: string
    store: string
    last_webhook_at: string | null
    events_24h: number
  }[]
  failed_webhooks: {
    total: number
    items: {
      id: number
      field: string
      number_label: string | null
      received_at: string
      attempts: number
      error: string | null
    }[]
  }
  failed_jobs: {
    total: number
    items: {
      id: number
      job_type: string
      attempts: number
      max_attempts: number
      finished_at: string | null
      last_error: string | null
    }[]
  }
  imports: { store: string; last_at: string | null; rows: number }[]
}

const key = ['system-health'] as const

export function useHealth() {
  return useQuery({
    queryKey: key,
    queryFn: () => api<Health>('/system-health/'),
    refetchInterval: 60_000,
  })
}

export function useHealthAction(kind: 'reprocess' | 'retry') {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api<void>(
        kind === 'reprocess'
          ? `/system-health/webhooks/${id}/reprocess/`
          : `/system-health/jobs/${id}/retry/`,
        { method: 'POST' },
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  })
}

export type ReprocessInput = {
  start: string
  end: string
  /** Tipos de evento (campo do webhook); vazio = todos. */
  types: string[]
  simulate: boolean
}

export type ReprocessResult = {
  total: number
  by_field: Record<string, number>
  /** Job do worker que vai reprocessar; null quando só contou. */
  job: number | null
}

/** Reprocessa eventos da Meta de um período (simulate = só conta). */
export function useReprocessPeriod() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: ReprocessInput) =>
      api<ReprocessResult>('/system-health/webhooks/reprocess/', { method: 'POST', body: input }),
    onSuccess: (data) => {
      if (data.job) void client.invalidateQueries({ queryKey: key })
    },
  })
}

export const JOB_LABEL: Record<string, string> = {
  refresh_campaign_counts: 'Campanhas dos 30 dias (clientes)',
  sync_numbers: 'Qualidade dos números na Meta',
  sync_template_analytics: 'Estatísticas dos templates na Meta',
  download_media: 'Copiar mídia da conversa (Meta → R2)',
  purge_old_media: 'Apagar mídias antigas (prazo de retenção)',
  reprocess_webhooks: 'Reprocessar eventos da Meta',
}

export const FIELD_LABEL: Record<string, string> = {
  messages: 'Mensagem / status',
  statuses: 'Status de envio',
  smb_message_echoes: 'Mensagem pelo app (coexistência)',
  user_preferences: 'Preferência de marketing',
  phone_number_quality_update: 'Qualidade do número',
  business_capability_update: 'Limite de mensagens',
  phone_number_name_update: 'Nome do número',
  message_template_status_update: 'Status de template',
  message_template_quality_update: 'Qualidade de template',
  template_category_update: 'Categoria de template',
}
