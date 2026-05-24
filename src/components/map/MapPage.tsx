import { useEffect, useMemo, useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import PageTransition from '../PageTransition'
import AnimatedHeading from '../AnimatedHeading'
import RussiaMap from './RussiaMap'
import MapMarker from './MapMarker'
import MarkerCluster from './MarkerCluster'
import EventPopup from './EventPopup'
import FilterBar from './FilterBar'
import TimelineSlider from './TimelineSlider'
import { useMapInteraction } from './useMapInteraction'
import { useMapFilters } from './useMapFilters'
import { mapEvents, type MapEvent } from '../../content/mapEvents'
import { useProgress } from '../../store/progress'

/** Если две географические точки оказываются ближе этого расстояния в px — объединяем в кластер */
const CLUSTER_DISTANCE = 24

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      />
      <span>{label}</span>
    </div>
  )
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Ключ-«стека» — первая часть location до точки разделения */
function locationKey(e: MapEvent): string {
  return e.location.split(' · ')[0]
}

export default function MapPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const reducedMotion = useReducedMotion()

  const filters = useMapFilters({
    excursions: params.get('excursion')
      ? new Set([Number(params.get('excursion')) as 1 | 2 | 3])
      : undefined,
    yearRange: params.get('year')
      ? [Number(params.get('year')), Number(params.get('year'))]
      : undefined,
  })

  const visitedStops = useProgress((s) => s.visitedStops)
  const map = useMapInteraction()
  /** Активный стек (по ключу местоположения) */
  const [activeStackKey, setActiveStackKey] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isFullscreen, setFullscreen] = useState(false)

  /* ── Если в URL есть `focus`, центрируем карту и открываем попап ── */
  useEffect(() => {
    const focusId = params.get('focus')
    if (!focusId) return
    const target = mapEvents.find((e) => e.id === focusId)
    if (!target) return
    setActiveStackKey(locationKey(target))
    const id = window.setTimeout(() => map.focusOn(target.x, target.y, 2.6), 250)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, map.size.w])

  /* ── ESC выходит из полноэкранного режима ── */
  useEffect(() => {
    if (!isFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    // Блокируем скролл страницы пока карта во весь экран
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isFullscreen])

  /* ── Стеки: группируем отфильтрованные события по location key ── */
  const stacks = useMemo(() => {
    type Stack = { key: string; events: MapEvent[]; x: number; y: number }
    const byKey = new Map<string, Stack>()
    for (const ev of filters.filtered) {
      const k = locationKey(ev)
      const existing = byKey.get(k)
      if (existing) {
        existing.events.push(ev)
        // среднее (всё равно микро-смещение в исходных данных небольшое)
        const n = existing.events.length
        existing.x = (existing.x * (n - 1) + ev.x) / n
        existing.y = (existing.y * (n - 1) + ev.y) / n
      } else {
        byKey.set(k, { key: k, events: [ev], x: ev.x, y: ev.y })
      }
    }
    // Стабильная сортировка по числу событий — более «жирные» стеки сверху по z-index
    return Array.from(byKey.values()).sort((a, b) => a.events.length - b.events.length)
  }, [filters.filtered])

  /* ── Если активный стек отфильтрован — закрываем попап ── */
  useEffect(() => {
    if (activeStackKey && !stacks.some((s) => s.key === activeStackKey)) {
      setActiveStackKey(null)
    }
  }, [stacks, activeStackKey])

  const activeStack = useMemo(
    () => stacks.find((s) => s.key === activeStackKey) ?? null,
    [stacks, activeStackKey],
  )

  /* ── Проецируем стеки в пиксели, потом пиксельная кластеризация для далёких городов ── */
  const layout = useMemo(() => {
    type Projected = { stack: (typeof stacks)[number]; px: number; py: number }
    const projected: Projected[] = stacks.map((s) => {
      const p = map.project(s.x, s.y)
      return { stack: s, px: p.x, py: p.y }
    })

    type Bucket = { stacks: (typeof stacks)[number][]; px: number; py: number }
    const buckets: Bucket[] = []
    for (const pt of projected) {
      const near = buckets.find((b) => {
        const dx = b.px - pt.px
        const dy = b.py - pt.py
        return Math.sqrt(dx * dx + dy * dy) < CLUSTER_DISTANCE
      })
      if (near) {
        const n = near.stacks.length
        near.stacks.push(pt.stack)
        near.px = (near.px * n + pt.px) / (n + 1)
        near.py = (near.py * n + pt.py) / (n + 1)
      } else {
        buckets.push({ stacks: [pt.stack], px: pt.px, py: pt.py })
      }
    }

    const singles = buckets.filter((b) => b.stacks.length === 1)
    const grouped = buckets.filter((b) => b.stacks.length > 1)
    return { singles, grouped }
  }, [stacks, map])

  const popupPos = useMemo(() => {
    if (!activeStack) return null
    return map.project(activeStack.x, activeStack.y)
  }, [activeStack, map])

  /* ── Подсветить ли событие как «активный зал»? ── */
  const highlightExcursion = filters.state.excursions.size === 1
    ? Array.from(filters.state.excursions)[0]
    : null

  const handleMarkerSelect = useCallback((stackKey: string) => {
    setActiveStackKey(stackKey)
  }, [])

  return (
    <PageTransition className="relative">
      <div className="container-prose pt-8 md:pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <AnimatedHeading
              eyebrow="карта событий"
              text="География эпохи перемен"
              className="text-3xl text-parchment-50 sm:text-4xl md:text-5xl"
            />
            <p className="mt-3 max-w-xl text-sm text-parchment-100/70 sm:text-base">
              События 1991–2022 годов, привязанные к городам и регионам.
              Прокрутка приближает карту, перетаскивание — двигает, клик по маркеру —
              открывает карточку события. В одном маркере могут быть несколько событий.
            </p>
          </div>
          <Link to="/hall" className="btn-ghost">
            ← К главному залу
          </Link>
        </div>
      </div>

      <div className="container-prose mt-6 md:mt-10">
        <div className="grid gap-4 md:grid-cols-[280px_1fr] md:gap-5">
          {/* Боковая панель фильтров — desktop */}
          <aside className="hidden md:block">
            <div className="glass sticky top-24 h-[640px] overflow-hidden rounded-3xl">
              <FilterBar filters={filters} />
            </div>
          </aside>

          {/* Карта + таймлайн */}
          <div className="flex flex-col gap-4">
            {/* Мобильная кнопка фильтров */}
            <div className="flex items-center justify-between gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className="btn-ghost flex-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="7" y1="12" x2="17" y2="12" />
                  <line x1="10" y1="18" x2="14" y2="18" />
                </svg>
                Фильтры
                <span className="num-mono ml-1 rounded-full bg-accent-gold/15 px-2 py-0.5 text-[11px] text-accent-gold">
                  {filters.counts.total}
                </span>
              </button>
              <button
                type="button"
                onClick={map.reset}
                className="btn-ghost"
                aria-label="Сбросить вид карты"
              >
                ⤺ Вид
              </button>
            </div>

            {/* Контейнер карты (может быть в обычном или полноэкранном режиме) */}
            <div
              className={
                isFullscreen
                  ? 'fixed inset-0 z-50 overflow-hidden bg-ink-950'
                  : 'glass relative aspect-[16/9] w-full overflow-hidden rounded-3xl md:aspect-[16/10]'
              }
            >
              <RussiaMap
                transform={map.transform}
                size={map.size}
                animating={map.animating}
                containerRef={map.containerRef}
                overlay={
                  <>
                    {/* Кнопки зум-контрола + полноэкранный */}
                    <div
                      data-map-control
                      className="absolute right-3 top-3 z-30 flex flex-col gap-1 rounded-2xl border border-parchment-50/10 bg-ink-900/75 p-1 backdrop-blur-md"
                    >
                      <button
                        type="button"
                        onClick={() => map.zoomBy(0.6)}
                        aria-label="Приблизить"
                        className="grid h-9 w-9 place-items-center rounded-lg text-lg text-parchment-50 transition hover:bg-accent-gold/20 hover:text-accent-gold"
                      >
                        +
                      </button>
                      <div className="mx-2 h-px bg-parchment-50/10" />
                      <button
                        type="button"
                        onClick={() => map.zoomBy(-0.6)}
                        aria-label="Отдалить"
                        className="grid h-9 w-9 place-items-center rounded-lg text-lg text-parchment-50 transition hover:bg-accent-gold/20 hover:text-accent-gold"
                      >
                        −
                      </button>
                      <div className="mx-2 h-px bg-parchment-50/10" />
                      <button
                        type="button"
                        onClick={map.reset}
                        aria-label="Сбросить вид"
                        className="grid h-9 w-9 place-items-center rounded-lg text-parchment-50 transition hover:bg-accent-gold/20 hover:text-accent-gold"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                      </button>
                      <div className="mx-2 h-px bg-parchment-50/10" />
                      <button
                        type="button"
                        onClick={() => setFullscreen((v) => !v)}
                        aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}
                        title={isFullscreen ? 'Свернуть (Esc)' : 'Открыть на весь экран'}
                        className="grid h-9 w-9 place-items-center rounded-lg text-parchment-50 transition hover:bg-accent-gold/20 hover:text-accent-gold"
                      >
                        {isFullscreen ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="4 14 10 14 10 20" />
                            <polyline points="20 10 14 10 14 4" />
                            <line x1="14" y1="10" x2="21" y2="3" />
                            <line x1="3" y1="21" x2="10" y2="14" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 3 21 3 21 9" />
                            <polyline points="9 21 3 21 3 15" />
                            <line x1="21" y1="3" x2="14" y2="10" />
                            <line x1="3" y1="21" x2="10" y2="14" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Кнопка выхода в полноэкранном режиме */}
                    {isFullscreen && (
                      <button
                        type="button"
                        data-map-control
                        onClick={() => setFullscreen(false)}
                        aria-label="Закрыть полноэкранный режим"
                        className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-2xl border border-parchment-50/10 bg-ink-900/80 px-4 py-2 text-sm text-parchment-50 backdrop-blur-md transition hover:border-accent-gold/40 hover:text-accent-gold"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        <span>Закрыть</span>
                        <span className="num-mono ml-1 rounded bg-parchment-50/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-parchment-100/60">
                          Esc
                        </span>
                      </button>
                    )}

                    {/* Легенда категорий */}
                    <div
                      data-map-control
                      className="absolute bottom-3 right-3 z-30 hidden flex-col gap-1.5 rounded-2xl border border-parchment-50/10 bg-ink-900/75 px-3 py-2.5 text-[10px] uppercase tracking-[0.18em] text-parchment-100/65 backdrop-blur-md md:flex"
                    >
                      <div className="mb-1 text-parchment-100/45">Категории</div>
                      <LegendDot color="#3b82f6" label="Политика" />
                      <LegendDot color="#22c55e" label="Экономика" />
                      <LegendDot color="#ef4444" label="Военные конфликты" />
                      <LegendDot color="#a855f7" label="Культура" />
                      <LegendDot color="#f59e0b" label="Инфраструктура" />
                    </div>

                    {/* Индикатор масштаба */}
                    <div className="num-mono absolute bottom-3 left-3 z-30 rounded-full border border-parchment-50/10 bg-ink-900/75 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-parchment-100/65 backdrop-blur-md">
                      ×{map.transform.scale.toFixed(1)}
                    </div>

                    {/* Маркеры — один на location (стек), даже если в нём несколько событий */}
                    {layout.singles.map(({ stacks: bs, px, py }) => {
                      const stack = bs[0]
                      const visited = stack.events.some(
                        (e) => !e.stopId || Boolean(visitedStops[e.stopId]),
                      )
                      const active = stack.key === activeStackKey
                      const highlight =
                        highlightExcursion !== null &&
                        stack.events.some((e) => e.excursionId === highlightExcursion)
                      return (
                        <MapMarker
                          key={stack.key}
                          events={stack.events}
                          px={px}
                          py={py}
                          scale={map.transform.scale}
                          visited={visited}
                          active={active}
                          highlight={highlight}
                          reducedMotion={reducedMotion}
                          onSelect={() => handleMarkerSelect(stack.key)}
                        />
                      )
                    })}

                    {/* Пиксельные кластеры — далёкие города, налезающие друг на друга при маленьком зуме */}
                    {layout.grouped.map((b) => {
                      const allEvents = b.stacks.flatMap((s) => s.events)
                      return (
                        <MarkerCluster
                          key={`cluster-${b.stacks.map((s) => s.key).join('|')}`}
                          events={allEvents}
                          px={b.px}
                          py={b.py}
                          onExpand={() => {
                            // среднее по всем стекам в SVG-координатах
                            const cx =
                              b.stacks.reduce((s, st) => s + st.x, 0) / b.stacks.length
                            const cy =
                              b.stacks.reduce((s, st) => s + st.y, 0) / b.stacks.length
                            map.focusOn(cx, cy, Math.min(5, map.transform.scale + 1.6))
                          }}
                        />
                      )
                    })}

                    {/* Попап */}
                    <AnimatePresence>
                      {activeStack && popupPos && (
                        <EventPopup
                          key={activeStack.key}
                          events={activeStack.events}
                          px={popupPos.x}
                          py={popupPos.y}
                          containerSize={map.size}
                          onClose={() => setActiveStackKey(null)}
                        />
                      )}
                    </AnimatePresence>
                  </>
                }
              />
            </div>

            {/* Таймлайн (скрыт в полноэкранном режиме) */}
            {!isFullscreen && (
              <div className="glass rounded-2xl p-4 sm:p-5">
                <TimelineSlider
                  value={filters.state.yearRange}
                  onChange={filters.setYearRange}
                />
              </div>
            )}
          </div>
        </div>

        {/* Возврат к экскурсии — только в обычном режиме */}
        {!isFullscreen && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pb-12 md:mt-10">
            <p className="text-xs text-parchment-100/55">
              Каждая точка ведёт в конкретный зал музея и при наличии — к выбранной остановке экскурсии.
            </p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-[11px] uppercase tracking-[0.22em] text-parchment-100/55 transition hover:text-accent-gold"
            >
              ← Назад
            </button>
          </div>
        )}
      </div>

      {/* Мобильная выдвижная панель фильтров */}
      <AnimatePresence>
        {filtersOpen && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              aria-label="Закрыть фильтры"
              className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-hidden rounded-t-3xl border-t border-parchment-50/15 bg-ink-900">
              <div className="flex items-center justify-between border-b border-parchment-50/10 px-4 py-3">
                <span className="text-sm uppercase tracking-[0.2em] text-parchment-100/70">
                  Фильтры
                </span>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="rounded-full bg-parchment-50/5 px-3 py-1 text-xs text-parchment-100/70"
                >
                  Готово
                </button>
              </div>
              <div className="max-h-[calc(80vh-48px)] overflow-y-auto">
                <FilterBar filters={filters} compact />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
