import { useEffect, useRef } from "react";
import type { Work } from "../../data/works";
import DriftBase from "../shared/DriftBase";
import { WarmthLayer } from "../shared/WarmthLayer";
import { WarmthTile } from "../shared/WarmthTile";

// ---- Particle pool ----------------------------------------------------------
// Breath: particles emerge at the cursor and barely move. They bob ~10px,
// twinkle once mid-life, and fade slowly over 3–4.5s. Each one a held breath.

const MAX_PARTICLES = 60;

type Particle = {
  node: HTMLDivElement;
  alive: boolean;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  bobAmp: number;
  bobFreq: number;
  bobPhase: number;
  born: number;
  life: number;
  peak: number;
  twinkleAt: number;
  size: number;
};

const PALETTES = [
  "#c8d8d0", // mint
  "#d0d8d0", // palest sage
  "#e8e4d8", // ivory
  "#ece8e0", // pearl
  "#d6dcd4", // mint halftone
];

function pickColor(rand: number): string {
  const i = Math.floor(rand * PALETTES.length);
  return PALETTES[Math.min(i, PALETTES.length - 1)];
}

function FairyBreathField() {
  const rootRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const cursorRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const lastEmitRef = useRef<number>(0);
  const nextEmitGapRef = useRef<number>(150);

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
        baseY: 0,
        vx: 0,
        vy: 0,
        bobAmp: 0,
        bobFreq: 0,
        bobPhase: 0,
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
      const glow = Math.round(5 + Math.random() * 3); // 5..8
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

      const size = 2 + Math.random() * 1.5; // 2..3.5
      // Tiny random velocity in any direction; will slow via drag.
      const ang = Math.random() * Math.PI * 2;
      const speed = Math.random() * 15; // 0..15 px/s
      const vx = Math.cos(ang) * speed;
      const vy = Math.sin(ang) * speed;
      const life = 3000 + Math.random() * 1500; // 3.0..4.5s
      const peak = 0.35 + Math.random() * 0.1; // ~0.4
      const bobAmp = 6 + Math.random() * 4; // 6..10
      const bobFreq = (Math.PI * 2) / (2.2 + Math.random() * 0.8); // slow bob
      const bobPhase = Math.random() * Math.PI * 2;
      // Twinkle peaks ~600ms after birth (rise to ~0.7 over ~600ms).
      const twinkleAt = 500 + Math.random() * 400;

      slot.alive = true;
      slot.baseX = px;
      slot.baseY = py;
      slot.x = px;
      slot.y = py;
      slot.vx = vx;
      slot.vy = vy;
      slot.bobAmp = bobAmp;
      slot.bobFreq = bobFreq;
      slot.bobPhase = bobPhase;
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
      if (now - lastEmitRef.current < nextEmitGapRef.current) return;
      lastEmitRef.current = now;
      // Randomize next gap 120..180ms so emissions feel like breathing.
      nextEmitGapRef.current = 120 + Math.random() * 60;

      const jx = (Math.random() - 0.5) * 4;
      const jy = (Math.random() - 0.5) * 4;
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

        // Strong drag: the small initial nudge dies quickly.
        p.baseX += p.vx * dt;
        p.baseY += p.vy * dt;
        p.vx *= 1 - 1.4 * dt;
        p.vy *= 1 - 1.4 * dt;

        // Slow vertical bob; tiny horizontal sway derived from phase.
        const t = age / 1000;
        const bobY = Math.sin(t * p.bobFreq + p.bobPhase) * p.bobAmp;
        const swayX =
          Math.sin(t * p.bobFreq * 0.6 + p.bobPhase) * (p.bobAmp * 0.25);
        p.x = p.baseX + swayX;
        p.y = p.baseY + bobY;

        // Opacity envelope: 400ms fade-in, hold, 900ms fade-out.
        const fadeIn = Math.min(1, age / 400);
        const fadeOut = Math.min(1, (p.life - age) / 900);
        let opacity = p.peak * fadeIn * fadeOut;

        // Soft single twinkle — rise to ~0.7 over ~600ms window centered at
        // twinkleAt. Half-width 300ms.
        const td = age - p.twinkleAt;
        if (td > -300 && td < 300) {
          const k = 1 - Math.abs(td) / 300; // 0..1
          const spike = Math.sin(k * Math.PI * 0.5);
          opacity = Math.min(0.7, opacity + (0.7 - opacity) * spike);
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

export default function WarmthFairyBreath({ works }: { works: Work[] }) {
  return (
    <DriftBase
      works={works}
      Tile={WarmthTile}
      background={(ctx) => (
        <>
          <WarmthLayer mx={ctx.mx} my={ctx.my} />
          <FairyBreathField />
        </>
      )}
    />
  );
}
