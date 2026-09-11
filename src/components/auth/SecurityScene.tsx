"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ─── Constants ─────────────────────────────────────────────────────────────
const NODE_COUNT = 38;
const EDGE_PROB = 0.18;
const COLORS = {
  node: new THREE.Color("#3b82f6"),
  nodeDim: new THREE.Color("#1e3a8a"),
  edge: new THREE.Color("#1e40af"),
  pulse: new THREE.Color("#60a5fa"),
  shield: new THREE.Color("#2563eb"),
  shieldGlow: new THREE.Color("#3b82f6"),
};

// ─── Utility ────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// ─── Network Nodes + Edges ──────────────────────────────────────────────────
interface NodeData {
  position: THREE.Vector3;
  basePos: THREE.Vector3;
  speed: number;
  phase: number;
  size: number;
  active: boolean;
}

function buildGraph(): { nodes: NodeData[]; edges: [number, number][] } {
  const nodes: NodeData[] = Array.from({ length: NODE_COUNT }, (_, i) => {
    // Distribute on a sphere-ish shell
    const phi = Math.acos(2 * (i / NODE_COUNT) - 1);
    const theta = Math.sqrt(NODE_COUNT * Math.PI) * phi + (Math.random() - 0.5) * 0.8;
    const r = 2.4 + (Math.random() - 0.5) * 0.7;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi) * 0.5; // flatten z
    const pos = new THREE.Vector3(x, y, z);
    return {
      position: pos.clone(),
      basePos: pos.clone(),
      speed: 0.3 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      size: 0.04 + Math.random() * 0.06,
      active: Math.random() > 0.5,
    };
  });

  const edges: [number, number][] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    for (let j = i + 1; j < NODE_COUNT; j++) {
      const dist = nodes[i].basePos.distanceTo(nodes[j].basePos);
      if (dist < 1.8 && Math.random() < EDGE_PROB) {
        edges.push([i, j]);
      }
    }
  }
  return { nodes, edges };
}

// ─── Pulse Traveling Along Edge ─────────────────────────────────────────────
function Pulse({
  start,
  end,
  duration,
  offset,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  duration: number;
  offset: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.getElapsedTime() + offset) % duration) / duration;
    ref.current.position.lerpVectors(start, end, t);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI) * 0.9;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.025, 6, 6]} />
      <meshBasicMaterial color={COLORS.pulse} transparent opacity={0.7} />
    </mesh>
  );
}

// ─── Shield Glyph ───────────────────────────────────────────────────────────
function ShieldMesh({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!groupRef.current) return;
    // Gentle continuous rotation
    groupRef.current.rotation.y = lerp(groupRef.current.rotation.y, mouseX * 0.3, 0.04);
    groupRef.current.rotation.x = lerp(groupRef.current.rotation.x, -mouseY * 0.2, 0.04);
    // Subtle bob
    groupRef.current.position.y = Math.sin(t * 0.6) * 0.04;

    // Ring pulse
    if (ringRef.current) {
      const s = 1 + Math.sin(t * 1.2) * 0.02;
      ringRef.current.scale.setScalar(s);
    }
    if (innerRingRef.current) {
      const s = 1 + Math.cos(t * 0.9) * 0.015;
      innerRingRef.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Outer scanning ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.82, 0.012, 8, 64]} />
        <meshBasicMaterial color={COLORS.shieldGlow} transparent opacity={0.25} />
      </mesh>

      {/* Inner ring */}
      <mesh ref={innerRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.008, 8, 64]} />
        <meshBasicMaterial color={COLORS.shieldGlow} transparent opacity={0.18} />
      </mesh>

      {/* Core sphere */}
      <mesh>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial
          color={COLORS.shield}
          emissive={COLORS.shieldGlow}
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Shield hex ring */}
      {Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const r = 0.34;
        return (
          <mesh key={i} position={[Math.cos(angle) * r, Math.sin(angle) * r, 0]}>
            <sphereGeometry args={[0.032, 8, 8]} />
            <meshBasicMaterial color={COLORS.node} transparent opacity={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Network Graph ───────────────────────────────────────────────────────────
function NetworkGraph({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const { nodes, edges } = useMemo(() => buildGraph(), []);
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const edgeLinesRef = useRef<THREE.LineSegments>(null);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Pre-compute edge geometry
  const edgePositions = useMemo(() => {
    const positions: number[] = [];
    edges.forEach(([a, b]) => {
      const na = nodes[a].basePos;
      const nb = nodes[b].basePos;
      positions.push(na.x, na.y, na.z, nb.x, nb.y, nb.z);
    });
    return new Float32Array(positions);
  }, [edges, nodes]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      // Slow drift + mouse parallax
      groupRef.current.rotation.y = t * 0.04 + mouseX * 0.15;
      groupRef.current.rotation.x = Math.sin(t * 0.07) * 0.08 + mouseY * 0.08;
    }

    if (instancedRef.current) {
      nodes.forEach((node, i) => {
        // Float drift
        const drift = Math.sin(t * node.speed + node.phase) * 0.04;
        node.position.set(
          node.basePos.x + Math.sin(t * node.speed * 0.7 + node.phase) * 0.03,
          node.basePos.y + drift,
          node.basePos.z + Math.cos(t * node.speed * 0.5 + node.phase) * 0.03
        );
        tempMatrix.setPosition(node.position);
        const s = node.size * (1 + Math.sin(t * node.speed + node.phase) * 0.15);
        tempMatrix.scale(new THREE.Vector3(s, s, s));
        instancedRef.current!.setMatrixAt(i, tempMatrix);

        // Pulse active nodes
        const isActive = node.active && Math.sin(t * node.speed * 2 + node.phase) > 0.5;
        tempColor.copy(isActive ? COLORS.node : COLORS.nodeDim);
        instancedRef.current!.setColorAt(i, tempColor);
      });
      instancedRef.current.instanceMatrix.needsUpdate = true;
      if (instancedRef.current.instanceColor) {
        instancedRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Edges */}
      <lineSegments ref={edgeLinesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[edgePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={COLORS.edge} transparent opacity={0.18} />
      </lineSegments>

      {/* Nodes */}
      <instancedMesh ref={instancedRef} args={[undefined, undefined, NODE_COUNT]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial vertexColors />
      </instancedMesh>

      {/* Pulses along a few edges */}
      {edges.slice(0, 8).map(([a, b], i) => (
        <Pulse
          key={i}
          start={nodes[a].position}
          end={nodes[b].position}
          duration={2 + i * 0.4}
          offset={i * 0.7}
        />
      ))}
    </group>
  );
}

// ─── Camera Rig ──────────────────────────────────────────────────────────────
function CameraRig({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.set(
      lerp(camera.position.x, mouseX * 0.4, 0.025),
      lerp(camera.position.y, mouseY * 0.25, 0.025),
      camera.position.z
    );
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ─── Scan Ring ────────────────────────────────────────────────────────────────
function ScanRing() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() * 0.35) % 1;
    const scale = 0.3 + t * 3.5;
    ref.current.scale.setScalar(scale);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.12;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.96, 1.0, 64]} />
      <meshBasicMaterial color={COLORS.pulse} transparent opacity={0.1} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function Scene({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 3, 3]} intensity={1.2} color="#3b82f6" />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color="#1e3a8a" />
      <CameraRig mouseX={mouseX} mouseY={mouseY} />
      <NetworkGraph mouseX={mouseX} mouseY={mouseY} />
      <ShieldMesh mouseX={mouseX} mouseY={mouseY} />
      <ScanRing />
    </>
  );
}

// ─── Exported Component ───────────────────────────────────────────────────────
export function SecurityScene() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMouse({
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      });
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene mouseX={mouse.x} mouseY={mouse.y} />
      </Canvas>
    </div>
  );
}
