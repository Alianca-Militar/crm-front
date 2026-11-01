// Dados de exemplo do design. Trocar pela API (saúde das integrações) quando o banco estiver pronto.

export type IntegracaoStatus = 'Conectado' | 'Com erro' | 'Não conectado'

export const statusTone: Record<IntegracaoStatus, string> = {
  Conectado: 'tone-green',
  'Com erro': 'tone-red',
  'Não conectado': 'tone-gray',
}

export const alerta = {
  titulo: 'PDV Juiz de Fora sem sincronizar',
  mensagem: '2 falhas seguidas desde 09:12. Vendas de hoje ainda não entraram no CRM.',
}

export const integracoes: {
  sigla: string
  nome: string
  tipo: string
  status: IntegracaoStatus
  desc: string
  sync: string
  botao: string
}[] = [
  {
    sigla: 'WA',
    nome: 'WhatsApp Business API',
    tipo: 'Canal de envio · Meta',
    status: 'Conectado',
    desc: 'Envio de campanhas, gatilhos e inbox de conversas. Número único para as duas lojas.',
    sync: 'Webhook ativo',
    botao: 'Configurar',
  },
  {
    sigla: '@',
    nome: 'E-mail transacional',
    tipo: 'Canal de envio · SMTP',
    status: 'Conectado',
    desc: 'Remetente contato@meialuadbarreto.com.br com SPF e DKIM validados.',
    sync: 'Último envio há 12 min',
    botao: 'Configurar',
  },
  {
    sigla: 'JF',
    nome: 'PDV · Juiz de Fora',
    tipo: 'Vendas e estoque',
    status: 'Com erro',
    desc: 'Importa vendas, itens e CPF do cliente para atribuir compras às campanhas.',
    sync: 'Última sincronização ontem, 22:00',
    botao: 'Tentar de novo',
  },
  {
    sigla: 'BH',
    nome: 'PDV · Belo Horizonte',
    tipo: 'Vendas e estoque',
    status: 'Conectado',
    desc: 'Importa vendas, itens e CPF do cliente para atribuir compras às campanhas.',
    sync: 'Sincronizado há 5 min',
    botao: 'Configurar',
  },
  {
    sigla: 'CP',
    nome: 'Formulário de campanha',
    tipo: 'sac.meialuadbarreto.com.br/campanha',
    status: 'Conectado',
    desc: 'Cada resposta cria ou atualiza o cliente, registra consentimento e gera o voucher.',
    sync: '312 respostas recebidas',
    botao: 'Ver mapeamento',
  },
  {
    sigla: 'SAC',
    nome: 'SAC online',
    tipo: 'sac.meialuadbarreto.com.br',
    status: 'Conectado',
    desc: 'Protocolos de ocorrência (pilling, rasgo, costura…) aparecem na ficha do cliente.',
    sync: '4 protocolos abertos',
    botao: 'Ver mapeamento',
  },
  {
    sigla: 'GA',
    nome: 'Google Analytics',
    tipo: 'Site institucional',
    status: 'Não conectado',
    desc: 'Atribuir visitas do site meialuadbarreto.com.br a campanhas com UTM.',
    sync: '—',
    botao: 'Conectar',
  },
]
