import type { HandleServerError } from "@sveltejs/kit";

export const handleError: HandleServerError = async ({ error }) => {
  console.error("Server error:", error);
  return {
    message: "Internal Server Error",
  };
};
