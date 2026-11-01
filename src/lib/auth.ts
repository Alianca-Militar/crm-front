import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'

export type Role = 'admin' | 'gerente' | 'analista' | 'vendedor'

export type Me = {
  id: number
  name: string
  email: string
  role: Role
  stores: { id: number; code: string; name: string }[]
  initials: string
  avatar_url: string | null
  /** Loja que o header abre selecionada (escolhida no perfil). */
  default_store_id: number | null
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  gerente: 'Gerente',
  analista: 'Analista',
  vendedor: 'Vendedor',
}

export const meKey = ['auth', 'me'] as const

/** Usuário logado. Erro 401/403 = sem sessão (o Layout manda para o login). */
export function useMe() {
  return useQuery({ queryKey: meKey, queryFn: () => api<Me>('/auth/me/'), retry: false })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api<Me>('/auth/login/', { method: 'POST', body: data }),
    onSuccess: (me) => queryClient.setQueryData(meKey, me),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/auth/logout/', { method: 'POST' }),
    // Mesmo se a sessão já tiver expirado, limpa tudo o que estava em cache.
    onSettled: () => queryClient.clear(),
  })
}

// --- Primeiro acesso / nova senha (links enviados por e-mail) ---

/** invite = primeiro acesso (vale 3 dias) · reset = esqueci minha senha (vale 1 hora) */
export type AccessKind = 'invite' | 'reset'

export type AccessLinkInfo = { kind: AccessKind; first_name: string; email: string }

/** Confere o link do e-mail antes de mostrar o formulário de senha. */
export function useAccessLink(uid: string, token: string, kind: AccessKind) {
  const params = new URLSearchParams({ uid, token, kind })
  return useQuery({
    queryKey: ['auth', 'access-link', kind, uid, token],
    queryFn: () => api<AccessLinkInfo>(`/auth/access-link/?${params}`),
    retry: false,
    staleTime: Infinity,
  })
}

/** Cria a senha pelo link; o backend já faz o login. */
export function useSetPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { uid: string; token: string; kind: AccessKind; password: string }) =>
      api<void>('/auth/access-link/', { method: 'POST', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meKey }),
  })
}

/** "Esqueci minha senha": responde igual exista ou não o e-mail. */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) =>
      api<void>('/auth/password-reset/', { method: 'POST', body: { email } }),
  })
}
