import { type ReactNode } from 'react'
import {
  CITY_LABELS,
  CRIMEA_OUTLINE_D,
  KALININGRAD_OUTLINE_D,
  NEIGHBOR_LABELS,
  RUSSIA_OUTLINE_D,
  SAKHALIN_OUTLINE_D,
  SEA_LABELS,
} from './russiaPath'
import { VIEWBOX, type MapTransform } from './useMapInteraction'

interface Props {
  transform: MapTransform
  size: { w: number; h: number }
  /** Анимировать transitions при программных изменениях зума */
  animating: boolean
  /** Слой над SVG — туда летят DOM-маркеры и попап */
  overlay?: ReactNode
  containerRef: React.RefObject<HTMLDivElement>
}

const GRATICULE_LATS = [40, 50, 55, 60, 65, 70, 75]
const GRATICULE_LONS = [30, 60, 90, 120, 150, 180]

const lonToX = (lon: number) => (lon - 19) * (1000 / 175)
const latToY = (lat: number) => (78 - lat) * (500 / 40)

export default function RussiaMap({ transform, size, animating, overlay, containerRef }: Props) {
  // Базовый масштаб для центрирования viewBox в контейнере
  const baseScale =
    size.w === 0 || size.h === 0
      ? 1
      : Math.min(size.w / VIEWBOX.width, size.h / VIEWBOX.height)
  const baseOffsetX = (size.w - VIEWBOX.width * baseScale) / 2
  const baseOffsetY = (size.h - VIEWBOX.height * baseScale) / 2

  /**
   * Сложная трансформация в едином `<g>`:
   * сначала центрируем viewBox под контейнер, потом применяем зум-к-центру.
   */
  const transformStr = `translate(${transform.tx} ${transform.ty}) translate(${size.w / 2} ${size.h / 2}) scale(${transform.scale}) translate(${-size.w / 2} ${-size.h / 2}) translate(${baseOffsetX} ${baseOffsetY}) scale(${baseScale})`

  const showCityLabels = transform.scale > 1.6
  const detailedLabels = transform.scale > 1.2
  const labelScale = 1 / Math.max(transform.scale, 1)

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none overflow-hidden"
      style={{
        cursor: 'grab',
        background:
          'radial-gradient(55% 45% at 35% 35%, rgba(201,162,90,0.07), transparent 70%), radial-gradient(60% 55% at 80% 80%, rgba(74,31,31,0.10), transparent 70%), linear-gradient(180deg, rgba(13,16,22,0.6), rgba(8,8,10,0.9))',
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full select-none"
        width={size.w || undefined}
        height={size.h || undefined}
        viewBox={
          size.w && size.h ? `0 0 ${size.w} ${size.h}` : `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`
        }
        preserveAspectRatio="xMidYMid meet"
        aria-label="Карта Российской Федерации с историческими событиями 1991–2022"
      >
        <defs>
          <linearGradient id="map-fill" x1="0%" y1="0%" x2="60%" y2="100%">
            <stop offset="0%" stopColor="rgba(201,162,90,0.12)" />
            <stop offset="55%" stopColor="rgba(207,183,135,0.06)" />
            <stop offset="100%" stopColor="rgba(164,75,42,0.05)" />
          </linearGradient>
          <linearGradient id="map-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(201,162,90,0.9)" />
            <stop offset="60%" stopColor="rgba(247,241,230,0.55)" />
            <stop offset="100%" stopColor="rgba(201,162,90,0.7)" />
          </linearGradient>
          <radialGradient id="ocean-vignette" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(20,28,40,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
          </radialGradient>
          <filter id="map-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="text-shadow">
            <feDropShadow dx="0" dy="0.5" stdDeviation="0.8" floodColor="#000" floodOpacity="0.7" />
          </filter>
        </defs>

        <g
          transform={transformStr}
          style={{
            transition: animating
              ? 'transform 0.45s cubic-bezier(0.16,1,0.3,1)'
              : 'none',
          }}
        >
          {/* «Океан» — фоновая виньетка */}
          <rect
            x={-50}
            y={-50}
            width={VIEWBOX.width + 100}
            height={VIEWBOX.height + 100}
            fill="url(#ocean-vignette)"
          />

          {/* Сетка широт и долгот */}
          <g
            opacity={detailedLabels ? 0.18 : 0.1}
            style={{ transition: 'opacity 300ms ease' }}
          >
            {GRATICULE_LATS.map((lat) => (
              <line
                key={`lat-${lat}`}
                x1={0}
                x2={VIEWBOX.width}
                y1={latToY(lat)}
                y2={latToY(lat)}
                stroke="rgba(247,241,230,0.25)"
                strokeWidth={0.3}
                strokeDasharray="3 6"
              />
            ))}
            {GRATICULE_LONS.map((lon) => (
              <line
                key={`lon-${lon}`}
                x1={lonToX(lon)}
                x2={lonToX(lon)}
                y1={0}
                y2={VIEWBOX.height}
                stroke="rgba(247,241,230,0.18)"
                strokeWidth={0.3}
                strokeDasharray="3 6"
              />
            ))}
          </g>

          {/* Свечение под Россией */}
          <path
            d={RUSSIA_OUTLINE_D}
            fill="rgba(201,162,90,0.18)"
            filter="url(#map-glow)"
            opacity={0.65}
          />

          {/* Главный контур России */}
          <path
            d={RUSSIA_OUTLINE_D}
            fill="url(#map-fill)"
            stroke="url(#map-stroke)"
            strokeWidth={0.9}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Сахалин */}
          <path
            d={SAKHALIN_OUTLINE_D}
            fill="rgba(201,162,90,0.10)"
            stroke="rgba(201,162,90,0.7)"
            strokeWidth={0.7}
            strokeLinejoin="round"
          />

          {/* Калининград */}
          <path
            d={KALININGRAD_OUTLINE_D}
            fill="rgba(201,162,90,0.10)"
            stroke="rgba(201,162,90,0.7)"
            strokeWidth={0.7}
            strokeLinejoin="round"
          />

          {/* Крымский полуостров */}
          <path
            d={CRIMEA_OUTLINE_D}
            fill="url(#map-fill)"
            stroke="url(#map-stroke)"
            strokeWidth={0.7}
            strokeLinejoin="round"
          />

          {/* Подписи морей */}
          {SEA_LABELS.map((s) => (
            <text
              key={s.text + s.x}
              x={s.x}
              y={s.y}
              fontSize={detailedLabels ? 7 : 8.5}
              transform={s.rotate ? `rotate(${s.rotate} ${s.x} ${s.y})` : undefined}
              fill="rgba(140,170,210,0.55)"
              fontFamily="'Inter', sans-serif"
              letterSpacing="0.18em"
              filter="url(#text-shadow)"
              style={{ pointerEvents: 'none' }}
            >
              {s.text}
            </text>
          ))}

          {/* Подписи соседей — приглушённо */}
          {NEIGHBOR_LABELS.map((n) => (
            <text
              key={n.text}
              x={n.x}
              y={n.y}
              fontSize={6.5}
              fill="rgba(247,241,230,0.30)"
              fontFamily="'Inter', sans-serif"
              letterSpacing="0.22em"
              filter="url(#text-shadow)"
              style={{ pointerEvents: 'none' }}
            >
              {n.text}
            </text>
          ))}

          {/* Города — декоративные точки видны всегда, подписи появляются при зуме */}
          {CITY_LABELS.map((c) => {
            const dx = c.side === 'right' ? 6 : c.side === 'left' ? -6 : 0
            const dy = c.side === 'top' ? -7 : c.side === 'bottom' ? 11 : 3.5
            const anchor = c.side === 'right' ? 'start' : c.side === 'left' ? 'end' : 'middle'
            return (
              <g key={c.name} style={{ pointerEvents: 'none' }}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={1.4 * labelScale * 1.4}
                  fill="rgba(247,241,230,0.7)"
                />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={3 * labelScale * 1.4}
                  fill="none"
                  stroke="rgba(247,241,230,0.18)"
                  strokeWidth={0.35}
                />
                {showCityLabels && (
                  <text
                    x={c.x + dx}
                    y={c.y + dy}
                    fontSize={6.5 * labelScale}
                    fill="rgba(247,241,230,0.9)"
                    fontFamily="'Inter', sans-serif"
                    textAnchor={anchor}
                    filter="url(#text-shadow)"
                  >
                    {c.name}
                  </text>
                )}
              </g>
            )
          })}
        </g>

        {/* Компас (вне трансформируемой группы — в левом верхнем углу) */}
        <g transform={`translate(38, 46)`} opacity={0.6}>
          <circle r={20} fill="rgba(8,8,10,0.55)" stroke="rgba(201,162,90,0.4)" strokeWidth={0.6} />
          <path d="M 0 -15 L 3 0 L 0 15 L -3 0 Z" fill="rgba(201,162,90,0.85)" />
          <path d="M -15 0 L 0 3 L 15 0 L 0 -3 Z" fill="rgba(247,241,230,0.3)" />
          <text
            y={-22}
            textAnchor="middle"
            fontSize={8}
            fontFamily="'JetBrains Mono', monospace"
            fill="rgba(201,162,90,0.9)"
          >
            С
          </text>
        </g>
      </svg>

      {overlay}
    </div>
  )
}
