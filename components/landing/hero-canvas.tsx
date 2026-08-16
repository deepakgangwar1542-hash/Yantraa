'use client'

import * as React from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'

/**
 * The landing-page hero showpiece: a glowing red "circuit constellation" of
 * nodes, connecting traces, and wireframe chips, with mouse-parallax and a
 * gentle camera orbit. This is its own WebGL context and MUST fully unmount
 * before the product app (and its ambient/lab canvas) mounts — the caller
 * guarantees that by only rendering the landing route.
 */

const NODE_COUNT = 70
const RED = '#E0112C'
const RED_BRIGHT = '#FF3B54'

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
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
      ),
      speed: 0.12 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      scale: 0.035 + Math.random() * 0.085,
    })
  }
  return nodes
}

function Constellation() {
  const nodes = React.useMemo(makeNodes, [])
  const instRef = React.useRef<THREE.InstancedMesh>(null)
  const dummy = React.useMemo(() => new THREE.Object3D(), [])
  const positions = React.useMemo(() => nodes.map((n) => n.base.clone()), [nodes])

  const linePairs = React.useMemo(() => {
    const pairs: [number, number][] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].base.distanceTo(nodes[j].base) < 3.6) pairs.push([i, j])
      }
    }
    return pairs.slice(0, 90)
  }, [nodes])

  const lineRef = React.useRef<THREE.LineSegments>(null)
  const lineGeom = React.useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePairs.length * 6), 3))
    return geom
  }, [linePairs])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const p = positions[i]
      p.set(
        n.base.x + Math.sin(t * n.speed + n.phase) * 0.6,
        n.base.y + Math.cos(t * n.speed * 0.8 + n.phase) * 0.6,
        n.base.z + Math.sin(t * n.speed * 0.6 + n.phase) * 0.4,
      )
      dummy.position.copy(p)
      const pulse = 1 + Math.sin(t * 2 + n.phase) * 0.3
      dummy.scale.setScalar(n.scale * pulse)
      dummy.updateMatrix()
      instRef.current?.setMatrixAt(i, dummy.matrix)
    }
    if (instRef.current) instRef.current.instanceMatrix.needsUpdate = true

    if (lineRef.current) {
      const arr = lineGeom.getAttribute('position') as THREE.BufferAttribute
      for (let k = 0; k < linePairs.length; k++) {
        const [a, b] = linePairs[k]
        arr.setXYZ(k * 2, positions[a].x, positions[a].y, positions[a].z)
        arr.setXYZ(k * 2 + 1, positions[b].x, positions[b].y, positions[b].z)
      }
      arr.needsUpdate = true
    }
  })

  return (
    <group>
      <instancedMesh ref={instRef} args={[undefined, undefined, NODE_COUNT]}>
        <sphereGeometry args={[1, 14, 14]} />
        <meshBasicMaterial color={RED_BRIGHT} toneMapped={false} transparent opacity={0.95} />
      </instancedMesh>
      <lineSegments ref={lineRef} geometry={lineGeom}>
        <lineBasicMaterial color={RED} transparent opacity={0.22} toneMapped={false} />
      </lineSegments>
    </group>
  )
}

function Chips() {
  const positions: [number, number, number][] = [
    [-6.5, 2.6, -2],
    [6, -2.2, -1.5],
    [4.2, 3.2, -3],
    [-4.8, -3, -2.5],
    [0.5, 3.6, -4],
    [-1.5, -3.4, -3.5],
  ]
  return (
    <>
      {positions.map((pos, i) => (
        <Float key={i} speed={1.2 + i * 0.25} rotationIntensity={0.9} floatIntensity={1.3} position={pos}>
          <mesh>
            {i % 2 === 0 ? (
              <icosahedronGeometry args={[0.6, 0]} />
            ) : (
              <boxGeometry args={[0.8, 0.8, 0.8]} />
            )}
            <meshBasicMaterial color={RED} wireframe transparent opacity={0.28} toneMapped={false} />
          </mesh>
        </Float>
      ))}
    </>
  )
}

function Rig() {
  const { camera, pointer } = useThree()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    // gentle orbit + mouse parallax
    const orbitX = Math.sin(t * 0.06) * 1.2
    const orbitY = Math.cos(t * 0.05) * 0.7
    camera.position.x += (pointer.x * 1.4 + orbitX - camera.position.x) * 0.03
    camera.position.y += (pointer.y * 1.0 + orbitY - camera.position.y) * 0.03
    camera.lookAt(0, 0, 0)
  })
  return null
}

export default function HeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 11], fov: 55 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
    >
      <fog attach="fog" args={['#0B0B0D', 12, 26]} />
      <Rig />
      <Constellation />
      <Chips />
    </Canvas>
  )
}
