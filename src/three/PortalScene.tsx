import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Environment, Stars, MeshDistortMaterial } from '@react-three/drei'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * Hero hall portal — a slow-rotating distorted sphere with a torus gate,
 * stars background, and parallax mouse follow. Performant by default.
 */
export default function PortalScene() {
  const isMobile =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(max-width: 640px)').matches
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 7.4], fov: isMobile ? 56 : 42 }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[4, 6, 5]} intensity={1.1} />
        <pointLight position={[-5, -3, -4]} intensity={1.8} color="#c9a25a" />

        <Environment preset="night" />
        <Stars radius={50} depth={50} count={1600} factor={4} fade speed={0.4} />

        <Float speed={1} rotationIntensity={0.4} floatIntensity={0.6}>
          <PortalRing />
        </Float>

        <Float speed={0.6} rotationIntensity={0.2} floatIntensity={0.3}>
          <DistortedCore />
        </Float>

        <ParallaxCamera />
      </Suspense>
    </Canvas>
  )
}

function PortalRing() {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * 0.2
  })
  return (
    <mesh ref={ref}>
      <torusGeometry args={[2.6, 0.06, 16, 192]} />
      <meshStandardMaterial color="#c9a25a" emissive="#c9a25a" emissiveIntensity={0.5} metalness={1} roughness={0.2} />
    </mesh>
  )
}

function DistortedCore() {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.1
      ref.current.rotation.x += dt * 0.05
    }
  })
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1.7, 24]} />
      <MeshDistortMaterial
        color="#4a1f1f"
        distort={0.32}
        speed={1.4}
        metalness={0.6}
        roughness={0.25}
        emissive="#a44b2a"
        emissiveIntensity={0.15}
      />
    </mesh>
  )
}

function ParallaxCamera() {
  const target = useMemo(() => new THREE.Vector3(0, 0, 7.4), [])
  useFrame((state) => {
    target.set(state.pointer.x * 0.8, state.pointer.y * 0.5, 7.4)
    state.camera.position.lerp(target, 0.04)
    state.camera.lookAt(0, 0, 0)
  })
  return null
}
