// Dados de exemplo dos modais de envio (Iniciar conversa e template), que entram na etapa 3,
// quando o atendimento pelo CRM for ligado. A lista e a conversa já vêm da API.

export type ConvStatus = 'pending' | 'open' | 'closed'

/** in = cliente; out = loja (pelo CRM, pelo app do WhatsApp ou template de campanha). */
export type MsgAuthor = 'customer' | 'crm' | 'app' | 'campaign'
export type MsgStatus = 'sent' | 'delivered' | 'read' | 'failed'

export type Mensagem = {
  id: number
  author: MsgAuthor
  /** Quem mandou pelo CRM. */
  userName?: string
  text: string
  at: string
  status?: MsgStatus
  /** Mensagem de template (fora da janela ou campanha). */
  template?: string
}

export type Atendimento = {
  /** Atendimento anterior do mesmo cliente, mostrado acima da conversa atual. */
  closedAt: string
  reason: string
  messages: Mensagem[]
}

export type Conversa = {
  id: number
  customerId: number | null
  name: string
  phone: string
  store: string
  number: string
  status: ConvStatus
  assignee: { id: number; name: string } | null
  /** Respondida pelo app do WhatsApp sem ninguém assumir no CRM. */
  answeredByApp?: boolean
  campaign?: string
  /** Última mensagem do cliente: abre a janela de 24h da Meta. */
  lastCustomerAt: string | null
  /** Desde quando está esperando (aguardando) = primeira mensagem sem resposta. */
  waitingSince?: string
  closeReason?: string
  messages: Mensagem[]
  history?: Atendimento[]
}

export const CLOSE_REASONS = ['Vendeu', 'Dúvida respondida', 'Sem retorno do cliente', 'Outro']

export const TEMPLATES = [
  {
    name: 'retomar_atendimento',
    category: 'Utilidade',
    body: 'Oi, {{nome}}! Aqui é da {{loja}}. Vi que ficou uma dúvida no nosso atendimento. Posso te ajudar?',
  },
  {
    name: 'pedido_pronto_retirada',
    category: 'Utilidade',
    body: 'Oi, {{nome}}! Seu pedido já está pronto para retirada na {{loja}}.',
  },
  {
    name: 'bordado_pronto',
    category: 'Utilidade',
    body: 'Oi, {{nome}}! O bordado da sua farda ficou pronto. Pode passar na {{loja}} quando quiser.',
  },
]

export const STORES = ['Invictus BH', 'Invictus JF']

/** Números de WhatsApp das lojas. Uma loja pode ter mais de um. */
export const NUMBERS = [
  { label: 'BH 31', store: 'Invictus BH' },
  { label: 'BH 32', store: 'Invictus BH' },
  { label: 'JF 32', store: 'Invictus JF' },
]

export type ClienteBase = {
  id: number
  name: string
  phone: string
  cpf: string
  store: string
}

/** Clientes fictícios para a busca do "Iniciar conversa". */
export const CLIENTES: ClienteBase[] = [
  {
    id: 1,
    name: 'Sd. Marcos Vinícius',
    phone: '31999991820',
    cpf: '***.482.***-10',
    store: 'Invictus BH',
  },
  {
    id: 3,
    name: 'Sgt. Rafael Pires',
    phone: '31999990391',
    cpf: '***.115.***-07',
    store: 'Invictus BH',
  },
  {
    id: 11,
    name: 'Cb. Márcia Andrade',
    phone: '31988887720',
    cpf: '***.903.***-44',
    store: 'Invictus BH',
  },
  {
    id: 12,
    name: 'Ten. Marcelo Souza',
    phone: '32999996610',
    cpf: '***.250.***-91',
    store: 'Invictus JF',
  },
  {
    id: 13,
    name: 'Sd. Paula Reis',
    phone: '32988884415',
    cpf: '***.771.***-23',
    store: 'Invictus JF',
  },
]
