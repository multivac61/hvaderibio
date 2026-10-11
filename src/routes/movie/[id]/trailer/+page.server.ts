import { error } from "@sveltejs/kit";
import { find_movie_by_path, movie_path_segment } from "#lib/movie-path.js";
import { readMovies } from "#lib/movies.js";
import { get_youtube_id } from "#lib/video.js";
import type { PageServerLoad } from "./$types";

// Only the readable address is linked to, and only for films with a trailer.
export const entries = async (): Promise<{ id: string }[]> => {
  const { movies } = await readMovies();
  return movies.filter((movie) => get_youtube_id(movie.trailer_url)).map((movie) => ({ id: movie_path_segment(movie, movies) }));
};

export const load: PageServerLoad = async ({ params }) => {
  const { movies } = await readMovies();
  const movie = find_movie_by_path(movies, params.id);
  const youtube_id = get_youtube_id(movie?.trailer_url);
  if (!movie || !youtube_id) error(404, "Trailer not found");

  return { title: movie.title, path: movie_path_segment(movie, movies), youtube_id };
};
