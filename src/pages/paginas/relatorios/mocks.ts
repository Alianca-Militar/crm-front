// Dados de exemplo do design. Trocar pela API quando o banco estiver pronto.

export const relatorios = [
  { nome: 'Indicadores', desc: 'PA, ticket médio, markup x ano anterior' },
  { nome: 'Vendas por produto', desc: 'Peças vendidas por loja' },
  { nome: 'Desempenho de campanhas', desc: 'Envios, respostas, conversão' },
  { nome: 'Base de clientes', desc: 'Novos, recorrentes, inativos' },
  { nome: 'Atendimento e SAC', desc: 'NPS, conversas, protocolos' },
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

// Atendimento e SAC.
export const notasGoogle = [
  { loja: 'Belo Horizonte', nota: 4.7, avaliacoes: 1_284 },
  { loja: 'Juiz de Fora', nota: 4.8, avaliacoes: 612 },
]

export const atendimentoResumo = {
  conversas: 1_946,
  mensagens: 23_480,
  notaAtendente: 4.6,
  avaliacoesAtendente: 318,
  notaIa: 8.4,
  analisadasIa: 1_102,
}

/** Conversas por dia e o custo do dia (templates + mensagens cobradas). */
export const conversasPorDia = Array.from({ length: 30 }, (_, i) => {
  const day = new Date(2026, 9, 12 + i)
  const sunday = day.getDay() === 0
  const conversas = sunday ? 8 : Math.round(55 + 25 * Math.sin(i / 3) + (i % 4) * 6)
  const templates = sunday ? 0 : Math.round(120 + 90 * Math.abs(Math.sin(i / 5)))
  return {
    dia: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`,
    conversas,
    custoTemplates: templates * 0.4,
    custoMensagens: conversas * 0.05,
  }
})

export const conversasPorNumero = [
  { numero: 'Ofertas BH', conversas: 812 },
  { numero: 'Atendimento BH', conversas: 604 },
  { numero: 'Atendimento JF', conversas: 391 },
  { numero: 'Ofertas JF', conversas: 139 },
]

export const iaAcertos = [
  { semana: '13/10', acertos: 212, erros: 31 },
  { semana: '20/10', acertos: 248, erros: 27 },
  { semana: '27/10', acertos: 263, erros: 22 },
  { semana: '03/11', acertos: 281, erros: 18 },
]

/** Quantas conversas a IA avaliou com cada nota (0 a 10). */
export const iaNotas = [
  { nota: '0–2', conversas: 21 },
  { nota: '3–4', conversas: 48 },
  { nota: '5–6', conversas: 117 },
  { nota: '7–8', conversas: 402 },
  { nota: '9–10', conversas: 514 },
]
