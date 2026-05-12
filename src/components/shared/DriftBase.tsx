import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import type { Work } from "../../data/works";
import { useFloating, useMouse } from "./useFloating";
import DetailViewDefault from "./DetailView";

export type Tile = {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  depth: number;
};

export const driftLayout: Tile[] = [
  { x: 6,  y: 14, w: 22, h: 32, rot: -2.5, depth: 0.4 },
  { x: 34, y: 8,  w: 26, h: 18, rot:  1.5, depth: 0.7 },
  { x: 66, y: 18, w: 22, h: 30, rot: -1.0, depth: 0.5 },
  { x: 8,  y: 56, w: 18, h: 26, rot:  2.0, depth: 0.9 },
  { x: 30, y: 50, w: 28, h: 38, rot: -1.2, depth: 0.3 },
  { x: 62, y: 56, w: 18, h: 22, rot:  1.6, depth: 0.8 },
  { x: 82, y: 60, w: 14, h: 28, rot: -2.4, depth: 0.6 },
];

export type DetailProps = { work: Work; onClose: () => void; theme?: "light" | "dark" };

export type TileProps = {
  work: Work;
  tile: Tile;
  index: number;
  // Mouse offset in [-0.5, 0.5] suitable for parallax multiplication.
  offX: number;
  offY: number;
  // Raw mouse position in [0, 1] (useful for distance-based effects).
  mx: number;
  my: number;
  hover: number | null;
  onHover: (i: number | null) => void;
  onOpen: () => void;
  rotateAmp: number;
};

type Props = {
  works: Work[];
  theme?: "light" | "dark";
  background?: (ctx: { mx: number; my: number; hover: number | null }) => ReactNode;
  tiles?: Tile[];
  Detail?: ComponentType<DetailProps>;
  chrome?: ReactNode;
  rotateAmp?: number;
  // Override the tile rendering. Receives everything it needs to animate.
  Tile?: ComponentType<TileProps>;
};

export default function DriftBase({
  works,
  theme = "light",
  background,
  tiles = driftLayout,
  Detail = DetailViewDefault,
  chrome,
  rotateAmp = 1,
  Tile = DefaultDriftTile,
}: Props) {
  const { mx, my } = useMouse(0.1);
  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<Work | null>(null);
  const [detailIn, setDetailIn] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const list = works.slice(0, tiles.length);

  const offX = mx - 0.5;
  const offY = my - 0.5;

  function open(work: Work) {
    setSelected(work);
    requestAnimationFrame(() => setDetailIn(true));
  }

  function close() {
    setDetailIn(false);
    window.setTimeout(() => setSelected(null), 380);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && selected) close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <div
      ref={wrapRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: theme === "light" ? "var(--bg, #ece8e0)" : "#0a0a0a",
        color: theme === "light" ? "#0b0b0b" : "#f3f1ec",
      }}
    >
      {background && (
        <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
          {background({ mx, my, hover })}
        </div>
      )}

      {chrome ? (
        chrome
      ) : (
        <>
          <div
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
          </div>
          <div
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
            }}
          >
            Eine driftende Sammlung — bewege den Mauszeiger, die Bilder folgen mit unterschiedlicher Tiefe.
          </div>
        </>
      )}

      {list.map((w, i) => (
        <Tile
          key={w.slug}
          work={w}
          tile={tiles[i]}
          index={i}
          offX={offX}
          offY={offY}
          mx={mx}
          my={my}
          hover={hover}
          onHover={setHover}
          onOpen={() => open(w)}
          rotateAmp={rotateAmp}
        />
      ))}

      {selected && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            opacity: detailIn ? 1 : 0,
            transform: detailIn ? "scale(1)" : "scale(1.015)",
            transition: "opacity 0.42s ease, transform 0.42s ease",
          }}
        >
          <Detail work={selected} onClose={close} theme={theme} />
        </div>
      )}
    </div>
  );
}

// ---------------- Default tile ----------------
export function DefaultDriftTile({
  work,
  tile,
  index,
  offX,
  offY,
  hover,
  onHover,
  onOpen,
  rotateAmp,
}: TileProps) {
  const f = useFloating(index, { ampXY: 5, ampRot: 0.35 * rotateAmp, ampScale: 0.004, speed: 0.7 });

  const isHover = hover === index;
  const dim = hover !== null && !isHover;

  const px = offX * tile.depth * 60 + f.dx;
  const py = offY * tile.depth * 60 + f.dy;
  const rot = tile.rot * rotateAmp + f.rot;

  return (
    <button
      type="button"
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
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
        transform: `translate(${px}px, ${py}px) rotate(${rot}deg) scale(${(isHover ? 1.02 : 1) * f.scale})`,
        transformOrigin: "center",
        transition: "box-shadow 0.5s ease, filter 0.5s ease",
        boxShadow: isHover
          ? "0 30px 80px rgba(0,0,0,0.25)"
          : "0 10px 30px rgba(0,0,0,0.10)",
        overflow: "hidden",
        textDecoration: "none",
        willChange: "transform",
        zIndex: 2,
      }}
    >
      <img
        src={work.cover}
        alt={work.title}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          filter: dim ? "grayscale(0.5) brightness(0.88)" : "none",
          transition: "filter 0.4s ease",
          userSelect: "none",
        }}
      />
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
        }}
      >
        {work.title} · {work.year}
      </div>
    </button>
  );
}
