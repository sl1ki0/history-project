import { PIPER_VOICES } from '../hooks/useNarration'
import { useNarrationContext } from '../hooks/NarrationContext'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  text: string
  /** restart speech each time this key changes */
  reKey?: string | number
  autoPlay?: boolean
  /** When true, hide the playback buttons (tour controller drives playback). */
  hidePlayback?: boolean
  /** When true, lock engine/voice selection (used during the auto-tour). */
  lockEngine?: boolean
}

export default function NarrationControls({
  text,
  reKey,
  autoPlay = false,
  hidePlayback = false,
  lockEngine = false,
}: Props) {
  const {
    status,
    supported,
    engine,
    setEngine,
    piperVoice,
    setPiperVoice,
    piperProgress,
    rate,
    setRate,
    volume,
    setVolume,
    speak,
    pause,
    resume,
    stop,
  } = useNarrationContext()
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (!supported) return
    if (hidePlayback) return
    stop()
    if (autoPlay) {
      const t = setTimeout(() => speak(text), 400)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reKey, supported, hidePlayback])

  if (!supported) {
    return (
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-parchment-100/40">
        <Dot /> Аудиогид недоступен в этом браузере
      </div>
    )
  }

  const isLoading = status === 'loading'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!hidePlayback && !isLoading && status !== 'speaking' && (
          <button
            onClick={() => (status === 'paused' ? resume() : speak(text))}
            className="btn-ghost"
          >
            <PlayIcon /> {status === 'paused' ? 'Продолжить' : 'Озвучить'}
          </button>
        )}
        {!hidePlayback && status === 'speaking' && (
          <button onClick={pause} className="btn-ghost">
            <PauseIcon /> Пауза
          </button>
        )}
        {!hidePlayback && (status === 'speaking' || status === 'paused') && (
          <button onClick={stop} className="btn-ghost">
            <StopIcon /> Стоп
          </button>
        )}
        {!hidePlayback && isLoading && (
          <button disabled className="btn-ghost opacity-70">
            <Spinner />{' '}
            {piperProgress !== null
              ? `Загружаем голос ${piperProgress}%`
              : 'Готовим речь...'}
          </button>
        )}

        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className={`btn-ghost ${settingsOpen ? 'border-accent-gold/40 text-accent-gold' : ''}`}
          aria-label="Настройки голоса"
          title="Голос и скорость"
        >
          <GearIcon />
          <span className="hidden md:inline">Голос</span>
        </button>

        <div className="ml-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-parchment-100/40">
          <Dot pulse={status === 'speaking'} />
          {labelForStatus(status, engine, piperProgress)}
        </div>
      </div>

      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-2xl border border-parchment-50/10 bg-ink-900/50 p-4">
              <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
                Голос экскурсовода
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <EngineCard
                  active={engine === 'webspeech'}
                  onClick={() => !lockEngine && setEngine('webspeech')}
                  title="Системный"
                  desc="Голос ОС/браузера · мгновенно"
                  disabled={lockEngine}
                />
                <EngineCard
                  active={engine === 'piper'}
                  onClick={() => !lockEngine && setEngine('piper')}
                  title="Студийный (нейросеть)"
                  desc="Piper VITS · модель ~60 МБ, загружается один раз и кешируется"
                  premium
                  disabled={lockEngine}
                />
              </div>

              {engine === 'piper' && (
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-parchment-100/55">
                    Тембр
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                    {PIPER_VOICES.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => !lockEngine && setPiperVoice(v.id)}
                        disabled={lockEngine}
                        className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                          piperVoice === v.id
                            ? 'border-accent-gold bg-accent-gold/15 text-parchment-50'
                            : 'border-parchment-50/10 text-parchment-100/70 hover:border-parchment-50/30'
                        } ${lockEngine ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="font-medium">{v.label}</div>
                        <div className="text-[10px] uppercase tracking-wider text-parchment-100/45">
                          {v.gender === 'female' ? 'женский' : 'мужской'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <div className="flex items-baseline justify-between">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-parchment-100/55">
                    Скорость речи
                  </div>
                  <div className="num-mono text-xs text-parchment-50">
                    {rate.toFixed(2)}×
                  </div>
                </div>
                <input
                  type="range"
                  min={0.7}
                  max={1.3}
                  step={0.05}
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="mt-2 w-full accent-accent-gold"
                />
              </div>

              <div className="mt-4">
                <div className="flex items-baseline justify-between">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-parchment-100/55">
                    Громкость
                  </div>
                  <div className="num-mono text-xs text-parchment-50">
                    {Math.round(volume * 100)}%
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="mt-2 w-full accent-accent-gold"
                />
              </div>

              {lockEngine && (
                <div className="mt-3 rounded-xl border border-accent-gold/25 bg-accent-gold/5 px-3 py-2 text-[11px] leading-relaxed text-parchment-100/70">
                  Во время автогида выбор голоса заблокирован — он зафиксирован
                  пред-сгенерированной озвучкой.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EngineCard({
  active,
  onClick,
  title,
  desc,
  premium,
  disabled,
}: {
  active: boolean
  onClick: () => void
  title: string
  desc: string
  premium?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
        active
          ? 'border-accent-gold bg-accent-gold/15'
          : 'border-parchment-50/10 hover:border-parchment-50/30 hover:bg-parchment-50/5'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${active ? 'text-parchment-50' : 'text-parchment-100/90'}`}>
            {title}
          </span>
          {premium && (
            <span className="rounded-full border border-accent-gold/40 bg-accent-gold/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-accent-gold">
              Премиум
            </span>
          )}
        </div>
        <div className="mt-1 text-[11px] text-parchment-100/55">{desc}</div>
      </div>
      <span
        className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
          active ? 'border-accent-gold bg-accent-gold' : 'border-parchment-50/30'
        }`}
      >
        {active && <span className="h-1.5 w-1.5 rounded-full bg-ink-900" />}
      </span>
    </button>
  )
}

function labelForStatus(
  s: string,
  engine: string,
  piperProgress: number | null,
) {
  if (s === 'loading')
    return piperProgress !== null ? `Загрузка модели · ${piperProgress}%` : 'Готовим речь'
  if (s === 'speaking')
    return engine === 'piper' ? 'Студийный голос' : 'Экскурсовод говорит'
  if (s === 'paused') return 'Пауза'
  return engine === 'piper' ? 'Готов · студийный' : 'Готов · системный'
}

function Dot({ pulse = false }: { pulse?: boolean }) {
  return (
    <span
      className={`grid h-1.5 w-1.5 place-items-center rounded-full ${
        pulse
          ? 'bg-accent-gold animate-pulse shadow-[0_0_10px_2px_rgba(201,162,90,0.6)]'
          : 'bg-parchment-100/30'
      }`}
    />
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  )
}
function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" />
    </svg>
  )
}
function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
