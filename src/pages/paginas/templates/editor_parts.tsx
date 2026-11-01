import type { RefObject } from 'react'
import EmojiButton from './emoji_button'
import { insertAtCursor, variableInfo, wrapSelection } from './template_utils'
import type { TemplateVariable, VariableInfo, VariableOrigin } from './templates_api'

/** Mensagens de erro de um campo (vindas do backend). */
export function FieldErrors({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return (
    <ul className="tpl-errors" role="alert">
      {messages.map((m) => (
        <li key={m}>{m}</li>
      ))}
    </ul>
  )
}

/** Contador "12/60" que fica vermelho ao passar do limite. */
export function Counter({ value, max }: { value: string | null | undefined; max?: number }) {
  if (!max) return null
  const size = value?.length ?? 0
  return (
    <span className={size > max ? 'tpl-counter over' : 'tpl-counter'}>
      {size}/{max}
    </span>
  )
}

type FieldRef = RefObject<HTMLTextAreaElement | HTMLInputElement | null>

const GENERIC = '__generic__'

/**
 * Botões de formatação, emoji e "+ Variável" de um campo de texto.
 * `onChange` recebe o texto novo; o cursor volta para depois do que foi inserido.
 * `variables` = catálogo das variáveis prontas (sem ele, não mostra "+ Variável");
 * `generic` = próxima variável genérica livre do template (var1, var2...).
 */
export function TextTools({
  field,
  onChange,
  formatting = true,
  emoji = formatting,
  variables,
  generic,
  canAddVar = true,
  disabled,
}: {
  field: FieldRef
  onChange: (value: string) => void
  formatting?: boolean
  emoji?: boolean
  variables?: VariableInfo[]
  generic?: string
  canAddVar?: boolean
  disabled?: boolean
}) {
  function apply(result: { value: string; cursor: number }) {
    onChange(result.value)
    const el = field.current
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(result.cursor, result.cursor)
    })
  }

  function wrap(marker: string) {
    if (field.current) apply(wrapSelection(field.current, marker))
  }

  function insert(text: string) {
    if (field.current) apply(insertAtCursor(field.current, text))
  }

  const groups: [VariableOrigin, string][] = [
    ['customer', 'Cliente'],
    ['store', 'Loja'],
    ['campaign', 'Campanha'],
  ]

  return (
    <div className="tpl-tools">
      {formatting && (
        <>
          <button
            type="button"
            className="tpl-tool"
            title="Negrito (*texto*)"
            disabled={disabled}
            onClick={() => wrap('*')}
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className="tpl-tool"
            title="Itálico (_texto_)"
            disabled={disabled}
            onClick={() => wrap('_')}
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className="tpl-tool"
            title="Tachado (~texto~)"
            disabled={disabled}
            onClick={() => wrap('~')}
          >
            <s>S</s>
          </button>
          <button
            type="button"
            className="tpl-tool mono"
            title="Monoespaçado (```texto```)"
            disabled={disabled}
            onClick={() => wrap('```')}
          >
            {'</>'}
          </button>
        </>
      )}
      {emoji && <EmojiButton disabled={disabled} onPick={insert} />}
      {variables && (
        <select
          className="tpl-var-pick"
          aria-label="Inserir variável"
          value=""
          disabled={disabled || !canAddVar}
          onChange={(e) => {
            const key = e.target.value === GENERIC ? generic : e.target.value
            if (key) insert(`{{${key}}}`)
          }}
        >
          <option value="">+ Variável</option>
          {groups.map(([origin, label]) => {
            const items = variables.filter((v) => v.origin === origin)
            return (
              items.length > 0 && (
                <optgroup key={origin} label={label}>
                  {items.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.label} · {`{{${v.key}}}`}
                    </option>
                  ))}
                </optgroup>
              )
            )
          })}
          {generic && (
            <optgroup label="Outra">
              <option value={GENERIC}>+ Variável genérica · {`{{${generic}}}`}</option>
            </optgroup>
          )}
        </select>
      )}
    </div>
  )
}

/** Tabela de variáveis: exemplo (exigido pela Meta), valor se vazio e de onde vem o valor. */
export function VariablesEditor({
  variables,
  catalog,
  origins,
  onChange,
  disabled,
  errors,
  showExample = true,
}: {
  /** já resolvidas: uma por variável usada, na ordem da mensagem */
  variables: TemplateVariable[]
  catalog: VariableInfo[]
  origins: Partial<Record<VariableOrigin, string>>
  onChange: (variables: TemplateVariable[]) => void
  disabled?: boolean
  errors?: string[]
  /** false quando a amostra já é pedida embaixo de cada campo (WhatsApp) */
  showExample?: boolean
}) {
  function update(key: string, patch: Partial<TemplateVariable>) {
    onChange(variables.map((v) => (v.key === key ? { ...v, ...patch } : v)))
  }

  if (variables.length === 0) {
    return (
      <p className="muted tpl-help">
        Sem variáveis. Use “+ Variável” para colocar o nome do cliente, a loja, o cupom…
      </p>
    )
  }

  return (
    <>
      <div className="table-wrap">
        <table className="table compact tpl-vars">
          <thead>
            <tr>
              <th>Variável</th>
              {showExample && <th>Exemplo</th>}
              <th>Se vazio</th>
              <th>Preenchido com</th>
            </tr>
          </thead>
          <tbody>
            {variables.map((v) => {
              const info = variableInfo(v.key, catalog)
              return (
                <tr key={v.key}>
                  <td className="nowrap">
                    <div className="strong">{info.label}</div>
                    <div className="mono muted tpl-var-key">{`{{${v.key}}}`}</div>
                  </td>
                  {showExample && (
                    <td>
                      <input
                        aria-label={`Exemplo de ${info.label}`}
                        value={v.example}
                        placeholder="Ex.: Maria"
                        disabled={disabled}
                        onChange={(e) => update(v.key, { example: e.target.value })}
                      />
                    </td>
                  )}
                  <td>
                    {info.fallback === undefined ? (
                      <span className="muted">—</span>
                    ) : (
                      <input
                        aria-label={`Valor se vazio de ${info.label}`}
                        value={v.fallback ?? ''}
                        placeholder="Deixar em branco"
                        disabled={disabled}
                        onChange={(e) => update(v.key, { fallback: e.target.value })}
                      />
                    )}
                  </td>
                  <td className="muted">{origins[info.origin] ?? ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <FieldErrors messages={errors} />
    </>
  )
}

/**
 * Amostras das variáveis de um campo (como no Gerenciador do WhatsApp): a Meta exige um
 * exemplo de cada variável do cabeçalho, do corpo e do link para analisar o template.
 */
export function SampleFields({
  title,
  keys,
  variables,
  catalog,
  onChange,
  disabled,
  idPrefix,
}: {
  title: string
  /** variáveis usadas neste campo, na ordem */
  keys: string[]
  /** todas as variáveis do template (já resolvidas) */
  variables: TemplateVariable[]
  catalog: VariableInfo[]
  onChange: (variables: TemplateVariable[]) => void
  disabled?: boolean
  idPrefix: string
}) {
  if (keys.length === 0) return null
  const byKey = new Map(variables.map((v) => [v.key, v]))

  return (
    <div className="tpl-samples">
      <div className="tpl-samples-title">{title}</div>
      <p className="muted tpl-help">
        Para a Meta analisar o conteúdo, envie um exemplo de cada variável. Não use dados reais de
        clientes.
      </p>
      {keys.map((key) => {
        const info = variableInfo(key, catalog)
        const value = byKey.get(key)?.example ?? ''
        const id = `${idPrefix}-${key}`
        return (
          <div key={key} className="field tpl-sample">
            <label htmlFor={id}>
              <span className="mono">{`{{${key}}}`}</span>
              <span className="muted"> · {info.label}</span> <span className="tpl-required">*</span>
            </label>
            <input
              id={id}
              value={value}
              placeholder={`Insira o conteúdo para {{${key}}}`}
              aria-invalid={!value.trim()}
              disabled={disabled}
              onChange={(e) =>
                onChange(
                  variables.map((v) => (v.key === key ? { ...v, example: e.target.value } : v)),
                )
              }
            />
          </div>
        )
      })}
    </div>
  )
}
