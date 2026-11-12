import { useState } from 'react'
import MsgNok from '../../../components/msg_nok/msg_nok'
import { formatDateTime } from '../../../lib/format'
import {
  type Attachment,
  type AttachmentKind,
  useCustomerAttachments,
} from '../clientes/clientes_api'

const KINDS: { key: AttachmentKind; label: string }[] = [
  { key: 'image', label: 'Fotos' },
  { key: 'audio', label: 'Áudios' },
  { key: 'video', label: 'Vídeos' },
  { key: 'document', label: 'Documentos' },
]

function Unavailable({ a }: { a: Attachment }) {
  return (
    <span className="ficha-anexo-off">
      {a.media_removed ? 'Arquivo apagado pelo prazo de retenção' : 'Arquivo ainda não disponível'}
    </span>
  )
}

/** Quem mandou, quando, por qual número e o link para a conversa. */
function Meta({ a, onShow }: { a: Attachment; onShow: (id: number) => void }) {
  return (
    <div className="ficha-anexo-meta">
      <span>
        {a.direction === 'in' ? 'Cliente' : 'Loja'} · {formatDateTime(a.at)} · {a.store_code}{' '}
        {a.number_label}
      </span>
      <button type="button" className="ficha-anexo-link" onClick={() => onShow(a.id)}>
        ver na conversa
      </button>
    </div>
  )
}

/** Aba Anexos da ficha: o que veio e foi pelas conversas, separado por tipo. */
export default function Anexos({
  customerId,
  onShow,
}: {
  customerId: number
  onShow: (messageId: number) => void
}) {
  const [kind, setKind] = useState<AttachmentKind>('image')
  const query = useCustomerAttachments(customerId, kind, true)
  const pages = query.data?.pages ?? []
  const counts = pages[0]?.counts
  const items = pages.flatMap((p) => p.items)

  return (
    <div className="ficha-anexos">
      <div className="ficha-anexos-kinds" role="tablist" aria-label="Tipo de anexo">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            role="tab"
            aria-selected={kind === k.key}
            className={kind === k.key ? 'ficha-anexos-kind on' : 'ficha-anexos-kind'}
            onClick={() => setKind(k.key)}
          >
            {k.label}
            {counts ? ` (${counts[k.key]})` : ''}
          </button>
        ))}
      </div>

      {query.isError && (
        <MsgNok titulo="Não foi possível carregar os anexos" mensagem={query.error.message} />
      )}
      {query.isPending && <p className="muted">Carregando…</p>}
      {query.isSuccess && items.length === 0 && (
        <p className="muted">Nenhum anexo deste tipo nas conversas das suas lojas.</p>
      )}

      {kind === 'image' ? (
        <div className="ficha-anexos-grid">
          {items.map((a) => (
            <figure key={a.id} className="ficha-anexo-foto">
              {a.media_url ? (
                <a href={a.media_url} target="_blank" rel="noreferrer">
                  <img src={a.media_url} alt={a.caption || 'Foto'} loading="lazy" />
                </a>
              ) : (
                <div className="ficha-anexo-vazio">
                  <Unavailable a={a} />
                </div>
              )}
              <figcaption>
                {a.caption && <span className="ficha-anexo-caption">{a.caption}</span>}
                <Meta a={a} onShow={onShow} />
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <ul className="ficha-anexos-list">
          {items.map((a) => (
            <li key={a.id}>
              {!a.media_url ? (
                <Unavailable a={a} />
              ) : kind === 'audio' ? (
                <audio controls preload="none" src={a.media_url} />
              ) : kind === 'video' ? (
                <video controls preload="metadata" src={a.media_url} />
              ) : (
                <a href={a.media_url} target="_blank" rel="noreferrer" className="ficha-anexo-doc">
                  📄 {a.media_filename || 'Documento'}
                </a>
              )}
              {a.caption && <span className="ficha-anexo-caption">{a.caption}</span>}
              <Meta a={a} onShow={onShow} />
            </li>
          ))}
        </ul>
      )}

      {query.hasNextPage && (
        <button
          type="button"
          className="btn sm ficha-anexos-more"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}
    </div>
  )
}
