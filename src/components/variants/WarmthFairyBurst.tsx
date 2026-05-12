import { useEffect, useRef } from "react";
import type { Work } from "../../data/works";
import DriftBase from "../shared/DriftBase";
import { WarmthLayer } from "../shared/WarmthLayer";
import { WarmthTile } from "../shared/WarmthTile";

// ---- Particle pool ----------------------------------------------------------
// Burst variant: rhythmic timer-driven pulse rings emitted from the current
// cursor position. Each burst is a radial cluster that drifts outward with
// drag. The first frames of each particle flash brightly so the burst reads
// as a quick pulse of light.

const MAX_PARTICLES = 80;
const BURST_MIN_MS = 600;
const BURST_MAX_MS = 800;

type Particle = {
  node: HTMLDivElement;
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  peak: number;
  size: number;
};

const PALETTES = [
  // pearl + palest gold-cream (no bright yellow) + silver-blush
  "#ede8de",
  "#ece4ce",
  "#d8d0c8",
];

function pickColor(rand: number): string {
  const i = Math.min(2, Math.floor(rand * 3));
  return PALETTES[i];
}

function FairyBurstField() {
  const rootRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const cursorRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const nextBurstRef = useRef<number>(0);

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
        vx: 0,
        vy: 0,
        born: 0,
        life: 0,
        peak: 0,
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

    function spawnRadial(px: number, py: number, angle: number, speed: number, nowMs: number) {
      let slot: Particle | null = null;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].alive) {
          slot = pool[i];
          break;
        }
      }
      if (!slot) return;

      const size = 2 + Math.random() * 1.5; // 2..3.5
      const life = 1600 + Math.random() * 600; // 1.6..2.2s
      const peak = 0.55 + Math.random() * 0.2; // 0.55..0.75
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      slot.alive = true;
      slot.x = px;
      slot.y = py;
      slot.vx = vx;
      slot.vy = vy;
      slot.born = nowMs;
      slot.life = life;
      slot.peak = peak;
      slot.size = size;
      styleParticle(slot);
    }

    function emitBurst(nowMs: number) {
      if (!cursorRef.current.active) return;
      const cx = cursorRef.current.x;
      const cy = cursorRef.current.y;
      const n = 6 + Math.floor(Math.random() * 5); // 6..10
      const step = (Math.PI * 2) / n;
      // Random global rotation so consecutive bursts don't line up.
      const phase = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        // Even angles + small jitter.
        const angle = phase + i * step + (Math.random() - 0.5) * step * 0.4;
        const speed = 40 + Math.random() * 40; // 40..80 px/s
        spawnRadial(cx, cy, angle, speed, nowMs);
      }
    }

    function onMove(e: MouseEvent) {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
      cursorRef.current.active = true;
    }

    window.addEventListener("mousemove", onMove, { passive: true });

    // Schedule the first burst slightly in the future so we wait for the
    // pointer to have a position.
    nextBurstRef.current = performance.now() + BURST_MIN_MS;

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;

      // Timer-driven burst.
      if (now >= nextBurstRef.current) {
        emitBurst(now);
        nextBurstRef.current =
          now + BURST_MIN_MS + Math.random() * (BURST_MAX_MS - BURST_MIN_MS);
      }

      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (!p.alive) continue;
        const age = now - p.born;
        if (age >= p.life) {
          p.alive = false;
          p.node.style.opacity = "0";
          continue;
        }

        // Integrate — radial outward motion with drag, no gravity.
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Drag — slows the burst as it spreads.
        const drag = 1.1;
        p.vx *= 1 - drag * dt;
        p.vy *= 1 - drag * dt;

        // Opacity envelope: 100ms fade-in (the "appearance"), steady mid,
        // then a long 600ms fade-out at the tail.
        const fadeIn = Math.min(1, age / 100);
        const fadeOut = Math.min(1, (p.life - age) / 600);
        let opacity = p.peak * fadeIn * fadeOut;

        // Birth flash — the moment of the burst spikes near-white so the
        // whole ring reads as a single flash of light.
        if (age < 140) {
          // 0..1 over first ~70ms then back down by ~140ms.
          const k =
            age < 70 ? age / 70 : Math.max(0, 1 - (age - 70) / 70);
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

export default function WarmthFairyBurst({ works }: { works: Work[] }) {
  return (
    <DriftBase
      works={works}
      Tile={WarmthTile}
      background={(ctx) => (
        <>
          <WarmthLayer mx={ctx.mx} my={ctx.my} />
          <FairyBurstField />
        </>
      )}
    />
  );
}
