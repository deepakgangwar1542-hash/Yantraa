'use client'

import * as React from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { ShapeKind } from '@/lib/electronics-data'

/* ------------------------------------------------------------------ */
/* Shared PBR material presets                                         */
/* ------------------------------------------------------------------ */

/** Bright tin-plated metal for leads / pins. */
const METAL_BRIGHT = { color: '#c8d0dc', metalness: 0.95, roughness: 0.22 }
/** Darker machined / plated metal. */
const METAL_DARK = { color: '#8a919c', metalness: 0.85, roughness: 0.38 }
/** Gold-plated header contacts. */
const METAL_GOLD = { color: '#e8c86a', metalness: 0.9, roughness: 0.3 }

/** X positions of the 8 gull-wing legs on each side of a 16-pin DIP. */
const LEG_X = [-0.9, -0.64, -0.39, -0.13, 0.13, 0.39, 0.64, 0.9]

/** Glossy injection-moulded plastic with a clearcoat sheen. */
function PlasticMaterial({
  color,
  roughness = 0.35,
}: {
  color: string
  roughness?: number
}) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={roughness}
      metalness={0}
      clearcoat={1}
      clearcoatRoughness={0.18}
      reflectivity={0.5}
    />
  )
}

/** Painted ceramic (resistor bodies etc). */
function CeramicMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.5} metalness={0.04} />
}

/**
 * Local-space pin anchor points where jumper wires attach. Coordinates are
 * relative to the component's own origin (which rests on the board at y=0).
 *
 * IMPORTANT: anchor heights are chosen to sit ABOVE the component's body so
 * the gold pin pads are always the nearest raycast hit. If a pin pad is
 * embedded inside the body mesh, the body's drag handler wins the raycast
 * and the pin can never be clicked.
 */
export const PIN_ANCHORS: Record<ShapeKind, [number, number, number][]> = {
  resistor: [
    [-0.85, 0.45, 0],
    [0.85, 0.45, 0],
  ],
  led: [
    [-0.42, 0.08, 0],
    [0.42, 0.08, 0],
  ],
  capacitor: [
    [-0.34, 0.08, 0],
    [0.34, 0.08, 0],
  ],
  diode: [
    [-0.75, 0.42, 0],
    [0.75, 0.42, 0],
  ],
  transistor: [
    [-0.16, 0.65, 0.12],
    [0, 0.65, 0.12],
    [0.16, 0.65, 0.12],
  ],
  button: [
    [-0.3, 0.45, 0.32],
    [0.3, 0.45, 0.32],
  ],
  potentiometer: [
    [-0.2, 0.5, 0.3],
    [0, 0.5, 0.3],
    [0.2, 0.5, 0.3],
  ],
  battery: [
    [-0.32, 0.95, 0],
    [0.32, 0.95, 0],
  ],
  buzzer: [
    [-0.5, 0.08, 0.2],
    [0.5, 0.08, 0.2],
  ],
  ic: [
    [-0.46, 0.36, -0.28],
    [-0.46, 0.36, 0.28],
    [0.46, 0.36, -0.28],
    [0.46, 0.36, 0.28],
  ],
  // 74HC595-style 16-pin DIP: pins 1-8 run down the left side (top to
  // bottom), pins 9-16 back up the right side, matching the leg layout.
  register: [
    [0.9, 0.3, -0.33],
    [0.64, 0.3, -0.33],
    [0.39, 0.3, -0.33],
    [0.13, 0.3, -0.33],
    [-0.13, 0.3, -0.33],
    [-0.39, 0.3, -0.33],
    [-0.64, 0.3, -0.33],
    [-0.9, 0.3, -0.33],
    [-0.9, 0.3, 0.33],
    [-0.64, 0.3, 0.33],
    [-0.39, 0.3, 0.33],
    [-0.13, 0.3, 0.33],
    [0.13, 0.3, 0.33],
    [0.39, 0.3, 0.33],
    [0.64, 0.3, 0.33],
    [0.9, 0.3, 0.33],
  ],
  sensor: [
    [-0.45, 0.4, 0.28],
    [-0.15, 0.4, 0.28],
    [0.15, 0.4, 0.28],
    [0.45, 0.4, 0.28],
  ],
  board: [
    [-1.0, 0.36, 0.78],
    [-0.4, 0.36, 0.78],
    [0.4, 0.36, 0.78],
    [1.0, 0.36, 0.78],
  ],
  breadboard: [
    [-0.5, 0.22, 0],
    [0.5, 0.22, 0],
  ],
}

export function getPinAnchors(shape: ShapeKind): [number, number, number][] {
  return PIN_ANCHORS[shape] ?? PIN_ANCHORS.breadboard
}

/** A short metal lead / leg. */
function Lead({
  position,
  height = 0.4,
  radius = 0.025,
}: {
  position: [number, number, number]
  height?: number
  radius?: number
}) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[radius, radius, height, 12]} />
      <meshStandardMaterial {...METAL_BRIGHT} />
    </mesh>
  )
}

/** Pulsing translucent epoxy dome for an active LED. */
function LedBulb({ color, active }: { color: string; active: boolean }) {
  const matRef = React.useRef<THREE.MeshPhysicalMaterial>(null)
  useFrame((state) => {
    if (!matRef.current) return
    const target = active ? 1.7 + Math.sin(state.clock.elapsedTime * 6) * 0.45 : 0.12
    matRef.current.emissiveIntensity +=
      (target - matRef.current.emissiveIntensity) * 0.2
  })
  return (
    <group>
      {/* rounded epoxy top */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.28, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          ref={matRef}
          color={color}
          emissive={color}
          emissiveIntensity={0.12}
          transmission={0.55}
          thickness={0.4}
          roughness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.04}
          ior={1.5}
          transparent
          opacity={0.92}
        />
      </mesh>
      {/* cylindrical body */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.3, 0.4, 32]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 0.4 : 0.1}
          transmission={0.4}
          thickness={0.3}
          roughness={0.12}
          clearcoat={1}
          clearcoatRoughness={0.08}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* flange rim */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.05, 32]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.1} />
      </mesh>
      {/* internal anvil/post hint */}
      <mesh position={[0, 0.24, 0]}>
        <boxGeometry args={[0.05, 0.28, 0.05]} />
        <meshStandardMaterial color="#3a3f47" metalness={0.6} roughness={0.4} />
      </mesh>
      {active && (
        <pointLight position={[0, 0.55, 0]} color={color} intensity={1.6} distance={3.2} decay={2} />
      )}
      <Lead position={[-0.1, -0.15, 0]} height={0.5} />
      <Lead position={[0.1, -0.05, 0]} height={0.3} />
    </group>
  )
}

/** Vibrating piezo buzzer with an active halo. */
function Buzzer({ color, active }: { color: string; active: boolean }) {
  const groupRef = React.useRef<THREE.Group>(null)
  const haloRef = React.useRef<THREE.Mesh>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.position.x = active ? Math.sin(t * 60) * 0.01 : 0
    }
    if (haloRef.current) {
      const m = haloRef.current.material as THREE.MeshBasicMaterial
      const s = active ? 1 + (Math.sin(t * 8) * 0.5 + 0.5) * 0.6 : 1
      haloRef.current.scale.set(s, s, s)
      m.opacity = active ? 0.25 * (1 - (s - 1) / 0.6) : 0
    }
  })
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.5, 40]} />
        <PlasticMaterial color={color} roughness={0.5} />
      </mesh>
      {/* top disc trim */}
      <mesh position={[0, 0.53, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.02, 40]} />
        <meshStandardMaterial color="#0b0f18" roughness={0.6} />
      </mesh>
      {/* sound hole */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.06, 24]} />
        <meshStandardMaterial color="#05070c" />
      </mesh>
      <mesh ref={haloRef} position={[0, 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.5, 40]} />
        <meshBasicMaterial color="#8ecbff" transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      <Lead position={[-0.12, 0.0, 0.2]} height={0.4} />
      <Lead position={[0.12, 0.0, 0.2]} height={0.4} />
    </group>
  )
}

/** Detailed Arduino-style microcontroller board. */
function ArduinoBoard({ color }: { color: string }) {
  return (
    <group>
      {/* PCB with rounded corners */}
      <RoundedBox
        args={[2.6, 0.12, 1.8]}
        radius={0.06}
        smoothness={4}
        position={[0, 0.12, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
      </RoundedBox>
      {/* silkscreen top layer hint */}
      <mesh position={[0, 0.181, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 1.7]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.25} transparent opacity={0.4} />
      </mesh>
      {/* USB port */}
      <mesh position={[-1.15, 0.24, -0.55]} castShadow>
        <boxGeometry args={[0.55, 0.28, 0.5]} />
        <meshStandardMaterial {...METAL_DARK} color="#cfd4dc" metalness={0.92} roughness={0.22} />
      </mesh>
      {/* Power jack */}
      <mesh position={[-1.2, 0.22, 0.4]} castShadow>
        <boxGeometry args={[0.45, 0.26, 0.45]} />
        <meshStandardMaterial color="#0b0f18" roughness={0.5} />
      </mesh>
      {/* ATmega chip */}
      <mesh position={[0.35, 0.22, 0.1]} castShadow>
        <boxGeometry args={[0.9, 0.14, 0.35]} />
        <meshStandardMaterial color="#12161f" roughness={0.5} metalness={0.2} />
      </mesh>
      {/* chip pin 1 dot */}
      <mesh position={[-0.02, 0.3, 0.02]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
        <meshStandardMaterial color="#3a3f47" />
      </mesh>
      {/* crystal */}
      <mesh position={[-0.4, 0.2, -0.35]} castShadow>
        <boxGeometry args={[0.28, 0.12, 0.16]} />
        <meshStandardMaterial {...METAL_DARK} />
      </mesh>
      {/* electrolytic cap */}
      <mesh position={[-0.75, 0.26, 0.45]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.3, 20]} />
        <meshStandardMaterial color="#20304a" metalness={0.4} roughness={0.3} />
      </mesh>
      {/* reset button */}
      <mesh position={[-1.0, 0.22, -0.1]} castShadow>
        <boxGeometry args={[0.14, 0.12, 0.14]} />
        <PlasticMaterial color="#c23b3b" />
      </mesh>
      {/* header strips */}
      {[0.78, -0.78].map((z) => (
        <mesh key={z} position={[0.1, 0.22, z]} castShadow>
          <boxGeometry args={[1.9, 0.14, 0.16]} />
          <meshStandardMaterial color="#0b0f18" roughness={0.55} />
        </mesh>
      ))}
      {/* gold pin contacts on headers */}
      {[0.78, -0.78].map((z) =>
        [-0.8, -0.5, -0.2, 0.1, 0.4, 0.7, 1.0].map((x) => (
          <mesh key={`${z}-${x}`} position={[x, 0.31, z]} castShadow>
            <boxGeometry args={[0.05, 0.08, 0.05]} />
            <meshStandardMaterial {...METAL_GOLD} />
          </mesh>
        )),
      )}
    </group>
  )
}

/**
 * Builds a recognizable 3D representation for each component type with
 * physically-based materials. Everything is drawn from local y=0 upward so
 * the group rests on the board.
 */
export function ComponentShape({
  shape,
  color,
  active = false,
  pressed = false,
}: {
  shape: ShapeKind
  color: string
  active?: boolean
  /** Push buttons: visually pushed down when pressed. */
  pressed?: boolean
}) {
  switch (shape) {
    case 'resistor':
      return (
        <group>
          <group rotation={[0, 0, Math.PI / 2]} position={[0, 0.22, 0]}>
            {/* dog-bone ceramic body */}
            <mesh castShadow>
              <cylinderGeometry args={[0.19, 0.19, 0.7, 28]} />
              <CeramicMaterial color={color} />
            </mesh>
            <mesh position={[0, 0.35, 0]} castShadow>
              <sphereGeometry args={[0.2, 24, 20]} />
              <CeramicMaterial color={color} />
            </mesh>
            <mesh position={[0, -0.35, 0]} castShadow>
              <sphereGeometry args={[0.2, 24, 20]} />
              <CeramicMaterial color={color} />
            </mesh>
            {/* color bands */}
            {[
              { y: -0.2, c: '#8b4513' },
              { y: -0.06, c: '#111111' },
              { y: 0.08, c: '#e5484d' },
              { y: 0.26, c: '#d4af37' },
            ].map((b) => (
              <mesh key={b.y} position={[0, b.y, 0]}>
                <cylinderGeometry args={[0.205, 0.205, 0.06, 28]} />
                <meshStandardMaterial color={b.c} roughness={0.45} />
              </mesh>
            ))}
          </group>
          {/* leads */}
          {[-0.62, 0.62].map((x) => (
            <mesh key={x} position={[x, 0.22, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.028, 0.028, 0.5, 12]} />
              <meshStandardMaterial {...METAL_BRIGHT} />
            </mesh>
          ))}
        </group>
      )
    case 'led':
      return <LedBulb color={color} active={active} />
    case 'capacitor':
      return (
        <group>
          {/* aluminium can */}
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.85, 32]} />
            <meshStandardMaterial color={color} roughness={0.22} metalness={0.65} />
          </mesh>
          {/* sleeve label */}
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.262, 0.262, 0.55, 32, 1, true]} />
            <meshStandardMaterial color="#1b2740" roughness={0.5} side={THREE.DoubleSide} />
          </mesh>
          {/* crimped top with vent cross */}
          <mesh position={[0, 0.87, 0]}>
            <cylinderGeometry args={[0.24, 0.26, 0.04, 32]} />
            <meshStandardMaterial color="#aeb6c2" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.89, 0]}>
            <boxGeometry args={[0.4, 0.015, 0.05]} />
            <meshStandardMaterial color="#0b1220" />
          </mesh>
          <mesh position={[0, 0.89, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.4, 0.015, 0.05]} />
            <meshStandardMaterial color="#0b1220" />
          </mesh>
          {/* negative stripe */}
          <mesh position={[0.2, 0.42, 0]}>
            <cylinderGeometry args={[0.263, 0.263, 0.5, 32, 1, true, -0.4, 0.8]} />
            <meshStandardMaterial color="#e5e7eb" roughness={0.4} side={THREE.DoubleSide} />
          </mesh>
          <Lead position={[-0.11, 0.0, 0]} height={0.4} />
          <Lead position={[0.11, 0.1, 0]} height={0.3} />
        </group>
      )
    case 'diode':
      return (
        <group>
          <group rotation={[0, 0, Math.PI / 2]} position={[0, 0.22, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.17, 0.17, 0.6, 28]} />
              <meshPhysicalMaterial color={color} roughness={0.3} metalness={0.1} clearcoat={0.8} clearcoatRoughness={0.2} />
            </mesh>
            {/* cathode band */}
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.175, 0.175, 0.1, 28]} />
              <meshStandardMaterial color="#e5e7eb" roughness={0.4} />
            </mesh>
          </group>
          {[-0.6, 0.6].map((x) => (
            <mesh key={x} position={[x, 0.22, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.028, 0.028, 0.5, 12]} />
              <meshStandardMaterial {...METAL_BRIGHT} />
            </mesh>
          ))}
        </group>
      )
    case 'transistor':
      return (
        <group>
          {/* TO-92 half-cylinder plastic body */}
          <mesh position={[0, 0.32, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.55, 32, 1, false, 0, Math.PI]} />
            <PlasticMaterial color={color} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.32, -0.001]} castShadow>
            <boxGeometry args={[0.6, 0.55, 0.05]} />
            <PlasticMaterial color={color} roughness={0.5} />
          </mesh>
          {/* bevel top */}
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.02, 32, 1, false, 0, Math.PI]} />
            <PlasticMaterial color={color} roughness={0.5} />
          </mesh>
          {[-0.16, 0, 0.16].map((x) => (
            <Lead key={x} position={[x, 0.02, 0.1]} height={0.45} radius={0.02} />
          ))}
        </group>
      )
    case 'button':
      return (
        <group>
          {/* rounded tactile body */}
          <RoundedBox args={[0.62, 0.24, 0.62]} radius={0.04} smoothness={4} position={[0, 0.12, 0]} castShadow>
            <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.1} />
          </RoundedBox>
          {/* metal cap plate */}
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[0.5, 0.03, 0.5]} />
            <meshStandardMaterial {...METAL_DARK} color="#c7ccd4" metalness={0.9} roughness={0.28} />
          </mesh>
          {/* plunger (drops when pressed) */}
          <mesh position={[0, pressed ? 0.27 : 0.34, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.16, 0.14, 28]} />
            <PlasticMaterial color={pressed ? '#e0483e' : color} roughness={0.35} />
          </mesh>
          {[
            [-0.3, 0.32],
            [0.3, 0.32],
            [-0.3, -0.32],
            [0.3, -0.32],
          ].map(([x, z]) => (
            <Lead key={`${x}-${z}`} position={[x, 0.02, z]} height={0.3} radius={0.02} />
          ))}
        </group>
      )
    case 'potentiometer':
      return (
        <group>
          {/* rounded body */}
          <RoundedBox args={[0.58, 0.44, 0.58]} radius={0.05} smoothness={4} position={[0, 0.22, 0]} castShadow>
            <meshStandardMaterial color="#1f4b8f" roughness={0.45} metalness={0.25} />
          </RoundedBox>
          {/* metal cap */}
          <mesh position={[0, 0.48, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.22, 0.1, 32]} />
            <meshStandardMaterial {...METAL_DARK} color="#b8bec8" metalness={0.9} roughness={0.3} />
          </mesh>
          {/* metal shaft */}
          <mesh position={[0, 0.66, 0]} castShadow>
            <cylinderGeometry args={[0.085, 0.085, 0.42, 24]} />
            <meshStandardMaterial {...METAL_DARK} color="#aeb4be" metalness={0.9} roughness={0.28} />
          </mesh>
          {/* knurled tip / slot */}
          <mesh position={[0, 0.87, 0]}>
            <boxGeometry args={[0.14, 0.02, 0.03]} />
            <meshStandardMaterial color="#4a4f57" metalness={0.6} roughness={0.4} />
          </mesh>
          {[-0.2, 0, 0.2].map((x) => (
            <Lead key={x} position={[x, 0.02, 0.3]} height={0.35} radius={0.02} />
          ))}
        </group>
      )
    case 'battery':
      return (
        <group>
          {/* rounded pack */}
          <RoundedBox args={[1.0, 0.75, 0.6]} radius={0.06} smoothness={4} position={[0, 0.4, 0]} castShadow>
            <PlasticMaterial color={color} roughness={0.4} />
          </RoundedBox>
          {/* label band */}
          <mesh position={[0, 0.4, 0.305]}>
            <boxGeometry args={[0.85, 0.4, 0.02]} />
            <meshStandardMaterial color="#0b1220" roughness={0.55} />
          </mesh>
          {/* + / - terminals */}
          <mesh position={[-0.32, 0.82, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.12, 16]} />
            <meshStandardMaterial {...METAL_DARK} color="#d94b4b" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0.32, 0.82, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.12, 16]} />
            <meshStandardMaterial {...METAL_DARK} color="#2b2f36" metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      )
    case 'buzzer':
      return <Buzzer color={color} active={active} />
    case 'ic':
      return (
        <group>
          {/* rounded DIP body */}
          <RoundedBox args={[0.95, 0.3, 0.62]} radius={0.03} smoothness={4} position={[0, 0.16, 0]} castShadow>
            <meshStandardMaterial color={color} roughness={0.45} metalness={0.15} />
          </RoundedBox>
          {/* orientation notch */}
          <mesh position={[-0.42, 0.32, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.04, 20]} />
            <meshStandardMaterial color="#0b1220" />
          </mesh>
          {/* pin-1 dot */}
          <mesh position={[-0.36, 0.315, 0.2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
            <meshStandardMaterial color="#2a2f37" />
          </mesh>
          {/* gull-wing legs both sides */}
          {[-0.35, -0.15, 0.05, 0.25].map((x) =>
            [-0.34, 0.34].map((z) => (
              <mesh key={`${x}-${z}`} position={[x, 0.02, z]} castShadow>
                <boxGeometry args={[0.06, 0.16, 0.09]} />
                <meshStandardMaterial {...METAL_BRIGHT} />
              </mesh>
            )),
          )}
        </group>
      )
    case 'register':
      return (
        <group>
          {/* 16-pin DIP body */}
          <RoundedBox
            args={[2.05, 0.3, 0.62]}
            radius={0.035}
            smoothness={4}
            position={[0, 0.15, 0]}
            castShadow
          >
            <meshStandardMaterial color={color} roughness={0.42} metalness={0.15} />
          </RoundedBox>
          {/* orientation notch (pin 1 end) */}
          <mesh position={[-0.96, 0.31, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 20]} />
            <meshStandardMaterial color="#0b1220" />
          </mesh>
          {/* pin-1 dot */}
          <mesh position={[-0.9, 0.305, -0.25]}>
            <cylinderGeometry args={[0.025, 0.025, 0.02, 12]} />
            <meshStandardMaterial color="#2a2f37" />
          </mesh>
          {/* silkscreen band on the right end */}
          <mesh position={[0.92, 0.305, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
            <meshStandardMaterial color="#3a4150" />
          </mesh>
          {/* gull-wing legs, 8 per side */}
          {LEG_X.map((x) => (
            <mesh key={`la${x}`} position={[x, 0.02, -0.33]} castShadow>
              <boxGeometry args={[0.05, 0.16, 0.09]} />
              <meshStandardMaterial {...METAL_BRIGHT} />
            </mesh>
          ))}
          {LEG_X.map((x) => (
            <mesh key={`lb${x}`} position={[x, 0.02, 0.33]} castShadow>
              <boxGeometry args={[0.05, 0.16, 0.09]} />
              <meshStandardMaterial {...METAL_BRIGHT} />
            </mesh>
          ))}
        </group>
      )
    case 'sensor':
      return (
        <group>
          {/* rounded PCB */}
          <RoundedBox args={[1.25, 0.3, 0.55]} radius={0.04} smoothness={4} position={[0, 0.22, 0]} castShadow>
            <meshStandardMaterial color={color} roughness={0.45} metalness={0.2} />
          </RoundedBox>
          {/* two ultrasonic transducers */}
          {[-0.32, 0.32].map((x) => (
            <group key={x} position={[x, 0.42, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.24, 0.24, 0.24, 36]} />
                <meshStandardMaterial {...METAL_DARK} color="#c2c7cf" metalness={0.92} roughness={0.3} />
              </mesh>
              {/* mesh grille face */}
              <mesh position={[0, 0.12, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 0.02, 36]} />
                <meshStandardMaterial color="#33373f" roughness={0.8} metalness={0.3} />
              </mesh>
              <mesh position={[0, 0.135, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.01, 24]} />
                <meshStandardMaterial color="#1a1d23" />
              </mesh>
            </group>
          ))}
          {/* crystal between transducers */}
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[0.24, 0.16, 0.12]} />
            <meshStandardMaterial {...METAL_DARK} />
          </mesh>
          {/* gold header pins */}
          {[-0.45, -0.15, 0.15, 0.45].map((x) => (
            <mesh key={x} position={[x, 0.02, 0.28]} castShadow>
              <cylinderGeometry args={[0.022, 0.022, 0.35, 12]} />
              <meshStandardMaterial {...METAL_GOLD} />
            </mesh>
          ))}
        </group>
      )
    case 'board':
      return <ArduinoBoard color={color} />
    case 'breadboard':
    default:
      return (
        <RoundedBox args={[1.4, 0.24, 1]} radius={0.04} smoothness={4} position={[0, 0.12, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
        </RoundedBox>
      )
  }
}
