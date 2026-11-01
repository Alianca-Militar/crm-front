import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { type AccessKind, meKey, type Role } from '../../../lib/auth'

export type UserAccount = {
  id: number
  first_name: string
  last_name: string
  email: string
  is_active: boolean
  is_superuser: boolean
  /** false = ainda não criou a senha (convite de primeiro acesso pendente) */
  has_password: boolean
  last_login: string | null
  date_joined: string
  role: Role | null
  stores: number[]
  position: string | null
  phone: string | null
  avatar: string
  /** URL da foto (null = mostra as iniciais) */
  avatar_url: string | null
}

export type UserInput = {
  first_name: string
  last_name: string
  email: string
  is_active: boolean
  role: Role
  stores: number[]
  position: string | null
  phone: string | null
}

/** Resultado do envio do link de senha por e-mail. */
export type AccessLinkResult = { kind: AccessKind; sent: boolean; error: string | null }

/** O cadastro devolve o usuário e o resultado do convite (o e-mail pode falhar). */
export type UserCreated = UserAccount & { invite: AccessLinkResult }

export type RoleRow = { id: number; code: Role; name: string }

const usersKey = ['users'] as const

export function useUsers() {
  return useQuery({ queryKey: usersKey, queryFn: () => api<UserAccount[]>('/users/') })
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => api<RoleRow[]>('/roles/'),
    staleTime: Infinity,
  })
}

export function useSaveUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id?: number
      data: Partial<UserInput>
    }): Promise<UserAccount | UserCreated> =>
      id
        ? api<UserAccount>(`/users/${id}/`, { method: 'PATCH', body: data })
        : api<UserCreated>('/users/', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKey })
      // Se o admin editou o próprio usuário, o header muda.
      queryClient.invalidateQueries({ queryKey: meKey })
    },
  })
}

/** Reenvia o convite (quem não tem senha) ou manda link de nova senha (quem tem). */
export function useSendAccessLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api<AccessLinkResult>(`/users/${id}/send-access-link/`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  })
}
