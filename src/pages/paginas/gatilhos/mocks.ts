// Dados de exemplo do design. Trocar pela API (campaign_triggers) quando o banco estiver pronto.

export type Gatilho = {
  id: number
  nome: string
  loja: string
  stats: string
  quando: string
  espera: string
  acao: string
  ativo: boolean
}

export const gatilhos: Gatilho[] = [
  {
    id: 1,
    nome: 'Avaliação pós-compra',
    loja: 'Ambas as lojas',
    stats: '412 envios em 30 dias · 38% responderam',
    quando: 'Compra finalizada no PDV',
    espera: '2 dias',
    acao: 'pos_compra_avaliacao',
    ativo: true,
  },
  {
    id: 2,
    nome: 'Envio do código do voucher',
    loja: 'Ambas as lojas',
    stats: '312 envios · 0 falhas',
    quando: 'Pesquisa respondida',
    espera: 'imediato',
    acao: 'voucher_codigo',
    ativo: true,
  },
  {
    id: 3,
    nome: 'Voucher prestes a vencer',
    loja: 'Ambas as lojas',
    stats: '57 envios · 14 resgates',
    quando: 'Voucher não usado',
    espera: '5 dias antes do vencimento',
    acao: 'voucher_codigo',
    ativo: true,
  },
  {
    id: 4,
    nome: 'Aniversário do cliente',
    loja: 'Belo Horizonte',
    stats: 'Pausado por Carla em 20/10',
    quando: 'Data de nascimento',
    espera: '9h do dia',
    acao: 'aniversario_cliente',
    ativo: false,
  },
  {
    id: 5,
    nome: 'Reposição de tamanho',
    loja: 'Ambas as lojas',
    stats: '23 avisos · 9 compras',
    quando: 'Produto da lista de espera volta ao estoque',
    espera: 'imediato',
    acao: 'aviso_estoque',
    ativo: true,
  },
  {
    id: 6,
    nome: 'Reativação · 12 meses sem compra',
    loja: 'Juiz de Fora',
    stats: 'Rascunho',
    quando: '365 dias sem compra',
    espera: '1º dia útil do mês',
    acao: 'reativacao_12_meses',
    ativo: false,
  },
]
