"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ── Helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// ── Star Field ───────────────────────────────────────────────────────────────

function StarField() {
  const COUNT = 1400;
  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = rand(8, 55);
      const theta = rand(0, Math.PI * 2);
      const phi = rand(0, Math.PI);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  const sizes = useMemo(() => {
    const arr = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) arr[i] = rand(0.3, 1.6);
    return arr;
  }, []);

  const ref = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.012;
      ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.007) * 0.04;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        color="#a8c4ff"
        size={0.06}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </points>
  );
}

// ── Floating Dust Particles ───────────────────────────────────────────────────

function DustParticles() {
  const COUNT = 220;
  const data = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const speeds: number[] = [];
    const offsets: number[] = [];
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = rand(-12, 12);
      positions[i * 3 + 1] = rand(-8, 8);
      positions[i * 3 + 2] = rand(-5, 2);
      speeds.push(rand(0.12, 0.35));
      offsets.push(rand(0, Math.PI * 2));
    }
    return { positions, speeds, offsets };
  }, []);

  const ref = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const t = clock.getElapsedTime();
    for (let i = 0; i < COUNT; i++) {
      pos.setY(i, data.positions[i * 3 + 1] + Math.sin(t * data.speeds[i] + data.offsets[i]) * 0.3);
      pos.setX(i, data.positions[i * 3] + Math.cos(t * data.speeds[i] * 0.7 + data.offsets[i]) * 0.15);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#7dd3fc" size={0.025} sizeAttenuation transparent opacity={0.3} depthWrite={false} />
    </points>
  );
}

// ── Network Node ─────────────────────────────────────────────────────────────

interface NodeSpec {
  pos: [number, number, number];
  size: number;
  speed: number;
  phase: number;
  color: THREE.Color;
}

function NetworkMesh({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const PALETTE = useMemo(() => [
    new THREE.Color("#3b82f6"),
    new THREE.Color("#60a5fa"),
    new THREE.Color("#818cf8"),
    new THREE.Color("#38bdf8"),
    new THREE.Color("#a78bfa"),
  ], []);

  const NODE_COUNT = 22;
  const nodes = useMemo<NodeSpec[]>(() => {
    return Array.from({ length: NODE_COUNT }, () => ({
      pos: [rand(-9, 9), rand(-5.5, 5.5), rand(-3, 0)] as [number, number, number],
      size: rand(0.045, 0.16),
      speed: rand(0.18, 0.45),
      phase: rand(0, Math.PI * 2),
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    }));
  }, [PALETTE]);

  // Build edge pairs between close nodes
  const edges = useMemo(() => {
    const pairs: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].pos[0] - nodes[j].pos[0];
        const dy = nodes[i].pos[1] - nodes[j].pos[1];
        const dz = nodes[i].pos[2] - nodes[j].pos[2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 5.5 && Math.random() < 0.35) pairs.push([i, j]);
      }
    }
    return pairs;
  }, [nodes]);

  // Pre-build edge geometry positions array (will be updated each frame)
  const edgeRef = useRef<THREE.LineSegments>(null);
  const nodeRefs = useRef<(THREE.Mesh | null)[]>(Array(NODE_COUNT).fill(null));
  const currentPositions = useRef(nodes.map(n => new THREE.Vector3(...n.pos)));

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Group parallax
    if (groupRef.current) {
      groupRef.current.rotation.y += (mouseX * 0.04 - groupRef.current.rotation.y) * 0.02;
      groupRef.current.rotation.x += (-mouseY * 0.025 - groupRef.current.rotation.x) * 0.02;
      groupRef.current.position.y += (mouseY * 0.18 - groupRef.current.position.y) * 0.02;
    }

    // Move nodes
    nodes.forEach((nd, i) => {
      const x = nd.pos[0] + Math.sin(t * nd.speed + nd.phase) * 0.35;
      const y = nd.pos[1] + Math.cos(t * nd.speed * 0.8 + nd.phase) * 0.25;
      const z = nd.pos[2];
      currentPositions.current[i].set(x, y, z);
      const mesh = nodeRefs.current[i];
      if (mesh) {
        mesh.position.set(x, y, z);
        const pulse = 1 + Math.sin(t * nd.speed * 2 + nd.phase) * 0.08;
        mesh.scale.setScalar(pulse);
      }
    });

    // Update edge geometry
    if (edgeRef.current) {
      const posAttr = edgeRef.current.geometry.attributes.position as THREE.BufferAttribute;
      edges.forEach(([a, b], idx) => {
        const pa = currentPositions.current[a];
        const pb = currentPositions.current[b];
        posAttr.setXYZ(idx * 2, pa.x, pa.y, pa.z);
        posAttr.setXYZ(idx * 2 + 1, pb.x, pb.y, pb.z);
      });
      posAttr.needsUpdate = true;
    }
  });

  const edgePositions = useMemo(() => new Float32Array(edges.length * 6), [edges]);

  return (
    <group ref={groupRef}>
      {/* Edges */}
      <lineSegments ref={edgeRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#1e40af" transparent opacity={0.22} />
      </lineSegments>

      {/* Nodes */}
      {nodes.map((nd, i) => (
        <mesh key={i} ref={(el) => { nodeRefs.current[i] = el; }} position={nd.pos}>
          <sphereGeometry args={[nd.size, 10, 10]} />
          <meshBasicMaterial color={nd.color} transparent opacity={0.75} />
        </mesh>
      ))}
    </group>
  );
}

// ── Orbital Ring ─────────────────────────────────────────────────────────────

function OrbitalRing({ radius, tilt, speed, color, opacity }: {
  radius: number; tilt: number; speed: number; color: string; opacity: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = clock.getElapsedTime() * speed;
  });
  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <torusGeometry args={[radius, 0.008, 6, 120]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

// ── Central Focal Glow (fake glow via layered translucent spheres) ────────────

function CentralGlow() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.05;
      const s = 1 + Math.sin(clock.getElapsedTime() * 0.4) * 0.04;
      ref.current.scale.setScalar(s);
    }
  });
  return (
    <group ref={ref} position={[2.5, 0.5, -2]}>
      {[2.8, 2.0, 1.3, 0.7].map((r, i) => (
        <mesh key={i}>
          <sphereGeometry args={[r, 24, 24]} />
          <meshBasicMaterial
            color={i < 2 ? "#0f172a" : "#1e3a8a"}
            transparent
            opacity={[0.18, 0.12, 0.08, 0.06][i]}
            side={THREE.BackSide}
          />
        </mesh>
      ))}
      {/* Core */}
      <mesh>
        <sphereGeometry args={[0.22, 20, 20]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#2563eb"
          emissiveIntensity={0.9}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>
    </group>
  );
}

// ── Ambient Fog Plane ────────────────────────────────────────────────────────

function FogPlane() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshBasicMaterial).opacity =
        0.06 + Math.sin(clock.getElapsedTime() * 0.25) * 0.02;
    }
  });
  return (
    <mesh ref={ref} position={[0, 0, -1]}>
      <planeGeometry args={[40, 25]} />
      <meshBasicMaterial color="#0a1628" transparent opacity={0.07} depthWrite={false} />
    </mesh>
  );
}

// ── Camera Drift ─────────────────────────────────────────────────────────────

function CameraDrift({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const tx = mouseX * 0.6 + Math.sin(t * 0.08) * 0.2;
    const ty = -mouseY * 0.4 + Math.sin(t * 0.06) * 0.15;
    camera.position.set(
      camera.position.x + (tx - camera.position.x) * 0.018,
      camera.position.y + (ty - camera.position.y) * 0.018,
      camera.position.z
    );
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ── Main Scene ────────────────────────────────────────────────────────────────

function Scene({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  return (
    <>
      <ambientLight intensity={0.15} color="#1e3a8a" />
      <pointLight position={[5, 4, 3]} intensity={0.7} color="#3b82f6" />
      <pointLight position={[-6, -3, 2]} intensity={0.4} color="#818cf8" />
      <pointLight position={[0, 0, 4]} intensity={0.2} color="#38bdf8" />
      <CameraDrift mouseX={mouseX} mouseY={mouseY} />
      <StarField />
      <DustParticles />
      <NetworkMesh mouseX={mouseX} mouseY={mouseY} />
      <CentralGlow />
      <OrbitalRing radius={3.6} tilt={0.3} speed={0.06} color="#3b82f6" opacity={0.12} />
      <OrbitalRing radius={5.2} tilt={-0.5} speed={-0.04} color="#818cf8" opacity={0.08} />
      <OrbitalRing radius={7.0} tilt={0.8} speed={0.025} color="#38bdf8" opacity={0.06} />
      <FogPlane />
    </>
  );
}

// ── Exported Component ────────────────────────────────────────────────────────

export function ImmersiveBackground() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -((e.clientY / window.innerHeight) * 2 - 1),
      });
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 52 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false }}
      style={{ position: "absolute", inset: 0, background: "#050c1a" }}
    >
      <Scene mouseX={mouse.x} mouseY={mouse.y} />
    </Canvas>
  );
}
