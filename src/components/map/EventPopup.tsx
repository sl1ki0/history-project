import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { CATEGORY_META, type MapEvent } from '../../content/mapEvents'
import { excursions } from '../../content'

interface Props {
  /**
   * Стек событий для одной географической точки. Если 1 элемент —
   * сразу показываем детальную карточку. Если >1 — сначала список,
   * затем по клику на пункт раскрываем карточку.
   */
  events: MapEvent[]
  /** Пиксельные координаты маркера внутри контейнера карты */
  px: number
  py: number
  /** Размер контейнера в px — для авто-отзеркаливания при выходе за край */
  containerSize: { w: number; h: number }
  onClose: () => void
}

const POPUP_W = 360
const POPUP_H_EST = 300
const GAP = 14

export default function EventPopup({ events, px, py, containerSize, onClose }: Props) {
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(
    events.length === 1 ? events[0].id : null,
  )

  // Сбрасываем выбор при смене стека
  useEffect(() => {
    setSelectedId(events.length === 1 ? events[0].id : null)
  }, [events])

  // Авто-фокус на попап + закрытие по Escape
  useEffect(() => {
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedId && events.length > 1) {
          setSelectedId(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, selectedId, events.length])

  const selected = selectedId ? events.find((e) => e.id === selectedId) ?? null : null
  const meta = selected ? CATEGORY_META[selected.category] : CATEGORY_META[events[0].category]
  const cityName = events[0].location.split(' · ')[0]

  // Решаем, отзеркалить ли попап
  const placeRight = px + GAP + POPUP_W < containerSize.w
  const placeBelow = py + GAP + POPUP_H_EST < containerSize.h
  const left = placeRight ? px + GAP : Math.max(8, px - GAP - POPUP_W)
  const top = placeBelow ? py + GAP : Math.max(8, py - GAP - POPUP_H_EST)

  const excursion = selected ? excursions.find((e) => e.number === selected.excursionId) : null
  const sources =
    excursion && selected
      ? excursion.sources.filter((s) => selected.sourceRefs.includes(s.n))
      : []

  const goToStop = () => {
    if (!excursion || !selected) return
    if (selected.stopId) {
      navigate(`/excursion/${excursion.id}?stop=${selected.stopId}`)
    } else {
      navigate(`/excursion/${excursion.id}`)
    }
  }

  return (
    <motion.div
      data-map-popup
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-label={selected ? selected.title : `${cityName} — ${events.length} событий`}
      tabIndex={-1}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="absolute z-50 w-[360px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-parchment-50/15 bg-ink-900/95 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl focus:outline-none"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        borderLeft: `3px solid ${meta.color}`,
      }}
    >
      {/* Шапка */}
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="flex items-center gap-2">
          {selected && events.length > 1 && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="К списку событий города"
              className="grid h-6 w-6 place-items-center rounded-full border border-parchment-50/15 bg-parchment-50/5 text-parchment-100/70 transition hover:border-parchment-50/40 hover:text-parchment-50"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          {selected ? (
            <>
              <span
                className="grid h-5 w-5 place-items-center rounded-full"
                style={{ backgroundColor: meta.color }}
                aria-hidden
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
              </span>
              <span
                className="text-[10px] uppercase tracking-[0.25em]"
                style={{ color: meta.color }}
              >
                {meta.label}
              </span>
              <span className="text-parchment-100/30">·</span>
              <span className="num-mono text-[11px] text-parchment-100/70">{selected.year}</span>
            </>
          ) : (
            <>
              <span className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/85">
                {cityName}
              </span>
              <span className="text-parchment-100/30">·</span>
              <span className="num-mono text-[11px] text-parchment-100/70">
                {events.length} событий
              </span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть карточку"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-parchment-50/15 bg-parchment-50/5 text-parchment-100/70 transition hover:border-parchment-50/40 hover:text-parchment-50"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {selected ? (
        /* ─────────── Детальная карточка одного события ─────────── */
        <div className="px-5 pb-5 pt-3">
          <h3 className="heading-serif text-xl text-parchment-50">{selected.title}</h3>
          <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-accent-gold/80">
            {selected.location}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-parchment-100/80">{selected.summary}</p>

          {sources.length > 0 && (
            <div className="mt-4 border-t border-parchment-50/10 pt-3">
              <div className="text-[10px] uppercase tracking-[0.25em] text-parchment-100/45">
                Источники
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sources.map((s) => (
                  <a
                    key={s.n}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={s.title}
                    className="num-mono inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border border-accent-gold/30 bg-accent-gold/5 px-2 text-[11px] text-accent-gold transition hover:border-accent-gold hover:bg-accent-gold/15"
                  >
                    [{s.n}]
                  </a>
                ))}
              </div>
            </div>
          )}

          {excursion && (
            <button type="button" onClick={goToStop} className="btn-primary mt-4 w-full">
              <span>Перейти к остановке</span>
              <span aria-hidden>→</span>
            </button>
          )}
        </div>
      ) : (
        /* ─────────── Список событий города ─────────── */
        <div className="px-5 pb-4 pt-3">
          <p className="mt-1 text-xs text-parchment-100/55">
            Выберите событие, чтобы открыть карточку.
          </p>
          <ul className="mt-3 space-y-1.5">
            {events.map((ev) => {
              const m = CATEGORY_META[ev.category]
              return (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(ev.id)}
                    className="group flex w-full items-start gap-3 rounded-xl border border-parchment-50/8 bg-parchment-50/[0.02] px-3 py-2.5 text-left transition hover:border-accent-gold/35 hover:bg-accent-gold/8"
                    style={{ borderLeft: `2px solid ${m.color}` }}
                  >
                    <span
                      className="num-mono mt-0.5 shrink-0 text-[10px] uppercase tracking-[0.15em] text-parchment-100/55"
                      style={{ minWidth: '54px' }}
                    >
                      {ev.year.match(/\d{4}/)?.[0] ?? ev.year.slice(0, 10)}
                    </span>
                    <span className="flex-1 text-sm text-parchment-50">{ev.title}</span>
                    <svg
                      className="mt-0.5 shrink-0 text-parchment-100/40 transition group-hover:translate-x-0.5 group-hover:text-accent-gold"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </motion.div>
  )
}
