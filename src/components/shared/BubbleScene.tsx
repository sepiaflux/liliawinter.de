import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useTexture } from "@react-three/drei";
import * as THREE from "three";

// Cover disc shader: stays fully opaque (so three.js samples it into the
// transmission buffer) but the fragment color mixes toward the warm pink
// BG near the disc's rim — so the photo visually dissolves into the
// bubble's iridescent edge instead of ending at a hard circle.
const COVER_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const COVER_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D map;
  uniform vec3 fadeColor;
  uniform float fadeStart;
  uniform float fadeEnd;
  uniform float dim;
  void main() {
    float r = distance(vUv, vec2(0.5)) * 2.0;
    float t = smoothstep(fadeStart, fadeEnd, r);
    vec4 tex = texture2D(map, vUv);
    vec3 col = mix(tex.rgb, fadeColor, t) * dim;
    gl_FragColor = vec4(col, 1.0);
  }
`;
const BG_PINK = new THREE.Color("#edcdd1");

// Real 3D soap bubbles. Each bubble is a transparent glass sphere with
// the three.js MeshPhysicalMaterial transmission + iridescence
// (thin-film interference). The covers no longer live inside — empty
// bubbles read cleaner as soap-film 3D objects, and the work cover
// appears in the detail view after the pop. All bubble positions are
// resolved in one central frame loop so they can softly push each other
// away instead of overlapping.

export type BubbleSpec = {
  slug: string;
  cover: string;
  cxPct: number;
  cyPct: number;
  sizeVmin?: number;
  sizeVw?: number;
  seed: number;
  depth: number;
  driftAmpFactor?: number;
};

export type BubbleTransform = {
  dx: number;     // CSS-pixel delta from the bubble's base layout position
  dy: number;     // CSS-pixel delta (positive = down, like CSS)
  scale: number;  // final scale (wobble * hover-spring * spawn-in)
  visible: boolean;
};

type Props = {
  bubbles: BubbleSpec[];
  hoverIdx: number | null;
  poppingIdx: number | null;
  mx: number;
  my: number;
  mode: "desktop" | "mobile";
  // Optional ref the parent can pass to sync DOM hitboxes / captions
  // with the bubbles' true rendered positions each frame.
  transformsRef?: React.MutableRefObject<BubbleTransform[]>;
};

export default function BubbleScene(props: Props) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 500], zoom: 1, near: 1, far: 2000 }}
      dpr={[1, 2]}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}

function Scene({ bubbles, hoverIdx, poppingIdx, mx, my, mode, transformsRef }: Props) {
  const covers = useTexture(bubbles.map((b) => b.cover));
  useEffect(() => {
    covers.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    });
  }, [covers]);

  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const matRefs = useRef<(THREE.MeshPhysicalMaterial | null)[]>([]);
  const innerMatRefs = useRef<(THREE.ShaderMaterial | null)[]>([]);
  const { size } = useThree();

  const layout = useMemo(() => {
    return bubbles.map((b) => {
      let radiusPx = 80;
      if (mode === "desktop" && b.sizeVmin) {
        radiusPx = (Math.min(size.width, size.height) * b.sizeVmin) / 100 / 2;
      } else if (mode === "mobile" && b.sizeVw) {
        radiusPx = (size.width * b.sizeVw) / 100 / 2;
      }
      const baseX = size.width * (b.cxPct / 100) - size.width / 2;
      const baseY = -(size.height * (b.cyPct / 100) - size.height / 2);
      return { radiusPx, baseX, baseY };
    });
  }, [bubbles, mode, size.width, size.height]);

  const desired = useRef<{ x: number; y: number }[]>([]);
  // Spawn-in animation: timestamp (ms) when each bubble last re-appeared
  // after being popped. 0 = no animation in progress.
  const spawnAt = useRef<number[]>([]);
  const prevPopping = useRef<number | null>(null);
  // Damped spring state for hover scale + env-light pulse (per bubble).
  // Underdamped values give the bouncy "overshoot then settle" feel.
  const hoverScale = useRef<number[]>([]);
  const hoverVel = useRef<number[]>([]);
  const lightMul = useRef<number[]>([]);
  const lightVel = useRef<number[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const speed = 0.32;
    const e = t * speed;

    if (desired.current.length !== bubbles.length) {
      desired.current = bubbles.map(() => ({ x: 0, y: 0 }));
    }
    if (spawnAt.current.length !== bubbles.length) {
      spawnAt.current = bubbles.map(() => 0);
    }
    if (hoverScale.current.length !== bubbles.length) {
      hoverScale.current = bubbles.map(() => 1);
      hoverVel.current = bubbles.map(() => 0);
      lightMul.current = bubbles.map(() => 1);
      lightVel.current = bubbles.map(() => 0);
    }

    // Detect bubble exiting pop state → trigger spawn-in animation.
    if (prevPopping.current !== null && poppingIdx === null) {
      spawnAt.current[prevPopping.current] = performance.now();
    }
    prevPopping.current = poppingIdx;

    const wobbles: number[] = [];
    const rots: number[] = [];

    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      const { radiusPx, baseX, baseY } = layout[i];
      const seed = b.seed;
      const phaseX = seed * 1.7;
      const phaseY = seed * 2.3 + 1.1;
      const phaseR = seed * 1.9 + 0.5;
      const phaseS = seed * 2.7 + 2.1;
      const ampFactor = b.driftAmpFactor ?? (mode === "desktop" ? 0.55 : 0.22);
      const amp = radiusPx * ampFactor;

      const dx =
        Math.sin(e * 0.45 + phaseX) * amp +
        Math.sin(e * 0.21 + phaseX * 2) * amp * 0.4;
      let dy =
        Math.cos(e * 0.36 + phaseY) * amp * 0.9 +
        Math.sin(e * 0.18 + phaseY * 1.5) * amp * 0.3;
      if (mode === "mobile") dy *= 0.5;

      let parX = 0;
      let parY = 0;
      if (mode === "desktop") {
        parX = (mx - 0.5) * b.depth * 90;
        parY = -(my - 0.5) * b.depth * 90;
      }

      desired.current[i].x = baseX + dx + parX;
      desired.current[i].y = baseY + dy + parY;
      rots[i] = Math.sin(e * 0.31 + phaseR) * 0.035;
      wobbles[i] = 1 + Math.sin(e * 0.27 + phaseS) * 0.015;
    }

    // Soft collision resolution — push overlapping bubbles apart.
    const margin = 8;
    for (let iter = 0; iter < 4; iter++) {
      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const pi = desired.current[i];
          const pj = desired.current[j];
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = layout[i].radiusPx + layout[j].radiusPx + margin;
          if (dist < minDist && dist > 0.0001) {
            const push = (minDist - dist) * 0.5;
            const nx = dx / dist;
            const ny = dy / dist;
            pi.x += nx * push;
            pi.y += ny * push;
            pj.x -= nx * push;
            pj.y -= ny * push;
          } else if (dist === 0) {
            pi.x += minDist * 0.5;
            pj.x -= minDist * 0.5;
          }
        }
      }
    }

    for (let i = 0; i < bubbles.length; i++) {
      const g = groupRefs.current[i];
      if (!g) continue;

      if (poppingIdx === i) {
        g.visible = false;
        if (transformsRef && transformsRef.current) {
          if (!transformsRef.current[i]) {
            transformsRef.current[i] = { dx: 0, dy: 0, scale: 0, visible: false };
          }
          transformsRef.current[i].visible = false;
          transformsRef.current[i].scale = 0;
        }
        continue;
      }
      g.visible = true;

      const isHover = hoverIdx === i;

      // --- Bouncy hover via damped spring ---
      // target=1.06 on hover, 1.0 otherwise. Underdamped → overshoots
      // past target, settles back. Same spring drives the lighting
      // pulse so the highlight feels alive with the same rhythm.
      const sTarget = isHover ? 1.06 : 1;
      const lTarget = isHover ? 1.6 : 1;
      const stiff = 0.22;
      const friction = 0.78;
      hoverVel.current[i] += (sTarget - hoverScale.current[i]) * stiff;
      hoverVel.current[i] *= friction;
      hoverScale.current[i] += hoverVel.current[i];
      lightVel.current[i] += (lTarget - lightMul.current[i]) * stiff;
      lightVel.current[i] *= friction;
      lightMul.current[i] += lightVel.current[i];

      // Spawn-in scale (0 → 1 over ~350ms with ease-out-back overshoot)
      let spawnScale = 1;
      const startedAt = spawnAt.current[i];
      if (startedAt) {
        const elapsed = (performance.now() - startedAt) / 1000;
        const dur = 0.35;
        if (elapsed < dur) {
          const k = elapsed / dur;
          const c1 = 1.70158;
          const c3 = c1 + 1;
          spawnScale = 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
        } else {
          spawnAt.current[i] = 0;
        }
      }

      const finalScale = wobbles[i] * hoverScale.current[i] * spawnScale;

      g.position.set(desired.current[i].x, desired.current[i].y, 0);
      g.rotation.z = rots[i];
      g.scale.set(finalScale, finalScale, finalScale);

      // Animate envMapIntensity with the same spring → the highlight on
      // the bubble fades up on hover and overshoots like the scale.
      const mat = matRefs.current[i];
      if (mat) mat.envMapIntensity = 2 * lightMul.current[i];

      // Publish position + scale so DOM hitboxes/captions can follow.
      if (transformsRef && transformsRef.current) {
        const { baseX, baseY } = layout[i];
        if (!transformsRef.current[i]) {
          transformsRef.current[i] = { dx: 0, dy: 0, scale: 1, visible: true };
        }
        const tr = transformsRef.current[i];
        tr.dx = desired.current[i].x - baseX;
        tr.dy = -(desired.current[i].y - baseY);
        tr.scale = finalScale;
        tr.visible = true;
      }

      // Dim non-hovered bubbles slightly via the shader's `dim` uniform.
      const innerMat = innerMatRefs.current[i];
      if (innerMat) {
        const isDim = hoverIdx !== null && !isHover && poppingIdx === null;
        const target = isDim ? 0.55 : 1;
        const dimU = innerMat.uniforms.dim;
        if (dimU) dimU.value = dimU.value + (target - dimU.value) * 0.12;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      {/* Real HDR env preset — non-negotiable for transmission +
          iridescence to actually show. sunset gives warm rainbow play
          that suits the pink BG. */}
      <Environment preset="sunset" resolution={512} background={false} />

      {bubbles.map((b, i) => (
        <Bubble3D
          key={b.slug}
          radiusPx={layout[i]?.radiusPx ?? 80}
          cover={covers[i]}
          attachGroup={(g) => {
            groupRefs.current[i] = g;
          }}
          attachMat={(m) => {
            matRefs.current[i] = m;
          }}
          attachInnerMat={(m) => {
            innerMatRefs.current[i] = m;
          }}
        />
      ))}
    </>
  );
}

// Verified soap-bubble recipe (see discourse.threejs.org / drei docs).
// Critical values: ior=1.33 (real soap film, NOT glass 1.5), thin
// thickness, iridescence with the canonical nm-thickness range,
// clearcoat=1 for the wet film, an HDR env for the rainbow.
function Bubble3D({
  radiusPx,
  cover,
  attachGroup,
  attachMat,
  attachInnerMat,
}: {
  radiusPx: number;
  cover: THREE.Texture | undefined;
  attachGroup: (g: THREE.Group | null) => void;
  attachMat: (m: THREE.MeshPhysicalMaterial | null) => void;
  attachInnerMat: (m: THREE.ShaderMaterial | null) => void;
}) {
  // Per-bubble uniforms — the shader fades the photo to the pink BG
  // toward the rim so the iridescent shell can dominate the edge.
  const uniforms = useMemo(
    () => ({
      map: { value: cover ?? null },
      fadeColor: { value: BG_PINK.clone() },
      fadeStart: { value: 0.55 },
      fadeEnd: { value: 1.0 },
      dim: { value: 1.0 },
    }),
    [cover],
  );

  return (
    <group ref={attachGroup}>
      {cover && (
        <mesh position={[0, 0, -radiusPx * 0.05]}>
          <circleGeometry args={[radiusPx * 0.99, 96]} />
          <shaderMaterial
            ref={attachInnerMat}
            uniforms={uniforms}
            vertexShader={COVER_VERT}
            fragmentShader={COVER_FRAG}
            transparent={false}
          />
        </mesh>
      )}

      <mesh>
        <sphereGeometry args={[radiusPx, 96, 96]} />
        <meshPhysicalMaterial
          ref={attachMat}
          transmission={1}
          thickness={0.05}
          roughness={0}
          metalness={0}
          ior={1.33}
          reflectivity={0.5}
          iridescence={1}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={[100, 400]}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={2}
          color="#ffffff"
          attenuationColor="#ffffff"
          transparent
          opacity={0.9}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
