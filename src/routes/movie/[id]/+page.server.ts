import { error } from "@sveltejs/kit";
import { get_cinema_options } from "$lib/cinemas";
import { readMovies } from "$lib/movies";
import type { PageServerLoad } from "./$types";

// The prerenderer can't find the /movie/[id] routes because it needs the entries() function to know which routes to prerender.
export const entries = async (): Promise<{ id: string }[]> => {
  const { movies } = await readMovies();
  return movies.map((movie) => ({ id: String(movie.id) }));
};

export const load: PageServerLoad = async ({ params }) => {
  const { movies } = await readMovies();
  const movie = movies.find((m) => m.id === Number(params.id));

  if (!movie) {
    error(404, "Movie not found");
  }

  const cinema_options = get_cinema_options(movies);

  return {
    movie,
    cinema_options,
  };
};
