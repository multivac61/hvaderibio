import { expect, test } from "vitest";
import { parseHTML } from "linkedom";
import fs from "fs/promises";
import path from "path";

import { parse_movie_ids, parse_showtimes, parse_movie } from "$lib/parse";

test("parse_movie_ids", async () => {
  const htmlFilePath = path.resolve(__dirname, "syningartimar_270923.html");
  const html = await fs.readFile(htmlFilePath, "utf-8");
  const { document } = parseHTML(html);

  const movie_ids = parse_movie_ids(document);

  expect(movie_ids).toEqual([
    16170, 16247, 16150, 14479, 16319, 16160, 15054, 16278, 16351, 16099, 16467, 16188, 16401, 16336, 14181, 16454, 16400, 16465, 16157,
  ]);
});

test("parse_showtimes", async () => {
  const htmlFilePath = path.resolve(__dirname, "16170_mynd_270923.html");
  const { document } = parseHTML(await fs.readFile(htmlFilePath, "utf-8"));

  const showtimes = parse_showtimes(document);

  const jsonFilePath = path.resolve(__dirname, "16170_mynd_270923_cinema_showtimes.json");
  const expected_showtimes = JSON.parse(await fs.readFile(jsonFilePath, "utf-8"));

  expect(showtimes).toMatchObject(expected_showtimes);
});

test("parse_movie", async () => {
  const htmlFilePath = path.resolve(__dirname, "16170_mynd_270923.html");
  const { document } = parseHTML(await fs.readFile(htmlFilePath, "utf-8"));

  const movie = parse_movie(document, 16170);

  const jsonFilePath = path.resolve(__dirname, "16170_mynd_270923.json");
  const expected_movie = JSON.parse(await fs.readFile(jsonFilePath, "utf-8"));

  expect(movie).toMatchObject(expected_movie);
});
