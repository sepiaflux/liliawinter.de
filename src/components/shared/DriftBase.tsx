import { useEffect, useRef, useState } from "react";
import type { Work } from "../../data/works";
import { useMouse } from "./useFloating";
import { WarmthLayer } from "./WarmthLayer";
import { WarmthTile } from "./WarmthTile";
import FairyAshLayer from "./FairyAshLayer";
import DetailView from "./DetailView";

// The drift-grid homepage: 7 tiles in an asymmetric layout, gentle idle
// float + mouse parallax + 3D tilt on hover + image cycle. Background is a
// subtle warmth gradient with rising ash particles tracking the cursor.

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

export type TileProps = {
  work: Work;
  tile: Tile;
  index: number;
  offX: number;
  offY: number;
  hover: number | null;
  onHover: (i: number | null) => void;
  onOpen: () => void;
};

export default function DriftBase({ works }: { works: Work[] }) {
  const { mx, my } = useMouse(0.1);
  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<Work | null>(null);
  const [detailIn, setDetailIn] = useState(false);

  const list = works.slice(0, driftLayout.length);
  const offX = mx - 0.5;
  const offY = my - 0.5;

  const open = (work: Work) => {
    setSelected(work);
    requestAnimationFrame(() => setDetailIn(true));
  };
  const close = () => {
    setDetailIn(false);
    window.setTimeout(() => setSelected(null), 380);
  };

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
        background: "var(--bg, #ece8e0)",
        color: "#0b0b0b",
      }}
    >
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <WarmthLayer mx={mx} my={my} />
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

      {list.map((work, i) => (
        <WarmthTile
          key={work.slug}
          work={work}
          tile={driftLayout[i]}
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
            transition: "opacity 0.42s ease, transform 0.42s ease",
          }}
        >
          <DetailView work={selected} onClose={close} />
        </div>
      )}
    </div>
  );
}
