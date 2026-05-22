import { createContext, useContext, type ReactNode } from 'react'
import { useNarration } from './useNarration'

type NarrationApi = ReturnType<typeof useNarration>

const NarrationContext = createContext<NarrationApi | null>(null)

export function NarrationProvider({ children }: { children: ReactNode }) {
  const narration = useNarration()
  return <NarrationContext.Provider value={narration}>{children}</NarrationContext.Provider>
}

export function useNarrationContext(): NarrationApi {
  const ctx = useContext(NarrationContext)
  if (!ctx) throw new Error('useNarrationContext must be used inside <NarrationProvider>')
  return ctx
}
