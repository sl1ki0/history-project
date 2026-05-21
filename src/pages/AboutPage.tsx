import PageTransition from '../components/PageTransition'
import AnimatedHeading from '../components/AnimatedHeading'
import { excursions, museum } from '../content'
import { useProgress, useTotalXp, useBadgeList } from '../store/progress'
import { motion } from 'framer-motion'

export default function AboutPage() {
  const xp = useTotalXp()
  const badges = useBadgeList()
  const reset = useProgress((s) => s.reset)
  const results = useProgress((s) => s.quizResults)

  const totalCorrect = Object.values(results).reduce((a, r) => a + r.correct, 0)
  const totalQ = Object.values(results).reduce((a, r) => a + r.total, 0)

  return (
    <PageTransition className="container-prose py-16">
      <AnimatedHeading
        eyebrow="о музее"
        text={museum.fullName}
        className="text-5xl md:text-7xl text-parchment-50"
      />

      <div className="mt-10 grid gap-10 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          <Section title="Миссия музея">
            <p className="text-parchment-100/80 leading-relaxed">{museum.mission}</p>
          </Section>

          <Section title="Характерные черты">
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {museum.characteristics.map((c) => (
                <li
                  key={c.label}
                  className="glass rounded-2xl p-5"
                >
                  <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
                    {c.label}
                  </div>
                  <div className="mt-2 heading-serif text-xl text-parchment-50">{c.value}</div>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Структура экспозиции">
            <ol className="space-y-2 text-parchment-100/80">
              {museum.structure.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-accent-gold/70" />
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Экскурсионные программы">
            <div className="space-y-3">
              {excursions.map((e) => (
                <div
                  key={e.id}
                  className="rounded-2xl border border-parchment-50/10 p-5"
                >
                  <div className="flex items-baseline justify-between">
                    <div className="font-mono text-xs text-accent-gold/80">
                      №{e.number} · {e.period}
                    </div>
                    <div className="font-mono text-xs text-parchment-100/40">
                      {e.stops.length} остановок · {e.quiz.length} вопросов
                    </div>
                  </div>
                  <h3 className="mt-2 heading-serif text-2xl text-parchment-50">{e.title}</h3>
                  <p className="mt-1 text-sm text-parchment-100/70">{e.goal}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Методология">
            <p className="text-parchment-100/80 leading-relaxed">
              Каждое утверждение в текстах экскурсовода привязано к номеру источника в
              квадратных скобках, а в конце экскурсии находится нумерованный
              библиографический список с активными гиперссылками. Приоритет отдан
              первичным официальным документам (kremlin.ru, pravo.gov.ru, ЦИК России,
              Минфин, Минздрав), статистическим публикациям Росстата и
              энциклопедическим статьям БРЭ. Дополнительно используются
              информационные досье ТАСС и материалы профильных ведомств.
            </p>
          </Section>
        </div>

        <aside className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass rounded-3xl p-6"
          >
            <div className="text-[10px] uppercase tracking-[0.3em] text-accent-gold/80">
              Ваш прогресс
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="heading-serif text-5xl text-parchment-50">{xp}</div>
              <div className="text-sm text-parchment-100/50">XP</div>
            </div>
            <div className="mt-1 text-sm text-parchment-100/55">
              Правильных ответов: {totalCorrect} из {totalQ || '—'}
            </div>
            <div className="mt-5 space-y-2">
              <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
                Бейджи
              </div>
              {badges.length === 0 && (
                <p className="text-sm text-parchment-100/40">
                  Начните экскурсию, чтобы получить первый бейдж.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-accent-gold/30 bg-accent-gold/10 px-3 py-1 text-xs text-accent-gold"
                  >
                    ◆ {b}
                  </span>
                ))}
              </div>
            </div>
            {(badges.length > 0 || Object.keys(results).length > 0) && (
              <button
                onClick={() => {
                  if (confirm('Сбросить весь прогресс?')) reset()
                }}
                className="mt-6 text-xs text-parchment-100/50 underline-offset-4 hover:text-accent-gold hover:underline"
              >
                Сбросить прогресс
              </button>
            )}
          </motion.div>
        </aside>
      </div>
    </PageTransition>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="heading-serif text-2xl text-parchment-50">{title}</h2>
      <div className="gold-divider my-3 w-16" />
      <div>{children}</div>
    </section>
  )
}
