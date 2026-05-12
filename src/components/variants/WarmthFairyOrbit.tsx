import { useEffect, useRef } from "react";
import type { Work } from "../../data/works";
import DriftBase from "../shared/DriftBase";
import { WarmthLayer } from "../shared/WarmthLayer";
import { WarmthTile } from "../shared/WarmthTile";

// ---- Particle pool ----------------------------------------------------------
// A small persistent swarm orbits the cursor while it moves. When the cursor
// stops for >500ms the cloud slowly expands outward and fades. When motion
// resumes, particles fade back in. Each particle has its own radius, angular
// speed, phase, and vertical bob, so the cloud feels alive.

const POOL_SIZE = 30; // pool cap ~30 active
const ACTIVE_TARGET = 25; // ~25 persistent particles per session
const IDLE_THRESHOLD_MS = 500;
const DISSIPATE_FADE_MS = 1500;
const DISSIPATE_RADIUS_PER_S = 30; // px/s expansion when idle
const SMOOTHING = 0.18; // orbit center lerp factor per frame (~60fps)

type Particle = {
  node: HTMLDivElement;
  alive: boolean;
  // Orbit params.
  radius: number; // current radius from orbit center
  baseRadius: number; // radius set on spawn (used while active)
  angularSpeed: number; // rad/s, signed
  phase: number; // initial angle (rad)
  bobAmp: number; // vertical bob amplitude (px)
  bobFreq: number; // rad/s
  bobPhase: number; // rad
  // Per-particle envelope.
  born: number; // ms timestamp
  fadeInMs: number;
  peak: number; // peak opacity 0..1
  // Dissipating state — when cursor has been idle this particle starts to
  // expand outward and fade.
  dissipating: boolean;
  dissipateStart: number; // ms timestamp of dissipation onset
  size: number;
};

const PALETTES = [
  // sage / mint / palest seafoam
  "#a8c0b0",
  "#b8d8c8",
  "#d0e0d8",
  // occasional cream
  "#ece4d4",
];

function pickColor(rand: number): string {
  // ~15% cream; otherwise distribute over sage/mint/seafoam.
  if (rand > 0.85) return PALETTES[3];
  const i = Math.floor(rand * 3);
  return PALETTES[i];
}

function FairyOrbitField() {
  const rootRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const root = rootRef.current;
    if (!root) return;

    const pool: Particle[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.top = "0";
      el.style.left = "0";
      el.style.borderRadius = "50%";
      el.style.pointerEvents = "none";
      el.style.willChange = "transform, opacity";
      el.style.opacity = "0";
      el.style.mixBlendMode = "screen";
      root.appendChild(el);
      pool.push({
        node: el,
        alive: false,
        radius: 24,
        baseRadius: 24,
        angularSpeed: 0,
        phase: 0,
        bobAmp: 0,
        bobFreq: 0,
        bobPhase: 0,
        born: 0,
        fadeInMs: 400,
        peak: 0.7,
        dissipating: false,
        dissipateStart: 0,
        size: 2,
      });
    }
    particlesRef.current = pool;

    function styleParticle(p: Particle) {
      const color = pickColor(Math.random());
      const s = p.size;
      const glow = Math.round(5 + Math.random() * 3); // 5..8
      p.node.style.width = `${s}px`;
      p.node.style.height = `${s}px`;
      p.node.style.marginLeft = `-${s / 2}px`;
      p.node.style.marginTop = `-${s / 2}px`;
      p.node.style.background = color;
      p.node.style.boxShadow = `0 0 ${glow}px ${Math.max(1, glow - 3)}px ${color}`;
    }

    function reviveParticle(p: Particle, nowMs: number) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      p.alive = true;
      p.size = 1.5 + Math.random() * 1.5; // 1.5..3
      p.baseRadius = 12 + Math.random() * 36; // 12..48
      p.radius = p.baseRadius;
      p.angularSpeed = dir * (1.5 + Math.random() * 1.5); // ±1.5..3
      p.phase = Math.random() * Math.PI * 2;
      p.bobAmp = 1 + Math.random() * 3; // 1..4 px
      p.bobFreq = 1 + Math.random() * 2; // 1..3 rad/s
      p.bobPhase = Math.random() * Math.PI * 2;
      p.born = nowMs;
      p.fadeInMs = 350 + Math.random() * 350; // 350..700
      p.peak = 0.55 + Math.random() * 0.2; // 0.55..0.75
      p.dissipating = false;
      p.dissipateStart = 0;
      styleParticle(p);
    }

    // Orbit-center state. Lerped toward the latest cursor for smoothness.
    const center = { x: 0, y: 0, initialized: false };
    const cursor = { x: 0, y: 0, lastMove: 0, seen: false };

    function onMove(e: MouseEvent) {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      cursor.lastMove = performance.now();
      if (!cursor.seen) {
        cursor.seen = true;
        center.x = e.clientX;
        center.y = e.clientY;
        center.initialized = true;
      }
    }

    window.addEventListener("mousemove", onMove, { passive: true });

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;

      // Lerp orbit center toward cursor.
      if (center.initialized) {
        center.x += (cursor.x - center.x) * SMOOTHING;
        center.y += (cursor.y - center.y) * SMOOTHING;
      }

      const idleMs = cursor.seen ? now - cursor.lastMove : Infinity;
      const idle = idleMs > IDLE_THRESHOLD_MS;

      // Count alive non-dissipating particles.
      let activeCount = 0;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (p.alive && !p.dissipating) activeCount++;
      }

      if (cursor.seen) {
        if (!idle) {
          // Refill toward ACTIVE_TARGET, one per frame to feel organic.
          if (activeCount < ACTIVE_TARGET) {
            for (let i = 0; i < pool.length; i++) {
              const p = pool[i];
              if (!p.alive) {
                reviveParticle(p, now);
                break;
              }
            }
          }
        } else {
          // Cursor idle — mark active particles as dissipating progressively.
          // We tag them all once; their fade timer is per-particle from this
          // moment. Subsequent idle frames are no-ops for already-dissipating.
          for (let i = 0; i < pool.length; i++) {
            const p = pool[i];
            if (p.alive && !p.dissipating) {
              p.dissipating = true;
              p.dissipateStart = now;
            }
          }
        }
      }

      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (!p.alive) continue;

        const age = now - p.born;

        // Update radius (expand if dissipating).
        if (p.dissipating) {
          p.radius += DISSIPATE_RADIUS_PER_S * dt;
        }

        // Orbit position.
        const tSec = age / 1000;
        const a = p.phase + p.angularSpeed * tSec;
        const bob = Math.sin(p.bobPhase + p.bobFreq * tSec) * p.bobAmp;
        const x = center.x + Math.cos(a) * p.radius;
        const y = center.y + Math.sin(a) * p.radius + bob;

        // Opacity envelope.
        const fadeIn = Math.min(1, age / p.fadeInMs);
        let opacity = p.peak * fadeIn;

        if (p.dissipating) {
          const since = now - p.dissipateStart;
          const fadeOut = Math.max(0, 1 - since / DISSIPATE_FADE_MS);
          opacity *= fadeOut;
          if (since >= DISSIPATE_FADE_MS) {
            p.alive = false;
            p.node.style.opacity = "0";
            continue;
          }
        }

        p.node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        p.node.style.opacity = opacity.toFixed(3);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      for (const p of pool) {
        if (p.node.parentNode === root) root.removeChild(p.node);
      }
      particlesRef.current = [];
    };
  }, []);

  return (
    <div
      ref={rootRef}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}

export default function WarmthFairyOrbit({ works }: { works: Work[] }) {
  return (
    <DriftBase
      works={works}
      Tile={WarmthTile}
      background={(ctx) => (
        <>
          <WarmthLayer mx={ctx.mx} my={ctx.my} />
          <FairyOrbitField />
        </>
      )}
    />
  );
}
