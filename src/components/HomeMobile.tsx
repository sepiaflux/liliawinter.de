import { useEffect, useRef, useState } from "react";
import type { Work } from "../data/works";
import { WarmthLayer } from "./shared/WarmthLayer";
import DetailView from "./shared/DetailView";

// Mobile homepage: stacked vertical scroll of tiles. No parallax, no
// 3D tilt, no particles — clean and fast on touch devices.

const TILE_ROTATIONS = [-1.8, 1.4, -1.0, 1.6, -1.2, 1.8, -1.6];

export default function HomeMobile({ works }: { works: Work[] }) {
  const [selected, setSelected] = useState<Work | null>(null);
  const [detailIn, setDetailIn] = useState(false);

  const open = (work: Work) => {
    setSelected(work);
    requestAnimationFrame(() => setDetailIn(true));
  };
  const close = () => {
    setDetailIn(false);
    window.setTimeout(() => setSelected(null), 380);
  };

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // Lock body scroll while detail is open.
  useEffect(() => {
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [selected]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        background: "var(--bg, #ece8e0)",
        color: "#0b0b0b",
      }}
    >
      {/* Subtle warm wash behind everything */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <WarmthLayer mx={0.5} my={0.4} />
      </div>

      <header
        style={{
          position: "relative",
          zIndex: 2,
          padding: "32px 24px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mixBlendMode: "difference",
          color: "#fff",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: 30,
            lineHeight: 1,
            letterSpacing: "-0.01em",
          }}
        >
          Lilia <em style={{ fontStyle: "italic" }}>Winter</em>
        </div>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            textAlign: "right",
            lineHeight: 1.8,
          }}
        >
          <div>Berlin</div>
          <div>seit 2019</div>
        </div>
      </header>

      <main
        style={{
          position: "relative",
          zIndex: 1,
          padding: "12px 24px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {works.map((work, i) => (
          <MobileTile
            key={work.slug}
            work={work}
            rotation={TILE_ROTATIONS[i % TILE_ROTATIONS.length]}
            onOpen={() => open(work)}
          />
        ))}
      </main>

      <footer
        style={{
          position: "relative",
          zIndex: 2,
          padding: "20px 24px 32px",
          fontFamily: "var(--fraunces)",
          fontStyle: "italic",
          fontSize: 14,
          lineHeight: 1.5,
          mixBlendMode: "difference",
          color: "#fff",
          pointerEvents: "none",
        }}
      >
        Eine driftende Sammlung — mail@liliawinter.de
      </footer>

      {selected && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20,
            opacity: detailIn ? 1 : 0,
            transform: detailIn ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.42s ease, transform 0.42s ease",
          }}
        >
          <DetailView work={selected} onClose={close} />
        </div>
      )}
    </div>
  );
}

function MobileTile({
  work,
  rotation,
  onOpen,
}: {
  work: Work;
  rotation: number;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.unobserve(el);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label={`${work.title} öffnen`}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "4 / 5",
        padding: 0,
        background: "none",
        border: 0,
        color: "inherit",
        cursor: "pointer",
        overflow: "hidden",
        boxShadow: visible
          ? "0 18px 50px rgba(0,0,0,0.16)"
          : "0 6px 20px rgba(0,0,0,0.08)",
        transform: `rotate(${rotation}deg) translateY(${visible ? 0 : 14}px) scale(${visible ? 1 : 0.98})`,
        opacity: visible ? 1 : 0,
        transition:
          "transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1), opacity 0.7s ease, box-shadow 0.5s ease",
        willChange: "transform, opacity",
      }}
    >
      <img
        src={work.cover}
        alt={work.title}
        loading="lazy"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          userSelect: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 14,
          bottom: 12,
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#fff",
          mixBlendMode: "difference",
          pointerEvents: "none",
        }}
      >
        {work.title} · {work.year}
      </div>
    </button>
  );
}
