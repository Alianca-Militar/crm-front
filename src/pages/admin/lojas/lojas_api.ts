import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { call, client, type Schemas } from '../../../lib/api_client'
import { meKey } from '../../../lib/auth'

export type Store = Schemas['Store']
export type StoreInput = Schemas['StoreRequest']
export type State = Schemas['State']
export type City = Schemas['City']

const storesKey = ['stores'] as const

export function useStores() {
  return useQuery({ queryKey: storesKey, queryFn: () => call(client.GET('/api/stores/')) })
}

export function useSaveStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: StoreInput }) =>
      id
        ? call(client.PATCH('/api/stores/{id}/', { params: { path: { id } }, body: data }))
        : call(client.POST('/api/stores/', { body: data })),
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
    queryFn: () => call(client.GET('/api/states/')),
    staleTime: Infinity,
  })
}

export function useCities(stateId: number | null) {
  return useQuery({
    queryKey: ['cities', stateId],
    queryFn: () =>
      call(client.GET('/api/cities/', { params: { query: { state: stateId ?? undefined } } })),
    enabled: stateId !== null,
    staleTime: Infinity,
  })
}
