import { useEffect, useState } from "react";
import type { Work } from "../../data/works";
import { useIsMobile } from "./useMediaQuery";

type Props = {
  work: Work;
  onClose: () => void;
  theme?: "light" | "dark";
};

// Single-screen detail view on desktop; scrollable column on mobile.
// Clicking any image opens a fullscreen lightbox to flip through all
// images with arrow keys / on-screen arrows.
export default function DetailView({ work, onClose, theme = "light" }: Props) {
  const mobile = useIsMobile();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const total = work.images.length;
  const wrap = (i: number) => ((i % total) + total) % total;

  // Single keydown handler: lightbox keys win when it's open; ESC closes
  // the lightbox first, then the detail view on a second press.
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

  const hero = work.images[0] ?? work.cover;
  const thumbs = work.images.slice(1, 5);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: bg,
        color: ink,
        display: "grid",
        gridTemplateRows: mobile ? "auto auto auto auto auto" : "auto 1fr auto auto",
        padding: mobile ? "20px 24px 32px" : "28px 40px",
        gap: mobile ? "4vh" : "3vh",
        boxSizing: "border-box",
        overflowY: mobile ? "auto" : "hidden",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
            padding: 0,
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

      <main
        style={{
          display: "grid",
          gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1.35fr) minmax(0, 1fr)",
          gap: mobile ? "3vh" : "5vw",
          alignItems: mobile ? "start" : "stretch",
          minHeight: 0,
        }}
      >
        <ImageButton
          src={hero}
          alt={work.title}
          index={0}
          total={work.images.length}
          onOpen={() => setLightboxIdx(0)}
          mobile={mobile}
          theme={theme}
          eager
        />

        <section
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: mobile ? "flex-start" : "center",
            gap: mobile ? 16 : 24,
            paddingRight: mobile ? 0 : "1vw",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: subtle,
            }}
          >
            {work.category}  ·  {work.year}
          </div>
          <h1
            style={{
              fontFamily: "var(--serif)",
              fontWeight: 400,
              fontSize: mobile ? "clamp(42px, 12vw, 64px)" : "clamp(56px, 6.8vw, 124px)",
              lineHeight: 0.95,
              letterSpacing: "-0.022em",
              margin: 0,
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
              maxWidth: "34ch",
              color: ink,
            }}
          >
            {work.description}
          </p>
        </section>
      </main>

      {thumbs.length > 0 && (
        <section
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "nowrap",
            gap: 10,
            height: mobile ? 130 : "min(22vh, 200px)",
            overflowX: "auto",
            overflowY: "hidden",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {thumbs.map((src, i) => (
            <ImageButton
              key={src}
              src={src}
              alt={`${work.title} — ${i + 2}`}
              index={i + 1}
              total={work.images.length}
              onOpen={() => setLightboxIdx(i + 1)}
              mobile={mobile}
              theme={theme}
              isThumb
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
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>mail@liliawinter.de</div>
        <div>Berlin · {new Date().getFullYear()}</div>
      </footer>

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
  mobile,
  theme,
  isThumb,
  eager,
}: {
  src: string;
  alt: string;
  index: number;
  total: number;
  onOpen: () => void;
  mobile: boolean;
  theme: "light" | "dark";
  isThumb?: boolean;
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
        minHeight: 0,
        flex: isThumb ? "0 0 auto" : undefined,
        width: isThumb ? "auto" : "100%",
        height: isThumb ? "100%" : mobile ? undefined : "100%",
        aspectRatio: !isThumb && mobile ? "4 / 5" : undefined,
        display: "block",
        overflow: "hidden",
      }}
    >
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        draggable={false}
        style={{
          width: isThumb ? "auto" : "100%",
          height: "100%",
          objectFit: isThumb ? "contain" : "cover",
          display: "block",
          userSelect: "none",
          boxShadow:
            theme === "light"
              ? isThumb
                ? "0 12px 28px rgba(0,0,0,0.10)"
                : "0 30px 60px rgba(0,0,0,0.15)"
              : isThumb
              ? "0 12px 28px rgba(0,0,0,0.45)"
              : "0 30px 60px rgba(0,0,0,0.55)",
        }}
      />
      <span
        style={{
          position: "absolute",
          left: isThumb ? 10 : 14,
          bottom: isThumb ? 8 : 12,
          fontFamily: "var(--mono)",
          fontSize: isThumb ? 9 : 10,
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
  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
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
      }}
    >
      <style>{`
        @keyframes lw-fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Schließen"
        style={{
          position: "absolute",
          top: 20,
          right: 24,
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
          top: 22,
          left: 24,
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
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        aria-label="Vorheriges Bild"
        style={navArrow("left")}
      >
        ←
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
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
