import { useEffect, useRef } from "react";
import type { Work } from "../../data/works";
import DriftBase from "../shared/DriftBase";
import { WarmthLayer } from "../shared/WarmthLayer";
import { WarmthTile } from "../shared/WarmthTile";

// ---- Particle pool ----------------------------------------------------------
// Twilight variant: dusty blue ash falls from the cursor. Occasionally (~5%)
// a single emission is a "bright star" — larger, brighter, longer-lived, with
// multiple twinkles during its fall.

const MAX_PARTICLES = 120;

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
  // Up to 3 twinkle moments (ms offset from birth).
  twinkles: number[];
  twinkleWidth: number; // half-width in ms
  size: number;
  isStar: boolean;
};

const DUST_PALETTE = [
  // dusty blue / periwinkle / silver
  "#a8b8c8",
  "#b8b8d0",
  "#c8c8d0",
];

const STAR_COLOR = "#e8e8f0";

function pickDustColor(rand: number): string {
  const i = Math.min(2, Math.floor(rand * 3));
  return DUST_PALETTE[i];
}

function FairyTwilightField() {
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
        twinkles: [],
        twinkleWidth: 60,
        size: 2,
      isStar: false,
      });
    }
    particlesRef.current = pool;

    function styleParticle(p: Particle) {
      const s = p.size;
      const color = p.isStar ? STAR_COLOR : pickDustColor(Math.random());
      const glow = p.isStar
        ? Math.round(10 + Math.random() * 4) // 10..14
        : Math.round(4 + Math.random() * 2); // 4..6
      p.node.style.width = `${s}px`;
      p.node.style.height = `${s}px`;
      p.node.style.marginLeft = `-${s / 2}px`;
      p.node.style.marginTop = `-${s / 2}px`;
      p.node.style.background = color;
      p.node.style.boxShadow = `0 0 ${glow}px ${Math.max(1, glow - 3)}px ${color}`;
    }

    function spawnAt(px: number, py: number, nowMs: number, forceStar?: boolean) {
      let slot: Particle | null = null;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].alive) {
          slot = pool[i];
          break;
        }
      }
      if (!slot) return;

      const isStar = forceStar ?? Math.random() < 0.05;

      let size: number;
      let life: number;
      let peak: number;
      let twinkles: number[];
      let twinkleWidth: number;
      const vx = (Math.random() - 0.5) * 80; // ±40 px/s
      const vy = 30 + Math.random() * 50; // 30..80 px/s downward

      if (isStar) {
        size = 3.5 + Math.random() * 1.5; // 3.5..5
        life = 2500 + Math.random() * 1000; // 2.5..3.5s
        peak = 0.85 + Math.random() * 0.1; // 0.85..0.95
        // 2 or 3 twinkles spaced across the fall.
        const tCount = Math.random() < 0.5 ? 2 : 3;
        twinkles = [];
        // Spread twinkles between 250ms and life-700ms.
        const start = 250;
        const end = life - 700;
        for (let i = 0; i < tCount; i++) {
          const frac = (i + 0.5) / tCount;
          twinkles.push(start + frac * (end - start) + (Math.random() - 0.5) * 200);
        }
        twinkleWidth = 80;
      } else {
        size = 1.5 + Math.random() * 1.5; // 1.5..3
        life = 1300 + Math.random() * 500; // ~1.3..1.8s (≈1.5s)
        peak = 0.4 + Math.random() * 0.15; // 0.4..0.55
        twinkles = [250 + Math.random() * (life - 700)];
        twinkleWidth = 60;
      }

      slot.alive = true;
      slot.x = px;
      slot.y = py;
      slot.vx = vx;
      slot.vy = vy;
      slot.born = nowMs;
      slot.life = life;
      slot.peak = peak;
      slot.twinkles = twinkles;
      slot.twinkleWidth = twinkleWidth;
      slot.size = size;
      slot.isStar = isStar;
      styleParticle(slot);
    }

    function onMove(e: MouseEvent) {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
      cursorRef.current.active = true;

      const now = performance.now();
      if (now - lastEmitRef.current < 14) return;
      lastEmitRef.current = now;

      // ~5% of *emissions* (rather than per-particle) is a single bright star.
      if (Math.random() < 0.05) {
        const jx = (Math.random() - 0.5) * 4;
        const jy = (Math.random() - 0.5) * 4;
        spawnAt(e.clientX + jx, e.clientY + jy, now, true);
        return;
      }

      const count = Math.random() < 0.5 ? 1 : 2;
      for (let i = 0; i < count; i++) {
        const jx = (Math.random() - 0.5) * 4;
        const jy = (Math.random() - 0.5) * 4;
        spawnAt(e.clientX + jx, e.clientY + jy, now, false);
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

        // Integrate — same falling motion as baseline.
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 12 * dt;
        p.vx *= 1 - 0.6 * dt;

        // Opacity envelope.
        const fadeIn = Math.min(1, age / 100);
        const fadeOut = Math.min(1, (p.life - age) / 500);
        let opacity = p.peak * fadeIn * fadeOut;

        // Twinkle bumps — possibly multiple for stars.
        const w = p.twinkleWidth;
        for (let t = 0; t < p.twinkles.length; t++) {
          const td = age - p.twinkles[t];
          if (td > -w && td < w) {
            const k = 1 - Math.abs(td) / w;
            const spike = Math.sin(k * Math.PI * 0.5);
            const target = p.isStar ? 1.0 : 0.95;
            opacity = Math.min(target, opacity + (target - opacity) * spike);
          }
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

export default function WarmthFairyTwilight({ works }: { works: Work[] }) {
  return (
    <DriftBase
      works={works}
      Tile={WarmthTile}
      background={(ctx) => (
        <>
          <WarmthLayer mx={ctx.mx} my={ctx.my} />
          <FairyTwilightField />
        </>
      )}
    />
  );
}
