import { useEffect, useRef } from "react";
import type { Work } from "../../data/works";
import DriftBase from "../shared/DriftBase";
import { WarmthLayer } from "../shared/WarmthLayer";
import { WarmthTile } from "../shared/WarmthTile";

// ---- Particle pool ----------------------------------------------------------
// Ash variant: particles rise slowly from the cursor, sway gently sideways,
// and twinkle once midway. No yellow — pale pearl / cream / palest peach.

const MAX_PARTICLES = 120;

type Particle = {
  node: HTMLDivElement;
  alive: boolean;
  x: number;
  y: number;
  baseX: number; // anchor for sine sway
  vx: number; // px/s
  vy: number; // px/s (negative = up)
  swayAmp: number; // px
  swayFreq: number; // rad/s
  swayPhase: number; // rad
  born: number; // ms
  life: number; // ms
  peak: number; // 0..1
  twinkleAt: number; // ms offset
  size: number;
};

const PALETTES = [
  "#f6f1e6", // pearl white
  "#efe6d4", // warm cream
  "#f4dfc8", // palest peach
  "#f1e8d8", // cream variant
  "#f8f2e7", // near-white pearl
];

function pickColor(rand: number): string {
  // Lean slightly toward pearl/cream, occasional peach.
  if (rand > 0.78) return PALETTES[2];
  const i = Math.floor(rand * 5);
  return PALETTES[Math.min(4, i)];
}

function FairyAshField() {
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
        baseX: 0,
        vx: 0,
        vy: 0,
        swayAmp: 0,
        swayFreq: 0,
        swayPhase: 0,
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

    function spawnAt(px: number, py: number, nowMs: number) {
      let slot: Particle | null = null;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].alive) {
          slot = pool[i];
          break;
        }
      }
      if (!slot) return;

      const size = 1.5 + Math.random() * 1.5; // 1.5..3
      const vx = (Math.random() - 0.5) * 50; // ±25 px/s
      const vy = -(20 + Math.random() * 40); // -20..-60 px/s (upward)
      const life = 2000 + Math.random() * 1500; // 2.0..3.5s
      const peak = 0.55 + Math.random() * 0.2; // 0.55..0.75
      // Twinkle midway, away from fade windows.
      const twinkleAt = 400 + Math.random() * (life - 900);
      const swayAmp = 6 + Math.random() * 10; // px
      const swayFreq = 1.2 + Math.random() * 0.8; // rad/s, slow
      const swayPhase = Math.random() * Math.PI * 2;

      slot.alive = true;
      slot.x = px;
      slot.y = py;
      slot.baseX = px;
      slot.vx = vx;
      slot.vy = vy;
      slot.swayAmp = swayAmp;
      slot.swayFreq = swayFreq;
      slot.swayPhase = swayPhase;
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
      if (now - lastEmitRef.current < 14) return;
      lastEmitRef.current = now;

      const count = Math.random() < 0.5 ? 1 : 2;
      for (let i = 0; i < count; i++) {
        const jx = (Math.random() - 0.5) * 4;
        const jy = (Math.random() - 0.5) * 4;
        spawnAt(e.clientX + jx, e.clientY + jy, now);
      }
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

        // Integrate base position. We track baseX separately so the sine sway
        // is layered on top without compounding the horizontal velocity.
        p.baseX += p.vx * dt;
        p.y += p.vy * dt;
        // Mild buoyancy decay — they slow as they rise.
        p.vy += 6 * dt; // pulls upward velocity toward zero over time
        p.vx *= 1 - 0.4 * dt;

        // Slow sine sway over the lifespan.
        const t = age / 1000;
        const swayOffset = Math.sin(t * p.swayFreq + p.swayPhase) * p.swayAmp;
        p.x = p.baseX + swayOffset;

        // Envelope: 150ms fade-in, 700ms fade-out — long, soft.
        const fadeIn = Math.min(1, age / 150);
        const fadeOut = Math.min(1, (p.life - age) / 700);
        let opacity = p.peak * fadeIn * fadeOut;

        // Single twinkle midway.
        const td = age - p.twinkleAt;
        if (td > -70 && td < 70) {
          const k = 1 - Math.abs(td) / 70;
          const spike = Math.sin(k * Math.PI * 0.5);
          opacity = Math.min(0.9, opacity + (0.9 - opacity) * spike);
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

export default function WarmthFairyAsh({ works }: { works: Work[] }) {
  return (
    <DriftBase
      works={works}
      Tile={WarmthTile}
      background={(ctx) => (
        <>
          <WarmthLayer mx={ctx.mx} my={ctx.my} />
          <FairyAshField />
        </>
      )}
    />
  );
}
