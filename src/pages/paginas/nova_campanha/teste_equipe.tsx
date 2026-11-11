import { useState } from 'react'
import { formatDateTime } from '../../../lib/format'
import {
  type Campaign,
  TEST_CHECKLIST,
  type TestChecklist,
  useConfirmTest,
  useExportTest,
} from '../campanhas/campanhas_api'

const NONE: TestChecklist = { text: false, link: false, buttons: false }

type Props = {
  campaign: Campaign
  canWrite: boolean
  disabled: boolean
  onSaved: (message: string) => void
  onError: (err: unknown, fallback: string) => void
}

/** Envio de teste para a equipe: exportar, disparar na FastZap e conferir o checklist. */
export default function TesteEquipe({ campaign, canWrite, disabled, onSaved, onError }: Props) {
  const exportTest = useExportTest()
  const confirmTest = useConfirmTest()
  const [checks, setChecks] = useState<TestChecklist>(NONE)
  const allChecked = TEST_CHECKLIST.every((c) => checks[c.key])
  const busy = disabled || exportTest.isPending || confirmTest.isPending

  async function onExportTest() {
    try {
      await exportTest.mutateAsync(campaign.id)
      setChecks(NONE)
      onSaved('Teste exportado. Dispare o arquivo na FastZap e confira nos celulares da equipe.')
    } catch (err) {
      onError(err, 'Não foi possível exportar o teste.')
    }
  }

  async function onConfirm() {
    try {
      await confirmTest.mutateAsync({ id: campaign.id, checklist: checks })
      onSaved('Teste conferido. A exportação para a FastZap está liberada.')
    } catch (err) {
      onError(err, 'Não foi possível registrar o teste.')
    }
  }

  if (campaign.test_checked_at) {
    return (
      <div className="nova-test done">
        <span className="badge sm tone-green">Teste conferido</span>
        <span>
          por {campaign.test_checked_by_name ?? '—'} em {formatDateTime(campaign.test_checked_at)}:
          texto, link com UTM e botões.
        </span>
        {canWrite && (
          <button type="button" className="btn sm" disabled={busy} onClick={onExportTest}>
            Fazer outro teste
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="nova-test">
      <h3 className="nova-test-title">Teste com a equipe (obrigatório)</h3>
      <ol className="nova-test-steps">
        <li>
          Exporte o teste: vai só para os telefones da equipe (Admin › Configurações), com a
          mensagem montada com dados de clientes da lista.
        </li>
        <li>Importe o arquivo na FastZap e dispare.</li>
        <li>Confira a mensagem no celular e marque o checklist.</li>
      </ol>
      {canWrite && (
        <button type="button" className="btn" disabled={busy} onClick={onExportTest}>
          {exportTest.isPending
            ? 'Exportando…'
            : campaign.test_exported_at
              ? 'Exportar o teste de novo'
              : 'Exportar teste'}
        </button>
      )}
      {campaign.test_exported_at && (
        <>
          <p className="muted nova-test-when">
            Teste exportado em {formatDateTime(campaign.test_exported_at)}.
          </p>
          <fieldset className="nova-test-checks" disabled={!canWrite || busy}>
            {TEST_CHECKLIST.map((c) => (
              <label key={c.key} className="check">
                <input
                  type="checkbox"
                  checked={checks[c.key]}
                  onChange={(e) => setChecks({ ...checks, [c.key]: e.target.checked })}
                />
                <span>
                  <strong>{c.label}</strong> <span className="muted">· {c.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {canWrite && (
            <button
              type="button"
              className="btn primary"
              disabled={busy || !allChecked}
              title={allChecked ? undefined : 'Marque os três itens do checklist.'}
              onClick={onConfirm}
            >
              {confirmTest.isPending ? 'Registrando…' : 'Teste conferido'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
