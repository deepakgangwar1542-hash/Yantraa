'use client'

import * as React from 'react'
import { Canvas } from '@react-three/fiber'
import {
  makeStyles,
  tokens,
  Title2,
  Subtitle2,
  Body1,
  Caption1,
  Button,
  Badge,
  Text,
  Divider,
} from '@fluentui/react-components'
import {
  Dismiss24Regular,
  Lightbulb20Regular,
  ArrowCounterclockwise20Regular,
} from '@fluentui/react-icons'
import { ComponentScene } from './component-viewer'
import type { ElectronicsComponent, Difficulty } from '@/lib/electronics-data'

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */

const DIFF_COLOR: Record<Difficulty, 'success' | 'warning' | 'danger'> = {
  Beginner: 'success',
  Intermediate: 'warning',
  Advanced: 'danger',
}

const useStyles = makeStyles({
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(4, 7, 14, 0.80)',
    backdropFilter: 'blur(14px)',
    display: 'flex',
    alignItems: 'stretch',
    animationName: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    animationDuration: '160ms',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both',
  },

  modal: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    animationName: {
      from: { opacity: 0, transform: 'translateY(10px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: '220ms',
    animationTimingFunction: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
    animationFillMode: 'both',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
    },
  },

  /* --- Left: 3D canvas pane --- */
  canvasPane: {
    position: 'relative',
    flex: '0 0 58%',
    backgroundColor: '#090d18',
    cursor: 'grab',
    ':active': {
      cursor: 'grabbing',
    },
    '@media (max-width: 768px)': {
      flex: '0 0 44vh',
      minHeight: '260px',
    },
  },

  canvasEl: {
    width: '100%',
    height: '100%',
  },

  /** Gradient overlay at the top of the canvas for the name label. */
  nameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXL}`,
    background: 'linear-gradient(180deg, rgba(4,7,14,0.88) 0%, transparent 100%)',
    pointerEvents: 'none',
    userSelect: 'none',
  },

  nameLabel: {
    color: '#e8edf7',
    fontSize: '28px',
    fontWeight: tokens.fontWeightBold,
    lineHeight: 1.2,
    letterSpacing: '-0.5px',
  },

  symbolBadge: {
    display: 'inline-block',
    marginTop: tokens.spacingVerticalXS,
    padding: '2px 10px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: 'rgba(255,255,255,0.10)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.55)',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '0.04em',
    fontFamily: "'Courier New', Courier, monospace",
  },

  /** Floating reset button in the top-right of the canvas. */
  resetBtn: {
    position: 'absolute',
    top: tokens.spacingVerticalM,
    right: tokens.spacingHorizontalM,
  },

  /** Hint pill at the bottom of the canvas. */
  hintBadge: {
    position: 'absolute',
    bottom: tokens.spacingVerticalL,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '5px 16px',
    borderRadius: '999px',
    background: 'rgba(11,18,32,0.78)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.09)',
    color: '#9daec8',
    fontSize: '11px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    userSelect: 'none',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },

  /* --- Right: info pane --- */
  infoPane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
  },

  infoHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalXL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    flexShrink: 0,
  },

  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },

  headerTitle: {
    fontSize: '22px',
    fontWeight: tokens.fontWeightBold,
    lineHeight: 1.2,
  },

  headerTagline: {
    color: tokens.colorNeutralForeground3,
  },

  badgeRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    flexWrap: 'wrap',
    marginTop: tokens.spacingVerticalXS,
  },

  infoBody: {
    flex: 1,
    overflowY: 'auto',
    padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalXL}`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXL,
  },

  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },

  sectionTitle: {
    color: tokens.colorNeutralForeground1,
  },

  bodyText: {
    color: tokens.colorNeutralForeground2,
    lineHeight: '1.65',
  },

  pinTable: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },

  pinRowHeader: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },

  pinRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    alignItems: 'center',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    ':last-child': {
      borderBottom: 'none',
    },
  },

  pinRowAlt: {
    backgroundColor: tokens.colorNeutralBackground2,
  },

  pinName: {
    minWidth: '90px',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
    flexShrink: 0,
    color: tokens.colorNeutralForeground1,
    fontFamily: "'Courier New', Courier, monospace",
  },

  pinRole: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    flex: 1,
  },

  usesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },

  useItem: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'baseline',
  },

  useDot: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightBold,
    flexShrink: 0,
    fontSize: '18px',
    lineHeight: '1',
  },

  factCard: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    alignItems: 'flex-start',
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorPaletteYellowBackground1,
    border: `1px solid ${tokens.colorPaletteYellowBackground2}`,
  },

  factIcon: {
    flexShrink: 0,
    marginTop: '2px',
    color: '#c9890e',
  },
})

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function ComponentModal({
  component: c,
  onClose,
}: {
  component: ElectronicsComponent
  onClose: () => void
}) {
  const styles = useStyles()
  const [resetSignal, setResetSignal] = React.useState(0)

  /* Close on Escape */
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  /* Lock body scroll */
  React.useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const handleReset = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setResetSignal((s) => s + 1)
  }, [])

  return (
    /* Backdrop — click outside closes */
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      {/* Modal content — click inside does NOT close */}
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* ── Left: 3D viewer ── */}
        <div
          className={styles.canvasPane}
          onDoubleClick={() => setResetSignal((s) => s + 1)}
          title="Drag to orbit · Scroll to zoom · Double-click to reset"
        >
          <Canvas
            className={styles.canvasEl}
            camera={{ position: [2.8, 2.2, 3.6], fov: 40 }}
            dpr={[1, 2]}
            gl={{ antialias: true, toneMappingExposure: 1.1 }}
          >
            <ComponentScene
              shape={c.shape}
              color={c.color}
              size="modal"
              autoRotateSpeed={1.4}
              resetSignal={resetSignal}
            />
          </Canvas>

          {/* Component name / symbol overlay */}
          <div className={styles.nameOverlay}>
            <div className={styles.nameLabel}>{c.name}</div>
            <span className={styles.symbolBadge}>{c.symbol}</span>
          </div>

          {/* Reset camera button */}
          <div className={styles.resetBtn}>
            <Button
              appearance="subtle"
              icon={<ArrowCounterclockwise20Regular />}
              onClick={handleReset}
              aria-label="Reset camera"
              style={{
                backgroundColor: 'rgba(11,18,32,0.7)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#9daec8',
              }}
            />
          </div>

          {/* Hint badge */}
          <div className={styles.hintBadge}>
            Drag to orbit · Scroll to zoom · Double-click to reset
          </div>
        </div>

        {/* ── Right: info panel ── */}
        <div className={styles.infoPane}>
          {/* Sticky header */}
          <div className={styles.infoHeader}>
            <div className={styles.headerLeft}>
              <span className={styles.headerTitle}>{c.name}</span>
              <Caption1 className={styles.headerTagline}>{c.tagline}</Caption1>
              <div className={styles.badgeRow}>
                <Badge appearance="tint" color={DIFF_COLOR[c.difficulty]} size="medium">
                  {c.difficulty}
                </Badge>
                <Badge appearance="outline" color="informative" size="medium">
                  {c.category}
                </Badge>
              </div>
            </div>
            <Button
              appearance="subtle"
              icon={<Dismiss24Regular />}
              aria-label="Close component details"
              onClick={onClose}
              style={{ flexShrink: 0 }}
            />
          </div>

          {/* Scrollable body */}
          <div className={styles.infoBody}>

            {/* Summary */}
            <div className={styles.section}>
              <Subtitle2 className={styles.sectionTitle}>What it is</Subtitle2>
              <Body1 className={styles.bodyText}>{c.summary}</Body1>
            </div>

            <Divider />

            {/* How it works */}
            <div className={styles.section}>
              <Subtitle2 className={styles.sectionTitle}>How it works</Subtitle2>
              <Body1 className={styles.bodyText}>{c.howItWorks}</Body1>
            </div>

            <Divider />

            {/* Pins */}
            <div className={styles.section}>
              <Subtitle2 className={styles.sectionTitle}>Pins &amp; polarity</Subtitle2>
              <div className={styles.pinTable}>
                {/* Header row */}
                <div className={styles.pinRowHeader}>
                  <Text
                    size={100}
                    style={{
                      minWidth: '90px',
                      fontWeight: tokens.fontWeightSemibold,
                      color: tokens.colorNeutralForeground3,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Pin
                  </Text>
                  <Text
                    size={100}
                    style={{
                      fontWeight: tokens.fontWeightSemibold,
                      color: tokens.colorNeutralForeground3,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Role
                  </Text>
                </div>
                {c.pins.map((p, i) => (
                  <div
                    key={p.name}
                    className={`${styles.pinRow}${i % 2 === 1 ? ` ${styles.pinRowAlt}` : ''}`}
                  >
                    <span className={styles.pinName}>{p.name}</span>
                    <span className={styles.pinRole}>{p.role}</span>
                    {p.polarity && (
                      <Badge
                        appearance="tint"
                        color={p.polarity === 'positive' ? 'success' : 'severe'}
                        size="small"
                      >
                        {p.polarity === 'positive' ? '+' : '−'}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Divider />

            {/* Common uses */}
            <div className={styles.section}>
              <Subtitle2 className={styles.sectionTitle}>Common uses</Subtitle2>
              <div className={styles.usesList}>
                {c.uses.map((u) => (
                  <div key={u} className={styles.useItem}>
                    <span className={styles.useDot}>›</span>
                    <Body1 className={styles.bodyText}>{u}</Body1>
                  </div>
                ))}
              </div>
            </div>

            {/* Fun fact */}
            <div className={styles.factCard}>
              <Lightbulb20Regular className={styles.factIcon} />
              <div>
                <Caption1
                  style={{
                    fontWeight: tokens.fontWeightSemibold,
                    display: 'block',
                    marginBottom: tokens.spacingVerticalXS,
                    color: '#c9890e',
                  }}
                >
                  Did you know?
                </Caption1>
                <Body1>{c.funFact}</Body1>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
