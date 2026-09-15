import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
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
