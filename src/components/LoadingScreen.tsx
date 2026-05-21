export default function LoadingScreen() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border border-accent-gold/20" />
          <div className="absolute inset-0 animate-spin rounded-full border-t-2 border-accent-gold" style={{ animationDuration: '1.4s' }} />
        </div>
        <div className="text-xs uppercase tracking-[0.3em] text-parchment-100/50">
          Открываем зал...
        </div>
      </div>
    </div>
  )
}
