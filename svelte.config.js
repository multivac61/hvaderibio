import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// Dynamically choose adapter based on environment variable
const getAdapter = async () => {
  if (process.env.ADAPTER === "cloudflare") {
    const adapterCloudflare = (await import("@sveltejs/adapter-cloudflare")).default;
    return adapterCloudflare({
      routes: {
        include: ['/*'],
        exclude: [
          '/_app/*',
          '/*.webp',
          '/*.json',
          '/*.txt',
          '/*.ico',
          '/*.xml',
          '/movie/*'
        ]
      }
    });
  } else {
    const adapterStatic = (await import("@sveltejs/adapter-static")).default;
    return adapterStatic();
  }
};

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: await getAdapter(),
  },
};
