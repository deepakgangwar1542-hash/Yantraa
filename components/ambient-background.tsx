'use client'

import * as React from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'
import { useThemeMode } from '@/app/providers'

/**
 * A lightweight, decorative animated "circuit constellation" rendered behind
 * the 2D content. Pointer events are disabled so it never blocks the UI.
 */

const NODE_COUNT = 46

type NodeData = {
  base: THREE.Vector3
  speed: number
  phase: number
  scale: number
}

function makeNodes(): NodeData[] {
  const nodes: NodeData[] = []
  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      base: new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
      ),
      speed: 0.15 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      scale: 0.04 + Math.random() * 0.09,
    })
  }
  return nodes
}

function Constellation({ accent }: { accent: string }) {
  const nodes = React.useMemo(makeNodes, [])
  const instRef = React.useRef<THREE.InstancedMesh>(null)
  const groupRef = React.useRef<THREE.Group>(null)
  const dummy = React.useMemo(() => new THREE.Object3D(), [])
  const positions = React.useMemo(
    () => nodes.map((n) => n.base.clone()),
    [nodes],
  )

  // Precompute which nodes are close enough to draw a connecting line.
  const linePairs = React.useMemo(() => {
    const pairs: [number, number][] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].base.distanceTo(nodes[j].base) < 3.2) {
          pairs.push([i, j])
        }
      }
    }
    return pairs.slice(0, 60)
  }, [nodes])

  const lineRef = React.useRef<THREE.LineSegments>(null)
  const lineGeom = React.useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(linePairs.length * 6), 3),
    )
    return geom
  }, [linePairs])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // Animate node positions (gentle drift)
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const p = positions[i]
      p.set(
        n.base.x + Math.sin(t * n.speed + n.phase) * 0.5,
        n.base.y + Math.cos(t * n.speed * 0.8 + n.phase) * 0.5,
        n.base.z + Math.sin(t * n.speed * 0.6 + n.phase) * 0.3,
      )
      dummy.position.copy(p)
      const pulse = 1 + Math.sin(t * 2 + n.phase) * 0.25
      dummy.scale.setScalar(n.scale * pulse)
      dummy.updateMatrix()
      instRef.current?.setMatrixAt(i, dummy.matrix)
    }
    if (instRef.current) instRef.current.instanceMatrix.needsUpdate = true

    // Update connecting lines
    if (lineRef.current) {
      const arr = lineGeom.getAttribute('position') as THREE.BufferAttribute
      for (let k = 0; k < linePairs.length; k++) {
        const [a, b] = linePairs[k]
        const pa = positions[a]
        const pb = positions[b]
        arr.setXYZ(k * 2, pa.x, pa.y, pa.z)
        arr.setXYZ(k * 2 + 1, pb.x, pb.y, pb.z)
      }
      arr.needsUpdate = true
    }

    // Slow parallax rotation of the whole field
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.05) * 0.2
      groupRef.current.rotation.x = Math.cos(t * 0.04) * 0.1
    }
  })

  return (
    <group ref={groupRef}>
      <instancedMesh ref={instRef} args={[undefined, undefined, NODE_COUNT]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={0.9} />
      </instancedMesh>

      <lineSegments ref={lineRef} geometry={lineGeom}>
        <lineBasicMaterial color={accent} transparent opacity={0.16} toneMapped={false} />
      </lineSegments>
    </group>
  )
}

function FloatingChips({ accent }: { accent: string }) {
  return (
    <>
      {[
        [-5.5, 2.2, -2],
        [5, -1.8, -1.5],
        [3.5, 3, -3],
        [-4, -2.6, -2.5],
      ].map((pos, i) => (
        <Float
          key={i}
          speed={1.4 + i * 0.3}
          rotationIntensity={0.8}
          floatIntensity={1.2}
          position={pos as [number, number, number]}
        >
          <mesh>
            <icosahedronGeometry args={[0.55, 0]} />
            <meshBasicMaterial
              color={accent}
              wireframe
              transparent
              opacity={0.22}
              toneMapped={false}
            />
          </mesh>
        </Float>
      ))}
    </>
  )
}

function Rig() {
  const { camera, pointer } = useThree()
  useFrame(() => {
    // Subtle mouse parallax
    camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.03
    camera.position.y += (pointer.y * 0.4 - camera.position.y) * 0.03
    camera.lookAt(0, 0, 0)
  })
  return null
}

export function AmbientBackground() {
  const { mode } = useThemeMode()
  const accent = mode === 'dark' ? '#4fd1c5' : '#0e7490'

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
        <Rig />
        <Constellation accent={accent} />
        <FloatingChips accent={accent} />
      </Canvas>
    </div>
  )
}
