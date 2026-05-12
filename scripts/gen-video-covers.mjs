// Generates moody abstract teaser covers for video projects that don't have
// extracted stills yet. Run: `node scripts/gen-video-covers.mjs`
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const out = resolve(root, "public/portfolio");

const teasers = [
  { slug: "escapism", colors: ["#1a1a24", "#5a3f7a", "#d49a6a"] },
  { slug: "lichtuebung", colors: ["#0d0d10", "#3c3f4d", "#cfb482"] },
  { slug: "aufm-boxi", colors: ["#1f1a16", "#7a4a3b", "#c98a5d"] },
];

const W = 1600;
const H = 2000;

function gradientSvg([c1, c2, c3], slug) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <radialGradient id="g" cx="0.4" cy="0.6" r="1.1">
        <stop offset="0%" stop-color="${c3}" stop-opacity="0.9"/>
        <stop offset="55%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c1}"/>
      </radialGradient>
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.04" numOctaves="3" seed="${slug.length * 11}"/>
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.28 0"/>
      </filter>
      <filter id="grain">
        <feTurbulence baseFrequency="0.9" numOctaves="2" seed="${slug.length}"/>
        <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect width="100%" height="100%" filter="url(#n)" opacity="0.7"/>
    <rect width="100%" height="100%" filter="url(#grain)"/>
  </svg>`;
}

for (const t of teasers) {
  const dir = resolve(out, t.slug);
  await mkdir(dir, { recursive: true });
  const svg = Buffer.from(gradientSvg(t.colors, t.slug));
  await sharp(svg).jpeg({ quality: 80, mozjpeg: true }).toFile(resolve(dir, "cover.jpg"));
  console.log("→", `${t.slug}/cover.jpg`);
}
