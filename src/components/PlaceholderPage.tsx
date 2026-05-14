import { Suspense, lazy, useState } from "react";
import { useMouse } from "./shared/useFloating";
import { WarmthLayer } from "./shared/WarmthLayer";
import FairyAshLayer from "./shared/FairyAshLayer";

const SeaShimmer = lazy(() => import("./shared/SeaShimmer"));

type Props = {
  title: string;
  subtitle?: string;
  body: string[];
};

// Generic placeholder section page — same pinkish moving background
// as the rest of the site, simple typographic content. Used for
// /lebenslauf and /about until the real content is ready.
export default function PlaceholderPage({ title, subtitle, body }: Props) {
  const { mx, my } = useMouse(0.1);
  const [, setHover] = useState<number | null>(null);
  void setHover;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "var(--bg, #edcdd1)",
        color: "#0b0b0b",
      }}
    >
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <WarmthLayer mx={mx} my={my} />
        <Suspense fallback={null}>
          <SeaShimmer />
        </Suspense>
        <FairyAshLayer />
      </div>

      <header
        style={{
          position: "absolute",
          top: 32,
          left: 40,
          right: 40,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 5,
          mixBlendMode: "difference",
          color: "#fff",
          pointerEvents: "none",
        }}
      >
        <a
          href="/"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textDecoration: "none",
            color: "inherit",
            pointerEvents: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 0",
          }}
        >
          <span aria-hidden>←</span> zurück
        </a>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            textAlign: "right",
            lineHeight: 1.8,
          }}
        >
          <div>Berlin · seit 2019</div>
        </div>
      </header>

      <main
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 40px",
          zIndex: 3,
        }}
      >
        <article
          style={{
            maxWidth: 640,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            textAlign: "left",
          }}
        >
          {subtitle && (
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(11,11,11,0.55)",
              }}
            >
              {subtitle}
            </div>
          )}
          <h1
            style={{
              fontFamily: "var(--serif)",
              fontWeight: 400,
              fontSize: "clamp(56px, 8vw, 124px)",
              lineHeight: 0.95,
              letterSpacing: "-0.022em",
              margin: 0,
            }}
          >
            {title}
          </h1>
          <div style={{ width: 56, height: 1, background: "#0b0b0b", opacity: 0.4 }} />
          {body.map((p, i) => (
            <p
              key={i}
              style={{
                fontFamily: "var(--fraunces)",
                fontStyle: "italic",
                fontSize: "clamp(16px, 1.4vw, 22px)",
                lineHeight: 1.6,
                margin: 0,
                maxWidth: "46ch",
                color: "#0b0b0b",
              }}
            >
              {p}
            </p>
          ))}
        </article>
      </main>

      <footer
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          bottom: 32,
          display: "flex",
          justifyContent: "flex-end",
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(11,11,11,0.55)",
          zIndex: 5,
          pointerEvents: "none",
        }}
      >
        <div>mail@liliawinter.de</div>
      </footer>
    </div>
  );
}
