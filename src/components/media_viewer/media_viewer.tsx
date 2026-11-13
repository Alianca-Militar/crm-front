import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconClose } from '../menu/icons'
import './media_viewer.css'

export type ViewerItem = {
  id: number
  /** Tipo da mensagem do WhatsApp: image, sticker, audio, voice, video, document. */
  type: string
  url: string
  mime: string | null
  filename: string | null
  caption: string | null
  /** Linha de baixo: quem mandou, quando, por qual número. */
  info: string
}

type MediaViewerProps = {
  items: ViewerItem[]
  /** Posição do anexo aberto em items; null = fechado. */
  index: number | null
  onIndex: (index: number) => void
  onClose: () => void
  /** Botões a mais no rodapé (ex.: "Ver na conversa" na ficha). */
  actions?: (item: ViewerItem) => ReactNode
}

const TITLE: Record<string, string> = {
  image: 'Foto',
  sticker: 'Figurinha',
  audio: 'Áudio',
  voice: 'Áudio',
  video: 'Vídeo',
  document: 'Documento',
}

/** Tipos que o navegador mostra direto; o resto (Word, Excel...) só baixa. */
function canPreview(item: ViewerItem): boolean {
  return item.type !== 'document' || (item.mime ?? '').split(';')[0].trim() === 'application/pdf'
}

function downloadUrl(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}download=1`
}

/** Visualizador de anexos (foto, vídeo, áudio, PDF) sem sair da tela. Setas navegam, Esc fecha. */
export default function MediaViewer({ items, index, onIndex, onClose, actions }: MediaViewerProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const item = index === null ? null : items[index]
  const open = item != null

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal?.()
    if (!open && dialog.open) dialog.close?.()
  }, [open])

  const hasPrev = index !== null && index > 0
  const hasNext = index !== null && index < items.length - 1

  function onKeyDown(e: KeyboardEvent) {
    if (index === null) return
    // Dentro do player (áudio/vídeo) as setas avançam o tempo.
    if ((e.target as HTMLElement).closest('audio, video')) return
    if (e.key === 'ArrowLeft' && hasPrev) onIndex(index - 1)
    if (e.key === 'ArrowRight' && hasNext) onIndex(index + 1)
  }

  return (
    <dialog
      ref={ref}
      className="viewer"
      aria-label={item ? (TITLE[item.type] ?? 'Arquivo') : 'Anexo'}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose() // clique fora do conteúdo
      }}
    >
      {item && index !== null && (
        <div className="viewer-box">
          <div className="viewer-head">
            <span className="viewer-title">
              {item.filename || TITLE[item.type] || 'Arquivo'}
              {items.length > 1 && (
                <span className="viewer-count">
                  {' '}
                  · {index + 1} de {items.length}
                </span>
              )}
            </span>
            <button type="button" className="viewer-close" onClick={onClose} aria-label="Fechar">
              <IconClose size={20} />
            </button>
          </div>

          <div className="viewer-stage">
            {hasPrev && (
              <button
                type="button"
                className="viewer-nav prev"
                onClick={() => onIndex(index - 1)}
                aria-label="Anterior"
              >
                <IconChevronLeft size={26} />
              </button>
            )}
            <Content key={item.id} item={item} />
            {hasNext && (
              <button
                type="button"
                className="viewer-nav next"
                onClick={() => onIndex(index + 1)}
                aria-label="Próximo"
              >
                <IconChevronRight size={26} />
              </button>
            )}
          </div>

          <div className="viewer-foot">
            <div className="viewer-info">
              {item.caption && <span className="viewer-caption">{item.caption}</span>}
              <span>{item.info}</span>
            </div>
            <div className="viewer-actions">
              {actions?.(item)}
              <a className="btn sm primary" href={downloadUrl(item.url)}>
                Baixar
              </a>
            </div>
          </div>
        </div>
      )}
    </dialog>
  )
}

function Content({ item }: { item: ViewerItem }) {
  const [zoom, setZoom] = useState(false)
  if (item.type === 'image' || item.type === 'sticker') {
    return (
      <div className={zoom ? 'viewer-media zoom' : 'viewer-media'}>
        <img
          src={item.url}
          alt={item.caption || TITLE[item.type]}
          onClick={() => setZoom((z) => !z)}
          title={zoom ? 'Clique para ajustar à tela' : 'Clique para ver no tamanho real'}
        />
      </div>
    )
  }
  if (item.type === 'video') {
    return (
      <div className="viewer-media">
        <video src={item.url} controls autoPlay />
      </div>
    )
  }
  if (item.type === 'audio' || item.type === 'voice') {
    return (
      <div className="viewer-media">
        <audio src={item.url} controls autoPlay />
      </div>
    )
  }
  if (canPreview(item)) {
    return <iframe className="viewer-pdf" src={item.url} title={item.filename || 'PDF'} />
  }
  return (
    <div className="viewer-media">
      <div className="viewer-file">
        <span className="viewer-file-icon" aria-hidden="true">
          📄
        </span>
        <strong>{item.filename || 'Documento'}</strong>
        <span className="muted">
          Este tipo de arquivo não abre no navegador. Use o botão Baixar.
        </span>
      </div>
    </div>
  )
}
