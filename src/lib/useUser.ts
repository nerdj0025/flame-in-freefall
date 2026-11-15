import { useMemo, useSyncExternalStore } from 'react'
import { SESSION_KEY } from './auth'
import type { User } from './auth'

function subscribe(callback: () => void) {
  window.addEventListener('ff-auth', callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener('ff-auth', callback)
    window.removeEventListener('storage', callback)
  }
}

const getSnapshot = () => localStorage.getItem(SESSION_KEY)

// Re-renders any component using it when the user logs in or out
export function useUser(): User | null {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null)
  return useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as User) : null
    } catch {
      return null
    }
  }, [raw])
}