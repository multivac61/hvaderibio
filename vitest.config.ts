import { defineConfig } from "vitest/config";

// Unit tests import plain TypeScript modules, so they skip vite.config.ts and
// its SvelteKit and Tailwind plugins. With those loaded, Vitest hangs before
// running any test inside the Nix build sandbox.
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"] },
});
