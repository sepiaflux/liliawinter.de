import { useEffect, useRef, useState } from "react";
import type { Work } from "../../data/works";
import { useFloating } from "./useFloating";
import { useIsTouch } from "./useMediaQuery";

// Drift-grid tile. Each tile's shape is driven by the actual cover
// image's aspect ratio (measured at mount via Image()) so the poster
// isn't cropped — the LAYOUT just sets the *width* and the position.
//
// Behaviors:
//   1. Subtle 3D tilt that tracks the cursor inside the tile (±6°).
//      Skipped on touch devices.
//   2. On hover/tap, a slow cross-fade slideshow of the work's images.
//   3. Caption: fades in on hover; on touch devices it's always shown
//      since there's no hover.
//   4. Non-hovered tiles fade toward grayscale with a smooth filter
//      transition (not an instant snap).

export type Tile = {
  // Position in viewport percent.
  x: number;
  y: number;
  // Base width in viewport percent. Tile height is derived from the
  // image's natural aspect ratio.
  w: number;
  // Optional fallback aspect ratio used until the image is measured.
  // Useful so the asymmetric drift layout doesn't jump on first paint.
  aspectFallback?: number;
  rot: number;
  depth: number;
};

type Props = {
  work: Work;
  tile: Tile;
  index: number;
  offX: number;
  offY: number;
  hover: number | null;
  onHover: (i: number | null) => void;
  onOpen: () => void;
};

const MAX_TILT = 6;
const SMOOTH = 0.16;
const CYCLE_MS = 1400;

export default function WarmthTile(props: Props) {
  const { work, tile, index, offX, offY, hover, onHover, onOpen } = props;
  const touch = useIsTouch();
  const f = useFloating(index, { ampXY: 5, ampRot: 0.35, ampScale: 0.004, speed: 0.7 });

  const isHover = hover === index;
  const dim = hover !== null && !isHover;

  // ---- Pre-measure image aspect ratio ----
  const [aspect, setAspect] = useState<number>(tile.aspectFallback ?? 1);
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

  // ---- 3D tilt (desktop only) ----
  const btnRef = useRef<HTMLButtonElement>(null);
  const targetRef = useRef({ nx: 0, ny: 0, active: false });
  const tiltRef = useRef({ rx: 0, ry: 0, gx: 50, gy: 50, on: 0 });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, on: 0 });

  useEffect(() => {
    if (touch) return;
    let raf = 0;
    const tick = () => {
      const t = targetRef.current;
      const c = tiltRef.current;
      const tRx = t.active ? -t.ny * MAX_TILT : 0;
      const tRy = t.active ? t.nx * MAX_TILT : 0;
      const tGx = t.active ? (t.nx + 0.5) * 100 : 50;
      const tGy = t.active ? (t.ny + 0.5) * 100 : 50;
      const tOn = t.active ? 1 : 0;
      c.rx += (tRx - c.rx) * SMOOTH;
      c.ry += (tRy - c.ry) * SMOOTH;
      c.gx += (tGx - c.gx) * SMOOTH;
      c.gy += (tGy - c.gy) * SMOOTH;
      c.on += (tOn - c.on) * SMOOTH;
      setTilt({ rx: c.rx, ry: c.ry, gx: c.gx, gy: c.gy, on: c.on });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [touch]);

  function onMove(e: React.MouseEvent<HTMLButtonElement>) {
    if (touch) return;
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    targetRef.current = {
      nx: (e.clientX - r.left) / r.width - 0.5,
      ny: (e.clientY - r.top) / r.height - 0.5,
      active: true,
    };
  }
  function onLeave() {
    targetRef.current = { nx: 0, ny: 0, active: false };
    onHover(null);
  }

  // ---- Image cycle ----
  const sources = [work.cover, ...work.images.slice(1)];
  const multi = sources.length > 1;
  const [step, setStep] = useState(0);
  const [topLayer, setTopLayer] = useState<0 | 1>(0);
  const layersRef = useRef<[string, string]>([sources[0], sources[0]]);

  useEffect(() => {
    if (!isHover || !multi) return;
    let next = 1;
    const id = window.setInterval(() => {
      const nextSrc = sources[next % sources.length];
      const incoming: 0 | 1 = topLayer === 0 ? 1 : 0;
      const pair = layersRef.current.slice() as [string, string];
      pair[incoming] = nextSrc;
      layersRef.current = pair;
      setTopLayer(incoming);
      setStep(next % sources.length);
      next += 1;
    }, CYCLE_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHover, multi]);

  useEffect(() => {
    if (!isHover) {
      layersRef.current = [sources[0], sources[0]];
      setTopLayer(0);
      setStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHover]);

  const px = offX * tile.depth * 60 + f.dx;
  const py = offY * tile.depth * 60 + f.dy;
  const rot = tile.rot + f.rot;

  const [srcA, srcB] = layersRef.current;

  // On touch devices, the caption stays visible since there's no hover
  // to reveal it. On desktop, it fades in on hover.
  const captionVisible = touch || isHover;

  return (
    <button
      ref={btnRef}
      type="button"
      onMouseEnter={() => onHover(index)}
      onMouseLeave={onLeave}
      onMouseMove={onMove}
      onClick={onOpen}
      style={{
        position: "absolute",
        left: `${tile.x}%`,
        top: `${tile.y}%`,
        width: `${tile.w}%`,
        aspectRatio: aspect,
        padding: 0,
        background: "none",
        border: 0,
        color: "inherit",
        cursor: "pointer",
        perspective: touch ? undefined : "1200px",
        transform: `translate(${px}px, ${py}px) rotate(${rot}deg) scale(${f.scale})`,
        transformOrigin: "center",
        transition: "filter 0.5s ease",
        zIndex: 2,
      }}
      aria-label={`${work.title} öffnen`}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: touch ? undefined : "preserve-3d",
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${isHover ? 1.02 : 1})`,
          transition: "box-shadow 0.4s ease, transform 0.3s ease",
          boxShadow: isHover
            ? "0 30px 80px rgba(0,0,0,0.25)"
            : "0 10px 30px rgba(0,0,0,0.10)",
          overflow: "hidden",
          willChange: "transform",
        }}
      >
        <img
          src={srcA}
          alt={work.title}
          draggable={false}
          loading={index < 3 ? "eager" : "lazy"}
          style={layerImg(topLayer === 0, dim)}
        />
        <img
          src={srcB}
          alt=""
          aria-hidden
          draggable={false}
          loading="lazy"
          style={layerImg(topLayer === 1, dim)}
        />

        {!touch && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.22), rgba(255,255,255,0) 55%)`,
              mixBlendMode: "soft-light",
              opacity: tilt.on * 0.8,
              transition: "opacity 0.2s ease",
            }}
          />
        )}

        <div
          style={{
            position: "absolute",
            left: 14,
            bottom: 12,
            right: 14,
            fontFamily: "var(--mono)",
            // Bigger than before; reads well on touch and at a glance.
            fontSize: "clamp(13px, 1.2vw, 16px)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#fff",
            // Layered dark halo for legibility on bright covers (replaces
            // the difference-blend that produced muddy hues over varied
            // imagery).
            textShadow:
              "0 1px 2px rgba(0,0,0,0.55), " +
              "0 0 12px rgba(0,0,0,0.4)",
            opacity: captionVisible ? 1 : 0,
            transition: "opacity 0.35s ease",
            pointerEvents: "none",
            transform: touch ? undefined : "translateZ(20px)",
          }}
        >
          {work.title} · {work.year}
        </div>

        {multi && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 8,
              display: "flex",
              justifyContent: "center",
              gap: 5,
              opacity: isHover ? 1 : 0,
              transition: "opacity 0.25s ease",
              pointerEvents: "none",
              transform: touch ? undefined : "translateZ(20px)",
            }}
          >
            {sources.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === step ? 8 : 4,
                  height: 4,
                  borderRadius: 999,
                  background: i === step ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
                  mixBlendMode: "difference",
                  transition: "width 0.25s ease, background 0.25s ease",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function layerImg(visible: boolean, dim: boolean): React.CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    opacity: visible ? 1 : 0,
    // Both opacity (for the cross-fade slideshow) AND filter (for the
    // smooth gray-on-other-hover) transition. Without filter being
    // listed here it would snap instantly when hover state changed.
    transition: "opacity 0.6s ease, filter 0.5s ease",
    userSelect: "none",
    filter: dim ? "grayscale(0.75) brightness(0.85)" : "grayscale(0) brightness(1)",
  };
}
