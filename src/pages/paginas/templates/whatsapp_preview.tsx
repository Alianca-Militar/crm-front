import type { ReactNode } from 'react'
import { formatMessage } from './template_utils'
import type { HeaderType, TemplateButton } from './templates_api'

type Props = {
  headerType: HeaderType | null
  headerText: string | null
  /** URL do arquivo de exemplo (já salvo ou escolhido agora) */
  mediaUrl: string | null
  mediaName: string | null
  body: string
  footer: string | null
  buttons: TemplateButton[]
  examples: Record<string, string>
  /** nome de exibição do número, no topo da conversa */
  sender?: string | null
  compact?: boolean
}

const ICON: Record<string, ReactNode> = {
  URL: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zm5 16H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7z"
      />
    </svg>
  ),
  PHONE_NUMBER: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"
      />
    </svg>
  ),
  COPY: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"
      />
    </svg>
  ),
  QUICK_REPLY: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="currentColor" d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
    </svg>
  ),
  LIST: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"
      />
    </svg>
  ),
}

function buttonIcon(type: string) {
  if (type === 'COPY_CODE' || type === 'OTP') return ICON.COPY
  return ICON[type] ?? null
}

function Header({
  type,
  text,
  mediaUrl,
  mediaName,
  examples,
}: {
  type: HeaderType | null
  text: string | null
  mediaUrl: string | null
  mediaName: string | null
  examples: Record<string, string>
}) {
  if (!type || type === 'none') return null
  if (type === 'text') {
    return text ? <div className="wa-header-text">{formatMessage(text, examples)}</div> : null
  }
  if (type === 'image') {
    return mediaUrl ? (
      <img className="wa-media" src={mediaUrl} alt="Imagem do cabeçalho" />
    ) : (
      <div className="wa-media wa-media-empty">Imagem</div>
    )
  }
  if (type === 'video') {
    return mediaUrl ? (
      <video className="wa-media" src={mediaUrl} muted />
    ) : (
      <div className="wa-media wa-media-empty">Vídeo</div>
    )
  }
  if (type === 'document') {
    return (
      <div className="wa-doc">
        <span className="wa-doc-icon">PDF</span>
        <span className="wa-doc-name">{mediaName || 'documento.pdf'}</span>
      </div>
    )
  }
  return <div className="wa-media wa-media-empty wa-location">Localização (enviada no disparo)</div>
}

/** Prévia da mensagem como aparece no WhatsApp do cliente. */
export default function WhatsappPreview(props: Props) {
  const { buttons, examples } = props
  // Com mais de 3 botões, o WhatsApp mostra 2 e um "Ver todas as opções".
  const visible = buttons.length > 3 ? buttons.slice(0, 2) : buttons
  const hasContent = props.body.trim() || (props.headerType && props.headerType !== 'none')

  return (
    <div className={props.compact ? 'wa-phone compact' : 'wa-phone'}>
      {!props.compact && (
        <div className="wa-top">
          <span className="wa-avatar" aria-hidden="true" />
          <span>{props.sender || 'Sua loja'}</span>
        </div>
      )}
      <div className="wa-chat">
        {hasContent ? (
          <div className="wa-bubble-wrap">
            <div className="wa-bubble">
              <Header
                type={props.headerType}
                text={props.headerText}
                mediaUrl={props.mediaUrl}
                mediaName={props.mediaName}
                examples={examples}
              />
              {props.body.trim() && (
                <div className="wa-body">{formatMessage(props.body, examples)}</div>
              )}
              <div className="wa-meta">
                {props.footer && <span className="wa-footer">{props.footer}</span>}
                <span className="wa-time">10:24</span>
              </div>
            </div>
            {visible.length > 0 && (
              <div className="wa-buttons">
                {visible.map((b, i) => (
                  <div key={i} className="wa-button">
                    {buttonIcon(b.type)}
                    <span>{b.text || BUTTON_PLACEHOLDER[b.type] || 'Botão'}</span>
                  </div>
                ))}
                {buttons.length > 3 && (
                  <div className="wa-button">
                    {ICON.LIST}
                    <span>Ver todas as opções</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="wa-empty">A prévia aparece aqui enquanto você escreve.</p>
        )}
      </div>
    </div>
  )
}

const BUTTON_PLACEHOLDER: Record<string, string> = {
  COPY_CODE: 'Copiar código',
  OTP: 'Copiar código',
}
