import { useEffect, useRef, useState } from "react";

export type Float = {
  dx: number;
  dy: number;
  rot: number;
  scale: number;
};

// Returns a continuously-updating gentle float state. Each tile gets its
// own seed so they're out of sync. Amplitude can be tuned per call.
export function useFloating(
  seed: number,
  opts: { ampXY?: number; ampRot?: number; ampScale?: number; speed?: number } = {},
): Float {
  const { ampXY = 8, ampRot = 0.6, ampScale = 0.012, speed = 1 } = opts;
  const [state, setState] = useState<Float>({ dx: 0, dy: 0, rot: 0, scale: 1 });
  const raf = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const phaseX = seed * 1.7;
    const phaseY = seed * 2.3 + 1.1;
    const phaseR = seed * 1.9 + 0.5;
    const phaseS = seed * 2.7 + 2.1;

    const tick = (t: number) => {
      const e = ((t - start) / 1000) * speed;
      setState({
        dx: Math.sin(e * 0.45 + phaseX) * ampXY + Math.sin(e * 0.21 + phaseX * 2) * ampXY * 0.4,
        dy: Math.cos(e * 0.36 + phaseY) * ampXY * 0.9 + Math.sin(e * 0.18 + phaseY * 1.5) * ampXY * 0.3,
        rot: Math.sin(e * 0.31 + phaseR) * ampRot,
        scale: 1 + Math.sin(e * 0.27 + phaseS) * ampScale,
      });
      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [seed, ampXY, ampRot, ampScale, speed]);

  return state;
}

// Subscribe-once shared mouse state for variants that want parallax.
const subs = new Set<(mx: number, my: number) => void>();
let _mx = 0.5;
let _my = 0.5;
let _attached = false;

function attach() {
  if (_attached || typeof window === "undefined") return;
  _attached = true;
  window.addEventListener("mousemove", (e) => {
    _mx = e.clientX / window.innerWidth;
    _my = e.clientY / window.innerHeight;
    subs.forEach((fn) => fn(_mx, _my));
  });
}

export function useMouse(smoothing = 0.12) {
  const [pos, setPos] = useState({ mx: 0.5, my: 0.5 });
  const target = useRef({ mx: 0.5, my: 0.5 });
  const current = useRef({ mx: 0.5, my: 0.5 });

  useEffect(() => {
    attach();
    const fn = (mx: number, my: number) => {
      target.current.mx = mx;
      target.current.my = my;
    };
    subs.add(fn);
    target.current.mx = _mx;
    target.current.my = _my;

    let raf = 0;
    const tick = () => {
      current.current.mx += (target.current.mx - current.current.mx) * smoothing;
      current.current.my += (target.current.my - current.current.my) * smoothing;
      setPos({ mx: current.current.mx, my: current.current.my });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      subs.delete(fn);
    };
  }, [smoothing]);

  return pos;
}
