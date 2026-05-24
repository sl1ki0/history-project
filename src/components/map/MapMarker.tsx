import { memo } from 'react'
import { CATEGORY_META, type MapCategory, type MapEvent } from '../../content/mapEvents'

interface Props {
  /** Все события для этой географической точки (1 или больше) */
  events: MapEvent[]
  /** Пиксельные координаты центра маркера внутри контейнера */
  px: number
  py: number
  /** Текущий масштаб карты — влияет на отрисовку label и размер */
  scale: number
  visited: boolean
  active: boolean
  highlight: boolean
  reducedMotion: boolean
  /** Когда у точки одно событие → onSelect(event); когда несколько → onSelect(null) — родитель открывает список */
  onSelect: (event: MapEvent | null, stack: MapEvent[]) => void
}

function MapMarkerComp({
  events,
  px,
  py,
  scale,
  visited,
  active,
  highlight,
  reducedMotion,
  onSelect,
}: Props) {
  const primary = events[0]
  const isStack = events.length > 1
  // Для стека категория — самая частая
  const stackCategory = isStack ? dominantCategory(events) : primary.category
  const meta = CATEGORY_META[stackCategory]

  // Размер: одиночный — 11, стек — 16+, активный — 18
  const baseSize = active ? 18 : isStack ? Math.min(22, 13 + events.length) : 11
  const ringSize = baseSize + 12
  const cityLabel = primary.location.split(' · ')[0]
  const showLabel = scale > 1.4 || isStack

  return (
    <div
      data-map-marker
      role="button"
      tabIndex={0}
      aria-label={
        isStack
          ? `${cityLabel}: ${events.length} событий`
          : `Событие: ${primary.title}, ${primary.year}, ${primary.location}`
      }
      onClick={(e) => {
        e.stopPropagation()
        onSelect(isStack ? null : primary, events)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(isStack ? null : primary, events)
        }
      }}
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer outline-none transition-[opacity] duration-300 focus-visible:ring-2 focus-visible:ring-accent-gold"
      style={{
        left: `${px}px`,
        top: `${py}px`,
        opacity: visited ? 1 : 0.7,
        zIndex: active ? 40 : isStack ? 25 : highlight ? 20 : 10,
      }}
    >
      {/* Пульсация — только если событие подсвечено (выбран его зал) и нет prefers-reduced-motion */}
      {highlight && !reducedMotion && (
        <span
          aria-hidden
          className="absolute animate-ping rounded-full"
          style={{
            background: meta.ring,
            width: `${ringSize}px`,
            height: `${ringSize}px`,
            left: `${-ringSize / 2}px`,
            top: `${-ringSize / 2}px`,
            animationDuration: '2.4s',
            zIndex: -1,
          }}
        />
      )}

      {/* Внешний «ободок» для стека */}
      {isStack && (
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: `${baseSize + 8}px`,
            height: `${baseSize + 8}px`,
            left: `${-(baseSize + 8) / 2}px`,
            top: `${-(baseSize + 8) / 2}px`,
            border: `1px solid ${meta.ring}`,
            background: 'rgba(8,8,10,0.25)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Основной кружок маркера */}
      <span
        aria-hidden
        className="block rounded-full border-2 transition-all duration-200"
        style={{
          width: `${baseSize}px`,
          height: `${baseSize}px`,
          backgroundColor: isStack ? 'rgba(15,15,18,0.92)' : meta.color,
          borderColor: active ? '#fff' : isStack ? meta.color : 'rgba(247,241,230,0.85)',
          boxShadow: active
            ? `0 0 0 3px rgba(247,241,230,0.18), 0 0 22px 4px ${meta.glow}`
            : `0 0 12px 1px ${meta.glow}`,
        }}
      />

      {/* Цифра внутри маркера для стека */}
      {isStack && (
        <span
          aria-hidden
          className="num-display pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-semibold leading-none text-parchment-50"
        >
          {events.length}
        </span>
      )}

      {/* Подпись города */}
      {showLabel && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
          style={{ top: `${baseSize / 2 + 6}px` }}
        >
          <div
            className="num-mono rounded-md bg-ink-950/85 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-parchment-100/85 backdrop-blur"
            style={{ borderTop: `1px solid ${meta.ring}` }}
          >
            {cityLabel}
          </div>
        </div>
      )}

      {/* Выноска-стрелка для точек вне РФ (Беловежская пуща, Цхинвал) */}
      {primary.external && (
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 -z-10 h-px"
          style={{
            width: '46px',
            background:
              'linear-gradient(90deg, rgba(201,162,90,0.6), rgba(201,162,90,0))',
            transformOrigin: 'left center',
            transform: 'translate(-2px, -50%) rotate(-12deg)',
          }}
        />
      )}
    </div>
  )
}

function dominantCategory(events: MapEvent[]): MapCategory {
  const counts: Partial<Record<MapCategory, number>> = {}
  for (const e of events) counts[e.category] = (counts[e.category] ?? 0) + 1
  let best: MapCategory = events[0].category
  let bestN = 0
  for (const [cat, n] of Object.entries(counts) as [MapCategory, number][]) {
    if (n > bestN) {
      bestN = n
      best = cat
    }
  }
  return best
}

export default memo(MapMarkerComp)
