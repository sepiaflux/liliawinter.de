import { warmthBg } from "./warmth";

// Re-usable bg layer for any variant in the Warmth family.
export function WarmthLayer({ mx, my }: { mx: number; my: number }) {
  const { base, halo } = warmthBg({ mx, my });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: base,
        transition: "background 0.4s ease-out",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: halo,
          transition: "background 0.18s linear",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
