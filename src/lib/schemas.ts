import { z } from "zod/mini";

const showtime_schema = z.object({
  time: z.string(),
  purchase_url: z.url(),
  hall: z.string(),
});

export const cinema_showtimes_schema = z.record(z.string(), z.array(showtime_schema));

export type CinemaShowtimes = z.infer<typeof cinema_showtimes_schema>;
export type Movie = z.infer<typeof movie_schema>;
export type Showtime = z.infer<typeof showtime_schema>;

export const movie_schema = z.object({
  title: z.string(),
  id: z.number(),
  alt_title: z.optional(z.string()),
  release_year: z.number(),
  poster_url: z.url(),
  rating_urls: z.optional(z.array(z.url())),
  content_rating: z.optional(z.string()),
  description: z.string(),
  genres: z.array(z.string()),
  duration_in_mins: z.number(),
  language: z.array(z.string()),
  trailer_url: z.optional(z.url()),
  cinema_showtimes: cinema_showtimes_schema,
  imdb: z.optional(
    z.object({
      link: z.url(),
      star: z.number(),
    })
  ),
});

export const movies_schema = z.array(movie_schema);

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
  releaseDetailed: z.object({
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
