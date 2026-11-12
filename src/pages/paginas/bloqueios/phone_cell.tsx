import { useState } from 'react'
import { formatPhone } from '../../../lib/format'
import { isMasked, revealPhone } from './bloqueios_api'

/** Telefone da lista: mascarado com o botão "ver" (só o Admin recebe completo). */
export function PhoneCell({ phone, optoutId }: { phone: string; optoutId: number }) {
  const [full, setFull] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isMasked(phone) || full) return <>{formatPhone(full ?? phone)}</>
  return (
    <span className="bloqueios-masked">
      {phone}
      <button
        type="button"
        className="bloqueios-link"
        disabled={loading}
        title="Mostra o telefone completo (fica registrado no log)"
        onClick={() => {
          setLoading(true)
          revealPhone(optoutId)
            .then(setFull)
            .catch(() => undefined)
            .finally(() => setLoading(false))
        }}
      >
        {loading ? '…' : 'ver'}
      </button>
    </span>
  )
}
