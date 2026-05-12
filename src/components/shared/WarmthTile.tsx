import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { TileProps } from "./DriftBase";
import { useFloating } from "./useFloating";

// The canonical "Warmth" tile: subtle 3D tilt under the cursor, plus a
// cross-fade slideshow of all images on hover (skipping the high-res twin
// of the cover at images[0]). Re-used by every variant so the baseline
// feel stays identical — variants layer their colorful additions on top.

const MAX_TILT = 6;
const SMOOTH = 0.16;
const CYCLE_MS = 1400;

export type WarmthTileExtras = {
  // Lets a variant inject custom JSX inside the tilt-card (under the image).
  underLayer?: (ctx: { isHover: boolean; tiltOn: number }) => ReactNode;
  // Lets a variant inject custom JSX inside the tilt-card (above the image).
  overLayer?: (ctx: { isHover: boolean; tiltOn: number }) => ReactNode;
  // Lets a variant inject siblings *outside* the tilt-card (still inside the
  // floating/parallax wrapper), e.g. tape/glow that hovers in front.
  outsideLayer?: (ctx: { isHover: boolean; tile: TileProps["tile"] }) => ReactNode;
  // Override the box-shadow of the inner card.
  cardShadow?: (isHover: boolean) => string;
  // Multiplier on the floating wrapper transform — variants can leave it 1.
  wrapperStyle?: CSSProperties;
};

export function WarmthTile(props: TileProps & WarmthTileExtras) {
  const {
    work,
    tile,
    index,
    offX,
    offY,
    hover,
    onHover,
    onOpen,
    rotateAmp,
    underLayer,
    overLayer,
    outsideLayer,
    cardShadow,
    wrapperStyle,
  } = props;
  const f = useFloating(index, { ampXY: 5, ampRot: 0.35 * rotateAmp, ampScale: 0.004, speed: 0.7 });

  const isHover = hover === index;
  const dim = hover !== null && !isHover;

  // Subtle 3D tilt
  const btnRef = useRef<HTMLButtonElement>(null);
  const targetRef = useRef({ nx: 0, ny: 0, active: false });
  const tiltRef = useRef({ rx: 0, ry: 0, gx: 50, gy: 50, on: 0 });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, on: 0 });

  useEffect(() => {
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
  }, []);

  function onMove(e: React.MouseEvent<HTMLButtonElement>) {
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

  // Image cycle — skip images[0] (it's the high-res twin of the cover)
  const sources: string[] = [work.cover, ...work.images.slice(1)];
  const multi = sources.length > 1;
  const [step, setStep] = useState(0);
  const [top, setTop] = useState<0 | 1>(0);
  const layerRef = useRef<[string, string]>([sources[0], sources[0]]);

  useEffect(() => {
    if (!isHover || !multi) return;
    let next = 1;
    const id = window.setInterval(() => {
      const nextSrc = sources[next % sources.length];
      const incoming: 0 | 1 = top === 0 ? 1 : 0;
      const pair = layerRef.current.slice() as [string, string];
      pair[incoming] = nextSrc;
      layerRef.current = pair;
      setTop(incoming);
      setStep(next % sources.length);
      next += 1;
    }, CYCLE_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHover, multi]);

  useEffect(() => {
    if (!isHover) {
      layerRef.current = [sources[0], sources[0]];
      setTop(0);
      setStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHover]);

  const px = offX * tile.depth * 60 + f.dx;
  const py = offY * tile.depth * 60 + f.dy;
  const rot = tile.rot * rotateAmp + f.rot;

  const [srcA, srcB] = layerRef.current;

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
        height: `${tile.h}%`,
        padding: 0,
        background: "none",
        border: 0,
        color: "inherit",
        cursor: "pointer",
        perspective: "1200px",
        transform: `translate(${px}px, ${py}px) rotate(${rot}deg) scale(${f.scale})`,
        transformOrigin: "center",
        transition: "filter 0.5s ease",
        zIndex: 2,
        ...wrapperStyle,
      }}
    >
      {outsideLayer?.({ isHover, tile })}

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${isHover ? 1.02 : 1})`,
          transition: "box-shadow 0.4s ease",
          boxShadow: cardShadow
            ? cardShadow(isHover)
            : isHover
            ? "0 30px 80px rgba(0,0,0,0.25)"
            : "0 10px 30px rgba(0,0,0,0.10)",
          overflow: "hidden",
          willChange: "transform",
        }}
      >
        {underLayer?.({ isHover, tiltOn: tilt.on })}

        <img
          src={srcA}
          alt={work.title}
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: top === 0 ? 1 : 0,
            transition: "opacity 0.6s ease",
            userSelect: "none",
            filter: dim ? "grayscale(0.5) brightness(0.88)" : "none",
          }}
        />
        <img
          src={srcB}
          alt=""
          aria-hidden
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: top === 1 ? 1 : 0,
            transition: "opacity 0.6s ease",
            userSelect: "none",
            filter: dim ? "grayscale(0.5) brightness(0.88)" : "none",
          }}
        />

        {/* 3D-tilt glass glare */}
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

        {overLayer?.({ isHover, tiltOn: tilt.on })}

        {/* caption */}
        <div
          style={{
            position: "absolute",
            left: 12,
            bottom: 10,
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#fff",
            mixBlendMode: "difference",
            opacity: isHover ? 1 : 0,
            transition: "opacity 0.25s ease",
            pointerEvents: "none",
            transform: "translateZ(20px)",
          }}
        >
          {work.title} · {work.year}
        </div>

        {/* slideshow dots */}
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
              transform: "translateZ(20px)",
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
