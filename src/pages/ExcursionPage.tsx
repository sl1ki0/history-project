import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState, lazy, Suspense, Fragment } from 'react'
import PageTransition from '../components/PageTransition'
import AnimatedHeading from '../components/AnimatedHeading'
import NarrationControls from '../components/NarrationControls'
import { excursions } from '../content'
import { useProgress } from '../store/progress'
import { AnimatePresence, motion } from 'framer-motion'

const ArtifactCanvas = lazy(() => import('../three/Artifact'))

type StageKind = 'intro' | 'stop' | 'sources'

interface Stage {
  kind: StageKind
  index: number
  total: number
}

export default function ExcursionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const excursion = useMemo(() => excursions.find((e) => e.id === id), [id])
  const visitStop = useProgress((s) => s.visitStop)

  const [stageIdx, setStageIdx] = useState(0)

  useEffect(() => {
    setStageIdx(0)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [id])

  if (!excursion) {
    return (
      <div className="container-prose py-40 text-center text-parchment-100/70">
        Экскурсия не найдена.{' '}
        <Link to="/hall" className="text-accent-gold underline">
          Вернуться в главный зал
        </Link>
      </div>
    )
  }

  const totalStages = excursion.stops.length + 2
  const stage: Stage = (() => {
    if (stageIdx === 0) return { kind: 'intro', index: 0, total: totalStages }
    if (stageIdx === totalStages - 1) return { kind: 'sources', index: stageIdx, total: totalStages }
    return { kind: 'stop', index: stageIdx - 1, total: totalStages }
  })()

  useEffect(() => {
    if (stage.kind === 'stop') {
      const stop = excursion.stops[stage.index]
      visitStop(stop.id)
    }
  }, [stage.kind, stage.index, excursion, visitStop])

  const next = () => {
    if (stageIdx < totalStages - 1) {
      setStageIdx(stageIdx + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate(`/excursion/${excursion.id}/quiz`)
    }
  }
  const prev = () => {
    if (stageIdx > 0) {
      setStageIdx(stageIdx - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <PageTransition>
      <ExcursionHeader excursion={excursion} stageIdx={stageIdx} totalStages={totalStages} setStage={setStageIdx} />

      <AnimatePresence mode="wait">
        {stage.kind === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.6 }}
          >
            <IntroStage excursion={excursion} />
          </motion.div>
        )}

        {stage.kind === 'stop' && (
          <motion.div
            key={'stop-' + stage.index}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.6 }}
          >
            <StopStage excursion={excursion} stopIndex={stage.index} />
          </motion.div>
        )}

        {stage.kind === 'sources' && (
          <motion.div
            key="sources"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.6 }}
          >
            <SourcesStage excursion={excursion} />
          </motion.div>
        )}
      </AnimatePresence>

      <Navigator
        stageIdx={stageIdx}
        totalStages={totalStages}
        onPrev={prev}
        onNext={next}
        isLast={stageIdx === totalStages - 1}
      />
    </PageTransition>
  )
}

function ExcursionHeader({
  excursion,
  stageIdx,
  totalStages,
  setStage,
}: {
  excursion: (typeof excursions)[number]
  stageIdx: number
  totalStages: number
  setStage: (n: number) => void
}) {
  const stops = excursion.stops
  return (
    <div className="container-prose pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-accent-gold/80">
            Экскурсия № {excursion.number} · {excursion.period}
          </div>
          <h1 className="mt-1 heading-serif text-3xl text-parchment-50 md:text-4xl">
            {excursion.title}
          </h1>
        </div>
        <Link to="/hall" className="btn-ghost self-start md:self-auto">
          ← К списку залов
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-2">
        <StageDot active={stageIdx === 0} label="Вступление" onClick={() => setStage(0)} />
        {stops.map((s, i) => (
          <StageDot
            key={s.id}
            active={stageIdx === i + 1}
            label={`${i + 1}`}
            title={s.subtopic}
            onClick={() => setStage(i + 1)}
          />
        ))}
        <StageDot
          active={stageIdx === totalStages - 1}
          label="Источники"
          onClick={() => setStage(totalStages - 1)}
        />
      </div>
      <div className="gold-divider mt-2" />
    </div>
  )
}

function StageDot({
  active,
  label,
  title,
  onClick,
}: {
  active: boolean
  label: string
  title?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] transition ${
        active
          ? 'border-accent-gold bg-accent-gold/20 text-parchment-50'
          : 'border-parchment-50/10 text-parchment-100/55 hover:border-parchment-50/30 hover:text-parchment-100'
      }`}
    >
      {label}
    </button>
  )
}

function IntroStage({ excursion }: { excursion: (typeof excursions)[number] }) {
  return (
    <section className="container-prose py-12 md:py-20">
      <AnimatedHeading
        eyebrow={excursion.subtitle}
        text={excursion.title}
        className="text-5xl md:text-7xl text-parchment-50"
      />

      <div className="mt-10 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-parchment-50/10 p-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              Цель экскурсии
            </div>
            <p className="mt-2 text-parchment-100/85 leading-relaxed">{excursion.goal}</p>
          </div>

          <div className="rounded-2xl border border-parchment-50/10 p-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              Слово экскурсовода
            </div>
            <p className="mt-3 text-lg leading-relaxed text-parchment-50">{excursion.intro}</p>
            <div className="mt-4">
              <NarrationControls text={excursion.intro} reKey={`intro-${excursion.id}`} />
            </div>
          </div>

          <div className="rounded-2xl border border-parchment-50/10 p-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              План экскурсии
            </div>
            <ol className="mt-3 space-y-3">
              {excursion.stops.map((s, i) => (
                <li
                  key={s.id}
                  className="flex items-start gap-4 border-b border-parchment-50/5 pb-3 last:border-none last:pb-0"
                >
                  <span className="font-mono text-xs text-accent-gold/80">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-parchment-100/45">
                      {s.subtopic}
                    </div>
                    <div className="heading-serif text-lg text-parchment-50">{s.title}</div>
                  </div>
                  <span className="shrink-0 text-xs text-parchment-100/45">{s.date}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">Период</div>
            <div className="mt-1 heading-serif text-2xl text-parchment-50">{excursion.period}</div>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">Длительность</div>
            <div className="mt-1 heading-serif text-2xl text-parchment-50">{excursion.duration}</div>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">Темы</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {excursion.keywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-full border border-parchment-50/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-parchment-100/65"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

function StopStage({
  excursion,
  stopIndex,
}: {
  excursion: (typeof excursions)[number]
  stopIndex: number
}) {
  const stop = excursion.stops[stopIndex]
  const reduced = useMediaPrefersReducedMotion()

  return (
    <section className="container-prose py-10 md:py-16">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="chip">{stop.subtopic}</div>
        <div className="font-mono text-xs text-parchment-100/55">
          Остановка {stopIndex + 1} из {excursion.stops.length} · {stop.date}
        </div>
      </div>

      <AnimatedHeading
        text={stop.title}
        as="h2"
        className="mt-5 text-4xl md:text-6xl text-parchment-50"
      />

      <div className="mt-10 grid gap-10 md:grid-cols-5">
        <div className="md:col-span-3 space-y-6">
          {stop.narration.map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 + i * 0.12 }}
              className={`text-base md:text-lg leading-relaxed ${
                i === 0 ? 'text-parchment-50' : 'text-parchment-100/85'
              }`}
            >
              {renderNarration(p)}
            </motion.p>
          ))}

          <div className="pt-4">
            <NarrationControls
              text={stripSourceMarkers(stop.narration.join(' '))}
              reKey={`${excursion.id}-${stop.id}`}
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="card-exhibit sticky top-28 aspect-[4/5] overflow-hidden"
          >
            <div
              className="absolute inset-0 -z-10"
              style={{
                background: `radial-gradient(60% 70% at 50% 40%, ${excursion.palette.accent}33, transparent 70%)`,
              }}
            />
            <Suspense fallback={null}>
              <ArtifactCanvas
                kind={stop.artifact}
                accentColor={excursion.palette.accent}
                animated={!reduced}
              />
            </Suspense>
            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-ink-950/95 via-ink-950/60 to-transparent px-6 py-5">
              <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
                Экспонат
              </div>
              <div className="mt-1 text-sm text-parchment-50">{stop.caption}</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function SourcesStage({ excursion }: { excursion: (typeof excursions)[number] }) {
  return (
    <section className="container-prose py-12 md:py-20">
      <div className="chip">источники экскурсии №{excursion.number}</div>
      <AnimatedHeading
        text={`Список источников`}
        as="h2"
        className="mt-4 text-4xl md:text-6xl text-parchment-50"
      />
      <p className="mt-4 max-w-2xl text-parchment-100/70">{excursion.outro}</p>

      <ol className="mt-10 grid gap-3 md:grid-cols-2">
        {excursion.sources.map((s) => (
          <li
            key={s.n}
            className="rounded-2xl border border-parchment-50/10 bg-ink-900/40 p-5 transition hover:border-accent-gold/40"
          >
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-accent-gold/80">[{s.n}]</span>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-baseline gap-2 text-parchment-50 hover:text-accent-gold"
              >
                <span className="underline-offset-4 group-hover:underline">{s.title}</span>
                <span className="text-xs">↗</span>
              </a>
            </div>
            {s.publisher && (
              <div className="mt-1.5 ml-9 text-xs uppercase tracking-[0.18em] text-parchment-100/45">
                {s.publisher} · {sourceTypeLabel(s.type)}
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

function Navigator({
  stageIdx,
  totalStages,
  onPrev,
  onNext,
  isLast,
}: {
  stageIdx: number
  totalStages: number
  onPrev: () => void
  onNext: () => void
  isLast: boolean
}) {
  const pct = ((stageIdx + 1) / totalStages) * 100
  return (
    <div className="sticky bottom-4 z-30 mx-auto mt-12 w-full max-w-5xl px-6 md:px-10">
      <div className="glass flex items-center justify-between gap-4 rounded-full px-3 py-2">
        <button
          onClick={onPrev}
          disabled={stageIdx === 0}
          className="btn-ghost disabled:cursor-not-allowed disabled:opacity-30"
        >
          ← Назад
        </button>
        <div className="flex-1">
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-parchment-50/10">
            <motion.div
              className="h-full rounded-full bg-accent-gold"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
        <button onClick={onNext} className="btn-primary">
          {isLast ? 'К тесту' : 'Дальше'} →
        </button>
      </div>
    </div>
  )
}

/* Helpers */

/**
 * Split narrator paragraph into JSX, turning [n] markers into superscripts.
 * Pure JSX — no innerHTML, safe for any input.
 */
function renderNarration(text: string) {
  const pattern = /\[(\d+)\]/g
  const parts: { type: 'text' | 'src'; value: string }[] = []
  let last = 0
  const matches = Array.from(text.matchAll(pattern))
  for (const m of matches) {
    const idx = m.index ?? 0
    if (idx > last) parts.push({ type: 'text', value: text.slice(last, idx) })
    parts.push({ type: 'src', value: m[1] })
    last = idx + m[0].length
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })

  return parts.map((p, i) =>
    p.type === 'text' ? (
      <Fragment key={i}>{p.value}</Fragment>
    ) : (
      <sup key={i} className="ml-0.5 font-mono text-[10px] text-accent-gold/90">
        [{p.value}]
      </sup>
    ),
  )
}

function stripSourceMarkers(text: string) {
  return text.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim()
}

function sourceTypeLabel(t: string) {
  switch (t) {
    case 'official':
      return 'официальный документ'
    case 'archive':
      return 'архивный документ'
    case 'encyclopedia':
      return 'энциклопедия'
    case 'media':
      return 'СМИ / досье'
    case 'book':
      return 'монография'
    default:
      return t
  }
}

function useMediaPrefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}
