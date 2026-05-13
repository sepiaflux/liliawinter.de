import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { Work } from "../../data/works";
import { useMouse } from "./useFloating";
import { WarmthLayer } from "./WarmthLayer";
import FairyAshLayer from "./FairyAshLayer";
import DetailView from "./DetailView";
import type { BubbleSpec, BubbleTransform } from "./BubbleScene";
import PopDroplets from "./PopDroplets";

// All WebGL is lazy-loaded so three.js + drei + r3f-perf stay out of
// the initial bundle. The page renders text + warmth immediately;
// shimmer + bubbles fade in once the chunk arrives.
const BubbleScene = lazy(() => import("./BubbleScene"));
const SeaShimmer = lazy(() => import("./SeaShimmer"));

// Soap-bubble homepage: 7 floating glass bubbles rendered in real WebGL
// (R3F + MeshTransmissionMaterial). Each bubble holds the work's cover
// photo refracted through the glass. Click → bubble pops (real 3D scale +
// snap, plus CSS droplets) → detail view.

type Slot = {
  // bubble *center* position in viewport percentages
  cx: number;
  cy: number;
  size: number;   // diameter, vmin
  depth: number;  // mouse-parallax multiplier
};

// Centers (previous layout used top-left + size, so cx = x + size/2, cy = y + size/2)
const SLOTS: Slot[] = [
  { cx: 18, cy: 28, size: 28, depth: 0.45 },
  { cx: 47, cy: 15, size: 22, depth: 0.75 },
  { cx: 79, cy: 33, size: 30, depth: 0.5  },
  { cx: 16, cy: 66, size: 20, depth: 0.9  },
  { cx: 49, cy: 67, size: 34, depth: 0.3  },
  { cx: 80, cy: 68, size: 24, depth: 0.7  },
  { cx: 93, cy: 39, size: 18, depth: 0.6  },
];

const POP_OPEN_DELAY = 380;

export default function DriftBase({ works }: { works: Work[] }) {
  const { mx, my } = useMouse(0.1);
  const [hover, setHover] = useState<number | null>(null);
  const [poppingIdx, setPoppingIdx] = useState<number | null>(null);
  const [selected, setSelected] = useState<Work | null>(null);
  const [detailIn, setDetailIn] = useState(false);
  const [ready, setReady] = useState(false);

  const list = works.slice(0, SLOTS.length);

  // Preload every cover image so the bubbles never pop in over a missing
  // texture. Once all images resolve (or error), unlock the intro.
  useEffect(() => {
    let cancelled = false;
    const loads = list.map(
      (w) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = w.cover;
        }),
    );
    Promise.all(loads).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bubbles: BubbleSpec[] = list.map((w, i) => ({
    slug: w.slug,
    cover: w.cover,
    cxPct: SLOTS[i].cx,
    cyPct: SLOTS[i].cy,
    sizeVmin: SLOTS[i].size,
    seed: i,
    depth: SLOTS[i].depth,
  }));

  function pop(idx: number, work: Work) {
    if (poppingIdx !== null) return;
    setPoppingIdx(idx);
    window.setTimeout(() => {
      setSelected(work);
      requestAnimationFrame(() => setDetailIn(true));
    }, POP_OPEN_DELAY);
  }

  function close() {
    setDetailIn(false);
    window.setTimeout(() => {
      setSelected(null);
      setPoppingIdx(null);
    }, 380);
  }

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // The Canvas writes each bubble's true rendered transform into this
  // ref every frame; a separate rAF applies the transforms to the DOM
  // wrappers so hitbox + caption track the bubble.
  const transformsRef = useRef<BubbleTransform[]>([]);
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      for (let i = 0; i < wrapperRefs.current.length; i++) {
        const el = wrapperRefs.current[i];
        const tr = transformsRef.current[i];
        if (el && tr) {
          el.style.transform = `translate(-50%, -50%) translate(${tr.dx.toFixed(2)}px, ${tr.dy.toFixed(2)}px) scale(${tr.scale.toFixed(3)})`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "var(--bg, #edcdd1)",
        color: "#0b0b0b",
      }}
    >
      {/* Background warmth + sea shimmer + fairy dust */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <WarmthLayer mx={mx} my={my} />
        <Suspense fallback={null}>
          <SeaShimmer />
        </Suspense>
        <FairyAshLayer />
      </div>

      {/* 3D bubble canvas */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>
        <Suspense fallback={null}>
          <BubbleScene
            bubbles={bubbles}
            hoverIdx={hover}
            poppingIdx={poppingIdx}
            mx={mx}
            my={my}
            mode="desktop"
            transformsRef={transformsRef}
            startInitialSpawn={ready}
          />
        </Suspense>
      </div>

      {/* Invisible click/hover/keyboard targets, one per bubble. The
          container itself is pointer-events:none so it never intercepts
          clicks meant for the detail view underneath (zIndex 20); the
          per-bubble wrappers re-enable pointer events only when the
          bubble should be clickable. zIndex sits above the detail view
          so pop droplets render OVER the detail fade-in. */}
      <div style={{ position: "absolute", inset: 0, zIndex: 25, pointerEvents: "none" }}>
        {list.map((work, i) => {
          const s = SLOTS[i];
          return (
            <div
              key={work.slug}
              ref={(el) => {
                wrapperRefs.current[i] = el;
              }}
              style={{
                position: "absolute",
                left: `${s.cx}%`,
                top: `${s.cy}%`,
                width: `${s.size}vmin`,
                height: `${s.size}vmin`,
                transform: "translate(-50%, -50%)",
                transformOrigin: "center",
                willChange: "transform",
                pointerEvents: poppingIdx !== null ? "none" : "auto",
              }}
            >
              <button
                type="button"
                onClick={() => pop(i, work)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                aria-label={`${work.title} öffnen`}
                disabled={poppingIdx !== null}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  padding: 0,
                  margin: 0,
                  border: 0,
                  background: "transparent",
                  borderRadius: "50%",
                  cursor: poppingIdx !== null ? "default" : "pointer",
                  opacity: 0,
                }}
              />
              {/* Hover caption — sits above the bubble, fades in on hover */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#fff",
                  mixBlendMode: "difference",
                  opacity: hover === i && poppingIdx === null ? 1 : 0,
                  transition: "opacity 0.3s ease",
                  pointerEvents: "none",
                  textAlign: "center",
                  padding: "0 8% 14%",
                }}
              >
                {work.title} · {work.year}
              </div>
              {/* Droplets when popping */}
              {poppingIdx === i && <PopDroplets />}
            </div>
          );
        })}
      </div>

      {/* Header + footer text overlays */}
      <header
        style={{
          position: "absolute",
          top: 32,
          left: 40,
          right: 40,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          zIndex: 5,
          mixBlendMode: "difference",
          color: "#fff",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: 38,
            lineHeight: 1,
            letterSpacing: "-0.01em",
          }}
        >
          Lilia <em style={{ fontStyle: "italic" }}>Winter</em>
        </div>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            textAlign: "right",
            lineHeight: 1.8,
          }}
        >
          <div>Video · Foto · Installation</div>
          <div>Berlin · seit 2019</div>
        </div>
      </header>

      <p
        style={{
          position: "absolute",
          left: 40,
          bottom: 32,
          fontFamily: "var(--fraunces)",
          fontStyle: "italic",
          fontSize: 16,
          maxWidth: 320,
          lineHeight: 1.4,
          mixBlendMode: "difference",
          color: "#fff",
          pointerEvents: "none",
          zIndex: 5,
          margin: 0,
        }}
      >
        Eine driftende Sammlung — klick eine Blase, sie platzt.
      </p>

      {selected && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            opacity: detailIn ? 1 : 0,
            transform: detailIn ? "scale(1)" : "scale(1.015)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <DetailView work={selected} onClose={close} />
        </div>
      )}

      {/* Loading veil — covers everything until cover images are
          preloaded; fades out as the bubbles start popping in. */}
      <div
        aria-hidden={ready}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 30,
          display: "grid",
          placeItems: "center",
          background: "var(--bg, #edcdd1)",
          opacity: ready ? 0 : 1,
          pointerEvents: ready ? "none" : "auto",
          transition: "opacity 0.45s ease",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(11,11,11,0.55)",
            animation: "loading-pulse 1.6s ease-in-out infinite",
          }}
        >
          Lade
        </div>
      </div>
    </div>
  );
}
