import { describe, expect, test } from "bun:test";
import { find_movie_by_path, movie_path_segment } from "../src/lib/movie-path";

const movies = [
  { id: 18679, title: "Hvar er draumurinn?" },
  { id: 42, title: "Þrír á ferð með Æsu" },
];

describe("movie paths", () => {
  test("keeps Icelandic letters and omits IDs from unique titles", () => {
    expect(movie_path_segment(movies[0], movies)).toBe("hvar-er-draumurinn");
    expect(movie_path_segment(movies[1], movies)).toBe("þrír-á-ferð-með-æsu");
  });

  test("adds IDs only when titles collide", () => {
    const collisions = [
      { id: 1, title: "Dune" },
      { id: 2, title: "Dune" },
    ];

    expect(movie_path_segment(collisions[0], collisions)).toBe("dune-1");
    expect(movie_path_segment(collisions[1], collisions)).toBe("dune-2");
  });

  test("finds readable paths and preserves legacy numeric paths", () => {
    expect(find_movie_by_path(movies, "þrír-á-ferð-með-æsu")?.id).toBe(42);
    expect(find_movie_by_path(movies, "42")?.id).toBe(42);
    expect(find_movie_by_path(movies, "missing")?.id).toBeUndefined();
  });
});
