import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'

export type Setting = {
  id: number
  key: string
  value: unknown
  description: string | null
  updated_by: number | null
  updated_at: string
}

const settingsKey = ['settings'] as const

export function useSettings() {
  return useQuery({ queryKey: settingsKey, queryFn: () => api<Setting[]>('/settings/') })
}

/** Salva várias regras de uma vez (tudo ou nada). */
export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      api<Setting[]>('/settings/bulk/', { method: 'PATCH', body: { values } }),
    onSuccess: (rows) => queryClient.setQueryData(settingsKey, rows),
  })
}
