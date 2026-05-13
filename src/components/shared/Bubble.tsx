import { useMemo, type CSSProperties } from "react";
import type { Work } from "../../data/works";

// Soap-bubble preview tile. The bubble is built from several stacked
// layers to give a 3D, glass-like feel:
//   1. cover photo (slightly desaturated, as if seen through a film)
//   2. iridescent conic ring that slowly rotates
//   3. directional shading (lighter top-left, darker bottom-right)
//   4. main bright highlight + a couple of smaller specs
//   5. a soft pink-blue rim tint from edge interference
//   6. an inset rim shadow (surface-tension line)
//   7. an outer halo glow plus a contact shadow
//
// On `popping=true` the bubble plays a sharp pop animation (no fade): a
// quick stretch and then an instant disappear, while a ring of droplets
// emerges from the bubble's edge and flies outward.

type Props = {
  work: Work;
  index: number;          // varies wobble / spin phase per bubble
  isHover: boolean;
  isDim: boolean;
  popping: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  ariaLabel: string;
  style: CSSProperties;   // outer button positioning (provided by parent)
};

const DROPLET_COUNT = 14;

export function Bubble({
  work,
  index,
  isHover,
  isDim,
  popping,
  onMouseEnter,
  onMouseLeave,
  onClick,
  ariaLabel,
  style,
}: Props) {
  // Pre-computed droplet ring. Each droplet is positioned on the bubble's
  // circumference (50% from center) at a random-ish angle, and flies
  // outward + slightly downward due to "gravity".
  const droplets = useMemo(() => {
    return Array.from({ length: DROPLET_COUNT }, (_, i) => {
      const angle = (i / DROPLET_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const rim = 50; // % from bubble center
      const reach = 70 + Math.random() * 70; // px outward beyond rim
      return {
        size: 4 + Math.random() * 8,
        startLeft: 50 + Math.cos(angle) * rim,
        startTop: 50 + Math.sin(angle) * rim,
        dx: Math.cos(angle) * reach,
        dy: Math.sin(angle) * reach + 16, // small gravity bias
        dur: 0.55 + Math.random() * 0.3,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={popping}
      style={{
        padding: 0,
        background: "none",
        border: 0,
        color: "inherit",
        cursor: popping ? "default" : "pointer",
        ...style,
      }}
    >
      {/* Hover-scale wrapper. The hover transform lives here so it doesn't
          conflict with the wobble/pop animation transforms below. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: isHover && !popping ? "scale(1.05)" : "scale(1)",
          transition:
            "transform 0.5s cubic-bezier(0.2, 0.7, 0.3, 1), filter 0.4s ease",
          filter: isDim ? "brightness(0.86) saturate(0.55)" : "none",
          willChange: "transform",
        }}
      >
        {/* Outer glow + contact shadow + wobble/pop animation */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            boxShadow:
              "0 0 40px rgba(255, 235, 240, 0.45), " +
              "0 0 20px rgba(220, 230, 255, 0.25), " +
              "0 26px 44px rgba(80, 30, 50, 0.22)",
            animation: popping
              ? "bubble-pop 0.36s cubic-bezier(0.4, 0.2, 0.6, 1) forwards"
              : `bubble-wobble ${5 + (index % 7) * 0.55}s ease-in-out infinite`,
            willChange: "transform",
          }}
        >
          {/* Clipped surface — anything inside is masked to the circle */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              overflow: "hidden",
            }}
          >
            {/* 1. Cover photo — slightly desaturated, like through a film */}
            <img
              src={work.cover}
              alt=""
              draggable={false}
              loading={index < 3 ? "eager" : "lazy"}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "saturate(0.78) brightness(0.92) contrast(1.05)",
                userSelect: "none",
              }}
            />

            {/* 2. Iridescent thin-film band — slow rotation */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: "-10%",
                background:
                  "conic-gradient(from 0deg, " +
                  "rgba(255, 170, 200, 0.75) 0%, " +
                  "rgba(255, 230, 150, 0.7) 16%, " +
                  "rgba(200, 255, 190, 0.75) 32%, " +
                  "rgba(150, 220, 255, 0.75) 50%, " +
                  "rgba(195, 165, 255, 0.75) 66%, " +
                  "rgba(255, 195, 230, 0.7) 82%, " +
                  "rgba(255, 170, 200, 0.75) 100%)",
                mixBlendMode: "overlay",
                animation: `bubble-spin ${10 + (index % 5)}s linear infinite`,
                opacity: 0.9,
                filter: "blur(2px)",
              }}
            />

            {/* 3. Directional shading — lighter at top-left, darker at bottom-right */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 28% 26%, " +
                  "rgba(255, 255, 255, 0.32) 0%, " +
                  "rgba(255, 255, 255, 0.06) 22%, " +
                  "rgba(0, 0, 0, 0) 55%, " +
                  "rgba(60, 30, 60, 0.28) 100%)",
                mixBlendMode: "overlay",
                pointerEvents: "none",
              }}
            />

            {/* 4. Edge tint — soft pink-blue interference at the rim */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background:
                  "radial-gradient(ellipse at 30% 28%, transparent 30%, " +
                  "rgba(255, 200, 220, 0.22) 78%, " +
                  "rgba(160, 220, 255, 0.32) 100%)",
                mixBlendMode: "screen",
                pointerEvents: "none",
              }}
            />

            {/* 5. Main highlight — large soft bloom (the sun reflection) */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: "6%",
                left: "10%",
                width: "42%",
                height: "30%",
                background:
                  "radial-gradient(ellipse at 30% 35%, " +
                  "rgba(255, 255, 255, 0.95) 0%, " +
                  "rgba(255, 255, 255, 0.55) 30%, " +
                  "rgba(255, 255, 255, 0) 75%)",
                borderRadius: "50%",
                filter: "blur(2px)",
                transform: "rotate(-22deg)",
                pointerEvents: "none",
              }}
            />

            {/* 6. Sharp secondary spec inside the main highlight */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: "11%",
                left: "24%",
                width: "12%",
                height: "9%",
                background:
                  "radial-gradient(ellipse at center, rgba(255,255,255,1), rgba(255,255,255,0))",
                borderRadius: "50%",
                filter: "blur(1px)",
                pointerEvents: "none",
              }}
            />

            {/* 7. Cool under-glow at the bottom (light from below) */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                bottom: "10%",
                right: "18%",
                width: "30%",
                height: "20%",
                background:
                  "radial-gradient(ellipse at center, rgba(210, 230, 255, 0.55), rgba(210, 230, 255, 0))",
                borderRadius: "50%",
                filter: "blur(4px)",
                pointerEvents: "none",
              }}
            />

            {/* 8. Bottom inner shading — gives the sphere weight */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background:
                  "radial-gradient(ellipse at 65% 80%, " +
                  "rgba(60, 30, 60, 0.0) 35%, " +
                  "rgba(60, 30, 60, 0.18) 65%, " +
                  "rgba(60, 30, 60, 0.30) 100%)",
                mixBlendMode: "multiply",
                pointerEvents: "none",
              }}
            />

            {/* 9. Inner rim — the surface-tension line all around the edge */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                boxShadow:
                  "inset 0 0 0 1.5px rgba(255, 255, 255, 0.55), " +
                  "inset 6px 8px 22px rgba(255, 255, 255, 0.28), " +
                  "inset -5px -8px 32px rgba(255, 180, 210, 0.26), " +
                  "inset 0 -10px 26px rgba(160, 200, 255, 0.22)",
                pointerEvents: "none",
              }}
            />

            {/* Caption fades in on hover */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#fff",
                mixBlendMode: "difference",
                opacity: isHover ? 1 : 0,
                transition: "opacity 0.3s ease",
                pointerEvents: "none",
                textAlign: "center",
                padding: "0 8% 18%",
              }}
            >
              {work.title} · {work.year}
            </div>
          </div>
        </div>
      </div>

      {/* Pop droplets — rendered above the bubble, anchored to the rim */}
      {popping && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          {droplets.map((d, i) => (
            <span
              key={i}
              style={{
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
                animationDelay: "0.31s",
                ["--dx" as keyof CSSProperties]: `${d.dx}px`,
                ["--dy" as keyof CSSProperties]: `${d.dy}px`,
                opacity: 0,
              } as CSSProperties}
            />
          ))}
        </div>
      )}
    </button>
  );
}
