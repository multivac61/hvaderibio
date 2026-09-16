import type { Movie, PosterImages } from "./schemas";

// Old catalogues still work until their next scrape generates hashed posters.
export function poster_images(movie: Pick<Movie, "id" | "poster_images">): PosterImages {
  return (
    movie.poster_images ?? {
      small: `/${movie.id}-360w.webp`,
      medium: `/${movie.id}.webp`,
      large: `/${movie.id}-1080w.webp`,
    }
  );
}
