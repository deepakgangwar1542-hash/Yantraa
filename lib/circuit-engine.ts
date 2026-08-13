import { getComponent, type ElectronicsComponent } from '@/lib/electronics-data'

export interface PlacedInstance {
  instanceId: string
  componentId: string
  position: [number, number, number]
}

/** A specific pin of a placed component: `pinIndex` indexes into the component's `pins` array. */
export interface WireEnd {
  instanceId: string
  pinIndex: number
}

export interface Wire {
  id: string
  from: WireEnd
  to: WireEnd
}

export type IssueSeverity = 'error' | 'warning' | 'info' | 'success'
export type ComponentStatus = 'active' | 'error' | 'warning' | 'off'

export interface CircuitIssue {
  severity: IssueSeverity
  code: string
  message: string
  instanceId?: string
}

export interface ComponentState {
  status: ComponentStatus
  /** True when the component is visually energized (glowing LED, vibrating buzzer). */
  lit: boolean
  message?: string
}

export interface CircuitReport {
  issues: CircuitIssue[]
  states: Record<string, ComponentState>
  batteryId: string | null
  hasClosedLoop: boolean
  hasPower: boolean
}

/* ------------------------------------------------------------------ */
/* Union-Find over pin nodes                                          */
/* ------------------------------------------------------------------ */

class UnionFind {
  private parent: number[]

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i)
  }

  find(x: number): number {
    let root = x
    while (this.parent[root] !== root) root = this.parent[root]
    while (this.parent[x] !== root) {
      const next = this.parent[x]
      this.parent[x] = root
      x = next
    }
    return root
  }

  union(a: number, b: number) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent[ra] = rb
  }
}

/* ------------------------------------------------------------------ */
/* Conduction graph                                                   */
/* ------------------------------------------------------------------ */

interface Edge {
  instanceId: string
  componentId: string
  def: ElectronicsComponent
  /** Pin 0's net (pin index 0). For polarized parts this is the positive side. */
  nodeA: number
  /** Pin 1's net. */
  nodeB: number
  /** When true, current may only flow A -> B (diodes). */
  directed: boolean
}

interface SwitchGap {
  instanceId: string
  def: ElectronicsComponent
  nodeA: number
  nodeB: number
}

interface InstanceMeta {
  instanceId: string
  componentId: string
  def: ElectronicsComponent
  pinCount: number
  offset: number
}

/* ------------------------------------------------------------------ */
/* Analysis                                                           */
/* ------------------------------------------------------------------ */

/**
 * Analyzes a placed circuit and reports wiring issues the way a real
 * breadboard would behave: a battery must be present, the + and - rails
 * must be joined through a closed loop of components, polarized parts
 * must face the right way, and LEDs need a current-limiting resistor.
 *
 * Model: jumper wires join pins into "nets" (one electrical point).
 * Pressed buttons act as closed switches and join their two pins into one
 * net. Two-terminal components then bridge two nets; current flows from the
 * battery + nets to the - nets along any path through those bridges.
 */
export function analyzeCircuit(
  placed: PlacedInstance[],
  wires: Wire[],
  pressedInstanceIds: ReadonlySet<string> = new Set(),
): CircuitReport {
  const states: Record<string, ComponentState> = {}
  const issues: CircuitIssue[] = []

  if (placed.length === 0) {
    return {
      issues: [
        {
          severity: 'info',
          code: 'EMPTY_BOARD',
          message: 'Place components on the board and connect them with jumper wires.',
        },
      ],
      states,
      batteryId: null,
      hasClosedLoop: false,
      hasPower: false,
    }
  }

  /* --- Instance metadata + pin offsets ---------------------------- */
  const insts: InstanceMeta[] = []
  const instIndex = new Map<string, number>()
  let totalPins = 0
  for (const p of placed) {
    const def = getComponent(p.componentId)
    if (!def) continue
    instIndex.set(p.instanceId, insts.length)
    insts.push({
      instanceId: p.instanceId,
      componentId: p.componentId,
      def,
      pinCount: def.pins.length,
      offset: totalPins,
    })
    totalPins += def.pins.length
  }
  if (insts.length === 0) {
    return { issues, states, batteryId: null, hasClosedLoop: false, hasPower: false }
  }

  const pinNode = (instIdx: number, pin: number) => insts[instIdx].offset + pin

  for (const inst of insts) {
    states[inst.instanceId] = { status: 'off', lit: false }
  }

  /* --- Nets: wire-connected pins, plus pressed buttons ------------ */
  const uf = new UnionFind(totalPins)
  const validWire = (w: Wire) => {
    const ai = instIndex.get(w.from.instanceId)
    const bi = instIndex.get(w.to.instanceId)
    if (ai === undefined || bi === undefined) return false
    if (w.from.pinIndex < 0 || w.from.pinIndex >= insts[ai].pinCount) return false
    if (w.to.pinIndex < 0 || w.to.pinIndex >= insts[bi].pinCount) return false
    return true
  }
  for (const w of wires) {
    if (!validWire(w)) continue
    uf.union(
      pinNode(instIndex.get(w.from.instanceId)!, w.from.pinIndex),
      pinNode(instIndex.get(w.to.instanceId)!, w.to.pinIndex),
    )
  }
  for (const inst of insts) {
    if (inst.componentId === 'button' && pressedInstanceIds.has(inst.instanceId)) {
      if (inst.pinCount >= 2) {
        uf.union(pinNode(instIndex.get(inst.instanceId)!, 0), pinNode(instIndex.get(inst.instanceId)!, 1))
      }
    }
  }

  /* --- Power rails ------------------------------------------------ */
  const batteryInsts = insts.filter((i) => i.componentId === 'battery')
  const batteryId = batteryInsts[0]?.instanceId ?? null

  const polarityPins = (inst: InstanceMeta, polarity: 'positive' | 'negative') =>
    inst.def.pins
      .map((p, i) => (p.polarity === polarity ? i : -1))
      .filter((i) => i >= 0)

  const posRoots = new Set<number>()
  const negRoots = new Set<number>()
  for (const b of batteryInsts) {
    const idx = instIndex.get(b.instanceId)!
    for (const pi of polarityPins(b, 'positive')) posRoots.add(uf.find(pinNode(idx, pi)))
    for (const pi of polarityPins(b, 'negative')) negRoots.add(uf.find(pinNode(idx, pi)))
  }

  if (!batteryId) {
    const anyWired = wires.some(
      (w) => instIndex.has(w.from.instanceId) && instIndex.has(w.to.instanceId),
    )
    issues.push({
      severity: 'error',
      code: 'NO_POWER',
      message: 'No battery on the board — add a Battery component to power the circuit.',
    })
    if (!anyWired) {
      issues.push({
        severity: 'info',
        code: 'NO_WIRES',
        message: 'Use Wire mode to connect components with jumper wires.',
      })
    }
    return { issues, states, batteryId: null, hasClosedLoop: false, hasPower: false }
  }

  /* --- Short circuit: battery + and - in the same net ------------- */
  for (const b of batteryInsts) {
    const idx = instIndex.get(b.instanceId)!
    const pos = polarityPins(b, 'positive').map((pi) => uf.find(pinNode(idx, pi)))
    const neg = polarityPins(b, 'negative').map((pi) => uf.find(pinNode(idx, pi)))
    if (pos.some((r) => neg.includes(r))) {
      for (const inst of insts) states[inst.instanceId] = { status: 'off', lit: false }
      states[b.instanceId] = {
        status: 'error',
        lit: false,
        message: `${b.def.name} terminals are wired directly together`,
      }
      return {
        issues: [
          {
            severity: 'error',
            code: 'SHORT_CIRCUIT',
            message:
              'Short circuit! The battery + and − terminals are joined by a wire with no component in between. Remove that wire.',
          },
        ],
        states,
        batteryId,
        hasClosedLoop: false,
        hasPower: true,
      }
    }
  }

  /* --- Build the conduction graph between nets -------------------- */
  const edges: Edge[] = []
  const sameNet: { instanceId: string; def: ElectronicsComponent; node: number }[] = []
  const multiPin: InstanceMeta[] = []
  const openSwitches: SwitchGap[] = []

  for (const inst of insts) {
    if (inst.componentId === 'battery') continue
    const idx = instIndex.get(inst.instanceId)!
    if (inst.pinCount === 2) {
      const r0 = uf.find(pinNode(idx, 0))
      const r1 = uf.find(pinNode(idx, 1))
      if (r0 === r1) {
        // Both legs land on the same point (or the button is pressed and
        // its pins are joined) — the component is bypassed / closed.
        sameNet.push({ instanceId: inst.instanceId, def: inst.def, node: r0 })
      } else if (inst.componentId === 'button' && !pressedInstanceIds.has(inst.instanceId)) {
        // Unpressed button = open gap that can close the loop when pressed.
        openSwitches.push({ instanceId: inst.instanceId, def: inst.def, nodeA: r0, nodeB: r1 })
      } else {
        edges.push({
          instanceId: inst.instanceId,
          componentId: inst.componentId,
          def: inst.def,
          nodeA: r0,
          nodeB: r1,
          directed: inst.componentId === 'diode', // anode (pin 0) -> cathode (pin 1)
        })
      }
    } else {
      multiPin.push(inst)
    }
  }

  /* --- Reachability over the graph -------------------------------- */
  const reach = (starts: ReadonlySet<number>, reverse = false, skip?: Edge): Set<number> => {
    const seen = new Set<number>(starts)
    const stack = [...starts]
    while (stack.length) {
      const node = stack.pop()!
      for (const e of edges) {
        if (e === skip) continue
        let next: number | null = null
        if (!reverse) {
          if (node === e.nodeA) next = e.nodeB
          else if (node === e.nodeB && !e.directed) next = e.nodeA
        } else {
          if (node === e.nodeB) next = e.nodeA
          else if (node === e.nodeA && !e.directed) next = e.nodeB
        }
        if (next !== null && !seen.has(next)) {
          seen.add(next)
          stack.push(next)
        }
      }
    }
    return seen
  }

  const fwd = reach(posRoots)
  const bwd = reach(negRoots, true)

  /** Edge carries current A -> B (A on the + side). */
  const dirAtoB = (e: Edge) =>
    reach(posRoots, false, e).has(e.nodeA) && reach(negRoots, true, e).has(e.nodeB)

  /** Edge carries current B -> A (A on the - side). */
  const dirBtoA = (e: Edge) =>
    reach(posRoots, false, e).has(e.nodeB) && reach(negRoots, true, e).has(e.nodeA)

  /** Edge lies on any path from battery + to battery -. */
  const onPath = (e: Edge) => dirAtoB(e) || dirBtoA(e)

  const anyResistorOnPath = edges.some((e) => e.componentId === 'resistor' && onPath(e))

  let closedLoopComponents = 0

  /* --- Two-terminal components ------------------------------------ */
  for (const e of edges) {
    const name = e.def.name
    if (e.componentId === 'led' || e.componentId === 'buzzer') {
      if (dirAtoB(e)) {
        closedLoopComponents++
        const protectedOk = e.componentId === 'buzzer' || anyResistorOnPath
        states[e.instanceId] = {
          status: protectedOk ? 'active' : 'warning',
          lit: true,
          message: protectedOk
            ? undefined
            : `${name} needs a series resistor or it can burn out.`,
        }
      } else if (dirBtoA(e)) {
        states[e.instanceId] = {
          status: 'error',
          lit: false,
          message:
            e.componentId === 'led'
              ? `${name} is wired backwards — the anode (+) must face the battery + side.`
              : `${name} is wired backwards — swap the leads.`,
        }
      }
    } else if (e.componentId === 'diode') {
      if (dirAtoB(e)) {
        closedLoopComponents++
        states[e.instanceId] = { status: 'active', lit: false }
      } else if (dirBtoA(e)) {
        states[e.instanceId] = {
          status: 'error',
          lit: false,
          message: `${name} is backwards — it blocks current in this direction.`,
        }
      }
    } else if (e.componentId === 'capacitor') {
      if (dirAtoB(e)) {
        closedLoopComponents++
        states[e.instanceId] = { status: 'active', lit: false }
      } else if (dirBtoA(e)) {
        states[e.instanceId] = {
          status: 'warning',
          lit: false,
          message: `${name} is backwards — electrolytic capacitors can fail if reversed.`,
        }
      }
    } else {
      if (onPath(e)) {
        closedLoopComponents++
        states[e.instanceId] = { status: 'active', lit: false }
      }
    }
  }

  /* --- Bypassed / same-net components ----------------------------- */
  for (const s of sameNet) {
    const poweredNet = fwd.has(s.node) || bwd.has(s.node)
    if (s.def.id === 'led' || s.def.id === 'buzzer') {
      if (poweredNet) {
        states[s.instanceId] = {
          status: 'warning',
          lit: false,
          message: `${s.def.name} has both legs connected to the same point — it is bypassed and will not light.`,
        }
      }
    } else if (poweredNet) {
      states[s.instanceId] = { status: 'active', lit: false }
    }
  }

  /* --- Multi-pin components (transistor, IC, sensor, board) ------- */
  let anyMultiPowered = false
  for (const inst of multiPin) {
    const idx = instIndex.get(inst.instanceId)!
    let plus = false
    let minus = false
    for (let pi = 0; pi < inst.pinCount; pi++) {
      const r = uf.find(pinNode(idx, pi))
      if (fwd.has(r)) plus = true
      if (bwd.has(r)) minus = true
    }
    if (plus && minus) {
      states[inst.instanceId] = { status: 'active', lit: false }
      anyMultiPowered = true
    }
  }

  /* --- Open switches (buttons not pressed) ------------------------ */
  let openGap = false
  for (const s of openSwitches) {
    const fwdA = reach(posRoots).has(s.nodeA)
    const fwdB = reach(posRoots).has(s.nodeB)
    const bwdA = reach(negRoots, true).has(s.nodeA)
    const bwdB = reach(negRoots, true).has(s.nodeB)
    if ((fwdA && bwdB) || (fwdB && bwdA)) {
      openGap = true
      states[s.instanceId] = {
        status: 'off',
        lit: false,
        message: 'Not pressed — the circuit is open here.',
      }
      issues.push({
        severity: 'info',
        code: 'PRESS_BUTTON',
        instanceId: s.instanceId,
        message: `The ${s.def.name} is open — press it to complete the circuit.`,
      })
    }
  }

  states[batteryId] = { status: 'active', lit: false }

  const hasClosedLoop = closedLoopComponents > 0 || anyMultiPowered
  const anyWired = wires.some((w) => instIndex.has(w.from.instanceId) && instIndex.has(w.to.instanceId))

  /* --- Overall report --------------------------------------------- */
  if (!hasClosedLoop && !openGap) {
    if (anyWired) {
      issues.push({
        severity: 'error',
        code: 'OPEN_CIRCUIT',
        message:
          'The circuit is not closed — wire a loop from the battery + terminal through your components and back to the − terminal.',
      })
    } else {
      issues.push({
        severity: 'info',
        code: 'NO_WIRES',
        message: 'Use Wire mode to connect components to the battery with jumper wires.',
      })
    }
  }

  const dangling = edges.filter((e) => !onPath(e))
  if (hasClosedLoop && dangling.length > 0) {
    issues.push({
      severity: 'info',
      code: 'NOT_IN_LOOP',
      message: 'Some wired components are not part of a complete loop and will not work.',
    })
  }

  if (hasClosedLoop && !issues.some((i) => i.severity === 'error')) {
    issues.push({
      severity: 'success',
      code: 'CIRCUIT_OK',
      message: 'The circuit is complete and powered.',
    })
  }

  const order: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2, success: 3 }
  issues.sort((a, b) => order[a.severity] - order[b.severity])

  return { issues, states, batteryId, hasClosedLoop, hasPower: batteryId !== null }
}
