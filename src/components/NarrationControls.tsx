import { useNarration } from '../hooks/useNarration'
import { useEffect } from 'react'

interface Props {
  text: string
  /** restart speech each time this key changes */
  reKey?: string | number
  autoPlay?: boolean
}

export default function NarrationControls({ text, reKey, autoPlay = false }: Props) {
  const { status, supported, speak, pause, resume, stop } = useNarration()

  useEffect(() => {
    if (!supported) return
    stop()
    if (autoPlay) {
      const t = setTimeout(() => speak(text), 400)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reKey, supported])

  // stop speech on unmount
  useEffect(() => () => stop(), [stop])

  if (!supported) {
    return (
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-parchment-100/40">
        <Dot /> Аудиогид недоступен в этом браузере
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== 'speaking' && (
        <button onClick={() => (status === 'paused' ? resume() : speak(text))} className="btn-ghost">
          <PlayIcon /> {status === 'paused' ? 'Продолжить' : 'Озвучить'}
        </button>
      )}
      {status === 'speaking' && (
        <button onClick={pause} className="btn-ghost">
          <PauseIcon /> Пауза
        </button>
      )}
      {status !== 'idle' && (
        <button onClick={stop} className="btn-ghost">
          <StopIcon /> Стоп
        </button>
      )}
      <div className="ml-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-parchment-100/40">
        <Dot pulse={status === 'speaking'} /> {labelForStatus(status)}
      </div>
    </div>
  )
}

function labelForStatus(s: string) {
  if (s === 'speaking') return 'Экскурсовод говорит'
  if (s === 'paused') return 'Пауза'
  return 'Готов к чтению'
}

function Dot({ pulse = false }: { pulse?: boolean }) {
  return (
    <span
      className={`grid h-1.5 w-1.5 place-items-center rounded-full ${
        pulse ? 'bg-accent-gold animate-pulse shadow-[0_0_10px_2px_rgba(201,162,90,0.6)]' : 'bg-parchment-100/30'
      }`}
    />
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
  )
}
function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
  )
}
function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" /></svg>
  )
}
