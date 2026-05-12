import { useEffect } from "react";
import type { DetailProps } from "../DriftBase";

// Magazine-spread layout: left page = text, right page = hero image.
// Below: small thumb strip.
export default function SpreadDetail({ work, onClose }: DetailProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hero = work.images[0] ?? work.cover;
  const thumbs = work.images.slice(1, 5);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#f1ebde",
        color: "#1a1a1a",
        display: "grid",
        gridTemplateRows: "auto 1fr auto auto",
        gap: "3vh",
        padding: "32px 56px",
        boxSizing: "border-box",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.32em", textTransform: "uppercase" }}>
          Lilia Winter · Index
        </div>
      </header>

      <main
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
          gap: "4vw",
          minHeight: 0,
        }}
      >
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            paddingTop: "2vh",
            borderRight: "1px solid rgba(0,0,0,0.15)",
            paddingRight: "3vw",
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
            № {work.year}  ·  {work.category}
          </div>
          <h1
            style={{
              fontFamily: "var(--cormorant)",
              fontWeight: 400,
              fontSize: "clamp(48px, 5.6vw, 104px)",
              lineHeight: 0.92,
              letterSpacing: "-0.018em",
              margin: 0,
              fontStyle: "italic",
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
              margin: 0,
              maxWidth: "38ch",
              color: "#3a3833",
            }}
          >
            {work.description}
          </p>
          <div
            style={{
              marginTop: "auto",
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#6b6760",
            }}
          >
            01 / {String(work.images.length).padStart(2, "0")}
          </div>
        </section>

        <figure style={{ margin: 0, minHeight: 0 }}>
          <img
            src={hero}
            alt={work.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              boxShadow: "0 30px 60px rgba(0,0,0,0.18)",
            }}
          />
        </figure>
      </main>

      {thumbs.length > 0 && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${thumbs.length}, minmax(0, 1fr))`,
            gap: "1.2vw",
            height: "min(20vh, 180px)",
          }}
        >
          {thumbs.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`${work.title} — ${i + 2}`}
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                boxShadow: "0 10px 22px rgba(0,0,0,0.10)",
              }}
            />
          ))}
        </section>
      )}

      <footer
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#6b6760",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>mail@liliawinter.de</div>
        <div>Berlin · {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
