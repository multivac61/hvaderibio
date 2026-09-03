import { error } from "@sveltejs/kit";
import { get_cinema_options } from "$lib/cinemas";
import { find_movie_by_path, movie_path_segment } from "$lib/movie-path";
import { readMovies } from "$lib/movies";
import type { PageServerLoad } from "./$types";

// The prerenderer can't find the /movie/[id] routes because it needs the entries() function to know which routes to prerender.
export const entries = async (): Promise<{ id: string }[]> => {
  const { movies } = await readMovies();
  return movies.flatMap((movie) => [{ id: movie_path_segment(movie, movies) }, { id: String(movie.id) }]);
};

export const load: PageServerLoad = async ({ params }) => {
  const { movies } = await readMovies();
  const movie = find_movie_by_path(movies, params.id);

  if (!movie) {
    error(404, "Movie not found");
  }

  const cinema_options = get_cinema_options(movies);

  return {
    movie,
    cinema_options,
  };
};
