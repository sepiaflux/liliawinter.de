import { useEffect, useRef } from "react";

// Pale ash particles rising slowly from the cursor with a gentle sideways
// sway and one mid-life twinkle. No yellow — pearl / cream / palest peach.
// Skipped automatically for touch devices and reduced-motion users.

const MAX_PARTICLES = 120;

const PALETTE = [
  "#f5edee", // pearl with pink hint
  "#eddedb", // warm rose-cream
  "#f0d6d8", // palest rose
  "#ede2e1", // pink cream variant
  "#f7eeed", // near-white pink-pearl
];

function pickColor(r: number): string {
  if (r > 0.78) return PALETTE[2];
  return PALETTE[Math.min(4, Math.floor(r * 5))];
}

type Particle = {
  node: HTMLDivElement;
  alive: boolean;
  x: number;
  y: number;
  baseX: number;
  vx: number;
  vy: number;
  swayAmp: number;
  swayFreq: number;
  swayPhase: number;
  born: number;
  life: number;
  peak: number;
  twinkleAt: number;
  size: number;
};

export default function FairyAshLayer() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;

    const root = rootRef.current;
    if (!root) return;

    const pool: Particle[] = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const el = document.createElement("div");
      el.style.cssText =
        "position:absolute;top:0;left:0;border-radius:50%;pointer-events:none;will-change:transform,opacity;opacity:0;mix-blend-mode:screen";
      root.appendChild(el);
      pool.push({
        node: el,
        alive: false,
        x: 0, y: 0, baseX: 0,
        vx: 0, vy: 0,
        swayAmp: 0, swayFreq: 0, swayPhase: 0,
        born: 0, life: 0, peak: 0, twinkleAt: 0,
        size: 2,
      });
    }

    function styleParticle(p: Particle) {
      const color = pickColor(Math.random());
      const s = p.size;
      const glow = 4 + Math.floor(Math.random() * 3);
      p.node.style.width = `${s}px`;
      p.node.style.height = `${s}px`;
      p.node.style.marginLeft = `${-s / 2}px`;
      p.node.style.marginTop = `${-s / 2}px`;
      p.node.style.background = color;
      p.node.style.boxShadow = `0 0 ${glow}px ${Math.max(1, glow - 3)}px ${color}`;
    }

    function spawnAt(px: number, py: number, now: number) {
      let slot: Particle | null = null;
      for (const p of pool) {
        if (!p.alive) { slot = p; break; }
      }
      if (!slot) return;

      slot.alive = true;
      slot.x = px;
      slot.y = py;
      slot.baseX = px;
      slot.vx = (Math.random() - 0.5) * 50;
      slot.vy = -(20 + Math.random() * 40);
      slot.size = 1.5 + Math.random() * 1.5;
      slot.life = 2000 + Math.random() * 1500;
      slot.peak = 0.55 + Math.random() * 0.2;
      slot.twinkleAt = 400 + Math.random() * (slot.life - 900);
      slot.swayAmp = 6 + Math.random() * 10;
      slot.swayFreq = 1.2 + Math.random() * 0.8;
      slot.swayPhase = Math.random() * Math.PI * 2;
      slot.born = now;
      styleParticle(slot);
    }

    let lastEmit = 0;
    function onMove(e: MouseEvent) {
      const now = performance.now();
      if (now - lastEmit < 14) return;
      lastEmit = now;
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

      for (const p of pool) {
        if (!p.alive) continue;
        const age = now - p.born;
        if (age >= p.life) {
          p.alive = false;
          p.node.style.opacity = "0";
          continue;
        }

        p.baseX += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 6 * dt;
        p.vx *= 1 - 0.4 * dt;

        const t = age / 1000;
        p.x = p.baseX + Math.sin(t * p.swayFreq + p.swayPhase) * p.swayAmp;

        const fadeIn = Math.min(1, age / 150);
        const fadeOut = Math.min(1, (p.life - age) / 700);
        let opacity = p.peak * fadeIn * fadeOut;

        const td = age - p.twinkleAt;
        if (td > -70 && td < 70) {
          const k = 1 - Math.abs(td) / 70;
          opacity = Math.min(0.9, opacity + (0.9 - opacity) * Math.sin(k * Math.PI * 0.5));
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
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
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
