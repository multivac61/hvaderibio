import { z } from "zod";

const showtime = z.object({
  time: z.string(),
  cinema: z.string(),
  purchase_url: z.string(),
  hall: z.string(),
  tags: z.array(z.string()),
});

const movie = z.object({
  title: z.string(),
  alt_title: z.string(),
  kvikmyndir_is_id: z.number(),
  release_year: z.number(),
  poster_url: z.string(),
  content_rating_in_years: z.string(),
  scrape_url: z.string(),
  description: z.string(),
  showtimes: z.array(showtime),
  genres: z.array(z.string()),
  duration_in_mins: z.number(),
  rating_urls: z.array(z.string()),
  language: z.string(),
  trailer_url: z.string(),
  image_urls: z.array(z.string()),
  images: z.array(
    z.object({
      url: z.string(),
      path: z.string(),
      checksum: z.string(),
      status: z.string(),
    })
  ),
  imdb: z
    .object({
      link: z.string(),
      star: z.number(),
    })
    .optional(),
});

export type Movie = z.infer<typeof movie>;
export type Showtime = z.infer<typeof showtime>;

export const movies_schema = z.array(movie);

export const imdb_movie = z.object({
  id: z.string(),
  review_api_path: z.string(),
  imdb: z.string(),
  contentType: z.string(),
  productionStatus: z.string(),
  title: z.string(),
  image: z.string(),
  images: z.array(z.string()),
  plot: z.string(),
  rating: z.object({ count: z.number(), star: z.number() }),
  award: z.object({ wins: z.number(), nominations: z.number() }),
  contentRating: z.string(),
  genre: z.array(z.string()),
  year: z.number(),
  runtime: z.null(),
  releaseDeatiled: z.object({
    day: z.number(),
    month: z.number(),
    year: z.number(),
    releaseLocation: z.object({ country: z.string(), cca2: z.string() }),
    originLocations: z.array(z.object({ country: z.string(), cca2: z.string() })),
  }),
  spokenLanguages: z.array(z.object({ language: z.string(), id: z.string() })),
  filmingLocations: z.array(z.unknown()),
  actors: z.array(z.string()),
  directors: z.array(z.unknown()),
  top_credits: z.array(z.object({ name: z.string(), value: z.array(z.string()) })),
  seasons: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      episodes: z.array(
        z.object({
          idx: z.number(),
          no: z.string(),
          title: z.string(),
          image: z.string(),
          image_large: z.string(),
          plot: z.string(),
          publishedDate: z.string(),
          rating: z.object({ count: z.number(), star: z.number() }),
        })
      ),
    })
  ),
});

export type IMDbMovie = z.infer<typeof imdb_movie>;
