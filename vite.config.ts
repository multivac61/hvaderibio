import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  build: {
    cssMinify: "lightningcss",
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: undefined,
        experimentalMinChunkSize: 500,
      },
    },
  },
});
