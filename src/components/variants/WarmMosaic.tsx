import type { Work } from "../../data/works";
import DriftBase, { type Tile } from "../shared/DriftBase";
import { WarmthLayer } from "../shared/WarmthLayer";
import MosaicDetail from "../shared/details/MosaicDetail";

// Hero-anchored mosaic: one big tile in the center, six smaller ones
// around the edges. Nearly no rotation — tidier, more print-mag.
const tiles: Tile[] = [
  // Center hero
  { x: 30, y: 26, w: 40, h: 44, rot: 0, depth: 0.45 },
  // Left column
  { x: 4,  y: 12, w: 22, h: 26, rot: 0, depth: 0.3 },
  { x: 4,  y: 50, w: 22, h: 32, rot: 0, depth: 0.55 },
  // Right column
  { x: 74, y: 10, w: 22, h: 28, rot: 0, depth: 0.4 },
  { x: 74, y: 48, w: 22, h: 32, rot: 0, depth: 0.5 },
  // Top + bottom strips
  { x: 30, y:  6, w: 40, h: 16, rot: 0, depth: 0.25 },
  { x: 30, y: 74, w: 40, h: 18, rot: 0, depth: 0.35 },
];

export default function WarmMosaic({ works }: { works: Work[] }) {
  return (
    <DriftBase
      works={works}
      tiles={tiles}
      rotateAmp={0.2}
      Detail={MosaicDetail}
      background={(ctx) => <WarmthLayer mx={ctx.mx} my={ctx.my} />}
    />
  );
}
