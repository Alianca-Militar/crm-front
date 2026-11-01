import { type ReactNode, useEffect, useRef } from 'react'
import { IconClose } from '../menu/icons'
import './modal.css'

type ModalProps = {
  open: boolean
  titulo: string
  onClose: () => void
  children: ReactNode
  /** Botões do rodapé (ex.: Cancelar / Salvar). */
  footer?: ReactNode
}

/** Janela sobre a tela (<dialog> nativo: Esc fecha e o foco fica dentro dela). */
export default function Modal({ open, titulo, onClose, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal?.()
    if (!open && dialog.open) dialog.close?.()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      {open && (
        <>
          <div className="modal-head">
            <h2 id="modal-title" className="modal-title">
              {titulo}
            </h2>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
              <IconClose size={18} />
            </button>
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </>
      )}
    </dialog>
  )
}
