import { useEffect, useState } from "react";
import { works } from "../data/works";
import DriftWarmth from "./variants/DriftWarmth";
import WarmthFairyDust from "./variants/WarmthFairyDust";
import WarmthFairyAsh from "./variants/WarmthFairyAsh";
import WarmthFairyEmber from "./variants/WarmthFairyEmber";
import WarmthFairySpiral from "./variants/WarmthFairySpiral";
import WarmthFairyOrbit from "./variants/WarmthFairyOrbit";
import WarmthFairyMist from "./variants/WarmthFairyMist";
import WarmthFairyBreath from "./variants/WarmthFairyBreath";
import WarmthFairyLavender from "./variants/WarmthFairyLavender";
import WarmthFairyRosegold from "./variants/WarmthFairyRosegold";
import WarmthFairyTwilight from "./variants/WarmthFairyTwilight";
import WarmthFairyBurst from "./variants/WarmthFairyBurst";

type VariantDef = {
  id: string;
  label: string;
  blurb: string;
  bg: string;
  ink: string;
  Component: React.ComponentType<{ works: typeof works }>;
};

const baseBg = "#ece8e0";
const baseInk = "#0b0b0b";

const variants: VariantDef[] = [
  {
    id: "01-warmth",
    label: "01 — Warmth (Baseline)",
    blurb: "Drift-Grid + subtiler 3D-Tilt + Image-Cycle on Hover.",
    bg: baseBg, ink: baseInk, Component: DriftWarmth,
  },
  {
    id: "02-fairydust",
    label: "02 — Fairy Dust (Original)",
    blurb: "Pale-Gold-Partikel fallen hinter dem Cursor — Referenz.",
    bg: baseBg, ink: baseInk, Component: WarmthFairyDust,
  },
  // — Aufwärts —
  {
    id: "03-ash",
    label: "03 — Fairy Ash ✦",
    blurb: "Steigt auf · pearl + cream + peach · langsam.",
    bg: baseBg, ink: baseInk, Component: WarmthFairyAsh,
  },
  {
    id: "04-ember",
    label: "04 — Fairy Ember ✦",
    blurb: "Steigt auf wie Glut · coral + rose-gold · sparse, mit Flicker.",
    bg: baseBg, ink: baseInk, Component: WarmthFairyEmber,
  },
  // — Orbital —
  {
    id: "05-spiral",
    label: "05 — Fairy Spiral ✦",
    blurb: "Partikel kreisen kurz um den Cursor · rose + plum + lilac.",
    bg: baseBg, ink: baseInk, Component: WarmthFairySpiral,
  },
  {
    id: "06-orbit",
    label: "06 — Fairy Orbit ✦",
    blurb: "Cloud aus 25 Partikeln umkreist Cursor permanent · sage + mint.",
    bg: baseBg, ink: baseInk, Component: WarmthFairyOrbit,
  },
  // — Slow / Sparse —
  {
    id: "07-mist",
    label: "07 — Fairy Mist ✦",
    blurb: "Driftet horizontal in Cursor-Richtung · pale-blue + silver.",
    bg: baseBg, ink: baseInk, Component: WarmthFairyMist,
  },
  {
    id: "08-breath",
    label: "08 — Fairy Breath ✦",
    blurb: "Sehr sparse · mint + ivory · Partikel atmen quasi auf der Stelle.",
    bg: baseBg, ink: baseInk, Component: WarmthFairyBreath,
  },
  {
    id: "09-lavender",
    label: "09 — Fairy Lavender ✦",
    blurb: "Langsamer dichter Fall · lavender + lilac + silver.",
    bg: baseBg, ink: baseInk, Component: WarmthFairyLavender,
  },
  // — Varied —
  {
    id: "10-rosegold",
    label: "10 — Fairy Rosegold ✦",
    blurb: "Springt kurz hoch, dann fällt · rose-gold + champagne, kein Gelb.",
    bg: baseBg, ink: baseInk, Component: WarmthFairyRosegold,
  },
  {
    id: "11-twilight",
    label: "11 — Fairy Twilight ✦",
    blurb: "Dusty blue Standard-Fall · alle 20 Stück ein heller Stern.",
    bg: baseBg, ink: baseInk, Component: WarmthFairyTwilight,
  },
  {
    id: "12-burst",
    label: "12 — Fairy Burst ✦",
    blurb: "Rhythmische Pulse-Ringe alle 600–800ms · pearl + silver.",
    bg: baseBg, ink: baseInk, Component: WarmthFairyBurst,
  },
];

function readVariantFromUrl(): number {
  if (typeof window === "undefined") return 0;
  const v = new URL(window.location.href).searchParams.get("v");
  if (!v) return 0;
  const idx = variants.findIndex((x) => x.id === v);
  return idx < 0 ? 0 : idx;
}

export default function VibeCheck() {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setActive(readVariantFromUrl());
    const onPop = () => setActive(readVariantFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const v = variants[active];

  function select(idx: number) {
    setActive(idx);
    setOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("v", variants[idx].id);
    window.history.pushState({}, "", url.toString());
  }

  function step(delta: number) {
    const next = (active + delta + variants.length) % variants.length;
    select(next);
  }

  useEffect(() => {
    document.body.style.background = v.bg;
    document.body.style.color = v.ink;
    return () => {
      document.body.style.background = "";
      document.body.style.color = "";
    };
  }, [v.bg, v.ink]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const Variant = v.Component;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: v.bg,
        color: v.ink,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <Variant works={works} />
      </div>

      {variants.length > 1 && <Switcher
        variants={variants}
        active={active}
        open={open}
        setOpen={setOpen}
        select={select}
        step={step}
        ink={v.ink}
        bg={v.bg}
      />}
    </div>
  );
}

function Switcher({
  variants,
  active,
  open,
  setOpen,
  select,
  step,
  ink,
  bg,
}: {
  variants: VariantDef[];
  active: number;
  open: boolean;
  setOpen: (b: boolean) => void;
  select: (i: number) => void;
  step: (d: number) => void;
  ink: string;
  bg: string;
}) {
  const current = variants[active];
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 100,
        fontFamily: "var(--mono)",
        fontSize: 11,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        userSelect: "none",
        mixBlendMode: "difference",
        color: "#fff",
      }}
    >
      {open && (
        <ul
          style={{
            listStyle: "none",
            margin: "0 0 6px 0",
            padding: 0,
            border: `1px solid currentColor`,
            maxWidth: 360,
            background: bg,
            color: ink,
            mixBlendMode: "normal",
          }}
        >
          {variants.map((variant, i) => (
            <li key={variant.id}>
              <button
                onClick={() => select(i)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: i === active ? "currentColor" : "transparent",
                  color: i === active ? bg : ink,
                  border: 0,
                  borderBottom:
                    i === variants.length - 1 ? "none" : `1px solid currentColor`,
                  padding: "10px 12px",
                  fontFamily: "inherit",
                  fontSize: 11,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600 }}>{variant.label}</div>
                <div
                  style={{
                    opacity: 0.7,
                    marginTop: 4,
                    textTransform: "none",
                    fontSize: 11,
                    letterSpacing: 0,
                  }}
                >
                  {variant.blurb}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 0,
          border: `1px solid currentColor`,
          background: "transparent",
        }}
      >
        <button onClick={() => step(-1)} style={btn}>
          ←
        </button>
        <button
          onClick={() => setOpen(!open)}
          style={{
            ...btn,
            minWidth: 220,
            justifyContent: "space-between",
            display: "flex",
            gap: 12,
            borderLeft: `1px solid currentColor`,
            borderRight: `1px solid currentColor`,
          }}
        >
          <span>{current.label}</span>
          <span style={{ opacity: 0.6 }}>{open ? "▾" : "▴"}</span>
        </button>
        <button onClick={() => step(1)} style={btn}>
          →
        </button>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  background: "transparent",
  color: "inherit",
  border: 0,
  padding: "10px 14px",
  fontFamily: "inherit",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
};
