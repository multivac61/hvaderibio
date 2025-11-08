import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  build: {
    cssMinify: "lightningcss",
    target: "es2022",
    sourcemap: false, // Disable source maps in production for smaller bundles
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: undefined,
        experimentalMinChunkSize: 500,
      },
    },
  },
  esbuild: {
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
    legalComments: "none",
  },
});
