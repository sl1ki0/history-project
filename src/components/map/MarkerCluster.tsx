import { memo } from 'react'
import type { MapEvent } from '../../content/mapEvents'

interface Props {
  events: MapEvent[]
  px: number
  py: number
  onExpand: (centroid: { x: number; y: number }) => void
}

function MarkerClusterComp({ events, px, py, onExpand }: Props) {
  const count = events.length
  // Размер кластера слегка зависит от количества
  const size = Math.min(32, 18 + Math.log2(count) * 4)
  // Усреднённые SVG-координаты для зум-в-кластер
  const cx = events.reduce((s, e) => s + e.x, 0) / count
  const cy = events.reduce((s, e) => s + e.y, 0) / count

  return (
    <button
      data-map-marker
      type="button"
      aria-label={`Кластер событий: ${count}. Нажмите, чтобы раскрыть.`}
      onClick={(e) => {
        e.stopPropagation()
        onExpand({ x: cx, y: cy })
      }}
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent-gold/50 bg-ink-900/80 text-parchment-50 backdrop-blur transition hover:border-accent-gold hover:bg-accent-gold/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold"
      style={{
        left: `${px}px`,
        top: `${py}px`,
        width: `${size}px`,
        height: `${size}px`,
        zIndex: 25,
        boxShadow: '0 0 16px -2px rgba(201,162,90,0.45)',
      }}
    >
      <span className="num-display block text-xs font-semibold leading-none">{count}</span>
    </button>
  )
}

export default memo(MarkerClusterComp)
