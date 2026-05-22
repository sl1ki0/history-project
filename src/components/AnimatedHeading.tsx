import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

interface Props {
  text: string
  /** small line above the title */
  eyebrow?: string
  className?: string
  delay?: number
  as?: 'h1' | 'h2' | 'h3'
}

/**
 * Char-by-char reveal heading using GSAP (no SplitText premium dependency).
 */
export default function AnimatedHeading({ text, eyebrow, className = '', delay = 0, as: Tag = 'h1' }: Props) {
  const ref = useRef<HTMLDivElement>(null!)

  useGSAP(() => {
    const chars = ref.current.querySelectorAll<HTMLElement>('.gsap-char')
    const eyebrowEl = ref.current.querySelector('.gsap-eyebrow')

    if (eyebrowEl) {
      gsap.set(eyebrowEl, { opacity: 0, y: 12 })
      gsap.to(eyebrowEl, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out',
        delay,
      })
    }

    gsap.set(chars, { opacity: 0, y: '0.6em', rotation: 4 })
    gsap.to(chars, {
      opacity: 1,
      y: 0,
      rotation: 0,
      duration: 0.85,
      ease: 'power4.out',
      stagger: { each: 0.025, from: 'start' },
      delay: delay + (eyebrow ? 0.18 : 0),
    })
  }, { scope: ref, dependencies: [text, eyebrow] })

  return (
    <div ref={ref} className={className}>
      {eyebrow && (
        <div className="gsap-eyebrow mb-4 text-[11px] uppercase tracking-[0.32em] text-accent-gold/80">
          {eyebrow}
        </div>
      )}
      <Tag className="heading-serif text-balance break-words">
        {text.split(' ').map((word, wi) => (
          <span key={wi} className="inline-block max-w-full">
            {word.split('').map((ch, ci) => (
              <span key={ci} className="gsap-char">
                {ch}
              </span>
            ))}
            {wi < text.split(' ').length - 1 && <span className="gsap-char">&nbsp;</span>}
          </span>
        ))}
      </Tag>
    </div>
  )
}
