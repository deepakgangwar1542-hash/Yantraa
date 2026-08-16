import type { PlacedInstance, Wire, CircuitReport } from '@/lib/circuit-engine'

export type ProjectTier = 'beginner' | 'intermediate'

export const TIER_LABELS: Record<ProjectTier, { name: string; blurb: string }> = {
  beginner: {
    name: 'Foundations',
    blurb: 'Power, polarity, and your first glowing LED.',
  },
  intermediate: {
    name: 'Real Circuits',
    blurb: 'Switches, sensors, and logic that reacts to the world.',
  },
}

export interface ProjectStep {
  id: string
  instruction: string
  /** Target wire ids this step corresponds to; the step is done when all are placed. */
  targetWireIds: string[]
}

export interface Project {
  id: string
  order: number
  tier: ProjectTier
  title: string
  tagline: string
  concept: string
  components: { componentId: string; qty: number }[]
  steps: ProjectStep[]
  targetPlaced: PlacedInstance[]
  targetWires: Wire[]
  /** Output instance ids that must glow/sound for the "It's Alive" moment. */
  expectedLit: string[]
  /** True when the finished circuit needs a button press to come alive. */
  needsPress: boolean
  howItWorks: string[]
}

/* ------------------------------------------------------------------ */
/* Authoring helpers                                                  */
/* ------------------------------------------------------------------ */

/** Fixed board slots (within engine bounds x[-5.5,5.5] z[-3.5,3.5], snapped 0.25). */
const SLOTS: [number, number, number][] = [
  [-4, 0, -2], [-2, 0, -2], [0, 0, -2], [2, 0, -2], [4, 0, -2],
  [-4, 0, 0], [-2, 0, 0], [0, 0, 0], [2, 0, 0], [4, 0, 0],
  [-4, 0, 2], [-2, 0, 2], [0, 0, 2], [2, 0, 2], [4, 0, 2],
]

interface PartSpec {
  key: string
  componentId: string
}

/** Wire tuple: [fromKey, fromPin, toKey, toPin]. */
type WireTuple = [string, number, string, number]

interface StepSpec {
  instruction: string
  /** Indices into the wires array this step should place. */
  wires: number[]
}

interface ProjectSpec {
  id: string
  order: number
  tier: ProjectTier
  title: string
  tagline: string
  concept: string
  parts: PartSpec[]
  wires: WireTuple[]
  steps: StepSpec[]
  expectedLit: string[] // part keys
  needsPress: boolean
  howItWorks: string[]
}

function build(spec: ProjectSpec): Project {
  const iid = (key: string) => `${spec.id}:${key}`

  const targetPlaced: PlacedInstance[] = spec.parts.map((p, i) => ({
    instanceId: iid(p.key),
    componentId: p.componentId,
    position: SLOTS[i] ?? [0, 0, 0],
  }))

  const targetWires: Wire[] = spec.wires.map((w, i) => ({
    id: `${spec.id}:w${i}`,
    from: { instanceId: iid(w[0]), pinIndex: w[1] },
    to: { instanceId: iid(w[2]), pinIndex: w[3] },
  }))

  const steps: ProjectStep[] = spec.steps.map((s, i) => ({
    id: `${spec.id}:s${i}`,
    instruction: s.instruction,
    targetWireIds: s.wires.map((wi) => `${spec.id}:w${wi}`),
  }))

  // Derive bill of materials from parts.
  const counts = new Map<string, number>()
  for (const p of spec.parts) counts.set(p.componentId, (counts.get(p.componentId) ?? 0) + 1)
  const components = [...counts.entries()].map(([componentId, qty]) => ({ componentId, qty }))

  return {
    id: spec.id,
    order: spec.order,
    tier: spec.tier,
    title: spec.title,
    tagline: spec.tagline,
    concept: spec.concept,
    components,
    steps,
    targetPlaced,
    targetWires,
    expectedLit: spec.expectedLit.map(iid),
    needsPress: spec.needsPress,
    howItWorks: spec.howItWorks,
  }
}

/* ------------------------------------------------------------------ */
/* The 10 projects                                                    */
/* ------------------------------------------------------------------ */

export const PROJECTS: Project[] = [
  build({
    id: 'first-light',
    order: 1,
    tier: 'beginner',
    title: 'First Light',
    tagline: 'Light your very first LED',
    concept: 'How current flows in a simple series loop, and why an LED needs a resistor.',
    parts: [
      { key: 'bat', componentId: 'battery' },
      { key: 'res', componentId: 'resistor' },
      { key: 'led', componentId: 'led' },
    ],
    wires: [
      ['bat', 0, 'res', 0],
      ['res', 1, 'led', 0],
      ['led', 1, 'bat', 1],
    ],
    steps: [
      { instruction: "Connect the battery's + terminal to one leg of the resistor.", wires: [0] },
      { instruction: "Connect the resistor's free leg to the LED's long leg — the anode (+).", wires: [1] },
      { instruction: "Close the loop: wire the LED's short leg (cathode −) back to the battery's − terminal.", wires: [2] },
    ],
    expectedLit: ['led'],
    needsPress: false,
    howItWorks: [
      'Electric current always needs a complete loop — a path leaving the battery + terminal and returning to the − terminal.',
      'The resistor limits how much current flows, following Ohm\u2019s Law (V = I \u00d7 R).',
      'Without that resistor the LED would try to pull too much current and burn out almost instantly.',
      'Because everything is in a single line, this is called a series circuit: the same current flows through every part.',
    ],
  }),

  build({
    id: 'on-off',
    order: 2,
    tier: 'beginner',
    title: 'On / Off',
    tagline: 'Add a button to control the light',
    concept: 'Switches, and the difference between an open and a closed circuit.',
    parts: [
      { key: 'bat', componentId: 'battery' },
      { key: 'btn', componentId: 'button' },
      { key: 'res', componentId: 'resistor' },
      { key: 'led', componentId: 'led' },
    ],
    wires: [
      ['bat', 0, 'btn', 0],
      ['btn', 1, 'res', 0],
      ['res', 1, 'led', 0],
      ['led', 1, 'bat', 1],
    ],
    steps: [
      { instruction: "Wire the battery's + terminal to one side of the push button.", wires: [0] },
      { instruction: "Connect the button's other side to a leg of the resistor.", wires: [1] },
      { instruction: "Wire the resistor to the LED's anode (+, long leg).", wires: [2] },
      { instruction: "Close the loop from the LED's cathode (−) back to the battery's − terminal.", wires: [3] },
    ],
    expectedLit: ['led'],
    needsPress: true,
    howItWorks: [
      'A push button is a switch: pressed, it bridges its two contacts; released, it leaves a gap.',
      'When the gap is open the loop is broken, so no current can flow and the LED stays dark.',
      'Pressing the button closes the loop — this is a closed circuit — and current flows again.',
      'This is exactly how a light switch on your wall works: it simply opens or closes a loop.',
    ],
  }),

  build({
    id: 'speak-up',
    order: 3,
    tier: 'beginner',
    title: 'Speak Up',
    tagline: 'Make some noise with a buzzer',
    concept: 'Circuits drive sound too — the same loop, a different output device.',
    parts: [
      { key: 'bat', componentId: 'battery' },
      { key: 'btn', componentId: 'button' },
      { key: 'buzzer', componentId: 'buzzer' },
    ],
    wires: [
      ['bat', 0, 'btn', 0],
      ['btn', 1, 'buzzer', 0],
      ['buzzer', 1, 'bat', 1],
    ],
    steps: [
      { instruction: "Connect the battery's + terminal to one side of the button.", wires: [0] },
      { instruction: "Wire the button's other side to the buzzer's + terminal.", wires: [1] },
      { instruction: "Close the loop from the buzzer's − terminal back to the battery's − terminal.", wires: [2] },
    ],
    expectedLit: ['buzzer'],
    needsPress: true,
    howItWorks: [
      'A piezo buzzer contains a ceramic disc that physically flexes when a voltage is applied across it.',
      'The exact same series-loop rules apply — output devices are interchangeable, only the effect changes.',
      'A buzzer is polarized, so its + and − terminals must face the matching battery terminals.',
      'Notice there is no resistor: a buzzer limits its own current, so it is safe to drive directly.',
    ],
  }),

  build({
    id: 'two-lights',
    order: 4,
    tier: 'beginner',
    title: 'Two Lights',
    tagline: 'Two LEDs sharing one power source',
    concept: 'Parallel branches: independent paths sharing the same battery.',
    parts: [
      { key: 'bat', componentId: 'battery' },
      { key: 'btn', componentId: 'button' },
      { key: 'res1', componentId: 'resistor' },
      { key: 'led1', componentId: 'led' },
      { key: 'res2', componentId: 'resistor' },
      { key: 'led2', componentId: 'led' },
    ],
    wires: [
      ['bat', 0, 'btn', 0],
      ['btn', 1, 'res1', 0],
      ['res1', 1, 'led1', 0],
      ['led1', 1, 'bat', 1],
      ['btn', 1, 'res2', 0],
      ['res2', 1, 'led2', 0],
      ['led2', 1, 'bat', 1],
    ],
    steps: [
      { instruction: "Wire the battery's + terminal to one side of the button.", wires: [0] },
      { instruction: "Start the first branch: button → resistor #1.", wires: [1] },
      { instruction: "Resistor #1 → LED #1 anode (+).", wires: [2] },
      { instruction: "LED #1 cathode (−) → battery − terminal.", wires: [3] },
      { instruction: "Now tap the SAME button node into resistor #2 to begin a parallel branch.", wires: [4] },
      { instruction: "Resistor #2 → LED #2 anode (+).", wires: [5] },
      { instruction: "LED #2 cathode (−) → battery − terminal.", wires: [6] },
    ],
    expectedLit: ['led1', 'led2'],
    needsPress: true,
    howItWorks: [
      'These two LED branches are wired in parallel: each has its own complete path back to the battery.',
      'Parallel branches are independent — if one LED failed, the other would keep glowing.',
      'Every branch sees the full battery voltage, unlike a series circuit where voltage is shared.',
      'Each branch still needs its own resistor, because each LED must have its own current limited.',
    ],
  }),

  build({
    id: 'wrong-way',
    order: 5,
    tier: 'beginner',
    title: 'Wrong Way',
    tagline: 'Discover why direction matters',
    concept: 'Polarity — many components only work one way around.',
    parts: [
      { key: 'bat', componentId: 'battery' },
      { key: 'res', componentId: 'resistor' },
      { key: 'led', componentId: 'led' },
    ],
    wires: [
      ['bat', 0, 'res', 0],
      ['res', 1, 'led', 0],
      ['led', 1, 'bat', 1],
    ],
    steps: [
      { instruction: "Connect the battery's + terminal to a leg of the resistor.", wires: [0] },
      { instruction: "Resistor → the LED's ANODE (the long leg, +). Get this backwards and the LED stays dark.", wires: [1] },
      { instruction: "LED cathode (short leg, −) → battery − terminal to close the loop.", wires: [2] },
    ],
    expectedLit: ['led'],
    needsPress: false,
    howItWorks: [
      'An LED is a diode: it only lets current flow one way, from its anode (+) to its cathode (−).',
      'Wire it backwards and it simply blocks current — no light, and no warning.',
      'The longer leg is always the anode and must face the battery + side; the flat edge marks the cathode.',
      'This one-way behavior is called polarity, and resistors are one of the few parts that ignore it.',
    ],
  }),

  build({
    id: 'gatekeeper',
    order: 6,
    tier: 'intermediate',
    title: 'The Gatekeeper',
    tagline: 'A diode as a one-way valve',
    concept: 'Diodes only pass current in one direction.',
    parts: [
      { key: 'bat', componentId: 'battery' },
      { key: 'diode', componentId: 'diode' },
      { key: 'res', componentId: 'resistor' },
      { key: 'led', componentId: 'led' },
    ],
    wires: [
      ['bat', 0, 'diode', 0],
      ['diode', 1, 'res', 0],
      ['res', 1, 'led', 0],
      ['led', 1, 'bat', 1],
    ],
    steps: [
      { instruction: "Battery + terminal → the diode's ANODE (pin with no stripe).", wires: [0] },
      { instruction: "Diode CATHODE (striped end) → a leg of the resistor. This is forward-biased — current can pass.", wires: [1] },
      { instruction: "Resistor → LED anode (+).", wires: [2] },
      { instruction: "LED cathode (−) → battery − terminal.", wires: [3] },
    ],
    expectedLit: ['led'],
    needsPress: false,
    howItWorks: [
      'A diode is a one-way valve for current: it conducts from anode to cathode, and blocks the reverse.',
      'Here the diode is forward-biased — its anode faces + — so current passes and the LED lights.',
      'Flip the diode around and it becomes reverse-biased, blocking the loop and killing the light.',
      'This is why diodes guard circuits against batteries being inserted backwards.',
    ],
  }),

  build({
    id: 'soft-start',
    order: 7,
    tier: 'intermediate',
    title: 'Soft Start',
    tagline: 'Add a capacitor for smoother power',
    concept: 'Capacitors store charge and steady the current supply.',
    parts: [
      { key: 'bat', componentId: 'battery' },
      { key: 'res', componentId: 'resistor' },
      { key: 'led', componentId: 'led' },
      { key: 'cap', componentId: 'capacitor' },
    ],
    wires: [
      ['bat', 0, 'res', 0],
      ['res', 1, 'led', 0],
      ['led', 1, 'bat', 1],
      ['res', 1, 'cap', 0],
      ['cap', 1, 'bat', 1],
    ],
    steps: [
      { instruction: "Battery + terminal → a leg of the resistor.", wires: [0] },
      { instruction: "Resistor → LED anode (+).", wires: [1] },
      { instruction: "LED cathode (−) → battery − terminal.", wires: [2] },
      { instruction: "Tap the resistor→LED node into the capacitor's + leg (in parallel with the LED).", wires: [3] },
      { instruction: "Capacitor − leg → battery − terminal. Mind the polarity!", wires: [4] },
    ],
    expectedLit: ['led'],
    needsPress: false,
    howItWorks: [
      'A capacitor stores electric charge on two plates, then releases it back into the circuit later.',
      'Placed in parallel with the LED, it acts like a tiny reservoir that smooths sudden dips in supply.',
      'In the real world this softens flicker; our simulator shows the steady, settled state of that balance.',
      'Electrolytic capacitors are polarized — wired backwards they can be damaged, so + must face the + rail.',
    ],
  }),

  build({
    id: 'electronic-switch',
    order: 8,
    tier: 'intermediate',
    title: 'Electronic Switch',
    tagline: 'Let a transistor do the switching',
    concept: 'A transistor uses a small signal to control a larger current path.',
    parts: [
      { key: 'bat', componentId: 'battery' },
      { key: 'btn', componentId: 'button' },
      { key: 'trans', componentId: 'transistor' },
      { key: 'res', componentId: 'resistor' },
      { key: 'led', componentId: 'led' },
    ],
    wires: [
      ['bat', 0, 'btn', 0],
      ['btn', 1, 'res', 0],
      ['res', 1, 'led', 0],
      ['led', 1, 'bat', 1],
      ['btn', 1, 'trans', 0],
      ['bat', 0, 'trans', 1],
      ['trans', 2, 'bat', 1],
    ],
    steps: [
      { instruction: "Battery + → one side of the button (this is our control signal).", wires: [0] },
      { instruction: "Button → resistor.", wires: [1] },
      { instruction: "Resistor → LED anode (+).", wires: [2] },
      { instruction: "LED cathode (−) → battery −.", wires: [3] },
      { instruction: "Now the transistor: wire the switched button node to the transistor's BASE (control pin).", wires: [4] },
      { instruction: "Battery + → transistor COLLECTOR (main current in).", wires: [5] },
      { instruction: "Transistor EMITTER → battery − (main current out).", wires: [6] },
    ],
    expectedLit: ['led'],
    needsPress: true,
    howItWorks: [
      'A transistor is an electronic switch: a tiny current into its base allows a much larger current to flow from collector to emitter.',
      'The small button signal on the base controls the separate, higher-power output path.',
      'That means the thing being switched never has to carry the control signal directly — the transistor stands between them.',
      'This amplifying, isolating behavior is the single idea behind every logic gate and computer chip.',
    ],
  }),

  build({
    id: 'doorbell',
    order: 9,
    tier: 'intermediate',
    title: 'Doorbell',
    tagline: 'Reuse the switch pattern for sound',
    concept: 'The transistor-switch pattern generalizes to any output.',
    parts: [
      { key: 'bat', componentId: 'battery' },
      { key: 'btn', componentId: 'button' },
      { key: 'trans', componentId: 'transistor' },
      { key: 'buzzer', componentId: 'buzzer' },
    ],
    wires: [
      ['bat', 0, 'btn', 0],
      ['btn', 1, 'buzzer', 0],
      ['buzzer', 1, 'bat', 1],
      ['btn', 1, 'trans', 0],
      ['bat', 0, 'trans', 1],
      ['trans', 2, 'bat', 1],
    ],
    steps: [
      { instruction: "Battery + → one side of the button.", wires: [0] },
      { instruction: "Button → buzzer + terminal.", wires: [1] },
      { instruction: "Buzzer − terminal → battery −.", wires: [2] },
      { instruction: "Wire the switched button node to the transistor's BASE.", wires: [3] },
      { instruction: "Battery + → transistor COLLECTOR.", wires: [4] },
      { instruction: "Transistor EMITTER → battery −.", wires: [5] },
    ],
    expectedLit: ['buzzer'],
    needsPress: true,
    howItWorks: [
      'This is the identical transistor-switch pattern from the previous project — only the output changed.',
      'Swapping the LED for a buzzer proves the technique is general, not a one-off trick.',
      'A small press on the base line commands the louder, higher-power buzzer path.',
      'Recognizing reusable patterns like this is what turns memorized circuits into real engineering.',
    ],
  }),

  build({
    id: 'mini-alarm',
    order: 10,
    tier: 'intermediate',
    title: 'Mini Alarm System',
    tagline: 'Capstone: combine everything you learned',
    concept: 'Switch, transistor, indicator, protection and output working as one system.',
    parts: [
      { key: 'bat', componentId: 'battery' },
      { key: 'btn', componentId: 'button' },
      { key: 'trans', componentId: 'transistor' },
      { key: 'diode', componentId: 'diode' },
      { key: 'res', componentId: 'resistor' },
      { key: 'led', componentId: 'led' },
      { key: 'buzzer', componentId: 'buzzer' },
    ],
    wires: [
      ['bat', 0, 'btn', 0],
      ['btn', 1, 'res', 0],
      ['res', 1, 'led', 0],
      ['led', 1, 'bat', 1],
      ['btn', 1, 'diode', 0],
      ['diode', 1, 'buzzer', 0],
      ['buzzer', 1, 'bat', 1],
      ['btn', 1, 'trans', 0],
      ['bat', 0, 'trans', 1],
      ['trans', 2, 'bat', 1],
    ],
    steps: [
      { instruction: "Battery + → the trigger button.", wires: [0] },
      { instruction: "Status indicator branch: button → resistor.", wires: [1] },
      { instruction: "Resistor → LED anode (+).", wires: [2] },
      { instruction: "LED cathode (−) → battery −.", wires: [3] },
      { instruction: "Alarm branch: button → diode anode (protective, one-way).", wires: [4] },
      { instruction: "Diode cathode (striped) → buzzer + terminal.", wires: [5] },
      { instruction: "Buzzer − terminal → battery −.", wires: [6] },
      { instruction: "Control: switched button node → transistor BASE.", wires: [7] },
      { instruction: "Battery + → transistor COLLECTOR.", wires: [8] },
      { instruction: "Transistor EMITTER → battery −. System armed!", wires: [9] },
    ],
    expectedLit: ['led', 'buzzer'],
    needsPress: true,
    howItWorks: [
      'Pressing the trigger button lights the LED status indicator and sounds the buzzer alarm at the same time.',
      'The transistor is the electronic switch at the heart of the system, commanded by the small button signal.',
      'The diode sits in series with the buzzer as protection, only letting current flow the intended direction.',
      'The resistor keeps the indicator LED safe — every concept from the earlier projects, combined into one working device.',
      'This is exactly how real alarm and control systems are layered: sense, switch, indicate, protect, and output.',
    ],
  }),
]

/* ------------------------------------------------------------------ */
/* Lookups + guided-progress evaluation (single source of truth)      */
/* ------------------------------------------------------------------ */

export function getProject(id: string): Project | undefined {
  return PROJECTS.find((p) => p.id === id)
}

const sameEnd = (
  a: { instanceId: string; pinIndex: number },
  b: { instanceId: string; pinIndex: number },
) => a.instanceId === b.instanceId && a.pinIndex === b.pinIndex

/** A target wire is satisfied when a student wire joins the same two pins (either direction). */
export function wireSatisfied(target: Wire, wires: Wire[]): boolean {
  return wires.some(
    (w) =>
      (sameEnd(target.from, w.from) && sameEnd(target.to, w.to)) ||
      (sameEnd(target.from, w.to) && sameEnd(target.to, w.from)),
  )
}

export interface GuidedProgress {
  satisfiedWireIds: string[]
  /** Index of the first step not yet complete; equals steps.length when all done. */
  currentStepIndex: number
  completedStepCount: number
  /** All target wires placed and no wiring errors present. */
  wiringComplete: boolean
  /** Fully built AND the expected outputs are actually glowing/sounding. */
  alive: boolean
}

export function evaluateProgress(
  project: Project,
  wires: Wire[],
  report: CircuitReport | null,
): GuidedProgress {
  const satisfied = new Set(
    project.targetWires.filter((t) => wireSatisfied(t, wires)).map((t) => t.id),
  )

  let currentStepIndex = project.steps.findIndex(
    (s) => !s.targetWireIds.every((id) => satisfied.has(id)),
  )
  if (currentStepIndex === -1) currentStepIndex = project.steps.length

  const completedStepCount = project.steps.filter((s) =>
    s.targetWireIds.every((id) => satisfied.has(id)),
  ).length

  const hasError = report ? report.issues.some((i) => i.severity === 'error') : false
  const wiringComplete = satisfied.size === project.targetWires.length && !hasError
  const alive =
    wiringComplete &&
    !!report &&
    project.expectedLit.every((id) => report.states[id]?.lit) &&
    !hasError

  return {
    satisfiedWireIds: [...satisfied],
    currentStepIndex,
    completedStepCount,
    wiringComplete,
    alive,
  }
}
