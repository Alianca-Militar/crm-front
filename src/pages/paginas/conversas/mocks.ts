// Dados de exemplo do design. Trocar pela API quando o banco estiver pronto.

/** 'c' = cliente, 'l' = loja */
export type Mensagem = { de: 'c' | 'l'; texto: string; hora: string }

export type Conversa = {
  id: number
  clienteId: number
  ini: string
  nome: string
  quando: string
  loja: string
  fone: string
  ultima: string
  msgs: Mensagem[]
}

export const filtros = [
  { label: 'Aguardando · 7', ativo: true },
  { label: 'Minhas', ativo: false },
  { label: 'Resolvidas', ativo: false },
]

export const conversas: Conversa[] = [
  {
    id: 1,
    clienteId: 1,
    ini: 'MV',
    nome: 'Sd. Marcos Vinícius',
    quando: '4 min',
    loja: 'Invictus BH',
    fone: '(31) 9 9***-1820',
    ultima: 'Tem gandola tamanho M na loja de BH?',
    msgs: [
      { de: 'c', texto: 'Boa tarde! Vi a mensagem da pesquisa, já respondi.', hora: '14:02' },
      { de: 'l', texto: 'Obrigado, Marcos! Seu voucher INV20-5R2L já está ativo.', hora: '14:05' },
      { de: 'c', texto: 'Tem gandola tamanho M na loja de BH?', hora: '14:27' },
    ],
  },
  {
    id: 2,
    clienteId: 2,
    ini: 'AL',
    nome: 'Cb. Ana Luiza',
    quando: '18 min',
    loja: 'Invictus BH',
    fone: '(31) 9 8***-4412',
    ultima: 'Meu voucher não apareceu no e-mail',
    msgs: [
      { de: 'c', texto: 'Oi, meu voucher não apareceu no e-mail', hora: '09:20' },
      { de: 'l', texto: 'Oi, Ana! Vou reenviar agora pelo WhatsApp mesmo.', hora: '09:24' },
    ],
  },
  {
    id: 3,
    clienteId: 3,
    ini: 'RP',
    nome: 'Sgt. Rafael Pires',
    quando: '41 min',
    loja: 'Invictus BH',
    fone: '(31) 9 9***-0391',
    ultima: 'Vocês fazem bordado de nome na farda?',
    msgs: [{ de: 'c', texto: 'Vocês fazem bordado de nome na farda?', hora: '13:50' }],
  },
  {
    id: 4,
    clienteId: 5,
    ini: 'JT',
    nome: 'Ten. Júlia Teixeira',
    quando: '1 h',
    loja: 'Invictus JF',
    fone: '(32) 9 9***-7754',
    ultima: 'Qual o prazo da pré-venda?',
    msgs: [{ de: 'c', texto: 'Qual o prazo da pré-venda da Combat Shirt?', hora: '13:31' }],
  },
  {
    id: 5,
    clienteId: 8,
    ini: 'GF',
    nome: '3º Sgt. Gustavo Ferreira',
    quando: '2 h',
    loja: 'Invictus JF',
    fone: '(32) 9 8***-2210',
    ultima: 'Chegou calça tática 44?',
    msgs: [{ de: 'c', texto: 'Chegou calça tática 44?', hora: '12:10' }],
  },
]
