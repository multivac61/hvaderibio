import { z } from "zod/mini";

const showtime_schema = z.object({
  time: z.string(),
  purchase_url: z.url(),
  hall: z.string(),
  is_icelandic: z.optional(z.boolean()),
  is_3d: z.optional(z.boolean()),
  is_luxus: z.optional(z.boolean()),
  is_vip: z.optional(z.boolean()),
  is_atmos: z.optional(z.boolean()),
  is_max: z.optional(z.boolean()),
  is_flauel: z.optional(z.boolean()),
});

export const cinema_showtimes_schema = z.record(z.string(), z.array(showtime_schema));

// Showtimes organized by day (0 = today, 1 = tomorrow, etc.)
export const showtimes_by_day_schema = z.record(z.string(), cinema_showtimes_schema);

export type ShowtimesByDay = z.infer<typeof showtimes_by_day_schema>;
export type Movie = z.infer<typeof movie_schema>;
export type Showtime = z.infer<typeof showtime_schema>;

export const movie_schema = z.object({
  title: z.string(),
  id: z.number(),
  release_year: z.number(),
  poster_url: z.url(),
  description: z.string(),
  genres: z.array(z.string()),
  duration_in_mins: z.number(),
  trailer_url: z.optional(z.url()),
  showtimes_by_day: showtimes_by_day_schema,
  imdb: z.optional(
    z.object({
      link: z.url(),
      star: z.optional(z.number()),
    })
  ),
  rotten_tomatoes: z.optional(
    z.object({
      score: z.number(),
      audience_score: z.optional(z.number()),
      url: z.optional(z.url()),
    })
  ),
  metacritic: z.optional(
    z.object({
      score: z.number(),
      user_score: z.optional(z.number()),
      url: z.optional(z.url()),
    })
  ),
  letterboxd: z.optional(
    z.object({
      score: z.optional(z.number()),
      url: z.optional(z.url()),
    })
  ),
});

// A movie's descriptive record, as read from its kvikmyndir.is page; its
// showtimes come from the listings.
export const movie_details_schema = z.extend(z.omit(movie_schema, { showtimes_by_day: true }), {
  /** YYYY-MM-DD of an announced future premiere ("Væntanleg í bíó"). */
  premiere_date: z.optional(z.string()),
});

export type MovieDetails = z.infer<typeof movie_details_schema>;

export const movies_schema = z.array(movie_schema);
