import { useRef, useState } from 'react'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { ApiError } from '../../../lib/api'
import {
  type ContactsSummary,
  useContacts,
  useDeleteContacts,
  useUploadContacts,
} from '../campanhas/campanhas_api'

// Marca de UTF-8: o Excel abre os acentos certos.
const BOM = String.fromCharCode(0xfeff)

/** Planilha modelo com as colunas que o template usa (gerada no navegador). */
function downloadModel(keys: string[]) {
  const extra = keys.filter((k) => k !== 'nome-cliente' && k !== 'numero-cliente')
  const header = ['telefone', 'nome', ...extra].join(';')
  const example = ['(32) 99999-0000', 'Maria Souza', ...extra.map(() => '')].join(';')
  const blob = new Blob([`${BOM}${header}\n${example}\n`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'modelo-contatos.csv'
  link.click()
  URL.revokeObjectURL(url)
}

/** Base externa: envia CSV/Excel com os contatos da campanha. */
export default function ContactsUpload({
  campaignId,
  templateKeys,
  disabled,
}: {
  campaignId: number
  templateKeys: string[]
  disabled?: boolean
}) {
  const contacts = useContacts(campaignId)
  const upload = useUploadContacts()
  const remove = useDeleteContacts()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<ContactsSummary | null>(null)

  async function send() {
    if (!file) return
    setError(null)
    try {
      const result = await upload.mutateAsync({ id: campaignId, file })
      setReport(result)
      setFile(null)
      setConsent(false)
      if (input.current) input.current.value = ''
      await contacts.refetch()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? [err.message, ...Object.values(err.fieldErrors).flat()]
              .filter((m) => m !== 'Confira os campos destacados.')
              .join(' ')
          : 'Não foi possível enviar o arquivo.',
      )
    }
  }

  async function clear() {
    setError(null)
    setReport(null)
    await remove.mutateAsync(campaignId)
    await contacts.refetch()
  }

  const summary = contacts.data
  const extraColumns = summary?.columns ?? []

  return (
    <div className="nova-upload">
      <p className="muted nova-help">
        Envie um arquivo <strong>.csv</strong> ou <strong>.xlsx</strong> com uma linha por contato.
        Obrigatória: a coluna <strong>telefone</strong> (ou celular). Opcionais:{' '}
        <strong>nome</strong> e colunas com o nome das variáveis do template (ex.:{' '}
        <span className="mono">cupom</span>, <span className="mono">corporacao</span>), que valem
        por contato. Quem já é cliente é completado pelo cadastro.
      </p>
      <button type="button" className="btn xs" onClick={() => downloadModel(templateKeys)}>
        Baixar planilha modelo
      </button>

      {!disabled && (
        <div className="nova-upload-box">
          <input
            ref={input}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-label="Arquivo de contatos"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Confirmo que esses contatos autorizaram receber mensagens da loja (LGPD).
          </label>
          <div>
            <button
              type="button"
              className="btn sm primary"
              disabled={!file || !consent || upload.isPending}
              onClick={send}
            >
              {upload.isPending ? 'Enviando…' : summary?.count ? 'Trocar a base' : 'Enviar arquivo'}
            </button>
          </div>
        </div>
      )}

      {error && <MsgNok titulo="Arquivo não aceito" mensagem={error} />}

      {report && (
        <div className="tpl-notice">
          Arquivo lido: {report.count.toLocaleString('pt-BR')} contatos
          {!!report.duplicates && ` · ${report.duplicates} telefones repetidos ignorados`}
          {!!report.empty_rows && ` · ${report.empty_rows} linhas vazias`}
          {!!report.ignored_columns?.length &&
            ` · colunas ignoradas: ${report.ignored_columns.join(', ')}`}
          .
        </div>
      )}

      {summary && summary.count > 0 && (
        <div className="nova-upload-summary">
          <div className="nova-upload-head">
            <strong>{summary.count.toLocaleString('pt-BR')} contatos na base</strong>
            {summary.invalid_phones > 0 && (
              <span className="muted"> · {summary.invalid_phones} com telefone inválido</span>
            )}
            {!disabled && (
              <button type="button" className="btn xs" disabled={remove.isPending} onClick={clear}>
                Remover base
              </button>
            )}
          </div>
          <div className="table-wrap">
            <table className="table compact">
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Telefone</th>
                  <th>Nome</th>
                  {extraColumns.map((c) => (
                    <th key={c} className="mono">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.sample.map((row) => (
                  <tr key={row.row}>
                    <td className="muted">{row.row}</td>
                    <td className="mono nowrap">{row.phone}</td>
                    <td>{row.name || <span className="muted">—</span>}</td>
                    {extraColumns.map((c) => (
                      <td key={c}>{row[c] ?? <span className="muted">—</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {summary.count > summary.sample.length && (
            <span className="muted nova-help">Mostrando as primeiras {summary.sample.length}.</span>
          )}
        </div>
      )}
    </div>
  )
}
