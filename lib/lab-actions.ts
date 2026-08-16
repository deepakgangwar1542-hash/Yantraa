import { COMPONENTS, type ElectronicsComponent } from '@/lib/electronics-data'
import type { PlacedInstance } from '@/lib/circuit-engine'

/**
 * Voice / assistant action model for the 3D lab.
 *
 * The voice layer produces high-level, *semantic* actions (referring to parts
 * and pins by natural name). `SpatialLab` subscribes to the bus and resolves
 * those references against the live board before calling its existing
 * callbacks. This keeps the parser stateless and the lab the single source of
 * truth for what is actually placed.
 */

/** A reference to a component by name plus an optional ordinal ("first", "second"). */
export interface ComponentRef {
  /** Catalog component id, e.g. "resistor" | "led". */
  componentId: string
  /** 1-based ordinal when several of the same part exist ("the second resistor"). */
  ordinal?: number
}

/** A reference to one pin of a referenced component. */
export interface PinRef {
  component: ComponentRef
  /** Free-text pin hint: "anode", "positive", "lead a", "pin 2", "+", etc. */
  pinHint?: string
}

export type LabAction =
  | { type: 'add'; componentId: string }
  | { type: 'mode'; mode: 'move' | 'wire' }
  | { type: 'connect'; from: PinRef; to: PinRef }
  | { type: 'run'; on: boolean }
  | { type: 'delete'; component?: ComponentRef }
  | { type: 'clear' }
  | { type: 'press'; component: ComponentRef }
  | { type: 'zoom'; direction: 'in' | 'out' | 'reset' }

/* ------------------------------------------------------------------ */
/* Tiny pub/sub bus                                                    */
/* ------------------------------------------------------------------ */

type Listener = (actions: LabAction[]) => void
const listeners = new Set<Listener>()

export const labBus = {
  /** Emit an ordered batch so dependent actions (add then connect) run in order. */
  emit(actions: LabAction[]) {
    listeners.forEach((l) => l(actions))
  },
  subscribe(l: Listener): () => void {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

/**
 * Live mirror of what is on the board. `SpatialLab` keeps it current so the
 * voice layer can build LLM context (`describeBoard`) without prop-drilling.
 */
let currentPlaced: readonly PlacedInstance[] = []
export const labSnapshot = {
  set(p: readonly PlacedInstance[]) {
    currentPlaced = p
  },
  get(): readonly PlacedInstance[] {
    return currentPlaced
  },
}

/** A short spoken confirmation for locally-parsed actions (no LLM round-trip). */
export function summarizeActions(actions: LabAction[]): string {
  const parts = actions.map((a) => {
    switch (a.type) {
      case 'add':
        return `added a ${getComponentById(a.componentId)?.name ?? a.componentId}`
      case 'mode':
        return a.mode === 'wire' ? 'switched to wire mode' : 'switched to move mode'
      case 'connect': {
        const f = getComponentById(a.from.component.componentId)?.name ?? a.from.component.componentId
        const t = getComponentById(a.to.component.componentId)?.name ?? a.to.component.componentId
        return `connected the ${f} to the ${t}`
      }
      case 'run':
        return a.on ? 'ran the circuit' : 'stopped the circuit'
      case 'delete':
        return a.component
          ? `removed the ${getComponentById(a.component.componentId)?.name ?? a.component.componentId}`
          : 'removed the selected part'
      case 'clear':
        return 'cleared the board'
      case 'press':
        return `pressed the ${getComponentById(a.component.componentId)?.name ?? a.component.componentId}`
      case 'zoom':
        return a.direction === 'reset' ? 'reset the view' : `zoomed ${a.direction}`
    }
  })
  if (parts.length === 0) return ''
  const text = parts.join(', then ')
  return text.charAt(0).toUpperCase() + text.slice(1) + '.'
}

/* ------------------------------------------------------------------ */
/* Catalog resolution                                                  */
/* ------------------------------------------------------------------ */

/** Spoken aliases → catalog component id. Longest phrases first at match time. */
const COMPONENT_ALIASES: Record<string, string> = {
  resistor: 'resistor',
  led: 'led',
  light: 'led',
  'light emitting diode': 'led',
  diode: 'diode',
  capacitor: 'capacitor',
  cap: 'capacitor',
  battery: 'battery',
  cell: 'battery',
  button: 'button',
  'push button': 'button',
  switch: 'button',
  potentiometer: 'potentiometer',
  pot: 'potentiometer',
  transistor: 'transistor',
  ic: 'ic',
  chip: 'ic',
  'integrated circuit': 'ic',
  register: 'register',
  board: 'board',
  esp32: 'esp32',
  esp: 'esp32',
  microcontroller: 'esp32',
  sensor: 'sensor',
  buzzer: 'buzzer',
  speaker: 'buzzer',
  breadboard: 'breadboard',
}

const byId = new Map<string, ElectronicsComponent>(COMPONENTS.map((c) => [c.id, c]))

export function getComponentById(id: string): ElectronicsComponent | undefined {
  return byId.get(id)
}

/** All catalog ids, for building parser prompts and validation. */
export const COMPONENT_IDS: string[] = COMPONENTS.map((c) => c.id)

/**
 * Resolve free text to a catalog component id. Tries the alias table (longest
 * match first) and falls back to a catalog-name substring match.
 */
export function resolveComponentId(text: string): string | null {
  const t = text.toLowerCase().trim()
  if (!t) return null
  const aliases = Object.keys(COMPONENT_ALIASES).sort((a, b) => b.length - a.length)
  for (const alias of aliases) {
    if (t.includes(alias)) return COMPONENT_ALIASES[alias]
  }
  for (const c of COMPONENTS) {
    if (t.includes(c.name.toLowerCase()) || t.includes(c.id.toLowerCase())) return c.id
  }
  return null
}

const ORDINALS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  '1st': 1,
  '2nd': 2,
  '3rd': 3,
  one: 1,
  two: 2,
  three: 3,
}

/** Pull an ordinal ("second", "2nd") out of free text, if present. */
export function parseOrdinal(text: string): number | undefined {
  const t = text.toLowerCase()
  for (const [word, n] of Object.entries(ORDINALS)) {
    if (new RegExp(`\\b${word}\\b`).test(t)) return n
  }
  return undefined
}

/**
 * Resolve a component reference to a concrete placed instance id, honoring the
 * ordinal ("the second resistor") and falling back to the most recently placed
 * matching part.
 */
export function resolveInstanceId(
  placed: readonly PlacedInstance[],
  ref: ComponentRef,
): string | null {
  const matches = placed.filter((p) => p.componentId === ref.componentId)
  if (matches.length === 0) return null
  if (ref.ordinal && ref.ordinal <= matches.length) return matches[ref.ordinal - 1].instanceId
  // Default: the last one placed feels most "current" when speaking.
  return matches[matches.length - 1].instanceId
}

/**
 * Resolve a pin hint to a pin index for a given component. Understands pin
 * names ("lead a", "cathode"), polarity words (positive/plus/+, negative/
 * minus/−, anode, ground), and explicit "pin N" / bare numbers. Defaults to 0.
 */
export function resolvePinIndex(componentId: string, pinHint?: string): number {
  const comp = byId.get(componentId)
  if (!comp || comp.pins.length === 0) return 0
  if (!pinHint) return 0
  const h = pinHint.toLowerCase().trim()

  // Exact / substring match on pin name ("lead a", "anode (+)").
  const nameIdx = comp.pins.findIndex(
    (p) => p.name.toLowerCase().includes(h) || h.includes(p.name.toLowerCase()),
  )
  if (nameIdx >= 0) return nameIdx

  // Polarity words.
  const positive = /\b(positive|plus|anode|\+|vcc|power|high)\b/.test(h)
  const negative = /\b(negative|minus|cathode|ground|gnd|−|-|low)\b/.test(h)
  if (positive) {
    const i = comp.pins.findIndex((p) => p.polarity === 'positive')
    if (i >= 0) return i
  }
  if (negative) {
    const i = comp.pins.findIndex((p) => p.polarity === 'negative')
    if (i >= 0) return i
  }

  // "lead a" / "point a" / "terminal b" → letter to index.
  const letter = h.match(/\b(?:lead|point|terminal|leg)\s*([ab])\b/)
  if (letter) return letter[1] === 'b' ? 1 : 0

  // "pin 2" / bare number (1-based when spoken).
  const num = h.match(/\b(?:pin|leg|number)?\s*(\d+)\b/)
  if (num) {
    const n = parseInt(num[1], 10) - 1
    if (n >= 0 && n < comp.pins.length) return n
  }
  return 0
}

/** A compact, human-readable snapshot of the board for the LLM parser context. */
export function describeBoard(placed: readonly PlacedInstance[]): string {
  if (placed.length === 0) return 'The breadboard is empty.'
  const counts = new Map<string, number>()
  const lines = placed.map((p) => {
    const comp = byId.get(p.componentId)
    const n = (counts.get(p.componentId) ?? 0) + 1
    counts.set(p.componentId, n)
    const pins = comp ? comp.pins.map((pin) => pin.name).join(', ') : ''
    return `- ${comp?.name ?? p.componentId} #${n} (pins: ${pins})`
  })
  return `On the board:\n${lines.join('\n')}`
}
