import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { parseHTML } from "linkedom";
import { afterAll, beforeAll } from "bun:test";
import { parse_listings } from "../src/lib/parse";

// kvikmyndir.is/bio/syningatimar/?dagur=N, saved on 2026-10-02.
const listing = (day: number) =>
  parseHTML(new TextDecoder().decode(Bun.gunzipSync(readFileSync(join(__dirname, `fixtures/listing-2026-10-02-dagur-${day}.html.gz`)))))
    .document;

describe("parse_listings", () => {
  const { movieIds, showtimes } = parse_listings([listing(0), listing(1)]);

  test("includes movies that only start showing on a later day", () => {
    expect(movieIds).toContain(18927);
    expect(new Set(movieIds).size).toBe(movieIds.length);
  });

  test("builds every showtime with its day, hall and format labels", () => {
    // Coyote vs. Acme, Saturday 3 October (dagur=1).
    expect(showtimes.get(18822)?.["1"]?.["Sambíóin Kringlunni"]?.[0]).toEqual({
      time: "2026-10-03T11:20:00.000Z",
      purchase_url: "https://www.sambio.is/websales/show/428622",
      hall: "Salur 3",
      is_icelandic: true,
    });

    const max = Object.values(showtimes.get(18822)?.["1"] ?? {})
      .flat()
      .find(({ purchase_url }) => purchase_url === "https://eu.internet-ticketing.com/sales/SMAICE/book?perfcode=28204");
    expect(max).toMatchObject({ hall: "MAX", is_max: true, is_icelandic: true });
  });
});

describe("parse_listings labels", () => {
  test("flags a Sambíó showing in the Ásberg hall", () => {
    // kvikmyndir.is ?dagur=2 on 2026-10-02. Sambíó's own booking page names the
    // hall "Glæsisalir" and shows Ásberg only as a side label, which the old
    // booking-page enrichment dropped.
    const { document } = parseHTML(`
      <a href="/mynd/?id=18107" class="movie_title">Digger</a>
      <a href="https://www.sambio.is/websales/show/428344" target="_blank" class="rate tooltip st-showtime-link" data-movie-id="18107"
         data-movie-title="Digger" data-cinema-id="7" data-cinema="Sambíóin Kringlunni" data-time="21:20" data-feed-id="3394"
         data-showtime="2026-10-04 21:20:00">21:20 <div class="tegund"></div><div class="salur">Ásberg</div> <div class="salur red"> </div></a>`);

    expect(parse_listings([document]).showtimes.get(18107)?.["0"]?.["Sambíóin Kringlunni"]).toEqual([
      { time: "2026-10-04T21:20:00.000Z", purchase_url: "https://www.sambio.is/websales/show/428344", hall: "Ásberg", is_atmos: true },
    ]);
  });
});

describe("parse_listings timezone", () => {
  let original_tz: string | undefined;
  beforeAll(() => {
    original_tz = process.env.TZ;
    process.env.TZ = "America/New_York";
  });
  afterAll(() => {
    process.env.TZ = original_tz;
  });

  test("stores listed Icelandic times as Reykjavik instants regardless of the machine's zone", () => {
    const { document } = parseHTML(`
      <a href="/mynd/?id=1" class="movie_title">Film</a>
      <div class="biotimi"><h3>Bíó Paradís</h3><ul class="time"><li>
        <a href="https://tickets.example.com/a" class="rate tooltip st-showtime-link" data-movie-id="1"
           data-cinema="Bíó Paradís" data-time="20.20" data-showtime="2026-10-02 20:20:00">20:20 <div class="salur">Salur 1</div></a>
      </li></ul></div>`);

    expect(parse_listings([document]).showtimes.get(1)?.["0"]?.["Bíó Paradís"]?.[0].time).toBe("2026-10-02T20:20:00.000Z");
  });
});
