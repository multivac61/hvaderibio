import { describe, expect, test } from "bun:test";
import { count_label, rating_labels, showtime_label } from "../src/lib/accessible-labels";

describe("showtime_label", () => {
  test("reads the time, hall and formats, and says the ticket page opens in a new tab", () => {
    expect(
      showtime_label({
        time: "2026-10-04T21:40:00.000Z",
        purchase_url: "https://www.sambio.is/websales/show/428339",
        hall: "Ásberg",
        is_atmos: true,
        is_icelandic: true,
      })
    ).toBe("21:40, Ásberg, íslenskt tal, Ásberg-hljóð. Kaupa miða (opnast í nýjum flipa)");
  });

  test("omits a missing hall", () => {
    expect(showtime_label({ time: "2026-10-04T20:10:00.000Z", purchase_url: "https://example.com", hall: "" })).toBe(
      "20:10. Kaupa miða (opnast í nýjum flipa)"
    );
  });
});

describe("rating_labels", () => {
  test("names each site and scale with Icelandic decimals", () => {
    expect(
      rating_labels({
        imdb: { link: "https://imdb.com/title/tt1", star: 7.2 },
        rotten_tomatoes: { score: 53, audience_score: 80 },
        metacritic: { score: 46, user_score: 79 },
        letterboxd: { score: 3.7 },
      })
    ).toEqual({
      imdb: "IMDb 7,2 af 10 (opnast í nýjum flipa)",
      rotten_tomatoes: "Rotten Tomatoes 53%, áhorfendur 80% (opnast í nýjum flipa)",
      metacritic: "Metacritic 46 af 100, notendur 79 af 100 (opnast í nýjum flipa)",
      letterboxd: "Letterboxd 3,7 af 5 (opnast í nýjum flipa)",
    });
  });
});

describe("count_label", () => {
  test("uses the Icelandic singular for counts ending in 1, except 11", () => {
    expect(count_label(1, "mynd", "myndir")).toBe("1 mynd");
    expect(count_label(21, "mynd", "myndir")).toBe("21 mynd");
    expect(count_label(11, "mynd", "myndir")).toBe("11 myndir");
    expect(count_label(5, "sýning", "sýningar")).toBe("5 sýningar");
  });
});
