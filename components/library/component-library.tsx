'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import {
  makeStyles,
  mergeClasses,
  tokens,
  Input,
  Badge,
  Text,
  Subtitle2,
  Body1,
  Caption1,
} from '@fluentui/react-components'
import { Search24Regular } from '@fluentui/react-icons'
import {
  COMPONENTS,
  CATEGORIES,
  type ElectronicsComponent,
  type Difficulty,
  type ShapeKind,
} from '@/lib/electronics-data'

/* ------------------------------------------------------------------ */
/* Lazy / dynamic imports (client-only WebGL)                          */
/* ------------------------------------------------------------------ */

/**
 * Full-screen 3D detail modal. Dynamic so Three.js / Canvas is excluded
 * from the SSR bundle.
 */
const ComponentModal = dynamic(
  () => import('./component-modal').then((m) => ({ default: m.ComponentModal })),
  { ssr: false }
)

/**
 * Tiny 3D canvas rendered inside each component card.
 * Dynamic so it can be lazy-mounted via IntersectionObserver.
 */
const CardThumb3D = dynamic(
  () => import('./card-thumb').then((m) => ({ default: m.CardThumb3D })),
  { ssr: false, loading: () => null }
)

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const DIFF_COLOR: Record<Difficulty, 'success' | 'warning' | 'danger'> = {
  Beginner: 'success',
  Intermediate: 'warning',
  Advanced: 'danger',
}

/* ------------------------------------------------------------------ */
/* Card 3D thumbnail wrapper                                            */
/* ------------------------------------------------------------------ */

/**
 * Lazy-mounts the 3D canvas when the card first scrolls into view.
 * Once mounted the canvas stays alive (avoids re-init jank on scroll).
 * Uses powerPreference: 'low-power' internally.
 */
function CardThumb({
  shape,
  color,
  hovered,
}: {
  shape: ShapeKind
  color: string
  hovered: boolean
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setMounted(true)
      },
      { rootMargin: '120px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        width: 76,
        height: 76,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#2b3a52',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        flexShrink: 0,
        transition: 'box-shadow 200ms ease, border-color 200ms ease',
        boxShadow: hovered
          ? `0 0 0 2px ${tokens.colorBrandBackground}, 0 4px 12px rgba(0, 0, 0, 0.3)`
          : 'inset 0 1px 2px rgba(255, 255, 255, 0.08), 0 2px 6px rgba(0, 0, 0, 0.2)',
      }}
    >
      {mounted && <CardThumb3D shape={shape} color={color} hovered={hovered} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */

const useStyles = makeStyles({
  root: {
    height: '100%',
    overflowY: 'auto',
    paddingLeft: tokens.spacingHorizontalXL,
    paddingRight: tokens.spacingHorizontalXL,
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalXXL,
  },

  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalL,
  },

  search: {
    minWidth: '240px',
    flexGrow: 1,
    maxWidth: '420px',
  },

  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
  },

  chip: {
    borderRadius: tokens.borderRadiusCircular,
    cursor: 'pointer',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },

  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusXLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    textAlign: 'left',
    transform: 'translateY(0)',
    transitionDuration: tokens.durationNormal,
    transitionProperty: 'transform, border-color, box-shadow',
    ':hover': {
      transform: 'translateY(-3px)',
      border: `1px solid ${tokens.colorBrandStroke1}`,
      boxShadow: tokens.shadow16,
    },
  },

  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
  },

  cardInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },

  tagline: {
    color: tokens.colorNeutralForeground3,
  },

  empty: {
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
    paddingTop: tokens.spacingVerticalXXL,
  },
})

/* ------------------------------------------------------------------ */
/* Main component                                                       */
/* ------------------------------------------------------------------ */

export function ComponentLibrary() {
  const styles = useStyles()
  const [query, setQuery] = React.useState('')
  const [category, setCategory] = React.useState<string>('All')
  const [selected, setSelected] = React.useState<ElectronicsComponent | null>(null)
  const [hoveredId, setHoveredId] = React.useState<string | null>(null)

  const filtered = COMPONENTS.filter((c) => {
    const matchesCat = category === 'All' || c.category === category
    const q = query.trim().toLowerCase()
    const matchesQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.tagline.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q)
    return matchesCat && matchesQuery
  })

  return (
    <div className={styles.root}>
      {/* Search + filter toolbar */}
      <div className={styles.toolbar}>
        <Input
          className={styles.search}
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          contentBefore={<Search24Regular />}
          placeholder="Search components (LED, resistor, sensor…)"
        />
        <div className={styles.filters}>
          <Badge
            className={styles.chip}
            appearance={category === 'All' ? 'filled' : 'outline'}
            color={category === 'All' ? 'brand' : 'informative'}
            size="extra-large"
            onClick={() => setCategory('All')}
          >
            All
          </Badge>
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat}
              className={styles.chip}
              appearance={category === cat ? 'filled' : 'outline'}
              color={category === cat ? 'brand' : 'informative'}
              size="extra-large"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Component grid */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <Body1>No components match your search.</Body1>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((c) => {
            const isHovered = hoveredId === c.id
            return (
              <button
                key={c.id}
                className={styles.card}
                onClick={() => setSelected(c)}
                onMouseEnter={() => setHoveredId(c.id)}
                onMouseLeave={() => setHoveredId(null)}
                aria-label={`View ${c.name} in 3D`}
              >
                {/* Card top: 3D thumb + difficulty badge */}
                <div className={styles.cardTop}>
                  <CardThumb shape={c.shape} color={c.color} hovered={isHovered} />
                  <Badge appearance="tint" color={DIFF_COLOR[c.difficulty]}>
                    {c.difficulty}
                  </Badge>
                </div>

                {/* Name, category, tagline */}
                <div className={styles.cardInfo}>
                  <Subtitle2>{c.name}</Subtitle2>
                  <Caption1 className={styles.tagline}>{c.category}</Caption1>
                  <Body1 className={styles.tagline}>{c.tagline}</Body1>
                </div>

                {/* "View in 3D" hint that fades in on hover */}
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 2,
                    color: tokens.colorBrandForeground1,
                    fontSize: tokens.fontSizeBase100,
                    fontWeight: tokens.fontWeightSemibold,
                    opacity: isHovered ? 1 : 0,
                    transition: `opacity ${tokens.durationNormal}`,
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                  Open 3D viewer
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Full-screen 3D detail modal */}
      {selected && (
        <ComponentModal component={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
