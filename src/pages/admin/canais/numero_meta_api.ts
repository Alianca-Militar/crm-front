import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { MetaStatus, Quality } from './canais_api'

// ---------- Perfil (lido e gravado na Meta) ----------

export type NumberProfile = {
  about: string
  address: string
  description: string
  email: string
  websites: string[]
  vertical: string
  profile_picture_url: string | null
  /** Segmentos aceitos pela Meta → nome na tela. */
  verticals: Record<string, string>
}

export type ProfileInput = Partial<
  Pick<NumberProfile, 'about' | 'address' | 'description' | 'email' | 'websites' | 'vertical'>
>

const profileKey = (id: number) => ['whatsapp-profile', id] as const

/** Lê da Meta na hora (só quando a aba Perfil abre). */
export function useNumberProfile(id: number | null) {
  return useQuery({
    queryKey: profileKey(id ?? 0),
    queryFn: () => api<NumberProfile>(`/whatsapp-numbers/${id}/profile/`),
    enabled: id !== null,
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function useSaveNumberProfile() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProfileInput }) =>
      api<NumberProfile>(`/whatsapp-numbers/${id}/profile/`, { method: 'POST', body: data }),
    onSuccess: (profile, { id }) => client.setQueryData(profileKey(id), profile),
  })
}

// ---------- Qualidade (do banco: GET diário e avisos da Meta) ----------

export type QualityEvent = {
  id: number
  occurred_at: string
  source: 'webhook' | 'sync'
  event: string
  quality_rating: Quality | null
  messaging_limit: string | null
  meta_status: MetaStatus | null
}

export type NumberQuality = {
  id: number
  label: string
  meta_status: MetaStatus | null
  quality_rating: Quality | null
  messaging_limit_tier: string | null
  display_name: string | null
  meta_synced_at: string | null
  details: {
    name_status?: string
    new_name_status?: string
    throughput?: { level?: string }
    is_official_business_account?: boolean
    code_verification_status?: string
    platform_type?: string
    account_mode?: string
  }
  history: QualityEvent[]
  templates: {
    id: number
    name: string
    language: string
    category: string
    status: string
    quality_score: Quality | null
  }[]
}

export function useNumberQuality(id: number | null) {
  return useQuery({
    queryKey: ['whatsapp-numbers', id, 'quality'],
    queryFn: () => api<NumberQuality>(`/whatsapp-numbers/${id}/quality/`),
    enabled: id !== null,
  })
}

export const NAME_STATUS_LABEL: Record<string, string> = {
  APPROVED: 'Aprovado',
  AVAILABLE_WITHOUT_REVIEW: 'Liberado sem análise',
  PENDING_REVIEW: 'Em análise na Meta',
  DECLINED: 'Recusado',
  EXPIRED: 'Expirado',
  NONE: 'Sem pedido',
}

export const THROUGHPUT_LABEL: Record<string, string> = {
  STANDARD: 'Padrão (até 80 mensagens/s)',
  HIGH: 'Alta (até 1.000 mensagens/s)',
  NOT_APPLICABLE: 'Não se aplica',
}

export const VERIFICATION_LABEL: Record<string, string> = {
  VERIFIED: 'Verificado',
  NOT_VERIFIED: 'Não verificado',
  EXPIRED: 'Verificação expirada',
}

export const EVENT_LABEL: Record<string, string> = {
  FLAGGED: 'Sinalizado pela Meta',
  UNFLAGGED: 'Saiu do sinalizado',
  UPGRADE: 'Limite aumentou',
  DOWNGRADE: 'Limite diminuiu',
  ONBOARDING: 'Número em ativação',
  UPDATE: 'Atualização da Meta',
  QUALITY: 'Qualidade mudou',
  LIMIT: 'Limite mudou',
  STATUS: 'Status mudou',
}

export const TEMPLATE_STATUS_LABEL: Record<string, string> = {
  APPROVED: 'Aprovado',
  PENDING: 'Em análise',
  REJECTED: 'Recusado',
  PAUSED: 'Pausado',
  DISABLED: 'Desativado',
}
