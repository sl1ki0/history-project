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
      <PageTransition className="container-prose py-16">
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
    <PageTransition className="container-prose py-12 md:py-20">
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
        className="mt-4 text-5xl md:text-6xl text-parchment-50"
      />

      <div className="mt-10 flex items-center gap-2 overflow-x-auto pb-2">
        {excursion.quiz.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveQ(i)}
            className={`h-2 w-12 rounded-full transition ${
              i === activeQ
                ? 'bg-accent-gold'
                : answers[i] !== null
                ? 'bg-accent-gold/40'
                : 'bg-parchment-50/10 hover:bg-parchment-50/20'
            }`}
            aria-label={`Вопрос ${i + 1}`}
          />
        ))}
        <div className="ml-3 font-mono text-xs text-parchment-100/55">
          {activeQ + 1} / {total}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeQ}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8"
        >
          <h3 className="heading-serif text-2xl md:text-3xl text-parchment-50">{q.q}</h3>

          <div className="mt-6 space-y-2">
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
                  className={`group flex w-full items-start gap-3 rounded-2xl border px-5 py-4 text-left transition ${
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
                  <span>{opt}</span>
                </button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setActiveQ(Math.max(0, activeQ - 1))}
          disabled={activeQ === 0}
          className="btn-ghost disabled:cursor-not-allowed disabled:opacity-30"
        >
          ← Предыдущий
        </button>

        <div className="flex items-center gap-2">
          {activeQ < total - 1 ? (
            <button
              onClick={() => setActiveQ(activeQ + 1)}
              disabled={!answered}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Следующий →
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!allAnswered}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
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
        className="mt-4 text-5xl md:text-7xl text-parchment-50"
      />

      <div className="mt-10 grid gap-6 md:grid-cols-[1fr_2fr]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="glass rounded-3xl p-8 text-center"
        >
          <div className="mx-auto grid h-44 w-44 place-items-center rounded-full border-2 border-accent-gold/40">
            <div>
              <div className="heading-serif text-6xl text-parchment-50">{correct}</div>
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-parchment-100/50">
                из {total}
              </div>
            </div>
          </div>
          <div className="mt-6 heading-serif text-2xl text-parchment-50">{pct}% верно</div>
          <p className="mt-2 text-sm text-parchment-100/65">{verdict.text}</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
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
                className={`rounded-2xl border p-5 ${
                  ok
                    ? 'border-accent-gold/30 bg-accent-gold/5'
                    : 'border-accent-rust/40 bg-accent-rust/5'
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <div className="font-mono text-xs text-accent-gold/80">
                    Вопрос {i + 1} · {ok ? 'верно' : 'ошибка'}
                  </div>
                  <span className="text-lg">{ok ? '✓' : '✕'}</span>
                </div>
                <div className="mt-2 text-parchment-50">{q.q}</div>
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
