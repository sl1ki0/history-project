import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState, lazy, Suspense, Fragment } from 'react'
import PageTransition from '../components/PageTransition'
import AnimatedHeading from '../components/AnimatedHeading'
import NarrationControls from '../components/NarrationControls'
import { excursions } from '../content'
import { useProgress } from '../store/progress'
import { AnimatePresence, motion } from 'framer-motion'
import type { TimelineNodeData } from '../three/TimelineScene'

const TimelineScene = lazy(() => import('../three/TimelineScene'))

type StageKind = 'intro' | 'stop' | 'sources'

export default function ExcursionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const excursion = useMemo(() => excursions.find((e) => e.id === id), [id])
  const visitStop = useProgress((s) => s.visitStop)
  const reducedMotion = useMediaPrefersReducedMotion()

  // index 0 = intro, 1..N = stops, N+1 = sources
  const [active, setActive] = useState(0)

  useEffect(() => {
    setActive(0)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [id])

  // Build timeline node descriptors (hook called unconditionally)
  const nodes: TimelineNodeData[] = useMemo(() => {
    if (!excursion) return []
    const stopNodes: TimelineNodeData[] = excursion.stops.map((s) => {
      const year = (s.date.match(/\d{4}/g) || [''])[0]
      return {
        id: s.id,
        label: year || s.date,
        sublabel: shortLabel(s.title),
      }
    })
    return [
      { id: '__intro', label: 'Старт', isVirtual: true },
      ...stopNodes,
      { id: '__sources', label: 'Финал', isVirtual: true },
    ]
  }, [excursion])

  const totalNodes = excursion ? excursion.stops.length + 2 : 0
  const stage: StageKind =
    active === 0 ? 'intro' : active === totalNodes - 1 ? 'sources' : 'stop'
  const stopIndex = active - 1

  // Track visited
  useEffect(() => {
    if (!excursion) return
    if (stage === 'stop') visitStop(excursion.stops[stopIndex].id)
  }, [stage, stopIndex, excursion, visitStop])

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

  const goNext = () => {
    if (active < totalNodes - 1) {
      setActive(active + 1)
    } else {
      navigate(`/excursion/${excursion.id}/quiz`)
    }
  }
  const goPrev = () => {
    if (active > 0) setActive(active - 1)
  }

  return (
    <PageTransition>
      {/* Header strip with title + pill nav */}
      <ExcursionHeader
        excursion={excursion}
        active={active}
        totalNodes={totalNodes}
        setActive={setActive}
      />

      {/* 3D timeline hero */}
      <section className="relative h-[58vh] min-h-[420px] w-full overflow-hidden">
        <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-parchment-100/40">Открываем зал...</div>}>
          <TimelineScene
            nodes={nodes}
            activeIndex={active}
            onSelect={setActive}
            accentColor={excursion.palette.accent}
            reducedMotion={reducedMotion}
          />
        </Suspense>

        {/* Floating active-stage chip top-left */}
        <div className="pointer-events-none absolute left-6 top-6 md:left-10">
          <motion.div
            key={'badge-' + active}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="chip"
          >
            {stage === 'intro' && 'Вступление'}
            {stage === 'stop' &&
              `Остановка ${stopIndex + 1} / ${excursion.stops.length}`}
            {stage === 'sources' && 'Источники'}
          </motion.div>
        </div>

        {/* Floating period top-right */}
        <div className="pointer-events-none absolute right-6 top-6 md:right-10">
          <div className="num-mono rounded-full border border-parchment-50/15 bg-ink-950/40 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-parchment-100/75 backdrop-blur">
            {excursion.period}
          </div>
        </div>

        {/* Bottom hint */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-1.5 text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-parchment-100/45">
            Кликните по любому узлу или используйте кнопки внизу
          </div>
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-accent-gold/40 to-transparent" />
        </div>

        {/* gradient mask to blend into page */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-ink-950" />
      </section>

      {/* Stage content */}
      <AnimatePresence mode="wait">
        {stage === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5 }}
          >
            <IntroStage excursion={excursion} jumpTo={setActive} />
          </motion.div>
        )}
        {stage === 'stop' && (
          <motion.div
            key={'stop-' + stopIndex}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5 }}
          >
            <StopStage excursion={excursion} stopIndex={stopIndex} />
          </motion.div>
        )}
        {stage === 'sources' && (
          <motion.div
            key="sources"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5 }}
          >
            <SourcesStage excursion={excursion} />
          </motion.div>
        )}
      </AnimatePresence>

      <Navigator
        active={active}
        totalNodes={totalNodes}
        onPrev={goPrev}
        onNext={goNext}
        isLast={active === totalNodes - 1}
      />
    </PageTransition>
  )
}

/* ────────── Header strip + pill nav ────────── */

function ExcursionHeader({
  excursion,
  active,
  totalNodes,
  setActive,
}: {
  excursion: (typeof excursions)[number]
  active: number
  totalNodes: number
  setActive: (n: number) => void
}) {
  return (
    <div className="container-prose pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="num-mono text-xs uppercase tracking-[0.25em] text-accent-gold/80">
            Экскурсия №{excursion.number} · {excursion.period}
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
        <StageDot
          active={active === 0}
          label="Вступление"
          onClick={() => setActive(0)}
        />
        {excursion.stops.map((s, i) => (
          <StageDot
            key={s.id}
            active={active === i + 1}
            label={`${i + 1}`}
            title={s.subtopic}
            onClick={() => setActive(i + 1)}
          />
        ))}
        <StageDot
          active={active === totalNodes - 1}
          label="Источники"
          onClick={() => setActive(totalNodes - 1)}
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

/* ────────── Intro stage ────────── */

function IntroStage({
  excursion,
  jumpTo,
}: {
  excursion: (typeof excursions)[number]
  jumpTo: (i: number) => void
}) {
  return (
    <section className="container-prose py-10 md:py-16">
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
            <div className="mb-4 text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              План экскурсии — кликабельный
            </div>
            <ol className="divide-y divide-parchment-50/5">
              {excursion.stops.map((s, i) => (
                <li
                  key={s.id}
                  className="group flex items-baseline gap-5 py-3.5 first:pt-0 last:pb-0"
                >
                  <button
                    onClick={() => jumpTo(i + 1)}
                    className="num-marker w-9 shrink-0 text-2xl text-accent-gold/70 hover:text-accent-gold transition"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </button>
                  <button
                    onClick={() => jumpTo(i + 1)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-[10px] uppercase tracking-[0.22em] text-parchment-100/45">
                      {s.subtopic}
                    </div>
                    <div className="mt-0.5 heading-serif text-[1.05rem] leading-snug text-parchment-50 group-hover:text-accent-gold transition">
                      {s.title}
                    </div>
                  </button>
                  <span className="num-mono shrink-0 text-[11px] uppercase text-parchment-100/55">
                    {s.date}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              Период
            </div>
            <div className="num-display mt-2 text-3xl font-medium text-parchment-50">
              {excursion.period}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              Длительность
            </div>
            <div className="num-display mt-2 text-3xl font-medium text-parchment-50">
              {excursion.duration}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              Темы
            </div>
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

/* ────────── Stop stage ────────── */

function StopStage({
  excursion,
  stopIndex,
}: {
  excursion: (typeof excursions)[number]
  stopIndex: number
}) {
  const stop = excursion.stops[stopIndex]

  return (
    <section className="container-prose py-10 md:py-14">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="chip">{stop.subtopic}</div>
        <div className="num-mono text-[11px] uppercase tracking-[0.18em] text-parchment-100/55">
          Остановка <span className="text-parchment-50">{stopIndex + 1}</span> из{' '}
          {excursion.stops.length} · <span className="text-parchment-50">{stop.date}</span>
        </div>
      </div>

      <AnimatedHeading
        text={stop.title}
        as="h2"
        className="mt-5 text-4xl md:text-6xl text-parchment-50"
      />

      <div className="mt-10 grid gap-10 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {stop.narration.map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.15 + i * 0.1 }}
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

        <aside className="space-y-3">
          <div className="rounded-2xl border border-parchment-50/10 bg-ink-900/40 p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              На таймлайне
            </div>
            <div className="num-display mt-2 text-2xl font-medium text-parchment-50">
              {stop.date}
            </div>
          </div>

          <div className="rounded-2xl border border-parchment-50/10 bg-ink-900/40 p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              Опорный документ
            </div>
            <div className="mt-2 text-sm text-parchment-50 leading-snug">{stop.caption}</div>
          </div>

          <div className="rounded-2xl border border-parchment-50/10 bg-ink-900/40 p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              Контекст
            </div>
            <p className="mt-2 text-sm leading-relaxed text-parchment-100/75">
              {stop.exhibitNote}
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}

/* ────────── Sources stage ────────── */

function SourcesStage({ excursion }: { excursion: (typeof excursions)[number] }) {
  return (
    <section className="container-prose py-12 md:py-16">
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
              <span className="num-mono text-xs text-accent-gold/80">[{s.n}]</span>
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

/* ────────── Sticky navigator ────────── */

function Navigator({
  active,
  totalNodes,
  onPrev,
  onNext,
  isLast,
}: {
  active: number
  totalNodes: number
  onPrev: () => void
  onNext: () => void
  isLast: boolean
}) {
  const pct = ((active + 1) / totalNodes) * 100
  return (
    <div className="sticky bottom-4 z-30 mx-auto mt-12 w-full max-w-5xl px-6 md:px-10">
      <div className="glass flex items-center justify-between gap-4 rounded-full px-3 py-2">
        <button
          onClick={onPrev}
          disabled={active === 0}
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

/* ────────── Helpers ────────── */

function shortLabel(title: string) {
  // shorten long titles for the floating sublabel
  const max = 28
  if (title.length <= max) return title
  return title.slice(0, max - 1).trim() + '…'
}

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
