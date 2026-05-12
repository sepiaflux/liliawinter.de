import { useEffect, useState } from "react";
import { works } from "../data/works";
import DriftWarmth from "./variants/DriftWarmth";
import WarmEditorial from "./variants/WarmEditorial";
import WarmCascade from "./variants/WarmCascade";
import WarmMosaic from "./variants/WarmMosaic";

type VariantDef = {
  id: string;
  label: string;
  blurb: string;
  bg: string;
  ink: string;
  Component: React.ComponentType<{ works: typeof works }>;
};

const variants: VariantDef[] = [
  {
    id: "01-warmth",
    label: "01 — Warmth (Baseline)",
    blurb: "Asymmetrisches Drift-Grid + Standard-Detail (Hero + Text + Thumb-Strip).",
    bg: "#ece8e0",
    ink: "#0b0b0b",
    Component: DriftWarmth,
  },
  {
    id: "02-editorial",
    label: "02 — Warm · Editorial",
    blurb: "Ruhigeres 3+3-Stagger-Grid + Magazin-Spread-Detail (Cormorant italic).",
    bg: "#ece8e0",
    ink: "#0b0b0b",
    Component: WarmEditorial,
  },
  {
    id: "03-cascade",
    label: "03 — Warm · Cascade",
    blurb: "Diagonale Kaskade aus überlappenden Tiles + Full-Bleed-Detail mit Overlay-Text.",
    bg: "#ece8e0",
    ink: "#0b0b0b",
    Component: WarmCascade,
  },
  {
    id: "04-mosaic",
    label: "04 — Warm · Mosaic",
    blurb: "Hero-zentriertes Mosaik (kaum Rotation) + 2×2-Grid-Detail mit Text-Spalte.",
    bg: "#ece8e0",
    ink: "#0b0b0b",
    Component: WarmMosaic,
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

      <Switcher
        variants={variants}
        active={active}
        open={open}
        setOpen={setOpen}
        select={select}
        step={step}
        ink={v.ink}
        bg={v.bg}
      />
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
