import { useState } from 'react'
import { fillHtml, formatMessage, isFullHtml } from './template_utils'
import type { EmailBodyFormat, EmailHeaderType } from './templates_api'

type Props = {
  sender: string
  subject: string
  preheader: string
  headerType: EmailHeaderType
  headerContent: string
  body: string
  bodyFormat: EmailBodyFormat
  buttonText: string
  buttonUrl: string
  footer: string
  examples: Record<string, string>
}

/** Prévia do e-mail: linha da caixa de entrada e o corpo (mesmo layout do envio). */
export default function EmailPreview(p: Props) {
  const isHtml = p.bodyFormat === 'html'
  const html = isHtml ? fillHtml(p.body, p.examples) : ''
  const full = isHtml && isFullHtml(html)
  const paragraphs = isHtml
    ? []
    : p.body
        .split(/\n\s*\n/)
        .map((x) => x.trim())
        .filter(Boolean)
  const hasImage = p.headerType === 'image' && /^https?:\/\//.test(p.headerContent)

  return (
    <div className="em-preview">
      <div className="em-inbox">
        <span className="em-avatar" aria-hidden="true">
          {p.sender.slice(0, 1).toUpperCase()}
        </span>
        <div className="em-inbox-text">
          <div className="em-sender">{p.sender}</div>
          <div className="em-subject">
            {p.subject ? (
              formatMessage(p.subject, p.examples)
            ) : (
              <span className="muted">Assunto</span>
            )}
          </div>
          {p.preheader && (
            <div className="em-preheader">{formatMessage(p.preheader, p.examples)}</div>
          )}
        </div>
      </div>

      <div className="em-canvas">
        {full ? (
          <HtmlFrame html={html} full />
        ) : (
          <div className="em-card">
            {hasImage && <img className="em-image" src={p.headerContent} alt="" />}
            {p.headerType === 'image' && !hasImage && (
              <div className="em-image em-image-empty">Imagem do topo</div>
            )}
            <div className="em-content">
              {p.headerType === 'text' && p.headerContent && (
                <h1 className="em-title">{formatMessage(p.headerContent, p.examples)}</h1>
              )}
              {isHtml && p.body.trim() && <HtmlFrame html={html} />}
              {!p.body.trim() && (
                <p className="muted">O texto do e-mail aparece aqui enquanto você escreve.</p>
              )}
              {paragraphs.map((text, i) => (
                <p key={i} className="em-paragraph">
                  {formatMessage(text, p.examples)}
                </p>
              ))}
              {p.buttonText && (
                <p className="em-button-row">
                  <span className="em-button" title={p.buttonUrl}>
                    {p.buttonText}
                  </span>
                </p>
              )}
              {p.footer && <p className="em-footer">{p.footer}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Estilo base do trecho de HTML (o mesmo do e-mail enviado).
const FRAGMENT_STYLE =
  'body{margin:0;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#2e2824}' +
  'img{max-width:100%;height:auto}'

/**
 * HTML do usuário isolado num iframe sem scripts: o CSS dele não vaza para o CRM e nada roda.
 * A altura acompanha o conteúdo.
 */
function HtmlFrame({ html, full = false }: { html: string; full?: boolean }) {
  const [height, setHeight] = useState(full ? 480 : 120)
  const doc = full
    ? html
    : `<!doctype html><html><head><meta charset="utf-8"><style>${FRAGMENT_STYLE}</style>` +
      `</head><body>${html}</body></html>`

  return (
    <iframe
      className={full ? 'em-frame full' : 'em-frame'}
      title="Prévia do HTML"
      sandbox="allow-same-origin"
      srcDoc={doc}
      style={{ height }}
      onLoad={(e) => {
        const body = e.currentTarget.contentDocument?.body
        if (body) setHeight(Math.max(full ? 200 : 40, body.scrollHeight + 8))
      }}
    />
  )
}
