import { refresh_movie_catalog } from "#lib/catalog-refresh.js";

refresh_movie_catalog().catch((error) => {
  console.error("An error occurred during the Movie catalog refresh:", error);
  process.exit(1);
});
