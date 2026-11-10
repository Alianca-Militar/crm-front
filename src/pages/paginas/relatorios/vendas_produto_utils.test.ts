import { describe, expect, it } from 'vitest'
import { buildTree, metrics, totalOf, type ProductLeaf } from './vendas_produto_utils'

const leaf = (grupo: string, categoria: string, subcategoria: string, valor: number) =>
  ({
    grupo,
    categoria,
    subcategoria,
    valor,
    bruto: valor * 1.25,
    custo: valor / 2,
    qtd: valor / 100,
    estoque: valor / 50,
  }) satisfies ProductLeaf

describe('buildTree', () => {
  const tree = buildTree([
    leaf('Calçados', 'Coturno', 'Cano alto', 1000),
    leaf('Fardamento', 'Calça', 'Tática', 3000),
    leaf('Calçados', 'Coturno', 'Cano curto', 500),
    leaf('Calçados', 'Tênis', 'Corrida', 2000),
  ])

  it('soma as subcategorias na categoria e no grupo, do maior para o menor', () => {
    expect(tree.map((g) => [g.nome, g.valor])).toEqual([
      ['Calçados', 3500],
      ['Fardamento', 3000],
    ])
    expect(tree[0].filhos.map((c) => [c.nome, c.valor])).toEqual([
      ['Tênis', 2000],
      ['Coturno', 1500],
    ])
    expect(tree[0].filhos[1].filhos.map((s) => s.nome)).toEqual(['Cano alto', 'Cano curto'])
  })

  it('o total geral é a soma dos grupos', () => {
    expect(totalOf(tree).valor).toBe(6500)
  })
})

describe('metrics', () => {
  it('calcula PMV, desconto, markup e giro', () => {
    const m = metrics({ valor: 800, bruto: 1000, custo: 400, qtd: 4, estoque: 8 })
    expect(m.pmv).toBe(200)
    expect(m.desconto).toBe(20)
    expect(m.markup).toBe(2)
    expect(m.giro).toBe(0.5)
  })

  it('sem peças, custo ou estoque o indicador fica vazio', () => {
    const m = metrics({ valor: 0, bruto: 0, custo: 0, qtd: 0, estoque: 0 })
    expect([m.pmv, m.desconto, m.markup, m.giro]).toEqual([null, null, null, null])
  })
})
