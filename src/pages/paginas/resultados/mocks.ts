// Dados de exemplo do design. Trocar pela API (campaign_revenue) quando o banco estiver pronto.

export const campanha = {
  status: 'Ativa',
  info: '01/10 – 31/10 · WhatsApp + e-mail · Ambas as lojas',
  nome: 'Voucher R$ 20 · Pesquisa fardamento PMMG',
}

export const campanhasSelect = [
  'Voucher R$ 20 · Pesquisa PMMG',
  'Pré-venda Combat Shirt',
  'Reativação 12 meses',
]

export const kpis = [
  { label: 'Receita atribuída', valor: 'R$ 38.420', sub: 'em compras com voucher' },
  { label: 'Ticket médio', valor: 'R$ 206,56', sub: 'mínimo exigido R$ 150' },
  { label: 'Taxa de resgate', valor: '59,6%', sub: 'dos vouchers emitidos' },
  { label: 'Nota média de atendimento', valor: '8,7', sub: 'escala 0 a 10' },
]

export const funil: [string, number][] = [
  ['Enviados', 1248],
  ['Entregues', 1211],
  ['Lidos', 942],
  ['Pesquisas respondidas', 312],
  ['Vouchers emitidos', 312],
  ['Vouchers resgatados', 186],
]

export const cidades = [
  { nome: 'Uberlândia', pct: 38 },
  { nome: 'Uberaba', pct: 21 },
  { nome: 'Pouso Alegre', pct: 17 },
  { nome: 'Governador Valadares', pct: 14 },
  { nome: 'Outra cidade', pct: 10 },
]

export const porLoja = [
  { loja: 'Belo Horizonte', resgates: '112 resgates', receita: 'R$ 23.310' },
  { loja: 'Juiz de Fora', resgates: '74 resgates', receita: 'R$ 15.110' },
]

export const resgates = [
  {
    clienteId: 2,
    nome: 'Cb. Ana Luiza Ramos',
    cod: 'INV20-7K3Q',
    loja: 'BH',
    valor: 'R$ 289,90',
    quando: 'hoje, 11:42',
  },
  {
    clienteId: 4,
    nome: 'Sd. Pedro Henrique Lima',
    cod: 'INV20-2M8P',
    loja: 'JF',
    valor: 'R$ 174,00',
    quando: 'hoje, 10:15',
  },
  {
    clienteId: 3,
    nome: 'Sgt. Rafael Pires',
    cod: 'INV20-9X1D',
    loja: 'BH',
    valor: 'R$ 412,50',
    quando: 'ontem, 17:03',
  },
  {
    clienteId: 6,
    nome: 'Sd. Bianca Moura',
    cod: 'INV20-4T6W',
    loja: 'JF',
    valor: 'R$ 158,00',
    quando: 'ontem, 14:28',
  },
]
