import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeForTTS } from '../utils/ttsNormalize'

export type NarrationStatus = 'idle' | 'loading' | 'speaking' | 'paused'
export type NarrationEngine = 'webspeech' | 'piper'

export interface PiperVoice {
  id: string
  label: string
  gender: 'female' | 'male'
}

/** Russian Piper VITS voices that ship with @diffusionstudio/vits-web. */
export const PIPER_VOICES: PiperVoice[] = [
  { id: 'ru_RU-dmitri-medium', label: 'Дмитрий', gender: 'male' },
  { id: 'ru_RU-irina-medium', label: 'Ирина', gender: 'female' },
  { id: 'ru_RU-denis-medium', label: 'Денис', gender: 'male' },
  { id: 'ru_RU-ruslan-medium', label: 'Руслан', gender: 'male' },
]

const STORAGE_KEY = 'museum-narration-settings'

interface PersistedSettings {
  engine: NarrationEngine
  piperVoice: string
  rate: number
}

function loadSettings(): PersistedSettings {
  if (typeof window === 'undefined')
    return { engine: 'webspeech', piperVoice: 'ru_RU-dmitri-medium', rate: 1.0 }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return { engine: 'webspeech', piperVoice: 'ru_RU-dmitri-medium', rate: 1.0, ...JSON.parse(raw) }
  } catch {}
  return { engine: 'webspeech', piperVoice: 'ru_RU-dmitri-medium', rate: 1.0 }
}

function saveSettings(s: PersistedSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {}
}

/**
 * Unified narration hook with two engines:
 *  - 'webspeech' — instant, native, picks the best-available system voice
 *  - 'piper' — neural Piper VITS, lazy-loaded ~60 MB ONNX model cached in OPFS
 *
 * Both expose the same speak/pause/resume/stop API.
 */
export function useNarration() {
  const [status, setStatus] = useState<NarrationStatus>('idle')
  const [supported, setSupported] = useState(false)
  const [engine, setEngineState] = useState<NarrationEngine>(() => loadSettings().engine)
  const [piperVoice, setPiperVoiceState] = useState<string>(() => loadSettings().piperVoice)
  const [rate, setRateState] = useState<number>(() => loadSettings().rate)
  const [piperReady, setPiperReady] = useState(false)
  const [piperProgress, setPiperProgress] = useState<number | null>(null)

  // Web Speech state
  const wsVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const wsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Piper state
  const piperAudioRef = useRef<HTMLAudioElement | null>(null)
  const piperBlobUrlRef = useRef<string | null>(null)

  /* ---------- Setup Web Speech ---------- */

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setSupported(true)

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      // 1. Russian voices, sorted: Premium > Enhanced > Neural > Online > Local
      const ru = voices.filter((v) => v.lang.toLowerCase().startsWith('ru'))
      const score = (v: SpeechSynthesisVoice) => {
        let s = 0
        const n = v.name.toLowerCase()
        if (/premium|premium\s|enhanced|neural|natural/.test(n)) s += 10
        if (/online|google|microsoft|cloud/.test(n)) s += 5
        if (/milena|yuri|irina|katya|anna|maxim|dmitri|olga|svetlana/.test(n)) s += 3
        if (v.localService) s += 1
        return s
      }
      ru.sort((a, b) => score(b) - score(a))
      wsVoiceRef.current = ru[0] ?? voices[0] ?? null
    }

    pickVoice()
    window.speechSynthesis.onvoiceschanged = pickVoice

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  /* ---------- Persist settings ---------- */

  useEffect(() => {
    saveSettings({ engine, piperVoice, rate })
  }, [engine, piperVoice, rate])

  /* ---------- Universal stop ---------- */

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    const a = piperAudioRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
    if (piperBlobUrlRef.current) {
      URL.revokeObjectURL(piperBlobUrlRef.current)
      piperBlobUrlRef.current = null
    }
    setStatus('idle')
  }, [])

  /* ---------- Web Speech speak ---------- */

  const speakWebSpeech = useCallback(
    (text: string) => {
      if (!supported) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(normalizeForTTS(text))
      if (wsVoiceRef.current) u.voice = wsVoiceRef.current
      u.lang = 'ru-RU'
      u.rate = rate
      u.pitch = 1.0
      u.volume = 1.0
      u.onstart = () => setStatus('speaking')
      u.onend = () => setStatus('idle')
      u.onerror = () => setStatus('idle')
      u.onpause = () => setStatus('paused')
      u.onresume = () => setStatus('speaking')
      wsUtteranceRef.current = u
      window.speechSynthesis.speak(u)
    },
    [supported, rate],
  )

  /* ---------- Piper speak ---------- */

  const speakPiper = useCallback(
    async (text: string) => {
      // Lazy import the heavy module
      setStatus('loading')
      setPiperProgress(piperReady ? null : 0)
      try {
        const tts = await import('@diffusionstudio/vits-web')
        // Library exposes a narrow VoiceId union — we keep our own string list of curated Russian voices.
        const voiceId = piperVoice as Parameters<typeof tts.predict>[0]['voiceId']

        // Ensure model is downloaded (cached in OPFS after first time)
        const stored: string[] = await tts.stored()
        if (!stored.includes(piperVoice)) {
          await tts.download(voiceId, (p: { url: string; loaded: number; total: number }) => {
            if (p.total > 0) {
              setPiperProgress(Math.round((p.loaded / p.total) * 100))
            }
          })
        }
        setPiperProgress(null)
        setPiperReady(true)

        // Generate WAV — normalize text first so numerals are read as words
        const wav: Blob = await tts.predict({
          text: normalizeForTTS(text),
          voiceId,
        })

        if (piperBlobUrlRef.current) URL.revokeObjectURL(piperBlobUrlRef.current)
        const url = URL.createObjectURL(wav)
        piperBlobUrlRef.current = url

        const audio = new Audio()
        audio.src = url
        audio.playbackRate = rate
        audio.onplay = () => setStatus('speaking')
        audio.onended = () => {
          setStatus('idle')
          URL.revokeObjectURL(url)
          if (piperBlobUrlRef.current === url) piperBlobUrlRef.current = null
        }
        audio.onpause = () => {
          if (!audio.ended) setStatus('paused')
        }
        audio.onerror = () => setStatus('idle')
        piperAudioRef.current = audio
        await audio.play()
      } catch (e) {
        console.warn('[Piper TTS] failed, falling back to Web Speech', e)
        setStatus('idle')
        setPiperProgress(null)
        // graceful fallback
        speakWebSpeech(text)
      }
    },
    [piperReady, piperVoice, rate, speakWebSpeech],
  )

  /* ---------- Public API ---------- */

  const speak = useCallback(
    (text: string) => {
      stop()
      if (engine === 'piper') speakPiper(text)
      else speakWebSpeech(text)
    },
    [engine, speakPiper, speakWebSpeech, stop],
  )

  const pause = useCallback(() => {
    if (engine === 'webspeech' && typeof window !== 'undefined') {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause()
        setStatus('paused')
      }
    } else if (piperAudioRef.current && !piperAudioRef.current.paused) {
      piperAudioRef.current.pause()
      setStatus('paused')
    }
  }, [engine])

  const resume = useCallback(() => {
    if (engine === 'webspeech' && typeof window !== 'undefined') {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
        setStatus('speaking')
      }
    } else if (piperAudioRef.current && piperAudioRef.current.paused) {
      piperAudioRef.current.play().catch(() => {})
      setStatus('speaking')
    }
  }, [engine])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  /* ---------- Setters that also stop current playback ---------- */

  const setEngine = useCallback(
    (e: NarrationEngine) => {
      stop()
      setEngineState(e)
    },
    [stop],
  )
  const setPiperVoice = useCallback(
    (v: string) => {
      stop()
      setPiperVoiceState(v)
    },
    [stop],
  )
  const setRate = useCallback((r: number) => {
    setRateState(Math.max(0.7, Math.min(1.3, r)))
  }, [])

  return {
    status,
    supported,
    engine,
    setEngine,
    piperVoice,
    setPiperVoice,
    piperReady,
    piperProgress,
    rate,
    setRate,
    speak,
    pause,
    resume,
    stop,
  }
}
