import type { AudienceFilters, FilterOptions } from '../campanhas/campanhas_api'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

type ListKey = 'corporacoes' | 'patentes' | 'rfm_segments' | 'tags' | 'product_categories'
type NumberKey = 'purchased_within_days' | 'not_purchased_days' | 'orders_min' | 'orders_max'
type MoneyKey = 'spent_min' | 'spent_max'

function toggle<T>(list: T[] | undefined, value: T): T[] {
  const current = list ?? []
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
}

function Chips<T extends string | number>({
  label,
  options,
  selected,
  onToggle,
  disabled,
  empty,
}: {
  label: string
  options: { value: T; label: string }[]
  selected: T[] | undefined
  onToggle: (value: T) => void
  disabled?: boolean
  empty?: string
}) {
  return (
    <div className="nova-chips-block">
      <div className="field-label">{label}</div>
      {options.length === 0 ? (
        <span className="muted nova-empty">{empty ?? 'Sem dados ainda.'}</span>
      ) : (
        <div className="nova-chips">
          {options.map((o) => {
            const on = selected?.includes(o.value) ?? false
            return (
              <button
                key={String(o.value)}
                type="button"
                aria-pressed={on}
                className={on ? 'nova-chip on' : 'nova-chip'}
                disabled={disabled}
                onClick={() => onToggle(o.value)}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const asOptions = (values: string[]) => values.map((v) => ({ value: v, label: v }))
const NO_CUSTOMERS = 'Sem dados ainda (os clientes chegam com a importação do Pegasus).'

/** Filtros do público. Vazio = todos os clientes (as exclusões automáticas valem sempre). */
export default function AudienceFiltersEditor({
  value,
  options,
  onChange,
  disabled,
}: {
  value: AudienceFilters
  options: FilterOptions | undefined
  onChange: (filters: AudienceFilters) => void
  disabled?: boolean
}) {
  function setList(key: ListKey, item: string) {
    onChange({ ...value, [key]: toggle(value[key], item) })
  }

  function setNumber(key: NumberKey, raw: string) {
    const next = { ...value }
    if (raw === '') delete next[key]
    else next[key] = Math.max(0, Math.floor(Number(raw)))
    onChange(next)
  }

  function setMoney(key: MoneyKey, raw: string) {
    const next = { ...value }
    if (raw === '') delete next[key]
    else next[key] = raw
    onChange(next)
  }

  // Categorias dos grupos marcados (sem grupo marcado: todas).
  const products = options?.products ?? []
  const pickedGroups = value.product_groups ?? []
  const categoriesOf = (groups: string[]) =>
    [
      ...new Set(
        products
          .filter((p) => groups.length === 0 || groups.includes(p.group))
          .flatMap((p) => p.categories),
      ),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR'))

  function toggleGroup(group: string) {
    const groups = toggle(value.product_groups, group)
    // Tira a categoria que não existe mais nos grupos marcados.
    const visible = new Set(categoriesOf(groups))
    const categories = (value.product_categories ?? []).filter((c) => visible.has(c))
    onChange({ ...value, product_groups: groups, product_categories: categories })
  }

  const numberField = (key: NumberKey, label: string, placeholder: string) => (
    <div className="field">
      <label htmlFor={`aud-${key}`}>{label}</label>
      <input
        id={`aud-${key}`}
        type="number"
        min={0}
        inputMode="numeric"
        placeholder={placeholder}
        value={value[key] ?? ''}
        disabled={disabled}
        onChange={(e) => setNumber(key, e.target.value)}
      />
    </div>
  )

  const moneyField = (key: MoneyKey, label: string) => (
    <div className="field">
      <label htmlFor={`aud-${key}`}>{label}</label>
      <input
        id={`aud-${key}`}
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        placeholder="R$"
        value={value[key] ?? ''}
        disabled={disabled}
        onChange={(e) => setMoney(key, e.target.value)}
      />
    </div>
  )

  return (
    <div className="nova-filters">
      <fieldset className="nova-group">
        <legend>Corporação e patente</legend>
        <Chips
          label="Corporação"
          options={asOptions(options?.corporacoes ?? [])}
          selected={value.corporacoes}
          onToggle={(v) => setList('corporacoes', v)}
          disabled={disabled}
          empty={NO_CUSTOMERS}
        />
        <Chips
          label="Patente / cargo"
          options={asOptions(options?.patentes ?? [])}
          selected={value.patentes}
          onToggle={(v) => setList('patentes', v)}
          disabled={disabled}
          empty={NO_CUSTOMERS}
        />
      </fieldset>

      <fieldset className="nova-group">
        <legend>Loja e cidade</legend>
        <Chips
          label="Loja do cliente"
          options={options?.stores ?? []}
          selected={value.stores}
          onToggle={(v) => onChange({ ...value, stores: toggle(value.stores, v) })}
          disabled={disabled}
        />
        <Chips
          label="Cidade"
          options={options?.cities ?? []}
          selected={value.cities}
          onToggle={(v) => onChange({ ...value, cities: toggle(value.cities, v) })}
          disabled={disabled}
          empty={NO_CUSTOMERS}
        />
      </fieldset>

      <fieldset className="nova-group">
        <legend>Compras</legend>
        <div className="form-grid tight">
          {numberField('purchased_within_days', 'Comprou nos últimos (dias)', 'Ex.: 180')}
          {numberField('not_purchased_days', 'Sem comprar há mais de (dias)', 'Ex.: 365')}
          {numberField('orders_min', 'Nº de compras: mínimo', '')}
          {numberField('orders_max', 'Nº de compras: máximo', '')}
          {moneyField('spent_min', 'Total gasto: mínimo')}
          {moneyField('spent_max', 'Total gasto: máximo')}
        </div>
        <Chips
          label="Segmento (RFM)"
          options={asOptions(options?.rfm_segments ?? [])}
          selected={value.rfm_segments}
          onToggle={(v) => setList('rfm_segments', v)}
          disabled={disabled}
          empty={NO_CUSTOMERS}
        />
      </fieldset>

      <fieldset className="nova-group">
        <legend>Produtos comprados</legend>
        <Chips
          label="Grupo"
          options={asOptions(products.map((p) => p.group))}
          selected={value.product_groups}
          onToggle={toggleGroup}
          disabled={disabled}
          empty="Nenhum produto cadastrado ainda."
        />
        <Chips
          label="Categoria"
          options={asOptions(categoriesOf(pickedGroups))}
          selected={value.product_categories}
          onToggle={(v) => setList('product_categories', v)}
          disabled={disabled}
          empty="Nenhuma categoria nos grupos marcados."
        />
        <span className="tpl-help muted">
          Quem já comprou algum produto do grupo e da categoria marcados (vendas pagas, qualquer
          loja).
        </span>
      </fieldset>

      <fieldset className="nova-group">
        <legend>Aniversariantes e tags</legend>
        <Chips
          label="Aniversário no mês"
          options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
          selected={value.birthday_months}
          onToggle={(v) =>
            onChange({
              ...value,
              birthday_months: toggle(value.birthday_months, v).sort((a, b) => a - b),
            })
          }
          disabled={disabled}
        />
        <Chips
          label="Tags (qualquer uma)"
          options={asOptions(options?.tags ?? [])}
          selected={value.tags}
          onToggle={(v) => setList('tags', v)}
          disabled={disabled}
          empty="Nenhuma tag cadastrada ainda."
        />
      </fieldset>
    </div>
  )
}
