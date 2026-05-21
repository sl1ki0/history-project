import { Link } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import PageTransition from '../components/PageTransition'
import AnimatedHeading from '../components/AnimatedHeading'
import { excursions, museum } from '../content'
import { motion } from 'framer-motion'

const PortalScene = lazy(() => import('../three/PortalScene'))

export default function HomePage() {
  return (
    <PageTransition>
      <Hero />
      <Pillars />
      <Preview />
    </PageTransition>
  )
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10 h-[120vh]">
        <Suspense fallback={null}>
          <PortalScene />
        </Suspense>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-ink-950/30 to-ink-950" />
      </div>

      <div className="container-prose flex min-h-[88vh] flex-col items-start justify-center gap-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="chip"
        >
          <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-accent-gold shadow-[0_0_8px_2px_rgba(201,162,90,0.7)]" />
          Виртуальный музей · открыто 24/7
        </motion.div>

        <AnimatedHeading
          as="h1"
          text="Эпоха перемен"
          eyebrow={museum.theme + ' · ' + museum.period}
          className="text-6xl md:text-8xl lg:text-9xl font-medium text-shimmer"
        />

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="max-w-2xl text-lg leading-relaxed text-parchment-100/80 md:text-xl"
        >
          Три кураторские экскурсии, пятнадцать остановок, документы и события,
          расположенные на одной линии времени — от подписания Беловежских соглашений
          до 2022 года. С аудиогидом, 3D-экспонатами и тестами после каждого зала.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1 }}
          className="flex flex-wrap items-center gap-3"
        >
          <Link to="/hall" className="btn-primary">
            Войти в музей
            <span aria-hidden>→</span>
          </Link>
          <Link to="/about" className="btn-ghost">
            О проекте
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ duration: 1.2, delay: 1.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-parchment-100/40">
            прокрутите вниз
            <span className="block h-8 w-px animate-pulse bg-accent-gold/60" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Pillars() {
  const items = museum.characteristics
  return (
    <section className="container-prose py-16 md:py-24">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {items.map((it, i) => (
          <motion.div
            key={it.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, delay: i * 0.08 }}
            className="glass rounded-2xl p-5 md:p-6"
          >
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-gold/80">
              {it.label}
            </div>
            <div className="num-display mt-2 text-2xl font-medium text-parchment-50 md:text-3xl">
              {it.value}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function Preview() {
  return (
    <section className="container-prose py-12 md:py-24">
      <div className="mb-12 max-w-2xl">
        <div className="chip mb-4">Анонс трёх экскурсий</div>
        <h2 className="heading-serif text-4xl text-parchment-50 md:text-5xl">
          Три зала. Один путь от 1991 к 2022 году.
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {excursions.map((e, i) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, delay: i * 0.1 }}
            className="group"
          >
            <Link
              to={`/excursion/${e.id}`}
              className="card-exhibit block h-full transition hover:border-accent-gold/40 hover:shadow-[0_0_60px_-20px_rgba(201,162,90,0.4)]"
            >
              <div className="flex items-baseline justify-between">
                <span className="num-marker text-xl text-accent-gold/80">
                  №{String(e.number).padStart(2, '0')}
                </span>
                <span className="num-mono text-xs text-parchment-100/50">{e.period}</span>
              </div>
              <h3 className="mt-4 heading-serif text-3xl text-parchment-50">{e.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-parchment-100/65">{e.subtitle}</p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {e.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full border border-parchment-50/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-parchment-100/55"
                  >
                    {kw}
                  </span>
                ))}
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm text-accent-gold">
                Начать экскурсию <span className="transition group-hover:translate-x-1">→</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
