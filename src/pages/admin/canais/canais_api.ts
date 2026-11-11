import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'

// ---------- WhatsApp ----------

export type NumberPurpose = 'atendimento' | 'ofertas' | 'misto'
export type NumberMode = 'coexistence' | 'cloud_api'
export type MetaStatus =
  | 'PENDING'
  | 'CONNECTED'
  | 'FLAGGED'
  | 'RESTRICTED'
  | 'RATE_LIMITED'
  | 'DISCONNECTED'
  | 'BANNED'
  | 'MIGRATED'
  | 'DELETED'
  | 'UNKNOWN'
export type NumberProvider = 'fastzap' | 'octadesk' | 'pluri' | 'meta'
export type Quality = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'
export type LimitTier =
  'TIER_250' | 'TIER_1K' | 'TIER_2K' | 'TIER_10K' | 'TIER_100K' | 'TIER_UNLIMITED'

export type WhatsappNumber = {
  id: number
  store: number
  store_code: string
  store_name: string
  label: string
  purpose: NumberPurpose
  mode: NumberMode
  display_phone_number: string
  phone_normalized: string
  phone_number_id: string | null
  waba_id: string | null
  business_portfolio_id: string | null
  display_name: string | null
  provider: NumberProvider
  /** ligado/desligado no CRM */
  active: boolean
  // Só leitura: vêm da integração com a Meta.
  meta_status: MetaStatus | null
  quality_rating: Quality | null
  messaging_limit_tier: LimitTier | null
  meta_synced_at: string | null
  app_subscribed: boolean
  app_subscribed_at: string | null
  connected_at: string | null
  last_webhook_at: string | null
  /** Preço de uma mensagem de template, em reais (decimal em texto), por categoria. */
  price_marketing: string | null
  price_utility: string | null
  price_authentication: string | null
  templates_count: number
  updated_at: string
}

export type WhatsappNumberInput = Pick<
  WhatsappNumber,
  | 'store'
  | 'label'
  | 'purpose'
  | 'mode'
  | 'display_phone_number'
  | 'display_name'
  | 'provider'
  | 'waba_id'
  | 'phone_number_id'
  | 'business_portfolio_id'
  | 'active'
  | 'price_marketing'
  | 'price_utility'
  | 'price_authentication'
>

export const PURPOSE_LABEL: Record<NumberPurpose, string> = {
  atendimento: 'Atendimento',
  ofertas: 'Ofertas',
  misto: 'Misto',
}

export const MODE_LABEL: Record<NumberMode, string> = {
  coexistence: 'Coexistência (app + API)',
  cloud_api: 'Só API',
}

export const PROVIDER_LABEL: Record<NumberProvider, string> = {
  fastzap: 'FastZap',
  octadesk: 'Octadesk',
  pluri: 'Pluri',
  meta: 'Meta (Cloud API direto)',
}

export const META_STATUS_LABEL: Record<MetaStatus, string> = {
  PENDING: 'Pendente',
  CONNECTED: 'Conectado',
  FLAGGED: 'Sinalizado',
  RESTRICTED: 'Restrito',
  RATE_LIMITED: 'Limitado',
  DISCONNECTED: 'Desconectado',
  BANNED: 'Banido',
  MIGRATED: 'Migrado',
  DELETED: 'Excluído',
  UNKNOWN: 'Desconhecido',
}

export const META_STATUS_TONE: Record<MetaStatus, string> = {
  PENDING: 'tone-yellow',
  CONNECTED: 'tone-green',
  FLAGGED: 'tone-yellow',
  RESTRICTED: 'tone-red',
  RATE_LIMITED: 'tone-yellow',
  DISCONNECTED: 'tone-gray',
  BANNED: 'tone-red',
  MIGRATED: 'tone-gray',
  DELETED: 'tone-gray',
  UNKNOWN: 'tone-gray',
}

export const QUALITY_LABEL: Record<Quality, string> = {
  GREEN: 'Alta',
  YELLOW: 'Média',
  RED: 'Baixa',
  UNKNOWN: 'Sem avaliação',
}

export const LIMIT_LABEL: Record<LimitTier, string> = {
  TIER_250: '250 / dia',
  TIER_1K: '1 mil / dia',
  TIER_2K: '2 mil / dia',
  TIER_10K: '10 mil / dia',
  TIER_100K: '100 mil / dia',
  TIER_UNLIMITED: 'Ilimitado',
}

const numbersKey = ['whatsapp-numbers'] as const

export function useWhatsappNumbers() {
  return useQuery({
    queryKey: numbersKey,
    queryFn: () => api<WhatsappNumber[]>('/whatsapp-numbers/'),
  })
}

/** Busca na Meta status, qualidade e limite dos números ativos (só admin). */
export function useSyncNumbersFromMeta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api<{ updated: number; errors: string[] }>('/whatsapp-numbers/sync-meta/', {
        method: 'POST',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: numbersKey }),
  })
}

export function useSaveWhatsappNumber() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: WhatsappNumberInput }) =>
      id
        ? api<WhatsappNumber>(`/whatsapp-numbers/${id}/`, { method: 'PATCH', body: data })
        : api<WhatsappNumber>('/whatsapp-numbers/', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: numbersKey })
      // A WABA do número vai para os templates dele.
      queryClient.invalidateQueries({ queryKey: ['message-templates'] })
    },
  })
}

// ---------- E-mail (remetentes) ----------

export type SenderPurpose = 'marketing' | 'transactional'
export type SenderProvider = 'zeptomail' | 'smtp'
export type SenderStatus = 'pending' | 'active' | 'inactive'

export type EmailSender = {
  id: number
  /** null = todas as lojas */
  store: number | null
  store_code: string | null
  label: string
  from_name: string
  from_email: string
  reply_to: string | null
  purpose: SenderPurpose
  provider: SenderProvider
  status: SenderStatus
  is_default: boolean
  notes: string | null
  last_test_at: string | null
  created_at: string
  updated_at: string
}

export type EmailSenderInput = Pick<
  EmailSender,
  | 'store'
  | 'label'
  | 'from_name'
  | 'from_email'
  | 'reply_to'
  | 'purpose'
  | 'provider'
  | 'status'
  | 'is_default'
  | 'notes'
>

export const SENDER_PURPOSE_LABEL: Record<SenderPurpose, string> = {
  marketing: 'Marketing',
  transactional: 'Transacional',
}

export const SENDER_PROVIDER_LABEL: Record<SenderProvider, string> = {
  zeptomail: 'ZeptoMail (API)',
  smtp: 'SMTP',
}

export const SENDER_STATUS_LABEL: Record<SenderStatus, string> = {
  pending: 'Aguardando verificação',
  active: 'Ativo',
  inactive: 'Inativo',
}

export const SENDER_STATUS_TONE: Record<SenderStatus, string> = {
  pending: 'tone-yellow',
  active: 'tone-green',
  inactive: 'tone-gray',
}

const sendersKey = ['email-senders'] as const

export function useEmailSenders() {
  return useQuery({
    queryKey: sendersKey,
    queryFn: () => api<EmailSender[]>('/email-senders/'),
  })
}

export function useSaveEmailSender() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: EmailSenderInput }) =>
      id
        ? api<EmailSender>(`/email-senders/${id}/`, { method: 'PATCH', body: data })
        : api<EmailSender>('/email-senders/', { method: 'POST', body: data }),
    // O padrão de outros remetentes pode mudar junto: recarrega a lista toda.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sendersKey }),
  })
}

export function useDeleteEmailSender() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/email-senders/${id}/`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sendersKey }),
  })
}

export function useTestEmailSender() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api<{ to: string }>(`/email-senders/${id}/send-test/`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sendersKey }),
  })
}
