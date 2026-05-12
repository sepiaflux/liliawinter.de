import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://liliawinter.de",
  integrations: [react(), mdx(), sitemap()],
  vite: {
    ssr: {
      noExternal: ["three", "@react-three/fiber", "@react-three/drei", "@react-three/postprocessing"],
    },
  },
});
