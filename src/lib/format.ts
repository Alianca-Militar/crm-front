export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

/** 11222333000181 → 11.222.333/0001-81 (formata também enquanto digita). */
export function formatCnpj(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

/** 36045410 → 36045-410 (formata também enquanto digita). */
export function formatCep(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** "hoje, 08:12" · "ontem, 17:55" · "02/09/2026" (vazio = "—"). */
export function formatLastAccess(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '—'
  const date = new Date(iso)
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((day(now) - day(date)) / 86_400_000)
  if (diffDays === 0) return `hoje, ${time}`
  if (diffDays === 1) return `ontem, ${time}`
  return date.toLocaleDateString('pt-BR')
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** 1234.5 → R$ 1.234,50 (vazio = "—"). */
export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? BRL.format(n) : '—'
}

/** 2026-10-31T14:00:00Z → 31/10/2026 (vazio = "—"). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

/** 5532999990000 → (32) 99999-0000 (vazio = "—"; o que não for telefone BR volta como veio). */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const local = phone.startsWith('55') ? phone.slice(2) : phone
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  return phone
}

/** 2026-10-31T14:05:00Z → 31/10/2026 11:05 (vazio = "—"). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${date.toLocaleDateString('pt-BR')} ${time}`
}

/** "MARIA DA SILVA" → "MS" */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return `${first}${last}`.toUpperCase()
}

/** "MARIA DA SILVA" → "Maria da Silva" */
export function titleCase(name: string | null | undefined): string {
  const small = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])
  return (name ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}
