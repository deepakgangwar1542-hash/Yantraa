'use client'

import * as React from 'react'
import {
  makeStyles,
  mergeClasses,
  tokens,
  Text,
  Title3,
  Caption1,
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
  WeatherMoon24Regular,
  WeatherSunny24Regular,
  Board24Regular,
} from '@fluentui/react-icons'
import { useThemeMode } from '@/app/providers'
import { InstructorChat } from '@/components/instructor/instructor-chat'
import { ComponentLibrary } from '@/components/library/component-library'
import { SpatialLab } from '@/components/lab/spatial-lab'
import { AmbientBackground } from '@/components/ambient-background'
import { HandControlProvider, useHandControl } from '@/components/hand-control'
import {
  HandRight24Regular,
  HandRight24Filled,
} from '@fluentui/react-icons'

type ViewId = 'instructor' | 'library' | 'lab'

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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '84px',
    flexShrink: 0,
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    gap: tokens.spacingVerticalS,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  brand: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalL,
    marginBottom: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  brandMark: {
    display: 'grid',
    placeItems: 'center',
    width: '40px',
    height: '40px',
    borderRadius: tokens.borderRadiusLarge,
    color: tokens.colorNeutralForegroundOnBrand,
    background: `linear-gradient(135deg, #FF3B54, ${tokens.colorBrandBackground} 55%, #7A011C)`,
    animationName: {
      '0%, 100%': {
        boxShadow: `0 0 0 0 ${tokens.colorBrandBackground2}`,
      },
      '50%': {
        boxShadow: `0 0 16px 2px ${tokens.colorBrandBackground2}`,
      },
    },
    animationDuration: '3.2s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
    },
  },
  navList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    flexGrow: 1,
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalXXS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    border: 'none',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground3,
    backgroundColor: 'transparent',
    transform: 'translateY(0) scale(1)',
    transitionDuration: tokens.durationNormal,
    transitionProperty: 'background-color, color, transform',
    transitionTimingFunction: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
      transform: 'translateY(-2px) scale(1.04)',
    },
    ':active': {
      transform: 'translateY(0) scale(0.97)',
    },
    '@media (prefers-reduced-motion: reduce)': {
      transform: 'none',
    },
  },
  navItemActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
      color: tokens.colorBrandForeground1,
      transform: 'translateY(-2px) scale(1.04)',
    },
  },
  navLabel: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
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
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  badgeSparkle: {
    display: 'inline-flex',
    animationName: {
      '0%, 100%': { transform: 'scale(1) rotate(0deg)', opacity: 0.85 },
      '50%': { transform: 'scale(1.25) rotate(90deg)', opacity: 1 },
    },
    animationDuration: '2.6s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
    },
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

export function AppShell() {
  const styles = useStyles()
  const { mode, setMode } = useThemeMode()
  const [view, setView] = React.useState<ViewId>('instructor')

  // Lazily mount the 3D Lab on first visit, then keep it mounted forever so its
  // WebGL context and canvas state persist across view switches (see <Activity>
  // usage below). This also guarantees only one WebGL context is ever alive at a
  // time: the ambient background canvas is unmounted once the lab exists.
  const [labMounted, setLabMounted] = React.useState(false)
  React.useEffect(() => {
    if (view === 'lab') setLabMounted(true)
  }, [view])

  const active = NAV.find((n) => n.id === view)!

  return (
    <HandControlProvider>
      <div className={styles.root}>
      <nav className={styles.rail} aria-label="Primary">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden>
            <Board24Regular />
          </span>
          <Caption1 style={{ fontWeight: tokens.fontWeightBold }}>Circuit</Caption1>
        </div>

        <div className={styles.navList}>
          {NAV.map((item) => {
            const isActive = item.id === view
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                className={mergeClasses(styles.navItem, isActive && styles.navItemActive)}
                onClick={() => setView(item.id)}
              >
                {isActive ? item.iconActive : item.icon}
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            )
          })}
        </div>

        <div className={styles.railFooter}>
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
            <Title3>{active.label === '3D Lab' ? '3D Spatial Lab' : `Hardware ${active.label}`}</Title3>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              {active.desc}
            </Text>
          </div>
          <span className={styles.badge}>
            <span className={styles.badgeSparkle}>
              <Sparkle />
            </span>
            <Caption1 style={{ color: 'inherit', fontWeight: tokens.fontWeightSemibold }}>
              For 1st & 2nd year students
            </Caption1>
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
          {view !== 'lab' && !labMounted && (
            <div className={styles.bgLayer}>
              <AmbientBackground />
            </div>
          )}
          {view !== 'lab' && labMounted && (
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
                view === 'lab' ? styles.labVisible : styles.labHidden,
              )}
              aria-hidden={view !== 'lab'}
            >
              <SpatialLab />
            </div>
          )}
        </div>
      </div>
      </div>
    </HandControlProvider>
  )
}

function Sparkle() {
  return (
    <span aria-hidden style={{ display: 'inline-flex' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l1.9 5.6L19.5 9l-5.6 1.9L12 16l-1.9-5.1L4.5 9l5.6-1.4L12 2z" />
      </svg>
    </span>
  )
}
