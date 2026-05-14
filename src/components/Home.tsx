import SectionBubbles from "./SectionBubbles";

// Homepage: three section bubbles (Portfolio, Lebenslauf, Über mich).
// Clicking one triggers the cascade-pop animation, then navigates to
// the chosen section via Astro view transitions.
export default function Home() {
  return <SectionBubbles />;
}
