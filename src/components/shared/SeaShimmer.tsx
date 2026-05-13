import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

// Subtle sea-surface caustics behind the bubbles. Uses the classic
// tileable water-caustic fragment shader (Dave Hoskins / well-known
// Shadertoy form) — five iterations of cos/sin perturbation of a tiled
// domain — instead of fractal noise, so the highlights actually curve
// and dance like light through water.
//
// Rendered into a tiny dedicated R3F canvas, applied with
// mix-blend-mode: screen + low opacity so it only lifts the warm pink
// background's brightest streaks.

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); // fullscreen quad
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float iTime;
  uniform vec2 iResolution;

  // IQ-style domain-warped fBM. The key trick is the rotation per
  // octave (mat2(0.8, 0.6, -0.6, 0.8)) which decorrelates octaves so
  // the result has no visible tiling AND distributes evenly across the
  // full canvas (no bottom-corner clustering).

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p = rot * p * 2.0 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }
  // Warp-of-warp — Inigo Quilez's domain warping pattern.
  float pattern(vec2 p, float t) {
    vec2 q = vec2(
      fbm(p + vec2(0.0, 0.0) + 0.05 * t),
      fbm(p + vec2(5.2, 1.3) - 0.04 * t)
    );
    vec2 r = vec2(
      fbm(p + 4.0 * q + vec2(1.7, 9.2) + 0.03 * t),
      fbm(p + 4.0 * q + vec2(8.3, 2.8) - 0.02 * t)
    );
    return fbm(p + 4.0 * r);
  }

  void main() {
    vec2 uv = vUv * vec2(iResolution.x / iResolution.y, 1.0);
    float v = pattern(uv * 2.5, iTime * 0.9);

    // Wide threshold + soft start so a large portion of the canvas
    // carries some shimmer, not just a few hot spots.
    float bright = smoothstep(0.35, 0.7, v);

    // Soft warm-pink tint instead of pure white → doesn't feel "too
    // white" under the blend mode.
    vec3 col = vec3(1.0, 0.93, 0.93) * bright;
    gl_FragColor = vec4(col, bright);
  }
`;

function Plane() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock, size }) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.iTime.value = clock.elapsedTime;
    m.uniforms.iResolution.value.set(size.width, size.height);
  });
  return (
    <mesh>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthWrite={false}
        uniforms={{
          iTime: { value: 0 },
          iResolution: { value: new THREE.Vector2(1, 1) },
        }}
      />
    </mesh>
  );
}

export default function SeaShimmer() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        mixBlendMode: "screen",
        opacity: 0.15,
        filter: "blur(1.5px)",
      }}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1] }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Plane />
      </Canvas>
    </div>
  );
}
