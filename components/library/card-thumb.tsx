'use client'

import * as React from 'react'
import { Canvas } from '@react-three/fiber'
import { ComponentScene } from './component-viewer'
import type { ShapeKind } from '@/lib/electronics-data'

/**
 * A tiny Three.js canvas for component library card thumbnails.
 *
 * Designed for small size (~72–80 px square). Uses `powerPreference: 'low-power'`
 * and skips heavy features (Environment maps, contact shadows) to keep GPU cost
 * minimal when many cards are on screen simultaneously.
 *
 * @param hovered  When true, auto-rotation speeds up for a tactile "alive" feel.
 */
export function CardThumb3D({
  shape,
  color,
  hovered = false,
}: {
  shape: ShapeKind
  color: string
  hovered?: boolean
}) {
  return (
    <Canvas
      camera={{ position: [1.65, 1.25, 2.15], fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'low-power' }}
      style={{ width: '100%', height: '100%' }}
    >
      <ComponentScene
        shape={shape}
        color={color}
        size="thumb"
        autoRotateSpeed={hovered ? 4.0 : 1.2}
      />
    </Canvas>
  )
}
