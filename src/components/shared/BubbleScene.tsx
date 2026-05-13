import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Perf } from "r3f-perf";

// Cover disc shader: stays IN FRONT of the bubble (no refraction) and
// fades to fully transparent toward the rim — so the iridescent bubble
// shell underneath is visible at the edges instead of being painted
// over by a hard or pink-tinted disc.
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
  uniform float fadeStart;
  uniform float fadeEnd;
  uniform float dim;
  uniform float imageAspect; // texture width / height
  void main() {
    // CSS "object-fit: cover" — preserve image aspect, crop the
    // overflowing axis so the photo never appears stretched.
    vec2 sampleUv;
    if (imageAspect > 1.0) {
      sampleUv = vec2(0.5 + (vUv.x - 0.5) / imageAspect, vUv.y);
    } else {
      sampleUv = vec2(vUv.x, 0.5 + (vUv.y - 0.5) * imageAspect);
    }
    float r = distance(vUv, vec2(0.5)) * 2.0;
    float alpha = 1.0 - smoothstep(fadeStart, fadeEnd, r);
    vec4 tex = texture2D(map, sampleUv);
    gl_FragColor = vec4(tex.rgb * dim, tex.a * alpha);
  }
`;

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
  // When this becomes true, bubbles pop in one after another with a
  // small stagger. Used to play the intro sequence once assets are
  // preloaded.
  startInitialSpawn?: boolean;
};

export default function BubbleScene(props: Props) {
  const dpr: [number, number] =
    props.mode === "mobile" ? [1, 1.5] : [1, 2];
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 500], zoom: 1, near: 1, far: 2000 }}
      dpr={dpr}
      gl={{
        alpha: true,
        antialias: false,
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
        {import.meta.env.DEV && <Perf position="top-left" />}
      </Suspense>
    </Canvas>
  );
}

function Scene({
  bubbles,
  hoverIdx,
  poppingIdx,
  mx,
  my,
  mode,
  transformsRef,
  startInitialSpawn,
}: Props) {
  const covers = useTexture(bubbles.map((b) => b.cover));
  useEffect(() => {
    covers.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 2;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
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
  // Spawn-in animation: timestamp (ms) when each bubble should start
  // its 0→1 scale-in. May be a future timestamp (for stagger). 0 = no
  // animation pending or active.
  const spawnAt = useRef<number[]>([]);
  const introFired = useRef(false);
  const prevPopping = useRef<number | null>(null);
  // Damped spring state for hover scale + env-light pulse (per bubble).
  // Underdamped values give the bouncy "overshoot then settle" feel.
  const hoverScale = useRef<number[]>([]);
  const hoverVel = useRef<number[]>([]);
  const lightMul = useRef<number[]>([]);
  const lightVel = useRef<number[]>([]);

  useFrame(({ clock }) => {
    // Skip all per-frame work when the tab is hidden — saves battery
    // and CPU while the user is on another tab.
    if (typeof document !== "undefined" && document.hidden) return;
    const t = clock.getElapsedTime();
    const speed = 0.32;
    const e = t * speed;

    if (desired.current.length !== bubbles.length) {
      desired.current = bubbles.map(() => ({ x: 0, y: 0 }));
    }
    if (spawnAt.current.length !== bubbles.length) {
      spawnAt.current = bubbles.map(() => 0);
    }

    // Trigger the intro stagger exactly once, after the parent signals
    // "assets ready". Each bubble gets a small offset so they pop in
    // one after another.
    if (startInitialSpawn && !introFired.current && bubbles.length > 0) {
      introFired.current = true;
      const now = performance.now();
      for (let i = 0; i < bubbles.length; i++) {
        spawnAt.current[i] = now + i * 90;
      }
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
        parX = (mx - 0.5) * b.depth * 60;
        parY = -(my - 0.5) * b.depth * 60;
      }

      desired.current[i].x = baseX + dx + parX;
      desired.current[i].y = baseY + dy + parY;
      rots[i] = Math.sin(e * 0.31 + phaseR) * 0.035;
      wobbles[i] = 1 + Math.sin(e * 0.27 + phaseS) * 0.015;
    }

    // Soft collision resolution + viewport clamp (desktop). Iterating
    // both keeps each bubble fully on-screen even when push from
    // collisions would otherwise spill it past the viewport edge.
    const margin = 8;
    const halfW = size.width / 2;
    const halfH = size.height / 2;
    const clampDesktop = mode === "desktop";
    for (let iter = 0; iter < 5; iter++) {
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
      if (clampDesktop) {
        for (let i = 0; i < bubbles.length; i++) {
          const r = layout[i].radiusPx;
          const p = desired.current[i];
          if (p.x < -halfW + r) p.x = -halfW + r;
          else if (p.x > halfW - r) p.x = halfW - r;
          if (p.y < -halfH + r) p.y = -halfH + r;
          else if (p.y > halfH - r) p.y = halfH - r;
        }
      }
    }

    for (let i = 0; i < bubbles.length; i++) {
      const g = groupRefs.current[i];
      if (!g) continue;

      if (poppingIdx === i) {
        g.visible = false;
        // Don't touch transformsRef — the wrapper keeps its last frame's
        // transform so PopDroplets render exactly where the bubble was,
        // at its last drifted position + scale.
        continue;
      }
      g.visible = true;

      const isHover = hoverIdx === i;

      // --- Bouncy hover via damped spring ---
      // Bigger scale + brighter envMap on the hovered bubble make it
      // visibly stand out. Underdamped spring overshoots past target,
      // settles back.
      const sTarget = isHover ? 1.1 : 1;
      const lTarget = isHover ? 2.4 : 1;
      const stiff = 0.22;
      const friction = 0.78;
      hoverVel.current[i] += (sTarget - hoverScale.current[i]) * stiff;
      hoverVel.current[i] *= friction;
      hoverScale.current[i] += hoverVel.current[i];
      lightVel.current[i] += (lTarget - lightMul.current[i]) * stiff;
      lightVel.current[i] *= friction;
      lightMul.current[i] += lightVel.current[i];

      // Spawn-in scale (0 → 1 over ~350ms with ease-out-back overshoot).
      // If startedAt is in the future (intro stagger), we stay at 0.
      let spawnScale = 1;
      const startedAt = spawnAt.current[i];
      if (startedAt) {
        const elapsed = (performance.now() - startedAt) / 1000;
        const dur = 0.35;
        if (elapsed < 0) {
          spawnScale = 0;
        } else if (elapsed < dur) {
          const k = elapsed / dur;
          const c1 = 1.70158;
          const c3 = c1 + 1;
          spawnScale = 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
        } else {
          spawnAt.current[i] = 0;
        }
      }

      const finalScale = wobbles[i] * hoverScale.current[i] * spawnScale;

      // Hovered bubble gets pushed toward the camera so it sorts in
      // front of every other bubble (transparent pass renders far→near).
      g.position.set(desired.current[i].x, desired.current[i].y, isHover ? 50 : 0);
      g.rotation.z = rots[i];
      g.scale.set(finalScale, finalScale, finalScale);

      // Animate envMapIntensity with the same spring → the highlight on
      // the bubble fades up on hover and overshoots like the scale.
      const mat = matRefs.current[i];
      if (mat) mat.envMapIntensity = 3.5 * lightMul.current[i];

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

      // Cover-dim uniform: the hovered bubble brightens slightly, the
      // others dim only a touch (so the selection stands out, not the
      // non-selected greying out aggressively).
      const innerMat = innerMatRefs.current[i];
      if (innerMat) {
        const isDim = hoverIdx !== null && !isHover && poppingIdx === null;
        const target = isHover ? 1.12 : isDim ? 0.92 : 1;
        const dimU = innerMat.uniforms.dim;
        if (dimU) dimU.value = dimU.value + (target - dimU.value) * 0.12;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      {/* HDR env preset — drives the iridescent rim and clearcoat
          highlights. 256 keeps the specular highlight crisp (iridescence
          itself is low-frequency, but clearcoat needs sharper reflections
          to look like wet film). */}
      <Environment preset="sunset" resolution={256} background={false} />

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
  // Per-bubble uniforms — the shader alpha-fades the photo toward the
  // rim and aspect-corrects (object-fit: cover) so the photo is never
  // stretched into the disc's square UV space.
  const uniforms = useMemo(() => {
    let aspect = 1;
    const img = cover?.image as
      | { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number }
      | undefined;
    if (img) {
      const w = img.naturalWidth ?? img.width ?? 1;
      const h = img.naturalHeight ?? img.height ?? 1;
      if (w > 0 && h > 0) aspect = w / h;
    }
    return {
      map: { value: cover ?? null },
      fadeStart: { value: 0.6 },
      fadeEnd: { value: 1.0 },
      dim: { value: 1.0 },
      imageAspect: { value: aspect },
    };
  }, [cover]);

  return (
    <group ref={attachGroup}>
      {/* Soap-film shell — iridescence + clearcoat carry the entire
          look. We dropped transmission (which forced a full extra scene
          render per bubble per frame) since the cover disc sits in
          front anyway; the bubble's only see-through area is the rim,
          handled by alpha + Fresnel-ish opacity. */}
      <mesh renderOrder={0}>
        <sphereGeometry args={[radiusPx, 48, 32]} />
        <meshPhysicalMaterial
          ref={attachMat}
          roughness={0}
          metalness={0}
          ior={1.33}
          reflectivity={0.5}
          iridescence={1}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={[100, 400]}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={3.5}
          color="#ffffff"
          transparent
          opacity={0.8}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Cover disc — sits IN FRONT of the bubble and fades to
          transparent at the rim so the iridescent shell stays visible
          at the edges. */}
      {cover && (
        <mesh position={[0, 0, radiusPx * 1.02]} renderOrder={1}>
          <circleGeometry args={[radiusPx * 0.99, 48]} />
          <shaderMaterial
            ref={attachInnerMat}
            uniforms={uniforms}
            vertexShader={COVER_VERT}
            fragmentShader={COVER_FRAG}
            transparent
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
