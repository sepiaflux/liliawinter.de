import { useEffect, useState } from "react";
import type { Work } from "../../data/works";
import { useIsMobile } from "./useMediaQuery";

type Props = {
  work: Work;
  onClose: () => void;
  theme?: "light" | "dark";
};

// Layout:
//   ┌─────────────────────────────────────┐
//   │ ← zurück            Lilia Winter    │ ← sticky top bar (out of scroll)
//   ├─────────────────────────────────────┤
//   │  ┌─────────┐  category · year       │
//   │  │  HERO   │  Title (large serif)   │
//   │  │ (native │  ──                    │ ← single scroll container
//   │  │ aspect) │  description italic    │
//   │  └─────────┘                        │
//   │  remaining images, vertical (mobile)│
//   │  or 2-column grid (desktop)         │
//   │  mail@liliawinter.de   Berlin · YYYY│ ← footer at end of content
//   └─────────────────────────────────────┘
//
// Native aspect on all images (no 4/5 crop). One vertical scroll container,
// safe-area aware padding, overscroll-behavior: contain so the modal
// doesn't bleed into the page underneath. Lightbox unchanged.
export default function DetailView({ work, onClose, theme = "light" }: Props) {
  const mobile = useIsMobile();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const total = work.images.length;
  const wrap = (i: number) => ((i % total) + total) % total;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightboxIdx !== null) {
        if (e.key === "Escape") setLightboxIdx(null);
        else if (e.key === "ArrowLeft") setLightboxIdx((i) => (i === null ? null : wrap(i - 1)));
        else if (e.key === "ArrowRight") setLightboxIdx((i) => (i === null ? null : wrap(i + 1)));
        return;
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, lightboxIdx, total]);

  const ink = theme === "light" ? "#0b0b0b" : "#f3f1ec";
  const bg = theme === "light" ? "#edcdd1" : "#0a0a0a";
  const subtle = theme === "light" ? "#6b6760" : "#9b968d";
  const rule = theme === "light" ? "rgba(11,11,11,0.12)" : "rgba(243,241,236,0.15)";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: bg,
        color: ink,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "max(16px, env(safe-area-inset-top, 0px)) 24px 14px",
          background: bg,
          borderBottom: `1px solid ${rule}`,
          zIndex: 2,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: 0,
            color: "inherit",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
            padding: "6px 0",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span aria-hidden>←</span> zurück
        </button>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: subtle,
          }}
        >
          Lilia Winter
        </div>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <article
          style={{
            padding: mobile
              ? "24px 20px 32px"
              : "40px 48px 64px",
            paddingBottom: `max(${mobile ? 32 : 64}px, env(safe-area-inset-bottom, 0px))`,
            maxWidth: mobile ? undefined : 1280,
            margin: mobile ? undefined : "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: mobile ? 28 : 48,
          }}
        >
          {/* Hero + meta block — stacked on mobile, side-by-side on desktop */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1.15fr) minmax(0, 1fr)",
              gap: mobile ? 22 : 48,
              alignItems: mobile ? "stretch" : "center",
            }}
          >
            <ImageButton
              src={work.images[0] ?? work.cover}
              alt={work.title}
              index={0}
              total={total}
              onOpen={() => setLightboxIdx(0)}
              theme={theme}
              eager
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: subtle,
                }}
              >
                {work.category} · {work.year}
              </div>
              <h1
                style={{
                  fontFamily: "var(--serif)",
                  fontWeight: 400,
                  fontSize: mobile
                    ? "clamp(40px, 11vw, 60px)"
                    : "clamp(56px, 6vw, 112px)",
                  lineHeight: 0.95,
                  letterSpacing: "-0.022em",
                  margin: 0,
                  wordBreak: "break-word",
                }}
              >
                {work.title}
              </h1>
              <div style={{ width: 56, height: 1, background: ink, opacity: 0.4 }} />
              <p
                style={{
                  fontFamily: "var(--fraunces)",
                  fontStyle: "italic",
                  fontSize: mobile ? 16 : "clamp(15px, 1.18vw, 20px)",
                  lineHeight: 1.55,
                  margin: 0,
                  maxWidth: mobile ? undefined : "38ch",
                  color: ink,
                }}
              >
                {work.description}
              </p>
            </div>
          </section>

          {total > 1 && (
            <section
              style={{
                display: "grid",
                gridTemplateColumns: mobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: mobile ? 14 : 20,
              }}
            >
              {work.images.slice(1).map((src, i) => (
                <ImageButton
                  key={src}
                  src={src}
                  alt={`${work.title} — ${i + 2}`}
                  index={i + 1}
                  total={total}
                  onOpen={() => setLightboxIdx(i + 1)}
                  theme={theme}
                />
              ))}
            </section>
          )}

          <footer
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: subtle,
              borderTop: `1px solid ${rule}`,
              paddingTop: 14,
              marginTop: 8,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>mail@liliawinter.de</div>
            <div>Berlin · {new Date().getFullYear()}</div>
          </footer>
        </article>
      </div>

      {lightboxIdx !== null && (
        <Lightbox
          images={work.images}
          index={lightboxIdx}
          title={work.title}
          onPrev={() => setLightboxIdx((i) => (i === null ? null : wrap(i - 1)))}
          onNext={() => setLightboxIdx((i) => (i === null ? null : wrap(i + 1)))}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  );
}

function ImageButton({
  src,
  alt,
  index,
  total,
  onOpen,
  theme,
  eager,
}: {
  src: string;
  alt: string;
  index: number;
  total: number;
  onOpen: () => void;
  theme: "light" | "dark";
  eager?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Bild ${index + 1} von ${total} öffnen`}
      style={{
        position: "relative",
        padding: 0,
        border: 0,
        background: "transparent",
        color: "inherit",
        cursor: "zoom-in",
        margin: 0,
        width: "100%",
        display: "block",
        overflow: "hidden",
      }}
    >
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding={eager ? "sync" : "async"}
        draggable={false}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          userSelect: "none",
          boxShadow:
            theme === "light"
              ? "0 18px 44px rgba(0,0,0,0.12)"
              : "0 18px 44px rgba(0,0,0,0.5)",
        }}
      />
      <span
        style={{
          position: "absolute",
          left: 12,
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
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </button>
  );
}

function Lightbox({
  images,
  index,
  title,
  onPrev,
  onNext,
  onClose,
}: {
  images: string[];
  index: number;
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Bild ${index + 1} von ${images.length}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(10, 10, 10, 0.94)",
        display: "grid",
        placeItems: "center",
        cursor: "zoom-out",
        animation: "lw-fade-in 0.22s ease-out",
        padding:
          "max(20px, env(safe-area-inset-top, 0px)) max(20px, env(safe-area-inset-right, 0px)) max(20px, env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))",
      }}
    >
      <style>{`@keyframes lw-fade-in { from { opacity: 0; } to { opacity: 1; } }`}</style>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Schließen"
        style={{
          position: "absolute",
          top: "max(14px, env(safe-area-inset-top, 0px))",
          right: "max(18px, env(safe-area-inset-right, 0px))",
          background: "transparent",
          border: 0,
          color: "#f3f1ec",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          cursor: "pointer",
          padding: 8,
          zIndex: 2,
        }}
      >
        schließen ✕
      </button>

      <div
        style={{
          position: "absolute",
          top: "max(18px, env(safe-area-inset-top, 0px))",
          left: "max(20px, env(safe-area-inset-left, 0px))",
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#9b968d",
          zIndex: 2,
        }}
      >
        {title} · {String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
      </div>

      <img
        src={images[index]}
        alt={`${title} — ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "min(92vw, 1600px)",
          maxHeight: "84vh",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          display: "block",
          cursor: "default",
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        }}
      />

      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        aria-label="Vorheriges Bild"
        style={navArrow("left")}
      >
        ←
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        aria-label="Nächstes Bild"
        style={navArrow("right")}
      >
        →
      </button>
    </div>
  );
}

function navArrow(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 18,
    transform: "translateY(-50%)",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#f3f1ec",
    width: 48,
    height: 48,
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 18,
    lineHeight: "44px",
    padding: 0,
    transition: "background 0.2s ease",
  };
}
