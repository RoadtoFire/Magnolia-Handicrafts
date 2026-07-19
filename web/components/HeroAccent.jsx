"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// A small handful of slowly drifting "dust motes" in warm gold/stone tones —
// meant to feel like light catching dust or fabric fibers, not a techy
// particle-system demo. Kept deliberately sparse and slow.
const PARTICLE_COUNT = 46;

// Warm neutrals consistent with the boutique/handicraft palette used
// elsewhere in the app (Tailwind's stone/amber neutrals), not new brand colors.
const PALETTE = ["#c9b896", "#a8907a", "#e8dcc8"];

function DustMotes() {
  const pointsRef = useRef(null);

  const { positions, colors, speeds, phases } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const speeds = new Float32Array(PARTICLE_COUNT);
    const phases = new Float32Array(PARTICLE_COUNT);
    const color = new THREE.Color();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 9; // x spread
      positions[i3 + 1] = (Math.random() - 0.5) * 5.5; // y spread
      positions[i3 + 2] = (Math.random() - 0.5) * 4; // z depth

      color.set(PALETTE[i % PALETTE.length]);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // Slow, gentle drift — nothing here should read as "animated".
      speeds[i] = 0.03 + Math.random() * 0.05;
      phases[i] = Math.random() * Math.PI * 2;
    }

    return { positions, colors, speeds, phases };
  }, []);

  useFrame((state, delta) => {
    const geometry = pointsRef.current?.geometry;
    if (!geometry) return;

    const posAttr = geometry.attributes.position;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // Gentle upward drift that loops back around, like floating dust.
      let y = posAttr.array[i3 + 1] + speeds[i] * delta * 0.6;
      if (y > 2.9) y = -2.9;
      posAttr.array[i3 + 1] = y;

      // Subtle horizontal sway, unique per-particle via phase offset.
      posAttr.array[i3] += Math.sin(t * 0.25 + phases[i]) * 0.0009;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={PARTICLE_COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        vertexColors
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export default function HeroAccent() {
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleChange = (event) => setReducedMotion(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Respect reduced-motion preferences by simply not mounting the scene.
  if (reducedMotion) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
        style={{ width: "100%", height: "100%" }}
      >
        <DustMotes />
      </Canvas>
    </div>
  );
}
