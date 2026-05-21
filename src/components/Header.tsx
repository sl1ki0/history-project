import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTotalXp } from '../store/progress'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const xp = useTotalXp()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'backdrop-blur-xl bg-ink-950/70 border-b border-parchment-50/5'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 md:px-10">
        <Link to="/" className="group flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-accent-gold/40 bg-accent-gold/10">
            <svg viewBox="0 0 32 32" className="h-5 w-5 text-accent-gold" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 22h20M9 22V12l7-5 7 5v10M12 22v-6h2v6M18 22v-6h2v6" />
            </svg>
          </span>
          <div className="leading-tight">
            <div className="heading-serif text-lg text-parchment-50">Эпоха перемен</div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-accent-gold/80">
              Виртуальный музей · 1991—2022
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavItem to="/" end label="Вход" />
          <NavItem to="/hall" label="Главный зал" />
          <NavItem to="/about" label="О музее" />
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-accent-gold/30 bg-accent-gold/10 px-3 py-1.5 text-accent-gold">
            <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-accent-gold shadow-[0_0_8px_2px_rgba(201,162,90,0.7)]" />
            <span className="num-display text-sm font-semibold">{xp}</span>
            <span className="text-[10px] uppercase tracking-[0.25em] opacity-80">XP</span>
          </div>
          {location.pathname !== '/hall' && (
            <Link to="/hall" className="btn-ghost">
              К залам →
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative text-sm tracking-wide transition ${
          isActive ? 'text-parchment-50' : 'text-parchment-100/60 hover:text-parchment-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {label}
          {isActive && (
            <span className="absolute -bottom-1 left-0 right-0 mx-auto h-[2px] w-4 rounded-full bg-accent-gold" />
          )}
        </>
      )}
    </NavLink>
  )
}
