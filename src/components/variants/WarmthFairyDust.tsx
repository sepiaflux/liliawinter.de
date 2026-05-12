import { useEffect, useRef } from "react";
import type { Work } from "../../data/works";
import DriftBase from "../shared/DriftBase";
import { WarmthLayer } from "../shared/WarmthLayer";
import { WarmthTile } from "../shared/WarmthTile";

// ---- Particle pool ----------------------------------------------------------
// We allocate a fixed pool of DOM nodes and recycle them. Each particle's
// transform/opacity is written directly via the ref each frame; no React
// state per frame.

const MAX_PARTICLES = 120;

type Particle = {
  node: HTMLDivElement;
  alive: boolean;
  // px coordinates, viewport relative.
  x: number;
  y: number;
  vx: number; // px/s
  vy: number; // px/s
  born: number; // ms timestamp
  life: number; // ms
  peak: number; // peak opacity 0..1
  twinkleAt: number; // ms offset from birth where twinkle peaks
  size: number;
};

const PALETTES = [
  // pale gold band
  "#f4d8a0",
  "#f7dfae",
  "#fbe7bf",
  "#fff0cf",
  "#fff4d1",
  // occasional ivory
  "#fffaef",
];

function pickColor(rand: number): string {
  // 18% chance of ivory; otherwise weighted toward warmer gold.
  if (rand > 0.82) return PALETTES[5];
  const i = Math.floor(rand * 5);
  return PALETTES[i];
}

function FairyDustField() {
  const rootRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const cursorRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const lastEmitRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const root = rootRef.current;
    if (!root) return;

    // Build the pool once.
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
        vx: 0,
        vy: 0,
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
      // 1px-ish core sits on top of a softer blur disc via boxShadow.
      const s = p.size;
      const glow = Math.round(4 + Math.random() * 2); // 4..6
      p.node.style.width = `${s}px`;
      p.node.style.height = `${s}px`;
      p.node.style.marginLeft = `-${s / 2}px`;
      p.node.style.marginTop = `-${s / 2}px`;
      p.node.style.background = color;
      p.node.style.boxShadow = `0 0 ${glow}px ${Math.max(1, glow - 3)}px ${color}`;
    }

    function spawnAt(px: number, py: number, nowMs: number) {
      // Find a dead particle slot.
      let slot: Particle | null = null;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].alive) {
          slot = pool[i];
          break;
        }
      }
      if (!slot) return; // pool exhausted — drop emission this frame.

      const size = 1.5 + Math.random() * 2; // 1.5..3.5
      const vx = (Math.random() - 0.5) * 80; // ±40 px/s
      const vy = 30 + Math.random() * 50; // 30..80 px/s downward
      const life = 1000 + Math.random() * 800; // 1.0..1.8s
      const peak = 0.6 + Math.random() * 0.2; // 0.6..0.8
      // Twinkle somewhere in the middle of the life so it doesn't collide with
      // fade-in or fade-out windows.
      const twinkleAt = 250 + Math.random() * (life - 700);

      slot.alive = true;
      slot.x = px;
      slot.y = py;
      slot.vx = vx;
      slot.vy = vy;
      slot.born = nowMs;
      slot.life = life;
      slot.peak = peak;
      slot.twinkleAt = twinkleAt;
      slot.size = size;
      styleParticle(slot);
    }

    function onMove(e: MouseEvent) {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
      cursorRef.current.active = true;

      const now = performance.now();
      // Throttle emissions slightly so a single fast flick doesn't drain the
      // pool — but keep it responsive (≈60Hz).
      if (now - lastEmitRef.current < 14) return;
      lastEmitRef.current = now;

      const count = Math.random() < 0.5 ? 1 : 2;
      for (let i = 0; i < count; i++) {
        // Tiny jitter around the raw cursor position so it doesn't look
        // like one line.
        const jx = (Math.random() - 0.5) * 4;
        const jy = (Math.random() - 0.5) * 4;
        spawnAt(e.clientX + jx, e.clientY + jy, now);
      }
    }

    window.addEventListener("mousemove", onMove, { passive: true });

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(50, now - last) / 1000; // s, clamped
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

        // Integrate.
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Tiny gravity-ish settle so they drift down slightly more over time.
        p.vy += 12 * dt;
        // Horizontal damping — they bleed sideways momentum.
        p.vx *= 1 - 0.6 * dt;

        // Opacity envelope: 100ms fade-in, hold, 500ms fade-out.
        const fadeIn = Math.min(1, age / 100);
        const fadeOut = Math.min(1, (p.life - age) / 500);
        let opacity = p.peak * fadeIn * fadeOut;

        // Twinkle bump centred at p.twinkleAt, width 120ms.
        const td = age - p.twinkleAt;
        if (td > -60 && td < 60) {
          const k = 1 - Math.abs(td) / 60; // 0..1 triangular
          // Smooth via sin envelope so the spike feels lit, not blocky.
          const spike = Math.sin(k * Math.PI * 0.5);
          // Push toward ~0.95, clipped.
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
      // Detach DOM nodes.
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

export default function WarmthFairyDust({ works }: { works: Work[] }) {
  return (
    <DriftBase
      works={works}
      Tile={WarmthTile}
      background={(ctx) => (
        <>
          <WarmthLayer mx={ctx.mx} my={ctx.my} />
          <FairyDustField />
        </>
      )}
    />
  );
}
