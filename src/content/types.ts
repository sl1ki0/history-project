export type ArtifactKind = 'document' | 'flag' | 'crystal' | 'medal' | 'globe' | 'crown' | 'monolith'

export interface Source {
  n: number
  title: string
  publisher?: string
  url: string
  type: 'archive' | 'official' | 'encyclopedia' | 'media' | 'book'
}

export interface QuizQuestion {
  q: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface SlideStop {
  id: string
  /** Подтема / smysl */
  subtopic: string
  /** Заголовок остановки экскурсии */
  title: string
  /** Дата (или диапазон) для маркера на таймлайне */
  date: string
  /** Палитра акцента слайда */
  accent: 'gold' | 'rust' | 'royal' | 'deep'
  /** Тип артефакта в 3D-сцене слайда */
  artifact: ArtifactKind
  /** Параграфы текста экскурсовода — каждый = логический блок речи */
  narration: string[]
  /** Подпись под экспонатом — короткая, идентифицирующая */
  caption: string
  /**
   * Описание сути экспоната и того, что на нём изображено: 1–3 предложения,
   * объясняющие символику модели и историческую привязку.
   */
  exhibitNote: string
}

export interface Excursion {
  id: string
  number: number
  /** Период экскурсии */
  period: string
  /** Главная тема */
  title: string
  /** Подзаголовок */
  subtitle: string
  /** Цель экскурсии (для критерия "цель") */
  goal: string
  /** Краткое описание для карточки */
  summary: string
  /** Длительность ориентировочно */
  duration: string
  /** Ключевые слова для UI */
  keywords: string[]
  /** Цветовая палитра */
  palette: {
    from: string
    to: string
    accent: string
  }
  stops: SlideStop[]
  /** Вступление экскурсовода */
  intro: string
  /** Заключение экскурсовода */
  outro: string
  quiz: QuizQuestion[]
  sources: Source[]
}
