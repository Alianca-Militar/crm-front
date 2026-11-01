// Dados de exemplo do design. Trocar pela API quando o banco estiver pronto.

export const periodos = ['Outubro 2026', '3º trimestre 2026', '2026']

export const relatorios = [
  { nome: 'Vendas por produto', desc: 'Peças vendidas por loja' },
  { nome: 'Desempenho de campanhas', desc: 'Envios, respostas, conversão' },
  { nome: 'Base de clientes', desc: 'Novos, recorrentes, inativos' },
  { nome: 'Atendimento e SAC', desc: 'NPS, conversas, protocolos' },
]

export const produtos = [
  { nome: 'Gandola PMMG (novo fardamento)', jf: '148', bh: '231', total: '379', camp: '41%' },
  { nome: 'Calça tática', jf: '122', bh: '190', total: '312', camp: '33%' },
  { nome: 'Combat Shirt', jf: '96', bh: '158', total: '254', camp: '28%' },
  { nome: 'Camiseta', jf: '204', bh: '277', total: '481', camp: '19%' },
  { nome: 'Farda Safari', jf: '31', bh: '22', total: '53', camp: '9%' },
  { nome: 'Acessórios', jf: '87', bh: '134', total: '221', camp: '12%' },
]

export const nps = {
  geral: '77',
  respostas: '482',
  promotores: 82,
  neutros: 13,
  detratores: 5,
  porLoja: [
    { loja: 'Juiz de Fora', nps: 'NPS 81' },
    { loja: 'Belo Horizonte', nps: 'NPS 74' },
  ],
}
