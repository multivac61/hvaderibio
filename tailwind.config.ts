import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";

export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],

  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter Variable", "Inter", ...defaultTheme.fontFamily.sans],
      },
    },
  },

  plugins: [
    plugin(function ({ addVariant }) {
      addVariant("slider-thumb", ["&::-webkit-slider-thumb", "&::-moz-range-thumb", "&::slider-thumb"]);
    }),
    plugin(function ({ addVariant }) {
      addVariant("slider-track", ["&::-webkit-slider-runnable-track", "&::-moz-range-track", "&::-ms-track"]);
    }),
  ],
} satisfies Config;
