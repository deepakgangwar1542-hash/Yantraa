'use client'

import * as React from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei'
import { makeStyles, mergeClasses, tokens, Button } from '@fluentui/react-components'
import {
  CubeMultiple24Filled,
  BrainCircuit24Filled,
  BookOpen24Filled,
  Rocket24Filled,
  ArrowRight20Filled,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
  ChevronDown20Regular,
} from '@fluentui/react-icons'
import { useThemeMode } from '@/app/providers'
import { COMPONENTS } from '@/lib/electronics-data'
import { ComponentShape } from '@/components/lab/component-mesh'
import { SIGNAL, COPPER, GLOW, MONO_STACK, PCB } from '@/lib/theme'

// Reuse the app's ambient schematic as the landing background (client-only).
const AmbientBackground = dynamic(
  () => import('@/components/ambient-background').then((m) => m.AmbientBackground),
  { ssr: false },
)

const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

/* ------------------------------------------------------------------ */
/* Scroll reveal                                                       */
/* ------------------------------------------------------------------ */
function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = React.useRef<T>(null)
  const [shown, setShown] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true)
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, shown }
}

/* Mount a canvas only while its section is on screen (frees the GPU + keeps
   the number of live WebGL contexts minimal). */
function useInView<T extends HTMLElement = HTMLDivElement>(margin = '200px') {
  const ref = React.useRef<T>(null)
  const [inView, setInView] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const io = new IntersectionObserver((entries) => setInView(entries[0].isIntersecting), {
      rootMargin: `${margin} 0px ${margin} 0px`,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [margin])
  return { ref, inView }
}

const useStyles = makeStyles({
  page: {
    position: 'relative',
    minHeight: '100dvh',
    width: '100%',
    overflowX: 'hidden',
    backgroundColor: PCB.base,
    color: tokens.colorNeutralForeground1,
  },
  // The app's Living Schematic canvas, pinned behind all content.
  bgLayer: {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
  },
  // All page content sits above the schematic background.
  content: {
    position: 'relative',
    zIndex: 1,
  },
  /* Nav */
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 'clamp(16px, 5vw, 56px)',
    paddingRight: 'clamp(16px, 5vw, 56px)',
    paddingTop: '18px',
    paddingBottom: '18px',
    transitionProperty: 'padding, background-color, border-color, backdrop-filter',
    transitionDuration: '240ms',
    transitionTimingFunction: EASE,
    borderBottom: '1px solid transparent',
  },
  navScrolled: {
    paddingTop: '10px',
    paddingBottom: '10px',
    backgroundColor: 'rgba(9,11,13,0.8)',
    backdropFilter: 'blur(14px)',
    borderBottom: `1px solid ${PCB.strokeRed}`,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
    color: tokens.colorNeutralForeground1,
  },
  // IC-chip package: dark body, red die glow, crisp corners — the shared mark.
  brandGlyph: {
    display: 'grid',
    placeItems: 'center',
    width: '34px',
    height: '34px',
    borderRadius: '7px',
    color: '#fff',
    border: `1px solid ${SIGNAL.red}`,
    backgroundColor: '#141416',
    backgroundImage:
      'radial-gradient(circle at 50% 45%, rgba(255,45,45,0.55), rgba(255,45,45,0.08) 60%, transparent 72%)',
    boxShadow: GLOW.md,
  },
  brandWord: {
    fontFamily: MONO_STACK,
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '0.24em',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(10px, 2.4vw, 30px)',
  },
  navLink: {
    color: tokens.colorNeutralForeground2,
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.02em',
    transitionProperty: 'color',
    transitionDuration: '140ms',
    ':hover': { color: tokens.colorNeutralForeground1 },
    '@media (max-width: 860px)': { display: 'none' },
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  /* Hero */
  hero: {
    position: 'relative',
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    paddingLeft: 'clamp(20px, 6vw, 40px)',
    paddingRight: 'clamp(20px, 6vw, 40px)',
    paddingTop: '120px',
    paddingBottom: '80px',
  },
  // Soft radial vignette so the hero copy stays legible over the schematic.
  heroScrim: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
    backgroundImage:
      'radial-gradient(ellipse 78% 62% at 50% 46%, rgba(9,11,13,0.92) 0%, rgba(9,11,13,0.78) 45%, rgba(9,11,13,0.28) 72%, transparent 100%)',
  },
  heroInner: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '22px',
    maxWidth: '900px',
    transitionProperty: 'opacity, transform',
    transitionDuration: '400ms',
    transitionTimingFunction: EASE,
  },
  eyebrow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    paddingLeft: '12px',
    paddingRight: '12px',
    paddingTop: '6px',
    paddingBottom: '6px',
    borderRadius: '4px',
    border: `1px solid ${PCB.strokeRed}`,
    color: SIGNAL.hot,
    backgroundColor: 'rgba(255,45,45,0.08)',
    fontFamily: MONO_STACK,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  eyebrowDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: SIGNAL.red,
    boxShadow: GLOW.sm,
  },
  wordmark: {
    margin: 0,
    fontWeight: 900,
    lineHeight: 0.92,
    letterSpacing: 'clamp(0.06em, 1.4vw, 0.18em)',
    fontSize: 'clamp(56px, 15vw, 190px)',
    color: tokens.colorNeutralForeground1,
    textShadow: '0 0 60px rgba(255,45,45,0.28)',
  },
  wordmarkA: {
    background: `linear-gradient(180deg, ${SIGNAL.hot} 0%, ${SIGNAL.red} 55%, ${SIGNAL.cool} 100%)`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
  },
  tagline: {
    fontSize: 'clamp(20px, 3.2vw, 32px)',
    fontWeight: 700,
    lineHeight: 1.15,
    letterSpacing: '-0.01em',
    maxWidth: '760px',
    margin: 0,
  },
  sub: {
    fontSize: 'clamp(15px, 1.7vw, 18px)',
    lineHeight: 1.55,
    color: tokens.colorNeutralForeground3,
    maxWidth: '620px',
    margin: 0,
  },
  ctaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '14px',
    justifyContent: 'center',
    marginTop: '8px',
  },
  trust: {
    marginTop: '10px',
    fontSize: '13px',
    letterSpacing: '0.04em',
    color: tokens.colorNeutralForeground4,
  },
  scrollCue: {
    position: 'absolute',
    bottom: '26px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 2,
    color: tokens.colorNeutralForeground4,
    display: 'grid',
    placeItems: 'center',
    animationName: {
      '0%,100%': { transform: 'translate(-50%, 0)' },
      '50%': { transform: 'translate(-50%, 8px)' },
    },
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
  },
  /* Section scaffold */
  section: {
    position: 'relative',
    zIndex: 2,
    paddingLeft: 'clamp(20px, 6vw, 72px)',
    paddingRight: 'clamp(20px, 6vw, 72px)',
    paddingTop: 'clamp(70px, 10vw, 140px)',
    paddingBottom: 'clamp(70px, 10vw, 140px)',
    maxWidth: '1240px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  sectionHead: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginBottom: '52px',
    maxWidth: '640px',
  },
  kicker: {
    fontFamily: MONO_STACK,
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: SIGNAL.hot,
  },
  h2: {
    margin: 0,
    fontSize: 'clamp(30px, 4.6vw, 52px)',
    fontWeight: 800,
    lineHeight: 1.05,
    letterSpacing: '-0.02em',
  },
  lead: {
    margin: 0,
    fontSize: 'clamp(15px, 1.8vw, 18px)',
    lineHeight: 1.55,
    color: tokens.colorNeutralForeground3,
  },
  hairline: {
    height: '1px',
    width: '100%',
    backgroundColor: tokens.colorNeutralStroke2,
    marginTop: '18px',
  },
  /* Reveal animation */
  reveal: {
    opacity: 0,
    transform: 'translateY(26px)',
    transitionProperty: 'opacity, transform',
    transitionDuration: '640ms',
    transitionTimingFunction: EASE,
    '@media (prefers-reduced-motion: reduce)': {
      opacity: 1,
      transform: 'none',
      transitionDuration: '1ms',
    },
  },
  revealShown: {
    opacity: 1,
    transform: 'none',
  },
  /* Feature cards */
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '22px',
  },
  // Feature tile as a labeled chip on the board: crisp corners, red-tinted
  // hairline, a copper trace along the top edge that energizes on hover.
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '30px',
    borderRadius: '8px',
    backgroundColor: PCB.panel1,
    border: `1px solid ${PCB.strokeRed}`,
    overflow: 'hidden',
    transitionProperty: 'transform, border-color, box-shadow',
    transitionDuration: '200ms',
    transitionTimingFunction: EASE,
    '::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '16px',
      right: '16px',
      height: '2px',
      background: `linear-gradient(90deg, transparent, ${COPPER.idle} 20%, ${COPPER.idle} 80%, transparent)`,
      opacity: 0.6,
      transitionProperty: 'opacity, background',
      transitionDuration: '200ms',
    },
    ':hover': {
      transform: 'translateY(-6px)',
      borderTopColor: SIGNAL.red,
      borderRightColor: SIGNAL.red,
      borderBottomColor: SIGNAL.red,
      borderLeftColor: SIGNAL.red,
      boxShadow: GLOW.md,
    },
    ':hover::before': {
      opacity: 1,
      background: `linear-gradient(90deg, transparent, ${SIGNAL.red} 20%, ${SIGNAL.hot} 50%, ${SIGNAL.red} 80%, transparent)`,
    },
  },
  cardNum: {
    fontFamily: MONO_STACK,
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.16em',
    color: SIGNAL.hot,
  },
  cardIcon: {
    display: 'grid',
    placeItems: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    color: SIGNAL.hot,
    border: `1px solid ${PCB.strokeRed}`,
    backgroundColor: 'rgba(255,45,45,0.08)',
  },
  cardTitle: {
    margin: 0,
    fontSize: '21px',
    fontWeight: 750,
    letterSpacing: '-0.01em',
  },
  cardBody: {
    margin: 0,
    fontSize: '15px',
    lineHeight: 1.55,
    color: tokens.colorNeutralForeground3,
  },
  /* Showcase */
  showcase: {
    display: 'grid',
    gridTemplateColumns: '1.25fr 0.9fr',
    gap: '32px',
    alignItems: 'stretch',
    '@media (max-width: 900px)': { gridTemplateColumns: '1fr' },
  },
  stage: {
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
    minHeight: '440px',
    border: `1px solid ${PCB.strokeRed}`,
    background: `radial-gradient(120% 90% at 50% 10%, ${PCB.panel2} 0%, ${PCB.base} 70%)`,
  },
  stageBadge: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    zIndex: 2,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '6px 12px',
    borderRadius: '4px',
    backgroundColor: 'rgba(9,11,13,0.8)',
    backdropFilter: 'blur(8px)',
    border: `1px solid ${PCB.strokeRed}`,
    color: '#fff',
    fontFamily: MONO_STACK,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  spec: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    padding: '30px',
    borderRadius: '8px',
    backgroundColor: PCB.panel1,
    border: `1px solid ${PCB.strokeRed}`,
    minWidth: 0,
  },
  specName: {
    margin: 0,
    fontSize: '30px',
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  specMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '4px',
    fontFamily: MONO_STACK,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    border: `1px solid ${PCB.strokeRed}`,
    color: tokens.colorNeutralForeground2,
  },
  chipRed: {
    border: '1px solid transparent',
    color: '#fff',
    backgroundColor: SIGNAL.red,
    boxShadow: GLOW.sm,
  },
  specTagline: {
    margin: 0,
    fontSize: '17px',
    fontWeight: 650,
    color: tokens.colorNeutralForeground1,
  },
  specFact: {
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.55,
    color: tokens.colorNeutralForeground3,
    paddingLeft: '14px',
    borderLeft: `2px solid ${SIGNAL.red}`,
  },
  thumbStrip: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: 'auto',
  },
  thumb: {
    width: '38px',
    height: '38px',
    borderRadius: '6px',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.02em',
    border: `1px solid ${PCB.strokeRed}`,
    backgroundColor: PCB.panel2,
    color: tokens.colorNeutralForeground2,
    transitionProperty: 'transform, border-color, color',
    transitionDuration: '140ms',
    ':hover': { transform: 'translateY(-2px)', color: tokens.colorNeutralForeground1 },
  },
  thumbActive: {
    border: `1px solid ${SIGNAL.red}`,
    color: '#fff',
    backgroundColor: 'rgba(255,45,45,0.18)',
    boxShadow: GLOW.sm,
  },
  /* Steps */
  steps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '22px',
    position: 'relative',
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '28px',
    borderRadius: '8px',
    backgroundColor: PCB.panel1,
    border: `1px solid ${PCB.strokeRed}`,
  },
  stepNum: {
    display: 'grid',
    placeItems: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    fontFamily: MONO_STACK,
    fontWeight: 700,
    color: '#fff',
    border: `1px solid ${SIGNAL.red}`,
    backgroundColor: '#141416',
    backgroundImage:
      'radial-gradient(circle at 50% 45%, rgba(255,45,45,0.5), transparent 72%)',
    boxShadow: GLOW.sm,
  },
  /* CTA */
  ctaBanner: {
    position: 'relative',
    zIndex: 2,
    margin: 'clamp(40px, 6vw, 80px) auto',
    maxWidth: '1100px',
    marginLeft: 'clamp(20px, 6vw, 72px)',
    marginRight: 'clamp(20px, 6vw, 72px)',
    borderRadius: '12px',
    overflow: 'hidden',
    padding: 'clamp(40px, 7vw, 80px)',
    textAlign: 'center',
    color: '#fff',
    border: `1px solid ${SIGNAL.red}`,
    background: `radial-gradient(120% 140% at 50% -20%, ${SIGNAL.hot} 0%, ${SIGNAL.red} 40%, ${SIGNAL.cool} 100%)`,
    boxShadow: '0 30px 80px -30px rgba(255,45,45,0.6)',
  },
  ctaTitle: {
    margin: '0 0 14px',
    fontSize: 'clamp(28px, 4.4vw, 48px)',
    fontWeight: 850,
    letterSpacing: '-0.02em',
    lineHeight: 1.05,
  },
  ctaSub: {
    margin: '0 auto 26px',
    maxWidth: '560px',
    fontSize: 'clamp(15px, 1.8vw, 18px)',
    lineHeight: 1.5,
    color: 'rgba(255,255,255,0.9)',
  },
  /* Footer */
  footer: {
    position: 'relative',
    zIndex: 2,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingLeft: 'clamp(20px, 6vw, 72px)',
    paddingRight: 'clamp(20px, 6vw, 72px)',
    paddingTop: '40px',
    paddingBottom: '40px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '1240px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  footerNote: {
    fontSize: '13px',
    color: tokens.colorNeutralForeground4,
  },
  glowBtn: {
    boxShadow: GLOW.md,
  },
})

const FEATURES = [
  {
    n: '01',
    icon: <CubeMultiple24Filled />,
    title: 'The 3D Lab',
    body: 'Drag components onto a spatial breadboard, wire them in three dimensions, and press Run to watch current flow, LEDs glow, and buzzers pulse — the hero of YANTRAA.',
  },
  {
    n: '02',
    icon: <BrainCircuit24Filled />,
    title: 'The AI Tutor',
    body: 'Circuit, your always-on hardware tutor, explains any concept from Ohm\u2019s law to timing chips — patient, precise, and grounded in what you\u2019re building.',
  },
  {
    n: '03',
    icon: <BookOpen24Filled />,
    title: 'The Component Library',
    body: 'Explore every part in interactive 3D: pinouts, polarity, difficulty, and real-world uses, so a datasheet finally makes intuitive sense.',
  },
  {
    n: '04',
    icon: <Rocket24Filled />,
    title: 'The Build Path',
    body: 'Follow a guided roadmap of hands-on projects \u2014 from your first glowing LED to sensor-driven logic \u2014 wiring each real circuit in the 3D lab, step by step, until it comes alive.',
  },
]

const STEPS = [
  { n: '1', title: 'Meet the parts', body: 'Browse the 3D library — spin each component, learn its pins and what it does.' },
  { n: '2', title: 'Wire it in 3D', body: 'Drop parts on the spatial breadboard and connect them with real, snapping wires.' },
  { n: '3', title: 'Run & learn', body: 'Press Run: YANTRAA analyzes the circuit, flags issues, and brings it to life.' },
]

/* Curated showcase set */
const SHOWCASE_IDS = ['resistor', 'led', 'transistor', 'ne555', 'arduino', 'esp32']

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const styles = useStyles()
  const { ref, shown } = useReveal()
  return (
    <div
      ref={ref}
      className={mergeClasses(styles.reveal, shown && styles.revealShown, className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function Showcase() {
  const styles = useStyles()
  const { ref, inView } = useInView<HTMLDivElement>('300px')
  const items = React.useMemo(
    () => SHOWCASE_IDS.map((id) => COMPONENTS.find((c) => c.id === id)).filter(Boolean) as typeof COMPONENTS,
    [],
  )
  const [active, setActive] = React.useState(0)
  const c = items[active]

  return (
    <div className={styles.showcase}>
      <div className={styles.stage} ref={ref}>
        <span className={styles.stageBadge}>
          <span className={styles.eyebrowDot} />
          Drag to rotate
        </span>
        {inView && (
          <Canvas camera={{ position: [0, 1.4, 5], fov: 45 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[4, 6, 4]} intensity={1.1} />
            <directionalLight position={[-5, 3, -4]} intensity={0.5} color="#ff5a6e" />
            <group scale={1.1}>
              <ComponentShape shape={c.shape} color={c.color} />
            </group>
            <ContactShadows position={[0, -1.1, 0]} opacity={0.5} scale={9} blur={2.4} far={4} />
            <Environment preset="city" />
            <OrbitControls
              enablePan={false}
              minDistance={3.2}
              maxDistance={7}
              autoRotate
              autoRotateSpeed={1.1}
              enableDamping
            />
          </Canvas>
        )}
      </div>

      <div className={styles.spec}>
        <div className={styles.specMeta}>
          <span className={mergeClasses(styles.chip, styles.chipRed)}>{c.category}</span>
          <span className={styles.chip}>{c.difficulty}</span>
        </div>
        <h3 className={styles.specName}>{c.name}</h3>
        <p className={styles.specTagline}>{c.tagline}</p>
        <p className={styles.specFact}>{c.funFact}</p>
        <div className={styles.thumbStrip}>
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              aria-label={`Show ${it.name}`}
              aria-pressed={i === active}
              className={mergeClasses(styles.thumb, i === active && styles.thumbActive)}
              onClick={() => setActive(i)}
            >
              {it.symbol}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function LandingPage() {
  const styles = useStyles()
  const { mode, toggle } = useThemeMode()
  const [scrolled, setScrolled] = React.useState(false)
  const heroRef = React.useRef<HTMLDivElement>(null)
  const [heroFade, setHeroFade] = React.useState(1)

  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 24)
      const h = window.innerHeight
      setHeroFade(Math.max(0, 1 - y / (h * 0.7)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className={styles.page}>
      {/* The app's signature "Living Schematic" — same background everywhere. */}
      <div className={styles.bgLayer} aria-hidden>
        <AmbientBackground />
      </div>

      <div className={styles.content}>
      {/* Nav */}
      <nav className={mergeClasses(styles.nav, scrolled && styles.navScrolled)} aria-label="Primary">
        <Link href="#top" className={styles.brand} aria-label="YANTRAA home">
          <span className={styles.brandGlyph} aria-hidden>
            <CircuitGlyph />
          </span>
          <span className={styles.brandWord}>YANTRAA</span>
        </Link>
        <div className={styles.navLinks}>
          <a className={styles.navLink} href="#why">Why Yantraa</a>
          <a className={styles.navLink} href="#lab">The 3D Lab</a>
          <a className={styles.navLink} href="#library">Library</a>
          <a className={styles.navLink} href="#tutor">The Tutor</a>
        </div>
        <div className={styles.navRight}>
          <Button
            appearance="subtle"
            icon={mode === 'dark' ? <WeatherSunny20Regular /> : <WeatherMoon20Regular />}
            onClick={toggle}
            aria-label="Toggle color theme"
          />
          <Link href="/app" tabIndex={-1}>
            <Button appearance="primary" className={styles.glowBtn} icon={<ArrowRight20Filled />} iconPosition="after">
              Launch the App
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header id="top" className={styles.hero} ref={heroRef}>
        <div className={styles.heroScrim} aria-hidden />
        <div
          className={styles.heroInner}
          style={{ opacity: heroFade, transform: `translateY(${(1 - heroFade) * -30}px)` }}
        >
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Learn electronics in 3D
          </span>
          <h1 className={styles.wordmark}>
            YANTR<span className={styles.wordmarkA}>A</span>A
          </h1>
          <p className={styles.tagline}>Build real circuits in a spatial 3D lab — before you ever touch a wire.</p>
          <p className={styles.sub}>
            A flagship learning platform for 1st &amp; 2nd year engineering students: an AI hardware tutor, a 3D
            component library, and a spatial circuit-building lab where the parts come alive.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/app" tabIndex={-1}>
              <Button size="large" appearance="primary" className={styles.glowBtn} icon={<CubeMultiple24Filled />}>
                Launch the 3D Lab
              </Button>
            </Link>
            <Link href="/app" tabIndex={-1}>
              <Button size="large" appearance="outline" icon={<BrainCircuit24Filled />}>
                Meet the AI Tutor
              </Button>
            </Link>
          </div>
          <p className={styles.trust}>No hardware required · For 1st &amp; 2nd year students</p>
        </div>
        <span className={styles.scrollCue} aria-hidden>
          <ChevronDown20Regular />
        </span>
      </header>

      {/* Features */}
      <section id="why" className={styles.section}>
        <Reveal>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>Why Yantraa</span>
            <h2 className={styles.h2}>Four tools, one workshop.</h2>
            <p className={styles.lead}>
              Everything a beginner needs to go from confused to confident — visual, interactive, and grounded in
              real components.
            </p>
            <div className={styles.hairline} />
          </div>
        </Reveal>
        <div className={styles.featureGrid}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.n} delay={i * 90}>
              <article className={styles.card}>
                <span className={styles.cardNum}>{f.n}</span>
                <span className={styles.cardIcon} aria-hidden>{f.icon}</span>
                <h3 className={styles.cardTitle}>{f.title}</h3>
                <p className={styles.cardBody}>{f.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Showcase */}
      <section id="library" className={styles.section}>
        <Reveal>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>The Component Library</span>
            <h2 className={styles.h2}>Every part, in your hands.</h2>
            <p className={styles.lead}>
              Spin real components in 3D and read their story live. Pick one to inspect.
            </p>
            <div className={styles.hairline} />
          </div>
        </Reveal>
        <Reveal delay={80}>
          <Showcase />
        </Reveal>
      </section>

      {/* How it works */}
      <section id="lab" className={styles.section}>
        <Reveal>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>How it works</span>
            <h2 className={styles.h2}>Meet the parts. Wire it. Run it.</h2>
            <div className={styles.hairline} />
          </div>
        </Reveal>
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <article className={styles.step}>
                <span className={styles.stepNum} aria-hidden>{s.n}</span>
                <h3 className={styles.cardTitle}>{s.title}</h3>
                <p className={styles.cardBody}>{s.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="tutor">
        <Reveal>
          <div className={styles.ctaBanner}>
            <h2 className={styles.ctaTitle}>Start building in minutes.</h2>
            <p className={styles.ctaSub}>
              No breadboard, no soldering iron, no risk. Just open the lab and make something light up.
            </p>
            <Link href="/app" tabIndex={-1}>
              <Button size="large" appearance="primary" icon={<ArrowRight20Filled />} iconPosition="after">
                Launch YANTRAA
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <Link href="#top" className={styles.brand} aria-label="YANTRAA home">
          <span className={styles.brandGlyph} aria-hidden>
            <CircuitGlyph />
          </span>
          <span className={styles.brandWord}>YANTRAA</span>
        </Link>
        <span className={styles.footerNote}>
          Learn electronics in 3D &middot; Built for 1st &amp; 2nd year students
        </span>
      </footer>
      </div>
    </div>
  )
}

function CircuitGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="5" cy="12" r="2.2" fill="currentColor" />
      <circle cx="19" cy="5" r="2.2" fill="currentColor" />
      <circle cx="19" cy="19" r="2.2" fill="currentColor" />
      <path d="M7 12h5m0 0l5-6m-5 6l5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
