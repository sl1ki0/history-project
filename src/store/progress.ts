import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface QuizResult {
  /** number of correct answers */
  correct: number
  /** total questions */
  total: number
  /** ISO timestamp of last attempt */
  ts: number
}

interface ProgressState {
  visitedStops: Record<string, true>
  quizResults: Record<string, QuizResult>
  visitStop: (id: string) => void
  saveQuiz: (excursionId: string, correct: number, total: number) => void
  reset: () => void
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      visitedStops: {},
      quizResults: {},

      visitStop: (id) =>
        set((s) =>
          s.visitedStops[id] ? s : { visitedStops: { ...s.visitedStops, [id]: true } },
        ),

      saveQuiz: (excursionId, correct, total) =>
        set((s) => ({
          quizResults: {
            ...s.quizResults,
            [excursionId]:
              !s.quizResults[excursionId] || s.quizResults[excursionId].correct < correct
                ? { correct, total, ts: Date.now() }
                : s.quizResults[excursionId],
          },
        })),

      reset: () => set({ visitedStops: {}, quizResults: {} }),
    }),
    { name: 'museum-progress-v1' },
  ),
)

/* Derived selectors — pure functions over state objects, safe to call in render */

export function computeTotalXp(s: Pick<ProgressState, 'quizResults' | 'visitedStops'>) {
  const correctXp = Object.values(s.quizResults).reduce(
    (acc, r) => acc + r.correct * 10,
    0,
  )
  const visitXp = Object.keys(s.visitedStops).length * 2
  return correctXp + visitXp
}

export function computeBadges(s: Pick<ProgressState, 'quizResults' | 'visitedStops'>) {
  const list: string[] = []
  const totalCorrect = Object.values(s.quizResults).reduce((acc, r) => acc + r.correct, 0)
  const totalQuestions = Object.values(s.quizResults).reduce((acc, r) => acc + r.total, 0)
  const completedExcursions = Object.keys(s.quizResults).length
  if (Object.keys(s.visitedStops).length >= 1) list.push('Первый шаг')
  if (completedExcursions >= 1) list.push('Завершённая экскурсия')
  if (completedExcursions >= 3) list.push('Полный кругозор')
  if (
    totalQuestions > 0 &&
    totalCorrect / totalQuestions >= 0.8 &&
    completedExcursions >= 3
  )
    list.push('Знаток эпохи')
  if (
    totalQuestions > 0 &&
    totalCorrect === totalQuestions &&
    completedExcursions >= 3
  )
    list.push('Историк-эксперт')
  return list
}

/** Stable hook for derived XP — recomputes only when state slices change. */
export function useTotalXp() {
  return useProgress((s) => computeTotalXp(s))
}

/** Returns badges joined as a stable string key, parsed on consumer side if needed. */
export function useBadgeList(): string[] {
  // Subscribe to the raw maps so the selector returns the same array if maps don't change
  const visited = useProgress((s) => s.visitedStops)
  const results = useProgress((s) => s.quizResults)
  return computeBadges({ visitedStops: visited, quizResults: results })
}

