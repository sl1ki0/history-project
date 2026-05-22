import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import PageTransition from '../components/PageTransition'
import AnimatedHeading from '../components/AnimatedHeading'
import { excursions } from '../content'
import { useProgress } from '../store/progress'
import { AnimatePresence, motion } from 'framer-motion'

export default function QuizPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const excursion = useMemo(() => excursions.find((e) => e.id === id), [id])
  const saveQuiz = useProgress((s) => s.saveQuiz)

  const [answers, setAnswers] = useState<(number | null)[]>(
    excursion ? excursion.quiz.map(() => null) : [],
  )
  const [submitted, setSubmitted] = useState(false)
  const [activeQ, setActiveQ] = useState(0)

  if (!excursion) return null

  const total = excursion.quiz.length
  const correct = excursion.quiz.reduce(
    (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
    0,
  )
  const allAnswered = answers.every((a) => a !== null)

  const submit = () => {
    if (!allAnswered) return
    saveQuiz(excursion.id, correct, total)
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (submitted) {
    return (
      <PageTransition className="container-prose py-10 sm:py-16">
        <ResultView
          excursion={excursion}
          correct={correct}
          total={total}
          answers={answers}
          onRestart={() => {
            setAnswers(excursion.quiz.map(() => null))
            setActiveQ(0)
            setSubmitted(false)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      </PageTransition>
    )
  }

  const q = excursion.quiz[activeQ]
  const answered = answers[activeQ] !== null

  return (
    <PageTransition className="container-prose py-8 sm:py-12 md:py-20">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="chip">тест к экскурсии №{excursion.number}</div>
        <Link to={`/excursion/${excursion.id}`} className="btn-ghost">
          ← К экскурсии
        </Link>
      </div>

      <AnimatedHeading
        eyebrow={excursion.title}
        text="Проверьте себя"
        as="h2"
        className="mt-4 text-4xl sm:text-5xl md:text-6xl text-parchment-50"
      />

      <div className="mt-8 flex items-center gap-1.5 overflow-x-auto pb-2 sm:mt-10 sm:gap-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {excursion.quiz.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveQ(i)}
            className={`h-2 w-8 shrink-0 rounded-full transition sm:w-12 ${
              i === activeQ
                ? 'bg-accent-gold'
                : answers[i] !== null
                ? 'bg-accent-gold/40'
                : 'bg-parchment-50/10 hover:bg-parchment-50/20'
            }`}
            aria-label={`Вопрос ${i + 1}`}
          />
        ))}
        <div className="num-mono ml-2 shrink-0 text-xs text-parchment-100/55 sm:ml-3">
          <span className="text-parchment-50">{activeQ + 1}</span> / {total}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeQ}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 sm:mt-8"
        >
          <h3 className="heading-serif text-xl text-parchment-50 sm:text-2xl md:text-3xl">{q.q}</h3>

          <div className="mt-5 space-y-2 sm:mt-6">
            {q.options.map((opt, i) => {
              const selected = answers[activeQ] === i
              return (
                <button
                  key={i}
                  onClick={() => {
                    const next = [...answers]
                    next[activeQ] = i
                    setAnswers(next)
                  }}
                  className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm transition sm:px-5 sm:py-4 sm:text-base ${
                    selected
                      ? 'border-accent-gold bg-accent-gold/10 text-parchment-50'
                      : 'border-parchment-50/10 bg-ink-900/40 text-parchment-100/80 hover:border-parchment-50/30 hover:bg-ink-900/70'
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                      selected ? 'border-accent-gold bg-accent-gold' : 'border-parchment-50/30 bg-transparent'
                    }`}
                  >
                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-ink-900" />}
                  </span>
                  <span className="min-w-0 break-words">{opt}</span>
                </button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:mt-10 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => setActiveQ(Math.max(0, activeQ - 1))}
          disabled={activeQ === 0}
          className="btn-ghost w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-30"
        >
          ← Предыдущий
        </button>

        <div className="flex items-center gap-2 sm:w-auto">
          {activeQ < total - 1 ? (
            <button
              onClick={() => setActiveQ(activeQ + 1)}
              disabled={!answered}
              className="btn-primary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-40"
            >
              Следующий →
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!allAnswered}
              className="btn-primary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-40"
            >
              Завершить тест
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-parchment-100/40">
        Подсказка: можно перемещаться между вопросами кружками выше. Кнопка «Завершить»
        активна, когда отвечено на все вопросы.
      </p>
    </PageTransition>
  )
}

function ResultView({
  excursion,
  correct,
  total,
  answers,
  onRestart,
}: {
  excursion: (typeof excursions)[number]
  correct: number
  total: number
  answers: (number | null)[]
  onRestart: () => void
}) {
  const pct = Math.round((correct / total) * 100)
  const verdict =
    pct === 100
      ? { title: 'Безупречно', text: 'Все ответы верны — историк-эксперт.' }
      : pct >= 80
      ? { title: 'Отличный результат', text: 'Высокое качество знаний по эпохе.' }
      : pct >= 60
      ? { title: 'Хороший результат', text: 'Закройте пробелы — пройдите экскурсию ещё раз.' }
      : { title: 'Стоит повторить', text: 'Вернитесь к экспозиции и обратите внимание на даты.' }

  return (
    <>
      <div className="chip">результаты теста</div>
      <AnimatedHeading
        eyebrow={excursion.title}
        text={verdict.title}
        as="h2"
        className="mt-4 text-4xl sm:text-5xl md:text-7xl text-parchment-50"
      />

      <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-6 md:grid-cols-[1fr_2fr]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="glass rounded-3xl p-6 text-center sm:p-8"
        >
          <div className="mx-auto grid h-36 w-36 place-items-center rounded-full border-2 border-accent-gold/40 sm:h-44 sm:w-44">
            <div>
              <div className="num-display text-5xl font-semibold text-parchment-50 sm:text-6xl">{correct}</div>
              <div className="num-mono mt-1 text-xs uppercase tracking-[0.25em] text-parchment-100/50">
                из {total}
              </div>
            </div>
          </div>
          <div className="num-display mt-5 text-xl font-semibold text-parchment-50 sm:mt-6 sm:text-2xl">{pct}% верно</div>
          <p className="mt-2 text-sm text-parchment-100/65">{verdict.text}</p>

          <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <button onClick={onRestart} className="btn-ghost">
              Пройти ещё раз
            </button>
            <Link to="/hall" className="btn-primary">
              К списку залов →
            </Link>
          </div>
        </motion.div>

        <div className="space-y-3">
          {excursion.quiz.map((q, i) => {
            const ok = answers[i] === q.correctIndex
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className={`rounded-2xl border p-4 sm:p-5 ${
                  ok
                    ? 'border-accent-gold/30 bg-accent-gold/5'
                    : 'border-accent-rust/40 bg-accent-rust/5'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-mono text-xs text-accent-gold/80">
                    Вопрос {i + 1} · {ok ? 'верно' : 'ошибка'}
                  </div>
                  <span className="text-lg">{ok ? '✓' : '✕'}</span>
                </div>
                <div className="mt-2 text-sm text-parchment-50 sm:text-base">{q.q}</div>
                <div className="mt-2 text-sm text-parchment-100/70">
                  <span className="text-parchment-100/45">Ваш ответ: </span>
                  {answers[i] !== null ? q.options[answers[i]!] : '—'}
                </div>
                {!ok && (
                  <div className="mt-1 text-sm text-parchment-100/70">
                    <span className="text-parchment-100/45">Правильно: </span>
                    {q.options[q.correctIndex]}
                  </div>
                )}
                <div className="mt-3 text-sm text-parchment-100/85">{q.explanation}</div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </>
  )
}
