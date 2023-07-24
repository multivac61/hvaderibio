import preprocess from "svelte-preprocess";
import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/kit/vite";
import { preprocessMeltUI } from "@melt-ui/pp";
import sequence from "svelte-sequential-preprocessor";

export default {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: sequence([vitePreprocess(), preprocess({ postcss: true }), preprocessMeltUI()]),
  kit: { adapter: adapter() },
};
