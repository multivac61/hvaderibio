import adapter from "@sveltejs/adapter-static";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      // Every page is prerendered, so Pages serves the build as plain files.
      // Paths with no page, such as a movie no longer showing, get 404.html,
      // which renders the error page in the browser.
      adapter: adapter({ fallback: "404.html" }),
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
