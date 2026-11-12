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

export const JOB_LABEL: Record<string, string> = {
  refresh_campaign_counts: 'Campanhas dos 30 dias (clientes)',
  sync_numbers: 'Qualidade dos números na Meta',
  sync_template_analytics: 'Estatísticas dos templates na Meta',
  download_media: 'Copiar mídia da conversa (Meta → R2)',
  purge_old_media: 'Apagar mídias antigas (prazo de retenção)',
}

export const FIELD_LABEL: Record<string, string> = {
  messages: 'Mensagem / status',
  statuses: 'Status de envio',
  message_template_status_update: 'Status de template',
}
