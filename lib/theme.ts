/**
 * YANTRAA shared design language — "a powered PCB on a dark lab bench".
 *
 * These are the single source of truth for the material vocabulary that isn't
 * expressible as a Fluent theme token: the signal-red glow shadows, the copper
 * idle material, the semantic simulation-status colors, the monospace
 * instrument-readout stack, and the electrical motion easing.
 *
 * Rule enforced by convention across the app: IDLE = matte + flat, no glow.
 * ACTIVE / LIVE = glowing + animated. Glow always means "current is flowing".
 */

/* --- Signal red (brand = live / active / current flowing) --------------- */
export const SIGNAL = {
  /** Core signal red. */
  red: '#ff2d2d',
  /** Hot highlight for hover / peak glow. */
  hot: '#ff5c4d',
  /** Cooled trace — inactive / disabled brand surfaces. */
  cool: '#7a1210',
} as const

/* --- PCB substrate (near-black, faintly warm — never neutral gray) ------ */
export const PCB = {
  base: '#0b0d0f',
  panel1: '#121417',
  panel2: '#191b1f',
  /** Faintly luminous red-tinted hairline used on floating instrument panels. */
  strokeRed: 'rgba(255,70,58,0.18)',
} as const

/* --- Copper: the "idle material" (a second material besides red/black) -- */
export const COPPER = {
  idle: '#5a4638',
  idleLit: '#8a6a4e',
} as const

/* --- Semantic simulation status (kept distinct from the red brand) ------ */
export const STATUS = {
  active: '#2ecc71', // lit / current-ok
  warning: '#f5a623', // e.g. LED with no resistor
  error: '#ff453a', // short circuit / reversed polarity / open loop
} as const

/* --- Glow vocabulary (reuse everywhere; never hand-roll box-shadows) ---- */
export const GLOW = {
  sm: '0 0 6px rgba(255,45,45,0.45)',
  md: '0 0 12px rgba(255,45,45,0.55), 0 0 4px rgba(255,45,45,0.75)',
  lg: '0 0 26px rgba(255,45,45,0.5), 0 0 9px rgba(255,92,77,0.8)',
  text: '0 0 9px rgba(255,45,45,0.65)',
} as const

/** Colored glow for the semantic status colors. */
export function statusGlow(color: string, strength: 'sm' | 'md' = 'md'): string {
  return strength === 'sm'
    ? `0 0 6px ${color}66`
    : `0 0 13px ${color}88, 0 0 4px ${color}cc`
}

/* --- Motion: fast, snappy, electrical (a relay click, not a soft fade) -- */
export const EASE_ELECTRIC = 'cubic-bezier(0.2, 0.9, 0.3, 1.1)'

/* --- Typography: monospace instrument-readout stack --------------------- */
export const MONO_STACK =
  "var(--font-mono), 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace"

/**
 * Shared inline style for any numeric / technical / status-code token
 * (voltages, pin indices, component IDs, SHORT_CIRCUIT, confidence values).
 * Uppercase + letter-spaced mono is what sells "real instrument".
 */
export const monoLabel = {
  fontFamily: MONO_STACK,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
}
