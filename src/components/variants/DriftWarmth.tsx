import type { Work } from "../../data/works";
import DriftBase from "../shared/DriftBase";
import { WarmthLayer } from "../shared/WarmthLayer";
import { WarmthTile } from "../shared/WarmthTile";

// Baseline: subtle 3D-tilt + on-hover slideshow + warm bg.
export default function DriftWarmth({ works }: { works: Work[] }) {
  return (
    <DriftBase
      works={works}
      Tile={WarmthTile}
      background={(ctx) => <WarmthLayer mx={ctx.mx} my={ctx.my} />}
    />
  );
}
