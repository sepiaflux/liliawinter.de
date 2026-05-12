// Shared color-temperature utilities for the Warmth family of variants.

// Quiet cream palette. Differences between cool/warm are deliberately
// small so the page reads as "one cream" — the cursor reactivity is what
// the eye picks up, not the gradient itself.
export const COOL = "#e2e0db";
export const NEUTRAL = "#ece8e0";
export const WARM = "#efe1ce";

export function lerpHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 0xff;
  const ag = (pa >> 8) & 0xff;
  const ab = pa & 0xff;
  const br = (pb >> 16) & 0xff;
  const bg = (pb >> 8) & 0xff;
  const bb = pb & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

// Horizontal warmth gradient: cool left → warm right, with a soft "node"
// at the cursor X position. Returns a CSS background string.
export function warmthGradient(mx: number, opts?: { cool?: string; neutral?: string; warm?: string }) {
  const cool = opts?.cool ?? COOL;
  const neutral = opts?.neutral ?? NEUTRAL;
  const warm = opts?.warm ?? WARM;
  const mid = mx < 0.5 ? lerpHex(cool, neutral, mx * 2) : lerpHex(neutral, warm, (mx - 0.5) * 2);
  return `linear-gradient(to right, ${cool} 0%, ${mid} ${Math.round(mx * 100)}%, ${warm} 100%)`;
}

// Standard Warmth background — re-used across all Warm* variants for visual
// consistency. Tilt of the underlying gradient line + a warm cursor spot.
export function warmthBg({ mx, my }: { mx: number; my: number }) {
  return {
    base: warmthGradient(mx),
    halo: `radial-gradient(circle at ${mx * 100}% ${my * 100}%, rgba(255, 218, 178, 0.28) 0%, rgba(255, 218, 178, 0.12) 14%, transparent 32%)`,
  };
}
