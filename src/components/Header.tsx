import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTotalXp } from '../store/progress'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const xp = useTotalXp()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // lock body scroll while mobile menu is open
  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled || menuOpen
          ? 'backdrop-blur-xl bg-ink-950/80 border-b border-parchment-50/5'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 md:h-20 md:px-10">
        <Link to="/" className="group flex min-w-0 items-center gap-2 sm:gap-3" onClick={() => setMenuOpen(false)}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-accent-gold/40 bg-accent-gold/10 md:h-10 md:w-10">
            <svg viewBox="0 0 32 32" className="h-4 w-4 text-accent-gold md:h-5 md:w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 22h20M9 22V12l7-5 7 5v10M12 22v-6h2v6M18 22v-6h2v6" />
            </svg>
          </span>
          <div className="min-w-0 leading-tight">
            <div className="heading-serif truncate text-base text-parchment-50 md:text-lg">Эпоха перемен</div>
            <div className="hidden text-[10px] uppercase tracking-[0.28em] text-accent-gold/80 lg:block">
              Виртуальный музей · 1991—2022
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-4 md:flex lg:gap-6">
          <NavItem to="/" end label="Вход" />
          <NavItem to="/hall" label="Главный зал" />
          <NavItem to="/map" label="Карта" />
          <NavItem to="/about" label="О музее" />
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-accent-gold/30 bg-accent-gold/10 px-3 py-1.5 text-accent-gold sm:flex">
            <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-accent-gold shadow-[0_0_8px_2px_rgba(201,162,90,0.7)]" />
            <span className="num-display text-sm font-semibold">{xp}</span>
            <span className="text-[10px] uppercase tracking-[0.25em] opacity-80">XP</span>
          </div>
          {location.pathname !== '/hall' && (
            <Link to="/hall" className="btn-ghost hidden lg:inline-flex">
              К залам →
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={menuOpen}
            className="grid h-10 w-10 place-items-center rounded-lg border border-parchment-50/15 bg-parchment-50/5 text-parchment-50 transition hover:border-accent-gold/40 hover:text-accent-gold md:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden"
          >
            <div className="border-t border-parchment-50/10 bg-ink-950/95 px-4 pb-6 pt-2 backdrop-blur-xl sm:px-6">
              <div className="flex flex-col gap-1 py-2">
                <MobileNavItem to="/" end label="Вход" onSelect={() => setMenuOpen(false)} />
                <MobileNavItem to="/hall" label="Главный зал" onSelect={() => setMenuOpen(false)} />
                <MobileNavItem to="/map" label="Карта событий" onSelect={() => setMenuOpen(false)} />
                <MobileNavItem to="/about" label="О музее" onSelect={() => setMenuOpen(false)} />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-accent-gold/25 bg-accent-gold/10 px-4 py-3 text-accent-gold">
                <div className="flex items-center gap-2">
                  <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-accent-gold shadow-[0_0_8px_2px_rgba(201,162,90,0.7)]" />
                  <span className="text-[10px] uppercase tracking-[0.25em] opacity-85">Ваш прогресс</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="num-display text-lg font-semibold">{xp}</span>
                  <span className="text-[10px] uppercase tracking-[0.25em] opacity-80">XP</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

function MobileNavItem({
  to,
  label,
  end,
  onSelect,
}: {
  to: string
  label: string
  end?: boolean
  onSelect: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onSelect}
      className={({ isActive }) =>
        `flex items-center justify-between rounded-xl border px-4 py-3 text-base transition ${
          isActive
            ? 'border-accent-gold/40 bg-accent-gold/10 text-parchment-50'
            : 'border-parchment-50/10 bg-parchment-50/0 text-parchment-100/80 hover:border-parchment-50/30 hover:bg-parchment-50/5'
        }`
      }
    >
      {label}
      <span aria-hidden className="text-accent-gold/70">→</span>
    </NavLink>
  )
}
