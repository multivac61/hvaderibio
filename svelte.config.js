import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors for more information about preprocessors
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    prerender: { handleHttpError: "warn" },
    paths: { base: "" },
  },
};
