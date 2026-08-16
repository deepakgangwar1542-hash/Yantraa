'use client'

import * as React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Environment, Lightformer, Html } from '@react-three/drei'
import { ComponentShape, getPinAnchors } from '@/components/lab/component-mesh'
import type { ElectronicsComponent, ShapeKind } from '@/lib/electronics-data'

/* ------------------------------------------------------------------ */
/* Scale tables                                                         */
/* ------------------------------------------------------------------ */

/** Scale in the large full-screen modal viewer. */
const VIEW_SCALE: Record<ShapeKind, number> = {
  resistor: 1.2,
  led: 1.5,
  capacitor: 1.35,
  diode: 1.25,
  transistor: 1.55,
  button: 1.4,
  potentiometer: 1.25,
  battery: 1.0,
  buzzer: 1.35,
  ic: 1.15,
  register: 0.85,
  sensor: 1.0,
  board: 0.75,
  esp32: 0.85,
  breadboard: 1.0,
}

/** Scale in the tiny card thumbnail canvas. */
const THUMB_SCALE: Record<ShapeKind, number> = {
  resistor: 1.25,
  led: 1.45,
  capacitor: 1.35,
  diode: 1.3,
  transistor: 1.5,
  button: 1.3,
  potentiometer: 1.2,
  battery: 0.95,
  buzzer: 1.25,
  ic: 1.1,
  register: 0.78,
  sensor: 0.95,
  board: 0.65,
  esp32: 0.72,
  breadboard: 0.9,
}

export type ViewerSize = 'thumb' | 'modal'

/* ------------------------------------------------------------------ */
/* 3D pin / wiring markers                                              */
/* ------------------------------------------------------------------ */

type PinInfo = ElectronicsComponent['pins'][number]

function pinColor(polarity: PinInfo['polarity']): string {
  if (polarity === 'positive') return '#3fb950'
  if (polarity === 'negative') return '#f85149'
  return '#f5b301'
}

/**
 * Floating labelled markers pinned to each wire-attachment anchor of the mesh.
 * Rendered inside the scaled mesh group so markers track the component exactly
 * as it orbits. Shows the real connection points a wire would clip onto, so the
 * library preview mirrors what wiring in the 3D lab looks like.
 */
function PinMarkers({ shape, pins }: { shape: ShapeKind; pins: PinInfo[] }) {
  const anchors = getPinAnchors(shape)
  return (
    <group>
      {pins.map((p, i) => {
        const a = anchors[i]
        if (!a) return null
        const col = pinColor(p.polarity)
        const sign = p.polarity === 'positive' ? '+' : p.polarity === 'negative' ? '\u2212' : ''
        return (
          <group key={p.name} position={a}>
            {/* connection node */}
            <mesh>
              <sphereGeometry args={[0.055, 16, 16]} />
              <meshBasicMaterial color={col} toneMapped={false} />
            </mesh>
            {/* soft halo so the point reads clearly against the body */}
            <mesh>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshBasicMaterial color={col} transparent opacity={0.22} toneMapped={false} depthWrite={false} />
            </mesh>
            {/* label */}
            <Html center distanceFactor={7} position={[0, 0.28, 0]} zIndexRange={[20, 0]} pointerEvents="none">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: 'rgba(11,18,32,0.86)',
                  border: `1px solid ${col}`,
                  color: '#eef3fb',
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
                  userSelect: 'none',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
                }}
              >
                {sign && <span style={{ color: col, fontSize: 13 }}>{sign}</span>}
                {p.name}
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Shared scene                                                         */
/* ------------------------------------------------------------------ */

/**
 * Reusable Three.js scene — lights, mesh, and orbit controls.
 * Used by both the full-screen `ComponentModal` and the card `CardThumb3D`.
 *
 * @param resetSignal  Increment this value externally to reset OrbitControls
 *                     back to its initial position (remounts the controls).
 */
export function ComponentScene({
  shape,
  color,
  size = 'modal',
  autoRotateSpeed = 1.4,
  resetSignal = 0,
  pins,
  showPins = false,
}: {
  shape: ShapeKind
  color: string
  size?: ViewerSize
  autoRotateSpeed?: number
  resetSignal?: number
  pins?: PinInfo[]
  showPins?: boolean
}) {
  const isThumb = size === 'thumb'
  const scale = isThumb ? (THUMB_SCALE[shape] ?? 1) : (VIEW_SCALE[shape] ?? 1)

  return (
    <>
      <color attach="background" args={[isThumb ? '#2b3a52' : '#0e1626']} />
      {!isThumb && <fog attach="fog" args={['#0e1626', 14, 26]} />}

      {/* Lighting */}
      <hemisphereLight args={['#dfe8ff', '#1a1712', isThumb ? 0.75 : 0.55]} />
      <directionalLight position={[4, 7, 3]} intensity={isThumb ? 1.35 : 1.2} color="#fff4e0" />
      <directionalLight position={[-5, 4, -4]} intensity={isThumb ? 0.65 : 0.4} color="#6f9bff" />
      {!isThumb && <pointLight position={[0, 4, 1]} intensity={0.4} color="#fff4e0" />}

      {/* Procedural studio env for PBR reflections — skipped for thumbnails */}
      {!isThumb && (
        <Environment resolution={128} frames={1}>
          <color attach="background" args={['#0a0f1a']} />
          <Lightformer
            intensity={1.4}
            position={[0, 5, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[8, 8, 1]}
            color="#fff4e0"
          />
          <Lightformer intensity={0.7} position={[-4, 2, 3]} scale={[3, 6, 1]} color="#6f9bff" />
          <Lightformer intensity={0.6} position={[4, 2, -3]} scale={[3, 6, 1]} color="#8ecbff" />
        </Environment>
      )}

      {/* Component mesh */}
      <group scale={scale}>
        <ComponentShape shape={shape} color={color} />
        {showPins && pins && pins.length > 0 && <PinMarkers shape={shape} pins={pins} />}
      </group>

      {/* Contact shadow — only for the full modal */}
      {!isThumb && (
        <ContactShadows
          position={[0, 0.02, 0]}
          opacity={0.5}
          scale={4}
          blur={2.4}
          far={3}
          color="#000000"
        />
      )}

      {/*
        OrbitControls — key on resetSignal so incrementing it forces a full
        remount, resetting camera to the initial position without destroying
        the WebGL context.
      */}
      <OrbitControls
        key={`oc-${resetSignal}`}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={autoRotateSpeed}
        minDistance={isThumb ? 1.4 : 1.6}
        maxDistance={isThumb ? 4 : 7}
        maxPolarAngle={Math.PI / 1.8}
        target={[0, 0.4, 0]}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Standalone viewer (back-compat)                                      */
/* ------------------------------------------------------------------ */

/**
 * A self-contained 16:9 3D preview widget used in existing detail panels.
 * Kept for back-compat — new code should use `ComponentModal` instead.
 */
export function ComponentViewer({ component: c }: { component: ElectronicsComponent }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#0e1626',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Canvas
        camera={{ position: [2.8, 2.2, 3.6], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, toneMappingExposure: 1.05 }}
      >
        <ComponentScene shape={c.shape} color={c.color} size="modal" />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '3px 10px',
          borderRadius: 999,
          background: 'rgba(11,18,32,0.72)',
          color: '#c7d3ea',
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        Drag to rotate &middot; Scroll to zoom
      </div>
    </div>
  )
}

export default ComponentViewer
