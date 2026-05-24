import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface MapTransform {
  scale: number
  tx: number
  ty: number
}

export const VIEWBOX = { width: 1000, height: 500 }
export const MIN_SCALE = 1
export const MAX_SCALE = 6

const IDENTITY: MapTransform = { scale: 1, tx: 0, ty: 0 }

interface UseMapInteractionResult {
  transform: MapTransform
  setTransform: (t: MapTransform) => void
  containerRef: React.RefObject<HTMLDivElement>
  /** Координаты SVG → координаты внутри контейнера в px (учитывая трансформацию) */
  project: (x: number, y: number) => { x: number; y: number }
  /** Зумирование к точке SVG (с фиксированной центровкой) */
  focusOn: (x: number, y: number, targetScale?: number) => void
  /** Зум-в-центр контейнера (для кнопок +/−) с плавностью */
  zoomBy: (delta: number) => void
  reset: () => void
  /** Размер контейнера в пикселях (для расчёта проекции). 0,0 пока не измерен. */
  size: { w: number; h: number }
  /** true пока активна программная анимация — для CSS-transition */
  animating: boolean
}

/** Зум/пан логика SVG-карты без сторонних библиотек. */
export function useMapInteraction(): UseMapInteractionResult {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [transform, setTransformState] = useState<MapTransform>(IDENTITY)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [animating, setAnimating] = useState(false)
  const animatingTimer = useRef<number | null>(null)

  /** Свежее значение трансформации для асинхронных обработчиков */
  const transformRef = useRef(transform)
  useEffect(() => {
    transformRef.current = transform
  }, [transform])

  /* ── Измерение контейнера ── */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      setSize({ w: cr.width, h: cr.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /** Базовый масштаб «вписать viewBox в контейнер» — для перевода координат */
  const baseScale = useMemo(() => {
    if (size.w === 0 || size.h === 0) return 1
    return Math.min(size.w / VIEWBOX.width, size.h / VIEWBOX.height)
  }, [size])

  const baseOffset = useMemo(() => {
    return {
      x: (size.w - VIEWBOX.width * baseScale) / 2,
      y: (size.h - VIEWBOX.height * baseScale) / 2,
    }
  }, [size, baseScale])

  /** Преобразование SVG-координат в пиксельные координаты внутри контейнера */
  const project = useCallback(
    (x: number, y: number) => {
      // Финальная трансформация: (SVG → containerPx) затем пан/зум.
      const px = baseOffset.x + x * baseScale
      const py = baseOffset.y + y * baseScale
      return {
        x: transform.tx + px * transform.scale + (size.w / 2) * (1 - transform.scale),
        y: transform.ty + py * transform.scale + (size.h / 2) * (1 - transform.scale),
      }
    },
    [baseOffset, baseScale, transform, size],
  )

  const clampTransform = useCallback(
    (t: MapTransform): MapTransform => {
      const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, t.scale))
      // Ограничиваем сдвиг, чтобы карта не уезжала за пределы более чем наполовину
      const maxOffsetX = (size.w * (scale - 1)) / 2 + 80
      const maxOffsetY = (size.h * (scale - 1)) / 2 + 80
      return {
        scale,
        tx: Math.max(-maxOffsetX, Math.min(maxOffsetX, t.tx)),
        ty: Math.max(-maxOffsetY, Math.min(maxOffsetY, t.ty)),
      }
    },
    [size],
  )

  const setTransform = useCallback(
    (t: MapTransform) => {
      setTransformState(clampTransform(t))
    },
    [clampTransform],
  )

  /* ── Wheel zoom — плавный, чувствительность зависит от deltaMode ── */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const current = transformRef.current
      // Универсальная нормализация delta: учитываем что разные браузеры/трекпады
      // дают сильно разный масштаб deltaY. Pixel mode (0) — мелкие шаги, line mode (1) — крупные.
      const factor = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? 120 : 1
      const normalized = (e.deltaY * factor) / 250
      const nextScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, current.scale * Math.exp(-normalized)),
      )
      if (Math.abs(nextScale - current.scale) < 0.0005) return
      const ratio = nextScale / current.scale
      // tx' = cx - (cx - tx) * ratio, где cx — позиция курсора относительно центра контейнера
      const dxFromCenter = cx - rect.width / 2
      const dyFromCenter = cy - rect.height / 2
      const newTx = dxFromCenter - (dxFromCenter - current.tx) * ratio
      const newTy = dyFromCenter - (dyFromCenter - current.ty) * ratio
      setTransform({ scale: nextScale, tx: newTx, ty: newTy })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [setTransform])

  /** Программный зум с плавной анимацией */
  const flagAnimating = useCallback((ms = 300) => {
    setAnimating(true)
    if (animatingTimer.current) window.clearTimeout(animatingTimer.current)
    animatingTimer.current = window.setTimeout(() => setAnimating(false), ms)
  }, [])

  const zoomBy = useCallback(
    (delta: number) => {
      flagAnimating()
      const current = transformRef.current
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, current.scale + delta))
      const ratio = nextScale / current.scale
      // Зум к центру контейнера: tx масштабируется коэффициентом
      setTransform({
        scale: nextScale,
        tx: current.tx * ratio,
        ty: current.ty * ratio,
      })
    },
    [setTransform, flagAnimating],
  )

  /* ── Drag (pointer) ── */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let primed = false
    let dragging = false
    let captured = false
    let startX = 0
    let startY = 0
    let startTx = 0
    let startTy = 0
    let pointerId = -1
    const DRAG_THRESHOLD = 4

    const onDown = (e: PointerEvent) => {
      // Не перехватываем pointer, если кликнули по интерактивному оверлею
      const target = e.target as Element
      if (
        target.closest('[data-map-marker]') ||
        target.closest('[data-map-popup]') ||
        target.closest('[data-map-control]')
      )
        return
      primed = true
      pointerId = e.pointerId
      startX = e.clientX
      startY = e.clientY
      startTx = transformRef.current.tx
      startTy = transformRef.current.ty
    }
    const onMove = (e: PointerEvent) => {
      if (!primed) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
        dragging = true
        try {
          el.setPointerCapture(pointerId)
          captured = true
        } catch {
          /* ignore */
        }
        el.style.cursor = 'grabbing'
      }
      setTransform({
        scale: transformRef.current.scale,
        tx: startTx + dx,
        ty: startTy + dy,
      })
    }
    const onUp = () => {
      if (!primed) return
      primed = false
      dragging = false
      if (captured) {
        try {
          el.releasePointerCapture(pointerId)
        } catch {
          /* ignore */
        }
        captured = false
      }
      el.style.cursor = ''
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('pointerleave', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('pointerleave', onUp)
    }
  }, [setTransform])

  const focusOn = useCallback(
    (x: number, y: number, targetScale = 2.6) => {
      if (size.w === 0) return
      flagAnimating(500)
      const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale))
      const px = baseOffset.x + x * baseScale
      const py = baseOffset.y + y * baseScale
      setTransform({
        scale,
        tx: scale * (size.w / 2 - px),
        ty: scale * (size.h / 2 - py),
      })
    },
    [baseOffset, baseScale, size, setTransform, flagAnimating],
  )

  const reset = useCallback(() => {
    flagAnimating(400)
    setTransformState(IDENTITY)
  }, [flagAnimating])

  return {
    transform,
    setTransform,
    containerRef,
    project,
    focusOn,
    zoomBy,
    reset,
    size,
    animating,
  }
}
