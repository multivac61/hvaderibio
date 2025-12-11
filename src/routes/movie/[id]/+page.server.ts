import { readMovies } from "$lib/movies";

// The prerenderer can't find the /movie/[id] routes because it needs the entries() function to know which routes to prerender.
export const entries = async () => {
  const { movies } = await readMovies();
  return movies.map((movie) => ({ id: String(movie.id) }));
};
