import adapter from "@sveltejs/adapter-auto";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors for more information about preprocessors
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    prerender: { handleHttpError: "warn" },
    paths: { base: process.env.NODE_ENV === "production" ? "/hvaderibio" : "" },
  },
};
