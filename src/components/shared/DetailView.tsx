import { useEffect } from "react";
import type { Work } from "../../data/works";

type Props = {
  work: Work;
  onClose: () => void;
  theme?: "light" | "dark";
};

export default function DetailView({ work, onClose, theme = "light" }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ink = theme === "light" ? "#0b0b0b" : "#f3f1ec";
  const bg = theme === "light" ? "#ece8e0" : "#0a0a0a";
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
        gridTemplateRows: "auto 1fr auto auto",
        padding: "28px 56px",
        gap: "3vh",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
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
          <span aria-hidden>←</span> zurück zur Übersicht
        </button>
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: 18,
            letterSpacing: "-0.01em",
          }}
        >
          Lilia <em style={{ fontStyle: "italic" }}>Winter</em>
        </div>
      </header>

      {/* MAIN — hero left, text right */}
      <main
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)",
          gap: "5vw",
          alignItems: "stretch",
          minHeight: 0,
        }}
      >
        <figure style={{ margin: 0, minHeight: 0, position: "relative" }}>
          <img
            src={hero}
            alt={work.title}
            loading="eager"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              boxShadow:
                theme === "light"
                  ? "0 30px 60px rgba(0,0,0,0.15)"
                  : "0 30px 60px rgba(0,0,0,0.55)",
            }}
          />
          <figcaption
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
            01 / {String(work.images.length).padStart(2, "0")}
          </figcaption>
        </figure>

        <section
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 24,
            paddingRight: "1vw",
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
              fontSize: "clamp(56px, 6.8vw, 124px)",
              lineHeight: 0.9,
              letterSpacing: "-0.022em",
              margin: 0,
            }}
          >
            {work.title}
          </h1>
          <div
            style={{
              width: 56,
              height: 1,
              background: ink,
              opacity: 0.4,
            }}
          />
          <p
            style={{
              fontFamily: "var(--fraunces)",
              fontStyle: "italic",
              fontSize: "clamp(15px, 1.18vw, 20px)",
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

      {/* THUMB ROW */}
      {thumbs.length > 0 && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${thumbs.length}, minmax(0, 1fr))`,
            gap: "1.4vw",
            height: "min(22vh, 200px)",
          }}
        >
          {thumbs.map((src, i) => (
            <figure
              key={src}
              style={{ margin: 0, position: "relative", minHeight: 0 }}
            >
              <img
                src={src}
                alt={`${work.title} — ${i + 2}`}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  boxShadow:
                    theme === "light"
                      ? "0 12px 28px rgba(0,0,0,0.10)"
                      : "0 12px 28px rgba(0,0,0,0.45)",
                }}
              />
              <figcaption
                style={{
                  position: "absolute",
                  left: 10,
                  bottom: 8,
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#fff",
                  mixBlendMode: "difference",
                  pointerEvents: "none",
                }}
              >
                {String(i + 2).padStart(2, "0")}
              </figcaption>
            </figure>
          ))}
        </section>
      )}

      {/* FOOTER */}
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
        }}
      >
        <div>mail@liliawinter.de</div>
        <div>Berlin · {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
