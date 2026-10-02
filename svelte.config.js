import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      routes: {
        include: ["/*"],
        exclude: ["/_app/*", "/*.webp", "/*.json", "/*.txt", "/*.ico", "/*.xml", "/movie/*"],
      },
    }),
    prerender: {
      handleUnseenRoutes: "warn",
    },
  },
};
