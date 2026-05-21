import { useCallback, useEffect, useRef, useState } from 'react'

type Status = 'idle' | 'speaking' | 'paused'

/**
 * Web Speech API wrapper for the narrator voice.
 * Picks a Russian voice when available and falls back to default.
 */
export function useNarration() {
  const [status, setStatus] = useState<Status>('idle')
  const [supported, setSupported] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setSupported(true)

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      const ru =
        voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith('ru') &&
            /milena|yuri|google|microsoft|natural|anna|katya/i.test(v.name),
        ) || voices.find((v) => v.lang.toLowerCase().startsWith('ru'))
      voiceRef.current = ru ?? voices[0] ?? null
    }

    pickVoice()
    window.speechSynthesis.onvoiceschanged = pickVoice
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (!supported) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    if (voiceRef.current) u.voice = voiceRef.current
    u.lang = 'ru-RU'
    u.rate = 0.98
    u.pitch = 1.0
    u.volume = 1.0
    u.onstart = () => setStatus('speaking')
    u.onend = () => setStatus('idle')
    u.onerror = () => setStatus('idle')
    u.onpause = () => setStatus('paused')
    u.onresume = () => setStatus('speaking')
    utteranceRef.current = u
    window.speechSynthesis.speak(u)
  }, [supported])

  const pause = useCallback(() => {
    if (!supported) return
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      setStatus('paused')
    }
  }, [supported])

  const resume = useCallback(() => {
    if (!supported) return
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setStatus('speaking')
    }
  }, [supported])

  const stop = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setStatus('idle')
  }, [supported])

  return { status, supported, speak, pause, resume, stop }
}
