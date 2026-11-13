// Cliente tipado da API: rotas, parâmetros e respostas vêm de api_schema.d.ts, gerado do
// openapi.yaml do backend (npm run api:types). Nunca escreva à mão um tipo que a API já descreve:
// use Schemas['Nome']. Se a API mudar, o tsc aponta as telas que precisam de ajuste.
//
// Mesmo comportamento do api(): sessão no cookie, CSRF no header e erros como ApiError
// (o queryClient trata 401/403 em qualquer chamada).

import createClient, { type Middleware } from 'openapi-fetch'
import { ApiError, ensureCsrf, messageFor, UNSAFE } from './api'
import type { components, paths } from './api_schema'

/** Formatos da API (componentes do openapi.yaml), ex.: Schemas['Store']. */
export type Schemas = components['schemas']

const csrf: Middleware = {
  async onRequest({ request }) {
    if (UNSAFE.has(request.method)) request.headers.set('X-CSRFToken', await ensureCsrf())
    return request
  },
}

export const client = createClient<paths>({
  baseUrl: typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
  credentials: 'same-origin',
  headers: { Accept: 'application/json' },
})
client.use(csrf)

type Result<T> = { data?: T; error?: unknown; response: Response }

/** Resposta do client → o dado, ou ApiError com a mesma mensagem do api(). */
export async function call<T>(request: Promise<Result<T>>): Promise<T> {
  let result: Result<T>
  try {
    result = await request
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor.')
  }
  if (!result.response.ok) {
    const { message, fields } = messageFor(result.response.status, result.error)
    throw new ApiError(result.response.status, message, fields)
  }
  return result.data as T
}
