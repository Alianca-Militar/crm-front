import { useState } from 'react'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { FIELD_LABEL, type ReprocessResult, useReprocessPeriod } from './saude_api'

/** Grupos da tela → tipos de evento (campo do webhook) que o backend reprocessa. */
const GROUPS: { value: string; label: string; types: string[] }[] = [
  { value: 'all', label: 'Todos', types: [] },
  { value: 'messages', label: 'Mensagens e status', types: ['messages', 'smb_message_echoes'] },
  { value: 'prefs', label: 'Preferências de marketing (opt-out)', types: ['user_preferences'] },
  {
    value: 'numbers',
    label: 'Números (qualidade, limite, nome)',
    types: [
      'phone_number_quality_update',
      'business_capability_update',
      'phone_number_name_update',
    ],
  },
  {
    value: 'templates',
    label: 'Templates (status, qualidade, categoria)',
    types: [
      'message_template_status_update',
      'message_template_quality_update',
      'template_category_update',
    ],
  },
]

const MAX_DAYS = 31

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function days(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1
}

function Breakdown({ result }: { result: ReprocessResult }) {
  const parts = Object.entries(result.by_field).map(
    ([field, n]) => `${FIELD_LABEL[field] ?? field}: ${n.toLocaleString('pt-BR')}`,
  )
  return parts.length ? <span className="muted"> ({parts.join(' · ')})</span> : null
}

/** Admin › Integrações › Saúde: roda de novo os eventos da Meta de um período, sem duplicar. */
export default function Reprocessar() {
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(today)
  const [group, setGroup] = useState('all')
  const [count, setCount] = useState<ReprocessResult | null>(null)
  const [queued, setQueued] = useState<ReprocessResult | null>(null)
  const [confirm, setConfirm] = useState(false)
  const action = useReprocessPeriod()

  const span = start && end ? days(start, end) : 0
  const invalid =
    !start || !end
      ? 'Escolha as datas.'
      : span < 1
        ? 'O fim não pode ser antes do início.'
        : span > MAX_DAYS
          ? `No máximo ${MAX_DAYS} dias por vez.`
          : null
  const input = {
    start,
    end,
    types: GROUPS.find((g) => g.value === group)?.types ?? [],
  }

  function change(update: () => void) {
    update()
    setCount(null)
    setQueued(null)
    action.reset()
  }

  return (
    <div className="saude-block">
      <h3 className="saude-block-title">Reprocessar eventos da Meta</h3>
      <p className="muted saude-empty">
        Depois de corrigir um erro ou mudar uma regra (ex.: palavra de descadastro), roda de novo os
        eventos já recebidos. Pode repetir: não duplica mensagens, status, bloqueios nem históricos,
        e um evento antigo não desfaz um estado mais novo.
      </p>

      <div className="saude-reprocess">
        <div className="field">
          <label htmlFor="rp-de">De</label>
          <input
            id="rp-de"
            type="date"
            value={start}
            max={end || undefined}
            onChange={(e) => change(() => setStart(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="rp-ate">Até</label>
          <input
            id="rp-ate"
            type="date"
            value={end}
            min={start || undefined}
            onChange={(e) => change(() => setEnd(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="rp-tipo">Eventos</label>
          <select
            id="rp-tipo"
            value={group}
            onChange={(e) => change(() => setGroup(e.target.value))}
          >
            {GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn sm"
          disabled={invalid !== null || action.isPending}
          onClick={() =>
            action.mutate({ ...input, simulate: true }, { onSuccess: (data) => setCount(data) })
          }
        >
          Contar eventos
        </button>
        <button
          type="button"
          className="btn sm primary"
          disabled={!count?.total || action.isPending || queued !== null}
          onClick={() => setConfirm(true)}
        >
          Reprocessar
        </button>
      </div>

      {invalid && start && end && <p className="saude-error">{invalid}</p>}
      {count && !queued && (
        <p className="saude-empty">
          <strong>{count.total.toLocaleString('pt-BR')} evento(s)</strong> no período
          <Breakdown result={count} />.
        </p>
      )}
      {queued && (
        <p className="saude-empty">
          Na fila (job #{queued.job}): o worker reprocessa {queued.total.toLocaleString('pt-BR')}{' '}
          evento(s) em instantes. Se der erro, aparece em Jobs com falha.
        </p>
      )}
      {action.isError && (
        <MsgNok titulo="Não foi possível reprocessar" mensagem={action.error.message} />
      )}

      <Modal
        open={confirm}
        titulo="Reprocessar eventos"
        onClose={() => setConfirm(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setConfirm(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={action.isPending}
              onClick={() =>
                action.mutate(
                  { ...input, simulate: false },
                  {
                    onSuccess: (data) => setQueued(data),
                    onSettled: () => setConfirm(false),
                  },
                )
              }
            >
              Reprocessar
            </button>
          </>
        }
      >
        <p>
          Vai rodar de novo <strong>{count?.total.toLocaleString('pt-BR')} evento(s)</strong> da
          Meta recebidos entre {start.split('-').reverse().join('/')} e{' '}
          {end.split('-').reverse().join('/')}. Nada é enviado aos clientes e nada é duplicado.
        </p>
      </Modal>
    </div>
  )
}
