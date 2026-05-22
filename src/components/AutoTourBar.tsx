import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNarrationContext } from '../hooks/NarrationContext'

interface Props {
  /** human label of the current step, e.g. «Остановка 2 / 5 · Шоковая терапия» */
  stageLabel: string
  /** small subtitle — e.g. «Озвучивает Дмитрий» */
  subline?: string
  /** Stops the tour. */
  onExit: () => void
  /** Is narrator currently mid-transition (between stops). */
  transitioning?: boolean
}

/**
 * Sticky control bar shown while the auto-tour is active. The user can only
 * change volume / speed and end the tour — stop navigation is intentionally
 * disabled.
 */
export default function AutoTourBar({
  stageLabel,
  subline,
  onExit,
  transitioning = false,
}: Props) {
  const { rate, setRate, volume, setVolume, status } = useNarrationContext()
  const [mobileExpanded, setMobileExpanded] = useState(false)

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 bottom-3 z-40 mx-auto w-full max-w-3xl px-3 sm:bottom-4 sm:px-4"
    >
      <div className="glass rounded-2xl border border-accent-gold/20 px-3 py-3 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)] sm:px-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* left: pulse + label */}
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative grid h-2.5 w-2.5 shrink-0 place-items-center">
              <span
                className={`absolute inset-0 rounded-full ${
                  transitioning ? 'bg-parchment-100/40' : 'bg-accent-gold'
                } ${status === 'speaking' ? 'animate-pulse' : ''}`}
                style={{
                  boxShadow:
                    status === 'speaking'
                      ? '0 0 14px 3px rgba(201,162,90,0.55)'
                      : undefined,
                }}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] uppercase tracking-[0.32em] text-accent-gold/70">
                Аудиоэкскурсия
              </div>
              <div className="truncate text-sm text-parchment-50">
                {stageLabel}
              </div>
              {subline && (
                <div className="truncate text-[10px] uppercase tracking-[0.18em] text-parchment-100/45">
                  {subline}
                </div>
              )}
            </div>

            {/* mobile: settings toggle */}
            <button
              type="button"
              onClick={() => setMobileExpanded((v) => !v)}
              aria-label={mobileExpanded ? 'Скрыть управление' : 'Громкость и скорость'}
              aria-expanded={mobileExpanded}
              className="ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-parchment-50/15 text-parchment-100/70 transition hover:border-accent-gold/40 hover:text-accent-gold md:hidden"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </button>

            {/* mobile: exit button */}
            <button
              onClick={onExit}
              className="shrink-0 rounded-full border border-parchment-50/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-parchment-100/80 transition hover:border-accent-gold/60 hover:text-accent-gold md:hidden"
              title="Завершить аудиоэкскурсию"
            >
              Стоп
            </button>
          </div>

          {/* spacer */}
          <div className="hidden md:block md:flex-1" />

          {/* desktop: volume + speed */}
          <div className="hidden items-center gap-4 md:flex">
            <Slider
              label="Громкость"
              iconLeft={<VolumeIcon />}
              value={volume}
              min={0}
              max={1}
              step={0.05}
              onChange={setVolume}
              display={`${Math.round(volume * 100)}%`}
            />
            <Slider
              label="Скорость"
              iconLeft={<GaugeIcon />}
              value={rate}
              min={0.7}
              max={1.3}
              step={0.05}
              onChange={setRate}
              display={`${rate.toFixed(2)}×`}
            />
            <button
              onClick={onExit}
              className="ml-1 rounded-full border border-parchment-50/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-parchment-100/80 hover:border-accent-gold/60 hover:text-accent-gold transition"
              title="Завершить аудиоэкскурсию"
            >
              Завершить
            </button>
          </div>
        </div>

        {/* mobile: expandable controls */}
        <AnimatePresence>
          {mobileExpanded && (
            <motion.div
              key="mobile-controls"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden md:hidden"
            >
              <div className="mt-3 space-y-3 border-t border-parchment-50/10 pt-3">
                <FullSlider
                  label="Громкость"
                  iconLeft={<VolumeIcon />}
                  value={volume}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={setVolume}
                  display={`${Math.round(volume * 100)}%`}
                />
                <FullSlider
                  label="Скорость"
                  iconLeft={<GaugeIcon />}
                  value={rate}
                  min={0.7}
                  max={1.3}
                  step={0.05}
                  onChange={setRate}
                  display={`${rate.toFixed(2)}×`}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function Slider({
  label,
  iconLeft,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string
  iconLeft: React.ReactNode
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  display: string
}) {
  return (
    <label className="flex items-center gap-2" title={label}>
      <span className="text-parchment-100/55">{iconLeft}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
        className="h-1 w-20 accent-accent-gold md:w-24"
      />
      <span className="num-mono w-10 text-right text-[10px] text-parchment-100/65">
        {display}
      </span>
    </label>
  )
}

function FullSlider({
  label,
  iconLeft,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string
  iconLeft: React.ReactNode
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  display: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-parchment-100/55">
          <span className="text-parchment-100/55">{iconLeft}</span>
          {label}
        </span>
        <span className="num-mono text-[11px] text-parchment-50">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
        className="w-full accent-accent-gold"
      />
    </div>
  )
}

function VolumeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}
function GaugeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 14l4-4" />
      <path d="M3 12a9 9 0 1 1 18 0" />
      <circle cx="12" cy="14" r="1" fill="currentColor" />
    </svg>
  )
}
