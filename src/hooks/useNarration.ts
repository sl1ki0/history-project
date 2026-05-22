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
/** Default gap between paragraphs in a sequence, ms. */
export const DEFAULT_PARAGRAPH_GAP_MS = 650

interface PersistedSettings {
  engine: NarrationEngine
  piperVoice: string
  rate: number
  volume: number
}

function loadSettings(): PersistedSettings {
  const fallback: PersistedSettings = {
    engine: 'webspeech',
    piperVoice: 'ru_RU-dmitri-medium',
    rate: 0.97,
    volume: 1,
  }
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...fallback, ...JSON.parse(raw) }
  } catch {}
  return fallback
}

function saveSettings(s: PersistedSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {}
}

/** A segment for batched playback / pre-generation. */
export interface NarrationSegment {
  id: string
  text: string
}

interface PlaySequenceOpts {
  /** Pause between segments, ms. Default 650. */
  paragraphGap?: number
  /** Fires after every segment finishes (before the gap). */
  onSegmentEnd?: (id: string) => void
  /** Fires once all segments finished. Skipped if cancelled via stop(). */
  onComplete?: () => void
  /** Fires if the sequence was cancelled (stop() called mid-flight). */
  onCancel?: () => void
}

/**
 * Unified narration hook with two engines:
 *  - 'webspeech' — instant, native, picks the best-available system voice
 *  - 'piper' — neural Piper VITS, lazy-loaded ~60 MB ONNX model cached in OPFS
 *
 * Two modes:
 *  - speak(text) — single utterance
 *  - prepareSequence(segments) + playSequence(segments) — chunked playback
 *    with paragraph-level pauses and optional pre-generated audio.
 */
export function useNarration() {
  const [status, setStatus] = useState<NarrationStatus>('idle')
  const [supported, setSupported] = useState(false)
  const [engine, setEngineState] = useState<NarrationEngine>(() => loadSettings().engine)
  const [piperVoice, setPiperVoiceState] = useState<string>(() => loadSettings().piperVoice)
  const [rate, setRateState] = useState<number>(() => loadSettings().rate)
  const [volume, setVolumeState] = useState<number>(() => loadSettings().volume)
  const [piperReady, setPiperReady] = useState(false)
  const [piperProgress, setPiperProgress] = useState<number | null>(null)

  // Web Speech state
  const wsVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const wsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Piper state
  const piperAudioRef = useRef<HTMLAudioElement | null>(null)
  const piperBlobUrlRef = useRef<string | null>(null)
  /** Cache of pre-generated Piper Blobs keyed by segment id. Keyed per voice. */
  const piperCacheRef = useRef<Map<string, Blob>>(new Map())
  const piperCacheVoiceRef = useRef<string>(piperVoice)

  // Sequence state — set during playSequence, cleared on stop / completion.
  const sequenceRunIdRef = useRef(0)

  // Live refs for values used inside async loops
  const rateRef = useRef(rate)
  const volumeRef = useRef(volume)
  useEffect(() => {
    rateRef.current = rate
  }, [rate])
  useEffect(() => {
    volumeRef.current = volume
  }, [volume])

  /* ---------- Setup Web Speech ---------- */

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setSupported(true)

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
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
    saveSettings({ engine, piperVoice, rate, volume })
  }, [engine, piperVoice, rate, volume])

  /* ---------- Live volume / rate for current playback ---------- */

  useEffect(() => {
    const a = piperAudioRef.current
    if (a) a.volume = volume
  }, [volume])

  useEffect(() => {
    const a = piperAudioRef.current
    if (a) a.playbackRate = rate
  }, [rate])

  /* ---------- Universal stop ---------- */

  const stop = useCallback(() => {
    // Bump the run id so any in-flight sequence loop aborts on its next tick.
    sequenceRunIdRef.current += 1
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    const a = piperAudioRef.current
    if (a) {
      a.onended = null
      a.onpause = null
      a.onerror = null
      a.pause()
      a.currentTime = 0
    }
    if (piperBlobUrlRef.current) {
      URL.revokeObjectURL(piperBlobUrlRef.current)
      piperBlobUrlRef.current = null
    }
    setStatus('idle')
  }, [])

  /* ---------- Piper helpers ---------- */

  const ensurePiperVoice = useCallback(
    async (onProgress?: (p: number | null) => void) => {
      const tts = await import('@diffusionstudio/vits-web')
      const voiceId = piperVoice as Parameters<typeof tts.predict>[0]['voiceId']
      const stored: string[] = await tts.stored()
      if (!stored.includes(piperVoice)) {
        onProgress?.(0)
        await tts.download(voiceId, (p: { url: string; loaded: number; total: number }) => {
          if (p.total > 0) onProgress?.(Math.round((p.loaded / p.total) * 100))
        })
        onProgress?.(null)
      }
      return { tts, voiceId }
    },
    [piperVoice],
  )

  const piperGenerate = useCallback(
    async (text: string): Promise<Blob> => {
      const { tts, voiceId } = await ensurePiperVoice((p) => setPiperProgress(p))
      const wav: Blob = await tts.predict({ text: normalizeForTTS(text), voiceId })
      return wav
    },
    [ensurePiperVoice],
  )

  const playPiperBlob = useCallback(
    (blob: Blob) =>
      new Promise<'ended' | 'aborted'>((resolve) => {
        if (piperBlobUrlRef.current) URL.revokeObjectURL(piperBlobUrlRef.current)
        const url = URL.createObjectURL(blob)
        piperBlobUrlRef.current = url
        const audio = new Audio()
        audio.src = url
        audio.playbackRate = rateRef.current
        audio.volume = volumeRef.current
        let settled = false
        const finalize = (reason: 'ended' | 'aborted') => {
          if (settled) return
          settled = true
          URL.revokeObjectURL(url)
          if (piperBlobUrlRef.current === url) piperBlobUrlRef.current = null
          if (piperAudioRef.current === audio) piperAudioRef.current = null
          resolve(reason)
        }
        audio.onplay = () => setStatus('speaking')
        audio.onended = () => {
          setStatus('idle')
          finalize('ended')
        }
        audio.onpause = () => {
          if (!audio.ended && settled === false) setStatus('paused')
        }
        audio.onerror = () => {
          setStatus('idle')
          finalize('aborted')
        }
        piperAudioRef.current = audio
        audio.play().catch(() => finalize('aborted'))
      }),
    [],
  )

  /* ---------- Web Speech: speak single utterance returning promise ---------- */

  const playWebSpeechOnce = useCallback(
    (text: string) =>
      new Promise<'ended' | 'aborted'>((resolve) => {
        if (!supported) {
          resolve('aborted')
          return
        }
        const u = new SpeechSynthesisUtterance(normalizeForTTS(text))
        if (wsVoiceRef.current) u.voice = wsVoiceRef.current
        u.lang = 'ru-RU'
        u.rate = rateRef.current
        u.pitch = 1.0
        u.volume = volumeRef.current
        let settled = false
        const finalize = (reason: 'ended' | 'aborted') => {
          if (settled) return
          settled = true
          resolve(reason)
        }
        u.onstart = () => setStatus('speaking')
        u.onend = () => {
          setStatus('idle')
          finalize('ended')
        }
        u.onerror = () => {
          setStatus('idle')
          finalize('aborted')
        }
        u.onpause = () => setStatus('paused')
        u.onresume = () => setStatus('speaking')
        wsUtteranceRef.current = u
        window.speechSynthesis.speak(u)
      }),
    [supported],
  )

  /* ---------- Public: simple single-shot speak ---------- */

  const speak = useCallback(
    (text: string) => {
      stop()
      if (engine === 'piper') {
        setStatus('loading')
        piperGenerate(text)
          .then((blob) => playPiperBlob(blob))
          .catch((e) => {
            console.warn('[Piper] speak failed, falling back to WebSpeech', e)
            setStatus('idle')
            playWebSpeechOnce(text)
          })
      } else {
        playWebSpeechOnce(text)
      }
    },
    [engine, piperGenerate, playPiperBlob, playWebSpeechOnce, stop],
  )

  /* ---------- Pre-generate full sequence (Piper-only meaningful work) ---------- */

  /** Reset Piper cache if voice changed. */
  const checkPiperCacheVoice = useCallback(() => {
    if (piperCacheVoiceRef.current !== piperVoice) {
      piperCacheRef.current.clear()
      piperCacheVoiceRef.current = piperVoice
    }
  }, [piperVoice])

  const prepareSequence = useCallback(
    async (
      segments: NarrationSegment[],
      onProgress?: (done: number, total: number, currentId: string) => void,
    ): Promise<void> => {
      if (!segments.length) return
      if (engine === 'webspeech') {
        // No real prep, but emit progress so the loader still feels intentional.
        for (let i = 0; i < segments.length; i++) {
          onProgress?.(i + 1, segments.length, segments[i].id)
          // tiny delay to let the loader animate
          await new Promise((r) => setTimeout(r, 80))
        }
        return
      }

      checkPiperCacheVoice()
      setStatus('loading')
      try {
        await ensurePiperVoice((p) => setPiperProgress(p))
        setPiperReady(true)
        const cache = piperCacheRef.current
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i]
          if (!cache.has(seg.id)) {
            const blob = await piperGenerate(seg.text)
            cache.set(seg.id, blob)
          }
          onProgress?.(i + 1, segments.length, seg.id)
        }
      } finally {
        setPiperProgress(null)
        setStatus('idle')
      }
    },
    [engine, ensurePiperVoice, piperGenerate, checkPiperCacheVoice],
  )

  /* ---------- Play sequence (used after prepareSequence) ---------- */

  const playSequence = useCallback(
    async (segments: NarrationSegment[], opts: PlaySequenceOpts = {}) => {
      const gap = opts.paragraphGap ?? DEFAULT_PARAGRAPH_GAP_MS
      stop()
      const runId = ++sequenceRunIdRef.current

      for (let i = 0; i < segments.length; i++) {
        if (sequenceRunIdRef.current !== runId) {
          opts.onCancel?.()
          return
        }
        const seg = segments[i]
        let reason: 'ended' | 'aborted' = 'ended'
        try {
          if (engine === 'piper') {
            const cached = piperCacheRef.current.get(seg.id)
            let blob = cached
            if (!blob) {
              setStatus('loading')
              blob = await piperGenerate(seg.text)
              piperCacheRef.current.set(seg.id, blob)
            }
            if (sequenceRunIdRef.current !== runId) {
              opts.onCancel?.()
              return
            }
            reason = await playPiperBlob(blob)
          } else {
            reason = await playWebSpeechOnce(seg.text)
          }
        } catch (e) {
          console.warn('[playSequence] segment failed', e)
          reason = 'aborted'
        }

        if (sequenceRunIdRef.current !== runId) {
          opts.onCancel?.()
          return
        }
        if (reason === 'aborted') {
          opts.onCancel?.()
          return
        }
        opts.onSegmentEnd?.(seg.id)

        if (i < segments.length - 1) {
          // Gentle pause between paragraphs
          await new Promise<void>((r) => setTimeout(r, gap))
          if (sequenceRunIdRef.current !== runId) {
            opts.onCancel?.()
            return
          }
        }
      }
      opts.onComplete?.()
    },
    [engine, piperGenerate, playPiperBlob, playWebSpeechOnce, stop],
  )

  /* ---------- Pause / resume ---------- */

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

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  /* ---------- Setters ---------- */

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
      // Invalidate cache because pre-generated audio belongs to the previous voice.
      piperCacheRef.current.clear()
      piperCacheVoiceRef.current = v
      setPiperVoiceState(v)
    },
    [stop],
  )
  const setRate = useCallback((r: number) => {
    setRateState(Math.max(0.7, Math.min(1.3, r)))
  }, [])
  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)))
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
    volume,
    setVolume,
    speak,
    pause,
    resume,
    stop,
    prepareSequence,
    playSequence,
  }
}
