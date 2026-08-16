'use client'

import * as React from 'react'
import {
  makeStyles,
  mergeClasses,
  tokens,
  Text,
  Title3,
  Button,
  Tooltip,
} from '@fluentui/react-components'
import {
  BrainCircuit24Regular,
  BrainCircuit24Filled,
  BookOpen24Regular,
  BookOpen24Filled,
  CubeMultiple24Regular,
  CubeMultiple24Filled,
  Rocket24Regular,
  Rocket24Filled,
  WeatherMoon24Regular,
  WeatherSunny24Regular,
  Board24Regular,
} from '@fluentui/react-icons'
import { useThemeMode } from '@/app/providers'
import { InstructorChat } from '@/components/instructor/instructor-chat'
import { ComponentLibrary } from '@/components/library/component-library'
import { SpatialLab } from '@/components/lab/spatial-lab'
import { FloatingAssistant } from '@/components/assistant/floating-assistant'
import { AmbientBackground } from '@/components/ambient-background'
import { HandControlProvider, useHandControl } from '@/components/hand-control'
import { VoiceControlProvider, useVoiceControl } from '@/components/voice-control'
import { BuildPath } from '@/components/projects/build-path'
import { ProjectWorkspace } from '@/components/projects/project-workspace'
import { GuidedProvider, useGuided } from '@/lib/guided-context'
import { useProjectProgress } from '@/lib/use-project-progress'
import type { Project } from '@/lib/projects'
import {
  HandRight24Regular,
  HandRight24Filled,
  Mic24Regular,
  Mic24Filled,
} from '@fluentui/react-icons'
import { GLOW, SIGNAL, COPPER, STATUS, MONO_STACK, EASE_ELECTRIC } from '@/lib/theme'

type ViewId = 'instructor' | 'library' | 'lab' | 'build'

const NAV: {
  id: ViewId
  label: string
  desc: string
  icon: React.ReactElement
  iconActive: React.ReactElement
}[] = [
  {
    id: 'instructor',
    label: 'Instructor',
    desc: 'Ask the AI hardware tutor',
    icon: <BrainCircuit24Regular />,
    iconActive: <BrainCircuit24Filled />,
  },
  {
    id: 'library',
    label: 'Library',
    desc: 'Explore components',
    icon: <BookOpen24Regular />,
    iconActive: <BookOpen24Filled />,
  },
  {
    id: 'lab',
    label: '3D Lab',
    desc: 'Build circuits in 3D',
    icon: <CubeMultiple24Regular />,
    iconActive: <CubeMultiple24Filled />,
  },
  {
    id: 'build',
    label: 'Build Path',
    desc: 'Guided projects, first light to living circuits',
    icon: <Rocket24Regular />,
    iconActive: <Rocket24Filled />,
  },
]

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100dvh',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
  },
  rail: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '84px',
    flexShrink: 0,
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    gap: tokens.spacingVerticalS,
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    // faint solder-mask sheen down the connector edge
    backgroundImage: `linear-gradient(180deg, rgba(255,45,45,0.05), transparent 22%)`,
  },
  brand: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalL,
    marginBottom: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  brandMark: {
    display: 'grid',
    placeItems: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '5px',
    color: '#fff',
    border: `1px solid ${SIGNAL.hot}`,
    background: `linear-gradient(135deg, ${SIGNAL.hot}, ${SIGNAL.red} 55%, ${SIGNAL.cool})`,
    animationName: 'trace-pulse',
    animationDuration: '3.4s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
      boxShadow: GLOW.sm,
    },
  },
  brandWord: {
    fontFamily: MONO_STACK,
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: tokens.colorNeutralForeground2,
  },
  navList: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    flexGrow: 1,
  },
  // The copper edge-connector trace running vertically behind the pads.
  navTrace: {
    position: 'absolute',
    top: '10px',
    bottom: '10px',
    left: '50%',
    width: '2px',
    transform: 'translateX(-50%)',
    background: `linear-gradient(180deg, transparent, ${COPPER.idle} 12%, ${COPPER.idle} 88%, transparent)`,
    zIndex: 0,
    pointerEvents: 'none',
  },
  navItem: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalXS,
    padding: 0,
    border: 'none',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground3,
    backgroundColor: 'transparent',
    transform: 'translateY(0)',
    transitionDuration: tokens.durationNormal,
    transitionProperty: 'color, transform',
    transitionTimingFunction: EASE_ELECTRIC,
    ':hover': {
      color: tokens.colorNeutralForeground1,
      transform: 'translateY(-2px)',
    },
    ':active': {
      transform: 'translateY(0) scale(0.97)',
    },
    '@media (prefers-reduced-motion: reduce)': {
      transform: 'none',
      ':hover': { transform: 'none' },
      ':active': { transform: 'none' },
    },
  },
  // Connector-pad shape wrapping each icon. Idle = matte copper, no glow.
  navPad: {
    display: 'grid',
    placeItems: 'center',
    width: '46px',
    height: '40px',
    borderRadius: '4px',
    border: `1px solid ${COPPER.idle}`,
    backgroundColor: tokens.colorNeutralBackground3,
    color: 'inherit',
    transitionDuration: tokens.durationNormal,
    transitionProperty: 'background-color, color, border-color, box-shadow',
    transitionTimingFunction: EASE_ELECTRIC,
  },
  // Active pad = lit: signal-red border, brand fill, red glow.
  navPadActive: {
    border: `1px solid ${SIGNAL.red}`,
    backgroundColor: 'rgba(255,45,45,0.12)',
    color: SIGNAL.hot,
    boxShadow: GLOW.md,
  },
  navLabel: {
    fontFamily: MONO_STACK,
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  navLabelActive: {
    color: SIGNAL.hot,
    textShadow: GLOW.text,
  },
  railFooter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    paddingLeft: tokens.spacingHorizontalXL,
    paddingRight: tokens.spacingHorizontalXL,
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    minWidth: 0,
  },
  content: {
    flexGrow: 1,
    minHeight: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  bgLayer: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
  },
  bgFallback: {
    background: `radial-gradient(1200px 600px at 20% 15%, ${tokens.colorBrandBackground2} 0%, transparent 55%), radial-gradient(900px 500px at 85% 80%, rgba(122,1,28,0.55) 0%, transparent 55%)`,
    opacity: 0.35,
  },
  // Lab is kept mounted at a stable size; we toggle visibility, never display,
  // so the WebGL canvas never resizes to 0x0 and its context stays alive.
  labHost: {
    position: 'absolute',
    inset: 0,
    zIndex: 2,
    display: 'flex',
    transitionProperty: 'opacity',
    transitionDuration: tokens.durationNormal,
  },
  labVisible: {
    opacity: 1,
    visibility: 'visible',
    pointerEvents: 'auto',
  },
  labHidden: {
    opacity: 0,
    visibility: 'hidden',
    pointerEvents: 'none',
  },
  // When a guided project is open, the workspace panel sits to the left of
  // the shared lab canvas (same single WebGL context).
  labGuided: {},
  labCanvasSlot: {
    position: 'relative',
    flexGrow: 1,
    minWidth: 0,
    height: '100%',
  },
  viewLayer: {
    position: 'relative',
    zIndex: 1,
    height: '100%',
    minHeight: 0,
    animationName: {
      from: { opacity: 0, transform: 'translateY(12px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: tokens.durationSlow,
    animationTimingFunction: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
    animationFillMode: 'both',
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
    },
  },
  // Instrument status readout, not a marketing pill.
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalSNudge,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    paddingTop: '5px',
    paddingBottom: '5px',
    borderRadius: '4px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  led: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: STATUS.active,
    color: STATUS.active,
    flexShrink: 0,
    animationName: 'led-blink',
    animationDuration: '1.8s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'steps(1, end)',
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
      boxShadow: `0 0 8px 1px ${STATUS.active}`,
    },
  },
  badgeText: {
    fontFamily: MONO_STACK,
    fontSize: tokens.fontSizeBase200,
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: tokens.colorNeutralForeground2,
  },
  badgeMuted: {
    fontFamily: MONO_STACK,
    fontSize: tokens.fontSizeBase200,
    letterSpacing: '0.1em',
    color: tokens.colorNeutralForeground4,
  },
})

function HandsRailButton() {
  const { enabled, setEnabled } = useHandControl()
  return (
    <Tooltip
      content={enabled ? 'Turn off hand control' : 'Control the app with your hand (camera)'}
      relationship="label"
    >
      <Button
        appearance={enabled ? 'primary' : 'subtle'}
        icon={enabled ? <HandRight24Filled /> : <HandRight24Regular />}
        onClick={() => setEnabled(!enabled)}
        aria-label="Toggle hand control"
      />
    </Tooltip>
  )
}

function VoiceRailButton() {
  const { enabled, setEnabled, supported } = useVoiceControl()
  if (!supported) return null
  return (
    <Tooltip
      content={enabled ? 'Turn off voice control' : 'Control the lab with your voice ("Hey Circuit")'}
      relationship="label"
    >
      <Button
        appearance={enabled ? 'primary' : 'subtle'}
        icon={enabled ? <Mic24Filled /> : <Mic24Regular />}
        onClick={() => setEnabled(!enabled)}
        aria-label="Toggle voice control"
      />
    </Tooltip>
  )
}

export function AppShell() {
  return (
    <GuidedProvider>
      <AppShellInner />
    </GuidedProvider>
  )
}

function AppShellInner() {
  const styles = useStyles()
  const { mode, setMode } = useThemeMode()
  const [view, setView] = React.useState<ViewId>('instructor')

  // Guided "Build Path" state.
  const { activeProject, progress, openProject, closeProject } = useGuided()
  const progressStore = useProjectProgress()
  const guidedActive = view === 'build' && activeProject != null

  const handleOpenProject = React.useCallback(
    (project: Project) => {
      openProject(project)
    },
    [openProject],
  )

  const handleBackToRoadmap = React.useCallback(() => {
    closeProject()
  }, [closeProject])

  // Lazily mount the 3D Lab on first visit, then keep it mounted forever so its
  // WebGL context and canvas state persist across view switches (see <Activity>
  // usage below). This also guarantees only one WebGL context is ever alive at a
  // time: the ambient background canvas is unmounted once the lab exists.
  // The guided Build Path reuses this same single lab instance.
  const [labMounted, setLabMounted] = React.useState(false)
  React.useEffect(() => {
    if (view === 'lab' || guidedActive) setLabMounted(true)
  }, [view, guidedActive])

  // The single lab canvas is visible for free-build (3D Lab view) OR when a
  // guided project is open in the Build Path.
  const labVisible = view === 'lab' || guidedActive

  const active = NAV.find((n) => n.id === view)!

  return (
    <HandControlProvider>
      <VoiceControlProvider>
      <div className={styles.root}>
      <nav className={styles.rail} aria-label="Primary">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden>
            <Board24Regular />
          </span>
          <span className={styles.brandWord}>YANTRAA</span>
        </div>

        <div className={styles.navList}>
          <span className={styles.navTrace} aria-hidden />
          {NAV.map((item) => {
            const isActive = item.id === view
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                className={styles.navItem}
                onClick={() => {
                  // Leaving the Build Path returns the shared lab to free-build.
                  if (item.id !== 'build' && activeProject) closeProject()
                  setView(item.id)
                }}
              >
                <span className={mergeClasses(styles.navPad, isActive && styles.navPadActive)}>
                  {isActive ? item.iconActive : item.icon}
                </span>
                <span className={mergeClasses(styles.navLabel, isActive && styles.navLabelActive)}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>

        <div className={styles.railFooter}>
          <VoiceRailButton />
          <HandsRailButton />
          <Tooltip
            content={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            relationship="label"
          >
            <Button
              appearance="subtle"
              icon={mode === 'dark' ? <WeatherSunny24Regular /> : <WeatherMoon24Regular />}
              onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle color theme"
            />
          </Tooltip>
        </div>
      </nav>

      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerText}>
            <Title3>
              {active.label === '3D Lab'
                ? '3D Spatial Lab'
                : active.label === 'Build Path'
                  ? 'Build Path'
                  : `Hardware ${active.label}`}
            </Title3>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              {active.desc}
            </Text>
          </div>
          <span className={styles.badge}>
            <span className={styles.led} aria-hidden />
            <span className={styles.badgeText}>SYSTEM ONLINE</span>
          </span>
        </header>

        <div className={styles.content}>
          {/*
            The ambient 3D background is its own WebGL context. Only render it
            when the lab is NOT mounted, so there is never more than one live
            WebGL context at a time (avoids GPU context-loss on some devices).
            Once the lab has been opened it stays mounted, so from then on the
            background is replaced by a lightweight CSS gradient fallback.
          */}
          {!labVisible && !labMounted && (
            <div className={styles.bgLayer}>
              <AmbientBackground />
            </div>
          )}
          {!labVisible && labMounted && (
            <div className={mergeClasses(styles.bgLayer, styles.bgFallback)} aria-hidden />
          )}
          {view === 'instructor' && (
            <div key="instructor" className={styles.viewLayer}>
              <InstructorChat />
            </div>
          )}
          {view === 'library' && (
            <div key="library" className={styles.viewLayer}>
              <ComponentLibrary />
            </div>
          )}
          {/*
            Keep the 3D Lab mounted across view switches once it has been opened.
            Unmounting it (or suspending it with <Activity>) destroys or freezes
            its WebGL context, which on restore shows a blank canvas and logs
            repeated "THREE.WebGLRenderer: Context Lost". Instead we keep it in
            the layout at a STABLE size and just toggle visibility/opacity, so the
            canvas never resizes to zero and the context stays alive and rendering.
            This also preserves the user's placed components, wires, and sim state.
          */}
          {labMounted && (
            <div
              className={mergeClasses(
                styles.labHost,
                labVisible ? styles.labVisible : styles.labHidden,
                guidedActive ? styles.labGuided : undefined,
              )}
              aria-hidden={!labVisible}
            >
              {/* Guided workspace panel sits beside the shared lab canvas. */}
              {guidedActive && activeProject && (
                <ProjectWorkspace
                  project={activeProject}
                  progress={progress}
                  onBack={handleBackToRoadmap}
                  onComplete={progressStore.complete}
                />
              )}
              <div className={styles.labCanvasSlot}>
                <SpatialLab />
              </div>
            </div>
          )}

          {/* Build Path roadmap — shown when no project is open. */}
          {view === 'build' && !guidedActive && (
            <div key="build" className={styles.viewLayer}>
              <BuildPath
                onOpen={handleOpenProject}
                completed={progressStore.completed}
                isCompleted={progressStore.isCompleted}
                isUnlocked={progressStore.isUnlocked}
                hydrated={progressStore.hydrated}
              />
            </div>
          )}

          {/*
            Floating "Ask Circuit" assistant available in Library and 3D Lab.
            A stable key keeps it mounted (and its conversation intact) when
            switching between those two views; it unmounts on Instructor, which
            has its own full-screen tutor.
          */}
          {(view === 'library' || view === 'lab' || guidedActive) && (
            <FloatingAssistant
              key="floating-assistant"
              context={view === 'library' ? 'library' : 'lab'}
            />
          )}
        </div>
      </div>
      </div>
      </VoiceControlProvider>
    </HandControlProvider>
  )
}


