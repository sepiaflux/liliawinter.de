import { useEffect, useRef } from "react";
import type { Work } from "../../data/works";
import DriftBase from "../shared/DriftBase";
import { WarmthLayer } from "../shared/WarmthLayer";
import { WarmthTile } from "../shared/WarmthTile";

// ---- Particle pool ----------------------------------------------------------
// Ember variant: strong upward kick that decelerates (drag), small horizontal
// flicker, particle shrinks + brightens near end of life with two quick
// twinkles. Coral / peach / rose-gold / apricot palette — warm without yellow.

const MAX_PARTICLES = 80;

type Particle = {
  node: HTMLDivElement;
  alive: boolean;
  x: number;
  y: number;
  baseX: number; // anchor for sine flicker
  vx: number;
  vy: number; // negative = up
  flickerAmp: number; // px
  flickerFreq: number; // rad/s
  flickerPhase: number;
  born: number;
  life: number;
  peak: number;
  twinkle1: number; // ms offset
  twinkle2: number; // ms offset
  baseSize: number;
  color: string;
};

// Hex -> rgba for boxShadow halo.
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const PALETTES = [
  "#e89878", // coral
  "#f0c8a0", // peach
  "#e8b8a0", // rose-gold
  "#dc9870", // deeper apricot (less frequent)
];

function pickColor(rand: number): string {
  // Weight: coral ~30%, peach ~30%, rose-gold ~25%, apricot ~15%.
  if (rand < 0.3) return PALETTES[0];
  if (rand < 0.6) return PALETTES[1];
  if (rand < 0.85) return PALETTES[2];
  return PALETTES[3];
}

function FairyEmberField() {
  const rootRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const cursorRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const lastEmitRef = useRef<number>(0);
  const emitToggleRef = useRef<boolean>(false);

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
      el.style.willChange = "transform, opacity, width, height";
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
        flickerAmp: 0,
        flickerFreq: 0,
        flickerPhase: 0,
        born: 0,
        life: 0,
        peak: 0,
        twinkle1: 0,
        twinkle2: 0,
        baseSize: 2,
        color: PALETTES[0],
      });
    }
    particlesRef.current = pool;

    function styleParticle(p: Particle) {
      p.node.style.background = p.color;
      // Strong glow halo in particle's color at ~0.5 alpha.
      const halo = hexToRgba(p.color, 0.5);
      const glow = 8 + Math.round(Math.random() * 4); // 8..12
      p.node.style.boxShadow = `0 0 ${glow}px ${Math.max(2, glow - 5)}px ${halo}`;
    }

    function applySize(p: Particle, size: number) {
      p.node.style.width = `${size}px`;
      p.node.style.height = `${size}px`;
      p.node.style.marginLeft = `-${size / 2}px`;
      p.node.style.marginTop = `-${size / 2}px`;
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

      const baseSize = 1.5 + Math.random() * 2.5; // 1.5..4
      // Small initial horizontal drift; sine flicker carries most lateral motion.
      const vx = (Math.random() - 0.5) * 20; // ±10 px/s
      const vy = -(50 + Math.random() * 60); // -50..-110 px/s (strong upward)
      const life = 1500 + Math.random() * 1000; // 1.5..2.5s
      const peak = 0.6 + Math.random() * 0.2; // 0.6..0.8
      // Two twinkles in the back half of life.
      const twinkle1 = life * (0.55 + Math.random() * 0.1); // ~0.55..0.65
      const twinkle2 = life * (0.78 + Math.random() * 0.1); // ~0.78..0.88
      const flickerAmp = 8 + Math.random() * 7; // up to ±15px
      const flickerFreq = 6 + Math.random() * 4; // quick flicker
      const flickerPhase = Math.random() * Math.PI * 2;

      slot.alive = true;
      slot.x = px;
      slot.y = py;
      slot.baseX = px;
      slot.vx = vx;
      slot.vy = vy;
      slot.flickerAmp = flickerAmp;
      slot.flickerFreq = flickerFreq;
      slot.flickerPhase = flickerPhase;
      slot.born = nowMs;
      slot.life = life;
      slot.peak = peak;
      slot.twinkle1 = twinkle1;
      slot.twinkle2 = twinkle2;
      slot.baseSize = baseSize;
      slot.color = pickColor(Math.random());
      applySize(slot, baseSize);
      styleParticle(slot);
    }

    function onMove(e: MouseEvent) {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
      cursorRef.current.active = true;

      const now = performance.now();
      // Rate-limit ~16ms.
      if (now - lastEmitRef.current < 16) return;
      // Plus emit only every other qualifying move — sparser than ash.
      emitToggleRef.current = !emitToggleRef.current;
      if (!emitToggleRef.current) return;
      lastEmitRef.current = now;

      const jx = (Math.random() - 0.5) * 3;
      const jy = (Math.random() - 0.5) * 3;
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

        // Drag — quick deceleration so they slow as they rise.
        const drag = 1 - 1.8 * dt;
        p.vx *= drag > 0 ? drag : 0;
        p.vy *= drag > 0 ? drag : 0;
        // Gentle buoyancy keeps them creeping up after drag bites.
        p.vy += -8 * dt;

        p.baseX += p.vx * dt;
        p.y += p.vy * dt;

        // Horizontal flicker (sine wobble).
        const t = age / 1000;
        const flicker =
          Math.sin(t * p.flickerFreq + p.flickerPhase) * p.flickerAmp;
        p.x = p.baseX + flicker;

        // Size: shrink toward 60% of base over life (cooling).
        const lifeFrac = age / p.life;
        const size = p.baseSize * (1 - 0.4 * lifeFrac);
        applySize(p, size);

        // Opacity envelope: 120ms fade-in, fade-out 400ms. Slight late brighten.
        const fadeIn = Math.min(1, age / 120);
        const fadeOut = Math.min(1, (p.life - age) / 400);
        // Brighten subtly in the back half (ember glow before snuffing).
        const lateBoost = lifeFrac > 0.5 ? 1 + (lifeFrac - 0.5) * 0.4 : 1;
        let opacity = Math.min(0.95, p.peak * fadeIn * fadeOut * lateBoost);

        // Two quick twinkles near end-of-life.
        for (const tw of [p.twinkle1, p.twinkle2]) {
          const td = age - tw;
          if (td > -50 && td < 50) {
            const k = 1 - Math.abs(td) / 50;
            const spike = Math.sin(k * Math.PI * 0.5);
            opacity = Math.min(1, opacity + (0.98 - opacity) * spike);
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

export default function WarmthFairyEmber({ works }: { works: Work[] }) {
  return (
    <DriftBase
      works={works}
      Tile={WarmthTile}
      background={(ctx) => (
        <>
          <WarmthLayer mx={ctx.mx} my={ctx.my} />
          <FairyEmberField />
        </>
      )}
    />
  );
}
