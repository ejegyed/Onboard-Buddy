import { createContext, useContext, useState, type ReactNode } from "react"

interface SupervisorContextType {
  activeSupervisorId: number | null
  setActiveSupervisorId: (id: number | null) => void
}

const SupervisorContext = createContext<SupervisorContextType>({
  activeSupervisorId: null,
  setActiveSupervisorId: () => {},
})

export function SupervisorProvider({ children }: { children: ReactNode }) {
  const [activeSupervisorId, setActiveSupervisorIdState] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem("activeSupervisorId")
      return stored ? Number(stored) : null
    } catch {
      return null
    }
  })

  const setActiveSupervisorId = (id: number | null) => {
    setActiveSupervisorIdState(id)
    try {
      if (id === null) localStorage.removeItem("activeSupervisorId")
      else localStorage.setItem("activeSupervisorId", String(id))
    } catch { /* ignore */ }
  }

  return (
    <SupervisorContext.Provider value={{ activeSupervisorId, setActiveSupervisorId }}>
      {children}
    </SupervisorContext.Provider>
  )
}

export function useActiveSupervisor() {
  return useContext(SupervisorContext)
}
