'use client'

import * as React from 'react'
import type { Project, GuidedProgress } from '@/lib/projects'

interface GuidedContextValue {
  /** The project currently open in the guided lab, or null for free-build mode. */
  activeProject: Project | null
  /** Live build progress, written by the shared SpatialLab, read by the workspace. */
  progress: GuidedProgress | null
  openProject: (project: Project) => void
  closeProject: () => void
  /** Called by SpatialLab whenever the guided build state changes. */
  reportProgress: (progress: GuidedProgress) => void
}

const GuidedContext = React.createContext<GuidedContextValue | null>(null)

export function GuidedProvider({ children }: { children: React.ReactNode }) {
  const [activeProject, setActiveProject] = React.useState<Project | null>(null)
  const [progress, setProgress] = React.useState<GuidedProgress | null>(null)

  const openProject = React.useCallback((project: Project) => {
    setProgress(null)
    setActiveProject(project)
  }, [])

  const closeProject = React.useCallback(() => {
    setActiveProject(null)
    setProgress(null)
  }, [])

  const reportProgress = React.useCallback((next: GuidedProgress) => {
    setProgress(next)
  }, [])

  const value = React.useMemo(
    () => ({ activeProject, progress, openProject, closeProject, reportProgress }),
    [activeProject, progress, openProject, closeProject, reportProgress],
  )

  return <GuidedContext.Provider value={value}>{children}</GuidedContext.Provider>
}

/** Safe accessor: returns null-ish defaults when used outside a provider. */
export function useGuided(): GuidedContextValue {
  const ctx = React.useContext(GuidedContext)
  if (!ctx) {
    return {
      activeProject: null,
      progress: null,
      openProject: () => {},
      closeProject: () => {},
      reportProgress: () => {},
    }
  }
  return ctx
}
