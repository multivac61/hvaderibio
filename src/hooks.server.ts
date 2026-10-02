import type { HandleServerError } from "@sveltejs/kit/hooks";

// SvelteKit 3 also routes expected errors (404s, error(...)) through this
// hook. Only log genuine crashes and let SvelteKit keep its safe defaults.
export const handleError: HandleServerError = ({ kind, error }) => {
  if (kind === "unknown") console.error("Server error:", error);
};
