import { Fragment, type ReactNode, useMemo, useState } from 'react'
import { IconChevronRight } from '../../../components/menu/icons'
import { formatMoney } from '../../../lib/format'
import {
  buildTree,
  type Metrics,
  metrics,
  totalOf,
  type ProductLeaf,
  type ProductNode,
} from './vendas_produto_utils'

const LEVEL = ['Grupo', 'Categoria', 'Subcategoria']

const int = (v: number) => Math.round(v).toLocaleString('pt-BR')
const dec = (v: number | null, suffix = '', digits = 1) =>
  v === null
    ? '—'
    : `${v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}${suffix}`

/** Markup com 2 casas; em itálico quando só parte do valor tem custo (a dica mostra quanto). */
function Markup({ m }: { m: Metrics }) {
  const parcial = m.coberturaCusto !== null && m.coberturaCusto < 99.95
  return (
    <span
      className={parcial ? 'produto-markup parcial' : 'produto-markup'}
      title={
        m.coberturaCusto === null
          ? undefined
          : `Calculado sobre ${dec(m.coberturaCusto, '%')} do valor (produtos com custo)`
      }
    >
      {dec(m.markup, '', 2)}
    </span>
  )
}
const money = (v: number | null) => (v === null ? '—' : formatMoney(v))

/** Vendas por grupo, abrindo em categoria e subcategoria. Começa fechado. */
export default function VendasProduto({
  leaves,
  title,
  loading = false,
}: {
  leaves: ProductLeaf[]
  title: string
  loading?: boolean
}) {
  const tree = useMemo(() => buildTree(leaves), [leaves])
  const [open, setOpen] = useState<Set<string>>(() => new Set())

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        // Fechar o grupo fecha também as categorias dele.
        for (const key of next) if (key === id || key.startsWith(`${id}›`)) next.delete(key)
      } else next.add(id)
      return next
    })

  const allIds = useMemo(() => tree.flatMap((g) => [g.id, ...g.filhos.map((c) => c.id)]), [tree])
  const allOpen = allIds.every((id) => open.has(id))
  const total = metrics(totalOf(tree))

  function rows(nodes: ProductNode[]): ReactNode {
    return nodes.map((node) => {
      const m = metrics(node)
      const canOpen = node.filhos.length > 0
      const isOpen = open.has(node.id)
      return (
        <Fragment key={node.id}>
          <tr className={`produto-row nivel-${node.nivel}`}>
            <td>
              <div className="produto-name" style={{ paddingLeft: node.nivel * 22 }}>
                {canOpen ? (
                  <button
                    type="button"
                    className={isOpen ? 'produto-toggle open' : 'produto-toggle'}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? 'Fechar' : 'Abrir'} ${LEVEL[node.nivel].toLowerCase()} ${node.nome}`}
                    onClick={() => toggle(node.id)}
                  >
                    <IconChevronRight size={14} strokeWidth={2.2} />
                  </button>
                ) : (
                  <span className="produto-toggle-space" />
                )}
                <span>{node.nome}</span>
              </div>
            </td>
            <td className="num">{money(m.valor)}</td>
            <td className="num">{dec(total.valor ? (m.valor / total.valor) * 100 : null, '%')}</td>
            <td className="num">{int(m.qtd)}</td>
            <td className="num">{money(m.pmv)}</td>
            <td className="num">{dec(m.desconto, '%')}</td>
            <td className="num">
              <Markup m={m} />
            </td>
            <td className="num muted">—</td>
            <td className="num muted">—</td>
          </tr>
          {isOpen && rows(node.filhos)}
        </Fragment>
      )
    })
  }

  return (
    <section className="card relatorios-produtos">
      <div className="relatorios-produtos-head">
        <h2 className="card-title">{title}</h2>
        <button
          type="button"
          className="btn sm"
          onClick={() => setOpen(allOpen ? new Set() : new Set(allIds))}
        >
          {allOpen ? 'Fechar tudo' : 'Abrir tudo'}
        </button>
      </div>
      <div className="relatorios-scroll">
        <table className="table compact relatorios-table produto-table">
          <thead>
            <tr>
              <th>Grupo › categoria › subcategoria</th>
              <th className="num">Valor de vendas</th>
              <th className="num" title="Participação no valor de vendas total do período">
                % do valor
              </th>
              <th className="num">Peças</th>
              <th className="num" title="Preço médio de venda: valor ÷ peças">
                PMV
              </th>
              <th className="num" title="Desconto sobre o preço de tabela">
                % desconto
              </th>
              <th className="num" title="Valor vendido ÷ custo, só dos produtos com custo">
                Markup
              </th>
              <th className="num" title="Em breve">
                Estoque
              </th>
              <th className="num" title="Em breve">
                Giro
              </th>
            </tr>
          </thead>
          <tbody>
            {rows(tree)}
            {tree.length === 0 && (
              <tr>
                <td colSpan={9} className="muted">
                  {loading ? 'Carregando…' : 'Nenhuma venda no período.'}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="produto-row produto-total">
              <td>Total</td>
              <td className="num">{money(total.valor)}</td>
              <td className="num">{total.valor ? '100,0%' : '—'}</td>
              <td className="num">{int(total.qtd)}</td>
              <td className="num">{money(total.pmv)}</td>
              <td className="num">{dec(total.desconto, '%')}</td>
              <td className="num">
                <Markup m={total} />
              </td>
              <td className="num muted">—</td>
              <td className="num muted">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="relatorios-note">
        % do valor = participação no valor de vendas total do período · PMV = valor ÷ peças · Markup
        = valor vendido ÷ custo, só com os produtos que têm custo na planilha de produtos (em
        itálico quando parte do valor ficou sem custo; passe o mouse para ver quanto) · Estoque e
        giro: em breve.
      </p>
    </section>
  )
}
