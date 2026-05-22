import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html, Stars } from '@react-three/drei'
import { Suspense, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

export interface TimelineNodeData {
  id: string
  /** Short label rendered as floating text — year or "Старт"/"Финал" */
  label: string
  /** Sublabel (smaller, only for active node) */
  sublabel?: string
  /** Virtual = intro / sources caps. Rendered smaller. */
  isVirtual?: boolean
}

interface TimelineSceneProps {
  nodes: TimelineNodeData[]
  activeIndex: number
  onSelect: (index: number) => void
  accentColor: string
  /** If true, disable continuous motion (prefers-reduced-motion) */
  reducedMotion?: boolean
  /** Disable click selection — used in locked auto-tour mode. */
  selectable?: boolean
  /** Fires once after the camera flies in to a new activeIndex. */
  onCameraArrived?: (index: number) => void
}

/**
 * 3D timeline of an excursion. A gently winding Catmull-Rom curve runs through
 * all nodes; the active node pulses, the camera trucks to it, and a stream of
 * golden particles drifts along the curve to suggest the flow of time.
 */
export default function TimelineScene(props: TimelineSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 1, 6], fov: 50 }}
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  )
}

function Scene({
  nodes,
  activeIndex,
  onSelect,
  accentColor,
  reducedMotion,
  selectable = true,
  onCameraArrived,
}: TimelineSceneProps) {
  // Path geometry: spread nodes along an S-curve with depth + height variation
  const positions = useMemo(() => {
    const n = nodes.length
    if (n === 0) return [] as THREE.Vector3[]
    if (n === 1) return [new THREE.Vector3(0, 0, 0)]

    const spread = Math.max(14, n * 3.2)
    return nodes.map((_, i) => {
      const t = i / (n - 1)
      const x = (t - 0.5) * spread
      const y = Math.sin(t * Math.PI * 1.6) * 1.0
      const z = Math.cos(t * Math.PI * 2.2) * 1.6
      return new THREE.Vector3(x, y, z)
    })
  }, [nodes])

  const curve = useMemo(() => {
    if (positions.length < 2) return null
    return new THREE.CatmullRomCurve3(positions, false, 'catmullrom', 0.5)
  }, [positions])

  return (
    <>
      <color attach="background" args={['#070605']} />
      <fog attach="fog" args={['#0a0908', 9, 26]} />

      <ambientLight intensity={0.35} />
      <pointLight position={[0, 4, 4]} intensity={1.4} color={accentColor} />
      <pointLight position={[-3, -2, -4]} intensity={0.9} color="#4a1f1f" />
      <pointLight position={[3, -2, -2]} intensity={0.6} color="#1c2541" />

      <Stars radius={50} depth={50} count={1100} factor={3.5} fade speed={0.25} />

      {curve && (
        <SplitTube
          curve={curve}
          progress={
            nodes.length > 1 ? activeIndex / (nodes.length - 1) : 0
          }
          accentColor={accentColor}
        />
      )}
      {curve && !reducedMotion && (
        <TimelineParticles curve={curve} count={70} accentColor={accentColor} />
      )}

      {positions.map((pos, i) => (
        <TimelineNode
          key={nodes[i].id + '-' + i}
          position={pos}
          data={nodes[i]}
          index={i}
          isActive={i === activeIndex}
          onClick={() => selectable && onSelect(i)}
          accentColor={accentColor}
          animated={!reducedMotion}
          selectable={selectable}
        />
      ))}

      {curve && (
        <CameraFollow
          curve={curve}
          nodeCount={nodes.length}
          activeIndex={activeIndex}
          onArrived={onCameraArrived}
        />
      )}
    </>
  )
}

/* ────────── Split tube: passed vs upcoming ────────── */

function SplitTube({
  curve,
  progress,
  accentColor,
}: {
  curve: THREE.CatmullRomCurve3
  /** 0..1 — proportion of timeline already passed */
  progress: number
  accentColor: string
}) {
  const clamped = Math.max(0.001, Math.min(0.999, progress))

  const passedGeo = useMemo(() => {
    const passedCurve = sliceCurve(curve, 0, clamped)
    return new THREE.TubeGeometry(passedCurve, 200, 0.032, 8, false)
  }, [curve, clamped])

  const upcomingGeo = useMemo(() => {
    const upcomingCurve = sliceCurve(curve, clamped, 1)
    return new THREE.TubeGeometry(upcomingCurve, 200, 0.02, 8, false)
  }, [curve, clamped])

  return (
    <>
      <mesh geometry={passedGeo}>
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={0.95}
          metalness={1}
          roughness={0.18}
        />
      </mesh>
      <mesh geometry={upcomingGeo}>
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={0.18}
          metalness={0.6}
          roughness={0.55}
          transparent
          opacity={0.55}
        />
      </mesh>
    </>
  )
}

/** Build a sub-curve by sampling points from [t1, t2] of an existing curve. */
function sliceCurve(
  curve: THREE.CatmullRomCurve3,
  t1: number,
  t2: number,
): THREE.CatmullRomCurve3 {
  const steps = 36
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = t1 + (t2 - t1) * (i / steps)
    points.push(curve.getPoint(t))
  }
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
}

/* ────────── Particles streaming along the curve ────────── */

function TimelineParticles({
  curve,
  count,
  accentColor,
}: {
  curve: THREE.CatmullRomCurve3
  count: number
  accentColor: string
}) {
  const pointsRef = useRef<THREE.Points>(null!)

  // initial t-values randomly distributed along the curve
  const tValues = useMemo(
    () => Array.from({ length: count }, () => Math.random()),
    [count],
  )

  const positions = useMemo(() => new Float32Array(count * 3), [count])

  // pre-fill positions
  useMemo(() => {
    for (let i = 0; i < count; i++) {
      const p = curve.getPoint(tValues[i])
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    }
  }, [curve, count, tValues, positions])

  useFrame((_, dt) => {
    if (!pointsRef.current) return
    const arr = pointsRef.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      tValues[i] = (tValues[i] + dt * 0.045) % 1
      const p = curve.getPoint(tValues[i])
      arr[i * 3] = p.x
      arr[i * 3 + 1] = p.y
      arr[i * 3 + 2] = p.z
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color={accentColor}
        size={0.08}
        transparent
        opacity={0.55}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

/* ────────── Individual node ────────── */

interface NodeProps {
  position: THREE.Vector3
  data: TimelineNodeData
  index: number
  isActive: boolean
  onClick: () => void
  accentColor: string
  animated: boolean
  selectable?: boolean
}

function TimelineNode({
  position,
  data,
  isActive,
  onClick,
  accentColor,
  animated,
  selectable = true,
}: NodeProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)

  const coreRadius = data.isVirtual ? 0.11 : 0.16
  const ringRadius = isActive ? 0.4 : 0.26

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    if (isActive && animated) {
      // pulse
      const s = 1 + Math.sin(t * 2.4) * 0.06
      groupRef.current.scale.setScalar(s)
    } else {
      const target = hovered ? 1.18 : 1.0
      groupRef.current.scale.lerp(
        new THREE.Vector3(target, target, target),
        0.15,
      )
    }
  })

  const stop = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
  }

  return (
    <group position={position}>
      <group ref={groupRef}>
        {/* ring halo */}
        <mesh>
          <torusGeometry args={[ringRadius, 0.012, 16, 64]} />
          <meshBasicMaterial
            color={accentColor}
            transparent
            opacity={isActive ? 0.95 : 0.4}
            depthWrite={false}
          />
        </mesh>

        {/* glow sphere when active */}
        {isActive && (
          <mesh>
            <sphereGeometry args={[coreRadius * 2.1, 32, 32]} />
            <meshBasicMaterial
              color={accentColor}
              transparent
              opacity={0.12}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )}

        {/* core sphere — clickable */}
        <mesh
          onPointerDown={(e) => {
            stop(e)
            if (selectable) onClick()
          }}
          onPointerOver={(e) => {
            stop(e)
            if (!selectable) return
            setHovered(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(false)
            document.body.style.cursor = 'auto'
          }}
        >
          <sphereGeometry args={[coreRadius, 32, 32]} />
          <meshStandardMaterial
            color={data.isVirtual ? '#efe5d2' : accentColor}
            emissive={data.isVirtual ? '#c9a25a' : accentColor}
            emissiveIntensity={isActive ? 1.4 : 0.55}
            metalness={1}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* floating label */}
      <Html
        position={[0, isActive ? 0.78 : 0.6, 0]}
        center
        distanceFactor={8}
        zIndexRange={[20, 0]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          style={{
            textAlign: 'center',
            color: isActive ? '#f7f1e6' : 'rgba(247,241,230,0.55)',
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontWeight: isActive ? 600 : 400,
            fontSize: isActive ? '12px' : '10px',
            whiteSpace: 'nowrap',
            textShadow: '0 2px 12px rgba(0,0,0,0.85), 0 0 24px rgba(0,0,0,0.6)',
            transition: 'all 0.45s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {data.label}
          {isActive && data.sublabel && (
            <div
              style={{
                marginTop: 4,
                fontSize: '10px',
                fontWeight: 400,
                letterSpacing: '0.14em',
                color: 'rgba(201,162,90,0.85)',
              }}
            >
              {data.sublabel}
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}

/* ────────── Camera follow — travels ALONG the curve ────────── */

function CameraFollow({
  curve,
  nodeCount,
  activeIndex,
  onArrived,
}: {
  curve: THREE.CatmullRomCurve3
  nodeCount: number
  activeIndex: number
  onArrived?: (index: number) => void
}) {
  const { camera } = useThree()

  // Animated t-position along the curve, eased toward target
  const currentT = useRef(0)
  const targetT = nodeCount > 1 ? activeIndex / (nodeCount - 1) : 0

  // initialise current to target so the very first frame doesn't sweep across the whole timeline
  const initialized = useRef(false)
  if (!initialized.current) {
    currentT.current = targetT
    initialized.current = true
  }

  const camTarget = useMemo(() => new THREE.Vector3(), [])
  const lookTarget = useMemo(() => new THREE.Vector3(), [])
  const smoothedLook = useMemo(() => new THREE.Vector3(), [])
  const onCurve = useMemo(() => new THREE.Vector3(), [])
  const ahead = useMemo(() => new THREE.Vector3(), [])

  // Whether we have already fired onArrived for the current activeIndex.
  const arrivedRef = useRef<number | null>(null)

  useFrame((state) => {
    // Distance to target — speed up large jumps, slow down for small adjustments
    const diff = targetT - currentT.current
    const absDiff = Math.abs(diff)

    // Time-based easing — feels like a smooth fly-through
    let speed
    if (absDiff > 0.18) speed = 0.04 // far away — slower start, gives travel feel
    else if (absDiff > 0.05) speed = 0.06
    else speed = 0.09 // close — settle quickly

    currentT.current += diff * speed
    // Clamp into [0, 1]
    if (currentT.current < 0) currentT.current = 0
    if (currentT.current > 1) currentT.current = 1

    // Camera rides above & behind the moving point on the curve
    curve.getPointAt(currentT.current, onCurve)

    // Look slightly ahead along the path so motion feels directional
    const lookAheadT = Math.min(1, currentT.current + 0.04)
    curve.getPointAt(lookAheadT, ahead)

    camTarget.set(
      onCurve.x + state.pointer.x * 1.0,
      onCurve.y + 1.15 + state.pointer.y * 0.35,
      onCurve.z + 4.6,
    )
    camera.position.lerp(camTarget, 0.12)

    lookTarget.copy(ahead)
    lookTarget.y += 0.2
    smoothedLook.lerp(lookTarget, 0.18)
    camera.lookAt(smoothedLook)

    // Arrival check — fire callback once we've effectively reached the target.
    if (absDiff < 0.0035 && arrivedRef.current !== activeIndex) {
      arrivedRef.current = activeIndex
      onArrived?.(activeIndex)
    } else if (absDiff > 0.02 && arrivedRef.current === activeIndex) {
      // target changed — reset so we'll re-fire when we land at the new one
      arrivedRef.current = null
    }
  })

  return null
}
