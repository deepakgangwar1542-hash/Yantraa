'use client'

import * as React from 'react'
import {
  makeStyles,
  tokens,
  Title2,
  Title3,
  Subtitle1,
  Subtitle2,
  Body1,
  Caption1,
  Button,
  ProgressBar,
} from '@fluentui/react-components'
import {
  LockClosed20Filled,
  Checkmark20Filled,
  Play20Filled,
  Circle20Regular,
} from '@fluentui/react-icons'
import { PROJECTS, TIER_LABELS, type Project, type ProjectTier } from '@/lib/projects'
import { getComponent } from '@/lib/electronics-data'
import { SIGNAL, COPPER, STATUS, GLOW, MONO_STACK, EASE_ELECTRIC } from '@/lib/theme'

type NodeState = 'locked' | 'current' | 'available' | 'complete'

const useStyles = makeStyles({
  root: {
    height: '100%',
    overflowY: 'auto',
    padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXXL}`,
  },
  inner: {
    maxWidth: '760px',
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXL,
  },
  // Header / progress meter
  head: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  kicker: {
    fontFamily: MONO_STACK,
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: SIGNAL.hot,
  },
  meter: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalS,
  },
  meterCount: {
    fontFamily: MONO_STACK,
    fontSize: '13px',
    letterSpacing: '0.08em',
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'nowrap',
  },
  tier: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  tierHead: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  tierName: {
    display: 'flex',
    alignItems: 'baseline',
    gap: tokens.spacingHorizontalS,
  },
  tierBadge: {
    fontFamily: MONO_STACK,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.14em',
    color: COPPER.idleLit,
  },
  // Node row: [rail with dot] [card]
  row: {
    display: 'grid',
    gridTemplateColumns: '48px 1fr',
    columnGap: tokens.spacingHorizontalL,
  },
  rail: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
  },
  // Vertical copper trace behind the node dots.
  trace: {
    position: 'absolute',
    top: 0,
    bottom: '-24px',
    left: '50%',
    width: '2px',
    transform: 'translateX(-50%)',
    backgroundColor: COPPER.idle,
  },
  traceLive: {
    backgroundColor: SIGNAL.red,
    boxShadow: GLOW.sm,
  },
  traceFlow: {
    animationName: {
      '0%': { opacity: 0.45 },
      '50%': { opacity: 1 },
      '100%': { opacity: 0.45 },
    },
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
    },
  },
  node: {
    position: 'relative',
    zIndex: 1,
    marginTop: '20px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    border: `2px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  nodeLocked: {
    border: `2px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground4,
  },
  nodeComplete: {
    border: `2px solid ${SIGNAL.red}`,
    backgroundColor: SIGNAL.red,
    color: '#fff',
    boxShadow: GLOW.sm,
  },
  nodeCurrent: {
    border: `2px solid ${SIGNAL.red}`,
    color: SIGNAL.hot,
    boxShadow: GLOW.md,
    animationName: 'trace-pulse',
    animationDuration: '2.4s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
    },
  },
  nodeAvailable: {
    border: `2px solid ${COPPER.idleLit}`,
    color: COPPER.idleLit,
  },
  // Project card
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalL,
    borderRadius: '6px',
    border: `1px solid rgba(255,70,58,0.16)`,
    backgroundColor: tokens.colorNeutralBackground1,
    transitionDuration: tokens.durationNormal,
    transitionProperty: 'transform, border-color, box-shadow, opacity',
    transitionTimingFunction: EASE_ELECTRIC,
  },
  cardActionable: {
    ':hover': {
      transform: 'translateY(-2px)',
      borderTopColor: SIGNAL.red,
      borderRightColor: SIGNAL.red,
      borderBottomColor: SIGNAL.red,
      borderLeftColor: SIGNAL.red,
      boxShadow: GLOW.md,
    },
  },
  cardLocked: {
    opacity: 0.55,
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
  },
  order: {
    fontFamily: MONO_STACK,
    fontSize: '11px',
    letterSpacing: '0.12em',
    color: tokens.colorNeutralForeground3,
  },
  parts: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    marginTop: '2px',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    height: '24px',
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  swatch: {
    width: '10px',
    height: '10px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  chipText: {
    fontFamily: MONO_STACK,
    fontSize: '11px',
    color: tokens.colorNeutralForeground2,
  },
  cardFoot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalXS,
  },
  statusText: {
    fontFamily: MONO_STACK,
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
})

function nodeStateFor(
  project: Project,
  isCompleted: (id: string) => boolean,
  isUnlocked: (p: Project) => boolean,
  firstIncompleteOrder: number,
): NodeState {
  if (isCompleted(project.id)) return 'complete'
  if (!isUnlocked(project)) return 'locked'
  if (project.order === firstIncompleteOrder) return 'current'
  return 'available'
}

export function BuildPath({
  onOpen,
  completed,
  isCompleted,
  isUnlocked,
  hydrated,
}: {
  onOpen: (project: Project) => void
  completed: Set<string>
  isCompleted: (id: string) => boolean
  isUnlocked: (project: Project) => boolean
  hydrated: boolean
}) {
  const styles = useStyles()

  const total = PROJECTS.length
  const done = completed.size
  const pct = Math.round((done / total) * 100)

  // The current node is the first unlocked-but-incomplete project.
  const firstIncompleteOrder = React.useMemo(() => {
    const next = PROJECTS.filter((p) => !isCompleted(p.id) && isUnlocked(p)).sort(
      (a, b) => a.order - b.order,
    )[0]
    return next?.order ?? -1
  }, [isCompleted, isUnlocked])

  const tiers: ProjectTier[] = ['beginner', 'intermediate']

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <span className={styles.kicker}>Build Path</span>
          <Title2>From first light to living circuits</Title2>
          <Body1 style={{ color: tokens.colorNeutralForeground2, maxWidth: '52ch' }}>
            Ten hands-on builds, each unlocking the next. Follow the wiring steps in the 3D lab and
            watch your circuit come alive.
          </Body1>
          <div className={styles.meter}>
            <ProgressBar
              value={done}
              max={total}
              thickness="large"
              color="brand"
              style={{ flexGrow: 1 }}
            />
            <span className={styles.meterCount}>
              {hydrated ? `${done}/${total} · ${pct}%` : `—/${total}`}
            </span>
          </div>
        </header>

        {tiers.map((tier) => {
          const tierProjects = PROJECTS.filter((p) => p.tier === tier).sort(
            (a, b) => a.order - b.order,
          )
          if (tierProjects.length === 0) return null
          const label = TIER_LABELS[tier]
          return (
            <section key={tier} className={styles.tier}>
              <div className={styles.tierHead}>
                <div className={styles.tierName}>
                  <Subtitle1>{label.name}</Subtitle1>
                  <span className={styles.tierBadge}>
                    TIER {tier === 'beginner' ? '01' : '02'}
                  </span>
                </div>
                <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>{label.blurb}</Caption1>
              </div>

              {tierProjects.map((project, idxInTier) => {
                const state = nodeStateFor(project, isCompleted, isUnlocked, firstIncompleteOrder)
                const actionable = state !== 'locked'
                const isLastInTier = idxInTier === tierProjects.length - 1
                // The trace segment below a node is "live" once this node is complete.
                const traceLive = state === 'complete'

                return (
                  <div key={project.id} className={styles.row}>
                    <div className={styles.rail}>
                      {!isLastInTier && (
                        <span
                          className={`${styles.trace} ${
                            traceLive ? `${styles.traceLive} ${styles.traceFlow}` : ''
                          }`}
                          aria-hidden
                        />
                      )}
                      <span
                        className={`${styles.node} ${
                          state === 'complete'
                            ? styles.nodeComplete
                            : state === 'current'
                              ? styles.nodeCurrent
                              : state === 'locked'
                                ? styles.nodeLocked
                                : styles.nodeAvailable
                        }`}
                        aria-hidden
                      >
                        {state === 'complete' ? (
                          <Checkmark20Filled />
                        ) : state === 'locked' ? (
                          <LockClosed20Filled />
                        ) : state === 'current' ? (
                          <Play20Filled />
                        ) : (
                          <Circle20Regular />
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!actionable}
                      onClick={() => actionable && onOpen(project)}
                      className={`${styles.card} ${actionable ? styles.cardActionable : styles.cardLocked}`}
                      style={{
                        cursor: actionable ? 'pointer' : 'not-allowed',
                        textAlign: 'left',
                      }}
                    >
                      <div className={styles.cardTop}>
                        <div>
                          <span className={styles.order}>
                            PROJECT {String(project.order).padStart(2, '0')}
                          </span>
                          <Title3 style={{ display: 'block' }}>{project.title}</Title3>
                        </div>
                      </div>
                      <Body1 style={{ color: tokens.colorNeutralForeground2 }}>
                        {project.tagline}
                      </Body1>

                      <div className={styles.parts}>
                        {project.components.map((bom) => {
                          const def = getComponent(bom.componentId)
                          if (!def) return null
                          return (
                            <span key={bom.componentId} className={styles.chip}>
                              <span
                                className={styles.swatch}
                                style={{ backgroundColor: def.color }}
                              />
                              <span className={styles.chipText}>
                                {def.name}
                                {bom.qty > 1 ? ` ×${bom.qty}` : ''}
                              </span>
                            </span>
                          )
                        })}
                      </div>

                      <div className={styles.cardFoot}>
                        <span
                          className={styles.statusText}
                          style={{
                            color:
                              state === 'complete'
                                ? STATUS.active
                                : state === 'locked'
                                  ? tokens.colorNeutralForeground4
                                  : SIGNAL.hot,
                          }}
                        >
                          {state === 'complete'
                            ? 'Built'
                            : state === 'current'
                              ? 'Continue'
                              : state === 'locked'
                                ? 'Locked'
                                : 'Ready'}
                        </span>
                        {actionable && (
                          <Button
                            appearance={state === 'complete' ? 'secondary' : 'primary'}
                            size="small"
                            icon={<Play20Filled />}
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpen(project)
                            }}
                          >
                            {state === 'complete' ? 'Rebuild' : state === 'current' ? 'Continue' : 'Start'}
                          </Button>
                        )}
                      </div>
                    </button>
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>
    </div>
  )
}
