import { useCallback, useEffect, useMemo, useState } from 'react'
import { mapEvents, type MapCategory, type MapEvent, getYearsRange } from '../../content/mapEvents'

const ALL_CATEGORIES: MapCategory[] = [
  'politics',
  'economy',
  'military',
  'culture',
  'infrastructure',
]
const ALL_EXCURSIONS: (1 | 2 | 3)[] = [1, 2, 3]

const EXCURSION_RANGE: Record<1 | 2 | 3, [number, number]> = {
  1: [1991, 1999],
  2: [2000, 2008],
  3: [2008, 2022],
}

export interface MapFilterState {
  excursions: Set<1 | 2 | 3>
  categories: Set<MapCategory>
  query: string
  yearRange: [number, number]
}

export interface UseMapFiltersResult {
  state: MapFilterState
  toggleExcursion: (id: 1 | 2 | 3) => void
  toggleCategory: (c: MapCategory) => void
  setQuery: (q: string) => void
  setYearRange: (r: [number, number]) => void
  reset: () => void
  hasActiveFilters: boolean
  filtered: MapEvent[]
  counts: {
    byExcursion: Record<1 | 2 | 3, number>
    byCategory: Record<MapCategory, number>
    total: number
  }
}

const fullYearRange = getYearsRange()
const DEFAULT_YEAR_RANGE: [number, number] = [fullYearRange.min, fullYearRange.max]

function defaultState(initial?: Partial<MapFilterState>): MapFilterState {
  return {
    excursions: new Set(initial?.excursions ?? ALL_EXCURSIONS),
    categories: new Set(initial?.categories ?? ALL_CATEGORIES),
    query: initial?.query ?? '',
    yearRange: initial?.yearRange ?? DEFAULT_YEAR_RANGE,
  }
}

export function useMapFilters(initial?: Partial<MapFilterState>): UseMapFiltersResult {
  const [state, setState] = useState<MapFilterState>(() => defaultState(initial))
  const [debouncedQuery, setDebouncedQuery] = useState(state.query)

  /* Debounce поиска на 300 мс */
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(state.query), 300)
    return () => clearTimeout(id)
  }, [state.query])

  const toggleExcursion = useCallback((id: 1 | 2 | 3) => {
    setState((s) => {
      const next = new Set(s.excursions)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      const updated: MapFilterState = { ...s, excursions: next }
      // Подстроим таймлайн под выбранные залы, если они есть
      if (next.size > 0 && next.size < 3) {
        const arr = Array.from(next)
        const min = Math.min(...arr.map((e) => EXCURSION_RANGE[e][0]))
        const max = Math.max(...arr.map((e) => EXCURSION_RANGE[e][1]))
        updated.yearRange = [min, max]
      } else if (next.size === 3 || next.size === 0) {
        updated.yearRange = DEFAULT_YEAR_RANGE
      }
      return updated
    })
  }, [])

  const toggleCategory = useCallback((c: MapCategory) => {
    setState((s) => {
      const next = new Set(s.categories)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return { ...s, categories: next }
    })
  }, [])

  const setQuery = useCallback((q: string) => {
    setState((s) => ({ ...s, query: q }))
  }, [])

  const setYearRange = useCallback((r: [number, number]) => {
    setState((s) => {
      // Подстроим залы под диапазон лет
      const nextExcursions = new Set<1 | 2 | 3>()
      ALL_EXCURSIONS.forEach((id) => {
        const [a, b] = EXCURSION_RANGE[id]
        // Зал активен, если его период пересекается с выбранным интервалом
        if (b >= r[0] && a <= r[1]) nextExcursions.add(id)
      })
      return { ...s, yearRange: r, excursions: nextExcursions }
    })
  }, [])

  const reset = useCallback(() => setState(defaultState()), [])

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    return mapEvents.filter((e) => {
      if (!state.excursions.has(e.excursionId)) return false
      if (!state.categories.has(e.category)) return false
      if (e.yearEnd < state.yearRange[0] || e.yearStart > state.yearRange[1]) return false
      if (q) {
        const haystack = `${e.title} ${e.location}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [state, debouncedQuery])

  const counts = useMemo(() => {
    const byExcursion: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 }
    const byCategory: Record<MapCategory, number> = {
      politics: 0,
      economy: 0,
      military: 0,
      culture: 0,
      infrastructure: 0,
    }
    for (const e of filtered) {
      byExcursion[e.excursionId] += 1
      byCategory[e.category] += 1
    }
    return { byExcursion, byCategory, total: filtered.length }
  }, [filtered])

  const hasActiveFilters =
    state.excursions.size < ALL_EXCURSIONS.length ||
    state.categories.size < ALL_CATEGORIES.length ||
    state.query.length > 0 ||
    state.yearRange[0] !== DEFAULT_YEAR_RANGE[0] ||
    state.yearRange[1] !== DEFAULT_YEAR_RANGE[1]

  return {
    state,
    toggleExcursion,
    toggleCategory,
    setQuery,
    setYearRange,
    reset,
    hasActiveFilters,
    filtered,
    counts,
  }
}

export const FILTER_CONSTANTS = {
  ALL_CATEGORIES,
  ALL_EXCURSIONS,
  EXCURSION_RANGE,
  DEFAULT_YEAR_RANGE,
}
