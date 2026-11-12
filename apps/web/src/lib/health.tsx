import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { api } from './api'
import type { Health } from './types'

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ready'; health: Health }
  | { kind: 'offline' }

type HealthContextValue = { state: HealthState; refresh: () => void }

const HealthContext = createContext<HealthContextValue>({
  state: { kind: 'loading' },
  refresh: () => undefined,
})

export function HealthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HealthState>({ kind: 'loading' })

  const refresh = useCallback(() => {
    api
      .health()
      .then((health) => setState({ kind: 'ready', health }))
      .catch(() => setState({ kind: 'offline' }))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <HealthContext.Provider value={{ state, refresh }}>
      {children}
    </HealthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHealth() {
  return useContext(HealthContext)
}
