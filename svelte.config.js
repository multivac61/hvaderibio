import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// Dynamically choose adapter based on environment variable
const getAdapter = async () => {
  if (process.env.ADAPTER === 'cloudflare') {
    const adapterCloudflare = (await import("@sveltejs/adapter-cloudflare")).default;
    return adapterCloudflare({
      // Cloudflare Pages specific options
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    });
  } else {
    const adapterStatic = (await import("@sveltejs/adapter-static")).default;
    return adapterStatic();
  }
};

export default {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors for more information about preprocessors
  preprocess: vitePreprocess(),
  kit: {
    adapter: await getAdapter(),
    prerender: { handleHttpError: "warn" },
    paths: { base: "" },
  },
};