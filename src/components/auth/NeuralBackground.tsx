"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ── Helpers ───────────────────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// ── Star color palette — blues, cyans, violets, purples, pinks, whites ────────
const STAR_COLORS = [
  new THREE.Color("#e8f4ff"), // near-white blue-white
  new THREE.Color("#c5d9ff"), // cool white
  new THREE.Color("#a5c8ff"), // ice blue
  new THREE.Color("#7eb8ff"), // soft blue
  new THREE.Color("#5ba3f5"), // sky blue
  new THREE.Color("#38bdf8"), // cyan
  new THREE.Color("#67e8f9"), // bright cyan
  new THREE.Color("#a78bfa"), // violet
  new THREE.Color("#818cf8"), // indigo
  new THREE.Color("#c084fc"), // purple
  new THREE.Color("#e879f9"), // pink-purple
  new THREE.Color("#f0abfc"), // light pink
  new THREE.Color("#f9a8d4"), // rose-pink
];

// ── Deep background star field (thousands of tiny static stars) ───────────────

function DeepStarField() {
  const COUNT = 3200;

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      // Distribute on a large sphere
      const r = rand(18, 80);
      const theta = rand(0, Math.PI * 2);
      const phi = Math.acos(rand(-1, 1));
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Pick color — bias toward white/blue
      const palette = Math.random() < 0.55
        ? STAR_COLORS.slice(0, 4)   // mostly white-blue
        : STAR_COLORS;
      const col = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3]     = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      // Vary size — most are tiny, few are bright
      sizes[i] = Math.random() < 0.04 ? rand(1.2, 2.4) : rand(0.15, 0.9);
    }
    return { positions, colors, sizes };
  }, []);

  const ref = useRef<THREE.Points>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.005;
      ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.003) * 0.015;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors,    3]} />
        <bufferAttribute attach="attributes-size"     args={[sizes,     1]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.04}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </points>
  );
}

// ── Twinkle stars — medium layer, animate opacity per star ────────────────────

interface TwinkleStar {
  pos: [number, number, number];
  phase: number;
  speed: number;
  color: THREE.Color;
  size: number;
}

function TwinkleStars() {
  const COUNT = 420;

  const stars = useMemo<TwinkleStar[]>(() => {
    return Array.from({ length: COUNT }, () => {
      const r = rand(4, 16);
      const theta = rand(0, Math.PI * 2);
      const phi = Math.acos(rand(-1, 1));
      return {
        pos: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ] as [number, number, number],
        phase: rand(0, Math.PI * 2),
        speed: rand(0.4, 1.8),
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        size: rand(0.03, 0.09),
      };
    });
  }, []);

  // We render them individually as small sprites so each can pulse independently
  return (
    <>
      {stars.map((s, i) => (
        <TwinkleDot key={i} star={s} />
      ))}
    </>
  );
}

function TwinkleDot({ star }: { star: TwinkleStar }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const pulse = 0.5 + 0.5 * Math.sin(t * star.speed + star.phase);
    // Scale the mesh to simulate twinkle
    const s = star.size * (0.7 + pulse * 0.6);
    ref.current.scale.setScalar(s);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + pulse * 0.7;
  });

  return (
    <mesh ref={ref} position={star.pos}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={star.color}
        transparent
        opacity={0.8}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Cursor-reactive constellation layer ──────────────────────────────────────

interface ConstellationProps {
  mouseNDC: { x: number; y: number };
}

function ConstellationLayer({ mouseNDC }: ConstellationProps) {
  const { camera, size } = useThree();
  const lineRef = useRef<THREE.LineSegments>(null);
  const glowRef = useRef<THREE.Points>(null);

  const STAR_COUNT = 160;

  // Static star positions in world space (mid-range depth, near-foreground)
  const starData = useMemo(() => {
    return Array.from({ length: STAR_COUNT }, () => ({
      pos: new THREE.Vector3(rand(-9, 9), rand(-5.5, 5.5), rand(-2.5, 0.5)),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.08, 0.22),
      drift: new THREE.Vector3(rand(-0.002, 0.002), rand(-0.002, 0.002), 0),
    }));
  }, []);

  const currentPositions = useRef(starData.map(s => s.pos.clone()));

  // Pre-allocate buffers for max possible edges (each star can connect to ≤6)
  const MAX_EDGES = STAR_COUNT * 6;
  const edgePositions  = useMemo(() => new Float32Array(MAX_EDGES * 2 * 3), [MAX_EDGES]);
  const glowPositions  = useMemo(() => {
    const arr = new Float32Array(STAR_COUNT * 3);
    return arr;
  }, []);
  const [edgeCount, setEdgeCount] = useState(0);

  // Cursor world position (project NDC → world at z=0 plane)
  const cursorWorld = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Unproject cursor NDC to world space at z = -1
    const ndc = new THREE.Vector3(mouseNDC.x, mouseNDC.y, 0.5);
    ndc.unproject(camera);
    const dir = ndc.sub(camera.position).normalize();
    const dist = -camera.position.z / dir.z;
    cursorWorld.current.copy(camera.position).addScaledVector(dir, dist);

    // Gentle drift for each star
    starData.forEach((sd, i) => {
      const p = currentPositions.current[i];
      p.x = sd.pos.x + Math.sin(t * sd.speed + sd.phase) * 0.18;
      p.y = sd.pos.y + Math.cos(t * sd.speed * 0.7 + sd.phase) * 0.12;
      glowPositions[i * 3]     = p.x;
      glowPositions[i * 3 + 1] = p.y;
      glowPositions[i * 3 + 2] = p.z;
    });

    if (glowRef.current) {
      const attr = glowRef.current.geometry.attributes.position as THREE.BufferAttribute;
      attr.array.set(glowPositions);
      attr.needsUpdate = true;
    }

    // Build constellation edges
    // Connect stars that are within RADIUS of the cursor, or within STAR_RADIUS of each other
    const CURSOR_RADIUS = 2.8;
    const STAR_RADIUS   = 2.2;
    const MAX_CONNECTIONS_PER_STAR = 4;

    let edgeIdx = 0;
    const connections: number[] = new Array(STAR_COUNT).fill(0);

    for (let i = 0; i < STAR_COUNT && edgeIdx < MAX_EDGES; i++) {
      const pi = currentPositions.current[i];
      const toCursor = cursorWorld.current.distanceTo(pi);
      const nearCursor = toCursor < CURSOR_RADIUS;

      for (let j = i + 1; j < STAR_COUNT && edgeIdx < MAX_EDGES; j++) {
        if (connections[i] >= MAX_CONNECTIONS_PER_STAR) break;
        if (connections[j] >= MAX_CONNECTIONS_PER_STAR) continue;

        const pj = currentPositions.current[j];
        const toCursorJ = cursorWorld.current.distanceTo(pj);
        const nearCursorJ = toCursorJ < CURSOR_RADIUS;

        // Connect if both near cursor, or one near cursor + close to each other
        const dist = pi.distanceTo(pj);
        const shouldConnect =
          (nearCursor && nearCursorJ) ||
          ((nearCursor || nearCursorJ) && dist < STAR_RADIUS) ||
          dist < 1.0; // always connect very close stars

        if (shouldConnect && dist < STAR_RADIUS + 0.8) {
          edgePositions[edgeIdx * 6]     = pi.x;
          edgePositions[edgeIdx * 6 + 1] = pi.y;
          edgePositions[edgeIdx * 6 + 2] = pi.z;
          edgePositions[edgeIdx * 6 + 3] = pj.x;
          edgePositions[edgeIdx * 6 + 4] = pj.y;
          edgePositions[edgeIdx * 6 + 5] = pj.z;
          edgeIdx++;
          connections[i]++;
          connections[j]++;
        }
      }
    }

    if (lineRef.current) {
      const attr = lineRef.current.geometry.attributes.position as THREE.BufferAttribute;
      // Zero-out unused edges
      for (let k = edgeIdx; k < MAX_EDGES; k++) {
        edgePositions[k * 6] = edgePositions[k * 6 + 3] = 0;
        edgePositions[k * 6 + 1] = edgePositions[k * 6 + 4] = 0;
        edgePositions[k * 6 + 2] = edgePositions[k * 6 + 5] = 0;
      }
      attr.array.set(edgePositions);
      attr.needsUpdate = true;
      setEdgeCount(edgeIdx);
    }

    // Suppress unused variable warning
    void size;
    void edgeCount;
  });

  return (
    <group>
      {/* Constellation lines */}
      <lineSegments ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} count={MAX_EDGES * 2} />
        </bufferGeometry>
        <lineBasicMaterial color="#7dd3fc" transparent opacity={0.18} depthWrite={false} />
      </lineSegments>

      {/* Star glow dots */}
      <points ref={glowRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[glowPositions, 3]} count={STAR_COUNT} />
        </bufferGeometry>
        <pointsMaterial
          color="#a5c8ff"
          size={0.055}
          sizeAttenuation
          transparent
          opacity={0.65}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

// ── Nebula haze planes — large semi-transparent color clouds ──────────────────

interface NebulaSpec {
  pos: [number, number, number];
  rot: [number, number, number];
  color: string;
  opacity: number;
  size: [number, number];
  speed: number;
  phase: number;
}

function Nebulae() {
  const specs = useMemo<NebulaSpec[]>(() => [
    { pos: [-5, 2.5, -6],  rot: [0, 0.2, 0],  color: "#1e3a8a", opacity: 0.09, size: [14, 9],  speed: 0.07, phase: 0 },
    { pos: [5.5, -2, -7],  rot: [0.1, 0, 0],  color: "#312e81", opacity: 0.08, size: [16, 10], speed: 0.05, phase: 1.2 },
    { pos: [0, -4, -5],    rot: [0.2, 0.1, 0], color: "#0e7490", opacity: 0.06, size: [20, 12], speed: 0.06, phase: 2.5 },
    { pos: [7, 3.5, -8],   rot: [0, 0.3, 0],  color: "#4c1d95", opacity: 0.07, size: [12, 8],  speed: 0.08, phase: 0.8 },
    { pos: [-6, -3, -9],   rot: [0.15, 0, 0], color: "#164e63", opacity: 0.07, size: [18, 11], speed: 0.04, phase: 3.1 },
  ], []);

  return (
    <>
      {specs.map((s, i) => <NebulaPlane key={i} spec={s} />)}
    </>
  );
}

function NebulaPlane({ spec }: { spec: NebulaSpec }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    (ref.current.material as THREE.MeshBasicMaterial).opacity =
      spec.opacity * (0.7 + 0.3 * Math.sin(t * spec.speed + spec.phase));
    ref.current.rotation.z = t * spec.speed * 0.15;
  });
  return (
    <mesh ref={ref} position={spec.pos} rotation={spec.rot as [number, number, number]}>
      <planeGeometry args={spec.size} />
      <meshBasicMaterial color={spec.color} transparent opacity={spec.opacity} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Subtle static constellation backdrop ─────────────────────────────────────

function StaticConstellations() {
  // A few pre-built constellation lines in the far background
  const lines = useMemo(() => {
    const patterns: [number, number, number][][] = [
      // Orion-like
      [[-6, 2, -12], [-5.2, 1.4, -12], [-4.6, 0.8, -12], [-4.0, 0.1, -12], [-3.3, -0.7, -12]],
      // Cassiopeia-like zigzag
      [[4, 3.5, -14], [5.2, 2.8, -14], [6.2, 3.6, -14], [7.3, 2.9, -14], [8.2, 3.6, -14]],
      // Small triangle
      [[-8, -1.5, -11], [-7.2, -2.8, -11], [-6.3, -1.7, -11], [-8, -1.5, -11]],
      // Diamond
      [[3, -2, -13], [4.2, -3, -13], [3, -4, -13], [1.8, -3, -13], [3, -2, -13]],
    ];

    return patterns.map((pts) => {
      const positions = new Float32Array(pts.length * 3);
      pts.forEach((p, i) => {
        positions[i * 3] = p[0]; positions[i * 3 + 1] = p[1]; positions[i * 3 + 2] = p[2];
      });
      return positions;
    });
  }, []);

  return (
    <>
      {lines.map((positions, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#93c5fd" transparent opacity={0.08} depthWrite={false} />
        </line>
      ))}
    </>
  );
}

// ── Bright featured stars (large halos for key accent stars) ─────────────────

function FeaturedStars() {
  const specs = useMemo<Array<{ pos: [number, number, number]; color: string; size: number; phase: number }>>(() => [
    { pos: [-7.5, 3.8, -5]  as [number, number, number], color: "#67e8f9", size: 0.14, phase: 0 },
    { pos: [6.8, -2.2, -4]  as [number, number, number], color: "#c084fc", size: 0.11, phase: 1.4 },
    { pos: [-4.2, -4.1, -3] as [number, number, number], color: "#a5c8ff", size: 0.12, phase: 2.8 },
    { pos: [4.5, 4.5, -6]   as [number, number, number], color: "#f0abfc", size: 0.10, phase: 0.9 },
    { pos: [8.5, 1.2, -5]   as [number, number, number], color: "#38bdf8", size: 0.13, phase: 2.1 },
    { pos: [-8.8, -0.5, -4] as [number, number, number], color: "#818cf8", size: 0.09, phase: 3.5 },
    { pos: [2.2, -5.2, -5]  as [number, number, number], color: "#e8f4ff", size: 0.12, phase: 1.7 },
    { pos: [-3.5, 5.0, -5]  as [number, number, number], color: "#7eb8ff", size: 0.10, phase: 4.2 },
  ], []);

  return (
    <>
      {specs.map((s, i) => <FeaturedStar key={i} spec={s} />)}
    </>
  );
}

function FeaturedStar({ spec }: { spec: { pos: [number, number, number]; color: string; size: number; phase: number } }) {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.8 + spec.phase);

    if (outerRef.current) {
      const s = spec.size * (1.5 + pulse * 1.2);
      outerRef.current.scale.setScalar(s);
      (outerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.04 + pulse * 0.10;
    }
    if (innerRef.current) {
      const s = spec.size * (0.5 + pulse * 0.3);
      innerRef.current.scale.setScalar(s);
      (innerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + pulse * 0.6;
    }
  });

  return (
    <group position={spec.pos}>
      {/* Outer halo */}
      <mesh ref={outerRef}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={spec.color} transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Core point */}
      <mesh ref={innerRef}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={spec.color} transparent opacity={0.9} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Camera subtle parallax drift ─────────────────────────────────────────────

function CameraParallax({ mouseNDC }: { mouseNDC: { x: number; y: number } }) {
  const { camera } = useThree();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const tx = mouseNDC.x * 0.45 + Math.sin(t * 0.05) * 0.12;
    const ty = -mouseNDC.y * 0.28 + Math.sin(t * 0.04) * 0.08;
    camera.position.set(
      camera.position.x + (tx - camera.position.x) * 0.025,
      camera.position.y + (ty - camera.position.y) * 0.025,
      camera.position.z
    );
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ── Full scene ────────────────────────────────────────────────────────────────

function Scene({ mouseNDC }: { mouseNDC: { x: number; y: number } }) {
  return (
    <>
      {/* Very faint ambient so meshBasicMaterial shows correctly */}
      <ambientLight intensity={0.05} />

      <CameraParallax mouseNDC={mouseNDC} />

      {/* Background nebulae */}
      <Nebulae />

      {/* Far deep star field */}
      <DeepStarField />

      {/* Static faint constellation lines in deep background */}
      <StaticConstellations />

      {/* Mid-range bright accent stars */}
      <FeaturedStars />

      {/* Near-field twinkling stars */}
      <TwinkleStars />

      {/* Interactive cursor constellation layer */}
      <ConstellationLayer mouseNDC={mouseNDC} />
    </>
  );
}

// ── Exported component ────────────────────────────────────────────────────────

export function NeuralBackground() {
  const [mouseNDC, setMouseNDC] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMouseNDC({
      x:  (e.clientX / window.innerWidth)  * 2 - 1,
      y: -((e.clientY / window.innerHeight) * 2 - 1),
    });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 55 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false }}
      style={{ position: "absolute", inset: 0, background: "#030914" }}
    >
      <Scene mouseNDC={mouseNDC} />
    </Canvas>
  );
}
