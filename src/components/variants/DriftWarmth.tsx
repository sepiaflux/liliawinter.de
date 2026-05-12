import type { Work } from "../../data/works";
import DriftBase from "../shared/DriftBase";
import { WarmthLayer } from "../shared/WarmthLayer";

// Baseline: asymmetric driftLayout + standard editorial DetailView.
export default function DriftWarmth({ works }: { works: Work[] }) {
  return (
    <DriftBase
      works={works}
      background={(ctx) => <WarmthLayer mx={ctx.mx} my={ctx.my} />}
    />
  );
}
