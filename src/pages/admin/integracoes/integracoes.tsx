import { useState } from 'react'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { formatLastAccess } from '../../../lib/format'
import { type IntegracaoPlanejada, planejadas } from './catalogo'
import {
  type Integration,
  useIntegrations,
  useLastIntegrationLogs,
  useSetIntegrationActive,
} from './integracoes_api'
import IntegrationLogTable from './integration_log_table'
import './integracoes.css'

function statusOf(i: Integration): { label: string; tone: string } {
  if (!i.active) return { label: 'Desativada', tone: 'tone-gray' }
  if (i.status === 'error') return { label: 'Com erro', tone: 'tone-red' }
  if (!i.last_success_at) return { label: 'Aguardando envio', tone: 'tone-orange' }
  if (i.stale) return { label: 'Sem sincronizar', tone: 'tone-orange' }
  return { label: 'Conectado', tone: 'tone-green' }
}

function needsAttention(i: Integration) {
  return i.active && (i.status === 'error' || i.stale)
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

/** Aviso do topo: integrações ativas com erro ou sem enviar há mais de 1 dia. */
function alertOf(problems: Integration[]) {
  if (problems.length > 1) {
    return {
      titulo: `${problems.length} integrações precisam de atenção`,
      mensagem: problems.map((i) => `${i.name}: ${statusOf(i).label.toLowerCase()}`).join(' · '),
    }
  }
  const i = problems[0]
  if (i.status === 'error') {
    return {
      titulo: `${i.name} com erro`,
      mensagem: `${plural(i.consecutive_failures, 'falha', 'falhas seguidas')} (a última ${formatLastAccess(i.last_error_at)}): ${i.last_error_message ?? 'sem detalhe'}. Veja os logs.`,
    }
  }
  return {
    titulo: `${i.name} sem sincronizar`,
    mensagem: i.last_success_at
      ? `Último envio ${formatLastAccess(i.last_success_at)}. Confira se o PC da loja está ligado e se a tarefa do Agendador rodou.`
      : 'Ainda não chegou nenhum envio. Rode o coletor na loja.',
  }
}

export default function Integracoes() {
  const [mostrarAlerta, setMostrarAlerta] = useState(true)
  const [logsOf, setLogsOf] = useState<Integration | null>(null)
  const [configOf, setConfigOf] = useState<Integration | null>(null)
  const integrations = useIntegrations()

  const real = integrations.data ?? []
  const realCodes = new Set(real.map((i) => i.code))
  const offline = planejadas.filter((p) => !realCodes.has(p.code))
  const problems = real.filter(needsAttention)
  const alerta = problems.length ? alertOf(problems) : null

  return (
    <div className="page page-integracoes">
      <div className="page-head-text">
        <h1 className="page-title">Integrações</h1>
        <p className="page-subtitle">
          Canais de envio, sistemas das lojas e formulários que alimentam o CRM.
        </p>
      </div>

      {integrations.isError && (
        <MsgNok
          titulo="Não foi possível carregar as integrações"
          mensagem={integrations.error.message}
        />
      )}

      {mostrarAlerta && alerta && (
        <MsgNok
          titulo={alerta.titulo}
          mensagem={alerta.mensagem}
          onClose={() => setMostrarAlerta(false)}
        />
      )}

      <div className="integracoes-grid">
        {real.map((i) => (
          <RealCard
            key={i.id}
            integration={i}
            info={planejadas.find((p) => p.code === i.code)}
            onLogs={() => setLogsOf(i)}
            onConfig={() => setConfigOf(i)}
          />
        ))}
        {!integrations.isPending && offline.map((p) => <OfflineCard key={p.code} info={p} />)}
      </div>

      {logsOf && <LogsModal integration={logsOf} onClose={() => setLogsOf(null)} />}
      {configOf && <ConfigModal integration={configOf} onClose={() => setConfigOf(null)} />}
    </div>
  )
}

function RealCard({
  integration: i,
  info,
  onLogs,
  onConfig,
}: {
  integration: Integration
  info: IntegracaoPlanejada | undefined
  onLogs: () => void
  onConfig: () => void
}) {
  const status = statusOf(i)
  const erro = i.active && i.status === 'error'

  return (
    <article className={erro ? 'integracoes-card error' : 'integracoes-card'}>
      <div className="integracoes-card-top">
        <div className="integracoes-id">
          <span className="integracoes-sigla">{info?.sigla ?? i.store_code ?? '—'}</span>
          <div>
            <h2 className="integracoes-nome">{i.name}</h2>
            <div className="integracoes-tipo">
              {info?.tipo ?? (i.kind === 'external' ? 'Sistema de fora' : 'Processo nosso')}
            </div>
          </div>
        </div>
        <span className={`badge sm ${status.tone}`}>{status.label}</span>
      </div>
      {info?.desc && <p className="integracoes-desc">{info.desc}</p>}
      {erro && (
        <p className="integracoes-erro">
          {plural(i.consecutive_failures, 'falha', 'falhas seguidas')}:{' '}
          {i.last_error_message ?? 'sem detalhe'}
        </p>
      )}
      <div className="integracoes-foot">
        <span>
          {i.last_success_at
            ? `Última sincronização ${formatLastAccess(i.last_success_at)}`
            : 'Nunca sincronizou'}
        </span>
        <div className="integracoes-actions">
          <button type="button" className="btn xs" onClick={onLogs}>
            Ver logs
          </button>
          <button type="button" className="btn xs" onClick={onConfig}>
            Configurar
          </button>
        </div>
      </div>
    </article>
  )
}

function OfflineCard({ info }: { info: IntegracaoPlanejada }) {
  return (
    <article className="integracoes-card offline">
      <div className="integracoes-card-top">
        <div className="integracoes-id">
          <span className="integracoes-sigla">{info.sigla}</span>
          <div>
            <h2 className="integracoes-nome">{info.nome}</h2>
            <div className="integracoes-tipo">{info.tipo}</div>
          </div>
        </div>
        <span className="badge sm tone-gray">Offline</span>
      </div>
      <p className="integracoes-desc">{info.desc}</p>
      <div className="integracoes-foot">
        <span>Não configurado</span>
      </div>
    </article>
  )
}

function LogsModal({ integration, onClose }: { integration: Integration; onClose: () => void }) {
  const logs = useLastIntegrationLogs(integration.id)

  return (
    <Modal
      open
      titulo={`Últimos 10 registros · ${integration.name}`}
      onClose={onClose}
      footer={
        <button type="button" className="btn sm" onClick={onClose}>
          Fechar
        </button>
      }
    >
      {logs.isError ? (
        <MsgNok titulo="Não foi possível carregar os logs" mensagem={logs.error.message} />
      ) : (
        <IntegrationLogTable
          logs={logs.data}
          loading={logs.isFetching}
          empty="Nenhuma chamada registrada ainda."
        />
      )}
      <p className="integracoes-modal-note">
        O histórico completo, com filtros, fica em Admin › Logs › Integrações.
      </p>
    </Modal>
  )
}

function ConfigModal({ integration, onClose }: { integration: Integration; onClose: () => void }) {
  const [active, setActive] = useState(integration.active)
  const save = useSetIntegrationActive()

  function onSave() {
    if (active === integration.active) return onClose()
    save.mutate({ id: integration.id, active }, { onSuccess: onClose })
  }

  return (
    <Modal
      open
      titulo={`Configurar · ${integration.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn sm primary"
            disabled={save.isPending}
            onClick={onSave}
          >
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="integracoes-config">
        <label className="check">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Integração ativa
        </label>
        <p className="integracoes-modal-note">
          Desativada, o CRM recusa os envios desta integração (o coletor da loja dá erro de chave)
          até ser ativada de novo. Nada do que já chegou é apagado.
        </p>
        {save.isError && <MsgNok titulo="Não foi possível salvar" mensagem={save.error.message} />}
      </div>
    </Modal>
  )
}
