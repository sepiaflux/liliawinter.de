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

  #define TAU 6.28318530718
  #define MAX_ITER 5

  // One tileable caustic layer. Two of these at different scales /
  // offsets / speeds layered on top of each other break the periodicity
  // so the result looks organic rather than geometric.
  float causticLayer(vec2 uv, float t) {
    vec2 p = mod(uv * TAU, TAU) - 250.0;
    vec2 i = vec2(p);
    float c = 1.0;
    float inten = 0.005;
    for (int n = 0; n < MAX_ITER; n++) {
      float tn = t * (1.0 - (3.5 / float(n + 1)));
      i = p + vec2(
        cos(tn - i.x) + sin(tn + i.y),
        sin(tn - i.y) + cos(tn + i.x)
      );
      c += 1.0 / length(vec2(
        p.x / (sin(i.x + tn) / inten),
        p.y / (cos(i.y + tn) / inten)
      ));
    }
    c /= float(MAX_ITER);
    c = 1.17 - pow(c, 1.4);
    return clamp(pow(abs(c), 5.0), 0.0, 1.0);
  }

  void main() {
    vec2 uv = vUv * vec2(iResolution.x / iResolution.y, 1.0);
    float t = iTime * 0.55;

    // Two layered caustics — different scales + offsets + speeds.
    float a = causticLayer(uv * 1.35, t);
    float b = causticLayer(uv * 0.72 + vec2(0.43, 0.31), t * 0.78);
    float bright = clamp((a + b) * 0.6, 0.0, 1.0);

    vec3 col = vec3(1.0, 0.98, 0.97) * bright;
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
        opacity: 0.26,
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
