import type { Work } from "../data/works";
import DriftBase from "./shared/DriftBase";
import HomeMobile from "./HomeMobile";
import { useIsMobile } from "./shared/useMediaQuery";

// Entry: dispatches to the desktop drift-grid or the mobile stacked layout
// depending on viewport width. Both share the same detail view.
export default function Home({ works }: { works: Work[] }) {
  const mobile = useIsMobile();
  return mobile ? <HomeMobile works={works} /> : <DriftBase works={works} />;
}
