'use client'

import * as React from 'react'
import {
  makeStyles,
  tokens,
  Title3,
  Subtitle1,
  Subtitle2,
  Body1,
  Caption1,
  Button,
} from '@fluentui/react-components'
import {
  ArrowLeft20Regular,
  Checkmark16Filled,
  ChevronRight20Regular,
  Lightbulb20Filled,
  Flash24Filled,
} from '@fluentui/react-icons'
import type { Project, GuidedProgress } from '@/lib/projects'
import { getComponent } from '@/lib/electronics-data'
import { SIGNAL, STATUS, GLOW, MONO_STACK, PCB, EASE_ELECTRIC } from '@/lib/theme'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '380px',
    flexShrink: 0,
    borderRight: `1px solid ${PCB.strokeRed}`,
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
  },
  scroll: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalL,
    overflowY: 'auto',
    flexGrow: 1,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  kicker: {
    fontFamily: MONO_STACK,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: SIGNAL.hot,
  },
  concept: {
    padding: tokens.spacingHorizontalM,
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground3,
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-start',
  },
  parts: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  partRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    fontFamily: MONO_STACK,
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
  },
  swatch: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
    flexShrink: 0,
  },
  sectionLabel: {
    fontFamily: MONO_STACK,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: tokens.colorNeutralForeground3,
  },
  // Stepper
  steps: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  step: {
    display: 'grid',
    gridTemplateColumns: '26px 1fr',
    columnGap: tokens.spacingHorizontalM,
    alignItems: 'start',
    padding: tokens.spacingHorizontalS,
    borderRadius: '6px',
    border: '1px solid transparent',
    transitionDuration: tokens.durationNormal,
    transitionProperty: 'background-color, border-color, opacity',
    transitionTimingFunction: EASE_ELECTRIC,
  },
  stepCurrent: {
    backgroundColor: 'rgba(255,45,45,0.08)',
    borderTopColor: SIGNAL.red,
    borderRightColor: SIGNAL.red,
    borderBottomColor: SIGNAL.red,
    borderLeftColor: SIGNAL.red,
  },
  stepDone: {
    opacity: 0.6,
  },
  stepUpcoming: {
    opacity: 0.4,
  },
  marker: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    fontFamily: MONO_STACK,
    fontSize: '12px',
    fontWeight: 700,
    border: `2px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground3,
  },
  markerCurrent: {
    border: `2px solid ${SIGNAL.red}`,
    color: SIGNAL.hot,
    boxShadow: GLOW.sm,
  },
  markerDone: {
    border: `2px solid ${SIGNAL.red}`,
    backgroundColor: SIGNAL.red,
    color: '#fff',
  },
  stepText: {
    paddingTop: '2px',
  },
  // Live status footer
  footer: {
    borderTop: `1px solid ${PCB.strokeRed}`,
    padding: tokens.spacingHorizontalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  statusLine: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    fontFamily: MONO_STACK,
    fontSize: '12px',
    letterSpacing: '0.06em',
  },
  led: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  // Alive celebration
  alive: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    borderRadius: '8px',
    border: `1px solid ${SIGNAL.red}`,
    backgroundColor: 'rgba(255,45,45,0.06)',
    boxShadow: GLOW.md,
  },
  aliveTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: SIGNAL.hot,
  },
  howList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    margin: 0,
    paddingLeft: tokens.spacingHorizontalL,
  },
})

export function ProjectWorkspace({
  project,
  progress,
  onBack,
  onComplete,
}: {
  project: Project
  progress: GuidedProgress | null
  onBack: () => void
  /** Called once, when the circuit first comes alive. */
  onComplete: (id: string) => void
}) {
  const styles = useStyles()

  const currentStep = progress?.currentStepIndex ?? 0
  const completedSteps = progress?.completedStepCount ?? 0
  const alive = progress?.alive ?? false
  const wiringComplete = progress?.wiringComplete ?? false

  // Fire completion exactly once when the circuit first comes alive.
  const firedRef = React.useRef(false)
  React.useEffect(() => {
    if (alive && !firedRef.current) {
      firedRef.current = true
      onComplete(project.id)
    }
    if (!alive) firedRef.current = firedRef.current && false
  }, [alive, project.id, onComplete])

  // Reset the one-shot guard when switching projects.
  React.useEffect(() => {
    firedRef.current = false
  }, [project.id])

  const statusColor = alive
    ? STATUS.active
    : wiringComplete
      ? STATUS.warning
      : tokens.colorNeutralForeground3
  const statusLabel = alive
    ? 'CIRCUIT ALIVE'
    : wiringComplete
      ? 'WIRED · NEEDS POWER'
      : `STEP ${Math.min(currentStep + 1, project.steps.length)} / ${project.steps.length}`

  return (
    <aside className={styles.root}>
      <div className={styles.scroll}>
        <Button
          className={styles.backBtn}
          appearance="subtle"
          size="small"
          icon={<ArrowLeft20Regular />}
          onClick={onBack}
        >
          Build Path
        </Button>

        <div>
          <span className={styles.kicker}>
            Project {String(project.order).padStart(2, '0')}
          </span>
          <Title3 style={{ display: 'block' }}>{project.title}</Title3>
          <Body1 style={{ color: tokens.colorNeutralForeground2 }}>{project.tagline}</Body1>
        </div>

        <div className={styles.concept}>
          <Lightbulb20Filled style={{ color: SIGNAL.hot, flexShrink: 0 }} />
          <Caption1 style={{ color: tokens.colorNeutralForeground2 }}>{project.concept}</Caption1>
        </div>

        <div>
          <span className={styles.sectionLabel}>Bill of materials</span>
          <div className={styles.parts} style={{ marginTop: tokens.spacingVerticalXS }}>
            {project.components.map((bom) => {
              const def = getComponent(bom.componentId)
              if (!def) return null
              return (
                <div key={bom.componentId} className={styles.partRow}>
                  <span className={styles.swatch} style={{ backgroundColor: def.color }} />
                  <span>
                    {bom.qty}× {def.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <span className={styles.sectionLabel}>Wiring steps</span>
          <div className={styles.steps} style={{ marginTop: tokens.spacingVerticalXS }}>
            {project.steps.map((step, i) => {
              const done = i < completedSteps
              const isCurrent = i === currentStep && !alive
              return (
                <div
                  key={step.id}
                  className={`${styles.step} ${
                    isCurrent ? styles.stepCurrent : done ? styles.stepDone : styles.stepUpcoming
                  }`}
                >
                  <span
                    className={`${styles.marker} ${
                      done ? styles.markerDone : isCurrent ? styles.markerCurrent : ''
                    }`}
                  >
                    {done ? <Checkmark16Filled /> : i + 1}
                  </span>
                  <div className={styles.stepText}>
                    <Body1
                      style={{
                        color: isCurrent
                          ? tokens.colorNeutralForeground1
                          : tokens.colorNeutralForeground2,
                        fontWeight: isCurrent ? 600 : 400,
                      }}
                    >
                      {step.instruction}
                    </Body1>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {alive && (
          <div className={styles.alive}>
            <div className={styles.aliveTitle}>
              <Flash24Filled />
              <Subtitle1 style={{ color: 'inherit' }}>It&apos;s alive!</Subtitle1>
            </div>
            <Body1 style={{ color: tokens.colorNeutralForeground1 }}>
              You built the {project.title.toLowerCase()} and current is flowing. Here&apos;s what&apos;s
              happening:
            </Body1>
            <ul className={styles.howList}>
              {project.howItWorks.map((line, i) => (
                <li key={i}>
                  <Caption1 style={{ color: tokens.colorNeutralForeground2 }}>{line}</Caption1>
                </li>
              ))}
            </ul>
            <Button
              appearance="primary"
              icon={<ChevronRight20Regular />}
              iconPosition="after"
              onClick={onBack}
            >
              Back to Build Path
            </Button>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.statusLine}>
          <span
            className={styles.led}
            style={{
              backgroundColor: statusColor,
              boxShadow: alive ? `0 0 10px 1px ${STATUS.active}` : undefined,
            }}
          />
          <span style={{ color: statusColor }}>{statusLabel}</span>
        </div>
        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
          {alive
            ? 'Circuit complete. Great work!'
            : project.needsPress && wiringComplete
              ? 'Wiring done — press the button in the lab to send power through.'
              : 'Connect the gold pins in the 3D lab following the steps above.'}
        </Caption1>
      </div>
    </aside>
  )
}
