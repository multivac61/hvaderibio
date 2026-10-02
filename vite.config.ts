import adapter from "@sveltejs/adapter-cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      adapter: adapter({
        routes: {
          include: ["/*"],
          exclude: ["/_app/*", "/*.webp", "/*.json", "/*.txt", "/*.ico", "/*.xml", "/movie/*"],
        },
      }),
      prerender: { handleUnseenRoutes: "warn" },
    }),
  ],
  build: {
    target: "es2022",
    rolldownOptions: {
      output: {
        comments: { legal: false },
        minify: {
          compress: {
            dropConsole: process.env.NODE_ENV === "production",
            dropDebugger: process.env.NODE_ENV === "production",
          },
        },
      },
    },
  },
});
