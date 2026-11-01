import type { ReactNode } from 'react'
import type {
  HeaderType,
  TemplateButton,
  TemplateCategory,
  TemplateVariable,
  VariableInfo,
} from './templates_api'

const VAR = /\{\{\s*([^{}]+?)\s*\}\}/g
const GENERIC = /^var([1-9][0-9]*)$/

/** Variáveis do texto ({{nome-cliente}}, {{var1}}...), sem repetir, na ordem em que aparecem. */
export function varKeys(text: string | null | undefined): string[] {
  const found = new Set<string>()
  for (const m of (text ?? '').matchAll(VAR)) found.add(m[1])
  return [...found]
}

/** Próxima variável genérica livre considerando todos os textos do template: {{var3}}. */
export function nextGeneric(texts: (string | null | undefined)[]): string {
  let max = 0
  for (const key of varKeys(texts.join(' '))) {
    const m = GENERIC.exec(key)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `var${max + 1}`
}

/** Rótulo, origem e exemplo padrão de uma variável (pronta ou genérica). */
export function variableInfo(key: string, catalog: VariableInfo[]): VariableInfo {
  const known = catalog.find((v) => v.key === key)
  if (known) return known
  const m = GENERIC.exec(key)
  return {
    key,
    label: m ? `Variável ${m[1]}` : key,
    origin: 'campaign',
    example: '',
  }
}

/** Variáveis do template de WhatsApp, na ordem da mensagem (mesma regra do backend). */
export function whatsappSlots(t: {
  category: TemplateCategory
  header_type: HeaderType | null
  header_content: string | null
  body: string
  buttons: TemplateButton[]
}): string[] {
  if (t.category === 'AUTHENTICATION') return []
  const keys = varKeys([t.header_type === 'text' ? t.header_content : '', t.body].join(' '))
  for (const b of t.buttons) {
    const key = b.type === 'URL' ? varKeys(b.url)[0] : undefined
    if (key && !keys.includes(key)) keys.push(key)
  }
  return keys
}

/** Variáveis do e-mail: valem para todos os textos. */
export function emailSlots(texts: (string | null | undefined)[]): string[] {
  return varKeys(texts.join(' '))
}

/**
 * Uma entrada por variável usada, na ordem da mensagem. A que ainda não foi mexida
 * recebe o exemplo (e o valor se vazio) padrão do catálogo.
 */
export function resolveVariables(
  slots: string[],
  variables: TemplateVariable[],
  catalog: VariableInfo[],
): TemplateVariable[] {
  const byKey = new Map(variables.map((v) => [v.key, v]))
  return slots.map((key) => {
    const current = byKey.get(key)
    if (current) return current
    const info = variableInfo(key, catalog)
    return info.fallback === undefined
      ? { key, example: info.example }
      : { key, example: info.example, fallback: info.fallback }
  })
}

/** Exemplo de cada variável (chave → valor), para a prévia. */
export function examplesOf(variables: TemplateVariable[]): Record<string, string> {
  return Object.fromEntries(variables.map((v) => [v.key, v.example]))
}

/** Nome no formato da Meta: minúsculas sem acento, números e _. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

// ---------- Formatação do WhatsApp (*negrito* _itálico_ ~tachado~ ```mono```) ----------

const FORMAT = /```([\s\S]+?)```|\*([^*\n]+?)\*|_([^_\n]+?)_|~([^~\n]+?)~/
// Marcadores (uso privado do Unicode) que guardam o lugar de cada variável no texto.
const OPEN = String.fromCharCode(0xe000)
const CLOSE = String.fromCharCode(0xe001)
const SENTINEL = new RegExp(`${OPEN}([0-9]+)${CLOSE}`)

function withVars(text: string, vars: ReactNode[], keyBase: string): ReactNode[] {
  return text
    .split(SENTINEL)
    .map((part, i) =>
      i % 2 === 1 ? <span key={`${keyBase}-v${i}`}>{vars[Number(part)]}</span> : part,
    )
}

function parse(text: string, vars: ReactNode[], keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  let rest = text
  let i = 0
  while (rest) {
    const m = FORMAT.exec(rest)
    if (!m) {
      out.push(...withVars(rest, vars, `${keyBase}-${i}`))
      break
    }
    if (m.index > 0) out.push(...withVars(rest.slice(0, m.index), vars, `${keyBase}-${i}a`))
    const key = `${keyBase}-${i}`
    if (m[1] !== undefined) out.push(<code key={key}>{withVars(m[1], vars, key)}</code>)
    else if (m[2] !== undefined) out.push(<strong key={key}>{parse(m[2], vars, key)}</strong>)
    else if (m[3] !== undefined) out.push(<em key={key}>{parse(m[3], vars, key)}</em>)
    else out.push(<s key={key}>{parse(m[4], vars, key)}</s>)
    rest = rest.slice(m.index + m[0].length)
    i += 1
  }
  return out
}

/**
 * Texto com a formatação do WhatsApp e as variáveis trocadas pelo exemplo.
 * Variável sem exemplo aparece como {{nome}} destacado.
 */
export function formatMessage(
  text: string | null | undefined,
  examples: Record<string, string>,
): ReactNode[] {
  const vars: ReactNode[] = []
  const marked = (text ?? '').replace(VAR, (_, key: string) => {
    const value = examples[key]
    vars.push(
      <span className={value ? 'tpl-var filled' : 'tpl-var'} title={`Variável {{${key}}}`}>
        {value || `{{${key}}}`}
      </span>,
    )
    return `${OPEN}${vars.length - 1}${CLOSE}`
  })
  return parse(marked, vars, 'f')
}

/** Envolve a seleção do campo com o marcador (*, _, ~ ou ```) e devolve o texto novo. */
export function wrapSelection(
  field: HTMLTextAreaElement | HTMLInputElement,
  before: string,
  after = before,
): { value: string; cursor: number } {
  const start = field.selectionStart ?? field.value.length
  const end = field.selectionEnd ?? start
  const selected = field.value.slice(start, end) || 'texto'
  const value = field.value.slice(0, start) + before + selected + after + field.value.slice(end)
  return { value, cursor: start + before.length + selected.length + after.length }
}

/** Insere o texto onde está o cursor. */
export function insertAtCursor(
  field: HTMLTextAreaElement | HTMLInputElement,
  text: string,
): { value: string; cursor: number } {
  const start = field.selectionStart ?? field.value.length
  const end = field.selectionEnd ?? start
  return {
    value: field.value.slice(0, start) + text + field.value.slice(end),
    cursor: start + text.length,
  }
}

// ---------- Corpo do e-mail em HTML ----------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** HTML com <html>: é o e-mail inteiro (mesma regra do backend). */
export function isFullHtml(html: string): boolean {
  return /<html[\s>]/i.test(html)
}

/** Troca as variáveis do HTML pelo exemplo (escapado). Sem exemplo, fica {{nome}}. */
export function fillHtml(html: string, examples: Record<string, string>): string {
  return html.replace(VAR, (match, key: string) =>
    examples[key] ? escapeHtml(examples[key]) : match,
  )
}

/** Texto (parágrafos, *negrito*, _itálico_) → HTML, ao trocar o formato para HTML. */
export function textToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const inline = escapeHtml(p)
        .replace(/\*(\S(?:[^*\n]*?\S)?)\*/g, '<strong>$1</strong>')
        .replace(/(^|[^\w])_(\S(?:[^_\n]*?\S)?)_(?!\w)/g, '$1<em>$2</em>')
        .replace(/\n/g, '<br>')
      return `<p>${inline}</p>`
    })
    .join('\n')
}

/** HTML → texto simples, ao voltar o formato para texto. */
export function htmlToText(html: string): string {
  const marked = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|table)\s*>/gi, '$&\n\n')
  const doc = new DOMParser().parseFromString(marked, 'text/html')
  doc.querySelectorAll('style, script, title').forEach((el) => el.remove())
  return (doc.body.textContent ?? '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
