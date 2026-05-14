import { Suspense, lazy, useEffect, useState } from "react";
import type { Work } from "../data/works";
import { useMouse } from "./shared/useFloating";
import { WarmthLayer } from "./shared/WarmthLayer";
import FairyAshLayer from "./shared/FairyAshLayer";
import DetailView from "./shared/DetailView";
import WarmthTile, { type Tile } from "./shared/WarmthTile";

// Lazy-load SeaShimmer so three.js isn't pulled into the initial bundle
// for the portfolio page — the shimmer fades in once the WebGL chunk
// arrives.
const SeaShimmer = lazy(() => import("./shared/SeaShimmer"));

// The asymmetric drift-grid portfolio. Restored from the pre-bubble
// layout, on top of the new pinkish moving background (WarmthLayer +
// SeaShimmer + FairyAshLayer).

const LAYOUT: Tile[] = [
  { x: 6,  y: 14, w: 22, h: 32, rot: -2.5, depth: 0.4 },
  { x: 34, y: 8,  w: 26, h: 18, rot:  1.5, depth: 0.7 },
  { x: 66, y: 18, w: 22, h: 30, rot: -1.0, depth: 0.5 },
  { x: 8,  y: 56, w: 18, h: 26, rot:  2.0, depth: 0.9 },
  { x: 30, y: 50, w: 28, h: 38, rot: -1.2, depth: 0.3 },
  { x: 62, y: 56, w: 18, h: 22, rot:  1.6, depth: 0.8 },
  { x: 82, y: 60, w: 14, h: 28, rot: -2.4, depth: 0.6 },
];

export default function WorkGrid({
  works,
  initialSlug,
}: {
  works: Work[];
  initialSlug?: string;
}) {
  const { mx, my } = useMouse(0.1);
  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<Work | null>(null);
  const [detailIn, setDetailIn] = useState(false);

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

      <header
        style={{
          position: "absolute",
          top: 32,
          left: 40,
          right: 40,
          display: "flex",
          justifyContent: "space-between",
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

      {list.map((work, i) => (
        <WarmthTile
          key={work.slug}
          work={work}
          tile={LAYOUT[i]}
          index={i}
          offX={offX}
          offY={offY}
          hover={hover}
          onHover={setHover}
          onOpen={() => open(work)}
        />
      ))}

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
        Eine driftende Sammlung — bewege den Mauszeiger, die Bilder folgen mit unterschiedlicher Tiefe.
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
    </div>
  );
}
