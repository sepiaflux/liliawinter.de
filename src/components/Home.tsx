import type { Work } from "../data/works";
import DriftBase from "./shared/DriftBase";
import HomeMobile from "./HomeMobile";
import { useIsMobile } from "./shared/useMediaQuery";

// Entry: dispatches to the desktop drift-grid or the mobile stacked layout
// depending on viewport width. Both share the same detail view.
// `initialSlug` is set when the page is loaded directly at /work/[slug] —
// the inner layout opens that work's detail on mount.
export default function Home({
  works,
  initialSlug,
}: {
  works: Work[];
  initialSlug?: string;
}) {
  const mobile = useIsMobile();
  return mobile ? (
    <HomeMobile works={works} initialSlug={initialSlug} />
  ) : (
    <DriftBase works={works} initialSlug={initialSlug} />
  );
}
