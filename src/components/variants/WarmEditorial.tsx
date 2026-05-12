import type { Work } from "../../data/works";
import DriftBase, { type Tile } from "../shared/DriftBase";
import { WarmthLayer } from "../shared/WarmthLayer";
import SpreadDetail from "../shared/details/SpreadDetail";

// Tidier overview: 7 tiles in a calmer staggered arrangement, minimal
// rotation. Reads more like a magazine cover than a drifting collage.
const tiles: Tile[] = [
  { x: 6,  y: 14, w: 20, h: 26, rot:  0,   depth: 0.4 },
  { x: 30, y: 10, w: 24, h: 30, rot: -0.5, depth: 0.55 },
  { x: 58, y: 14, w: 22, h: 26, rot:  0.4, depth: 0.45 },
  { x: 82, y: 18, w: 12, h: 20, rot: -0.6, depth: 0.3 },
  { x: 8,  y: 50, w: 18, h: 30, rot:  0.4, depth: 0.5 },
  { x: 30, y: 50, w: 28, h: 36, rot: -0.3, depth: 0.6 },
  { x: 62, y: 50, w: 22, h: 28, rot:  0.5, depth: 0.45 },
];

export default function WarmEditorial({ works }: { works: Work[] }) {
  return (
    <DriftBase
      works={works}
      tiles={tiles}
      rotateAmp={0.35}
      Detail={SpreadDetail}
      background={(ctx) => <WarmthLayer mx={ctx.mx} my={ctx.my} />}
      chrome={
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
            <div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Index — Werke 2021—2024
              </div>
              <div
                style={{
                  fontFamily: "var(--cormorant)",
                  fontStyle: "italic",
                  fontSize: 56,
                  lineHeight: 0.95,
                }}
              >
                Lilia Winter
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                textAlign: "right",
                lineHeight: 2,
              }}
            >
              <div>Video</div>
              <div>Foto</div>
              <div>Installation</div>
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: 40,
              bottom: 32,
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              mixBlendMode: "difference",
              color: "#fff",
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            mail@liliawinter.de
          </div>
        </>
      }
    />
  );
}
