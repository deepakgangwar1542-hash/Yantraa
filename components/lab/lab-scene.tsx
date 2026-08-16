'use client'

import * as React from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Html, Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { getComponent, type ShapeKind } from '@/lib/electronics-data'
import { ComponentShape, getPinAnchors } from '@/components/lab/component-mesh'
import type { CircuitReport, PlacedInstance, Wire, WireEnd } from '@/lib/circuit-engine'
import { SIGNAL, COPPER, STATUS } from '@/lib/theme'
import { handOrbit } from '@/lib/hand-orbit'

interface SceneProps {
  placed: PlacedInstance[]
  wires: Wire[]
  mode: 'move' | 'wire'
  running: boolean
  selectedId: string | null
  pendingWire: WireEnd | null
  report: CircuitReport
  pressedIds: ReadonlySet<string>
  onSelect: (id: string) => void
  onPinDown: (instanceId: string, pinIndex: number) => void
  onPinUp: (instanceId: string, pinIndex: number) => void
  onMove: (id: string, pos: [number, number, number]) => void
  onRemove: (id: string) => void
  onDragStateChange: (dragging: boolean) => void
  onDeselect: () => void
  onDeleteWire: (id: string) => void
  onTogglePress: (id: string) => void
}

/**
 * OrbitControls that only rotate when allowed: always for mouse users, but for
 * hand control ONLY while a fist is held. This keeps the view perfectly stable
 * while the user pinches to select pins and drag wires.
 */
function LabControls({ dragging }: { dragging: boolean }) {
  const ref = React.useRef<React.ElementRef<typeof OrbitControls> | null>(null)

  // Apply the rotate permission IMPERATIVELY so it lands in the same synchronous
  // tick that the fist gesture dispatches its pointerdown. Driving enableRotate
  // through React state would update a frame too late, so OrbitControls would
  // still see enableRotate=false at pointerdown and the rotation would never
  // start — which is exactly what made the fist-orbit gesture appear dead.
  const apply = React.useCallback(() => {
    const controls = ref.current as unknown as { enableRotate: boolean } | null
    if (controls) controls.enableRotate = handOrbit.rotateAllowed()
  }, [])

  React.useEffect(() => {
    apply()
    return handOrbit.subscribe(apply)
  }, [apply])

  return (
    <OrbitControls
      ref={ref}
      enabled={!dragging}
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={22}
      maxPolarAngle={Math.PI / 2.15}
      makeDefault
    />
  )
}

const DRAG_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const SNAP = 0.25
const snap = (v: number) => Math.round(v / SNAP) * SNAP

// Placement bounds of the board surface, and how far past the edge a component
// must be dragged before it counts as "off the board" and gets removed.
const BOARD_X = 5.5
const BOARD_Z = 3.5
const REMOVE_MARGIN = 0.9

const WIRE_COLORS = ['#e5484d', '#f5b301', '#3ba55d', '#4ea1ff', '#c084fc', '#e8eefb']

type Vec3 = [number, number, number]

function worldAnchor(pos: Vec3, shape: ShapeKind, pinIndex: number): Vec3 {
  const anchors = getPinAnchors(shape)
  const a = anchors[pinIndex] ?? anchors[0]
  return [pos[0] + a[0], a[1], pos[2] + a[2]]
}

/** Keeps the canvas alive if the GPU context is briefly lost and restored. */
function ContextRecovery() {
  const { gl, invalidate, size } = useThree()
  React.useEffect(() => {
    const canvas = gl.domElement
    // preventDefault() on contextlost is REQUIRED for the browser to fire
    // contextrestored afterwards; without it the canvas stays permanently blank.
    const onLost = (e: Event) => e.preventDefault()
    const onRestored = () => {
      // Nudge the renderer to fully rebuild its GL state, then repaint over
      // several frames so the scene reappears instead of staying blank.
      gl.setSize(size.width, size.height)
      invalidate()
      requestAnimationFrame(() => invalidate())
      requestAnimationFrame(() => invalidate())
    }
    canvas.addEventListener('webglcontextlost', onLost as EventListener, false)
    canvas.addEventListener('webglcontextrestored', onRestored, false)
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost as EventListener)
      canvas.removeEventListener('webglcontextrestored', onRestored)
    }
  }, [gl, invalidate, size.width, size.height])
  return null
}

/** Procedural breadboard top texture (holes, trench, power rails). */
function useBreadboardTexture() {
  return React.useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 683
    const ctx = c.getContext('2d')
    if (!ctx) return null
    // base
    ctx.fillStyle = '#e9e3d2'
    ctx.fillRect(0, 0, c.width, c.height)
    // subtle top shading
    const grad = ctx.createLinearGradient(0, 0, 0, c.height)
    grad.addColorStop(0, 'rgba(255,255,255,0.25)')
    grad.addColorStop(1, 'rgba(0,0,0,0.08)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, c.width, c.height)
    // power rails
    const rail = (y: number, color: string) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(60, y)
      ctx.lineTo(c.width - 60, y)
      ctx.stroke()
    }
    rail(46, '#d94b4b')
    rail(72, '#3b6fd9')
    rail(c.height - 72, '#d94b4b')
    rail(c.height - 46, '#3b6fd9')
    // center trench
    ctx.fillStyle = 'rgba(0,0,0,0.10)'
    ctx.fillRect(0, c.height / 2 - 26, c.width, 52)
    // hole grid
    const startX = 70
    const stepX = (c.width - 140) / 30
    const rows = [110, 150, 190, 230, 270, c.height - 270, c.height - 230, c.height - 190, c.height - 150, c.height - 110]
    ctx.fillStyle = '#3a3730'
    for (let i = 0; i <= 30; i++) {
      for (const ry of rows) {
        ctx.beginPath()
        ctx.rect(startX + i * stepX - 3, ry - 3, 6, 6)
        ctx.fill()
      }
    }

    // --- printed markings, like a real breadboard ---
    ctx.fillStyle = '#4a453a'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Column numbers (1..30) printed above the top block and below the bottom block.
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif'
    const topNumY = rows[0] - 30
    const botNumY = rows[rows.length - 1] + 30
    for (let i = 0; i <= 30; i++) {
      const col = i + 1
      // Print 1, then every 5th column, matching real breadboard labelling.
      if (col === 1 || col % 5 === 0) {
        const x = startX + i * stepX
        ctx.fillText(String(col), x, topNumY)
        ctx.fillText(String(col), x, botNumY)
      }
    }

    // Row letters: a-e for the top block, f-j for the bottom block, on both sides.
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif'
    const rowLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    const leftX = startX - 34
    const rightX = startX + 30 * stepX + 34
    rows.forEach((ry, idx) => {
      const letter = rowLetters[idx]
      ctx.fillText(letter, leftX, ry)
      ctx.fillText(letter, rightX, ry)
    })

    // Power-rail +/- markers next to the coloured rails.
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif'
    ctx.fillStyle = '#d94b4b'
    ctx.fillText('+', 40, 46)
    ctx.fillText('+', 40, c.height - 72)
    ctx.fillStyle = '#3b6fd9'
    ctx.fillText('-', 40, 72)
    ctx.fillText('-', 40, c.height - 46)

    const tex = new THREE.CanvasTexture(c)
    tex.anisotropy = 4
    tex.needsUpdate = true
    return tex
  }, [])
}

function Breadboard() {
  const tex = useBreadboardTexture()
  return (
    <group>
      {/* desk */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
        <boxGeometry args={[26, 1, 18]} />
        <meshStandardMaterial color="#2a2118" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* breadboard body */}
      <mesh position={[0, -0.16, 0]} receiveShadow castShadow>
        <boxGeometry args={[12.4, 0.32, 8.4]} />
        <meshStandardMaterial color="#d9d2c0" roughness={0.6} />
      </mesh>
      {/* breadboard printed top */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[12.4, 8.4]} />
        {tex ? (
          <meshStandardMaterial map={tex} roughness={0.65} />
        ) : (
          <meshStandardMaterial color="#e9e3d2" roughness={0.65} />
        )}
      </mesh>
    </group>
  )
}

/** Live current state of a wire, derived from the circuit-engine report. */
type WirePower = 'off' | 'active' | 'warning' | 'error'

const WIRE_STATE_COLOR: Record<WirePower, THREE.Color> = {
  off: new THREE.Color(COPPER.idle),
  active: new THREE.Color(SIGNAL.red),
  warning: new THREE.Color(STATUS.warning),
  error: new THREE.Color(STATUS.error),
}
const WIRE_HOVER_COLOR = new THREE.Color('#ffffff')

/**
 * Derives a wire's live current state from the circuit-engine report: a wire
 * inherits the "worst" state of the two components it joins (error > warning >
 * active), so a short/backwards part flashes its wires red-orange, an
 * unprotected LED tints its wires amber, and a healthy loop pulses signal-red.
 * Only meaningful while the simulation is running; idle wires stay copper.
 */
function wirePowerFor(w: Wire, report: CircuitReport, running: boolean): WirePower {
  if (!running) return 'off'
  const a = report.states[w.from.instanceId]
  const b = report.states[w.to.instanceId]
  if (!a || !b) return 'off'
  if (a.status === 'error' || b.status === 'error') return 'error'
  if (a.status === 'warning' || b.status === 'warning') return 'warning'
  if (a.status === 'active' && b.status === 'active') return 'active'
  return 'off'
}

function WireTube({
  start,
  end,
  color,
  power,
  interactive,
  onDelete,
}: {
  start: Vec3
  end: Vec3
  /** Idle jumper color, shown while editing (sim not running). */
  color: string
  /** Live current state while the simulation is running. */
  power: WirePower
  interactive: boolean
  onDelete: () => void
}) {
  const geometry = React.useMemo(() => {
    const s = new THREE.Vector3(...start)
    const e = new THREE.Vector3(...end)
    const dist = s.distanceTo(e)
    const mid = s.clone().lerp(e, 0.5)
    mid.y += 0.35 + dist * 0.18
    const curve = new THREE.QuadraticBezierCurve3(s, mid, e)
    return new THREE.TubeGeometry(curve, 24, 0.05, 10, false)
  }, [start, end])

  const [hovered, setHovered] = React.useState(false)
  const matRef = React.useRef<THREE.MeshStandardMaterial>(null)
  const endMatRef = React.useRef<THREE.MeshStandardMaterial>(null)
  // Idle jumper color while editing so wires stay distinguishable.
  const idleColor = React.useMemo(() => new THREE.Color(color), [color])

  React.useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state) => {
    const mat = matRef.current
    if (!mat) return
    const t = state.clock.elapsedTime

    if (hovered) {
      mat.color.copy(WIRE_HOVER_COLOR)
      mat.emissive.copy(WIRE_HOVER_COLOR)
      mat.emissiveIntensity = 0.55
    } else if (power === 'off') {
      // Idle: flat jumper color, no glow. (matte copper once powered-down loop)
      mat.color.copy(idleColor)
      mat.emissive.setRGB(0, 0, 0)
      mat.emissiveIntensity = 0
    } else {
      const c = WIRE_STATE_COLOR[power]
      mat.color.copy(c)
      mat.emissive.copy(c)
      // Breathing pulse for active/warning; a sharp fast flash for error.
      if (power === 'error') {
        mat.emissiveIntensity = 0.5 + (Math.sin(t * 18) > 0 ? 1.1 : 0.2)
      } else if (power === 'warning') {
        mat.emissiveIntensity = 0.45 + (Math.sin(t * 4) * 0.5 + 0.5) * 0.5
      } else {
        mat.emissiveIntensity = 0.6 + (Math.sin(t * 7) * 0.5 + 0.5) * 0.7
      }
    }

    const em = endMatRef.current
    if (em) {
      if (power === 'off' || hovered) {
        em.emissiveIntensity = hovered ? 0.4 : 0
      } else {
        em.emissive.copy(WIRE_STATE_COLOR[power])
        em.emissiveIntensity = mat.emissiveIntensity * 0.8
      }
    }
  })

  const live = power !== 'off'

  return (
    <group>
      <mesh
        geometry={geometry}
        castShadow
        onClick={
          interactive
            ? (e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation()
                onDelete()
              }
            : undefined
        }
        onPointerOver={
          interactive
            ? (e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation()
                setHovered(true)
                document.body.style.cursor = 'pointer'
              }
            : undefined
        }
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive={'#000000'}
          emissiveIntensity={0}
          roughness={0.35}
          metalness={0.1}
          toneMapped={!live}
        />
      </mesh>
      {[start, end].map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial
            ref={i === 0 ? endMatRef : undefined}
            color="#111827"
            emissive={SIGNAL.red}
            emissiveIntensity={0}
            metalness={0.5}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Dashed guide line from the pending wire pin to the cursor position. */
function PendingWirePreview({ from }: { from: Vec3 }) {
  const { pointer, camera } = useThree()
  const raycaster = React.useMemo(() => new THREE.Raycaster(), [])
  const hit = React.useMemo(() => new THREE.Vector3(), [])
  const line = React.useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    const material = new THREE.LineBasicMaterial({
      color: '#f5b301',
      transparent: true,
      opacity: 0.65,
      toneMapped: false,
    })
    return new THREE.Line(g, material)
  }, [])

  useFrame(() => {
    const attr = line.geometry.getAttribute('position') as THREE.BufferAttribute
    attr.setXYZ(0, from[0], from[1], from[2])
    raycaster.setFromCamera(pointer, camera)
    if (raycaster.ray.intersectPlane(DRAG_PLANE, hit)) {
      attr.setXYZ(1, hit.x, Math.max(hit.y, 0), hit.z)
    } else {
      attr.setXYZ(1, from[0], from[1], from[2])
    }
    attr.needsUpdate = true
  })

  React.useEffect(
    () => () => {
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    },
    [line],
  )

  return <primitive object={line} />
}

function Draggable({
  position,
  enabled,
  onMove,
  onRemove,
  onSelect,
  onActivate,
  onDragStateChange,
  children,
}: {
  position: Vec3
  enabled: boolean
  onMove: (pos: Vec3) => void
  onRemove: () => void
  onSelect: () => void
  onActivate?: () => void
  onDragStateChange: (dragging: boolean) => void
  children: React.ReactNode
}) {
  const { camera, gl } = useThree()
  const draggingRef = React.useRef(false)
  const movedRef = React.useRef(false)
  const outsideRef = React.useRef(false)
  const lastPosRef = React.useRef<Vec3>(position)
  const raycaster = React.useMemo(() => new THREE.Raycaster(), [])
  const pointer = React.useMemo(() => new THREE.Vector2(), [])
  const intersection = React.useMemo(() => new THREE.Vector3(), [])
  const [hovered, setHovered] = React.useState(false)
  // True while the component is being dragged past the board edge — drives the
  // red "release to remove" feedback.
  const [markedForRemoval, setMarkedForRemoval] = React.useState(false)

  React.useEffect(() => {
    if (!enabled) return
    const dom = gl.domElement

    const handleMove = (e: PointerEvent) => {
      if (!draggingRef.current) return
      movedRef.current = true
      const rect = dom.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      if (raycaster.ray.intersectPlane(DRAG_PLANE, intersection)) {
        const rawX = snap(intersection.x)
        const rawZ = snap(intersection.z)
        const outside =
          rawX < -(BOARD_X + REMOVE_MARGIN) ||
          rawX > BOARD_X + REMOVE_MARGIN ||
          rawZ < -(BOARD_Z + REMOVE_MARGIN) ||
          rawZ > BOARD_Z + REMOVE_MARGIN
        outsideRef.current = outside
        setMarkedForRemoval(outside)
        document.body.style.cursor = outside ? 'not-allowed' : 'grabbing'
        // Let the component follow the cursor slightly past the edge (so it
        // visibly lifts off the board) but keep it within a sane range.
        const followX = Math.max(-(BOARD_X + REMOVE_MARGIN + 0.5), Math.min(BOARD_X + REMOVE_MARGIN + 0.5, rawX))
        const followZ = Math.max(-(BOARD_Z + REMOVE_MARGIN + 0.5), Math.min(BOARD_Z + REMOVE_MARGIN + 0.5, rawZ))
        lastPosRef.current = [followX, 0, followZ]
        onMove([followX, 0, followZ])
      }
    }
    const handleUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      onDragStateChange(false)
      document.body.style.cursor = 'auto'
      if (outsideRef.current) {
        onRemove()
      } else {
        // Snap the final resting position back onto the board bounds.
        const [x, , z] = lastPosRef.current
        onMove([
          Math.max(-BOARD_X, Math.min(BOARD_X, x)),
          0,
          Math.max(-BOARD_Z, Math.min(BOARD_Z, z)),
        ])
      }
      outsideRef.current = false
      setMarkedForRemoval(false)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [enabled, camera, gl, onMove, onRemove, onDragStateChange, raycaster, pointer, intersection])

  return (
    <group
      position={position}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        movedRef.current = false
        onSelect()
        if (enabled) {
          draggingRef.current = true
          lastPosRef.current = position
          onDragStateChange(true)
          document.body.style.cursor = 'grabbing'
        }
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        // A pure click (no drag) on a button activates it.
        if (!movedRef.current) onActivate?.()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = enabled ? 'grab' : 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        if (!draggingRef.current) document.body.style.cursor = 'auto'
      }}
      scale={hovered ? 1.03 : 1}
    >
      {children}
      {markedForRemoval && (
        <>
          <SelectionRing color="#e5484d" />
          <Html position={[0, 1.6, 0]} center distanceFactor={9} pointerEvents="none">
            <div
              style={{
                padding: '2px 8px',
                borderRadius: 6,
                background: '#e5484d',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
                userSelect: 'none',
              }}
            >
              Release to remove
            </div>
          </Html>
        </>
      )}
    </group>
  )
}

function InstanceLabel({ text }: { text: string }) {
  return (
    <Html position={[0, 1.25, 0]} center distanceFactor={9} pointerEvents="none">
      <div
        style={{
          padding: '2px 8px',
          borderRadius: 6,
          background: 'rgba(11, 18, 32, 0.85)',
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
          userSelect: 'none',
        }}
      >
        {text}
      </div>
    </Html>
  )
}

/** Clickable pin pads. In Wire mode they are the wiring endpoints. */
function Pins({
  shape,
  names,
  wireMode,
  showLabels,
  instanceId,
  pending,
  onPinDown,
  onPinUp,
}: {
  shape: ShapeKind
  names: string[]
  wireMode: boolean
  showLabels: boolean
  instanceId: string
  pending: WireEnd | null
  onPinDown: (pinIndex: number) => void
  onPinUp: (pinIndex: number) => void
}) {
  const anchors = getPinAnchors(shape)
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null)
  const pendingHere = pending?.instanceId === instanceId ? pending.pinIndex : null

  return (
    <>
      {anchors.map((a, i) => {
        const isPending = pendingHere === i
        const isHovered = hoveredIdx === i
        const showLabel = isPending || (wireMode && (showLabels || isHovered))
        return (
          <group key={i} position={a}>
            {/* Invisible oversized hit target: pads are small (a hand cursor is
                less precise than a mouse), so catch clicks within a generous
                radius around the pad while the visible sphere stays tiny. */}
            <mesh
              onPointerDown={(e: ThreeEvent<PointerEvent>) => {
                if (!wireMode) return
                e.stopPropagation()
                onPinDown(i)
              }}
              onPointerUp={(e: ThreeEvent<PointerEvent>) => {
                if (!wireMode) return
                e.stopPropagation()
                onPinUp(i)
              }}
              onPointerOver={
                wireMode
                  ? (e: ThreeEvent<PointerEvent>) => {
                      e.stopPropagation()
                      setHoveredIdx(i)
                      document.body.style.cursor = 'pointer'
                    }
                  : undefined
              }
              onPointerOut={() => {
                setHoveredIdx(null)
                document.body.style.cursor = 'auto'
              }}
            >
              <sphereGeometry args={[wireMode ? 0.42 : 0.26, 12, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            {/* Glow halo so connection points are easy to spot and target in wire mode. */}
            {wireMode && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <ringGeometry args={[0.16, 0.26, 28]} />
                <meshBasicMaterial
                  color={isPending ? '#ffd34d' : isHovered ? '#ffffff' : '#f5b301'}
                  transparent
                  opacity={isPending ? 0.95 : isHovered ? 0.9 : 0.55}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                  depthWrite={false}
                />
              </mesh>
            )}
            <mesh
              scale={
                isPending
                  ? wireMode
                    ? 2.8
                    : 1.9
                  : isHovered
                    ? wireMode
                      ? 2.4
                      : 1.55
                    : wireMode
                      ? 1.9
                      : 1
              }
              onPointerDown={(e: ThreeEvent<PointerEvent>) => {
                if (!wireMode) return
                e.stopPropagation()
                onPinDown(i)
              }}
              onPointerUp={(e: ThreeEvent<PointerEvent>) => {
                if (!wireMode) return
                e.stopPropagation()
                onPinUp(i)
              }}
              onPointerOver={
                wireMode
                  ? (e: ThreeEvent<PointerEvent>) => {
                      e.stopPropagation()
                      setHoveredIdx(i)
                      document.body.style.cursor = 'pointer'
                    }
                  : undefined
              }
              onPointerOut={() => {
                setHoveredIdx(null)
                document.body.style.cursor = 'auto'
              }}
            >
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshBasicMaterial
                color={isPending ? '#ffd34d' : isHovered ? '#ffffff' : '#f5b301'}
                toneMapped={false}
              />
            </mesh>
            {showLabel && (
              <Html
                position={[0, isPending ? 0.3 : 0.24, 0]}
                center
                distanceFactor={7}
                pointerEvents="none"
              >
                <div
                  style={{
                    padding: '1px 6px',
                    borderRadius: 5,
                    background: isPending ? 'rgba(255, 211, 77, 0.95)' : 'rgba(245, 179, 1, 0.92)',
                    color: '#1a1200',
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    fontFamily: "'Segoe UI', system-ui, sans-serif",
                    userSelect: 'none',
                  }}
                >
                  {isPending ? '→ ' : ''}
                  {names[i] ?? `Pin ${i + 1}`}
                </div>
              </Html>
            )}
          </group>
        )
      })}
    </>
  )
}

function SelectionRing({ color }: { color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <ringGeometry args={[0.8, 0.95, 44]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function LabScene({
  placed,
  wires,
  mode,
  running,
  selectedId,
  pendingWire,
  report,
  pressedIds,
  onSelect,
  onPinDown,
  onPinUp,
  onMove,
  onRemove,
  onDragStateChange,
  onDeselect,
  onDeleteWire,
  onTogglePress,
}: SceneProps) {
  const [dragging, setDragging] = React.useState(false)

  const handleDragState = React.useCallback(
    (d: boolean) => {
      setDragging(d)
      onDragStateChange(d)
    },
    [onDragStateChange],
  )

  const instById = React.useMemo(() => {
    const map = new Map<string, PlacedInstance>()
    placed.forEach((p) => map.set(p.instanceId, p))
    return map
  }, [placed])

  return (
    <Canvas
      shadows
      camera={{ position: [7, 7, 7], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, toneMappingExposure: 1.05 }}
      onPointerMissed={() => onDeselect()}
    >
      <ContextRecovery />
      <color attach="background" args={['#0e1626']} />
      <fog attach="fog" args={['#0e1626', 20, 38]} />

      {/* Lighting: desk-lamp key + soft fill */}
      <hemisphereLight args={['#dfe8ff', '#1a1712', 0.5]} />
      <directionalLight
        position={[5, 9, 4]}
        intensity={1.15}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-6, 5, -5]} intensity={0.35} color="#6f9bff" />
      <pointLight position={[0, 6, 2]} intensity={0.4} color="#fff4e0" />

      {/* Procedural studio env for real reflections on metal/plastic.
          Renders once (frames={1}); no HDRI network fetch. */}
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#0b0d0f']} />
        <Lightformer
          intensity={1.4}
          position={[0, 6, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[10, 10, 1]}
          color="#fff4e0"
        />
        <Lightformer intensity={0.7} position={[-6, 2, 3]} scale={[3, 8, 1]} color="#6f9bff" />
        <Lightformer intensity={0.6} position={[6, 2, -3]} scale={[3, 8, 1]} color="#8ecbff" />
      </Environment>

      <Breadboard />

      {/* Wires */}
      {wires.map((w, idx) => {
        const a = instById.get(w.from.instanceId)
        const b = instById.get(w.to.instanceId)
        if (!a || !b) return null
        const defA = getComponent(a.componentId)
        const defB = getComponent(b.componentId)
        if (!defA || !defB) return null
        const start = worldAnchor(a.position, defA.shape, w.from.pinIndex)
        const end = worldAnchor(b.position, defB.shape, w.to.pinIndex)
        return (
          <WireTube
            key={w.id}
            start={start}
            end={end}
            color={WIRE_COLORS[idx % WIRE_COLORS.length]}
            power={wirePowerFor(w, report, running)}
            interactive={mode === 'wire'}
            onDelete={() => onDeleteWire(w.id)}
          />
        )
      })}

      {/* Pending wire guide line */}
      {mode === 'wire' &&
        pendingWire &&
        (() => {
          const inst = instById.get(pendingWire.instanceId)
          if (!inst) return null
          const def = getComponent(inst.componentId)
          if (!def) return null
          return <PendingWirePreview from={worldAnchor(inst.position, def.shape, pendingWire.pinIndex)} />
        })()}

      {/* Components */}
      <React.Suspense fallback={null}>
        {placed.map((inst) => {
          const def = getComponent(inst.componentId)
          if (!def) return null
          const isSelected = selectedId === inst.instanceId
          const st = report.states[inst.instanceId]
          const isError = st?.status === 'error'
          const isWarning = st?.status === 'warning'
          const isActive = running && st?.status === 'active'
          const lit = running && !!st?.lit
          const isPressed = def.id === 'button' && pressedIds.has(inst.instanceId)
          return (
            <Draggable
              key={inst.instanceId}
              position={inst.position}
              enabled={mode === 'move'}
              onMove={(pos) => onMove(inst.instanceId, pos)}
              onRemove={() => onRemove(inst.instanceId)}
              onSelect={() => onSelect(inst.instanceId)}
              onActivate={def.id === 'button' ? () => onTogglePress(inst.instanceId) : undefined}
              onDragStateChange={handleDragState}
            >
              <ComponentShape
                shape={def.shape}
                color={def.color}
                active={lit}
                pressed={isPressed}
              />
              <InstanceLabel text={def.name} />
              <Pins
                shape={def.shape}
                names={def.pins.map((p) => p.name)}
                wireMode={mode === 'wire'}
                showLabels={isSelected}
                instanceId={inst.instanceId}
                pending={pendingWire}
                onPinDown={(pinIndex) => onPinDown(inst.instanceId, pinIndex)}
                onPinUp={(pinIndex) => onPinUp(inst.instanceId, pinIndex)}
              />
              {isError && <SelectionRing color={STATUS.error} />}
              {isWarning && !isError && <SelectionRing color={STATUS.warning} />}
              {isActive && !isError && !isWarning && !isSelected && (
                <SelectionRing color={SIGNAL.red} />
              )}
              {isSelected && !isError && !isWarning && <SelectionRing color="#4ea1ff" />}
            </Draggable>
          )
        })}
      </React.Suspense>

      <ContactShadows
        position={[0, 0.02, 0]}
        opacity={0.45}
        scale={18}
        blur={2.4}
        far={6}
        color="#000000"
      />

      <LabControls dragging={dragging} />
    </Canvas>
  )
}
