'use client'

import * as React from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useThemeMode } from '@/app/providers'
import { SIGNAL, COPPER } from '@/lib/theme'

/**
 * "The Living Schematic" — the app's signature background.
 *
 * Instead of the ubiquitous particle-constellation, this renders a procedural
 * engineering schematic: real circuit symbols (resistors, capacitors, diodes,
 * inductors, IC packages, transistors, grounds) laid out on a grid and joined
 * by orthogonal PCB-style traces, drawn as thin glowing lines on near-black —
 * a blueprint being probed. A rotating subset of traces is "live": a bright
 * pulse of current travels the path (animated dash), then fades back to dim
 * copper. Depth comes from three real parallax layers (ghost silkscreen /
 * main circuit / crisp foreground), over a faint oscilloscope graticule.
 *
 * Contract preserved: exported as `AmbientBackground`, reads `useThemeMode()`
 * for the accent, renders absolutely with `pointerEvents:'none'`, and holds no
 * persistent global GL state so it can cleanly unmount and hand off to the CSS
 * gradient fallback once the Spatial Lab claims the single live WebGL context.
 */

/* ---------------------------------------------------------------- */
/* Procedural circuit-symbol library (local 2D coords, ~3 wide).    */
/* Each symbol is a list of strokes; each stroke a polyline.        */
/* ---------------------------------------------------------------- */
type Stroke = number[][]

function resistor(): Stroke[] {
  return [
    [
      [-1.5, 0], [-0.6, 0],
      [-0.5, 0.32], [-0.3, -0.32], [-0.1, 0.32],
      [0.1, -0.32], [0.3, 0.32], [0.5, -0.32],
      [0.6, 0], [1.5, 0],
    ],
  ]
}

function capacitor(): Stroke[] {
  return [
    [[-1.5, 0], [-0.13, 0]],
    [[-0.13, -0.45], [-0.13, 0.45]],
    [[0.13, -0.45], [0.13, 0.45]],
    [[0.13, 0], [1.5, 0]],
  ]
}

function diode(): Stroke[] {
  return [
    [[-1.5, 0], [-0.4, 0]],
    [[-0.4, 0.42], [-0.4, -0.42], [0.28, 0], [-0.4, 0.42]],
    [[0.28, -0.42], [0.28, 0.42]],
    [[0.28, 0], [1.5, 0]],
  ]
}

function inductor(): Stroke[] {
  const pts: number[][] = [[-1.5, 0], [-0.9, 0]]
  const r = 0.32
  for (let h = 0; h < 3; h++) {
    const cx = -0.6 + h * 0.6
    for (let a = 0; a <= 8; a++) {
      const th = Math.PI * (a / 8)
      pts.push([cx - r * Math.cos(th), r * Math.sin(th)])
    }
  }
  pts.push([0.9, 0], [1.5, 0])
  return [pts]
}

function ic(): Stroke[] {
  const strokes: Stroke[] = [
    [[-0.85, -0.6], [0.85, -0.6], [0.85, 0.6], [-0.85, 0.6], [-0.85, -0.6]],
  ]
  for (const y of [-0.32, 0, 0.32]) {
    strokes.push([[-1.12, y], [-0.85, y]])
    strokes.push([[0.85, y], [1.12, y]])
  }
  // orientation notch
  strokes.push([[-0.18, 0.6], [0, 0.42], [0.18, 0.6]])
  return strokes
}

function transistor(): Stroke[] {
  const circle: number[][] = []
  for (let a = 0; a <= 24; a++) {
    const th = (a / 24) * Math.PI * 2
    circle.push([0.55 * Math.cos(th), 0.55 * Math.sin(th)])
  }
  return [
    circle,
    [[-1.5, 0], [-0.25, 0]],
    [[-0.25, -0.4], [-0.25, 0.4]],
    [[-0.25, 0.18], [0.35, 0.5], [0.35, 1.25]],
    [[-0.25, -0.18], [0.35, -0.5], [0.35, -1.25]],
  ]
}

function ground(): Stroke[] {
  return [
    [[0, 0.9], [0, 0.3]],
    [[-0.42, 0.3], [0.42, 0.3]],
    [[-0.26, 0.1], [0.26, 0.1]],
    [[-0.12, -0.08], [0.12, -0.08]],
  ]
}

function junction(): Stroke[] {
  return [
    [[-1.5, 0], [1.5, 0]],
    [[0, -0.13], [0, 0.13]],
    [[-0.13, 0], [0.13, 0]],
  ]
}

const SYMBOLS = [resistor, capacitor, diode, inductor, ic, transistor, ground, junction]

/* ---------------------------------------------------------------- */
/* Small deterministic RNG so the layout is stable + intentional.   */
/* ---------------------------------------------------------------- */
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------------------------------------------------------------- */
/* Geometry helpers                                                 */
/* ---------------------------------------------------------------- */
function place(
  strokes: Stroke[],
  scale: number,
  rot: number,
  tx: number,
  ty: number,
  z: number,
): THREE.Vector3[][] {
  const cos = Math.cos(rot)
  const sin = Math.sin(rot)
  return strokes.map((st) =>
    st.map(([x, y]) => {
      const sx = x * scale
      const sy = y * scale
      return new THREE.Vector3(sx * cos - sy * sin + tx, sx * sin + sy * cos + ty, z)
    }),
  )
}

function toSegments(strokes: THREE.Vector3[][]): Float32Array {
  let count = 0
  for (const st of strokes) count += Math.max(0, st.length - 1)
  const arr = new Float32Array(count * 6)
  let i = 0
  for (const st of strokes) {
    for (let k = 0; k < st.length - 1; k++) {
      const a = st[k]
      const b = st[k + 1]
      arr[i++] = a.x; arr[i++] = a.y; arr[i++] = a.z
      arr[i++] = b.x; arr[i++] = b.y; arr[i++] = b.z
    }
  }
  return arr
}

function orthRoute(
  a: { cx: number; cy: number },
  b: { cx: number; cy: number },
  z: number,
): THREE.Vector3[] {
  const midx = (a.cx + b.cx) / 2
  return [
    new THREE.Vector3(a.cx, a.cy, z),
    new THREE.Vector3(midx, a.cy, z),
    new THREE.Vector3(midx, b.cy, z),
    new THREE.Vector3(b.cx, b.cy, z),
  ]
}

type GridParams = {
  cols: number
  rows: number
  sx: number
  sy: number
  z: number
  scale: number
  connect: number
  jitter: number
  rng: () => number
}

function gridLayer(p: GridParams) {
  const { cols, rows, sx, sy, z, scale, connect, jitter, rng } = p
  const symStrokes: THREE.Vector3[][] = []
  const routes: THREE.Vector3[][] = []
  const startX = -((cols - 1) * sx) / 2
  const startY = -((rows - 1) * sy) / 2
  const grid: { cx: number; cy: number }[][] = []

  for (let r = 0; r < rows; r++) {
    grid[r] = []
    for (let c = 0; c < cols; c++) {
      const cx = startX + c * sx + (rng() - 0.5) * jitter
      const cy = startY + r * sy + (rng() - 0.5) * jitter
      grid[r][c] = { cx, cy }
      const sym = SYMBOLS[Math.floor(rng() * SYMBOLS.length)]
      const rot = rng() < 0.5 ? 0 : Math.PI / 2
      symStrokes.push(...place(sym(), scale, rot, cx, cy, z))
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c < cols - 1 && rng() < connect) routes.push(orthRoute(grid[r][c], grid[r][c + 1], z))
      if (r < rows - 1 && rng() < connect) routes.push(orthRoute(grid[r][c], grid[r + 1][c], z))
    }
  }

  return { symStrokes, routes }
}

type Pulse = { points: THREE.Vector3[]; speed: number; phase: number; always: boolean }

function pickPulses(
  routes: THREE.Vector3[][],
  count: number,
  always: boolean,
  rng: () => number,
): Pulse[] {
  const idx = routes.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx.slice(0, Math.min(count, idx.length)).map((i) => ({
    points: routes[i],
    speed: 1.2 + rng() * 1.1,
    phase: rng(),
    always,
  }))
}

function makeGraticule(z: number): Float32Array {
  const strokes: Stroke[] = []
  const W = 22
  const H = 14
  const step = 1.35
  for (let x = -W / 2; x <= W / 2 + 0.001; x += step) strokes.push([[x, -H / 2], [x, H / 2]])
  for (let y = -H / 2; y <= H / 2 + 0.001; y += step) strokes.push([[-W / 2, y], [W / 2, y]])
  return toSegments(place(strokes, 1, 0, 0, 0, z))
}

/* ---------------------------------------------------------------- */
/* Reduced-motion                                                   */
/* ---------------------------------------------------------------- */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

/* ---------------------------------------------------------------- */
/* Renderers                                                        */
/* ---------------------------------------------------------------- */
function Segments({
  positions,
  color,
  opacity,
  additive,
}: {
  positions: Float32Array
  color: string
  opacity: number
  additive?: boolean
}) {
  const geom = React.useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [positions])
  React.useEffect(() => () => geom.dispose(), [geom])
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        toneMapped={false}
        depthWrite={false}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </lineSegments>
  )
}

function PulseTrace({
  points,
  glowColor,
  coreColor,
  speed,
  phase,
  always,
  reduced,
  additive,
}: {
  points: THREE.Vector3[]
  glowColor: string
  coreColor: string
  speed: number
  phase: number
  always: boolean
  reduced: boolean
  additive: boolean
}) {
  const coreRef = React.useRef<any>(null)
  const glowRef = React.useRef<any>(null)
  const length = React.useMemo(() => {
    let L = 0
    for (let i = 0; i < points.length - 1; i++) L += points[i].distanceTo(points[i + 1])
    return L
  }, [points])
  const PULSE = Math.min(1.2, Math.max(0.5, length * 0.35))
  const period = length + PULSE

  useFrame((state) => {
    if (reduced) return
    const t = state.clock.elapsedTime
    let progress = 0
    let intensity = 0
    if (always) {
      progress = ((t * speed + phase * period) % period) / period
      intensity = 1
    } else {
      const cycle = 8
      const local = (t + phase * cycle) % cycle
      const on = 3.4
      if (local < on) {
        progress = local / on
        intensity = Math.sin((local / on) * Math.PI)
      }
    }
    const offset = -(progress * period)
    if (coreRef.current) {
      coreRef.current.material.dashOffset = offset
      coreRef.current.material.opacity = 0.95 * intensity
    }
    if (glowRef.current) {
      glowRef.current.material.dashOffset = offset
      glowRef.current.material.opacity = 0.3 * intensity
    }
  })

  const blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending
  return (
    <>
      <Line
        ref={glowRef}
        points={points}
        color={glowColor}
        lineWidth={5}
        dashed
        dashScale={1}
        dashSize={PULSE}
        gapSize={length}
        transparent
        opacity={0}
        toneMapped={false}
        depthWrite={false}
        blending={blending}
      />
      <Line
        ref={coreRef}
        points={points}
        color={coreColor}
        lineWidth={1.7}
        dashed
        dashScale={1}
        dashSize={PULSE}
        gapSize={length}
        transparent
        opacity={0}
        toneMapped={false}
        depthWrite={false}
        blending={blending}
      />
    </>
  )
}

type Drift = { fx: number; fy: number; fr: number; amp: number; rot: number }

function LayerGroup({
  children,
  drift,
  parallax,
  reduced,
}: {
  children: React.ReactNode
  drift: Drift
  parallax: number
  reduced: boolean
}) {
  const ref = React.useRef<THREE.Group>(null)
  useFrame((state) => {
    if (reduced || !ref.current) return
    const t = state.clock.elapsedTime
    const g = ref.current
    const dx = Math.sin(t * drift.fx) * drift.amp
    const dy = Math.cos(t * drift.fy) * drift.amp
    const tx = state.pointer.x * parallax + dx
    const ty = state.pointer.y * parallax + dy
    // Damped, lab-rig feel — not bouncy portfolio spring.
    g.position.x += (tx - g.position.x) * 0.04
    g.position.y += (ty - g.position.y) * 0.04
    const rz = Math.sin(t * drift.fr) * drift.rot
    g.rotation.z += (rz - g.rotation.z) * 0.04
  })
  return <group ref={ref}>{children}</group>
}

function Rig({ reduced }: { reduced: boolean }) {
  const { camera } = useThree()
  useFrame((state) => {
    if (reduced) return
    camera.position.x += (state.pointer.x * 0.5 - camera.position.x) * 0.025
    camera.position.y += (state.pointer.y * 0.35 - camera.position.y) * 0.025
    camera.lookAt(0, 0, 0)
  })
  return null
}

/* ---------------------------------------------------------------- */
/* Scene                                                            */
/* ---------------------------------------------------------------- */
function Schematic({
  accent,
  copper,
  coreColor,
  additive,
  reduced,
}: {
  accent: string
  copper: string
  coreColor: string
  additive: boolean
  reduced: boolean
}) {
  const data = React.useMemo(() => {
    const rng = mulberry32(1337)
    const far = gridLayer({ cols: 6, rows: 4, sx: 2.9, sy: 2.6, z: -6, scale: 0.3, connect: 0.35, jitter: 0.5, rng })
    const mid = gridLayer({ cols: 5, rows: 3, sx: 3.3, sy: 3.1, z: -2.5, scale: 0.5, connect: 0.55, jitter: 0.4, rng })
    const near = gridLayer({ cols: 3, rows: 2, sx: 4.6, sy: 3.8, z: 0.6, scale: 0.62, connect: 0.8, jitter: 0.3, rng })
    return {
      graticule: makeGraticule(-6.4),
      far: {
        sym: toSegments(far.symStrokes),
        trace: toSegments(far.routes),
      },
      mid: {
        sym: toSegments(mid.symStrokes),
        trace: toSegments(mid.routes),
        pulses: pickPulses(mid.routes, 5, false, rng),
      },
      near: {
        sym: toSegments(near.symStrokes),
        trace: toSegments(near.routes),
        pulses: pickPulses(near.routes, 4, true, rng),
      },
    }
  }, [])

  return (
    <>
      {/* Far — ghost silkscreen + oscilloscope graticule */}
      <LayerGroup drift={{ fx: 0.03, fy: 0.025, fr: 0.02, amp: 0.5, rot: 0.05 }} parallax={0.15} reduced={reduced}>
        <Segments positions={data.graticule} color={accent} opacity={0.05} />
        <Segments positions={data.far.sym} color={accent} opacity={0.1} />
        <Segments positions={data.far.trace} color={copper} opacity={0.08} />
      </LayerGroup>

      {/* Mid — the main circuit, some traces live */}
      <LayerGroup drift={{ fx: 0.045, fy: 0.035, fr: 0.03, amp: 0.35, rot: 0.035 }} parallax={0.5} reduced={reduced}>
        <Segments positions={data.mid.sym} color={accent} opacity={0.34} />
        <Segments positions={data.mid.trace} color={copper} opacity={0.2} />
        {data.mid.pulses.map((p, i) => (
          <PulseTrace
            key={i}
            points={p.points}
            glowColor={accent}
            coreColor={coreColor}
            speed={p.speed}
            phase={p.phase}
            always={p.always}
            reduced={reduced}
            additive={additive}
          />
        ))}
      </LayerGroup>

      {/* Near — crisp foreground, always-live probed traces */}
      <LayerGroup drift={{ fx: 0.06, fy: 0.05, fr: 0.04, amp: 0.2, rot: 0.025 }} parallax={1.1} reduced={reduced}>
        <Segments positions={data.near.sym} color={accent} opacity={0.52} />
        <Segments positions={data.near.trace} color={copper} opacity={0.34} />
        {data.near.pulses.map((p, i) => (
          <PulseTrace
            key={i}
            points={p.points}
            glowColor={accent}
            coreColor={coreColor}
            speed={p.speed}
            phase={p.phase}
            always={p.always}
            reduced={reduced}
            additive={additive}
          />
        ))}
      </LayerGroup>
    </>
  )
}

export function AmbientBackground() {
  const { mode } = useThemeMode()
  const reduced = usePrefersReducedMotion()

  const dark = mode === 'dark'
  // Signal red on the dark bench; a distinct blueprint indigo for light mode.
  const accent = dark ? SIGNAL.red : '#22409e'
  const copper = dark ? COPPER.idleLit : '#5b6b9a'
  const coreColor = dark ? '#ffe1da' : '#4f74ff'

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 9], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Rig reduced={reduced} />
        <Schematic
          accent={accent}
          copper={copper}
          coreColor={coreColor}
          additive={dark}
          reduced={reduced}
        />
      </Canvas>
    </div>
  )
}
