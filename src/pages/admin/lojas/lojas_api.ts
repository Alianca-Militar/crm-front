import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { meKey } from '../../../lib/auth'

export type Store = {
  id: number
  code: string
  corporate: string
  name: string
  cnpj: string
  ie: string | null
  is_headquarters: boolean
  email: string | null
  address: string | null
  cep: string | null
  city: number | null
  city_name: string | null
  state: number | null
  state_code: string | null
  timezone: string
  active: boolean
}

export type StoreInput = Omit<Store, 'id' | 'city_name' | 'state_code' | 'timezone'>

export type State = { id: number; code: string; state: string }
export type City = { id: number; state: number; city: string }

const storesKey = ['stores'] as const

export function useStores() {
  return useQuery({ queryKey: storesKey, queryFn: () => api<Store[]>('/stores/') })
}

export function useSaveStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: StoreInput }) =>
      id
        ? api<Store>(`/stores/${id}/`, { method: 'PATCH', body: data })
        : api<Store>('/stores/', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storesKey })
      // O seletor de loja do header vem do /auth/me/.
      queryClient.invalidateQueries({ queryKey: meKey })
    },
  })
}

export function useStates() {
  return useQuery({
    queryKey: ['states'],
    queryFn: () => api<State[]>('/states/'),
    staleTime: Infinity,
  })
}

export function useCities(stateId: number | null) {
  return useQuery({
    queryKey: ['cities', stateId],
    queryFn: () => api<City[]>(`/cities/?state=${stateId}`),
    enabled: stateId !== null,
    staleTime: Infinity,
  })
}
