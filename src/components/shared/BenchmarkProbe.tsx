import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

// Console-driven WebGL benchmark. Mounts inside an R3F Canvas; reads
// the renderer's draw-call / triangle counters and per-frame timing
// while recording. Results land in window.__benchmarks and print as a
// console.table so before/after runs are trivial to compare.
//
// Usage in the browser console:
//   bench()                  → record 5s, label "run-1"
//   bench(8000, "no-iri")    → record 8s with a custom label
//   bench.compare()          → table of every benchmark in this session
//   bench.clear()            → wipe the history
//
// Cost when idle is one `if` per frame — leave it mounted in dev.

type Summary = {
  label: string;
  frames: number;
  duration_ms: number;
  fps_avg: number;
  frame_ms_avg: number;
  frame_ms_median: number;
  frame_ms_p95: number;
  draw_calls_avg: number;
  triangles_avg: number;
};

declare global {
  interface Window {
    bench?: ((durationMs?: number, label?: string) => void) & {
      compare?: () => void;
      clear?: () => void;
      list?: () => Summary[];
    };
    __benchmarks?: Summary[];
  }
}

type State = {
  recording: boolean;
  label: string;
  startTime: number;
  endTime: number;
  lastFrame: number;
  frameTimes: number[];
  drawCalls: number[];
  triangles: number[];
  startCalls: number;
};

export default function BenchmarkProbe() {
  const { gl } = useThree();
  const stateRef = useRef<State>({
    recording: false,
    label: "",
    startTime: 0,
    endTime: 0,
    lastFrame: 0,
    frameTimes: [],
    drawCalls: [],
    triangles: [],
    startCalls: 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.__benchmarks) window.__benchmarks = [];

    const start = (durationMs = 5000, label?: string) => {
      const s = stateRef.current;
      if (s.recording) {
        console.warn("[bench] already recording — wait for it to finish");
        return;
      }
      const autoLabel = `run-${(window.__benchmarks!.length + 1)
        .toString()
        .padStart(2, "0")}`;
      s.recording = true;
      s.label = label ?? autoLabel;
      s.startTime = performance.now();
      s.endTime = s.startTime + durationMs;
      s.lastFrame = s.startTime;
      s.frameTimes = [];
      s.drawCalls = [];
      s.triangles = [];
      s.startCalls = gl.info.render.calls;
      // eslint-disable-next-line no-console
      console.log(
        `[bench:${s.label}] recording ${durationMs}ms… results will land in window.__benchmarks`,
      );
    };

    const bench = start as Window["bench"];
    if (bench) {
      bench.compare = () => {
        const all = window.__benchmarks ?? [];
        if (all.length === 0) {
          // eslint-disable-next-line no-console
          console.log("[bench] no runs yet — call bench() first");
          return;
        }
        // eslint-disable-next-line no-console
        console.table(all);
      };
      bench.clear = () => {
        window.__benchmarks = [];
        // eslint-disable-next-line no-console
        console.log("[bench] cleared");
      };
      bench.list = () => window.__benchmarks ?? [];
    }
    window.bench = bench;

    // eslint-disable-next-line no-console
    console.log(
      "[bench] ready. Run `bench()` to record 5s, `bench.compare()` to see all runs.",
    );

    return () => {
      delete window.bench;
    };
  }, [gl]);

  useFrame(() => {
    const s = stateRef.current;
    if (!s.recording) return;
    const now = performance.now();
    const dt = now - s.lastFrame;
    s.lastFrame = now;
    s.frameTimes.push(dt);
    s.drawCalls.push(gl.info.render.calls);
    s.triangles.push(gl.info.render.triangles);

    if (now < s.endTime) return;

    s.recording = false;
    const fts = s.frameTimes.slice().sort((a, b) => a - b);
    const median = fts[Math.floor(fts.length / 2)] ?? 0;
    const p95 = fts[Math.floor(fts.length * 0.95)] ?? 0;
    const avg = fts.reduce((a, b) => a + b, 0) / Math.max(1, fts.length);
    const callsAvg =
      s.drawCalls.reduce((a, b) => a + b, 0) / Math.max(1, s.drawCalls.length);
    const trisAvg =
      s.triangles.reduce((a, b) => a + b, 0) / Math.max(1, s.triangles.length);
    const duration = now - s.startTime;
    const summary: Summary = {
      label: s.label,
      frames: s.frameTimes.length,
      duration_ms: Math.round(duration),
      fps_avg: Math.round((s.frameTimes.length / (duration / 1000)) * 10) / 10,
      frame_ms_avg: Math.round(avg * 100) / 100,
      frame_ms_median: Math.round(median * 100) / 100,
      frame_ms_p95: Math.round(p95 * 100) / 100,
      draw_calls_avg: Math.round(callsAvg),
      triangles_avg: Math.round(trisAvg),
    };
    if (!window.__benchmarks) window.__benchmarks = [];
    window.__benchmarks.push(summary);
    // eslint-disable-next-line no-console
    console.log(`[bench:${summary.label}] done`, summary);
    // eslint-disable-next-line no-console
    console.table(window.__benchmarks);
  });

  return null;
}
