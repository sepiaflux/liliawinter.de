import { useEffect, useRef } from "react";
import type { Work } from "../../data/works";
import DriftBase from "../shared/DriftBase";
import { WarmthLayer } from "../shared/WarmthLayer";
import { WarmthTile } from "../shared/WarmthTile";

// ---- Particle pool ----------------------------------------------------------
// Rose-gold variant: particles pop upward briefly out of the cursor and then
// gravity pulls them back down. Same DOM-pool / rAF pattern as the baseline.

const MAX_PARTICLES = 100;

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
  twinkleAt: number;
  size: number;
};

const PALETTES = [
  // rose-gold band — warm pink/peach, no yellow
  "#d8a898",
  "#e8c8a8",
  "#f0e0d8",
  // pearl ivory accent
  "#ece8e0",
];

function pickColor(rand: number): string {
  // 20% chance of pearl; otherwise weighted across the rose-gold band.
  if (rand > 0.8) return PALETTES[3];
  const i = Math.floor(rand * 3);
  return PALETTES[i];
}

function FairyRosegoldField() {
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

      // Mixed sizes within burst — feels like rose-gold confetti.
      const size = 1.5 + Math.random() * 2; // 1.5..3.5
      const vx = (Math.random() - 0.5) * 70; // ±35 px/s
      // Initial upward velocity — particles pop up out of the cursor first.
      const vy = -40 - Math.random() * 40; // -40..-80 px/s
      const life = 1500 + Math.random() * 900; // 1.5..2.4s
      const peak = 0.55 + Math.random() * 0.2; // 0.55..0.75
      // Twinkle near peak height — apex of the toss is roughly at |vy|/g.
      // With g=50, peak comes between 0.8s and 1.6s. Place twinkle around there.
      const twinkleAt = Math.min(life - 600, Math.abs(vy) / 50 * 1000 + (Math.random() - 0.5) * 200);

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

        // Integrate.
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Gravity — pulls them back down after the upward toss.
        p.vy += 50 * dt;
        // Horizontal damping.
        p.vx *= 1 - 0.6 * dt;

        // Opacity envelope: 100ms fade-in, hold, 600ms fade-out.
        const fadeIn = Math.min(1, age / 100);
        const fadeOut = Math.min(1, (p.life - age) / 600);
        let opacity = p.peak * fadeIn * fadeOut;

        // Single twinkle near apex.
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

export default function WarmthFairyRosegold({ works }: { works: Work[] }) {
  return (
    <DriftBase
      works={works}
      Tile={WarmthTile}
      background={(ctx) => (
        <>
          <WarmthLayer mx={ctx.mx} my={ctx.my} />
          <FairyRosegoldField />
        </>
      )}
    />
  );
}
