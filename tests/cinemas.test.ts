import { describe, expect, it } from "vitest";
import { get_cinema_options } from "../src/lib/cinemas";
import type { Movie } from "../src/lib/schemas";

const showing_at = (...cinemas: string[]) =>
  ({ showtimes_by_day: { "2026-10-03": Object.fromEntries(cinemas.map((cinema) => [cinema, []])) } }) as unknown as Movie;

describe("cinema options", () => {
  // Listed under the heading "Kvikmyndahús", so the choice of every cinema
  // agrees with it: "Öll", not "Allt".
  it("offers every cinema as Öll, then the capital region, then each cinema", () => {
    const options = get_cinema_options([showing_at("Bíó Paradís", "Smárabíó"), showing_at("Laugarásbíó")]);
    expect(options[0]).toEqual(["Öll", ["Bíó Paradís", "Laugarásbíó", "Smárabíó"]]);
    expect(options[1][0]).toBe("Höfuðborgarsvæðið");
  });

  // The only cinema outside the capital: the town names it well enough in
  // a short list, where "Sambíóin Akureyri" crowded the others.
  it("names the Akureyri cinema by its town", () => {
    const options = get_cinema_options([showing_at("Sambíóin Akureyri", "Smárabíó")]);
    expect(options.map(([label]) => label)).toContain("Akureyri");
    expect(options.find(([label]) => label === "Akureyri")?.[1]).toEqual(["Sambíóin Akureyri"]);
  });

  // The list sits under its labels, so it is in the order a reader expects:
  // by the name shown, in Icelandic alphabetical order (Í after I, Ö near the end).
  it("lists the cinemas by their shown name, in Icelandic order", () => {
    const options = get_cinema_options([
      showing_at("Sambíóin Kringlunni", "Smárabíó", "Ísafjarðarbíó", "Bíó Paradís", "Sambíóin Akureyri"),
    ]);
    expect(options.slice(2).map(([label]) => label)).toEqual(["Akureyri", "Bíó Paradís", "Ísafjarðarbíó", "Kringlubíó", "Smárabíó"]);
  });

  // The label is also the selection's key: two cinemas shown under one name
  // made the picker's list repeat a key, and the page crashed when it opened.
  it("keeps labels unique when two cinemas would share a shown name", () => {
    const options = get_cinema_options([showing_at("Sambíóin Kringlunni", "Kringlubíó")]);
    const labels = options.map(([label]) => label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(options.find(([, cinemas]) => cinemas.length === 1 && cinemas[0] === "Kringlubíó")).toBeDefined();
  });
});
