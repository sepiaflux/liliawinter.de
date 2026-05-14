import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { navigate } from "astro:transitions/client";
import { useMouse } from "./shared/useFloating";
import { useIsMobile } from "./shared/useMediaQuery";
import { WarmthLayer } from "./shared/WarmthLayer";
import FairyAshLayer from "./shared/FairyAshLayer";
import type { BubbleSpec, BubbleTransform } from "./shared/BubbleScene";
import PopDroplets from "./shared/PopDroplets";

const BubbleScene = lazy(() => import("./shared/BubbleScene"));
const SeaShimmer = lazy(() => import("./shared/SeaShimmer"));

// Three section bubbles. Clicking one pops it, then the others pop in
// sequence with a small stagger, then we navigate (via Astro view
// transitions for the slide-in).

type Section = {
  slug: string;
  title: string;
  cover: string;
  href: string;
};

const SECTIONS: Section[] = [
  {
    slug: "portfolio",
    title: "Portfolio",
    cover: "/portfolio/ghostworld-zoe/cover.jpg",
    href: "/portfolio",
  },
  {
    slug: "lebenslauf",
    title: "Lebenslauf",
    cover: "/portfolio/vanna-analog/cover.jpg",
    href: "/lebenslauf",
  },
  {
    slug: "about",
    title: "Über mich",
    cover: "/portfolio/otherworldly/cover.jpg",
    href: "/about",
  },
];

type Slot = { cx: number; cy: number; size: number; depth: number };
// Desktop: asymmetric arrangement. Sizes are interpreted by
// BubbleScene as a percentage of (vw+vh)/2 (the arithmetic mean of the
// viewport dimensions), so bubbles get bigger on wide monitors and
// smaller on narrow ones — instead of plateauing at vmin.
const DESKTOP_SLOTS: Slot[] = [
  { cx: 26, cy: 52, size: 24, depth: 0.5 },
  { cx: 52, cy: 32, size: 22, depth: 0.7 },
  { cx: 74, cy: 60, size: 26, depth: 0.4 },
];
// Mobile: vertical stack of three large bubbles. Sizes are in vw, so a
// 64vw bubble nearly fills the screen width — gives the title plenty
// of room to be legible.
const MOBILE_SLOTS: Slot[] = [
  { cx: 50, cy: 20, size: 58, depth: 0.3 },
  { cx: 50, cy: 50, size: 58, depth: 0.4 },
  { cx: 50, cy: 80, size: 58, depth: 0.3 },
];

const POP_FIRST_MS = 380;
// Very small stagger between the cascade pops — they should fire
// almost simultaneously, just barely offset so you can perceive that
// they're not literally the same frame.
const POP_STAGGER_MS = 55;
const POST_POP_DELAY_MS = 300;

export default function SectionBubbles() {
  const { mx, my } = useMouse(0.1);
  const mobile = useIsMobile();
  const SLOTS = mobile ? MOBILE_SLOTS : DESKTOP_SLOTS;
  // Mobile uses sizeVw (% of viewport WIDTH); desktop uses sizeVmin
  // (% of the smaller axis). Wrapper DOM gets a matching CSS unit.
  // Mobile uses sizeVw → plain `Nvw` in CSS. Desktop uses the (vw+vh)/2
  // mean to match the BubbleScene's new responsive formula.
  const cssSize = (n: number) =>
    mobile ? `${n}vw` : `calc((${n}vw + ${n}vh) / 2)`;
  const [hover, setHover] = useState<number | null>(null);
  const [poppingIdx, setPoppingIdx] = useState<number | null>(null);
  const [poppedIdxs, setPoppedIdxs] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState(false);
  // Section labels (Portfolio / Lebenslauf / Über mich) are positioned
  // over the bubble wrappers from first paint. Without this flag they
  // appear on top of the loading veil and pop in before the bubbles
  // do — the user notices the bare text first. We defer them until the
  // bubbles have visibly spawned (~600ms after `ready`) and fade them
  // in smoothly.
  const [labelsIn, setLabelsIn] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setLabelsIn(true), 600);
    return () => window.clearTimeout(t);
  }, [ready]);
  const transformsRef = useRef<BubbleTransform[]>([]);
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Preload covers
  useEffect(() => {
    let cancelled = false;
    const loads = SECTIONS.map(
      (s) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = s.cover;
        }),
    );
    Promise.all(loads).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const bubbles: BubbleSpec[] = SECTIONS.map((s, i) => ({
    slug: s.slug,
    cover: s.cover,
    cxPct: SLOTS[i].cx,
    cyPct: SLOTS[i].cy,
    ...(mobile
      ? { sizeVw: SLOTS[i].size }
      : { sizeVmin: SLOTS[i].size }),
    seed: i,
    depth: SLOTS[i].depth,
  }));

  function popAndNavigate(idx: number) {
    if (poppingIdx !== null) return;
    setPoppingIdx(idx);
    setPoppedIdxs((s) => new Set(s).add(idx));

    // After the clicked bubble has popped, cascade through the rest in
    // index order with a stagger.
    const otherIdxs = SECTIONS.map((_, i) => i).filter((i) => i !== idx);
    otherIdxs.forEach((otherIdx, order) => {
      setTimeout(() => {
        setPoppedIdxs((s) => {
          const n = new Set(s);
          n.add(otherIdx);
          return n;
        });
      }, POP_FIRST_MS + order * POP_STAGGER_MS);
    });

    // After the last bubble has popped, navigate via Astro view
    // transitions — that gives us the slide-in for the destination page.
    const total =
      POP_FIRST_MS + otherIdxs.length * POP_STAGGER_MS + POST_POP_DELAY_MS;
    setTimeout(() => {
      navigate(SECTIONS[idx].href);
    }, total);
  }

  // The clicked bubble is hidden via the BubbleScene's primary
  // `poppingIdx` prop. The OTHER bubbles in the cascade are hidden via
  // the new `hiddenIdxs` prop.
  const hiddenIdxs = new Set<number>();
  poppedIdxs.forEach((i) => {
    if (i !== poppingIdx) hiddenIdxs.add(i);
  });

  // rAF tick: copy each bubble's transform onto its DOM wrapper so the
  // hit-area, caption, and pop droplets follow the real bubble.
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
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <WarmthLayer mx={mx} my={my} />
        <Suspense fallback={null}>
          <SeaShimmer />
        </Suspense>
        <FairyAshLayer />
      </div>

      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>
        <Suspense fallback={null}>
          <BubbleScene
            bubbles={bubbles}
            hoverIdx={hover}
            poppingIdx={poppingIdx}
            hiddenIdxs={hiddenIdxs}
            mx={mx}
            my={my}
            mode={mobile ? "mobile" : "desktop"}
            transformsRef={transformsRef}
            startInitialSpawn={ready}
          />
        </Suspense>
      </div>

      <div style={{ position: "absolute", inset: 0, zIndex: 25, pointerEvents: "none" }}>
        {SECTIONS.map((section, i) => {
          const slot = SLOTS[i];
          const isPopped = poppedIdxs.has(i);
          return (
            <div
              key={section.slug}
              ref={(el) => {
                wrapperRefs.current[i] = el;
              }}
              style={{
                position: "absolute",
                left: `${slot.cx}%`,
                top: `${slot.cy}%`,
                width: cssSize(slot.size),
                height: cssSize(slot.size),
                transform: "translate(-50%, -50%)",
                transformOrigin: "center",
                willChange: "transform",
                pointerEvents: poppingIdx !== null ? "none" : "auto",
                // Hovered wrapper sits above its siblings so its label
                // (and hit-area) layer over neighbouring bubbles when
                // the hover-grow push brings them close.
                zIndex: hover === i ? 2 : 1,
              }}
            >
              <button
                type="button"
                onClick={() => popAndNavigate(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                aria-label={`${section.title} öffnen`}
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
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  textAlign: "center",
                  // Hidden until the bubbles have spawned, and hidden
                  // again when this bubble pops.
                  opacity: isPopped || !labelsIn ? 0 : 1,
                  transition: "opacity 0.55s ease",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--serif)",
                    fontStyle: "italic",
                    // Larger type than before, scaled per device. Mobile
                    // uses vw so the title scales with the now-bigger
                    // bubble; desktop scales with vmin like the bubble.
                    fontSize: mobile
                      ? "clamp(32px, 9vw, 64px)"
                      : "clamp(32px, 3.6vw, 56px)",
                    color: "#fff",
                    // Layered soft dark halo — keeps the elegant white
                    // type legible over bright bubble content (e.g. the
                    // yellow lia-libre cover) without showing a visible
                    // pill or stroke.
                    textShadow:
                      "0 1px 2px rgba(0,0,0,0.45), " +
                      "0 0 14px rgba(0,0,0,0.4), " +
                      "0 0 32px rgba(0,0,0,0.25)",
                    lineHeight: 1,
                  }}
                >
                  {section.title}
                </div>
              </div>
              {isPopped && <PopDroplets />}
            </div>
          );
        })}
      </div>

      <header
        style={{
          position: "absolute",
          top: 32,
          left: 40,
          right: 40,
          display: "flex",
          justifyContent: "flex-start",
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
            fontSize: 42,
            lineHeight: 1,
            letterSpacing: "-0.01em",
          }}
        >
          Lilia <em style={{ fontStyle: "italic" }}>Winter</em>
        </div>
      </header>

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
