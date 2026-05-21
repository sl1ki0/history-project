import { Link } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import AnimatedHeading from '../components/AnimatedHeading'
import { excursions } from '../content'
import { useProgress } from '../store/progress'
import { motion } from 'framer-motion'

export default function MainHallPage() {
  const results = useProgress((s) => s.quizResults)
  const visited = useProgress((s) => s.visitedStops)

  return (
    <PageTransition className="container-prose py-16">
      <AnimatedHeading
        eyebrow="главный зал"
        text="Выберите маршрут"
        className="text-5xl md:text-7xl text-parchment-50"
      />
      <p className="mt-6 max-w-2xl text-parchment-100/75">
        Три экскурсии можно проходить в любом порядке, но они выстроены хронологически —
        каждый следующий зал отвечает на вопросы, поставленные в предыдущем.
      </p>

      <div className="mt-12 space-y-6">
        {excursions.map((e, i) => {
          const r = results[e.id]
          const visitedStops = e.stops.filter((s) => visited[s.id]).length
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
            >
              <Link
                to={`/excursion/${e.id}`}
                className="group relative block overflow-hidden rounded-3xl border border-parchment-50/10 bg-ink-900/40 p-6 transition hover:border-accent-gold/40 hover:bg-ink-900/70 md:p-10"
              >
                <div
                  className="absolute inset-y-0 right-0 -z-10 w-1/2 opacity-30 transition group-hover:opacity-50"
                  style={{
                    background: `radial-gradient(60% 80% at 70% 50%, ${e.palette.accent}55, transparent 70%)`,
                  }}
                />

                <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xs text-accent-gold/80">
                        Экскурсия №{e.number}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-parchment-100/30" />
                      <span className="font-mono text-xs text-parchment-100/55">{e.period}</span>
                      <span className="h-1 w-1 rounded-full bg-parchment-100/30" />
                      <span className="font-mono text-xs text-parchment-100/55">{e.duration}</span>
                    </div>
                    <h2 className="mt-4 heading-serif text-4xl text-parchment-50 md:text-5xl">
                      {e.title}
                    </h2>
                    <p className="mt-3 text-parchment-100/70">{e.subtitle}</p>
                    <p className="mt-3 text-sm leading-relaxed text-parchment-100/55">
                      {e.summary}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-4 md:items-end">
                    <ProgressRing visited={visitedStops} total={e.stops.length} />
                    {r ? (
                      <div className="text-right text-xs">
                        <div className="font-mono uppercase tracking-[0.2em] text-accent-gold/80">
                          результат теста
                        </div>
                        <div className="mt-1 heading-serif text-2xl text-parchment-50">
                          {r.correct}/{r.total}
                        </div>
                      </div>
                    ) : (
                      <div className="text-right text-[10px] uppercase tracking-[0.25em] text-parchment-100/40">
                        тест ещё не пройден
                      </div>
                    )}
                    <span className="btn-primary">
                      Начать
                      <span className="transition group-hover:translate-x-1">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </PageTransition>
  )
}

function ProgressRing({ visited, total }: { visited: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((visited / total) * 100)
  const c = 2 * Math.PI * 28
  const offset = c - (pct / 100) * c
  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r="28" stroke="rgba(247,241,230,0.1)" strokeWidth="3" fill="none" />
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="#c9a25a"
          strokeWidth="3"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="heading-serif text-lg leading-none text-parchment-50">{visited}</div>
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-parchment-100/40">
            / {total}
          </div>
        </div>
      </div>
    </div>
  )
}
