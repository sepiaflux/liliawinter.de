import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Work } from "../data/works";
import { WarmthLayer } from "./shared/WarmthLayer";
import DetailView from "./shared/DetailView";
import type { BubbleSpec, BubbleTransform } from "./shared/BubbleScene";
import PopDroplets from "./shared/PopDroplets";

const BubbleScene = lazy(() => import("./shared/BubbleScene"));
const SeaShimmer = lazy(() => import("./shared/SeaShimmer"));

// Mobile homepage: a vertical scrolling column of 3D soap bubbles. The
// bubbles themselves live in a single fixed-position WebGL canvas that
// covers the viewport; invisible DOM placeholders scroll normally and
// drive the bubbles' on-screen positions.

// Hand-tuned mobile pattern: a 2-column grid with some bubbles paired
// side-by-side and others centered full-width — breaks the "single
// column" feel into a real composed arrangement.
type MobileSlot = {
  size: number;         // diameter, vw
  col: "1" | "2" | "1 / 3"; // grid column placement
  justify: "start" | "end" | "center";
  offsetX: number;      // additional shift in vw
};
const LAYOUT: MobileSlot[] = [
  { size: 44, col: "1",     justify: "start",  offsetX:  -2 },
  { size: 38, col: "2",     justify: "end",    offsetX:   2 },
  { size: 56, col: "1 / 3", justify: "center", offsetX:  -8 },
  { size: 42, col: "1",     justify: "start",  offsetX:   4 },
  { size: 48, col: "2",     justify: "end",    offsetX:  -4 },
  { size: 52, col: "1 / 3", justify: "center", offsetX:  10 },
  { size: 40, col: "1",     justify: "start",  offsetX:  -6 },
];
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
  // Scroll handling: instead of pushing scroll through React state
  // (which causes a re-render per frame and makes bubbles lag visibly
  // behind native scroll), we keep scroll in a ref and let BubbleScene
  // read it each frame to shift the camera. baselineScrollY captures
  // window.scrollY at the moment bubbles were measured; scrollDeltaRef
  // is the difference since then.
  const scrollDeltaRef = useRef(0);
  const baselineScrollYRef = useRef(0);

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

  // Measure each placeholder's center (in viewport %) at the *current*
  // scroll position, then capture that scroll position as the baseline.
  // After this, scroll is tracked purely via scrollDeltaRef — no
  // re-measure, no setState.
  function measure() {
    baselineScrollYRef.current = window.scrollY;
    scrollDeltaRef.current = 0;
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
        sizeVw: LAYOUT[i % LAYOUT.length].size,
        seed: i,
        depth: 0,
        driftAmpFactor: 0.22,
      });
    }
    setBubbles(out);
  }

  useLayoutEffect(() => {
    measure();
    // Scroll: ref-only update. Synchronous, no React work, no rAF
    // debounce — BubbleScene reads this directly each frame so there
    // is zero lag between native scroll and the bubble shift.
    const onScroll = () => {
      scrollDeltaRef.current = window.scrollY - baselineScrollYRef.current;
    };
    // Resize re-baselines: we re-measure (since layout changes) and
    // reset scrollDelta to 0.
    const onResize = () => measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
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
        <Suspense fallback={null}>
          <SeaShimmer />
        </Suspense>
      </div>

      {/* 3D bubble canvas — fixed to viewport; positions are driven by the
          scrolling placeholders below. */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }}>
        <Suspense fallback={null}>
          <BubbleScene
            bubbles={bubbles}
            hoverIdx={null}
            poppingIdx={poppingIdx}
            mx={0.5}
            my={0.5}
            mode="mobile"
            transformsRef={transformsRef}
            startInitialSpawn={ready}
            scrollDeltaRef={scrollDeltaRef}
          />
        </Suspense>
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
          padding: "16px 12px 80px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          alignItems: "center",
          rowGap: 4,
          columnGap: 4,
          pointerEvents: "none",
        }}
      >
        {works.map((work, i) => {
          const slot = LAYOUT[i % LAYOUT.length];
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
                width: `${slot.size}vw`,
                height: `${slot.size}vw`,
                gridColumn: slot.col,
                justifySelf: slot.justify,
                transform: `translateX(${slot.offsetX}vw)`,
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
                {/* Caption — always visible on mobile (no hover available). */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "#fff",
                    mixBlendMode: "difference",
                    pointerEvents: "none",
                    textAlign: "center",
                    padding: "0 10% 12%",
                    opacity: poppingIdx === i ? 0 : 1,
                    transition: "opacity 0.2s ease",
                  }}
                >
                  {work.title} · {work.year}
                </div>
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
