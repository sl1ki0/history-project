import { useMemo } from 'react'
import { mapEvents } from '../../content/mapEvents'
import { FILTER_CONSTANTS } from './useMapFilters'

interface Props {
  value: [number, number]
  onChange: (v: [number, number]) => void
}

const [GLOBAL_MIN, GLOBAL_MAX] = FILTER_CONSTANTS.DEFAULT_YEAR_RANGE

export default function TimelineSlider({ value, onChange }: Props) {
  const [lo, hi] = value
  const span = GLOBAL_MAX - GLOBAL_MIN

  /** Плотность событий по годам — мини-гистограмма над осью */
  const histogram = useMemo(() => {
    const map = new Map<number, number>()
    for (const e of mapEvents) {
      for (let y = e.yearStart; y <= e.yearEnd; y++) {
        map.set(y, (map.get(y) ?? 0) + 1)
      }
    }
    let max = 0
    map.forEach((v) => {
      if (v > max) max = v
    })
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, n]) => ({ year, n, ratio: n / Math.max(1, max) }))
  }, [])

  const pct = (year: number) => ((year - GLOBAL_MIN) / span) * 100

  const handleLo = (val: number) => {
    const clamped = Math.min(val, hi)
    onChange([Math.max(GLOBAL_MIN, clamped), hi])
  }
  const handleHi = (val: number) => {
    const clamped = Math.max(val, lo)
    onChange([lo, Math.min(GLOBAL_MAX, clamped)])
  }

  /** Подписи каждые 5 лет */
  const ticks: number[] = []
  for (let y = Math.ceil(GLOBAL_MIN / 5) * 5; y <= GLOBAL_MAX; y += 5) ticks.push(y)

  return (
    <div className="relative w-full select-none">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-parchment-100/55">
        <span>Таймлайн</span>
        <span className="num-mono text-accent-gold/85">
          {lo} — {hi}
        </span>
      </div>

      {/* Гистограмма */}
      <div className="relative mt-3 h-7">
        <div className="absolute inset-0 flex items-end">
          {histogram.map(({ year, ratio }) => (
            <div
              key={year}
              className="absolute bottom-0 w-[3px] rounded-full"
              style={{
                left: `calc(${pct(year)}% - 1.5px)`,
                height: `${4 + ratio * 22}px`,
                background:
                  year >= lo && year <= hi
                    ? 'rgba(201,162,90,0.85)'
                    : 'rgba(247,241,230,0.18)',
                transition: 'background 200ms ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Сама дорожка с двумя ползунками */}
      <div className="relative mt-1 h-8">
        {/* Базовая линия */}
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-parchment-50/15" />
        {/* Выбранный диапазон */}
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-accent-gold/80"
          style={{
            left: `${pct(lo)}%`,
            right: `${100 - pct(hi)}%`,
          }}
        />

        {/* Невидимые range-инпуты поверх */}
        <input
          type="range"
          min={GLOBAL_MIN}
          max={GLOBAL_MAX}
          value={lo}
          step={1}
          onChange={(e) => handleLo(Number(e.target.value))}
          aria-label={`Начало периода: ${lo}`}
          className="timeline-range absolute inset-0 w-full appearance-none bg-transparent"
        />
        <input
          type="range"
          min={GLOBAL_MIN}
          max={GLOBAL_MAX}
          value={hi}
          step={1}
          onChange={(e) => handleHi(Number(e.target.value))}
          aria-label={`Конец периода: ${hi}`}
          className="timeline-range absolute inset-0 w-full appearance-none bg-transparent"
        />
      </div>

      {/* Тики годов */}
      <div className="relative mt-1 h-4 text-[10px] text-parchment-100/45">
        {ticks.map((y) => (
          <span
            key={y}
            className="num-mono absolute -translate-x-1/2"
            style={{ left: `${pct(y)}%`, top: 0 }}
          >
            {y}
          </span>
        ))}
      </div>
    </div>
  )
}
