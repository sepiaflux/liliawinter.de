import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Work } from "../data/works";
import { WarmthLayer } from "./shared/WarmthLayer";
import SeaShimmer from "./shared/SeaShimmer";
import DetailView from "./shared/DetailView";
import BubbleScene, {
  type BubbleSpec,
  type BubbleTransform,
} from "./shared/BubbleScene";
import PopDroplets from "./shared/PopDroplets";

// Mobile homepage: a vertical scrolling column of 3D soap bubbles. The
// bubbles themselves live in a single fixed-position WebGL canvas that
// covers the viewport; invisible DOM placeholders scroll normally and
// drive the bubbles' on-screen positions.

const OFFSETS = [0, -4, 3, -2, 4, -3, 2];          // horizontal sway, % of viewport width
const SIZES_VW = [78, 70, 82, 66, 78, 72, 64];     // diameter, vw
const POP_OPEN_DELAY = 380;

export default function HomeMobile({ works }: { works: Work[] }) {
  const [selected, setSelected] = useState<Work | null>(null);
  const [detailIn, setDetailIn] = useState(false);
  const [poppingIdx, setPoppingIdx] = useState<number | null>(null);
  const [bubbles, setBubbles] = useState<BubbleSpec[]>([]);
  const [ready, setReady] = useState(false);
  const placeholderRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const transformsRef = useRef<BubbleTransform[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loads = works.map(
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

  // Measure each placeholder's center (in viewport %) and feed the scene.
  function measure() {
    const out: BubbleSpec[] = [];
    for (let i = 0; i < works.length; i++) {
      const el = placeholderRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      out.push({
        slug: works[i].slug,
        cover: works[i].cover,
        cxPct: (cx / window.innerWidth) * 100,
        cyPct: (cy / window.innerHeight) * 100,
        sizeVw: SIZES_VW[i % SIZES_VW.length],
        seed: i,
        depth: 0,
        driftAmpFactor: 0.22,
      });
    }
    setBubbles(out);
  }

  useLayoutEffect(() => {
    measure();
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [works]);

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

  // Lock body scroll while detail is open.
  useEffect(() => {
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected]);

  // rAF sync: apply each bubble's true rendered transform to its inner
  // wrapper so hitbox + droplets follow the bubble's drift exactly.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      for (let i = 0; i < innerRefs.current.length; i++) {
        const el = innerRefs.current[i];
        const tr = transformsRef.current[i];
        if (el && tr) {
          el.style.transform = `translate(${tr.dx.toFixed(2)}px, ${tr.dy.toFixed(2)}px) scale(${tr.scale.toFixed(3)})`;
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
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        background: "var(--bg, #edcdd1)",
        color: "#0b0b0b",
      }}
    >
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <WarmthLayer mx={0.5} my={0.4} />
        <SeaShimmer />
      </div>

      {/* 3D bubble canvas — fixed to viewport; positions are driven by the
          scrolling placeholders below. */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }}>
        <BubbleScene
          bubbles={bubbles}
          hoverIdx={null}
          poppingIdx={poppingIdx}
          mx={0.5}
          my={0.5}
          mode="mobile"
          transformsRef={transformsRef}
          startInitialSpawn={ready}
        />
      </div>

      <header
        style={{
          position: "relative",
          zIndex: 4,
          padding: "32px 24px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mixBlendMode: "difference",
          color: "#fff",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: 30,
            lineHeight: 1,
            letterSpacing: "-0.01em",
          }}
        >
          Lilia <em style={{ fontStyle: "italic" }}>Winter</em>
        </div>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            textAlign: "right",
            lineHeight: 1.8,
          }}
        >
          <div>Berlin</div>
          <div>seit 2019</div>
        </div>
      </header>

      <main
        style={{
          position: "relative",
          zIndex: 25,
          padding: "24px 0 80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          pointerEvents: "none",
        }}
      >
        {works.map((work, i) => {
          const size = SIZES_VW[i % SIZES_VW.length];
          const offset = OFFSETS[i % OFFSETS.length];
          return (
            // Outer = layout + sway. The Canvas measures this to know
            // where the bubble should sit, so it must NOT move with the
            // per-frame drift transform.
            <div
              key={work.slug}
              ref={(el) => {
                placeholderRefs.current[i] = el;
              }}
              style={{
                position: "relative",
                width: `${size}vw`,
                height: `${size}vw`,
                transform: `translateX(${offset}vw)`,
                pointerEvents: poppingIdx !== null ? "none" : "auto",
              }}
            >
              {/* Inner = the per-frame transform target (drift + scale) */}
              <div
                ref={(el) => {
                  innerRefs.current[i] = el;
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  willChange: "transform",
                  transformOrigin: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => pop(i, work)}
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
                {poppingIdx === i && <PopDroplets />}
              </div>
            </div>
          );
        })}
      </main>

      <footer
        style={{
          position: "relative",
          zIndex: 4,
          padding: "20px 24px 32px",
          fontFamily: "var(--fraunces)",
          fontStyle: "italic",
          fontSize: 14,
          lineHeight: 1.5,
          mixBlendMode: "difference",
          color: "#fff",
          pointerEvents: "none",
        }}
      >
        Eine driftende Sammlung — mail@liliawinter.de
      </footer>

      {selected && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20,
            opacity: detailIn ? 1 : 0,
            transform: detailIn ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <DetailView work={selected} onClose={close} />
        </div>
      )}

      <div
        aria-hidden={ready}
        style={{
          position: "fixed",
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
