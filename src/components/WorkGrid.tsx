import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { Work } from "../data/works";
import { useMouse } from "./shared/useFloating";
import { useIsMobile } from "./shared/useMediaQuery";
import { WarmthLayer } from "./shared/WarmthLayer";
import FairyAshLayer from "./shared/FairyAshLayer";
import DetailView from "./shared/DetailView";
import WarmthTile, { type Tile } from "./shared/WarmthTile";

// Lazy-load SeaShimmer so three.js isn't pulled into the initial bundle
// for the portfolio page — the shimmer fades in once the WebGL chunk
// arrives.
const SeaShimmer = lazy(() => import("./shared/SeaShimmer"));

// The asymmetric drift-grid portfolio (desktop) with a mobile-friendly
// vertical-stack fallback. On desktop, tiles use the restored pre-
// bubble drift layout — each tile sized by the cover image's natural
// aspect ratio. On mobile, the works render as a scrollable vertical
// column with full-width tiles.

// Desktop layout. `w` = tile width as a % of the aspect-locked stage
// (see the 4:3 wrapper below). Height is derived from the cover image's
// intrinsic aspect ratio (see WarmthTile).
//
// Widths are tuned per-slot for the actual cover aspect of the work at
// that index, so portrait covers (otherworldly ≈0.71, vanna ≈0.63,
// lia-libre ≈0.68) don't render so tall that they overflow their row
// and overlap the row below. Math: tile height % = (4/3) * w / aspect.
// Each row 1 tile is kept ≤ 50% bottom; each row 2 tile ≤ 95% bottom.
const LAYOUT: Tile[] = [
  { x: 6,  y: 14, w: 22, rot: -2.5, depth: 0.4 }, // ghostworld (A≈1.50, landscape)
  { x: 34, y: 6,  w: 22, rot:  1.5, depth: 0.7 }, // otherworldly (A≈0.71, portrait)
  { x: 68, y: 14, w: 16, rot: -1.0, depth: 0.5 }, // vanna-analog (A≈0.63, tall portrait)
  { x: 8,  y: 55, w: 14, rot:  2.0, depth: 0.9 }, // lia-libre (A≈0.68, poster)
  { x: 26, y: 52, w: 24, rot: -1.2, depth: 0.3 }, // escapism (A≈0.80)
  { x: 56, y: 55, w: 18, rot:  1.6, depth: 0.8 }, // lichtuebung (A≈0.80)
  { x: 80, y: 58, w: 14, rot: -2.4, depth: 0.6 }, // aufm-boxi (A≈0.80)
];

export default function WorkGrid({
  works,
  initialSlug,
}: {
  works: Work[];
  initialSlug?: string;
}) {
  const { mx, my } = useMouse(0.1);
  const mobile = useIsMobile();
  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<Work | null>(null);
  const [detailIn, setDetailIn] = useState(false);

  // Track the stage width so we can scale pixel-based drift + parallax
  // offsets proportionally. Without this, the offsets stay the same
  // absolute size while the stage shrinks, eating into the row gap and
  // overlapping tiles on smaller viewports.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageScale, setStageScale] = useState(1);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStageScale(el.clientWidth / 1600);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mobile]);

  const list = works.slice(0, LAYOUT.length);
  const offX = mx - 0.5;
  const offY = my - 0.5;

  const open = (work: Work) => {
    setSelected(work);
    requestAnimationFrame(() => setDetailIn(true));
    if (typeof window !== "undefined" && window.location.pathname !== `/portfolio/${work.slug}`) {
      window.history.pushState(null, "", `/portfolio/${work.slug}`);
    }
  };
  const close = () => {
    setDetailIn(false);
    window.setTimeout(() => setSelected(null), 380);
    if (typeof window !== "undefined" && window.location.pathname !== "/portfolio") {
      window.history.pushState(null, "", "/portfolio");
    }
  };

  // Direct load at /portfolio/[slug]
  useEffect(() => {
    if (!initialSlug) return;
    const w = list.find((x) => x.slug === initialSlug);
    if (!w) return;
    setSelected(w);
    setDetailIn(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser back / forward
  useEffect(() => {
    const onPop = () => {
      const m = window.location.pathname.match(/^\/portfolio\/([^/]+)/);
      if (m) {
        const slug = decodeURIComponent(m[1]);
        const w = list.find((x) => x.slug === slug);
        if (w) {
          setSelected(w);
          setDetailIn(true);
        }
      } else {
        setDetailIn(false);
        window.setTimeout(() => setSelected(null), 380);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [list]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const outerStyle: React.CSSProperties = mobile
    ? {
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        background: "var(--bg, #edcdd1)",
        color: "#0b0b0b",
        overflowX: "hidden",
      }
    : {
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "var(--bg, #edcdd1)",
        color: "#0b0b0b",
      };

  return (
    <div style={outerStyle}>
      {/* Background layers — fixed so they don't scroll with the
          mobile content list. */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <WarmthLayer mx={mobile ? 0.5 : mx} my={mobile ? 0.4 : my} />
        <Suspense fallback={null}>
          <SeaShimmer />
        </Suspense>
        <FairyAshLayer />
      </div>

      <header
        style={{
          position: mobile ? "sticky" : "absolute",
          top: mobile ? 0 : 32,
          left: mobile ? 0 : 40,
          right: mobile ? 0 : 40,
          padding: mobile ? "20px 22px" : 0,
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          zIndex: 5,
          mixBlendMode: "difference",
          color: "#fff",
          pointerEvents: "none",
        }}
      >
        <a
          href="/"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textDecoration: "none",
            color: "inherit",
            pointerEvents: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 0",
          }}
        >
          <span aria-hidden>←</span> zurück
        </a>
      </header>

      {mobile ? (
        <main
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            padding: "8px 16px 64px",
            maxWidth: 640,
            margin: "0 auto",
          }}
        >
          {list.map((work) => (
            <MobileTile key={work.slug} work={work} onOpen={() => open(work)} />
          ))}
        </main>
      ) : (
        // Aspect-locked stage. The previous container used `inset:0`, so
        // its HEIGHT was the viewport height — meaning a portrait image
        // (e.g. the lia-libre poster) would render with a height in % of
        // *container height* that shifted with every resize, causing
        // tiles to overlap adjacent rows. With a fixed 16:9 stage the
        // entire drift grid scales as one unit, so a LAYOUT that fits
        // at one viewport size fits at every viewport size.
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            zIndex: 2,
          }}
        >
          <div
            ref={stageRef}
            style={{
              position: "relative",
              width:
                "min(calc(100vw - 64px), calc((100vh - 100px) * 4 / 3), 1600px)",
              aspectRatio: "4 / 3",
            }}
          >
            {list.map((work, i) => (
              <WarmthTile
                key={work.slug}
                work={work}
                tile={LAYOUT[i]}
                index={i}
                offX={offX}
                offY={offY}
                stageScale={stageScale}
                hover={hover}
                onHover={setHover}
                onOpen={() => open(work)}
              />
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div
          style={{
            position: "fixed",
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
    </div>
  );
}

// Simple mobile tile: full-width image, intrinsic aspect ratio,
// caption always visible (no hover on touch). Tap opens the detail
// view. Drops the desktop tilt + drift + slideshow since they don't
// translate well to touch.
function MobileTile({ work, onOpen }: { work: Work; onOpen: () => void }) {
  const [aspect, setAspect] = useState<number>(1);
  useEffect(() => {
    const img = new Image();
    const apply = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setAspect(img.naturalWidth / img.naturalHeight);
      }
    };
    img.onload = apply;
    img.src = work.cover;
    if (img.complete) apply();
    return () => {
      img.onload = null;
    };
  }, [work.cover]);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${work.title} öffnen`}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: aspect,
        padding: 0,
        margin: 0,
        border: 0,
        background: "transparent",
        color: "inherit",
        cursor: "pointer",
        overflow: "hidden",
        boxShadow: "0 14px 36px rgba(0,0,0,0.18)",
        display: "block",
      }}
    >
      <img
        src={work.cover}
        alt={work.title}
        loading="lazy"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
      <span
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 12,
          fontFamily: "var(--mono)",
          fontSize: 13,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#fff",
          textShadow:
            "0 1px 2px rgba(0,0,0,0.55), 0 0 12px rgba(0,0,0,0.4)",
          pointerEvents: "none",
        }}
      >
        {work.title} · {work.year}
      </span>
    </button>
  );
}
