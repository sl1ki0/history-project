export default function Footer() {
  return (
    <footer className="mt-24 border-t border-parchment-50/5 bg-ink-950/50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-10">
        <div>
          <div className="heading-serif text-lg text-parchment-50">«Эпоха перемен»</div>
          <p className="mt-1 max-w-md text-sm text-parchment-100/55">
            Учебный проект · виртуальный музей современной Российской Федерации.
            Источники указаны в конце каждой экскурсии и кликабельны.
          </p>
        </div>
        <div className="text-xs text-parchment-100/40">
          <p>Источники: kremlin.ru, БРЭ, Росстат, ЦИК России, ТАСС.</p>
          <p className="mt-1">© Виртуальный музей · образовательная инициатива</p>
        </div>
      </div>
    </footer>
  )
}
