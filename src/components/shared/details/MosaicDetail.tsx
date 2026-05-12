import { useEffect } from "react";
import type { DetailProps } from "../DriftBase";

// Two-column layout: left = title + meta + description.
// Right = 2x2 mosaic of all images (or 1+3, or 1 if only one image).
export default function MosaicDetail({ work, onClose }: DetailProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const imgs = work.images.length > 0 ? work.images : [work.cover];
  const four = imgs.slice(0, 4);
  while (four.length < 4) four.push(four[four.length - 1] ?? work.cover);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#ece8e0",
        color: "#0b0b0b",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.35fr)",
        gridTemplateRows: "auto 1fr auto",
        gap: "3vw",
        padding: "32px 56px",
        boxSizing: "border-box",
      }}
    >
      {/* Header spans both cols */}
      <header
        style={{
          gridColumn: "1 / -1",
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
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            cursor: "pointer",
            padding: 0,
          }}
        >
          ← zurück
        </button>
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: 22,
            letterSpacing: "-0.01em",
          }}
        >
          Lilia <em style={{ fontStyle: "italic" }}>Winter</em>
        </div>
      </header>

      <section
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 22,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#6b6760",
          }}
        >
          {work.category}  ·  {work.year}
        </div>
        <h1
          style={{
            fontFamily: "var(--serif)",
            fontWeight: 400,
            fontSize: "clamp(52px, 6.2vw, 116px)",
            lineHeight: 0.92,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          {work.title}
        </h1>
        <div style={{ width: 60, height: 1, background: "#0b0b0b", opacity: 0.4 }} />
        <p
          style={{
            fontFamily: "var(--fraunces)",
            fontStyle: "italic",
            fontSize: "clamp(15px, 1.18vw, 19px)",
            lineHeight: 1.55,
            margin: 0,
            maxWidth: "34ch",
            color: "#0b0b0b",
          }}
        >
          {work.description}
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: "1vw",
          minHeight: 0,
        }}
      >
        {four.map((src, i) => (
          <figure key={`${src}-${i}`} style={{ margin: 0, position: "relative", minHeight: 0 }}>
            <img
              src={src}
              alt={`${work.title} — ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                boxShadow: "0 14px 30px rgba(0,0,0,0.12)",
              }}
            />
            <figcaption
              style={{
                position: "absolute",
                left: 10,
                bottom: 8,
                fontFamily: "var(--mono)",
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#fff",
                mixBlendMode: "difference",
              }}
            >
              {String(i + 1).padStart(2, "0")} / {String(imgs.length).padStart(2, "0")}
            </figcaption>
          </figure>
        ))}
      </section>

      <footer
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#6b6760",
        }}
      >
        <div>mail@liliawinter.de</div>
        <div>Berlin · {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
