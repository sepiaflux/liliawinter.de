// Imports portfolio assets into public/portfolio/<slug>/ as web-sized JPGs.
// Run: `node scripts/import-portfolio.mjs`
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const portfolio = resolve(root, "PORTFOLIO");
const out = resolve(root, "public/portfolio");

const projects = [
  {
    slug: "ghostworld-zoe",
    src: `${portfolio}/Fotoserie Ghostworld Zoe`,
    images: [
      "Lilia Winter-1.jpg",
      "Lilia Winter-2.jpg",
      "Lilia Winter-3.jpg",
      "Lilia Winter-4.jpg",
      "Lilia Winter-5.jpg",
    ],
  },
  {
    slug: "otherworldly",
    src: `${portfolio}/Fotoserie Otherworldy`,
    images: [
      "Otherworldly 1.1.png",
      "Otherworldly 2.png",
      "Otherworldly 4.png",
      "Otherworldly 5.png",
      "Otherworldly 8.png",
    ],
  },
  {
    slug: "vanna-analog",
    src: `${portfolio}/Fotoserie Vanna Analog`,
    images: [
      "FAV_Vanna_Analog-1.jpg",
      "FAV_Vanna_Analog-3.jpg",
      "FAV_Vanna_Analog-4.jpg",
      "FAV_Vanna_Analog-7.jpg",
      "FAV_Vanna_Analog-8.jpg",
    ],
  },
  {
    slug: "lia-libre",
    src: `${portfolio}/Lia Libre`,
    images: ["Lia Libre Poster_Final.png", "Lia Libre Poster_V5.png"],
  },
];

const COVER_WIDTH = 1600;
const DETAIL_WIDTH = 2400;

for (const p of projects) {
  const dir = resolve(out, p.slug);
  await mkdir(dir, { recursive: true });

  for (let i = 0; i < p.images.length; i++) {
    const inputPath = `${p.src}/${p.images[i]}`;
    const idx = String(i + 1).padStart(2, "0");
    const detailOut = resolve(dir, `${idx}.jpg`);
    const isFirst = i === 0;

    const img = sharp(inputPath).rotate();

    await img
      .clone()
      .resize({ width: DETAIL_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(detailOut);

    if (isFirst) {
      await img
        .clone()
        .resize({ width: COVER_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 78, mozjpeg: true })
        .toFile(resolve(dir, "cover.jpg"));
    }

    console.log("→", `${p.slug}/${idx}.jpg`);
  }
}

console.log("done.");
