/** Vendas por produto: soma das subcategorias em categorias e grupos, e os indicadores. */

export type ProductLeaf = {
  grupo: string
  categoria: string
  subcategoria: string
  /** Valor vendido (já com desconto). */
  valor: number
  /** Valor de tabela, antes do desconto. */
  bruto: number
  /** Custo das peças vendidas. */
  custo: number
  /** Peças vendidas. */
  qtd: number
  /** Peças em estoque hoje. */
  estoque: number
}

type Totals = Pick<ProductLeaf, 'valor' | 'bruto' | 'custo' | 'qtd' | 'estoque'>

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
  /** Valor vendido ÷ custo. */
  markup: number | null
  estoque: number
  /** Peças vendidas ÷ estoque (vezes no período). */
  giro: number | null
}

const empty = (): Totals => ({ valor: 0, bruto: 0, custo: 0, qtd: 0, estoque: 0 })

function add(into: Totals, from: Totals) {
  into.valor += from.valor
  into.bruto += from.bruto
  into.custo += from.custo
  into.qtd += from.qtd
  into.estoque += from.estoque
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
      custo: leaf.custo,
      qtd: leaf.qtd,
      estoque: leaf.estoque,
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
    desconto: t.bruto ? ((t.bruto - t.valor) / t.bruto) * 100 : null,
    markup: t.custo ? t.valor / t.custo : null,
    estoque: t.estoque,
    giro: t.estoque ? t.qtd / t.estoque : null,
  }
}
