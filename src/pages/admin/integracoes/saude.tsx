import MsgNok from '../../../components/msg_nok/msg_nok'
import { formatDateTime, formatLastAccess } from '../../../lib/format'
import { FIELD_LABEL, JOB_LABEL, useHealth, useHealthAction } from './saude_api'

type Tone = 'ok' | 'warn' | 'bad'

const TONE_LABEL: Record<Tone, string> = { ok: 'OK', warn: 'Atenção', bad: 'Problema' }
const TONE_BADGE: Record<Tone, string> = { ok: 'tone-green', warn: 'tone-orange', bad: 'tone-red' }

function Status({ tone }: { tone: Tone }) {
  return <span className={`badge sm ${TONE_BADGE[tone]}`}>{TONE_LABEL[tone]}</span>
}

/** Saúde do CRM: worker, fila, webhooks por número, erros e cargas de vendas (só o Admin). */
export default function Saude() {
  const health = useHealth()
  const reprocess = useHealthAction('reprocess')
  const retry = useHealthAction('retry')
  const h = health.data

  if (health.isError) {
    return <MsgNok titulo="Não foi possível carregar a saúde" mensagem={health.error.message} />
  }
  if (!h) return <p className="muted">Carregando…</p>

  const now = new Date(h.now).getTime()
  const minutesSince = (iso: string | null) =>
    iso ? (now - new Date(iso).getTime()) / 60_000 : Infinity
  const limits = h.limits_minutes

  const workerTone: Tone = h.worker.state === 'stopped' ? 'bad' : 'ok'
  const queueTone: Tone =
    minutesSince(h.queue.oldest_pending_at) > limits.queue_waiting
      ? 'bad'
      : h.queue.pending > 0
        ? 'warn'
        : 'ok'
  const silentNumbers = h.numbers.filter(
    (n) => minutesSince(n.last_webhook_at) > limits.number_silent,
  )
  const lateImports = h.imports.filter((i) => minutesSince(i.last_at) > limits.import_late)
  const busy = reprocess.isPending || retry.isPending

  const cards: { title: string; tone: Tone; value: string; sub: string }[] = [
    {
      title: 'Worker',
      tone: workerTone,
      value:
        h.worker.state === 'running'
          ? 'Rodando'
          : h.worker.state === 'busy'
            ? 'Rodando um job'
            : 'Parado',
      sub: h.worker.last_seen_at
        ? `Último sinal de vida ${formatLastAccess(h.worker.last_seen_at)}`
        : 'Nunca deu sinal de vida',
    },
    {
      title: 'Fila de jobs',
      tone: queueTone,
      value: `${h.queue.pending} esperando`,
      sub: h.queue.oldest_pending_at
        ? `O mais antigo espera desde ${formatLastAccess(h.queue.oldest_pending_at)}`
        : `${h.queue.done_24h} concluídos nas últimas 24 h` +
          (h.queue.scheduled ? ` · ${h.queue.scheduled} aguardando nova tentativa` : ''),
    },
    {
      title: 'Webhooks da Meta',
      tone: h.failed_webhooks.total ? 'bad' : silentNumbers.length ? 'warn' : 'ok',
      value: h.failed_webhooks.total ? `${h.failed_webhooks.total} com erro` : 'Recebendo',
      sub: silentNumbers.length
        ? `${silentNumbers.map((n) => n.label).join(', ')} sem eventos há mais de ${limits.number_silent / 60} h`
        : 'Todos os números com eventos recentes',
    },
    {
      title: 'Vendas (Pegasus)',
      tone: lateImports.length ? 'warn' : 'ok',
      value: lateImports.length
        ? `${lateImports.map((i) => i.store).join(', ')} atrasada`
        : 'Em dia',
      sub: h.imports
        .map((i) => `${i.store} ${i.last_at ? formatLastAccess(i.last_at) : 'nunca'}`)
        .join(' · '),
    },
  ]

  return (
    <section className="saude">
      <div className="saude-head">
        <div>
          <h2 className="saude-title">Saúde do sistema</h2>
          <p className="muted saude-sub">
            Confira antes de disparar uma campanha. Atualiza sozinho a cada minuto.
          </p>
        </div>
        <button
          type="button"
          className="btn sm"
          disabled={health.isFetching}
          onClick={() => void health.refetch()}
        >
          {health.isFetching ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      {(reprocess.isError || retry.isError) && (
        <MsgNok
          titulo="Não foi possível"
          mensagem={(reprocess.error ?? retry.error)?.message ?? ''}
        />
      )}

      <div className="saude-cards">
        {cards.map((c) => (
          <div key={c.title} className={`saude-card ${c.tone}`}>
            <div className="saude-card-top">
              <span className="saude-card-title">{c.title}</span>
              <Status tone={c.tone} />
            </div>
            <div className="saude-card-value">{c.value}</div>
            <div className="saude-card-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      {workerTone === 'bad' && (
        <div className="saude-alert">
          <strong>O worker parou.</strong> A fila não anda ({h.queue.pending} jobs esperando). Na
          VM: <code>sudo systemctl restart crm-worker</code> e veja o log com{' '}
          <code>sudo journalctl -u crm-worker -n 50</code>.
        </div>
      )}

      <div className="saude-grid">
        <div className="saude-block">
          <h3 className="saude-block-title">Último evento da Meta por número</h3>
          <div className="table-wrap">
            <table className="table compact">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Último evento</th>
                  <th className="num">Eventos 24 h</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {h.numbers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Nenhum número ativo ligado à Meta.
                    </td>
                  </tr>
                )}
                {h.numbers.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <strong>{n.label}</strong> <span className="muted">· {n.store}</span>
                    </td>
                    <td className="nowrap">
                      {n.last_webhook_at ? formatLastAccess(n.last_webhook_at) : 'nunca'}
                    </td>
                    <td className="num">{n.events_24h.toLocaleString('pt-BR')}</td>
                    <td>
                      <Status
                        tone={
                          minutesSince(n.last_webhook_at) > limits.number_silent ? 'warn' : 'ok'
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="saude-block">
          <h3 className="saude-block-title">Última carga de vendas</h3>
          <div className="table-wrap">
            <table className="table compact">
              <thead>
                <tr>
                  <th>Loja</th>
                  <th>Chegou</th>
                  <th className="num">Linhas</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {h.imports.map((i) => (
                  <tr key={i.store}>
                    <td>
                      <strong>{i.store}</strong>
                    </td>
                    <td className="nowrap">{i.last_at ? formatDateTime(i.last_at) : 'nunca'}</td>
                    <td className="num">{i.rows.toLocaleString('pt-BR')}</td>
                    <td>
                      <Status tone={minutesSince(i.last_at) > limits.import_late ? 'warn' : 'ok'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="saude-block">
        <h3 className="saude-block-title">Webhooks com erro ({h.failed_webhooks.total})</h3>
        {h.failed_webhooks.total === 0 ? (
          <p className="muted saude-empty">Nenhum evento da Meta com erro.</p>
        ) : (
          <div className="table-wrap">
            <table className="table compact">
              <thead>
                <tr>
                  <th>Chegou</th>
                  <th>Tipo</th>
                  <th>Número</th>
                  <th>Erro</th>
                  <th className="num">Tentativas</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {h.failed_webhooks.items.map((w) => (
                  <tr key={w.id}>
                    <td className="nowrap">{formatDateTime(w.received_at)}</td>
                    <td>{FIELD_LABEL[w.field] ?? w.field}</td>
                    <td>{w.number_label ?? '—'}</td>
                    <td className="mono">{w.error ?? '—'}</td>
                    <td className="num">{w.attempts}</td>
                    <td className="nowrap">
                      <button
                        type="button"
                        className="btn xs"
                        disabled={busy}
                        title="Volta para a fila: o timer dos webhooks processa de novo em até 1 minuto"
                        onClick={() => reprocess.mutate(w.id)}
                      >
                        Reprocessar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="saude-block">
        <h3 className="saude-block-title">Jobs com falha ({h.failed_jobs.total})</h3>
        {h.failed_jobs.total === 0 ? (
          <p className="muted saude-empty">Nenhum job falhou.</p>
        ) : (
          <div className="table-wrap">
            <table className="table compact">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Falhou</th>
                  <th>Erro</th>
                  <th className="num">Tentativas</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {h.failed_jobs.items.map((j) => (
                  <tr key={j.id}>
                    <td>{JOB_LABEL[j.job_type] ?? j.job_type}</td>
                    <td className="nowrap">{formatDateTime(j.finished_at)}</td>
                    <td className="saude-error">{j.last_error ?? '—'}</td>
                    <td className="num">
                      {j.attempts}/{j.max_attempts}
                    </td>
                    <td className="nowrap">
                      <button
                        type="button"
                        className="btn xs"
                        disabled={busy}
                        onClick={() => retry.mutate(j.id)}
                      >
                        Tentar de novo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
