/** Vendas por produto: soma das subcategorias em categorias e grupos, e os indicadores.
 *
 * Estoque e giro ainda não existem no CRM (aparecem como "em breve"). */

export type ProductLeaf = {
  grupo: string
  categoria: string
  subcategoria: string
  /** Valor vendido (já com desconto). */
  valor: number
  /** Valor dos itens antes do desconto. */
  bruto: number
  /** Desconto dado nos itens. */
  desconto: number
  /** Peças vendidas. */
  qtd: number
  /** Valor vendido só dos produtos com custo na planilha. */
  valorComCusto: number
  /** Custo das peças desses produtos. */
  custo: number
}

type Totals = Omit<ProductLeaf, 'grupo' | 'categoria' | 'subcategoria'>

export type ProductNode = Totals & {
  id: string
  nome: string
  nivel: 0 | 1 | 2
  filhos: ProductNode[]
}

export type Metrics = {
  valor: number
  qtd: number
  /** Preço médio de venda: valor ÷ peças. */
  pmv: number | null
  /** Desconto sobre o valor de tabela, em %. */
  desconto: number | null
  /** Valor vendido ÷ custo, só dos produtos com custo. */
  markup: number | null
  /** Parte do valor vendido que tem custo, em %. */
  coberturaCusto: number | null
}

const empty = (): Totals => ({
  valor: 0,
  bruto: 0,
  desconto: 0,
  qtd: 0,
  valorComCusto: 0,
  custo: 0,
})

function add(into: Totals, from: Totals) {
  into.valor += from.valor
  into.bruto += from.bruto
  into.desconto += from.desconto
  into.qtd += from.qtd
  into.valorComCusto += from.valorComCusto
  into.custo += from.custo
}

/** Grupo › categoria › subcategoria, cada nível ordenado pelo valor vendido. */
export function buildTree(leaves: ProductLeaf[]): ProductNode[] {
  const groups = new Map<string, ProductNode>()
  for (const leaf of leaves) {
    let group = groups.get(leaf.grupo)
    if (!group) {
      group = { id: leaf.grupo, nome: leaf.grupo, nivel: 0, filhos: [], ...empty() }
      groups.set(leaf.grupo, group)
    }
    const catId = `${leaf.grupo}›${leaf.categoria}`
    let cat = group.filhos.find((c) => c.id === catId)
    if (!cat) {
      cat = { id: catId, nome: leaf.categoria, nivel: 1, filhos: [], ...empty() }
      group.filhos.push(cat)
    }
    cat.filhos.push({
      id: `${catId}›${leaf.subcategoria}`,
      nome: leaf.subcategoria,
      nivel: 2,
      filhos: [],
      valor: leaf.valor,
      bruto: leaf.bruto,
      desconto: leaf.desconto,
      qtd: leaf.qtd,
      valorComCusto: leaf.valorComCusto,
      custo: leaf.custo,
    })
    add(cat, leaf)
    add(group, leaf)
  }
  const sort = (nodes: ProductNode[]): ProductNode[] =>
    nodes
      .map((n) => ({ ...n, filhos: sort(n.filhos) }))
      .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome))
  return sort([...groups.values()])
}

export function totalOf(nodes: ProductNode[]): Totals {
  const total = empty()
  for (const n of nodes) add(total, n)
  return total
}

export function metrics(t: Totals): Metrics {
  return {
    valor: t.valor,
    qtd: t.qtd,
    pmv: t.qtd ? t.valor / t.qtd : null,
    desconto: t.bruto ? (t.desconto / t.bruto) * 100 : null,
    markup: t.custo ? t.valorComCusto / t.custo : null,
    coberturaCusto: t.valor ? (t.valorComCusto / t.valor) * 100 : null,
  }
}
