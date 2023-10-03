// On some platforms, including glibc-based Linux, the main thread must call require('sharp') before worker threads are created. This is to ensure shared libraries remain loaded in memory until after all threads are complete.
import sharp from "sharp";

import preprocess from "svelte-preprocess";
import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/kit/vite";
import { preprocessMeltUI } from "@melt-ui/pp";
import sequence from "svelte-sequential-preprocessor";

export default {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: sequence([vitePreprocess(), preprocess({ postcss: true }), preprocessMeltUI()]),
  kit: { adapter: adapter(), prerender: { handleHttpError: "warn" } },
};
