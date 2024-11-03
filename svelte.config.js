import adapter from "@sveltejs/adapter-static";
import { preprocessMeltUI } from "@melt-ui/pp";
import sequence from "svelte-sequential-preprocessor";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors for more information about preprocessors
  preprocess: sequence([vitePreprocess(), preprocessMeltUI()]),
  kit: {
    adapter: adapter(),
    prerender: { handleHttpError: "warn" },
    paths: { base: process.env.NODE_ENV === "production" ? "/hvaderibio" : "" },
  },
};
