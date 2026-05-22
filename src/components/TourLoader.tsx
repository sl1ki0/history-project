import { motion } from 'framer-motion'

interface Props {
  /** 0..1 */
  progress: number
  /** human label for the currently-prepared step */
  currentLabel?: string
  /** count of generated segments / total */
  done: number
  total: number
  /** optional voice-model download progress (Piper download), 0..100 */
  modelProgress?: number | null
  /** «Системный» / «Студийный» — appears in subtitle */
  engineLabel: string
  /** Cancel callback */
  onCancel: () => void
}

/**
 * Full-screen «Готовим вашу экскурсию» overlay.
 *
 * Shown while we pre-generate the audio for every step. The ring fills as
 * paragraphs are rendered, and the current step name slides in below.
 */
export default function TourLoader({
  progress,
  currentLabel,
  done,
  total,
  modelProgress,
  engineLabel,
  onCancel,
}: Props) {
  const pct = Math.round(progress * 100)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="fixed inset-0 z-[100] grid place-items-center"
      style={{
        background:
          'radial-gradient(60% 60% at 50% 40%, rgba(28,37,65,0.65) 0%, rgba(7,6,5,0.92) 70%, rgba(7,6,5,0.98) 100%)',
        backdropFilter: 'blur(14px)',
      }}
    >
      {/* drifting golden specks */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-[2px] w-[2px] rounded-full bg-accent-gold/70"
            style={{
              left: `${(i * 53) % 100}%`,
              top: `${(i * 31) % 100}%`,
              boxShadow: '0 0 12px 2px rgba(201,162,90,0.45)',
            }}
            animate={{
              y: [-8, 8, -8],
              opacity: [0.25, 0.9, 0.25],
            }}
            transition={{
              duration: 6 + (i % 5),
              repeat: Infinity,
              delay: i * 0.13,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <div className="relative flex max-w-xl flex-col items-center gap-6 px-5 text-center sm:gap-8 sm:px-8">
        {/* eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-[10px] uppercase tracking-[0.35em] text-accent-gold/80"
        >
          Аудиоэкскурсия · {engineLabel}
        </motion.div>

        {/* main ring */}
        <div className="relative h-36 w-36 sm:h-44 sm:w-44">
          {/* outer faint ring */}
          <div className="absolute inset-0 rounded-full border border-parchment-50/8" />
          {/* dotted middle */}
          <motion.div
            className="absolute inset-3 rounded-full border border-dashed border-accent-gold/25"
            animate={{ rotate: 360 }}
            transition={{ duration: 22, ease: 'linear', repeat: Infinity }}
          />
          {/* progress arc */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="rgba(201,162,90,0.12)"
              strokeWidth="2"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#c9a25a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 46}
              animate={{
                strokeDashoffset: 2 * Math.PI * 46 * (1 - progress),
              }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{
                filter: 'drop-shadow(0 0 6px rgba(201,162,90,0.5))',
              }}
            />
          </svg>
          {/* center number */}
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center">
              <div className="num-display text-4xl font-medium text-parchment-50 sm:text-5xl">
                {pct}%
              </div>
              <div className="num-mono mt-1 text-[10px] uppercase tracking-[0.3em] text-parchment-100/45">
                {done} / {total}
              </div>
            </div>
          </div>
        </div>

        {/* headline */}
        <div className="space-y-2">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="heading-serif text-2xl text-parchment-50 sm:text-3xl md:text-4xl"
          >
            Готовим вашу экскурсию
          </motion.h2>
          <p className="text-xs leading-relaxed text-parchment-100/65 sm:text-sm">
            Мы заранее озвучиваем каждую остановку, чтобы рассказ шёл без пауз
            на генерацию. Это займёт чуть-чуть времени.
          </p>
        </div>

        {/* current segment label */}
        <div className="min-h-[42px] w-full max-w-md">
          {modelProgress !== null && modelProgress !== undefined ? (
            <motion.div
              key="model"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-accent-gold/20 bg-accent-gold/5 px-4 py-2 text-xs text-parchment-100/80"
            >
              Скачиваем нейросетевой голос · {modelProgress}%
            </motion.div>
          ) : currentLabel ? (
            <motion.div
              key={currentLabel}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-xl border border-parchment-50/10 bg-ink-900/60 px-4 py-2"
            >
              <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/70">
                Сейчас
              </div>
              <div className="mt-0.5 text-sm text-parchment-50 leading-snug">
                {currentLabel}
              </div>
            </motion.div>
          ) : null}
        </div>

        {/* progress strip */}
        <div className="w-full max-w-md">
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-parchment-50/10">
            <motion.div
              className="h-full rounded-full bg-accent-gold"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>

        <button
          onClick={onCancel}
          className="text-[11px] uppercase tracking-[0.25em] text-parchment-100/45 hover:text-parchment-100/85 transition"
        >
          Отмена
        </button>
      </div>
    </motion.div>
  )
}
