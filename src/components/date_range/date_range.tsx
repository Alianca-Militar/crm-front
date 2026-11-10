import { useEffect, useRef, useState } from 'react'
import { IconCalendar } from '../menu/icons'
import {
  type DateRange,
  isoDay,
  PRESET_LABEL,
  PRESETS,
  presetRange,
  rangeText,
} from './date_range_utils'
import './date_range.css'

/** Filtro de período: últimos 7/30 dias, mês atual ou datas escolhidas. */
export default function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange
  onChange: (range: DateRange) => void
}) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState(value.preset === 'custom')
  const [start, setStart] = useState(value.start)
  const [end, setEnd] = useState(value.end)
  const rootRef = useRef<HTMLDivElement>(null)
  const today = isoDay(new Date())

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function toggle() {
    if (!open) {
      // Reabre mostrando o período que está valendo.
      setCustom(value.preset === 'custom')
      setStart(value.start)
      setEnd(value.end)
    }
    setOpen((v) => !v)
  }

  const valid = Boolean(start && end && start <= end)

  return (
    <div className="date-range" ref={rootRef}>
      <button
        type="button"
        className={open ? 'date-range-trigger open' : 'date-range-trigger'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}
      >
        <IconCalendar size={18} />
        <span className="date-range-label">{PRESET_LABEL[value.preset]}</span>
        <span className="date-range-dates">{rangeText(value)}</span>
      </button>

      {open && (
        <div className="date-range-panel" role="dialog" aria-label="Escolher período">
          <div className="date-range-presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={!custom && value.preset === p.id}
                className={
                  !custom && value.preset === p.id ? 'date-range-preset on' : 'date-range-preset'
                }
                onClick={() => {
                  onChange(presetRange(p.id))
                  setOpen(false)
                }}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={custom}
              className={custom ? 'date-range-preset on' : 'date-range-preset'}
              onClick={() => setCustom(true)}
            >
              Personalizado
            </button>
          </div>

          {custom && (
            <form
              className="date-range-custom"
              onSubmit={(event) => {
                event.preventDefault()
                if (!valid) return
                onChange({ preset: 'custom', start, end })
                setOpen(false)
              }}
            >
              <div className="field">
                <label htmlFor="date-range-start">Data inicial</label>
                <input
                  id="date-range-start"
                  type="date"
                  value={start}
                  max={end || today}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="date-range-end">Data final</label>
                <input
                  id="date-range-end"
                  type="date"
                  value={end}
                  min={start || undefined}
                  max={today}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
              {start && end && start > end && (
                <p className="date-range-error">A data inicial precisa ser antes da final.</p>
              )}
              <button type="submit" className="btn primary sm" disabled={!valid}>
                Aplicar
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
