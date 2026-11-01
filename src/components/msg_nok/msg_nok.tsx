import { IconClose, IconAlert } from '../menu/icons'
import './msg_nok.css'

type MsgNokProps = {
  /** Título em destaque. Padrão: "Algo deu errado". */
  titulo?: string
  mensagem: string
  onClose?: () => void
}

export default function MsgNok({ titulo = 'Algo deu errado', mensagem, onClose }: MsgNokProps) {
  return (
    <div className="msg-nok" role="alert">
      <span className="msg-nok-icon">
        <IconAlert size={18} />
      </span>
      <div className="msg-nok-body">
        <div className="msg-nok-title">{titulo}</div>
        <div className="msg-nok-text">{mensagem}</div>
      </div>
      {onClose && (
        <button
          type="button"
          className="msg-nok-close"
          onClick={onClose}
          aria-label="Fechar mensagem"
        >
          <IconClose size={16} />
        </button>
      )}
    </div>
  )
}
