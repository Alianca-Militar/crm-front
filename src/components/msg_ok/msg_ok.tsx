import { IconClose, IconCheck } from '../menu/icons'
import './msg_ok.css'

type MsgOkProps = {
  /** Título em destaque. Padrão: "Tudo certo". */
  titulo?: string
  mensagem: string
  onClose?: () => void
}

export default function MsgOk({ titulo = 'Tudo certo', mensagem, onClose }: MsgOkProps) {
  return (
    <div className="msg-ok" role="status">
      <span className="msg-ok-icon">
        <IconCheck size={18} />
      </span>
      <div className="msg-ok-body">
        <div className="msg-ok-title">{titulo}</div>
        <div className="msg-ok-text">{mensagem}</div>
      </div>
      {onClose && (
        <button
          type="button"
          className="msg-ok-close"
          onClick={onClose}
          aria-label="Fechar mensagem"
        >
          <IconClose size={16} />
        </button>
      )}
    </div>
  )
}
