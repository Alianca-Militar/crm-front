import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'
import { meKey } from './auth'

/** 401/403 em qualquer chamada: pode ser sessão expirada ou só falta de permissão. Rebusca o
 * /auth/me; se ele também falhar, o Layout manda para o login (e volta para a mesma tela). */
function checkSession(error: unknown) {
  if (!(error instanceof ApiError) || ![401, 403].includes(error.status)) return
  if (queryClient.isFetching({ queryKey: meKey }) > 0) return
  void queryClient.invalidateQueries({ queryKey: meKey })
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.queryKey.join('/') === meKey.join('/')) return
      checkSession(error)
    },
  }),
  mutationCache: new MutationCache({ onError: checkSession }),
  defaultOptions: {
    queries: {
      // Dados do CRM mudam pouco durante o uso; evita refazer a busca a cada foco na janela.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
