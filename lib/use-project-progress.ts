'use client'

import * as React from 'react'
import { PROJECTS, type Project } from '@/lib/projects'

const STORAGE_KEY = 'circuitlab:completed-projects'

function readStored(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

/**
 * Tracks which projects the student has completed. Persisted to localStorage so
 * progress survives reloads. Unlock rule: project #1 is always open; every other
 * project unlocks once the one directly before it (order - 1) is complete.
 */
export function useProjectProgress() {
  const [completedIds, setCompletedIds] = React.useState<string[]>([])
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    setCompletedIds(readStored())
    setHydrated(true)
  }, [])

  const persist = React.useCallback((next: string[]) => {
    setCompletedIds(next)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore quota / privacy-mode failures */
      }
    }
  }, [])

  const completed = React.useMemo(() => new Set(completedIds), [completedIds])

  const isCompleted = React.useCallback((id: string) => completed.has(id), [completed])

  const isUnlocked = React.useCallback(
    (project: Project) => {
      if (project.order <= 1) return true
      const prev = PROJECTS.find((p) => p.order === project.order - 1)
      return prev ? completed.has(prev.id) : true
    },
    [completed],
  )

  const complete = React.useCallback(
    (id: string) => {
      setCompletedIds((prev) => {
        if (prev.includes(id)) return prev
        const next = [...prev, id]
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
          } catch {
            /* ignore */
          }
        }
        return next
      })
    },
    [],
  )

  const reset = React.useCallback(() => persist([]), [persist])

  return { completed, completedCount: completed.size, hydrated, isCompleted, isUnlocked, complete, reset }
}
