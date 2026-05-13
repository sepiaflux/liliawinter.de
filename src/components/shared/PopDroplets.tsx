import { useMemo, type CSSProperties } from "react";

// Sharp CSS droplets that emerge from a bubble's circumference when it
// pops. Rendered as an overlay on top of the (now-invisible) bubble.

const DROPLET_COUNT = 14;

export default function PopDroplets({ style }: { style?: CSSProperties }) {
  const droplets = useMemo(() => {
    return Array.from({ length: DROPLET_COUNT }, (_, i) => {
      const angle =
        (i / DROPLET_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const rim = 50;
      const reach = 70 + Math.random() * 70;
      return {
        size: 4 + Math.random() * 8,
        startLeft: 50 + Math.cos(angle) * rim,
        startTop: 50 + Math.sin(angle) * rim,
        dx: Math.cos(angle) * reach,
        dy: Math.sin(angle) * reach + 16,
        dur: 0.55 + Math.random() * 0.3,
      };
    });
  }, []);

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
      {droplets.map((d, i) => (
        <span
          key={i}
          style={
            {
              position: "absolute",
              top: `${d.startTop}%`,
              left: `${d.startLeft}%`,
              width: d.size,
              height: d.size,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 30% 30%, " +
                "rgba(255, 255, 255, 0.95), " +
                "rgba(255, 210, 225, 0.65) 55%, " +
                "rgba(180, 220, 255, 0.45) 100%)",
              boxShadow: "0 0 6px rgba(255, 230, 240, 0.55)",
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
