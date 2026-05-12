import { useEffect } from "react";
import type { DetailProps } from "../DriftBase";

// Hero fills the screen as full-bleed background. Title + text overlay
// lower-left, thumb strip lower-right.
export default function FullBleedDetail({ work, onClose }: DetailProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hero = work.images[0] ?? work.cover;
  const thumbs = work.images.slice(1, 4);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `url(${hero})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#0a0a0a",
        color: "#f3f1ec",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 28,
          left: 40,
          background: "transparent",
          border: 0,
          color: "#f3f1ec",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          cursor: "pointer",
          padding: 0,
          zIndex: 3,
        }}
      >
        ← zurück
      </button>

      <div
        style={{
          position: "absolute",
          top: 28,
          right: 40,
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          zIndex: 3,
        }}
      >
        Lilia Winter
      </div>

      <section
        style={{
          position: "absolute",
          left: 40,
          bottom: 40,
          maxWidth: "42vw",
          zIndex: 3,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            opacity: 0.85,
            marginBottom: 14,
          }}
        >
          {work.category}  ·  {work.year}
        </div>
        <h1
          style={{
            fontFamily: "var(--serif)",
            fontWeight: 400,
            fontSize: "clamp(56px, 7vw, 128px)",
            lineHeight: 0.92,
            letterSpacing: "-0.02em",
            margin: 0,
            color: "#fff",
            textShadow: "0 2px 30px rgba(0,0,0,0.4)",
          }}
        >
          {work.title}
        </h1>
        <p
          style={{
            fontFamily: "var(--fraunces)",
            fontStyle: "italic",
            fontSize: "clamp(15px, 1.18vw, 19px)",
            lineHeight: 1.55,
            margin: "22px 0 0",
            maxWidth: "34ch",
            color: "rgba(255,255,255,0.92)",
            textShadow: "0 1px 18px rgba(0,0,0,0.4)",
          }}
        >
          {work.description}
        </p>
      </section>

      {thumbs.length > 0 && (
        <section
          style={{
            position: "absolute",
            right: 40,
            bottom: 40,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            zIndex: 3,
          }}
        >
          {thumbs.map((src, i) => (
            <figure key={src} style={{ margin: 0, width: 180, height: 120, position: "relative" }}>
              <img
                src={src}
                alt={`${work.title} — ${i + 2}`}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  boxShadow: "0 12px 28px rgba(0,0,0,0.4)",
                }}
              />
              <figcaption
                style={{
                  position: "absolute",
                  left: 8,
                  bottom: 6,
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#fff",
                  mixBlendMode: "difference",
                }}
              >
                {String(i + 2).padStart(2, "0")}
              </figcaption>
            </figure>
          ))}
        </section>
      )}
    </div>
  );
}
