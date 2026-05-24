import { CATEGORY_META, EXCURSION_META, mapEvents, type MapCategory } from '../../content/mapEvents'
import type { UseMapFiltersResult } from './useMapFilters'

const TOTAL_EVENTS = mapEvents.length

interface Props {
  filters: UseMapFiltersResult
  /** Тонкая компоновка для мобильных — другая раскладка кнопок */
  compact?: boolean
}

const EXCURSION_IDS: (1 | 2 | 3)[] = [1, 2, 3]
const CATEGORY_ORDER: MapCategory[] = [
  'politics',
  'economy',
  'military',
  'culture',
  'infrastructure',
]

export default function FilterBar({ filters }: Props) {
  const { state, counts, toggleExcursion, toggleCategory, setQuery, reset, hasActiveFilters } =
    filters

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
      {/* Сводка */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-accent-gold/80">
            События
          </div>
          <div className="num-display mt-1 text-3xl font-medium text-parchment-50">
            {counts.total}
            <span className="ml-1 text-base text-parchment-100/40">/ {TOTAL_EVENTS}</span>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={reset}
            className="text-[11px] uppercase tracking-[0.22em] text-parchment-100/55 transition hover:text-accent-gold"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Поиск */}
      <div>
        <label className="text-[10px] uppercase tracking-[0.25em] text-parchment-100/55">
          Поиск
        </label>
        <div className="relative mt-2">
          <input
            type="search"
            value={state.query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Город или событие…"
            className="w-full rounded-xl border border-parchment-50/10 bg-ink-950/60 px-3.5 py-2.5 text-sm text-parchment-50 placeholder:text-parchment-100/35 focus:border-accent-gold/60 focus:outline-none"
          />
          <svg
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-parchment-100/40"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Залы */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-parchment-100/55">
          Период
        </div>
        <div className="flex flex-wrap gap-2">
          {EXCURSION_IDS.map((id) => {
            const active = state.excursions.has(id)
            const meta = EXCURSION_META[id]
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleExcursion(id)}
                className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition ${
                  active
                    ? 'border-accent-gold/60 bg-accent-gold/15 text-parchment-50'
                    : 'border-parchment-50/10 bg-ink-950/40 text-parchment-100/45'
                }`}
              >
                <span className="num-mono">{meta.period}</span>
                <span
                  className={`grid h-5 min-w-[22px] place-items-center rounded-full px-1.5 text-[10px] transition ${
                    active ? 'bg-accent-gold/30 text-parchment-50' : 'bg-parchment-50/5 text-parchment-100/45'
                  }`}
                >
                  {counts.byExcursion[id]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Категории */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-parchment-100/55">
          Категория
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_ORDER.map((c) => {
            const active = state.categories.has(c)
            const meta = CATEGORY_META[c]
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] transition ${
                  active
                    ? 'border-parchment-50/30 bg-parchment-50/5 text-parchment-50'
                    : 'border-parchment-50/10 bg-ink-950/30 text-parchment-100/40'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: meta.color,
                    opacity: active ? 1 : 0.4,
                  }}
                />
                <span>{meta.label}</span>
                <span
                  className={`grid h-5 min-w-[22px] place-items-center rounded-full px-1.5 text-[10px] transition ${
                    active ? 'bg-parchment-50/10 text-parchment-50/85' : 'bg-parchment-50/5 text-parchment-100/40'
                  }`}
                >
                  {counts.byCategory[c]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Подсказка */}
      <div className="mt-auto rounded-xl border border-parchment-50/10 bg-parchment-50/[0.02] p-3 text-[11px] leading-relaxed text-parchment-100/55">
        <span className="text-accent-gold/80">Прокрутка</span> — масштаб,{' '}
        <span className="text-accent-gold/80">перетаскивание</span> — пан.
        Клик по маркеру открывает карточку события и кнопку перехода к остановке.
      </div>
    </div>
  )
}
