import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
  Fragment,
} from 'react'
import PageTransition from '../components/PageTransition'
import AnimatedHeading from '../components/AnimatedHeading'
import NarrationControls from '../components/NarrationControls'
import TourLoader from '../components/TourLoader'
import AutoTourBar from '../components/AutoTourBar'
import { NarrationProvider, useNarrationContext } from '../hooks/NarrationContext'
import { PIPER_VOICES, type NarrationSegment } from '../hooks/useNarration'
import { excursions } from '../content'
import { useProgress } from '../store/progress'
import { AnimatePresence, motion } from 'framer-motion'
import type { TimelineNodeData } from '../three/TimelineScene'

const TimelineScene = lazy(() => import('../three/TimelineScene'))

type StageKind = 'intro' | 'stop' | 'sources'

/** Tour FSM phases. */
type TourPhase =
  | 'idle'
  | 'preparing'
  | 'reading'
  | 'awaiting-transition'
  | 'transitioning'
  | 'awaiting-arrival'
  | 'arrived'
  | 'finished'

/** ms to wait after narration ends before scrolling up to the timeline. */
const POST_READING_DELAY = 900
/** ms to wait after camera arrives before scrolling down to the text. */
const POST_ARRIVAL_DELAY = 450
/** Failsafe: how long we wait for the camera to fire `onArrived` before giving up. */
const CAMERA_TIMEOUT_MS = 4000

export default function ExcursionPage() {
  return (
    <NarrationProvider>
      <ExcursionPageInner />
    </NarrationProvider>
  )
}

function ExcursionPageInner() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const excursion = useMemo(() => excursions.find((e) => e.id === id), [id])
  const visitStop = useProgress((s) => s.visitStop)
  const reducedMotion = useMediaPrefersReducedMotion()

  const narration = useNarrationContext()

  // index 0 = intro, 1..N = stops, N+1 = sources
  const [active, setActive] = useState(0)

  /* ─────────── Tour state ─────────── */

  const [tourPhase, setTourPhase] = useState<TourPhase>('idle')
  const [tourPrep, setTourPrep] = useState<{ done: number; total: number; currentLabel?: string }>(
    { done: 0, total: 0 },
  )
  /** Run-id so async tour effects can detect cancellation. */
  const tourRunIdRef = useRef(0)
  /** Resolver for the in-flight «camera arrived» promise. */
  const arrivalResolverRef = useRef<((idx: number) => void) | null>(null)

  const tourActive = tourPhase !== 'idle' && tourPhase !== 'finished'

  /* ─────────── Refs for scroll targets ─────────── */

  const timelineSectionRef = useRef<HTMLDivElement | null>(null)
  const stageContentRef = useRef<HTMLDivElement | null>(null)

  /* ─────────── On excursion change ─────────── */

  useEffect(() => {
    setActive(0)
    setTourPhase('idle')
    narration.stop()
    window.scrollTo({ top: 0, behavior: 'auto' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  /* ─────────── Build node list (hook called unconditionally) ─────────── */

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

  /* ─────────── Build segment list for the whole tour ─────────── */

  const tourSegmentsByStage = useMemo(() => {
    if (!excursion) return new Map<number, NarrationSegment[]>()
    const map = new Map<number, NarrationSegment[]>()
    // 0 — intro
    map.set(0, [
      { id: `${excursion.id}-intro`, text: excursion.intro },
    ])
    // 1..N — stops, one segment per paragraph
    excursion.stops.forEach((stop, idx) => {
      const segs: NarrationSegment[] = stop.narration.map((p, pi) => ({
        id: `${excursion.id}-${stop.id}-p${pi}`,
        text: stripSourceMarkers(p),
      }))
      map.set(idx + 1, segs)
    })
    // last — sources / outro
    map.set(excursion.stops.length + 1, [
      { id: `${excursion.id}-outro`, text: excursion.outro },
    ])
    return map
  }, [excursion])

  const allTourSegments = useMemo(() => {
    if (!excursion) return [] as NarrationSegment[]
    const flat: NarrationSegment[] = []
    for (let i = 0; i < totalNodes; i++) {
      const arr = tourSegmentsByStage.get(i)
      if (arr) flat.push(...arr)
    }
    return flat
  }, [excursion, totalNodes, tourSegmentsByStage])

  /* ─────────── Helpers: scroll & camera arrival ─────────── */

  const scrollToTimeline = useCallback(() => {
    const el = timelineSectionRef.current
    if (!el) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const top = el.getBoundingClientRect().top + window.scrollY - 8
    window.scrollTo({ top, behavior: 'smooth' })
  }, [])

  const scrollToContent = useCallback(() => {
    const el = stageContentRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 16
    window.scrollTo({ top, behavior: 'smooth' })
  }, [])

  const awaitCameraArrival = useCallback(
    (targetIndex: number) =>
      new Promise<void>((resolve) => {
        let settled = false
        const settle = () => {
          if (settled) return
          settled = true
          arrivalResolverRef.current = null
          clearTimeout(failsafe)
          resolve()
        }
        arrivalResolverRef.current = (idx: number) => {
          if (idx === targetIndex) settle()
        }
        // Failsafe in case the canvas isn't rendering / arrival never fires.
        const failsafe = setTimeout(settle, CAMERA_TIMEOUT_MS)
      }),
    [],
  )

  const handleCameraArrived = useCallback((idx: number) => {
    arrivalResolverRef.current?.(idx)
  }, [])

  /* ─────────── Tour orchestration ─────────── */

  const finishTour = useCallback(() => {
    tourRunIdRef.current += 1
    narration.stop()
    setTourPhase('idle')
  }, [narration])

  const runStageNarration = useCallback(
    async (stageIndex: number, runId: number) => {
      const segments = tourSegmentsByStage.get(stageIndex)
      if (!segments || segments.length === 0) return false
      setTourPhase('reading')
      let completed = false
      let cancelled = false
      await narration.playSequence(segments, {
        onComplete: () => {
          completed = true
        },
        onCancel: () => {
          cancelled = true
        },
      })
      if (tourRunIdRef.current !== runId) return false
      if (cancelled && !completed) return false
      return true
    },
    [narration, tourSegmentsByStage],
  )

  const sleepCancellable = useCallback(
    (ms: number, runId: number) =>
      new Promise<boolean>((resolve) => {
        const t = setTimeout(() => {
          resolve(tourRunIdRef.current === runId)
        }, ms)
        // we don't really need to clear: stop() bumps runId, the resolved
        // boolean will return false and the loop will bail
        void t
      }),
    [],
  )

  const runTour = useCallback(
    async (startIndex: number) => {
      if (!excursion) return
      const runId = ++tourRunIdRef.current
      let cursor = startIndex
      const last = totalNodes - 1

      while (cursor <= last) {
        if (tourRunIdRef.current !== runId) return

        // Make sure the right stage is visible & content is in view
        if (cursor !== active) setActive(cursor)
        // small delay to let stage content mount + animate
        await new Promise((r) => setTimeout(r, 320))
        if (tourRunIdRef.current !== runId) return
        scrollToContent()

        const ok = await runStageNarration(cursor, runId)
        if (tourRunIdRef.current !== runId) return
        if (!ok) {
          // playback was cancelled mid-way — bail without finishing the tour
          return
        }

        if (cursor === last) {
          setTourPhase('finished')
          // gentle dwell so user sees the sources for a moment
          await new Promise((r) => setTimeout(r, 1200))
          return
        }

        // ─── Inter-stage transition ───
        setTourPhase('awaiting-transition')
        const ok1 = await sleepCancellable(POST_READING_DELAY, runId)
        if (!ok1) return

        setTourPhase('transitioning')
        scrollToTimeline()
        // wait for scroll to settle a bit before nudging the camera
        await new Promise((r) => setTimeout(r, 350))
        if (tourRunIdRef.current !== runId) return

        const nextIdx = cursor + 1
        setActive(nextIdx)
        setTourPhase('awaiting-arrival')
        await awaitCameraArrival(nextIdx)
        if (tourRunIdRef.current !== runId) return

        setTourPhase('arrived')
        const ok2 = await sleepCancellable(POST_ARRIVAL_DELAY, runId)
        if (!ok2) return

        cursor = nextIdx
      }
    },
    [
      active,
      awaitCameraArrival,
      excursion,
      runStageNarration,
      scrollToContent,
      scrollToTimeline,
      sleepCancellable,
      totalNodes,
    ],
  )

  /* ─────────── Tour prepare + start ─────────── */

  const startTour = useCallback(async () => {
    if (!excursion) return
    setTourPhase('preparing')
    setTourPrep({ done: 0, total: allTourSegments.length })
    try {
      await narration.prepareSequence(allTourSegments, (done, total, currentId) => {
        const label = humanLabelForSegmentId(currentId, excursion)
        setTourPrep({ done, total, currentLabel: label })
      })
    } catch (e) {
      console.warn('[Tour] prepare failed', e)
      setTourPhase('idle')
      return
    }
    if (active !== 0) setActive(0)
    // tiny breath before we launch
    await new Promise((r) => setTimeout(r, 400))
    runTour(0)
  }, [allTourSegments, excursion, narration, runTour, active])

  /* ─────────── Cancel on unmount ─────────── */

  useEffect(() => {
    return () => {
      tourRunIdRef.current += 1
      narration.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ─────────── Render ─────────── */

  if (!excursion) {
    return (
      <div className="container-prose py-24 text-center text-parchment-100/70 sm:py-40">
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

  const stageLabel =
    stage === 'intro'
      ? 'Вступление'
      : stage === 'sources'
        ? 'Финал · источники'
        : `Остановка ${stopIndex + 1} / ${excursion.stops.length} · ${excursion.stops[stopIndex].subtopic}`

  const voiceLabel =
    narration.engine === 'piper'
      ? PIPER_VOICES.find((v) => v.id === narration.piperVoice)?.label || 'Студийный'
      : 'Системный голос'

  return (
    <PageTransition>
      {/* Loader overlay during pre-generation */}
      <AnimatePresence>
        {tourPhase === 'preparing' && (
          <TourLoader
            progress={
              tourPrep.total > 0 ? tourPrep.done / tourPrep.total : 0
            }
            currentLabel={tourPrep.currentLabel}
            done={tourPrep.done}
            total={tourPrep.total}
            modelProgress={narration.piperProgress}
            engineLabel={
              narration.engine === 'piper' ? `Piper · ${voiceLabel}` : 'Системный'
            }
            onCancel={finishTour}
          />
        )}
      </AnimatePresence>

      <ExcursionHeader
        excursion={excursion}
        active={active}
        totalNodes={totalNodes}
        setActive={setActive}
        locked={tourActive}
      />

      {/* 3D timeline hero */}
      <section
        ref={timelineSectionRef}
        className="relative h-[42vh] min-h-[280px] w-full overflow-hidden sm:h-[50vh] sm:min-h-[360px] md:h-[58vh] md:min-h-[420px]"
      >
        <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-parchment-100/40">Открываем зал...</div>}>
          <TimelineScene
            nodes={nodes}
            activeIndex={active}
            onSelect={(i) => !tourActive && setActive(i)}
            accentColor={excursion.palette.accent}
            reducedMotion={reducedMotion}
            selectable={!tourActive}
            onCameraArrived={handleCameraArrived}
          />
        </Suspense>

        <div className="pointer-events-none absolute left-4 top-4 sm:left-6 sm:top-6 md:left-10">
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

        <div className="pointer-events-none absolute right-4 top-4 sm:right-6 sm:top-6 md:right-10">
          <div className="num-mono rounded-full border border-parchment-50/15 bg-ink-950/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-parchment-100/75 backdrop-blur sm:px-3">
            {excursion.period}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-1.5 px-4 text-center">
          <div className="text-[9px] uppercase tracking-[0.25em] text-parchment-100/45 sm:text-[10px] sm:tracking-[0.3em]">
            {tourActive
              ? 'Аудиоэкскурсия идёт — навигация заблокирована'
              : 'Кликните по узлу или используйте кнопки внизу'}
          </div>
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-accent-gold/40 to-transparent" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-ink-950" />
      </section>

      {/* Stage content */}
      <div ref={stageContentRef} className="pb-24 sm:pb-16">
        <AnimatePresence mode="wait">
          {stage === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
            >
              <IntroStage
                excursion={excursion}
                jumpTo={setActive}
                onStartTour={startTour}
                tourActive={tourActive}
              />
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
              <StopStage
                excursion={excursion}
                stopIndex={stopIndex}
                tourActive={tourActive}
              />
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
      </div>

      {/* Standard navigator (hidden during tour) */}
      {!tourActive && (
        <Navigator
          active={active}
          totalNodes={totalNodes}
          onPrev={goPrev}
          onNext={goNext}
          isLast={active === totalNodes - 1}
        />
      )}

      {/* Auto-tour control bar */}
      <AnimatePresence>
        {tourActive && (
          <AutoTourBar
            stageLabel={stageLabel}
            subline={`Озвучивает: ${voiceLabel}`}
            onExit={finishTour}
            transitioning={
              tourPhase === 'transitioning' ||
              tourPhase === 'awaiting-arrival' ||
              tourPhase === 'arrived' ||
              tourPhase === 'awaiting-transition'
            }
          />
        )}
      </AnimatePresence>
    </PageTransition>
  )
}

/* ────────── Header strip + pill nav ────────── */

function ExcursionHeader({
  excursion,
  active,
  totalNodes,
  setActive,
  locked,
}: {
  excursion: (typeof excursions)[number]
  active: number
  totalNodes: number
  setActive: (n: number) => void
  locked: boolean
}) {
  return (
    <div className="container-prose pt-4 sm:pt-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4">
        <div className="min-w-0">
          <div className="num-mono text-[11px] uppercase tracking-[0.2em] text-accent-gold/80 sm:text-xs sm:tracking-[0.25em]">
            Экскурсия №{excursion.number} · {excursion.period}
          </div>
          <h1 className="mt-1 heading-serif text-2xl text-parchment-50 sm:text-3xl md:text-4xl">
            {excursion.title}
          </h1>
        </div>
        <Link
          to="/hall"
          className={`btn-ghost self-start md:self-auto ${locked ? 'pointer-events-none opacity-40' : ''}`}
        >
          ← К списку залов
        </Link>
      </div>

      <div className="mt-5 flex items-center gap-1 overflow-x-auto pb-2 sm:mt-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <StageDot
          active={active === 0}
          label="Вступление"
          disabled={locked}
          onClick={() => !locked && setActive(0)}
        />
        {excursion.stops.map((s, i) => (
          <StageDot
            key={s.id}
            active={active === i + 1}
            label={`${i + 1}`}
            title={s.subtopic}
            disabled={locked}
            onClick={() => !locked && setActive(i + 1)}
          />
        ))}
        <StageDot
          active={active === totalNodes - 1}
          label="Источники"
          disabled={locked}
          onClick={() => !locked && setActive(totalNodes - 1)}
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
  disabled,
  onClick,
}: {
  active: boolean
  label: string
  title?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] transition ${
        active
          ? 'border-accent-gold bg-accent-gold/20 text-parchment-50'
          : 'border-parchment-50/10 text-parchment-100/55 hover:border-parchment-50/30 hover:text-parchment-100'
      } ${disabled ? 'cursor-not-allowed opacity-40 hover:border-parchment-50/10 hover:text-parchment-100/55' : ''}`}
    >
      {label}
    </button>
  )
}

/* ────────── Intro stage ────────── */

function IntroStage({
  excursion,
  jumpTo,
  onStartTour,
  tourActive,
}: {
  excursion: (typeof excursions)[number]
  jumpTo: (i: number) => void
  onStartTour: () => void
  tourActive: boolean
}) {
  return (
    <section className="container-prose py-8 sm:py-10 md:py-16">
      <AnimatedHeading
        eyebrow={excursion.subtitle}
        text={excursion.title}
        className="text-4xl sm:text-5xl md:text-7xl text-parchment-50"
      />

      <div className="mt-8 grid gap-6 sm:mt-10 sm:gap-8 md:grid-cols-3">
        <div className="space-y-5 sm:space-y-6 md:col-span-2">
          {/* CTA: launch the auto-tour */}
          <AutoTourCTA onStart={onStartTour} disabled={tourActive} />

          <div className="rounded-2xl border border-parchment-50/10 p-5 sm:p-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              Цель экскурсии
            </div>
            <p className="mt-2 text-sm leading-relaxed text-parchment-100/85 sm:text-base">{excursion.goal}</p>
          </div>

          <div className="rounded-2xl border border-parchment-50/10 p-5 sm:p-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              Слово экскурсовода
            </div>
            <p className="mt-3 text-base leading-relaxed text-parchment-50 sm:text-lg">{excursion.intro}</p>
            <div className="mt-4">
              <NarrationControls
                text={excursion.intro}
                reKey={`intro-${excursion.id}`}
                hidePlayback={tourActive}
                lockEngine={tourActive}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-parchment-50/10 p-5 sm:p-6">
            <div className="mb-3 text-[10px] uppercase tracking-[0.25em] text-accent-gold/80 sm:mb-4">
              План экскурсии — кликабельный
            </div>
            <ol className="divide-y divide-parchment-50/5">
              {excursion.stops.map((s, i) => (
                <li
                  key={s.id}
                  className="group flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0 sm:flex-nowrap sm:gap-5 sm:py-3.5"
                >
                  <button
                    onClick={() => !tourActive && jumpTo(i + 1)}
                    disabled={tourActive}
                    className="num-marker w-9 shrink-0 text-2xl text-accent-gold/70 hover:text-accent-gold transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </button>
                  <button
                    onClick={() => !tourActive && jumpTo(i + 1)}
                    disabled={tourActive}
                    className="order-3 w-full min-w-0 text-left disabled:cursor-not-allowed sm:order-none sm:w-auto sm:flex-1"
                  >
                    <div className="text-[10px] uppercase tracking-[0.22em] text-parchment-100/45">
                      {s.subtopic}
                    </div>
                    <div className="mt-0.5 heading-serif text-base leading-snug text-parchment-50 group-hover:text-accent-gold transition sm:text-[1.05rem]">
                      {s.title}
                    </div>
                  </button>
                  <span className="num-mono ml-auto shrink-0 text-[11px] uppercase text-parchment-100/55 sm:ml-0">
                    {s.date}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <aside className="grid grid-cols-2 gap-3 sm:gap-4 md:flex md:flex-col md:space-y-0">
          <div className="glass rounded-2xl p-4 sm:p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              Период
            </div>
            <div className="num-display mt-2 text-xl font-medium text-parchment-50 sm:text-2xl md:text-3xl">
              {excursion.period}
            </div>
          </div>
          <div className="glass rounded-2xl p-4 sm:p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              Длительность
            </div>
            <div className="num-display mt-2 text-xl font-medium text-parchment-50 sm:text-2xl md:text-3xl">
              {excursion.duration}
            </div>
          </div>
          <div className="glass col-span-2 rounded-2xl p-4 sm:p-5 md:col-span-1">
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

function AutoTourCTA({ onStart, disabled }: { onStart: () => void; disabled: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="relative overflow-hidden rounded-2xl border border-accent-gold/30 bg-gradient-to-br from-accent-gold/15 via-ink-900/40 to-ink-950 p-5 sm:p-6"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-40"
        style={{
          background:
            'radial-gradient(circle, rgba(201,162,90,0.5) 0%, rgba(201,162,90,0) 70%)',
        }}
      />
      <div className="relative flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-accent-gold/85">
            Новый формат
          </div>
          <div className="heading-serif mt-1 text-xl text-parchment-50 sm:text-2xl md:text-3xl">
            Прослушать экскурсию целиком
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-parchment-100/75">
            Мы заранее озвучим каждую остановку и проведём вас по ним
            автоматически: камера сама перелетает к следующей точке, а текст
            появляется ровно тогда, когда вы к нему готовы.
          </p>
        </div>
        <button
          onClick={onStart}
          disabled={disabled}
          className="btn-primary w-full shrink-0 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
        >
          <HeadphonesIcon /> Запустить аудиоэкскурсию
        </button>
      </div>
    </motion.div>
  )
}

function HeadphonesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}

/* ────────── Stop stage ────────── */

function StopStage({
  excursion,
  stopIndex,
  tourActive,
}: {
  excursion: (typeof excursions)[number]
  stopIndex: number
  tourActive: boolean
}) {
  const stop = excursion.stops[stopIndex]

  return (
    <section className="container-prose py-8 sm:py-10 md:py-14">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <div className="chip">{stop.subtopic}</div>
        <div className="num-mono text-[11px] uppercase tracking-[0.18em] text-parchment-100/55">
          Остановка <span className="text-parchment-50">{stopIndex + 1}</span> из{' '}
          {excursion.stops.length} · <span className="text-parchment-50">{stop.date}</span>
        </div>
      </div>

      <AnimatedHeading
        text={stop.title}
        as="h2"
        className="mt-4 text-3xl sm:text-4xl md:text-6xl text-parchment-50 sm:mt-5"
      />

      <div className="mt-8 grid gap-8 sm:mt-10 sm:gap-10 md:grid-cols-3">
        <div className="space-y-5 sm:space-y-6 md:col-span-2">
          {stop.narration.map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.15 + i * 0.1 }}
              className={`text-sm leading-relaxed sm:text-base md:text-lg ${
                i === 0 ? 'text-parchment-50' : 'text-parchment-100/85'
              }`}
            >
              {renderNarration(p)}
            </motion.p>
          ))}

          <div className="pt-2 sm:pt-4">
            <NarrationControls
              text={stripSourceMarkers(stop.narration.join(' '))}
              reKey={`${excursion.id}-${stop.id}`}
              hidePlayback={tourActive}
              lockEngine={tourActive}
            />
          </div>
        </div>

        <aside className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1">
          <div className="rounded-2xl border border-parchment-50/10 bg-ink-900/40 p-4 sm:p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              На таймлайне
            </div>
            <div className="num-display mt-2 text-xl font-medium text-parchment-50 sm:text-2xl">
              {stop.date}
            </div>
          </div>

          <div className="rounded-2xl border border-parchment-50/10 bg-ink-900/40 p-4 sm:p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              Опорный документ
            </div>
            <div className="mt-2 text-sm leading-snug text-parchment-50">{stop.caption}</div>
          </div>

          <div className="rounded-2xl border border-parchment-50/10 bg-ink-900/40 p-4 sm:p-5">
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
    <section className="container-prose py-8 sm:py-12 md:py-16">
      <div className="chip">источники экскурсии №{excursion.number}</div>
      <AnimatedHeading
        text={`Список источников`}
        as="h2"
        className="mt-4 text-3xl sm:text-4xl md:text-6xl text-parchment-50"
      />
      <p className="mt-4 max-w-2xl text-sm text-parchment-100/70 sm:text-base">{excursion.outro}</p>

      <ol className="mt-8 grid gap-3 sm:mt-10 md:grid-cols-2">
        {excursion.sources.map((s) => (
          <li
            key={s.n}
            className="rounded-2xl border border-parchment-50/10 bg-ink-900/40 p-4 transition hover:border-accent-gold/40 sm:p-5"
          >
            <div className="flex items-baseline gap-2.5 sm:gap-3">
              <span className="num-mono shrink-0 text-xs text-accent-gold/80">[{s.n}]</span>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex min-w-0 items-baseline gap-2 break-words text-parchment-50 hover:text-accent-gold"
              >
                <span className="break-words underline-offset-4 group-hover:underline">{s.title}</span>
                <span className="shrink-0 text-xs">↗</span>
              </a>
            </div>
            {s.publisher && (
              <div className="ml-8 mt-1.5 text-xs uppercase tracking-[0.18em] text-parchment-100/45 sm:ml-9">
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
    <div className="sticky bottom-3 z-30 mx-auto mt-12 w-full max-w-5xl px-3 sm:bottom-4 sm:px-6 md:px-10">
      <div className="glass flex items-center justify-between gap-2 rounded-full p-2 sm:gap-4 sm:px-3">
        <button
          onClick={onPrev}
          disabled={active === 0}
          className="btn-ghost shrink-0 !px-3 !py-2 disabled:cursor-not-allowed disabled:opacity-30 sm:!px-4"
          aria-label="Назад"
        >
          <span aria-hidden>←</span>
          <span className="hidden sm:inline">Назад</span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-parchment-50/10">
            <motion.div
              className="h-full rounded-full bg-accent-gold"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
        <button onClick={onNext} className="btn-primary shrink-0 !px-4 !py-2 sm:!px-6 sm:!py-2.5">
          {isLast ? 'К тесту' : 'Дальше'} <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  )
}

/* ────────── Helpers ────────── */

function shortLabel(title: string) {
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

/** Pretty label for a segment id, used in the loading screen. */
function humanLabelForSegmentId(id: string, excursion: (typeof excursions)[number]): string {
  if (id.endsWith('-intro')) return 'Вступление'
  if (id.endsWith('-outro')) return 'Заключение и источники'
  // pattern: `${excursionId}-${stopId}-p${idx}`
  const m = id.match(/^[^-]+-(.+)-p(\d+)$/)
  if (!m) return id
  const [, stopId, pIdxStr] = m
  const stop = excursion.stops.find((s) => s.id === stopId)
  const pIdx = parseInt(pIdxStr, 10) + 1
  if (!stop) return id
  return `${stop.subtopic} · абзац ${pIdx}`
}
