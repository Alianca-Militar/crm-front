import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { call, client, type Schemas } from '../../lib/api_client'

export type Notification = Schemas['Notification']
export type NotificationPreference = Schemas['NotificationPreference']

const key = ['notifications'] as const
export const NOTIFICATIONS_PAGE = 50

/** Sino do header: as 10 mais recentes e o total de não lidas (atualiza a cada minuto). */
export function useRecentNotifications(enabled: boolean) {
  return useQuery({
    queryKey: [...key, 'recent'],
    queryFn: () => call(client.GET('/api/notifications/recent/')),
    enabled,
    refetchInterval: 60_000,
  })
}

/** Tela Notificações. */
export function useNotifications(page: number, unread: boolean) {
  return useQuery({
    queryKey: [...key, 'list', page, unread],
    queryFn: () =>
      call(
        client.GET('/api/notifications/', {
          params: { query: { page, unread: unread ? '1' : undefined } },
        }),
      ),
    placeholderData: keepPreviousData,
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      call(client.POST('/api/notifications/{id}/read/', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => call(client.POST('/api/notifications/read-all/')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

/** Perfil › Me avisar quando: os assuntos do perfil do usuário. */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: [...key, 'preferences'],
    queryFn: () => call(client.GET('/api/notifications/preferences/')),
  })
}

export function useSaveNotificationPreference() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (pref: { kind: string; enabled: boolean }) =>
      call(client.PUT('/api/notifications/preferences/', { body: [pref] })),
    onSuccess: (prefs) => queryClient.setQueryData([...key, 'preferences'], prefs),
  })
}

/** "agora" · "há 4 min" · "há 2 h" · "ontem" · "12/11". */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  if (hours < 48) return 'ontem'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
