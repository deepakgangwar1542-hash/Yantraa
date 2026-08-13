'use client'

import * as React from 'react'
import {
  makeStyles,
  tokens,
  Input,
  Badge,
  Text,
  Title3,
  Subtitle2,
  Body1,
  Caption1,
  Button,
  Divider,
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
} from '@fluentui/react-components'
import { Search24Regular, Dismiss24Regular, Lightbulb20Regular } from '@fluentui/react-icons'
import {
  COMPONENTS,
  CATEGORIES,
  type ElectronicsComponent,
  type Difficulty,
} from '@/lib/electronics-data'

const DIFF_COLOR: Record<Difficulty, 'success' | 'warning' | 'danger'> = {
  Beginner: 'success',
  Intermediate: 'warning',
  Advanced: 'danger',
}

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
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
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
  swatch: {
    display: 'grid',
    placeItems: 'center',
    width: '44px',
    height: '44px',
    borderRadius: tokens.borderRadiusMedium,
    color: '#fff',
    fontWeight: tokens.fontWeightBold,
    fontSize: tokens.fontSizeBase200,
    flexShrink: 0,
  },
  cardTitle: {
    display: 'flex',
    flexDirection: 'column',
  },
  tagline: {
    color: tokens.colorNeutralForeground3,
  },
  empty: {
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
    paddingTop: tokens.spacingVerticalXXL,
  },
  // drawer
  detailHead: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalM,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    marginTop: tokens.spacingVerticalL,
  },
  pinRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  pinName: {
    minWidth: '96px',
    fontWeight: tokens.fontWeightSemibold,
  },
  useList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  useItem: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'baseline',
  },
  dot: { color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightBold },
  factCard: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-start',
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorPaletteYellowBackground1,
    color: tokens.colorNeutralForeground1,
    marginTop: tokens.spacingVerticalM,
  },
})

export function ComponentLibrary() {
  const styles = useStyles()
  const [query, setQuery] = React.useState('')
  const [category, setCategory] = React.useState<string>('All')
  const [selected, setSelected] = React.useState<ElectronicsComponent | null>(null)

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
      <div className={styles.toolbar}>
        <Input
          className={styles.search}
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          contentBefore={<Search24Regular />}
          placeholder="Search components (LED, resistor, sensor...)"
        />
        <div className={styles.filters}>
          <Badge
            className={styles.chip}
            appearance={category === 'All' ? 'filled' : 'outline'}
            color={category === 'All' ? 'brand' : 'informative'}
            size="extra-large"
            onClick={() => setCategory('All')}
            style={{ cursor: 'pointer' }}
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
              style={{ cursor: 'pointer' }}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <Body1>No components match your search.</Body1>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((c) => (
            <button key={c.id} className={styles.card} onClick={() => setSelected(c)}>
              <div className={styles.cardTop}>
                <span className={styles.swatch} style={{ backgroundColor: c.color }}>
                  {c.symbol}
                </span>
                <Badge appearance="tint" color={DIFF_COLOR[c.difficulty]}>
                  {c.difficulty}
                </Badge>
              </div>
              <div className={styles.cardTitle}>
                <Subtitle2>{c.name}</Subtitle2>
                <Caption1 className={styles.tagline}>{c.category}</Caption1>
              </div>
              <Body1 className={styles.tagline}>{c.tagline}</Body1>
            </button>
          ))}
        </div>
      )}

      <Drawer
        type="overlay"
        position="end"
        open={selected !== null}
        onOpenChange={(_, d) => !d.open && setSelected(null)}
        style={{ maxWidth: '480px', width: '92vw' }}
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <Button
                appearance="subtle"
                icon={<Dismiss24Regular />}
                aria-label="Close"
                onClick={() => setSelected(null)}
              />
            }
          >
            Component details
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>{selected && <ComponentDetail c={selected} styles={styles} />}</DrawerBody>
      </Drawer>
    </div>
  )
}

function ComponentDetail({
  c,
  styles,
}: {
  c: ElectronicsComponent
  styles: ReturnType<typeof useStyles>
}) {
  return (
    <div>
      <div className={styles.detailHead}>
        <span
          className={styles.swatch}
          style={{ backgroundColor: c.color, width: '56px', height: '56px' }}
        >
          {c.symbol}
        </span>
        <div>
          <Title3>{c.name}</Title3>
          <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>{c.tagline}</Caption1>
        </div>
      </div>
      <Badge appearance="tint" color={DIFF_COLOR[c.difficulty]}>
        {c.difficulty}
      </Badge>{' '}
      <Badge appearance="outline" color="informative">
        {c.category}
      </Badge>

      <div className={styles.section}>
        <Subtitle2>What it is</Subtitle2>
        <Body1 style={{ color: tokens.colorNeutralForeground2 }}>{c.summary}</Body1>
      </div>

      <Divider />

      <div className={styles.section}>
        <Subtitle2>How it works</Subtitle2>
        <Body1 style={{ color: tokens.colorNeutralForeground2 }}>{c.howItWorks}</Body1>
      </div>

      <div className={styles.section}>
        <Subtitle2>Pins &amp; polarity</Subtitle2>
        <div>
          {c.pins.map((p) => (
            <div key={p.name} className={styles.pinRow}>
              <Text className={styles.pinName}>{p.name}</Text>
              <Text style={{ color: tokens.colorNeutralForeground3 }}>{p.role}</Text>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <Subtitle2>Common uses</Subtitle2>
        <div className={styles.useList}>
          {c.uses.map((u) => (
            <div key={u} className={styles.useItem}>
              <span className={styles.dot}>&bull;</span>
              <Body1 style={{ color: tokens.colorNeutralForeground2 }}>{u}</Body1>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.factCard}>
        <Lightbulb20Regular style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <Caption1 style={{ fontWeight: tokens.fontWeightSemibold }}>Did you know?</Caption1>
          <Body1>{c.funFact}</Body1>
        </div>
      </div>
    </div>
  )
}
