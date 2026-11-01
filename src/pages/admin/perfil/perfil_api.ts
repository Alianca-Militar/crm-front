import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { meKey, type Role } from '../../../lib/auth'

export type Profile = {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string | null
  /** Cargo: definido pelo admin */
  position: string | null
  role: Role
  stores: { id: number; code: string; name: string }[]
  default_store_id: number | null
  initials: string
  avatar_url: string | null
  date_joined: string
  last_login: string | null
}

export type ProfileInput = {
  first_name: string
  last_name: string
  phone: string | null
  default_store_id: number | null
}

export type ActiveSession = {
  id: string
  /** "Chrome · Windows" */
  device: string
  ip: string | null
  login_at: string | null
  expires_at: string
  current: boolean
}

const profileKey = ['profile'] as const
const sessionsKey = ['profile', 'sessions'] as const

export function useProfile() {
  return useQuery({ queryKey: profileKey, queryFn: () => api<Profile>('/profile/') })
}

/** Atualiza o perfil e o header (nome, iniciais, foto, loja padrão). */
function useProfileMutation<T>(fn: (input: T) => Promise<Profile>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKey, profile)
      queryClient.invalidateQueries({ queryKey: meKey })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useSaveProfile() {
  return useProfileMutation((data: ProfileInput) =>
    api<Profile>('/profile/', { method: 'PATCH', body: data }),
  )
}

export function useUploadAvatar() {
  return useProfileMutation((file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api<Profile>('/profile/avatar/', { method: 'POST', body: form })
  })
}

export function useRemoveAvatar() {
  return useProfileMutation(() => api<Profile>('/profile/avatar/', { method: 'DELETE' }))
}

export function useChangePassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      api<void>('/profile/password/', { method: 'POST', body: data }),
    // As outras sessões foram encerradas.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionsKey }),
  })
}

export function useSessions() {
  return useQuery({
    queryKey: sessionsKey,
    queryFn: () => api<ActiveSession[]>('/profile/sessions/'),
  })
}

/** id "others" = todas menos a atual */
export function useEndSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/profile/sessions/${id}/`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionsKey }),
  })
}
