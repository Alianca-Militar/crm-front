// Cliente da API do Django. Mesma origem (proxy do Vite em dev, Caddy em produção):
// a sessão vai no cookie e o CSRF no header X-CSRFToken.

/** Erros de campo devolvidos pelo DRF: { campo: ["mensagem"] }. */
export type FieldErrors = Record<string, string[]>

export class ApiError extends Error {
  status: number
  fieldErrors: FieldErrors

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function getCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

async function ensureCsrf(): Promise<string> {
  let token = getCookie('csrftoken')
  if (!token) {
    await fetch('/api/auth/csrf/', { credentials: 'same-origin' })
    token = getCookie('csrftoken')
  }
  return token ?? ''
}

function messageFor(status: number, body: unknown): { message: string; fields: FieldErrors } {
  const fields: FieldErrors = {}
  let message = ''
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      const list = Array.isArray(value) ? value.map(String) : [String(value)]
      if (key === 'detail' || key === 'non_field_errors') {
        message = list.join(' ')
      } else {
        fields[key] = list
      }
    }
  }
  if (!message) {
    if (Object.keys(fields).length) message = 'Confira os campos destacados.'
    else if (status === 401 || status === 403) message = 'Sessão expirada ou sem permissão.'
    else if (status >= 500) message = 'Erro no servidor. Tente de novo em instantes.'
    else message = `Erro ${status}.`
  }
  return { message, fields }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}) {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = { Accept: 'application/json' }
  // FormData (upload de arquivo): o navegador define o Content-Type com o boundary.
  const isForm = options.body instanceof FormData
  if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (UNSAFE.has(method)) headers['X-CSRFToken'] = await ensureCsrf()

  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: isForm
        ? (options.body as FormData)
        : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
    })
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor.')
  }

  if (response.status === 204) return undefined as T
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const { message, fields } = messageFor(response.status, body)
    throw new ApiError(response.status, message, fields)
  }
  return body as T
}
