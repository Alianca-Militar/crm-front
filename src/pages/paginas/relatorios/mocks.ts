// Dados de exemplo do design. Trocar pela API quando o banco estiver pronto.

export const relatorios = [
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

// Base de clientes.
export const baseResumo = {
  total: 14_820,
  whatsapp: 11_130,
  completos: 2_240,
  optin: 10_410,
}

/** Vendas do período no consumidor final (sem cliente identificado). */
export const semIdentificacao = {
  valor: 182_340.9,
  vendas: 401,
  totalValor: 309_292.18,
  totalVendas: 646,
}

export const completude = [
  { campo: 'CPF', pct: 77 },
  { campo: 'Cidade', pct: 77 },
  { campo: 'Endereço', pct: 77 },
  { campo: 'Telefone', pct: 75 },
  { campo: 'Corporação', pct: 18 },
  { campo: 'Data de nasc.', pct: 4 },
  { campo: 'E-mail', pct: 1 },
]

export const clientesPorLoja = [
  { loja: 'Belo Horizonte', clientes: 9_870 },
  { loja: 'Juiz de Fora', clientes: 4_310 },
  { loja: 'Sem loja definida', clientes: 640 },
]

export type RfmTone = 'best' | 'good' | 'watch' | 'risk' | 'lost'

export const rfm: {
  perfil: string
  clientes: number
  receita: number
  acao: string
  tom: RfmTone
}[] = [
  {
    perfil: 'Champions',
    clientes: 49,
    receita: 78_672.99,
    acao: 'Recompensar, VIP, pedir indicação.',
    tom: 'best',
  },
  {
    perfil: 'Loyal Customers',
    clientes: 93,
    receita: 126_335.54,
    acao: 'Upsell, fidelidade, indicação.',
    tom: 'best',
  },
  {
    perfil: 'Potential Loyalist',
    clientes: 183,
    receita: 210_152.25,
    acao: 'Incentivar a próxima compra.',
    tom: 'good',
  },
  {
    perfil: 'New Customers',
    clientes: 384,
    receita: 278_564.5,
    acao: 'Onboarding, garantir a 2ª compra.',
    tom: 'good',
  },
  {
    perfil: 'Promising',
    clientes: 381,
    receita: 227_593.55,
    acao: 'Nutrir com ofertas leves.',
    tom: 'good',
  },
  {
    perfil: 'Need Attention',
    clientes: 82,
    receita: 86_820.72,
    acao: 'Oferta com prazo, reengajar.',
    tom: 'watch',
  },
  {
    perfil: 'About to Sleep',
    clientes: 24,
    receita: 10_543.63,
    acao: 'Reativar logo: lembrete + oferta.',
    tom: 'watch',
  },
  { perfil: 'At Risk', clientes: 0, receita: 0, acao: 'Campanha de reativação.', tom: 'risk' },
  {
    perfil: "Can't Lose Them",
    clientes: 0,
    receita: 0,
    acao: 'Resgate urgente, contato pessoal.',
    tom: 'risk',
  },
  {
    perfil: 'Hibernating',
    clientes: 0,
    receita: 0,
    acao: 'Reengajar ou aceitar a perda.',
    tom: 'lost',
  },
  { perfil: 'Lost', clientes: 0, receita: 0, acao: 'Campanha agressiva ou arquivar.', tom: 'lost' },
]

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
