const defaultTheme = require("tailwindcss/defaultTheme");
const plugin = require("tailwindcss/plugin");

const config = {
  content: ["./src/**/*.{html,js,svelte,ts}"],

  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", "Inter", ...defaultTheme.fontFamily.sans],
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
};

module.exports = config;
