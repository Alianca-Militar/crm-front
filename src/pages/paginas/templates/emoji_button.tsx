import { lazy, Suspense, useEffect, useRef, useState } from 'react'

// Carregado só quando a pessoa abre o seletor (a lista de emojis é grande).
const Picker = lazy(() => import('emoji-picker-react'))
const loadPortuguese = () => import('emoji-picker-react/data/emojis-pt')

const LABELS = {
  searchPlaceholder: 'Pesquisar emoji',
  searchLabel: 'Pesquisar emoji',
  searchClear: 'Limpar',
  searchResultsNone: 'Nenhum emoji encontrado',
  searchResultsOne: '1 emoji',
  searchResultsMany: '%n emojis',
  categoryNavigation: 'Categorias',
  loading: 'Carregando…',
  loadingError: 'Não foi possível carregar os emojis.',
  retryLoading: 'Tentar de novo',
  skinToneNeutral: 'Tom padrão',
  skinToneLight: 'Tom claro',
  skinToneMediumLight: 'Tom médio-claro',
  skinToneMedium: 'Tom médio',
  skinToneMediumDark: 'Tom médio-escuro',
  skinToneDark: 'Tom escuro',
}

/** Botão 😊 que abre o seletor de emojis (como no WhatsApp). */
export default function EmojiButton({
  onPick,
  disabled,
}: {
  onPick: (emoji: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="tpl-emoji" ref={box}>
      <button
        type="button"
        className="tpl-tool"
        title="Emoji"
        aria-label="Inserir emoji"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">😊</span>
      </button>
      {open && (
        <div className="tpl-emoji-pop">
          <Suspense fallback={<div className="tpl-emoji-loading muted">Carregando…</div>}>
            <Picker
              emojiData={loadPortuguese}
              emojiStyle="native"
              colorScheme="light"
              className="tpl-emoji-picker"
              labels={LABELS}
              previewConfig={{ showPreview: false }}
              autoFocusSearch
              width={340}
              height={400}
              onEmojiClick={(data) => onPick(data.emoji)}
            />
          </Suspense>
        </div>
      )}
    </div>
  )
}
