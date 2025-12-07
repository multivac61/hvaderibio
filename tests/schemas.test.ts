import { describe, expect, test } from "bun:test";
import { movie_schema, cinema_showtimes_schema } from "../src/lib/schemas";

describe("cinema_showtimes_schema", () => {
  test("validates valid showtimes", () => {
    const data = {
      "Test Cinema": [{ time: "2024-01-01T20:30:00.000Z", purchase_url: "https://example.com/buy", hall: "Hall 1" }],
    };
    const result = cinema_showtimes_schema.safeParse(data);
    expect(result.success).toBe(true);
  });

  test("rejects invalid purchase_url", () => {
    const data = {
      "Test Cinema": [{ time: "2024-01-01T20:30:00.000Z", purchase_url: "not-a-url", hall: "Hall 1" }],
    };
    const result = cinema_showtimes_schema.safeParse(data);
    expect(result.success).toBe(false);
  });

  test("accepts empty showtimes", () => {
    const data = {};
    const result = cinema_showtimes_schema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("movie_schema", () => {
  const validMovie = {
    title: "Test Movie",
    id: 123,
    release_year: 2024,
    poster_url: "https://example.com/poster.jpg",
    description: "A test movie description",
    genres: ["Action", "Comedy"],
    duration_in_mins: 120,
    language: ["English"],
    cinema_showtimes: {
      "Test Cinema": [{ time: "2024-01-01T20:30:00.000Z", purchase_url: "https://example.com/buy", hall: "Hall 1" }],
    },
  };

  test("validates valid movie", () => {
    const result = movie_schema.safeParse(validMovie);
    expect(result.success).toBe(true);
  });

  test("accepts optional fields", () => {
    const movieWithOptionals = {
      ...validMovie,
      alt_title: "Alternative Title",
      content_rating: "PG-13",
      trailer_url: "https://youtube.com/watch?v=abc123",
      rating_urls: ["https://imdb.com/title/tt1234567"],
      imdb: { link: "https://imdb.com/title/tt1234567", star: 8.5 },
    };
    const result = movie_schema.safeParse(movieWithOptionals);
    expect(result.success).toBe(true);
  });

  test("rejects invalid poster_url", () => {
    const movie = { ...validMovie, poster_url: "not-a-url" };
    const result = movie_schema.safeParse(movie);
    expect(result.success).toBe(false);
  });

  test("rejects invalid trailer_url", () => {
    const movie = { ...validMovie, trailer_url: "not-a-url" };
    const result = movie_schema.safeParse(movie);
    expect(result.success).toBe(false);
  });

  test("rejects missing required fields", () => {
    const movie = { title: "Test" };
    const result = movie_schema.safeParse(movie);
    expect(result.success).toBe(false);
  });
});
