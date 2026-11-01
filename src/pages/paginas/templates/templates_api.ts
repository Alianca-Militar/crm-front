import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'

// ---------- Opções do editor (GET /message-templates/choices/) ----------

export type Option = { value: string; label: string }

export type TemplateChoices = {
  languages: Option[]
  categories: (Option & { help: string })[]
  header_types: Option[]
  button_types: Option[]
  /** variáveis prontas do botão “+ Variável” */
  variables: VariableInfo[]
  origins: Record<VariableOrigin, string>
  /** tipo de cabeçalho de mídia → "imagem JPG ou PNG de até 5 MB" */
  media: Record<string, string>
  limits: Record<string, number>
}

export function useTemplateChoices() {
  return useQuery({
    queryKey: ['message-templates', 'choices'],
    queryFn: () => api<TemplateChoices>('/message-templates/choices/'),
    staleTime: Infinity,
  })
}

// ---------- Variáveis ({{nome-cliente}}, {{var1}}...) ----------

/** De onde a campanha tira o valor. */
export type VariableOrigin = 'customer' | 'store' | 'campaign'

export type VariableInfo = {
  key: string
  label: string
  origin: VariableOrigin
  example: string
  /** só nas que vêm do cadastro do cliente: valor quando o dado estiver vazio */
  fallback?: string
}

export type TemplateVariable = {
  /** "nome-cliente", "cupom", "var1"... */
  key: string
  example: string
  fallback?: string
}

// ---------- WhatsApp ----------

export type TemplateStatus =
  'DRAFT' | 'IN_REVIEW' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED'
export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
export type HeaderType = 'none' | 'text' | 'image' | 'video' | 'document' | 'location'
export type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE' | 'OTP'

export type TemplateButton = {
  type: ButtonType
  text: string
  url?: string
  phone_number?: string
  /** código de exemplo do "Copiar código" */
  example?: string
}

export type AuthOptions = {
  add_security_recommendation?: boolean
  code_expiration_minutes?: number | null
}

export type MessageTemplate = {
  id: number
  whatsapp_number: number
  number_label: string | null
  store_code: string | null
  waba_id: string | null
  meta_template_id: string | null
  name: string
  language: string
  language_label: string
  category: TemplateCategory
  status: TemplateStatus
  quality_score: string | null
  header_type: HeaderType | null
  header_content: string | null
  header_media_name: string | null
  header_media_url: string | null
  body: string
  footer: string | null
  buttons: TemplateButton[]
  variables: TemplateVariable[]
  options: AuthOptions
  rejection_reason: string | null
  /** observação para o admin que aprova (não vai para a Meta) */
  notes: string | null
  review_requested_by_name: string | null
  review_requested_at: string | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  /** motivo do admin ao devolver para o rascunho */
  review_comment: string | null
  meta_submitted_at: string | null
  editable: boolean
  /** o que falta para mandar para aprovação da Meta */
  missing: string[]
  usage: { campaigns: number; triggers: number }
  created_by_name: string | null
  created_at: string
  updated_at: string
}

export type MessageTemplateInput = Pick<
  MessageTemplate,
  | 'whatsapp_number'
  | 'name'
  | 'language'
  | 'category'
  | 'header_type'
  | 'header_content'
  | 'body'
  | 'footer'
  | 'buttons'
  | 'variables'
  | 'options'
  | 'notes'
>

export const STATUS_LABEL: Record<TemplateStatus, string> = {
  DRAFT: 'Rascunho',
  IN_REVIEW: 'Aguardando admin',
  PENDING: 'Em aprovação na Meta',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  PAUSED: 'Pausado',
  DISABLED: 'Desativado',
}

export const STATUS_TONE: Record<TemplateStatus, string> = {
  DRAFT: 'tone-gray',
  IN_REVIEW: 'tone-blue',
  PENDING: 'tone-yellow',
  APPROVED: 'tone-green',
  REJECTED: 'tone-red',
  PAUSED: 'tone-orange',
  DISABLED: 'tone-gray',
}

export const CATEGORY_LABEL: Record<TemplateCategory, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
}

const waKey = ['message-templates'] as const

export function useMessageTemplates() {
  return useQuery({
    queryKey: [...waKey, 'list'],
    queryFn: () => api<MessageTemplate[]>('/message-templates/'),
  })
}

export function useMessageTemplate(id: number | null) {
  return useQuery({
    queryKey: [...waKey, 'detail', id],
    queryFn: () => api<MessageTemplate>(`/message-templates/${id}/`),
    enabled: id !== null,
  })
}

function useInvalidate(key: readonly string[]) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: key })
}

export function useSaveMessageTemplate() {
  const invalidate = useInvalidate(waKey)
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: MessageTemplateInput }) =>
      id
        ? api<MessageTemplate>(`/message-templates/${id}/`, { method: 'PATCH', body: data })
        : api<MessageTemplate>('/message-templates/', { method: 'POST', body: data }),
    onSuccess: invalidate,
  })
}

export function useUploadHeaderMedia() {
  const invalidate = useInvalidate(waKey)
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File | null }) => {
      if (!file) {
        return api<MessageTemplate>(`/message-templates/${id}/header-media/`, { method: 'DELETE' })
      }
      const body = new FormData()
      body.append('file', file)
      return api<MessageTemplate>(`/message-templates/${id}/header-media/`, {
        method: 'POST',
        body,
      })
    },
    onSuccess: invalidate,
  })
}

export function useDuplicateMessageTemplate() {
  const invalidate = useInvalidate(waKey)
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; whatsapp_number?: number; name?: string }) =>
      api<MessageTemplate>(`/message-templates/${id}/duplicate/`, { method: 'POST', body }),
    onSuccess: invalidate,
  })
}

export function useDeleteMessageTemplate() {
  const invalidate = useInvalidate(waKey)
  return useMutation({
    mutationFn: (id: number) => api<void>(`/message-templates/${id}/`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export type SetStatusInput = {
  status: TemplateStatus
  meta_template_id?: string | null
  rejection_reason?: string | null
}

export function useSetTemplateStatus() {
  const invalidate = useInvalidate(waKey)
  return useMutation({
    mutationFn: ({ id, ...body }: SetStatusInput & { id: number }) =>
      api<MessageTemplate>(`/message-templates/${id}/set-status/`, { method: 'POST', body }),
    onSuccess: invalidate,
  })
}

// ---------- Aprovação interna (gerente pede, admin aprova e envia à Meta) ----------

/** Templates aguardando um admin (tela Admin › Aprovações e contador do menu). */
export function useTemplateReviews(enabled = true) {
  return useQuery({
    queryKey: [...waKey, 'reviews'],
    queryFn: () => api<MessageTemplate[]>('/message-templates/?status=IN_REVIEW'),
    enabled,
  })
}

function useTemplateAction<T extends object>(path: string) {
  const invalidate = useInvalidate(waKey)
  return useMutation({
    mutationFn: ({ id, ...body }: T & { id: number }) =>
      api<MessageTemplate>(`/message-templates/${id}/${path}/`, { method: 'POST', body }),
    onSuccess: invalidate,
  })
}

/** Gerente: manda para um admin aprovar (com a observação). */
export const useRequestReview = () => useTemplateAction<{ notes?: string | null }>('request-review')
/** Tira o pedido de aprovação (volta a rascunho). */
export const useWithdrawReview = () => useTemplateAction<object>('withdraw-review')
/** Admin: devolve para o rascunho com o motivo. */
export const useRejectReview = () => useTemplateAction<{ comment: string }>('reject-review')
/** Admin: aprova e envia para a Meta. */
export const useSubmitTemplate = () => useTemplateAction<object>('submit')

export type MetaPayload = {
  endpoint: string
  ready: boolean
  missing: string[]
  payload: unknown
}

export function useMetaPayload(id: number | null) {
  return useQuery({
    queryKey: [...waKey, 'meta-payload', id],
    queryFn: () => api<MetaPayload>(`/message-templates/${id}/meta-payload/`),
    enabled: id !== null,
  })
}

// ---------- E-mail ----------

export type EmailStatus = 'draft' | 'active' | 'inactive'
export type EmailCategory = 'marketing' | 'transactional'
export type EmailHeaderType = 'none' | 'text' | 'image'

/** text = parágrafos com negrito e itálico; html = HTML pronto */
export type EmailBodyFormat = 'text' | 'html'

export type EmailTemplate = {
  id: number
  /** null = todas as lojas */
  store: number | null
  store_code: string | null
  name: string
  category: EmailCategory
  status: EmailStatus
  subject: string
  preheader: string | null
  header_type: EmailHeaderType
  header_content: string | null
  body: string
  body_format: EmailBodyFormat
  button_text: string | null
  button_url: string | null
  footer: string | null
  variables: TemplateVariable[]
  created_by_name: string | null
  created_at: string
  updated_at: string
}

export type EmailTemplateInput = Omit<
  EmailTemplate,
  'id' | 'store_code' | 'created_by_name' | 'created_at' | 'updated_at'
>

export const EMAIL_STATUS_LABEL: Record<EmailStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  inactive: 'Inativo',
}

export const EMAIL_STATUS_TONE: Record<EmailStatus, string> = {
  draft: 'tone-gray',
  active: 'tone-green',
  inactive: 'tone-orange',
}

export const EMAIL_CATEGORY_LABEL: Record<EmailCategory, string> = {
  marketing: 'Marketing',
  transactional: 'Transacional',
}

const emailKey = ['email-templates'] as const

export function useEmailTemplates() {
  return useQuery({
    queryKey: [...emailKey, 'list'],
    queryFn: () => api<EmailTemplate[]>('/email-templates/'),
  })
}

export function useEmailTemplate(id: number | null) {
  return useQuery({
    queryKey: [...emailKey, 'detail', id],
    queryFn: () => api<EmailTemplate>(`/email-templates/${id}/`),
    enabled: id !== null,
  })
}

export function useSaveEmailTemplate() {
  const invalidate = useInvalidate(emailKey)
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: EmailTemplateInput }) =>
      id
        ? api<EmailTemplate>(`/email-templates/${id}/`, { method: 'PATCH', body: data })
        : api<EmailTemplate>('/email-templates/', { method: 'POST', body: data }),
    onSuccess: invalidate,
  })
}

export function useDuplicateEmailTemplate() {
  const invalidate = useInvalidate(emailKey)
  return useMutation({
    mutationFn: (id: number) =>
      api<EmailTemplate>(`/email-templates/${id}/duplicate/`, { method: 'POST' }),
    onSuccess: invalidate,
  })
}

export function useDeleteEmailTemplate() {
  const invalidate = useInvalidate(emailKey)
  return useMutation({
    mutationFn: (id: number) => api<void>(`/email-templates/${id}/`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export function useSendEmailTest() {
  return useMutation({
    mutationFn: (id: number) =>
      api<{ to: string }>(`/email-templates/${id}/send-test/`, { method: 'POST' }),
  })
}

export type SyncResult = { total: number; created: number; updated: number; skipped: number }

/** Busca na Meta os templates da conta (WABA) do número e grava no CRM. */
export function useSyncTemplates() {
  const invalidate = useInvalidate(waKey)
  return useMutation({
    mutationFn: (whatsappNumber: number) =>
      api<SyncResult>('/message-templates/sync/', {
        method: 'POST',
        body: { whatsapp_number: whatsappNumber },
      }),
    onSuccess: invalidate,
  })
}
