// Integrações que ainda não mandam log para o CRM: aparecem como Offline / Não configurado.
// Quando uma delas existir de verdade (tabela integrations, mesmo `code`), o card real entra
// no lugar deste.

export type IntegracaoPlanejada = {
  code: string
  sigla: string
  nome: string
  tipo: string
  desc: string
}

export const planejadas: IntegracaoPlanejada[] = [
  {
    code: 'whatsapp',
    sigla: 'WA',
    nome: 'WhatsApp Business API',
    tipo: 'Canal de envio · Meta',
    desc: 'Envio de campanhas, gatilhos e inbox de conversas.',
  },
  {
    code: 'email',
    sigla: '@',
    nome: 'E-mail transacional',
    tipo: 'Canal de envio · SMTP',
    desc: 'Convites, senhas e e-mails das campanhas.',
  },
  {
    code: 'pegasus_jf',
    sigla: 'JF',
    nome: 'Pegasus · Juiz de Fora',
    tipo: 'Vendas e clientes · coletor da loja',
    desc: 'Clientes e vendas do Pegasus da loja, enviados pelo coletor 1 vez por dia.',
  },
  {
    code: 'pegasus_bh',
    sigla: 'BH',
    nome: 'Pegasus · Belo Horizonte',
    tipo: 'Vendas e clientes · coletor da loja',
    desc: 'Clientes e vendas do Pegasus da loja, enviados pelo coletor 1 vez por dia.',
  },
  {
    code: 'form_campanha',
    sigla: 'CP',
    nome: 'Formulário de campanha',
    tipo: 'sac.meialuadbarreto.com.br/campanha',
    desc: 'Cada resposta cria ou atualiza o cliente, registra consentimento e gera o voucher.',
  },
  {
    code: 'sac',
    sigla: 'SAC',
    nome: 'SAC online',
    tipo: 'sac.meialuadbarreto.com.br',
    desc: 'Protocolos de ocorrência (pilling, rasgo, costura…) aparecem na ficha do cliente.',
  },
  {
    code: 'google_analytics',
    sigla: 'GA',
    nome: 'Google Analytics',
    tipo: 'Site institucional',
    desc: 'Atribuir visitas do site meialuadbarreto.com.br a campanhas com UTM.',
  },
]
