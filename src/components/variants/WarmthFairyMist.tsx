import { useEffect, useRef } from "react";
import type { Work } from "../../data/works";
import DriftBase from "../shared/DriftBase";
import { WarmthLayer } from "../shared/WarmthLayer";
import { WarmthTile } from "../shared/WarmthTile";

// ---- Particle pool ----------------------------------------------------------
// Mist trails the cursor's recent direction of travel. Each particle drifts
// horizontally along that vector with a slow vertical sine bob, fading over
// 2.5–4s. Cool palette: blue-white / silver / pearl.

const MAX_PARTICLES = 90;

type Particle = {
  node: HTMLDivElement;
  alive: boolean;
  x: number;
  y: number;
  vx: number; // px/s — dominant horizontal drift
  vy: number; // px/s — small vertical baseline drift
  baseY: number; // y position before sine bob is applied
  bobAmp: number; // px
  bobFreq: number; // rad/s
  bobPhase: number; // rad
  born: number;
  life: number;
  peak: number;
  size: number;
};

const PALETTES = [
  "#dce4ec", // pale blue-white
  "#e0e4e8", // palest silver
  "#eae8e4", // pearl
  "#e6ebef", // blue-white halftone
  "#dde2e6", // silver halftone
];

function pickColor(rand: number): string {
  const i = Math.floor(rand * PALETTES.length);
  return PALETTES[Math.min(i, PALETTES.length - 1)];
}

function FairyMistField() {
  const rootRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const cursorRef = useRef<{
    x: number;
    y: number;
    px: number;
    py: number;
    dirX: number;
    dirY: number;
    active: boolean;
  }>({ x: 0, y: 0, px: 0, py: 0, dirX: 1, dirY: 0, active: false });
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
        vx: 0,
        vy: 0,
        baseY: 0,
        bobAmp: 0,
        bobFreq: 0,
        bobPhase: 0,
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
      const glow = Math.round(6 + Math.random() * 4); // 6..10
      p.node.style.width = `${s}px`;
      p.node.style.height = `${s}px`;
      p.node.style.marginLeft = `-${s / 2}px`;
      p.node.style.marginTop = `-${s / 2}px`;
      p.node.style.background = color;
      p.node.style.boxShadow = `0 0 ${glow}px ${Math.max(1, glow - 4)}px ${color}`;
    }

    function spawnAt(px: number, py: number, nowMs: number) {
      let slot: Particle | null = null;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].alive) {
          slot = pool[i];
          break;
        }
      }
      if (!slot) return;

      const size = 2 + Math.random() * 2.5; // 2..4.5
      // Velocity primarily along cursor direction, 30..60 px/s.
      const speed = 30 + Math.random() * 30;
      const dirX = cursorRef.current.dirX;
      const dirY = cursorRef.current.dirY;
      const vx = dirX * speed + (Math.random() - 0.5) * 8;
      const vy = dirY * speed * 0.35 + (Math.random() - 0.5) * 6;
      const life = 2500 + Math.random() * 1500; // 2.5..4.0s
      const peak = 0.4 + Math.random() * 0.1; // ~0.5
      // Bob ±18px over ~1.5s ≈ 2π/1.5 rad/s.
      const bobAmp = 12 + Math.random() * 6; // 12..18
      const bobFreq = (Math.PI * 2) / (1.3 + Math.random() * 0.4); // ~1.5s period
      const bobPhase = Math.random() * Math.PI * 2;

      slot.alive = true;
      slot.x = px;
      slot.y = py;
      slot.baseY = py;
      slot.vx = vx;
      slot.vy = vy;
      slot.bobAmp = bobAmp;
      slot.bobFreq = bobFreq;
      slot.bobPhase = bobPhase;
      slot.born = nowMs;
      slot.life = life;
      slot.peak = peak;
      slot.size = size;
      styleParticle(slot);
    }

    function onMove(e: MouseEvent) {
      const c = cursorRef.current;
      // Compute direction from previous position; smooth with prior dir to
      // avoid jitter on tiny movements.
      const dx = e.clientX - c.x;
      const dy = e.clientY - c.y;
      const mag = Math.hypot(dx, dy);
      if (mag > 1.5) {
        const nx = dx / mag;
        const ny = dy / mag;
        // Smooth: 70% new, 30% old.
        c.dirX = c.dirX * 0.3 + nx * 0.7;
        c.dirY = c.dirY * 0.3 + ny * 0.7;
        const nm = Math.hypot(c.dirX, c.dirY) || 1;
        c.dirX /= nm;
        c.dirY /= nm;
      }
      c.px = c.x;
      c.py = c.y;
      c.x = e.clientX;
      c.y = e.clientY;
      c.active = true;

      const now = performance.now();
      // Sparser emit: one every ~70ms.
      if (now - lastEmitRef.current < 70) return;
      lastEmitRef.current = now;

      const jx = (Math.random() - 0.5) * 6;
      const jy = (Math.random() - 0.5) * 6;
      spawnAt(e.clientX + jx, e.clientY + jy, now);
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

        // Integrate horizontal drift and a small baseline vertical drift.
        p.x += p.vx * dt;
        p.baseY += p.vy * dt;
        // Light damping — mist slows as it dissipates.
        p.vx *= 1 - 0.25 * dt;
        p.vy *= 1 - 0.25 * dt;

        // Sine bob applied on top of baseY.
        const t = age / 1000;
        const bobY = Math.sin(t * p.bobFreq + p.bobPhase) * p.bobAmp;
        p.y = p.baseY + bobY;

        // Opacity envelope: 250ms fade-in, hold, 800ms fade-out.
        const fadeIn = Math.min(1, age / 250);
        const fadeOut = Math.min(1, (p.life - age) / 800);
        const opacity = p.peak * fadeIn * fadeOut;

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

export default function WarmthFairyMist({ works }: { works: Work[] }) {
  return (
    <DriftBase
      works={works}
      Tile={WarmthTile}
      background={(ctx) => (
        <>
          <WarmthLayer mx={ctx.mx} my={ctx.my} />
          <FairyMistField />
        </>
      )}
    />
  );
}
