import { useState } from 'react'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { formatPhone } from '../../../lib/format'
import { useAudience } from '../campanhas/campanhas_api'

/** Público congelado da campanha: incluídos e excluídos (com o motivo). */
export default function AudienceTable({
  campaignId,
  keys,
}: {
  campaignId: number
  keys: string[]
}) {
  const [included, setIncluded] = useState(true)
  const [page, setPage] = useState(1)
  const audience = useAudience(campaignId, included, page)
  const data = audience.data

  function show(value: boolean) {
    setIncluded(value)
    setPage(1)
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title sm">Público gerado</h2>
        <div role="tablist" aria-label="Contatos" className="seg-tabs sm">
          <button
            type="button"
            role="tab"
            className="seg-tab"
            aria-selected={included}
            onClick={() => show(true)}
          >
            Na lista
          </button>
          <button
            type="button"
            role="tab"
            className="seg-tab"
            aria-selected={!included}
            onClick={() => show(false)}
          >
            Fora da lista
          </button>
        </div>
      </div>

      {audience.isError && (
        <MsgNok titulo="Não foi possível carregar o público" mensagem={audience.error.message} />
      )}

      <div className="table-wrap">
        <table className="table compact nova-audience">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Telefone</th>
              {included ? (
                keys.map((k) => <th key={k} className="mono">{`{{${k}}}`}</th>)
              ) : (
                <th>Motivo</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data?.results.length === 0 && (
              <tr>
                <td colSpan={included ? keys.length + 2 : 3} className="muted">
                  {included ? 'Ninguém entrou na lista.' : 'Ninguém ficou de fora.'}
                </td>
              </tr>
            )}
            {data?.results.map((r) => (
              <tr key={r.phone}>
                <td>{r.name || <span className="muted">Sem nome</span>}</td>
                <td className="mono nowrap">{formatPhone(r.phone)}</td>
                {included ? (
                  keys.map((k) => (
                    <td key={k}>{r.values[k] || <span className="muted">—</span>}</td>
                  ))
                ) : (
                  <td>{r.reason_label}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="pager">
          <span>
            {data.count.toLocaleString('pt-BR')} contatos · página {data.page} de {data.pages}
          </span>
          <div className="pager-buttons">
            <button
              type="button"
              className="btn sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              type="button"
              className="btn sm"
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
