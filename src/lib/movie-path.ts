import type { Movie } from "$lib/schemas";

type MovieIdentity = Pick<Movie, "id" | "title">;

const title_slug = (title: string) =>
  title
    .toLocaleLowerCase("is")
    .replace(/ð/g, "d")
    .replace(/þ/g, "th")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const movie_path_segment = (movie: MovieIdentity, catalog: readonly MovieIdentity[]) => {
  const slug = title_slug(movie.title);
  if (!slug) return String(movie.id);

  const hasCollision = catalog.some((candidate) => candidate.id !== movie.id && title_slug(candidate.title) === slug);
  return hasCollision ? `${slug}-${movie.id}` : slug;
};

export const find_movie_by_path = <T extends MovieIdentity>(catalog: readonly T[], segment: string): T | undefined => {
  const decodedSegment = decodeURIComponent(segment).normalize("NFC");
  const readableMatch = catalog.find((movie) => movie_path_segment(movie, catalog) === decodedSegment);
  if (readableMatch) return readableMatch;

  // Preserve existing numeric URLs.
  if (/^\d+$/.test(decodedSegment)) {
    return catalog.find((movie) => movie.id === Number(decodedSegment));
  }
};
