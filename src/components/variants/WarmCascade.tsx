import type { Work } from "../../data/works";
import DriftBase, { type Tile } from "../shared/DriftBase";
import { WarmthLayer } from "../shared/WarmthLayer";
import FullBleedDetail from "../shared/details/FullBleedDetail";

// 7 tiles in a diagonal cascade from upper-left to lower-right.
// Heavy overlap, slightly varying size & rotation — feels like a
// stack of photographs spread across the table.
const tiles: Tile[] = [
  { x: -2, y:  4, w: 24, h: 32, rot: -3.5, depth: 0.3 },
  { x: 10, y: 14, w: 25, h: 34, rot:  2.2, depth: 0.4 },
  { x: 22, y: 24, w: 26, h: 36, rot: -1.8, depth: 0.5 },
  { x: 36, y: 32, w: 26, h: 36, rot:  2.6, depth: 0.6 },
  { x: 50, y: 40, w: 28, h: 38, rot: -1.4, depth: 0.7 },
  { x: 62, y: 50, w: 28, h: 40, rot:  3.0, depth: 0.8 },
  { x: 74, y: 58, w: 28, h: 40, rot: -2.2, depth: 0.9 },
];

export default function WarmCascade({ works }: { works: Work[] }) {
  return (
    <DriftBase
      works={works}
      tiles={tiles}
      rotateAmp={1.1}
      Detail={FullBleedDetail}
      background={(ctx) => <WarmthLayer mx={ctx.mx} my={ctx.my} />}
      chrome={
        <>
          <div
            style={{
              position: "absolute",
              top: 32,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              zIndex: 5,
              mixBlendMode: "difference",
              color: "#fff",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: 40,
                lineHeight: 1,
                letterSpacing: "-0.012em",
              }}
            >
              Lilia <em style={{ fontStyle: "italic" }}>Winter</em>
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: 40,
              bottom: 28,
              fontFamily: "var(--fraunces)",
              fontStyle: "italic",
              fontSize: 14,
              maxWidth: 260,
              lineHeight: 1.4,
              mixBlendMode: "difference",
              color: "#fff",
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            Eine Kaskade aus sieben Arbeiten — bewege den Mauszeiger, der Stapel folgt.
          </div>
          <div
            style={{
              position: "absolute",
              right: 40,
              bottom: 28,
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
