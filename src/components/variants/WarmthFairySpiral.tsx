import { useEffect, useRef } from "react";
import type { Work } from "../../data/works";
import DriftBase from "../shared/DriftBase";
import { WarmthLayer } from "../shared/WarmthLayer";
import { WarmthTile } from "../shared/WarmthTile";

// ---- Particle pool ----------------------------------------------------------
// Particles spawn at the cursor, spiral around it for ~1.0–1.4s, then get
// flung outward and drift to fade. Each particle is a recycled DOM node.

const MAX_PARTICLES = 100;

type Particle = {
  node: HTMLDivElement;
  alive: boolean;
  // Live world position (px, viewport relative).
  x: number;
  y: number;
  // Orbit center captured at spawn.
  cursorX: number;
  cursorY: number;
  // Orbit params.
  radius0: number; // initial radius from cursor (px)
  angularSpeed: number; // rad/s (signed)
  phase: number; // initial angle (rad)
  orbitDuration: number; // ms — how long the orbit phase lasts
  // Post-release ballistics.
  vx: number; // px/s, set on release
  vy: number; // px/s, set on release
  released: boolean;
  // Lifetime.
  born: number; // ms timestamp
  life: number; // ms total
  peak: number; // peak opacity 0..1
  twinkleAt: number; // ms offset from birth where twinkle peaks
  size: number;
};

const PALETTES = [
  // rose / plum / lilac band
  "#e8b8c8",
  "#c8a8d0",
  "#b8a8d8",
  // occasional mauve
  "#a89098",
];

function pickColor(rand: number): string {
  // ~15% mauve; otherwise even split rose/plum/lilac.
  if (rand > 0.85) return PALETTES[3];
  const i = Math.floor(rand * 3);
  return PALETTES[i];
}

function FairySpiralField() {
  const rootRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastEmitRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const root = rootRef.current;
    if (!root) return;

    const pool: Particle[] = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
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
        x: 0,
        y: 0,
        cursorX: 0,
        cursorY: 0,
        radius0: 0,
        angularSpeed: 0,
        phase: 0,
        orbitDuration: 0,
        vx: 0,
        vy: 0,
        released: false,
        born: 0,
        life: 0,
        peak: 0,
        twinkleAt: 0,
        size: 2,
      });
    }
    particlesRef.current = pool;

    function styleParticle(p: Particle) {
      const color = pickColor(Math.random());
      const s = p.size;
      const glow = Math.round(4 + Math.random() * 2); // 4..6
      p.node.style.width = `${s}px`;
      p.node.style.height = `${s}px`;
      p.node.style.marginLeft = `-${s / 2}px`;
      p.node.style.marginTop = `-${s / 2}px`;
      p.node.style.background = color;
      p.node.style.boxShadow = `0 0 ${glow}px ${Math.max(1, glow - 3)}px ${color}`;
    }

    function spawnAt(cx: number, cy: number, nowMs: number) {
      let slot: Particle | null = null;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].alive) {
          slot = pool[i];
          break;
        }
      }
      if (!slot) return;

      const size = 1.5 + Math.random() * 1.5; // 1.5..3
      const radius0 = 6 + Math.random() * 8; // 6..14
      // ±2.5..±4.0 rad/s, sign random.
      const dir = Math.random() < 0.5 ? -1 : 1;
      const angularSpeed = dir * (2.5 + Math.random() * 1.5);
      const phase = Math.random() * Math.PI * 2;
      const orbitDuration = 1000 + Math.random() * 400; // 1.0..1.4s
      const life = 2500; // total ~2.5s
      const peak = 0.6 + Math.random() * 0.2;
      // Twinkle mid-orbit.
      const twinkleAt = orbitDuration * (0.4 + Math.random() * 0.3);

      slot.alive = true;
      slot.cursorX = cx;
      slot.cursorY = cy;
      slot.x = cx + Math.cos(phase) * radius0;
      slot.y = cy + Math.sin(phase) * radius0;
      slot.radius0 = radius0;
      slot.angularSpeed = angularSpeed;
      slot.phase = phase;
      slot.orbitDuration = orbitDuration;
      slot.vx = 0;
      slot.vy = 0;
      slot.released = false;
      slot.born = nowMs;
      slot.life = life;
      slot.peak = peak;
      slot.twinkleAt = twinkleAt;
      slot.size = size;
      styleParticle(slot);
    }

    function onMove(e: MouseEvent) {
      const now = performance.now();
      // Rate-limit: 1 particle ~every 50ms.
      if (now - lastEmitRef.current < 50) return;
      lastEmitRef.current = now;
      spawnAt(e.clientX, e.clientY, now);
    }

    window.addEventListener("mousemove", onMove, { passive: true });

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;

      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (!p.alive) continue;
        const age = now - p.born;
        if (age >= p.life) {
          p.alive = false;
          p.node.style.opacity = "0";
          continue;
        }

        if (!p.released && age < p.orbitDuration) {
          // Orbit phase: radius grows from radius0 -> ~50px over orbitDuration.
          const tSec = age / 1000;
          const orbitSec = p.orbitDuration / 1000;
          const expansion = (50 - p.radius0) * (age / p.orbitDuration); // linear grow
          const r = p.radius0 + expansion;
          const a = p.phase + p.angularSpeed * tSec;
          const nx = p.cursorX + Math.cos(a) * r;
          const ny = p.cursorY + Math.sin(a) * r;

          // Track velocity (for release): finite-difference current vs prev.
          if (dt > 0) {
            p.vx = (nx - p.x) / dt;
            p.vy = (ny - p.y) / dt;
          }
          p.x = nx;
          p.y = ny;

          // Clamp release velocity at end of orbit phase.
          if (age + dt * 1000 >= p.orbitDuration) {
            // soft cap to keep the fling tasteful.
            const speed = Math.hypot(p.vx, p.vy);
            const maxSpeed = 220;
            if (speed > maxSpeed) {
              p.vx = (p.vx / speed) * maxSpeed;
              p.vy = (p.vy / speed) * maxSpeed;
            }
            // Treat orbitSec usage to avoid lint unused.
            void orbitSec;
          }
        } else {
          // Ballistic drift with drag.
          if (!p.released) p.released = true;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          // Slow drag.
          p.vx *= 1 - 0.8 * dt;
          p.vy *= 1 - 0.8 * dt;
          // Tiny settle downward.
          p.vy += 10 * dt;
        }

        // Opacity envelope: 120ms fade-in, hold, 600ms fade-out.
        const fadeIn = Math.min(1, age / 120);
        const fadeOut = Math.min(1, (p.life - age) / 600);
        let opacity = p.peak * fadeIn * fadeOut;

        // Twinkle bump.
        const td = age - p.twinkleAt;
        if (td > -70 && td < 70) {
          const k = 1 - Math.abs(td) / 70;
          const spike = Math.sin(k * Math.PI * 0.5);
          opacity = Math.min(0.95, opacity + (0.95 - opacity) * spike);
        }

        p.node.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
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

export default function WarmthFairySpiral({ works }: { works: Work[] }) {
  return (
    <DriftBase
      works={works}
      Tile={WarmthTile}
      background={(ctx) => (
        <>
          <WarmthLayer mx={ctx.mx} my={ctx.my} />
          <FairySpiralField />
        </>
      )}
    />
  );
}
