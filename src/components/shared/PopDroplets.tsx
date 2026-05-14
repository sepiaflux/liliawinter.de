import { useMemo, type CSSProperties } from "react";

// Bubble-pop effect: an expanding shockwave ring + a spray of droplets
// in two waves (small inner, large outer). All CSS-animated so it stays
// sharp regardless of devicePixelRatio.

const INNER_COUNT = 10;
const OUTER_COUNT = 16;

export default function PopDroplets({ style }: { style?: CSSProperties }) {
  const inner = useMemo(
    () =>
      Array.from({ length: INNER_COUNT }, (_, i) => {
        const angle =
          (i / INNER_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const reach = 55 + Math.random() * 45;
        return {
          size: 3 + Math.random() * 5,
          startLeft: 50 + Math.cos(angle) * 38,
          startTop: 50 + Math.sin(angle) * 38,
          dx: Math.cos(angle) * reach,
          dy: Math.sin(angle) * reach + 10,
          dur: 0.65 + Math.random() * 0.25,
        };
      }),
    [],
  );
  const outer = useMemo(
    () =>
      Array.from({ length: OUTER_COUNT }, (_, i) => {
        const angle =
          (i / OUTER_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
        const reach = 95 + Math.random() * 90;
        return {
          size: 6 + Math.random() * 10,
          startLeft: 50 + Math.cos(angle) * 50,
          startTop: 50 + Math.sin(angle) * 50,
          dx: Math.cos(angle) * reach,
          dy: Math.sin(angle) * reach + 22,
          dur: 0.95 + Math.random() * 0.4,
        };
      }),
    [],
  );

  const dropletBg =
    "radial-gradient(circle at 30% 30%, " +
    "rgba(255, 255, 255, 0.98), " +
    "rgba(255, 210, 225, 0.7) 55%, " +
    "rgba(180, 220, 255, 0.5) 100%)";

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        ...style,
      }}
    >
      {inner.map((d, i) => (
        <span
          key={`i${i}`}
          style={
            {
              position: "absolute",
              top: `${d.startTop}%`,
              left: `${d.startLeft}%`,
              width: d.size,
              height: d.size,
              borderRadius: "50%",
              background: dropletBg,
              boxShadow: "0 0 4px rgba(255, 230, 240, 0.45)",
              animation: `droplet-fly ${d.dur}s cubic-bezier(0.25, 0.6, 0.4, 1) forwards`,
              ["--dx" as keyof CSSProperties]: `${d.dx}px`,
              ["--dy" as keyof CSSProperties]: `${d.dy}px`,
              opacity: 0,
            } as CSSProperties
          }
        />
      ))}
      {outer.map((d, i) => (
        <span
          key={`o${i}`}
          style={
            {
              position: "absolute",
              top: `${d.startTop}%`,
              left: `${d.startLeft}%`,
              width: d.size,
              height: d.size,
              borderRadius: "50%",
              background: dropletBg,
              boxShadow: "0 0 8px rgba(255, 230, 240, 0.6)",
              animation: `droplet-fly ${d.dur}s cubic-bezier(0.25, 0.6, 0.4, 1) forwards`,
              ["--dx" as keyof CSSProperties]: `${d.dx}px`,
              ["--dy" as keyof CSSProperties]: `${d.dy}px`,
              opacity: 0,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
