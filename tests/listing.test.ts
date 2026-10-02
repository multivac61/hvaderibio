import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { parseHTML } from "linkedom";
import { parse_listings } from "../src/lib/parse";

// kvikmyndir.is/bio/syningatimar/?dagur=N, saved on 2026-10-02.
const listing = (day: number) =>
  parseHTML(new TextDecoder().decode(Bun.gunzipSync(readFileSync(join(__dirname, `fixtures/listing-2026-10-02-dagur-${day}.html.gz`)))))
    .document;

describe("parse_listings", () => {
  const { movieIds, hallInfo } = parse_listings([listing(0), listing(1)]);

  test("includes movies that only start showing on a later day", () => {
    expect(movieIds).toContain(18927);
    expect(new Set(movieIds).size).toBe(movieIds.length);
  });

  test("keeps hall and format details for later days", () => {
    expect(hallInfo.get("https://eu.internet-ticketing.com/sales/SMAICE/book?perfcode=28204")).toMatchObject({
      hall: "MAX",
      is_max: true,
      is_icelandic: true,
    });
  });
});
