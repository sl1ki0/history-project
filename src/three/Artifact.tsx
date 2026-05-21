import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Environment, ContactShadows, useDetectGPU } from '@react-three/drei'
import * as THREE from 'three'
import type { ArtifactKind } from '../content/types'

interface Props {
  kind: ArtifactKind
  accentColor: string
  /** Whether motion is allowed (respects reduced-motion) */
  animated?: boolean
}

/**
 * One small declarative 3D scene per excursion stop.
 * Cheap — single mesh, soft envmap, contact shadow.
 */
export default function ArtifactCanvas({ kind, accentColor, animated = true }: Props) {
  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0.5, 4.2], fov: 38 }}
        frameloop={animated ? 'always' : 'demand'}
      >
        <Suspense fallback={null}>
          <Scene kind={kind} accentColor={accentColor} animated={animated} />
        </Suspense>
      </Canvas>
    </div>
  )
}

function Scene({ kind, accentColor, animated }: Props) {
  const gpu = useDetectGPU()
  const isLow = gpu?.tier !== undefined && gpu.tier <= 1
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.05} castShadow={!isLow} />
      <directionalLight position={[-4, -2, -3]} intensity={0.18} color={accentColor} />
      <Environment preset="warehouse" />

      <Float
        speed={animated ? 1.1 : 0}
        rotationIntensity={animated ? 0.55 : 0}
        floatIntensity={animated ? 0.75 : 0}
      >
        <Artifact kind={kind} accentColor={accentColor} animated={animated} />
      </Float>

      {!isLow && (
        <ContactShadows
          position={[0, -1.35, 0]}
          opacity={0.45}
          scale={6}
          blur={2.6}
          far={3}
          color="#000"
        />
      )}

      <SpinCamera />
    </>
  )
}

function SpinCamera() {
  const { camera } = useThree()
  const mouse = useRef({ x: 0, y: 0 })
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame((state) => {
    mouse.current.x = state.pointer.x
    mouse.current.y = state.pointer.y
    tmp.set(mouse.current.x * 0.6, 0.5 + mouse.current.y * 0.4, 4.2)
    camera.position.lerp(tmp, 0.04)
    camera.lookAt(0, 0, 0)
  })
  return null
}

function Artifact({ kind, accentColor, animated }: Props) {
  const groupRef = useRef<THREE.Group>(null!)
  useFrame((_, delta) => {
    if (!groupRef.current) return
    if (animated) groupRef.current.rotation.y += delta * 0.25
  })

  const mat = useMemo(
    () => (
      <meshPhysicalMaterial
        color={accentColor}
        metalness={0.7}
        roughness={0.18}
        clearcoat={0.7}
        clearcoatRoughness={0.25}
        reflectivity={0.5}
        emissive={accentColor}
        emissiveIntensity={0.05}
      />
    ),
    [accentColor],
  )

  const goldRim = useMemo(
    () => (
      <meshStandardMaterial color="#c9a25a" metalness={1} roughness={0.2} />
    ),
    [],
  )

  return (
    <group ref={groupRef}>
      {kind === 'document' && (
        <>
          {/* a sheet of parchment with a wax seal */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.7, 2.4, 0.04]} />
            <meshStandardMaterial color="#efe5d2" roughness={0.85} metalness={0.05} />
          </mesh>
          <mesh position={[0, -0.7, 0.05]}>
            <cylinderGeometry args={[0.22, 0.22, 0.08, 32]} />
            {goldRim}
          </mesh>
          {/* writing lines */}
          {[0.7, 0.5, 0.3, 0.1, -0.1, -0.3].map((y, i) => (
            <mesh key={i} position={[0, y, 0.025]}>
              <boxGeometry args={[1.2, 0.025, 0.001]} />
              <meshStandardMaterial color="#574f3e" />
            </mesh>
          ))}
        </>
      )}

      {kind === 'flag' && (
        <>
          <mesh position={[-0.85, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 2.4, 16]} />
            {goldRim}
          </mesh>
          {/* white */}
          <mesh position={[0, 0.7, 0]} castShadow>
            <boxGeometry args={[1.6, 0.4, 0.05]} />
            <meshStandardMaterial color="#f3eddf" roughness={0.55} />
          </mesh>
          {/* blue */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[1.6, 0.4, 0.05]} />
            <meshStandardMaterial color="#1c4587" roughness={0.5} />
          </mesh>
          {/* red */}
          <mesh position={[0, -0.1, 0]} castShadow>
            <boxGeometry args={[1.6, 0.4, 0.05]} />
            <meshStandardMaterial color="#9b1d20" roughness={0.5} />
          </mesh>
        </>
      )}

      {kind === 'crystal' && (
        <mesh castShadow>
          <icosahedronGeometry args={[1.05, 0]} />
          {mat}
        </mesh>
      )}

      {kind === 'medal' && <SochiMedal />}

      {kind === 'globe' && (
        <>
          <mesh castShadow>
            <sphereGeometry args={[1.1, 64, 64]} />
            <meshPhysicalMaterial
              color="#1c2541"
              metalness={0.2}
              roughness={0.35}
              clearcoat={1}
              clearcoatRoughness={0.05}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.18, 0.012, 12, 96]} />
            {goldRim}
          </mesh>
          <mesh>
            <torusGeometry args={[1.18, 0.012, 12, 96]} />
            {goldRim}
          </mesh>
        </>
      )}

      {kind === 'crown' && (
        <group>
          <mesh castShadow position={[0, -0.1, 0]}>
            <cylinderGeometry args={[0.9, 1.0, 0.5, 24]} />
            {goldRim}
          </mesh>
          {[...Array(8)].map((_, i) => {
            const a = (i / 8) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(a), 0.35, Math.sin(a)]} castShadow>
                <coneGeometry args={[0.12, 0.5, 6]} />
                {goldRim}
              </mesh>
            )
          })}
          <mesh position={[0, 0.62, 0]}>
            <sphereGeometry args={[0.18, 24, 24]} />
            <meshStandardMaterial color="#9b1d20" />
          </mesh>
        </group>
      )}

      {kind === 'monolith' && (
        <mesh castShadow>
          <boxGeometry args={[1, 2.4, 0.55]} />
          <meshPhysicalMaterial
            color={accentColor}
            metalness={0.9}
            roughness={0.12}
            clearcoat={1}
            clearcoatRoughness={0.06}
          />
        </mesh>
      )}
    </group>
  )
}

/**
 * Sochi-2014 inspired Olympic medal: a thick gold disc with a recessed center
 * filled with a multicolor patchwork ("лоскутное одеяло"), a thick suspension ring,
 * and a tricolor ribbon.
 */
function SochiMedal() {
  const ref = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.35
  })

  // Patchwork wedges colors — symbolic of Russian ethnic-pattern "blanket"
  const patchColors = useMemo(
    () => [
      '#c9a25a', '#a44b2a', '#1c4587', '#9b1d20',
      '#4a1f1f', '#e3d3b1', '#574f3e', '#c9a25a',
      '#a44b2a', '#1c4587', '#9b1d20', '#e3d3b1',
    ],
    [],
  )

  return (
    <group ref={ref} rotation={[0, 0, 0]}>
      {/* Ribbon — three vertical stripes mimicking tricolor */}
      <group position={[0, 1.2, -0.02]}>
        <mesh position={[-0.18, 0, 0]} castShadow>
          <boxGeometry args={[0.16, 0.95, 0.03]} />
          <meshStandardMaterial color="#f3eddf" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.16, 0.95, 0.03]} />
          <meshStandardMaterial color="#1c4587" roughness={0.7} />
        </mesh>
        <mesh position={[0.18, 0, 0]} castShadow>
          <boxGeometry args={[0.16, 0.95, 0.03]} />
          <meshStandardMaterial color="#9b1d20" roughness={0.7} />
        </mesh>
      </group>

      {/* Suspension ring */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <torusGeometry args={[0.13, 0.04, 16, 48]} />
        <meshStandardMaterial color="#c9a25a" metalness={1} roughness={0.18} />
      </mesh>

      {/* Outer medal disc — gold rim */}
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 0.12, 96]} />
        <meshPhysicalMaterial
          color="#d4af5e"
          metalness={1}
          roughness={0.22}
          clearcoat={0.5}
          clearcoatRoughness={0.3}
        />
      </mesh>

      {/* Inner recessed plate — slightly inset */}
      <mesh position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.78, 0.78, 0.02, 96]} />
        <meshStandardMaterial color="#0f0d0a" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Patchwork "blanket" — pie wedges of color inside the recess */}
      <group position={[0, 0, 0.082]}>
        {patchColors.map((color, i) => {
          const segments = patchColors.length
          const startAngle = (i / segments) * Math.PI * 2
          const wedgeAngle = (Math.PI * 2) / segments
          return (
            <PatchWedge
              key={i}
              color={color}
              startAngle={startAngle}
              wedgeAngle={wedgeAngle}
              radius={0.74}
            />
          )
        })}
      </group>

      {/* Central engraving — five rings hint (Olympic motif), stylized */}
      <mesh position={[0, 0, 0.092]}>
        <torusGeometry args={[0.18, 0.012, 12, 48]} />
        <meshStandardMaterial color="#c9a25a" metalness={1} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0, 0.092]}>
        <torusGeometry args={[0.32, 0.012, 12, 48]} />
        <meshStandardMaterial color="#c9a25a" metalness={1} roughness={0.1} />
      </mesh>

      {/* Engraved «SOCHI 2014» wreath dots around outer edge */}
      {[...Array(24)].map((_, i) => {
        const a = (i / 24) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.92, Math.sin(a) * 0.92, 0.075]}
          >
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial color="#fff7df" metalness={1} roughness={0.2} />
          </mesh>
        )
      })}
    </group>
  )
}

/** A single colored wedge inside the medal patchwork. */
function PatchWedge({
  color,
  startAngle,
  wedgeAngle,
  radius,
}: {
  color: string
  startAngle: number
  wedgeAngle: number
  radius: number
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    const steps = 12
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (i / steps) * wedgeAngle
      shape.lineTo(Math.cos(a) * radius, Math.sin(a) * radius)
    }
    shape.lineTo(0, 0)
    return new THREE.ShapeGeometry(shape)
  }, [startAngle, wedgeAngle, radius])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        metalness={0.3}
        roughness={0.55}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
